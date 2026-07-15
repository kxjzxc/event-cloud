(function() {
  'use strict';

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

  function getEventData() {
    var el = document.getElementById('event-data');
    if (!el) return [];
    try { return JSON.parse(el.textContent); }
    catch(e) { console.error('Failed to parse event data:', e); return []; }
  }

  var currentEventIndex = -1;
  var allEvents = [];

  var modal = document.getElementById('card-modal');
  var cardDate = document.getElementById('card-date');
  var cardTitle = document.getElementById('card-title');
  var cardContent = document.getElementById('card-content');
  var cardMedia = document.getElementById('card-media');
  var cardTags = document.getElementById('card-tags');
  var cardLinks = document.getElementById('card-links');
  var randomBtn = document.getElementById('btn-random');

  function closeCard() {
    if (modal) modal.classList.remove('active');
    currentEventIndex = -1;
  }

  function renderCard(event) {
    if (!cardDate || !cardTitle || !cardContent) return;

    cardDate.textContent = event.date;
    cardTitle.textContent = event.title;
    
    var content = event.contentHtml || '<p>No content</p>';
    if (event.media) {
      var mediaMap = {};
      event.media.forEach(function(m) {
        if (m.previewPath) {
          var filename = m.originalPath ? m.originalPath.split('/').pop() : '';
          if (filename) mediaMap[filename] = m.previewPath;
        } else if (m.thumbnailPath) {
          var filename = m.originalPath ? m.originalPath.split('/').pop() : '';
          if (filename) mediaMap[filename] = m.thumbnailPath;
        }
      });
      for (var filename in mediaMap) {
        content = content.replace(new RegExp('src="#' + filename + '"', 'g'), 'src="' + mediaMap[filename] + '"');
      }
    }
    cardContent.innerHTML = content;

    if (cardMedia) {
      var mediaHtml = '';
      event.media.forEach(function(m) {
        if (m.type === 'image') {
          var src = m.previewPath || m.thumbnailPath;
          if (src) {
            mediaHtml += '<img src="' + src + '" alt="' + (m.alt || '') + '" loading="lazy">';
          }
        } else if (m.type === 'video' && m.thumbnailPath) {
          mediaHtml += '<video controls preload="metadata"><source src="' + m.thumbnailPath + '" type="video/mp4"></video>';
        }
      });
      cardMedia.innerHTML = mediaHtml;
      cardMedia.style.display = mediaHtml ? 'grid' : 'none';
    }

    if (cardTags) {
      if (event.tags && event.tags.length > 0) {
        cardTags.innerHTML = event.tags.map(function(t) {
          return '<span class="card-tag">' + t + '</span>';
        }).join('');
        cardTags.style.display = 'flex';
      } else {
        cardTags.innerHTML = '';
        cardTags.style.display = 'none';
      }
    }

    if (cardLinks) {
      if (event.links && event.links.length > 0) {
        cardLinks.innerHTML = event.links.map(function(l) {
          return '<a href="#" data-link="' + l + '" class="card-link">' + l + '</a>';
        }).join('');
        cardLinks.style.display = 'block';
      } else {
        cardLinks.innerHTML = '';
        cardLinks.style.display = 'none';
      }
    }
  }

  function openCard(index) {
    if (index < 0 || index >= allEvents.length) return;
    currentEventIndex = index;
    var event = allEvents[index];
    unlock(event.id);
    renderCard(event);
    if (modal) modal.classList.add('active');
  }

  function randomCard() {
    if (allEvents.length === 0) return;
    var randomIndex = Math.floor(Math.random() * allEvents.length);
    while (randomIndex === currentEventIndex && allEvents.length > 1) {
      randomIndex = Math.floor(Math.random() * allEvents.length);
    }
    openCard(randomIndex);
  }

  var launchBtn = document.getElementById('launch-btn');
  if (launchBtn) {
    allEvents = getEventData();

    var totalEl = document.getElementById('total-events');
    if (totalEl) totalEl.textContent = allEvents.length;

    var unlocked = getUnlocked();
    var unlockedCount = Object.keys(unlocked).length;
    var unlockedEl = document.getElementById('unlocked-count');
    if (unlockedEl) unlockedEl.textContent = unlockedCount;

    launchBtn.addEventListener('click', function() {
      if (allEvents.length === 0) {
        launchBtn.textContent = '暂无事件';
        return;
      }

      var lockedEvents = allEvents.filter(function(e) {
        return !isUnlocked(e.id);
      });

      var pool = lockedEvents.length > 0 ? lockedEvents : allEvents;
      var randomIndex = Math.floor(Math.random() * pool.length);
      var event = pool[randomIndex];
      var globalIndex = allEvents.findIndex(function(e) { return e.id === event.id; });

      openCard(globalIndex);
    });
  }

  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeCard();
    });
  }

  var closeBtn = document.getElementById('card-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCard);
  }

  document.addEventListener('click', function(e) {
    var link = e.target.closest('.card-link');
    if (link) {
      e.preventDefault();
      var linkTitle = link.getAttribute('data-link');
      var targetIndex = allEvents.findIndex(function(e) {
        return e.title === linkTitle || e.id.toLowerCase().indexOf(linkTitle.toLowerCase().replace(/\s+/g, '-')) >= 0;
      });
      if (targetIndex >= 0) {
        openCard(targetIndex);
      }
    }
  });

  if (randomBtn) {
    randomBtn.addEventListener('click', randomCard);
  }

  document.addEventListener('keydown', function(e) {
    if (!modal || !modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeCard();
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      randomCard();
    }
  });

  var archiveGrid = document.getElementById('archive-grid');
  if (archiveGrid) {
    var archiveEvents = [];
    var activeTag = null;

    archiveEvents = getEventData();
    allEvents = archiveEvents;
    
    var unlocked = getUnlocked();
    archiveEvents = archiveEvents.filter(function(e) { return e.id in unlocked; });
    archiveEvents.sort(function(a, b) { return b.date.localeCompare(a.date); });

    function renderTags() {
      var tagSet = {};
      archiveEvents.forEach(function(e) {
        if (e.tags) e.tags.forEach(function(t) { tagSet[t] = (tagSet[t] || 0) + 1; });
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
      var filtered = archiveEvents.filter(function(e) {
        var matchText = !query || e.title.toLowerCase().indexOf(query) >= 0;
        var matchTag = !activeTag || (e.tags && e.tags.indexOf(activeTag) >= 0);
        return matchText && matchTag;
      });

      if (filtered.length === 0) {
        archiveGrid.innerHTML = '<div class="archive-empty">没有找到匹配的事件。</div>';
        return;
      }

      archiveGrid.innerHTML = filtered.map(function(e) {
        var tagsHtml = e.tags ? e.tags.map(function(t) { return '#' + t; }).join(' ') : '';
        return '<div class="archive-card" data-id="' + e.id + '">' +
          '<div class="archive-card-date">' + e.date + '</div>' +
          '<div class="archive-card-title">' + e.title + '</div>' +
          '<div class="archive-card-tags">' + tagsHtml + '</div>' +
        '</div>';
      }).join('');

      archiveGrid.querySelectorAll('.archive-card').forEach(function(card) {
        card.addEventListener('click', function() {
          var id = card.getAttribute('data-id');
          var index = allEvents.findIndex(function(e) { return e.id === id; });
          if (index >= 0) openCard(index);
        });
      });
    }

    renderTags();
    renderGrid();

    var search = document.getElementById('archive-search');
    if (search) {
      search.addEventListener('input', function() {
        renderGrid(search.value.toLowerCase());
      });
    }
  }
})();
