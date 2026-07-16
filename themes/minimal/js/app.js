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

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  var currentEventIndex = -1;
  var allEvents = [];
  var historyStack = [];
  var isRandomMode = false;
  var cardSource = null;
  var currentDayEvents = null;
  var currentDayDate = null;

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
    historyStack = [];
    isRandomMode = false;
    cardSource = null;
  }

  function renderCard(event) {
    if (!cardDate || !cardTitle || !cardContent) return;

    cardDate.textContent = event.date;
    cardTitle.textContent = event.title;

    var randomBtn = document.getElementById('btn-random');
    if (randomBtn) {
      randomBtn.style.display = '';
      if (isRandomMode) {
        randomBtn.textContent = '→ 下一站';
      } else {
        randomBtn.textContent = '← 返回';
      }
    }
    var reselectBtn = document.getElementById('btn-reselect');
    if (reselectBtn) reselectBtn.style.display = 'none';

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
      var mediaItems = [];
      event.media.forEach(function(m) {
        if (m.type === 'image') {
          var src = m.previewPath || m.thumbnailPath;
          if (src) {
            mediaItems.push({ type: 'image', src: src, alt: m.alt || '' });
          }
        } else if (m.type === 'video' && m.thumbnailPath) {
          mediaItems.push({ type: 'video', src: m.thumbnailPath });
        }
      });
      
      if (mediaItems.length === 0) {
        cardMedia.innerHTML = '';
        cardMedia.style.display = 'none';
      } else if (mediaItems.length === 1) {
        var singleHtml = '';
        var item = mediaItems[0];
        if (item.type === 'image') {
          singleHtml = '<img src="' + item.src + '" alt="' + item.alt + '" loading="lazy">';
        } else {
          singleHtml = '<video controls preload="metadata"><source src="' + item.src + '" type="video/mp4"></video>';
        }
        cardMedia.innerHTML = singleHtml;
        cardMedia.style.display = 'block';
      } else {
        var galleryHtml = '<div class="media-gallery-wrapper">';
        galleryHtml += '<div class="media-gallery" id="media-gallery">';
        mediaItems.forEach(function(item, i) {
          if (item.type === 'image') {
            galleryHtml += '<div class="media-item" data-index="' + i + '"><img src="' + item.src + '" alt="' + item.alt + '" loading="lazy"></div>';
          } else {
            galleryHtml += '<div class="media-item" data-index="' + i + '"><video controls preload="metadata"><source src="' + item.src + '" type="video/mp4"></video></div>';
          }
        });
        galleryHtml += '</div>';
        galleryHtml += '</div>';
        
        galleryHtml += '<div class="media-nav">';
        galleryHtml += '<button class="media-nav-btn prev" id="media-prev">←</button>';
        galleryHtml += '<button class="media-nav-btn next" id="media-next">→</button>';
        galleryHtml += '</div>';
        
        galleryHtml += '<div class="media-indicators" id="media-indicators">';
        mediaItems.forEach(function(item, i) {
          galleryHtml += '<span class="media-indicator' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></span>';
        });
        galleryHtml += '</div>';
        
        cardMedia.innerHTML = galleryHtml;
        cardMedia.style.display = 'block';
        
        initMediaGallery();
      }
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
          return '<a href="#" data-link="' + escapeHtml(l) + '" class="card-link">' + escapeHtml(l) + '</a>';
        }).join('');
        cardLinks.style.display = 'block';
      } else {
        cardLinks.innerHTML = '';
        cardLinks.style.display = 'none';
      }
    }
  }

  function initMediaGallery() {
    var gallery = document.getElementById('media-gallery');
    var prevBtn = document.getElementById('media-prev');
    var nextBtn = document.getElementById('media-next');
    var indicators = document.getElementById('media-indicators');
    
    if (!gallery) return;
    
    var items = gallery.querySelectorAll('.media-item');
    var currentIndex = 0;
    
    function updateIndicators() {
      if (indicators) {
        indicators.querySelectorAll('.media-indicator').forEach(function(ind, i) {
          ind.classList.toggle('active', i === currentIndex);
        });
      }
    }
    
    function scrollTo(index) {
      if (index < 0) index = items.length - 1;
      if (index >= items.length) index = 0;
      currentIndex = index;
      var item = items[index];
      if (item) {
        item.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
      updateIndicators();
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        scrollTo(currentIndex - 1);
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        scrollTo(currentIndex + 1);
      });
    }
    
    if (indicators) {
      indicators.querySelectorAll('.media-indicator').forEach(function(ind) {
        ind.addEventListener('click', function() {
          var idx = parseInt(this.getAttribute('data-index'), 10);
          scrollTo(idx);
        });
      });
    }
    
    gallery.addEventListener('scroll', function() {
      var containerWidth = gallery.offsetWidth;
      items.forEach(function(item, i) {
        var rect = item.getBoundingClientRect();
        var galleryRect = gallery.getBoundingClientRect();
        var offsetLeft = rect.left - galleryRect.left;
        var center = containerWidth / 2;
        if (Math.abs(offsetLeft + rect.width / 2 - center) < rect.width / 3) {
          currentIndex = i;
          updateIndicators();
        }
      });
    }, { passive: true });
  }

  function openCard(index, startRandomMode) {
    if (index < 0 || index >= allEvents.length) return;
    if (startRandomMode) {
      isRandomMode = true;
      historyStack = [];
    } else if (currentEventIndex >= 0) {
      historyStack.push(currentEventIndex);
    }
    currentEventIndex = index;
    var event = allEvents[index];
    unlock(event.id);
    renderCard(event);
    if (modal) modal.classList.add('active');
  }

  function navigateBack() {
    if (historyStack.length > 0) {
      var prevState = historyStack.pop();
      if (prevState.type === 'day-selector') {
        showDaySelector(prevState.date, prevState.events);
      } else {
        currentEventIndex = prevState;
        var event = allEvents[prevState];
        renderCard(event);
      }
    } else {
      closeCard();
      if (cardSource === 'date-picker') {
        var dateModal = document.getElementById('date-modal');
        if (dateModal) dateModal.classList.add('active');
      }
    }
  }

  function randomCard() {
    if (allEvents.length === 0) return;
    if (isRandomMode) {
      var randomIndex = Math.floor(Math.random() * allEvents.length);
      while (randomIndex === currentEventIndex && allEvents.length > 1) {
        randomIndex = Math.floor(Math.random() * allEvents.length);
      }
      openCard(randomIndex);
    } else {
      navigateBack();
    }
  }

  var launchBtn = document.getElementById('launch-btn');
  if (launchBtn) {
    allEvents = getEventData();

    var totalEl = document.getElementById('total-events');
    if (totalEl) totalEl.textContent = allEvents.length;

    var unlocked = getUnlocked();
    var validEventIds = new Set(allEvents.map(function(e) { return e.id; }));
    var unlockedCount = Object.keys(unlocked).filter(function(id) { return validEventIds.has(id); }).length;
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

      historyStack = [];
      openCard(globalIndex, true);
    });

    var dateJumpBtn = document.getElementById('date-jump-btn');
    var dateModal = document.getElementById('date-modal');
    var dateClose = document.getElementById('date-close');
    var dateConfirm = document.getElementById('date-confirm');
    var datePicker = document.getElementById('date-picker');

    if (dateJumpBtn && dateModal) {
      dateJumpBtn.addEventListener('click', function() {
        if (datePicker) {
          var today = new Date();
          datePicker.value = today.toISOString().split('T')[0];
        }
        dateModal.classList.add('active');
      });
    }

    if (dateClose && dateModal) {
      dateClose.addEventListener('click', function() {
        dateModal.classList.remove('active');
      });
      dateModal.addEventListener('click', function(e) {
        if (e.target === dateModal) dateModal.classList.remove('active');
      });
    }

    if (dateConfirm && datePicker) {
      dateConfirm.addEventListener('click', function() {
        var date = datePicker.value;
        if (!date) return;
        var dayEvents = allEvents.filter(function(e) { return e.hasValidDate && e.date === date; });
        dateModal.classList.remove('active');
        if (dayEvents.length === 0) {
          showMemoryLocked(date);
        } else if (dayEvents.length === 1) {
          var index = allEvents.findIndex(function(e) { return e.id === dayEvents[0].id; });
          if (index >= 0) {
            historyStack = [];
            cardSource = 'date-picker';
            openCard(index);
          }
        } else {
          cardSource = 'date-picker';
          showDaySelector(date, dayEvents);
        }
      });
    }
  }

  function showMemoryLocked(date) {
    if (!modal) return;
    cardDate.textContent = date;
    cardTitle.textContent = '记忆尚未解锁';
    cardContent.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:2rem 0;">这一天没有留下任何记录。</p>';
    if (cardMedia) { cardMedia.innerHTML = ''; cardMedia.style.display = 'none'; }
    if (cardTags) { cardTags.innerHTML = ''; cardTags.style.display = 'none'; }
    if (cardLinks) { cardLinks.innerHTML = ''; cardLinks.style.display = 'none'; }
    var randomBtn = document.getElementById('btn-random');
    if (randomBtn) randomBtn.style.display = 'none';
    var reselectBtn = document.getElementById('btn-reselect');
    if (reselectBtn) reselectBtn.style.display = '';
    modal.classList.add('active');
  }

  function showDaySelector(date, dayEvents) {
    if (!modal) return;
    currentDayDate = date;
    currentDayEvents = dayEvents;
    cardDate.textContent = date;
    cardTitle.textContent = '选择记忆';
    var listHtml = dayEvents.map(function(e) {
      return '<div class="day-event-item" data-id="' + e.id + '">' +
        '<div class="day-event-title">' + escapeHtml(e.title) + '</div>' +
        (e.media && e.media.length > 0 ? '<div class="day-event-has-media">📷</div>' : '') +
        '</div>';
    }).join('');
    cardContent.innerHTML = '<div class="day-event-list">' + listHtml + '</div>';
    if (cardMedia) { cardMedia.innerHTML = ''; cardMedia.style.display = 'none'; }
    if (cardTags) { cardTags.innerHTML = ''; cardTags.style.display = 'none'; }
    if (cardLinks) { cardLinks.innerHTML = ''; cardLinks.style.display = 'none'; }
    var randomBtn = document.getElementById('btn-random');
    if (randomBtn) randomBtn.style.display = '';
    randomBtn.textContent = '← 返回';
    var reselectBtn = document.getElementById('btn-reselect');
    if (reselectBtn) reselectBtn.style.display = 'none';
    modal.classList.add('active');

    var items = document.querySelectorAll('.day-event-item');
    items.forEach(function(item) {
      item.addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var index = allEvents.findIndex(function(e) { return e.id === id; });
        if (index >= 0) {
          historyStack.push({ type: 'day-selector', date: date, events: dayEvents });
          cardSource = 'date-picker';
          openCard(index);
        }
      });
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

  var reselectBtn = document.getElementById('btn-reselect');
  if (reselectBtn) {
    reselectBtn.addEventListener('click', function() {
      closeCard();
      var dateModal = document.getElementById('date-modal');
      if (dateModal) dateModal.classList.add('active');
    });
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
        if (index >= 0) {
          historyStack = [];
          cardSource = 'archive';
          openCard(index);
        }
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
