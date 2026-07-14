/**
 * Default Renderer Templates — HTML/CSS/JS for the Event Cloud site.
 *
 * All frontend assets are generated as strings and written via IStorage.
 * No template engine dependency — TypeScript template literals + type safety.
 */

import type { TMEvent, EventIndexEntry, MediaAsset } from '../../types';

// ─── CSS ──────────────────────────────────────────────────────

export function getCSS(): string {
  return `
:root {
  --bg: #0a0a0f;
  --bg-card: #14141e;
  --bg-hover: #1a1a28;
  --text: #e0e0e8;
  --text-dim: #8888a0;
  --accent: #6c8cff;
  --accent-glow: rgba(108, 140, 255, 0.3);
  --border: #22222e;
  --radius: 12px;
  --serif: Georgia, 'Times New Roman', serif;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  line-height: 1.7;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ── Homepage ─────────────────────────────── */

.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  background: radial-gradient(ellipse at center, #12121e 0%, var(--bg) 70%);
}

.home-title {
  font-family: var(--serif);
  font-size: 2.5rem;
  font-weight: 400;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
}

.home-subtitle {
  font-size: 0.9rem;
  color: var(--text-dim);
  margin-bottom: 3rem;
  letter-spacing: 0.05em;
}

.launch-btn {
  position: relative;
  padding: 1.2rem 3rem;
  font-size: 1.1rem;
  font-family: var(--sans);
  color: var(--text);
  background: transparent;
  border: 1px solid var(--accent);
  border-radius: 50px;
  cursor: pointer;
  letter-spacing: 0.1em;
  transition: all 0.3s ease;
  overflow: hidden;
}

.launch-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 50px;
}

.launch-btn:hover {
  box-shadow: 0 0 30px var(--accent-glow);
  transform: translateY(-2px);
}

.launch-btn:hover::before { opacity: 0.15; }

.launch-btn span { position: relative; z-index: 1; }

.home-stats {
  margin-top: 2rem;
  font-size: 0.8rem;
  color: var(--text-dim);
}

/* ── Event Page ───────────────────────────── */

.event-page {
  max-width: 780px;
  margin: 0 auto;
  padding: 3rem 1.5rem 6rem;
}

.event-header {
  margin-bottom: 2.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1.5rem;
}

.event-date {
  font-size: 0.85rem;
  color: var(--accent);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.event-title {
  font-family: var(--serif);
  font-size: 2rem;
  font-weight: 400;
  line-height: 1.3;
}

.event-content {
  font-size: 1.05rem;
  color: var(--text);
}

.event-content p { margin-bottom: 1rem; }
.event-content ul, .event-content ol { margin-bottom: 1rem; padding-left: 1.5rem; }
.event-content li { margin-bottom: 0.5rem; }
.event-content .tm-link {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dotted var(--accent);
}
.event-content img {
  max-width: 100%;
  border-radius: var(--radius);
  margin: 1.5rem 0;
  cursor: pointer;
  transition: opacity 0.2s;
}
.event-content img:hover { opacity: 0.9; }

.event-media {
  margin: 2rem 0;
  display: grid;
  gap: 1rem;
}

.event-media img {
  width: 100%;
  border-radius: var(--radius);
  cursor: pointer;
}

.event-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 2rem;
}

.tag {
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-dim);
}

.event-links {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.event-links a {
  color: var(--accent);
  text-decoration: none;
  margin-right: 0.5rem;
}

.event-footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.siblings {
  margin-bottom: 1.5rem;
}

.siblings h4 {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sibling-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sibling-item {
  padding: 0.5rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.sibling-item:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
}

.sibling-item.backlink {
  border-color: rgba(108, 140, 255, 0.2);
}
.sibling-item.backlink::before {
  content: '← ';
  color: var(--text-dim);
}

.sibling-item.related {
  border-color: rgba(200, 180, 100, 0.2);
}
.sibling-item.related::before {
  content: '# ';
  color: var(--text-dim);
}

.tm-link-dead {
  color: var(--text-dim);
  border-bottom: 1px dotted var(--text-dim);
  cursor: default;
}

.event-media video {
  width: 100%;
  border-radius: var(--radius);
  margin: 0.5rem 0;
}

.travel-again {
  display: inline-block;
  padding: 0.8rem 2rem;
  background: transparent;
  border: 1px solid var(--accent);
  border-radius: 50px;
  color: var(--text);
  text-decoration: none;
  cursor: pointer;
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  transition: all 0.3s;
}

.travel-again:hover {
  box-shadow: 0 0 20px var(--accent-glow);
  background: rgba(108, 140, 255, 0.1);
}

.back-home {
  position: fixed;
  top: 1rem;
  left: 1rem;
  font-size: 0.8rem;
  color: var(--text-dim);
  text-decoration: none;
  padding: 0.5rem 1rem;
  background: rgba(20, 20, 30, 0.8);
  border: 1px solid var(--border);
  border-radius: 20px;
  backdrop-filter: blur(8px);
  z-index: 100;
  transition: color 0.2s;
}

.back-home:hover { color: var(--accent); }

/* ── Archive ──────────────────────────────── */

.archive-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}

.archive-header {
  margin-bottom: 2rem;
}

.archive-header h1 {
  font-family: var(--serif);
  font-size: 2rem;
  font-weight: 400;
  margin-bottom: 0.5rem;
}

.archive-header p {
  color: var(--text-dim);
  font-size: 0.9rem;
}

.archive-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.archive-search {
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 0.95rem;
  outline: none;
}

.archive-search:focus { border-color: var(--accent); }

.tag-filter {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.tag-chip {
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.2s;
}

.tag-chip.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.archive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.archive-card {
  padding: 1.2rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--text);
  transition: all 0.2s;
}

.archive-card:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  transform: translateY(-2px);
}

.archive-card-date {
  font-size: 0.75rem;
  color: var(--accent);
  margin-bottom: 0.4rem;
}

.archive-card-title {
  font-size: 1rem;
  margin-bottom: 0.4rem;
}

.archive-card-tags {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.archive-empty {
  text-align: center;
  padding: 3rem;
  color: var(--text-dim);
}

/* ── Loading ──────────────────────────────── */

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: var(--text-dim);
  font-size: 0.9rem;
  letter-spacing: 0.1em;
}

.loading::after {
  content: '...';
  animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
  0%, 20% { content: ''; }
  40% { content: '.'; }
  60% { content: '..'; }
  80%, 100% { content: '...'; }
}

/* ── Image modal ──────────────────────────── */

.modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  justify-content: center;
  align-items: center;
  cursor: zoom-out;
}

.modal.active { display: flex; }

.modal img {
  max-width: 90%;
  max-height: 90%;
  border-radius: 8px;
}

@media (max-width: 640px) {
  .home-title { font-size: 1.8rem; }
  .event-title { font-size: 1.5rem; }
  .archive-grid { grid-template-columns: 1fr; }
}
`;
}

