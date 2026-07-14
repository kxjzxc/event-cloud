/**
 * Default Renderer — generates the static Event Cloud website.
 *
 * Output structure:
 *   index.html          Homepage (explore button)
 *   archive.html        Archive (unlocked events)
 *   events/{id}.html    One page per event
 *   css/style.css       Site styles
 *   js/app.js           Frontend logic
 *   index.json          Event index (written by Builder)
 */

import type { IRenderer, TMEvent, EventIndexEntry, RenderContext } from '../../types';
import {
  getCSS,
  getAppJS,
  renderHomepage,
  renderEventPage,
  renderArchivePage,
} from './templates';

export class DefaultRenderer implements IRenderer {
  readonly name = 'default';

  async render(
    events: TMEvent[],
    index: EventIndexEntry[],
    ctx: RenderContext,
  ): Promise<void> {
    const { storage } = ctx;

    // Static assets
    await storage.save('css/style.css', getCSS());
    await storage.save('js/app.js', getAppJS());

    // Pages
    await storage.save('index.html', renderHomepage(index));
    await storage.save('archive.html', renderArchivePage(index));

    // Event pages
    const titleMap = new Map(events.map((e) => [e.id, e.title]));
    for (const event of events) {
      const html = renderEventPage(event, titleMap, index);
      await storage.save(`events/${event.id}.html`, html);
    }
  }
}
