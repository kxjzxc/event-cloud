/**
 * Logseq Parser — reads a Logseq graph and extracts Events.
 *
 * Logseq stores notes as Markdown files in journals/ and pages/.
 * Each file is a tree of blocks (list items). A block with the property
 * `type:: event` becomes a TMEvent.
 */

import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';
marked.setOptions({
  breaks: true,
  gfm: true,
});
import type { IParser, TMEvent, MediaAsset } from '../../types';

// ─── Internal block representation ────────────────────────────

interface LogseqBlock {
  /** Content after the list marker ("- " / "* ") */
  content: string;
  properties: Record<string, string>;
  children: LogseqBlock[];
  /** Full raw text of this block and its children */
  rawText: string;
  indent: number;
}

// ─── Parser ───────────────────────────────────────────────────

export class LogseqParser implements IParser {
  readonly name = 'logseq';

  async parse(graphPath: string): Promise<TMEvent[]> {
    const pagesDir = path.join(graphPath, 'pages');
    const journalsDir = path.join(graphPath, 'journals');
    const allEvents: TMEvent[] = [];

    const pageDateMap = this.buildPageDateMap(journalsDir);

    const pageFiles = this.findMarkdownFiles(pagesDir);

    for (const file of pageFiles) {
      const pageName = path.basename(file, '.md');
      if (pageName === 'contents' || pageName === 'whiteboards') continue;

      const relPath = path.relative(graphPath, file);
      const content = fs.readFileSync(file, 'utf-8');
      const blocks = this.parseBlocks(content);
      if (blocks.length === 0) continue;

      const referencedDate = pageDateMap.get(pageName);
      const event = this.pageToEvent(blocks, pageName, relPath, graphPath, file, referencedDate);
      if (event) allEvents.push(event);
    }

    const journalFiles = [...new Set(this.findMarkdownFiles(journalsDir))];
    for (const file of journalFiles) {
      const filename = path.basename(file, '.md');
      const journalDate = this.extractDateFromFilename(filename);
      if (!journalDate) continue;

      const relPath = path.relative(graphPath, file);
      const content = fs.readFileSync(file, 'utf-8');
      const blocks = this.parseBlocks(content);

      for (const block of blocks) {
        // Journal blocks that are only [[page]] references are day indexes,
        // not standalone events. Skip even when multiple links are concatenated
        // into one block (Logseq soft-wrap without per-line "- ").
        if (this.isWikiLinkOnlyContent(block.content)) {
          continue;
        }

        const blockTitle = this.stripMarkdown(block.content).trim();
        const pageFilePath = path.join(pagesDir, blockTitle + '.md');
        if (fs.existsSync(pageFilePath)) {
          continue;
        }

        const event = this.blockToEvent(block, journalDate, relPath, graphPath);
        if (event) allEvents.push(event);
      }
    }

    return allEvents;
  }

  private buildPageDateMap(journalsDir: string): Map<string, string> {
    const map = new Map<string, string>();
    if (!fs.existsSync(journalsDir)) return map;

    for (const entry of fs.readdirSync(journalsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const journalDate = this.extractDateFromFilename(entry.name);
      if (!journalDate) continue;

      const filePath = path.join(journalsDir, entry.name);
      const content = fs.readFileSync(filePath, 'utf-8');
      const links = this.extractLinks(content);

      for (const link of links) {
        const existing = map.get(link);
        if (!existing || journalDate > existing) {
          map.set(link, journalDate);
        }
      }
    }

    return map;
  }

  private pageToEvent(
    blocks: LogseqBlock[],
    pageName: string,
    sourceFile: string,
    graphPath: string,
    filePath: string,
    referencedDate?: string,
  ): TMEvent | null {
    const title = pageName;

    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const pageProperties = this.extractPageProperties(rawContent);

    const dateProperty = pageProperties['date']?.trim();
    let date: string;
    let hasValidDate: boolean;

    if (referencedDate) {
      date = referencedDate;
      hasValidDate = true;
    } else if (dateProperty) {
      date = dateProperty;
      hasValidDate = this.isValidISODate(dateProperty);
    } else {
      date = '未知时间的碎片';
      hasValidDate = false;
    }

    const id = this.makeEventId(date, title);

    const tags = this.extractAllTags(rawContent, pageProperties);
    const links = this.extractLinks(rawContent);
    const media = this.extractMedia(rawContent, graphPath);
    const contentRaw = this.blocksToPageMarkdown(blocks);
    const contentHtml = this.renderMarkdown(contentRaw);

    return {
      id,
      title,
      date,
      hasValidDate,
      contentHtml,
      contentRaw,
      tags,
      links,
      media,
      sourceFile,
      siblingIds: [],
      backlinkIds: [],
      relatedIds: [],
    };
  }

  /**
   * Convert page-level Logseq blocks into plain markdown paragraphs.
   *
   * Logseq uses an outliner format where every line starts with "- ".
   * When rendering to HTML we strip that prefix so content renders as
   * normal paragraphs (<p>) rather than list items (<ul><li>).
   *
   * Each top-level block becomes its own paragraph separated by a blank
   * line, so marked produces proper <p> spacing. Nested child blocks are
   * kept as markdown lists (they are genuine sub-items). Inline images and
   * other inline elements keep their original position within each block.
   */
  private blocksToPageMarkdown(blocks: LogseqBlock[]): string {
    // Filter out pure-property blocks (type::, date::, tags::, etc.)
    const contentBlocks = blocks.filter(
      (b) => !this.isProperty(b.content.trim()) && b.content.trim() !== '',
    );

    const paragraphs: string[] = [];
    for (const block of contentBlocks) {
      let md = block.content;
      if (block.children.length > 0) {
        const childMd = this.childrenToMarkdown(block.children);
        if (childMd) {
          md += '\n' + childMd;
        }
      }
      paragraphs.push(md);
    }
    return paragraphs.join('\n\n');
  }

  /**
   * Extract all key:: value properties from raw file content.
   * Keys are normalized to lowercase (Logseq is case-insensitive).
   */
  private extractPageProperties(content: string): Record<string, string> {
    const props: Record<string, string> = {};
    const regex = /^([a-zA-Z_][a-zA-Z0-9_]*)::\s*(.*)$/gm;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      props[m[1].toLowerCase()] = m[2].trim();
    }
    return props;
  }