// ─── JavaScript ───────────────────────────────────────────────

export function getAppJS(): string {
  return `
// Event Cloud — Frontend Logic
(function() {
  'use strict';

  // ── localStorage helpers ──────────────────
  var STORAGE_KEY = 'tm_unlocked';
  var localStorageOk = (function() {
    try { var t = '__test__'; localStorage.setItem(t, '1'); localStorage.removeItem(t); return true; }
    catch(e) { return false; }
  })();

  function getUnlocked() {
    if (!localStorageOk) return {};
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch(e) {
      return {};
    }
  }

  function unlock(eventId) {
    if (!localStorageOk) return;
    var unlocked = getUnlocked();
    unlocked[eventId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
  }

  function isUnlocked(eventId) {
    return eventId in getUnlocked();
  }

  // ── Read embedded event index ─────────────
  function getEventIndex() {
    var el = document.getElementById('event-index');
    if (!el) return [];
    try { return JSON.parse(el.textContent); }
    catch(e) { console.error('Failed to parse event index:', e); return []; }
  }

  // ── Homepage ──────────────────────────────
  var launchBtn = document.getElementById('launch-btn');
  if (launchBtn) {
    var index = getEventIndex();

    var totalEl = document.getElementById('total-events');
    if (totalEl) totalEl.textContent = index.length;

    var unlocked = getUnlocked();
    var unlockedCount = Object.keys(unlocked).length;
    var unlockedEl = document.getElementById('unlocked-count');
    if (unlockedEl) unlockedEl.textContent = unlockedCount;

    launchBtn.addEventListener('click', function() {
      if (index.length === 0) {
        launchBtn.querySelector('span').textContent = '暂无事件';
        return;
      }
      launchBtn.querySelector('span').textContent = '探索中...';
      launchBtn.disabled = true;

      // Pick random event: prefer locked ones
      var lockedEvents = index.filter(function(e) {
        return !isUnlocked(e.id);
      });

      var pool = lockedEvents.length > 0 ? lockedEvents : index;
      var random = pool[Math.floor(Math.random() * pool.length)];

      unlock(random.id);
      window.location.href = 'events/' + random.id + '.html';
    });
  }

  // ── Event page: auto-unlock ───────────────
  var eventPage = document.querySelector('.event-page');
  if (eventPage) {
    var eventId = eventPage.getAttribute('data-event-id');
    if (eventId) unlock(eventId);
  }

  // ── Travel again button ───────────────────
  var travelBtn = document.getElementById('travel-again');
  if (travelBtn) {
    travelBtn.addEventListener('click', function(e) {
      e.preventDefault();
      var index = getEventIndex();
      if (index.length === 0) return;

      var currentId = eventPage ? eventPage.getAttribute('data-event-id') : '';
      var unlocked = getUnlocked();
      var lockedEvents = index.filter(function(e) {
        return !(e.id in unlocked) && e.id !== currentId;
      });
      var pool = lockedEvents.length > 0 ? lockedEvents : index.filter(function(e) { return e.id !== currentId; });
      if (pool.length === 0) return;
      var random = pool[Math.floor(Math.random() * pool.length)];
      unlock(random.id);
      window.location.href = random.id + '.html';
    });
  }

  // ── Image modal ───────────────────────────
  var modal = document.getElementById('image-modal');
  var modalImg = document.getElementById('modal-img');
  if (modal) {
    document.querySelectorAll('.event-media img, .event-content img').forEach(function(img) {
      img.addEventListener('click', function() {
        var previewSrc = img.getAttribute('data-preview') || img.src;
        modalImg.src = previewSrc;
        modal.classList.add('active');
      });
    });
    modal.addEventListener('click', function() {
      modal.classList.remove('active');
    });
  }

  // ── Archive page ──────────────────────────
  var archiveGrid = document.getElementById('archive-grid');
  if (archiveGrid) {
    var allEvents = [];
    var activeTag = null;

    var index = getEventIndex();
    var unlocked = getUnlocked();
    allEvents = index.filter(function(e) { return e.id in unlocked; });

    // Sort by date descending
    allEvents.sort(function(a, b) { return b.date.localeCompare(a.date); });

    renderTags();
    renderGrid();

    // Search
    var search = document.getElementById('archive-search');
    if (search) {
      search.addEventListener('input', function() {
        renderGrid(search.value.toLowerCase());
      });
    }

    function renderTags() {
      var tagSet = {};
      allEvents.forEach(function(e) {
        e.tags.forEach(function(t) { tagSet[t] = (tagSet[t] || 0) + 1; });
      });

      var container = document.getElementById('tag-filter');
      if (!container) return;

      var html = Object.keys(tagSet).sort().map(function(tag) {
        return '<span class="tag-chip" data-tag="' + tag + '">' + tag + ' (' + tagSet[tag] + ')</span>';
      }).join('');
      container.innerHTML = html;

      container.querySelectorAll('.tag-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          var tag = chip.getAttribute('data-tag');
          if (activeTag === tag) {
            activeTag = null;
            chip.classList.remove('active');
          } else {
            activeTag = tag;
            container.querySelectorAll('.tag-chip').forEach(function(c) { c.classList.remove('active'); });
            chip.classList.add('active');
          }
          renderGrid();
        });
      });
    }

    function renderGrid(query) {
      query = query || '';
      var filtered = allEvents.filter(function(e) {
        var matchText = !query || e.title.toLowerCase().indexOf(query) >= 0;
        var matchTag = !activeTag || e.tags.indexOf(activeTag) >= 0;
        return matchText && matchTag;
      });

      if (filtered.length === 0) {
        archiveGrid.innerHTML = '<div class="archive-empty">没有找到匹配的事件。<br>先去探索事件云发现更多吧。</div>';
        return;
      }

      archiveGrid.innerHTML = filtered.map(function(e) {
        var tagsHtml = e.tags.map(function(t) { return '#' + t; }).join(' ');
        return '<a class="archive-card" href="events/' + e.id + '.html">' +
          '<div class="archive-card-date">' + e.date + '</div>' +
          '<div class="archive-card-title">' + e.title + '</div>' +
          '<div class="archive-card-tags">' + tagsHtml + '</div>' +
        '</a>';
      }).join('');
    }
  }
})();
`;
}

