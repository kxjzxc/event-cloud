/**
 * Builder — the core orchestrator.
 *
 * Pipeline:
 *   Parser → Events → Image Processor → Renderer → Static Site
 *
 * The Builder never touches Logseq data directly. It delegates everything
 * to plugins and only coordinates the flow.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  TMConfig,
  TMEvent,
  EventIndexEntry,
  IParser,
  IStorage,
  IRenderer,
  IImageProcessor,
  PluginRegistry,
  RenderContext,
} from '../types';

export interface BuildOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export interface BuildStats {
  events: number;
  images: number;
  videos: number;
  backlinks: number;
  relatedPairs: number;
  tags: number;
  outputFiles: number;
}

export class Builder {
  private registry: PluginRegistry;
  private config: TMConfig;

  constructor(registry: PluginRegistry, config: TMConfig) {
    this.registry = registry;
    this.config = config;
  }

  async build(options: BuildOptions = {}): Promise<BuildStats> {
    const { dryRun, verbose } = options;
    const log = (msg: string) => {
      if (verbose || dryRun) console.log(msg);
    };

    // 1. Resolve plugins
    const parserFactory = this.registry.parsers.get('logseq');
    const storageFactory = this.registry.storages.get(this.config.storage);
    const rendererFactory = this.registry.renderers.get('default');
    const imageFactory = this.registry.imageProcessors.get('sharp');

    if (!parserFactory || !storageFactory || !rendererFactory || !imageFactory) {
      throw new Error('Missing required plugin. Check config and registry.');
    }

    const parser: IParser = parserFactory();
    const storage: IStorage = (storageFactory as any)(this.config.outputPath);
    const renderer: IRenderer = rendererFactory();
    const imageProcessor: IImageProcessor = imageFactory();

    // 2. Clean output (preserve assets/ for incremental image processing)
    this.cleanOutput();

    // 3. Parse the graph
    log('Parsing Logseq graph...');
    const events = await parser.parse(this.config.logseqPath);
    log(`Found ${events.length} events.`);

    if (dryRun) {
      console.log(`\n[Dry Run] Parsed ${events.length} events:`);
      for (const e of events) {
        console.log(`  • ${e.date} — ${e.title} (${e.media.length} media, ${e.tags.length} tags)`);
      }
      return { events: events.length, images: 0, videos: 0, backlinks: 0, relatedPairs: 0, tags: 0, outputFiles: 0 };
    }

    // 3b. Build bidirectional link relationships
    log('Building link relationships...');
    this.buildRelations(events);
    log(`  Backlinks: ${events.reduce((s, e) => s + e.backlinkIds.length, 0)}`);
    log(`  Related: ${events.reduce((s, e) => s + e.relatedIds.length, 0)}`);

    // 4. Process images + copy videos
    log('Processing images...');
    const assetsDir = path.join(this.config.outputPath, 'assets');
    const videosDir = path.join(assetsDir, 'videos');

    for (const event of events) {
      for (const asset of event.media) {
        if (asset.type === 'image' && fs.existsSync(asset.originalPath)) {
          const processed = await imageProcessor.process(
            asset.originalPath,
            assetsDir,
            this.config.media,
          );
          // Rewrite paths to be site-relative
          asset.thumbnailPath = path.relative(
            this.config.outputPath,
            processed.thumbnailPath,
          ).replace(/\\/g, '/');
          asset.previewPath = path.relative(
            this.config.outputPath,
            processed.previewPath,
          ).replace(/\\/g, '/');
        } else if (asset.type === 'video' && fs.existsSync(asset.originalPath)) {
          // Copy video file to dist/assets/videos/
          if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
          const videoName = path.basename(asset.originalPath);
          const destPath = path.join(videosDir, videoName);
          fs.copyFileSync(asset.originalPath, destPath);
          asset.thumbnailPath = path.relative(this.config.outputPath, destPath).replace(/\\/g, '/');
        }
      }
    }

    log('Image processing complete.');

    // 4. Build index
    const index: EventIndexEntry[] = events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      tags: e.tags,
      hasMedia: e.media.length > 0,
      mediaCount: e.media.length,
    }));

    // 5. Render
    log('Rendering static site...');
    const ctx: RenderContext = {
      outputPath: this.config.outputPath,
      storage,
      config: this.config,
    };
    await renderer.render(events, index, ctx);

    // 6. Write index.json
    await storage.save('index.json', JSON.stringify(index, null, 2));
    log('Wrote index.json');

    // 7. Compute stats
    const allTags = new Set<string>();
    let imageCount = 0;
    let videoCount = 0;
    for (const e of events) {
      for (const t of e.tags) allTags.add(t);
      for (const m of e.media) {
        if (m.type === 'image') imageCount++;
        else if (m.type === 'video') videoCount++;
      }
    }

    // Count output files
    let outputFiles = 0;
    const countFiles = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) countFiles(full);
        else outputFiles++;
      }
    };
    countFiles(this.config.outputPath);

    const stats: BuildStats = {
      events: events.length,
      images: imageCount,
      videos: videoCount,
      backlinks: events.reduce((s, e) => s + e.backlinkIds.length, 0),
      relatedPairs: events.reduce((s, e) => s + e.relatedIds.length, 0),
      tags: allTags.size,
      outputFiles,
    };

    log('\nBuild complete.');
    log(`  Events: ${stats.events}`);
    log(`  Output: ${this.config.outputPath}`);

    return stats;
  }

  /**
   * Remove everything in the output directory except assets/.
   * This ensures stale event pages from previous builds don't linger,
   * while preserving incrementally-processed images.
   */
  private cleanOutput(): void {
    const output = this.config.outputPath;
    if (!fs.existsSync(output)) return;

    for (const entry of fs.readdirSync(output)) {
      if (entry === 'assets') continue; // preserve for incremental processing
      const fullPath = path.join(output, entry);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }

  /**
   * Build bidirectional link relationships after all events are parsed.
   *
   * 1. Backlinks: if event A's `links` contains event B's title,
   *    then B gets A's ID in its `backlinkIds`.
   *
   * 2. Related events: events that share at least one tag,
   *    limited to top 5 by overlap count.
   */
  private buildRelations(events: TMEvent[]): void {
    const titleToId = new Map<string, string>();
    for (const e of events) {
      titleToId.set(e.title.toLowerCase(), e.id);
    }

    // Siblings: events on the same date (reserved for future "same day navigation" feature)
    const dateGroups = new Map<string, TMEvent[]>();
    for (const e of events) {
      if (!dateGroups.has(e.date)) dateGroups.set(e.date, []);
      dateGroups.get(e.date)!.push(e);
    }
    for (const [date, group] of dateGroups) {
      if (group.length > 1) {
        const siblingIds = group.map((e) => e.id);
        for (const e of group) {
          e.siblingIds = siblingIds.filter((id) => id !== e.id);
        }
      }
    }

    // Backlinks
    for (const source of events) {
      for (const linkName of source.links) {
        const targetId = titleToId.get(linkName.toLowerCase());
        if (targetId && targetId !== source.id) {
          const target = events.find((e) => e.id === targetId);
          if (target && !target.backlinkIds.includes(source.id)) {
            target.backlinkIds.push(source.id);
          }
        }
      }
    }

    // Related events (shared tags)
    for (const event of events) {
      if (event.tags.length === 0) continue;

      const scored: { id: string; score: number }[] = [];
      for (const other of events) {
        if (other.id === event.id) continue;
        const shared = other.tags.filter((t) => event.tags.includes(t));
        if (shared.length > 0) {
          scored.push({ id: other.id, score: shared.length });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      event.relatedIds = scored.slice(0, 5).map((s) => s.id);
    }
  }
}