  /**
   * Extract tags from both tags:: property and inline #hashtags.
   */
  private extractAllTags(content: string, properties: Record<string, string>): string[] {
    const tags = new Set<string>();

    // From tags:: property
    const tagsProp = properties['tags'];
    if (tagsProp) {
      for (const tag of tagsProp.split(/[\s,]+/)) {
        const clean = tag.replace(/^#/, '').trim();
        if (clean) tags.add(clean);
      }
    }

    // From inline #hashtags
    const hashtagRegex = /(?:^|\s)#([\w\u4e00-\u9fff]+)/g;
    let m: RegExpExecArray | null;
    while ((m = hashtagRegex.exec(content)) !== null) {
      tags.add(m[1]);
    }

    return Array.from(tags);
  }

  /**
   * Strip property lines, Logseq metadata blocks (:LOGBOOK:...:END:),
   * and leading H1 heading (if it matches page name).
   * Returns clean markdown content for rendering.
   */
  private stripProperties(content: string, pageName: string): string {
    // Remove :LOGBOOK: ... :END: blocks (Logseq internal clock metadata)
    let stripped = content.replace(/:LOGBOOK:[\s\S]*?:END:/g, '');

    const lines = stripped.split('\n');
    const cleaned: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip property lines (key:: value)
      if (this.isProperty(trimmed)) continue;
      // Skip H1 heading if it matches the page name
      const h1Match = trimmed.match(/^#\s+(.+)$/);
      if (h1Match && h1Match[1].trim() === pageName) continue;
      cleaned.push(line);
    }

    return cleaned.join('\n').trim();
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ─── File discovery ───────────────────────────────────────

  private findMarkdownFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.findMarkdownFiles(fullPath));
      } else if (entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
    return results.sort();
  }

  private extractDateFromFilename(filename: string): string | null {
    const base = filename.replace(/\.md$/, '');
    const m = base.match(/(\d{4})[_-](\d{2})[_-](\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return null;
  }

  private isValidISODate(dateStr: string): boolean {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    return day <= daysInMonth;
  }

  // ─── Block parsing ─────────────────────────────────────────

  /**
   * Parse Logseq Markdown into a flat-then-nested block tree.
   *
   * Logseq blocks are list items ("- " / "* "). Indentation determines
   * parent-child relationships. Properties ("key:: value") attach to
   * the nearest parent block.
   */
  private parseBlocks(content: string): LogseqBlock[] {
    // Strip Logseq clock/timer metadata blocks before parsing
    const cleaned = content.replace(/:LOGBOOK:[\s\S]*?:END:/g, '');
    const lines = cleaned.split('\n');
    const roots: LogseqBlock[] = [];
    const stack: { block: LogseqBlock; indent: number }[] = [];

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      const indent = this.getIndent(rawLine);
      const isListItem = rawLine.trimStart().startsWith('- ') || rawLine.trimStart().startsWith('* ');

      if (!isListItem && !this.isProperty(trimmed)) {
        if (stack.length > 0 && trimmed && !trimmed.startsWith('---') && trimmed !== '-') {
          const current = stack[stack.length - 1].block;
          if (current.children.length === 0) {
            current.content += '\n' + trimmed;
          }
        }
        continue;
      }

      if (this.isProperty(trimmed)) {
        // Attach property to current block at this indent level
        const prop = this.parseProperty(trimmed);
        if (prop && stack.length > 0) {
          // Find the block at the parent indent level
          for (let i = stack.length - 1; i >= 0; i--) {
            if (stack[i].indent < indent) {
              stack[i].block.properties[prop.key] = prop.value;
              break;
            }
          }
        }
        continue;
      }

      if (!isListItem) continue;

      const blockContent = trimmed.replace(/^[-*]\s+/, '');
      if (!blockContent || blockContent === '-') continue;

      const block: LogseqBlock = {
        content: blockContent,
        properties: {},
        children: [],
        rawText: blockContent,
        indent,
      };

      // Pop stack to find parent
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        roots.push(block);
      } else {
        stack[stack.length - 1].block.children.push(block);
      }

      stack.push({ block, indent });
    }

    // Build rawText for each block
    for (const root of roots) {
      this.buildRawText(root);
    }

    return roots;
  }

