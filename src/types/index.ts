/**
 * Event Cloud — Core Types & Plugin Interfaces
 *
 * All plugin contracts live here. The Builder only talks to these interfaces,
 * never to concrete implementations.
 */

// ─── Data Models ──────────────────────────────────────────────

/**
 * A media asset referenced by an Event.
 * Paths are relative to the graph root during parsing,
 * then rewritten to site-relative paths during rendering.
 */
export interface MediaAsset {
  originalPath: string;
  thumbnailPath?: string;
  previewPath?: string;
  type: 'image' | 'video';
  alt?: string;
}

/**
 * Event — the atomic unit of the Event Cloud.
 *
 * One Journal block with `type:: event` becomes one Event.
 * The same Journal can yield multiple Events.
 */
export interface TMEvent {
  /** Stable unique id: `${date}-${slug}` */
  id: string;
  /** First line of the block, stripped of markdown */
  title: string;
  /** ISO date string (from journal filename) */
  date: string;
  /** Child-block content rendered as HTML */
  contentHtml: string;
  /** Raw block content (markdown) for search / archive */
  contentRaw: string;
  tags: string[];
  /** Page names referenced via [[double-bracket]] links */
  links: string[];
  media: MediaAsset[];
  /** Path to the source journal file (relative to graph root) */
  sourceFile: string;
  /** Other Event ids from the same journal day */
  siblingIds: string[];
  /** Event IDs that link TO this event (via [[this event's title]]) */
  backlinkIds: string[];
  /** Event IDs related by shared tags */
  relatedIds: string[];
}

/**
 * Lightweight index entry for index.json.
 * Contains just enough data for random selection and archive listing
 * without loading full event content.
 */
export interface EventIndexEntry {
  id: string;
  title: string;
  date: string;
  tags: string[];
  hasMedia: boolean;
  mediaCount: number;
}

// ─── Plugin Interfaces ────────────────────────────────────────

/**
 * Parser plugin — reads a note graph and extracts Events.
 * Logseq is the first implementation; Obsidian / plain Markdown can follow.
 */
export interface IParser {
  readonly name: string;
  parse(graphPath: string): Promise<TMEvent[]>;
}

/**
 * Storage plugin — abstract file system for writing output.
 * Local is the default; R2 / OSS / S3 can plug in later.
 */
export interface IStorage {
  readonly name: string;
  save(filePath: string, content: Buffer | string): Promise<void>;
  read(filePath: string): Promise<Buffer>;
  exists(filePath: string): Promise<boolean>;
}

/**
 * Image processor plugin — generates derivatives (thumbnail, preview).
 */
export interface IImageProcessor {
  readonly name: string;
  process(
    inputPath: string,
    outputDir: string,
    config: ImageProcessConfig,
  ): Promise<ProcessedImage>;
}

/**
 * Renderer plugin — converts Events + index into static HTML pages.
 */
export interface IRenderer {
  readonly name: string;
  render(events: TMEvent[], index: EventIndexEntry[], ctx: RenderContext): Promise<void>;
}

// ─── Config Types ─────────────────────────────────────────────

export interface ImageProcessConfig {
  thumbnailSize: number;
  previewSize: number;
}

export interface ProcessedImage {
  thumbnailPath: string;
  previewPath: string;
  originalFilename: string;
}

export interface TMConfig {
  logseqPath: string;
  outputPath: string;
  storage: string;
  media: ImageProcessConfig;
}

export interface RenderContext {
  outputPath: string;
  storage: IStorage;
  config: TMConfig;
}

// ─── Plugin Registry ──────────────────────────────────────────

/**
 * The Builder uses a registry to look up plugins by name.
 * This keeps the core decoupled — swap implementations via config.
 */
export interface PluginRegistry {
  parsers: Map<string, () => IParser>;
  storages: Map<string, () => IStorage>;
  renderers: Map<string, () => IRenderer>;
  imageProcessors: Map<string, () => IImageProcessor>;
}