// ─── HTML Templates ───────────────────────────────────────────

export function renderHomepage(index: EventIndexEntry[]): string {
  const indexJson = JSON.stringify(index);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Cloud</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="home">
    <h1 class="home-title">Event Cloud</h1>
    <p class="home-subtitle">随机探索，遇见过去的自己</p>
    <button class="launch-btn" id="launch-btn">
      <span>探索事件云</span>
    </button>
    <div class="home-stats">
      <span id="total-events">—</span> 个事件 · 已解锁 <span id="unlocked-count">0</span> 个
    </div>
  </div>
  <script type="application/json" id="event-index">${indexJson}</script>
  <script src="js/app.js"></script>
</body>
</html>`;
}

export function renderEventPage(event: TMEvent, titleMap: Map<string, string>, index: EventIndexEntry[]): string {
  // Build reverse lookup: title → event ID (for link resolution)
  const titleToId = new Map<string, string>();
  for (const [id, title] of titleMap) {
    titleToId.set(title.toLowerCase(), id);
  }

  // Post-process content HTML: resolve [[link]] anchors to actual event pages
  // marked URL-encodes href characters, so we need decodeURIComponent
  let resolvedContent = event.contentHtml.replace(
    /<a href="#([^"]+)" class="tm-link">/g,
    (match, encodedName: string) => {
      const linkName = decodeURIComponent(encodedName);
      const targetId = titleToId.get(linkName.toLowerCase());
      if (targetId) {
        return `<a href="${targetId}.html" class="tm-link">`;
      }
      // No matching event — render as non-link styled span
      return `<span class="tm-link-dead">`;
    },
  );
  // Close dead links with </span> instead of </a>
  resolvedContent = resolvedContent.replace(
    /<span class="tm-link-dead">([^<]+)<\/a>/g,
    '<span class="tm-link-dead">$1</span>',
  );

  const tagsHtml = event.tags
    .map((t) => `<span class="tag">#${t}</span>`)
    .join('');

  const linksHtml =
    event.links.length > 0
      ? `<div class="event-links">链接: ${event.links
          .map((l) => {
            const targetId = titleToId.get(l.toLowerCase());
            if (targetId) return `<a href="${targetId}.html">${l}</a>`;
            return `<span class="tm-link-dead">${l}</span>`;
          })
          .join('')}</div>`
      : '';

  const siblingsHtml =
    event.siblingIds.length > 0
      ? `<div class="siblings">
          <h4>同一天</h4>
          <div class="sibling-list">
            ${event.siblingIds
              .map((id) => {
                const title = titleMap.get(id) || id;
                return `<a class="sibling-item" href="${id}.html">${title}</a>`;
              })
              .join('')}
          </div>
        </div>`
      : '';

  const backlinksHtml =
    event.backlinkIds.length > 0
      ? `<div class="siblings">
          <h4>被引用</h4>
          <div class="sibling-list">
            ${event.backlinkIds
              .map((id) => {
                const title = titleMap.get(id) || id;
                return `<a class="sibling-item backlink" href="${id}.html">${title}</a>`;
              })
              .join('')}
          </div>
        </div>`
      : '';

  const relatedHtml =
    event.relatedIds.length > 0
      ? `<div class="siblings">
          <h4>相关记忆</h4>
          <div class="sibling-list">
            ${event.relatedIds
              .map((id) => {
                const title = titleMap.get(id) || id;
                return `<a class="sibling-item related" href="${id}.html">${title}</a>`;
              })
              .join('')}
          </div>
        </div>`
      : '';

  // Render media gallery — images
  const imageMedia = event.media.filter((m) => m.type === 'image' && m.thumbnailPath);
  const videoMedia = event.media.filter((m) => m.type === 'video' && m.thumbnailPath);

  const imageHtml = imageMedia
    .map(
      (m: MediaAsset) =>
        `<img src="../${m.thumbnailPath}" data-preview="../${m.previewPath || m.thumbnailPath}" alt="${m.alt || ''}" loading="lazy">`,
    )
    .join('');

  const videoHtml = videoMedia
    .map(
      (m: MediaAsset) =>
        `<video controls preload="metadata" poster="">
           <source src="../${m.thumbnailPath}" type="video/mp4">
         </video>`,
    )
    .join('');

  const mediaHtml = imageHtml || videoHtml
    ? `<div class="event-media">${imageHtml}${videoHtml}</div>`
    : '';

  const contentWithMedia = resolvedContent + mediaHtml;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${event.title} — Event Cloud</title>
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <a href="../index.html" class="back-home">← 事件云</a>
  <div class="event-page" data-event-id="${event.id}">
    <div class="event-header">
      <div class="event-date">${event.date}</div>
      <h1 class="event-title">${event.title}</h1>
    </div>
    <div class="event-content">
      ${contentWithMedia}
    </div>
    <div class="event-tags">${tagsHtml}</div>
    ${linksHtml}
    <div class="event-footer">
      ${siblingsHtml}
      ${backlinksHtml}
      ${relatedHtml}
      <a href="#" class="travel-again" id="travel-again">继续探索 →</a>
    </div>
  </div>
  <div class="modal" id="image-modal">
    <img id="modal-img" src="" alt="">
  </div>
  <script type="application/json" id="event-index">${JSON.stringify(index)}</script>
  <script src="../js/app.js"></script>
</body>
</html>`;
}

export function renderArchivePage(index: EventIndexEntry[]): string {
  const indexJson = JSON.stringify(index);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>事件馆 — Event Cloud</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <a href="index.html" class="back-home">← 事件云</a>
  <div class="archive-page">
    <div class="archive-header">
      <h1>事件馆</h1>
      <p>已经解锁的事件。点击任意一条重新浏览。</p>
    </div>
    <div class="archive-controls">
      <input type="text" class="archive-search" id="archive-search" placeholder="搜索事件...">
      <div class="tag-filter" id="tag-filter"></div>
    </div>
    <div class="archive-grid" id="archive-grid">
      <div class="archive-empty">加载中...</div>
    </div>
  </div>
  <script type="application/json" id="event-index">${indexJson}</script>
  <script src="js/app.js"></script>
</body>
</html>`;
}