  private buildRawText(block: LogseqBlock): string {
    let text = block.content;
    for (const child of block.children) {
      text += '\n' + this.buildRawText(child);
    }
    block.rawText = text;
    return text;
  }

  private getIndent(line: string): number {
    const match = line.match(/^(\s*)/);
    if (!match) return 0;
    // Count spaces (treat tab as 2 spaces)
    return match[1].replace(/\t/g, '  ').length;
  }

  private isProperty(line: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*::\s/.test(line.trim());
  }

  private parseProperty(line: string): { key: string; value: string } | null {
    const m = line.trim().match(/^([a-zA-Z_][a-zA-Z0-9_]*)::\s*(.*)$/);
    if (!m) return null;
    return { key: m[1], value: m[2].trim() };
  }

  // ─── Block → Event ─────────────────────────────────────────

  private blockToEvent(
    block: LogseqBlock,
    date: string,
    sourceFile: string,
    graphPath: string,
  ): TMEvent | null {
    const title = this.stripMarkdown(block.content).trim();
    if (!title) return null;

    const id = this.makeEventId(date, title);

    // Extract tags from properties and content
    const tags = this.extractTags(block);

    // Extract [[links]]
    const links = this.extractLinks(block.rawText);

    // Extract media (images)
    const media = this.extractMedia(block.rawText, graphPath);

    // Render child content as HTML
    const childMarkdown = this.childrenToMarkdown(block.children);
    const contentHtml = this.renderMarkdown(childMarkdown);
    const contentRaw = childMarkdown || block.content;

    return {
      id,
      title,
      date,
      hasValidDate: true,
      contentHtml,
      contentRaw,
      tags,
      links,
      media,
      sourceFile,
      siblingIds: [],
      backlinkIds: [],
      relatedIds: [],
    };
  }

  private makeEventId(date: string, title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return `${date}-${slug}`;
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/[#*`~]/g, '')
      .trim();
  }

  /**
   * True when block content is only one or more [[wiki links]] (plus whitespace).
   * Used to skip journal "index" blocks that merely point at page events.
   */
  private isWikiLinkOnlyContent(content: string): boolean {
    const text = content.trim();
    if (!text) return false;

    const links = this.extractLinks(text);
    if (links.length === 0) return false;

    // Remove wiki links; if nothing meaningful remains, this is an index block.
    const remainder = text
      .replace(/(?<!!)\[\[([^\]]+)\]\]/g, '')
      .replace(/\s+/g, '')
      .trim();
    return remainder.length === 0;
  }

  private extractTags(block: LogseqBlock): string[] {
    const tags = new Set<string>();

    // From tags:: property
    const tagsProp = block.properties['tags'];
    if (tagsProp) {
      for (const tag of tagsProp.split(/[\s,]+/)) {
        const clean = tag.replace(/^#/, '').trim();
        if (clean) tags.add(clean);
      }
    }

    // From #hashtag in content
    const hashtagRegex = /(?:^|\s)#([\w\u4e00-\u9fff]+)/g;
    let m: RegExpExecArray | null;
    while ((m = hashtagRegex.exec(block.rawText)) !== null) {
      tags.add(m[1]);
    }

    return Array.from(tags);
  }

  private extractLinks(text: string): string[] {
    const links = new Set<string>();
    // Match [[...]] but NOT ![[...]] (those are embeds, handled by extractMedia)
    const regex = /(?<!!)\[\[([^\]]+)\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      // Skip asset files (images/videos) — they're embeds, not page links
      const name = m[1].trim();
      const ext = path.extname(name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.webm'].includes(ext)) continue;
      links.add(name);
    }
    return Array.from(links);
  }

  private extractMedia(text: string, graphPath: string): MediaAsset[] {
    const media: MediaAsset[] = [];

    // Markdown images: ![alt](path)
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = imgRegex.exec(text)) !== null) {
      const imgPath = m[2];
      const resolved = this.resolveAssetPath(imgPath, graphPath);
      media.push({
        originalPath: resolved,
        type: 'image',
        alt: m[1] || undefined,
      });
    }

    // Logseq embed: [[../assets/image.jpg]]
    const embedRegex = /!\[\[([^\]]+\.(?:jpg|jpeg|png|gif|webp|mp4|mov))\]\]/gi;
    while ((m = embedRegex.exec(text)) !== null) {
      const imgPath = m[1];
      const resolved = this.resolveAssetPath(imgPath, graphPath);
      const ext = path.extname(imgPath).toLowerCase();
      const isVideo = ['.mp4', '.mov', '.webm'].includes(ext);
      media.push({
        originalPath: resolved,
        type: isVideo ? 'video' : 'image',
        alt: undefined,
      });
    }

    return media;
  }

  private resolveAssetPath(assetRef: string, graphPath: string): string {
    // If already absolute, return as-is
    if (path.isAbsolute(assetRef)) return assetRef;

    // Strip leading "../"
    const cleaned = assetRef.replace(/^(\.\.\/)+/, '');

    // Try resolving against graph root first
    const directPath = path.resolve(graphPath, cleaned);
    if (fs.existsSync(directPath)) return directPath;

    // Try assets/ directory (Logseq stores assets there)
    const assetsPath = path.resolve(graphPath, 'assets', cleaned);
    if (fs.existsSync(assetsPath)) return assetsPath;

    // Fallback: resolve against graph root (file may not exist yet)
    return directPath;
  }

  private childrenToMarkdown(children: LogseqBlock[]): string {
    if (children.length === 0) return '';

    const lines: string[] = [];
    for (const child of children) {
      lines.push(`- ${child.content}`);
      if (child.children.length > 0) {
        const sub = this.childrenToMarkdown(child.children);
        for (const subLine of sub.split('\n')) {
          if (subLine) lines.push('  ' + subLine);
        }
      }
    }
    return lines.join('\n');
  }

  private renderMarkdown(markdown: string): string {
    if (!markdown) return '';

    let processed = markdown;

    // ── Step 1: Extract iframes BEFORE markdown parsing ────────────
    // Logseq stores iframes as list items: "- <iframe ...>...</iframe>"
    // We lift them out of the list context so marked treats them as HTML blocks.
    const iframeBlocks: string[] = [];
    processed = processed.replace(
      /^[ \t]*-[ \t]+(<iframe[\s\S]*?<\/iframe>)/gim,
      (_, iframe: string) => {
        const idx = iframeBlocks.length;
        iframeBlocks.push(iframe.trim());
        // Use a fenced marker that marked will pass through as an HTML block
        return `\n\n<div class="ec-embed" data-idx="${idx}"></div>\n\n`;
      },
    );

    // ── Step 2: Replace inline images with placeholder <img> tags ──
    // Images keep their original position in the text.
    // The "data-ec-orig" attribute is used by the Builder to rewrite paths
    // to processed WebP assets after image processing is complete.
    processed = processed.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (_, alt: string, src: string) => {
        const cleanSrc = src.trim();
        return `<img class="ec-img" src="${cleanSrc}" data-ec-orig="${cleanSrc}" alt="${alt || ''}" loading="lazy">`;
      },
    );

    // Logseq embed images: ![[path]] — same treatment
    processed = processed.replace(
      /!\[\[([^\]]+\.(?:jpg|jpeg|png|gif|webp|mp4|mov))\]\]/gi,
      (_, src: string) => {
        const cleanSrc = src.trim();
        return `<img class="ec-img" src="${cleanSrc}" data-ec-orig="${cleanSrc}" alt="" loading="lazy">`;
      },
    );

    // ── Step 3: Convert [[links]] to styled anchors ─────────────────
    processed = processed.replace(
      /\[\[([^\]]+)\]\]/g,
      (_, name: string) => `[${name}](#${encodeURIComponent(name)})`,
    );

    // ── Step 4: Render markdown ─────────────────────────────────────
    const html = marked.parse(processed, { async: false }) as string;

    // ── Step 5: Restore iframes in place ───────────────────────────
    let result = html.replace(
      /<div class="ec-embed" data-idx="(\d+)"><\/div>/g,
      (_, idx: string) => iframeBlocks[parseInt(idx, 10)] ?? '',
    );

    // ── Step 6: Style [[link]] anchors ──────────────────────────────
    result = result.replace(
      /<a href="#([^"]+)">/g,
      '<a href="#$1" class="tm-link">',
    );

    // ── Step 7: Remove empty list items (e.g. Logseq blank blocks) ─
    result = result.replace(/<li>\s*<\/li>\s*/g, '');

    return result;
  }
}
