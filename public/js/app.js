/**
 * Google Photos — Semantic Photo Locator
 * Interaction: SEARCH → HIGHLIGHT → EXPLORE CONTEXT → NEXT MATCH
 *
 * Core rule from spec (Section 4):
 *   The entire chronological timeline ALWAYS stays visible.
 *   Matching photos are highlighted IN-PLACE.
 *   NEXT/PREV scrolls between matching photos.
 *   The timeline is NEVER filtered down to only matching photos.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // PHOTO DATASET — Full chronological timeline with semantic tags
  // Tags are conceptual, not shown during normal browsing (Section 3)
  // ==========================================================================
  const PHOTO_DB = [
    // Nov 14, 2023 — Bangalore (before trip)
    { id: 'p001', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80', tags: ['home','coffee','morning','family'] },
    { id: 'p002', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=400&q=80', tags: ['home','balcony','morning','family'] },
    { id: 'p003', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=400&q=80', tags: ['street','city','evening'] },
    { id: 'p004', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=400&q=80', tags: ['market','afternoon'] },
    { id: 'p005', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80', tags: ['coffee','café','friends','afternoon'] },
    { id: 'p006', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80', tags: ['café','friends','pastry','evening'] },

    // Nov 15, 2023 — Travel to Goa
    { id: 'p007', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'Bangalore Airport', url: 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=400&q=80', tags: ['travel','airport','morning','goa'] },
    { id: 'p008', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'In Flight', url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=400&q=80', tags: ['travel','flight','morning','goa'] },
    { id: 'p009', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'Panaji, Goa', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80', tags: ['goa','villa','afternoon','travel','friends'] },
    { id: 'p010', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'Panaji, Goa', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80', tags: ['goa','hotel','pool','afternoon','friends'] },
    { id: 'p011', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'Baga Beach, Goa', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80', tags: ['goa','beach','sunset','friends','travel'] },
    { id: 'p012', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'Baga Beach, Goa', url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=400&q=80', tags: ['goa','beach','waves','evening','friends'] },

    // Nov 16, 2023 — Goa Day 1 (Anjuna Flea Market)
    { id: 'p013', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Anjuna, Goa', url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=400&q=80', tags: ['goa','morning','beach','light'] },
    { id: 'p014', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Anjuna, Goa', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80', tags: ['goa','market','crafts','morning','friends'] },
    { id: 'p015', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Anjuna, Goa', url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=400&q=80', tags: ['goa','market','shopping','afternoon'] },
    { id: 'p016', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Café Lilliput, Anjuna', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80', tags: ['goa','café','friends','evening','dinner','beach'] },
    { id: 'p017', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Café Lilliput, Anjuna', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80', tags: ['goa','café','coffee','evening','friends'] },
    { id: 'p018', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Curlies, Anjuna', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80', tags: ['goa','nightlife','music','beach','friends','night'] },

    // Nov 17, 2023 — Goa Day 2 (Heritage & Café Evening)
    { id: 'p019', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Old Goa', url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=400&q=80', tags: ['goa','heritage','church','morning','travel'] },
    { id: 'p020', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Old Goa', url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=400&q=80', tags: ['goa','architecture','history','morning'] },
    { id: 'p021', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Fontainhas, Panaji', url: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=400&q=80', tags: ['goa','café','brunch','friends','afternoon','lunch'] },
    { id: 'p022', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Fontainhas, Panaji', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80', tags: ['goa','street','walking','afternoon','friends'] },
    { id: 'p023', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Calangute Beach, Goa', url: 'https://images.unsplash.com/photo-1542397284385-6010376c5337?auto=format&fit=crop&w=400&q=80', tags: ['goa','beach','sunset','evening','friends'] },
    { id: 'p024', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Calangute Beach, Goa', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=401&q=80', tags: ['goa','beach','water','sunset','evening'] },
    { id: 'p025', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Shacks, Calangute Goa', url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=400&q=80', tags: ['goa','café','dinner','friends','evening','beach'] },
    { id: 'p026', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Shacks, Calangute Goa', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=401&q=80', tags: ['goa','café','night','friends','food'] },

    // Nov 18, 2023 — Goa Day 3 (Departure)
    { id: 'p027', date: '2023-11-18', dateStr: 'Nov 18, 2023', loc: 'Anjuna Beach, Goa', url: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=400&q=80', tags: ['goa','beach','morning','water','last day'] },
    { id: 'p028', date: '2023-11-18', dateStr: 'Nov 18, 2023', loc: 'Anjuna Beach, Goa', url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=401&q=80', tags: ['goa','beach','swimming','morning','friends'] },
    { id: 'p029', date: '2023-11-18', dateStr: 'Nov 18, 2023', loc: 'Goa Airport', url: 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=401&q=80', tags: ['goa','airport','travel','afternoon'] },
    { id: 'p030', date: '2023-11-18', dateStr: 'Nov 18, 2023', loc: 'Back Home', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=401&q=80', tags: ['home','coffee','evening','family'] },

    // Dec 2023 — Home / City
    { id: 'p031', date: '2023-12-04', dateStr: 'Dec 4, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80', tags: ['city','evening','friends'] },
    { id: 'p032', date: '2023-12-04', dateStr: 'Dec 4, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=401&q=80', tags: ['café','friends','afternoon','hangout'] },
    { id: 'p033', date: '2023-12-04', dateStr: 'Dec 4, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=401&q=80', tags: ['café','coffee','evening','alone'] },

    // Dec 25, 2023 — Christmas
    { id: 'p034', date: '2023-12-25', dateStr: 'Dec 25, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1449495169669-7b118f960251?auto=format&fit=crop&w=400&q=80', tags: ['christmas','family','celebration','evening'] },
    { id: 'p035', date: '2023-12-25', dateStr: 'Dec 25, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80', tags: ['christmas','dinner','family','night'] },
    { id: 'p036', date: '2023-12-25', dateStr: 'Dec 25, 2023', loc: 'Bangalore', url: 'https://images.unsplash.com/photo-1418985991508-e47386d96a71?auto=format&fit=crop&w=400&q=80', tags: ['christmas','celebration','friends','night'] },
  ];

  // ==========================================================================
  // DOM REFS
  // ==========================================================================
  const searchInput     = document.getElementById('searchInput');
  const btnClearSearch  = document.getElementById('btnClearSearch');
  const searchInfoBar   = document.getElementById('searchInfoBar');
  const searchInfoText  = document.getElementById('searchInfoText');
  const searchTagsRow   = document.getElementById('searchTagsRow');
  const searchTagsList  = document.getElementById('searchTagsList');
  const suggestionsOverlay = document.getElementById('suggestionsOverlay');
  const gpTimeline      = document.getElementById('gpTimeline');
  const matchNavigator  = document.getElementById('matchNavigator');
  const btnPrevMatch    = document.getElementById('btnPrevMatch');
  const btnNextMatch    = document.getElementById('btnNextMatch');
  const navCounter      = document.getElementById('navCounter');
  const photoViewer     = document.getElementById('photoViewer');
  const btnViewerClose  = document.getElementById('btnViewerClose');
  const viewerImg       = document.getElementById('viewerImg');
  const viewerDate      = document.getElementById('viewerDate');
  const viewerLoc       = document.getElementById('viewerLoc');
  const viewerTags      = document.getElementById('viewerTags');
  const btnGoHome       = document.getElementById('btnGoHome');

  // Timeframe DOM refs
  const btnTimeframe          = document.getElementById('btnTimeframe');
  const timeframeBtnLabel     = document.getElementById('timeframeBtnLabel');
  const timeframeDropdown     = document.getElementById('timeframeDropdown');
  const timeframeActiveRow    = document.getElementById('timeframeActiveRow');
  const timeframeActivePillText = document.getElementById('timeframeActivePillText');
  const btnClearTimeframe     = document.getElementById('btnClearTimeframe');
  const tfCustomPanel         = document.getElementById('tfCustomPanel');
  const tfFromDate            = document.getElementById('tfFromDate');
  const tfToDate              = document.getElementById('tfToDate');
  const btnApplyCustom        = document.getElementById('btnApplyCustom');

  // ==========================================================================
  // STATE
  // ==========================================================================
  let activeQuery   = '';           // normalized current search query
  let activeTerms   = [];           // individual search terms
  let matchIds      = [];           // IDs of all matching photos (in order)
  let currentMatchIdx = 0;          // index into matchIds for current highlighted

  // Timeframe state
  let activePreset  = 'any';        // current preset key
  let tfFrom        = null;         // Date object (start of range), null = no limit
  let tfTo          = null;         // Date object (end of range), null = no limit

  // ==========================================================================
  // BUILD & RENDER FULL CHRONOLOGICAL TIMELINE
  // (Called once on load — photos stay here permanently, never removed)
  // ==========================================================================
  function buildTimeline() {
    // Group photos by date
    const groups = {};
    PHOTO_DB.forEach(p => {
      if (!groups[p.date]) {
        groups[p.date] = { dateStr: p.dateStr, loc: p.loc, photos: [] };
      }
      groups[p.date].photos.push(p);
    });

    Object.keys(groups).sort().forEach(date => {
      const g = groups[date];
      const groupEl = document.createElement('div');
      groupEl.className = 'gp-group';
      groupEl.id = `grp-${date}`;

      // Date + Location header
      const head = document.createElement('div');
      head.className = 'gp-group-head';
      head.innerHTML = `
        <span class="gp-group-date">${g.dateStr}</span>
        <span class="gp-group-loc">${g.loc}</span>
      `;
      groupEl.appendChild(head);

      // 3-column photo grid
      const grid = document.createElement('div');
      grid.className = 'gp-photo-grid';

      g.photos.forEach(photo => {
        const cell = document.createElement('div');
        cell.className = 'gp-photo-cell';
        cell.id = `cell-${photo.id}`;
        cell.dataset.id = photo.id;
        cell.dataset.date = photo.date;      // ISO date for timeframe check
        cell.dataset.tags = photo.tags.join(',');

        cell.innerHTML = `
          <img src="${photo.url}" alt="${photo.dateStr} · ${photo.loc}" loading="lazy" />
          <div class="gp-match-dot"></div>
          <div class="gp-photo-tags">
            ${photo.tags.map(t => `<span class="gp-photo-tag-chip">${t}</span>`).join('')}
          </div>
        `;

        cell.addEventListener('click', () => openViewer(photo));
        grid.appendChild(cell);
      });

      groupEl.appendChild(grid);
      gpTimeline.appendChild(groupEl);
    });

    // Set correct timeline top padding based on header height
    adjustTimelinePadding();
  }

  function adjustTimelinePadding() {
    const topBar = document.querySelector('.gp-top-bar');
    if (topBar) {
      gpTimeline.style.paddingTop = topBar.offsetHeight + 'px';
    }
  }

  // ==========================================================================
  // SEARCH LOGIC
  // SEARCH → HIGHLIGHT (in-place) → NEXT/PREV navigation
  // The timeline is NEVER filtered. Photos stay in their chronological order.
  // ==========================================================================

  function doSearch(rawQuery) {
    activeQuery = rawQuery.trim().toLowerCase();
    activeTerms = activeQuery
      .split(/[\s+,]+/)
      .map(t => t.trim())
      .filter(Boolean);

    if (!activeTerms.length) {
      clearSearch();
      return;
    }

    // 1. Find all matching photo IDs (photos whose tags include any search term
    //    AND whose date falls within the active time frame, if set)
    matchIds = [];
    document.querySelectorAll('.gp-photo-cell').forEach(cell => {
      const photoId   = cell.dataset.id;
      const tags      = (cell.dataset.tags || '').split(',');
      const photoDate = new Date(cell.dataset.date);

      const tagMatch  = activeTerms.some(term => tags.some(tag => tag.includes(term)));
      const dateMatch = isInTimeframe(photoDate);
      const isMatch   = tagMatch && dateMatch;

      cell.classList.remove('is-match', 'is-current-match');

      if (isMatch) {
        matchIds.push(photoId);
        cell.classList.add('is-match');
      }
    });

    // 2. Render active tag chips row
    renderTagChips();

    // 3. Show/update info bar: "Found N matching photos"
    if (matchIds.length > 0) {
      const tfSuffix = (activePreset !== 'any') ? ` within ${timeframeBtnLabel.textContent}` : '';
      searchInfoText.textContent = `Found ${matchIds.length} matching photo${matchIds.length > 1 ? 's' : ''}${tfSuffix}`;
      searchInfoBar.style.display = 'block';

      // 4. Highlight first match as current
      currentMatchIdx = 0;
      highlightCurrentMatch();

      // 5. Show NEXT/PREV navigator
      matchNavigator.style.display = 'flex';
      updateNavigator();

      // 6. Scroll to first match
      scrollToCurrentMatch(true);
    } else {
      searchInfoText.textContent = 'No photos match your search';
      searchInfoBar.style.display = 'block';
      matchNavigator.style.display = 'none';
    }

    adjustTimelinePadding();
  }

  function highlightCurrentMatch() {
    // Remove current-match from all, apply only to the current one
    document.querySelectorAll('.gp-photo-cell.is-current-match').forEach(c =>
      c.classList.remove('is-current-match')
    );

    if (matchIds.length === 0) return;

    const currentId = matchIds[currentMatchIdx];
    const cell = document.getElementById(`cell-${currentId}`);
    if (cell) {
      cell.classList.add('is-current-match');
    }
  }

  function scrollToCurrentMatch(firstTime = false) {
    if (matchIds.length === 0) return;
    const currentId = matchIds[currentMatchIdx];
    const cell = document.getElementById(`cell-${currentId}`);
    if (cell) {
      // Center the current match in viewport
      const behavior = firstTime ? 'smooth' : 'smooth';
      cell.scrollIntoView({ behavior, block: 'center' });
    }
  }

  function updateNavigator() {
    const total = matchIds.length;
    const current = currentMatchIdx + 1;
    navCounter.textContent = `${current} of ${total}`;
    btnPrevMatch.disabled = currentMatchIdx <= 0;
    btnNextMatch.disabled = currentMatchIdx >= total - 1;
  }

  function renderTagChips() {
    searchTagsList.innerHTML = '';
    activeTerms.forEach(term => {
      const chip = document.createElement('div');
      chip.className = 'gp-search-tag-chip';
      chip.innerHTML = `
        <span>${term}</span>
        <button class="gp-search-tag-remove" aria-label="Remove ${term}" data-term="${term}">✕</button>
      `;
      chip.querySelector('.gp-search-tag-remove').addEventListener('click', () => {
        removeTerm(term);
      });
      searchTagsList.appendChild(chip);
    });

    if (activeTerms.length > 0) {
      searchTagsRow.style.display = 'flex';
    } else {
      searchTagsRow.style.display = 'none';
    }
    adjustTimelinePadding();
  }

  function removeTerm(termToRemove) {
    activeTerms = activeTerms.filter(t => t !== termToRemove);
    const newQuery = activeTerms.join(' ');
    searchInput.value = newQuery;
    if (newQuery) {
      doSearch(newQuery);
    } else {
      clearSearch();
    }
  }

  function clearSearch() {
    activeQuery = '';
    activeTerms = [];
    matchIds = [];
    currentMatchIdx = 0;

    searchInput.value = '';
    btnClearSearch.style.display = 'none';
    searchInfoBar.style.display = 'none';
    searchTagsRow.style.display = 'none';
    matchNavigator.style.display = 'none';
    suggestionsOverlay.style.display = 'none';
    searchTagsList.innerHTML = '';

    // Remove all highlights — photos go back to normal
    document.querySelectorAll('.gp-photo-cell').forEach(c => {
      c.classList.remove('is-match', 'is-current-match');
    });

    adjustTimelinePadding();
  }

  // ==========================================================================
  // SEARCH INPUT EVENTS
  // ==========================================================================
  searchInput.addEventListener('focus', () => {
    if (!searchInput.value.trim()) {
      suggestionsOverlay.style.display = 'block';
    }
  });

  searchInput.addEventListener('input', () => {
    const val = searchInput.value;
    btnClearSearch.style.display = val ? 'flex' : 'none';

    if (!val.trim()) {
      suggestionsOverlay.style.display = 'block';
      clearSearch();
    } else {
      suggestionsOverlay.style.display = 'none';
    }
  });

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      suggestionsOverlay.style.display = 'none';
      searchInput.blur();
      doSearch(searchInput.value);
    }
    if (e.key === 'Escape') {
      clearSearch();
      searchInput.blur();
    }
  });

  btnClearSearch.addEventListener('click', () => {
    clearSearch();
    searchInput.focus();
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('#gpSearchBar') && !e.target.closest('#suggestionsOverlay')) {
      suggestionsOverlay.style.display = 'none';
    }
  });

  // Suggestion chips
  document.querySelectorAll('.gp-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.query;
      searchInput.value = q;
      btnClearSearch.style.display = 'flex';
      suggestionsOverlay.style.display = 'none';
      searchInput.blur();
      doSearch(q);
    });
  });

  // ==========================================================================
  // NEXT / PREVIOUS MATCH NAVIGATION
  // Scrolls chronological timeline to the next/prev matching photo
  // The timeline does NOT change — only the focused match changes
  // ==========================================================================
  btnNextMatch.addEventListener('click', () => {
    if (currentMatchIdx < matchIds.length - 1) {
      currentMatchIdx++;
      highlightCurrentMatch();
      scrollToCurrentMatch();
      updateNavigator();
    }
  });

  btnPrevMatch.addEventListener('click', () => {
    if (currentMatchIdx > 0) {
      currentMatchIdx--;
      highlightCurrentMatch();
      scrollToCurrentMatch();
      updateNavigator();
    }
  });

  btnGoHome.addEventListener('click', () => {
    clearSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ==========================================================================
  // TIME FRAME FILTER
  // ==========================================================================

  /** Returns true if photoDate falls within the active [tfFrom, tfTo] window */
  function isInTimeframe(photoDate) {
    if (activePreset === 'any') return true;
    if (tfFrom && photoDate < tfFrom) return false;
    if (tfTo   && photoDate > tfTo)   return false;
    return true;
  }

  /** Compute tfFrom / tfTo from a preset string */
  function applyPreset(preset) {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    activePreset = preset;
    tfFrom = null;
    tfTo   = null;

    if (preset === 'any') {
      /* no bounds */
    } else if (preset === 'today') {
      tfFrom = today;
      tfTo   = new Date(today.getTime() + 86399999);
    } else if (preset === 'week') {
      const dow = today.getDay();
      tfFrom = new Date(today); tfFrom.setDate(today.getDate() - dow);
      tfTo   = new Date(today); tfTo.setDate(today.getDate() + (6 - dow));
    } else if (preset === 'month') {
      tfFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      tfTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'year') {
      tfFrom = new Date(now.getFullYear(), 0, 1);
      tfTo   = new Date(now.getFullYear(), 11, 31);
    } else if (preset === 'last_year') {
      tfFrom = new Date(now.getFullYear() - 1, 0, 1);
      tfTo   = new Date(now.getFullYear() - 1, 11, 31);
    }
    /* 'custom' is handled by applyCustom() */
  }

  /** Human-readable label for the active timeframe pill */
  function timeframeLabel() {
    if (activePreset === 'any')       return null;
    if (activePreset === 'today')     return 'Today';
    if (activePreset === 'week')      return 'This week';
    if (activePreset === 'month')     return 'This month';
    if (activePreset === 'year')      return 'This year';
    if (activePreset === 'last_year') return 'Last year';
    if (activePreset === 'custom' && tfFrom && tfTo) {
      return `${fmtDate(tfFrom)} – ${fmtDate(tfTo)}`;
    }
    return null;
  }

  function fmtDate(d) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function updateTimeframeUI() {
    const label = timeframeLabel();
    if (label) {
      timeframeBtnLabel.textContent = label;
      btnTimeframe.classList.add('active');
      timeframeActivePillText.textContent = label;
      timeframeActiveRow.style.display = 'block';
    } else {
      timeframeBtnLabel.textContent = 'Any time';
      btnTimeframe.classList.remove('active');
      timeframeActiveRow.style.display = 'none';
    }
    // Re-run search if there's an active query
    if (activeTerms.length) doSearch(searchInput.value);
    adjustTimelinePadding();
  }

  function openDropdown() {
    // Position dropdown just below the timeframe row
    const rowRect = document.getElementById('timeframeRow').getBoundingClientRect();
    timeframeDropdown.style.top = (rowRect.bottom + 4) + 'px';
    timeframeDropdown.style.display = 'block';
    btnTimeframe.setAttribute('aria-expanded', 'true');
    // Mark active preset
    document.querySelectorAll('.gp-tf-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.preset === activePreset);
    });
  }

  function closeDropdown() {
    timeframeDropdown.style.display = 'none';
    btnTimeframe.setAttribute('aria-expanded', 'false');
    tfCustomPanel.style.display = 'none';
  }

  // Toggle dropdown open/close
  btnTimeframe.addEventListener('click', e => {
    e.stopPropagation();
    if (timeframeDropdown.style.display === 'none') {
      openDropdown();
    } else {
      closeDropdown();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('#timeframeDropdown') && !e.target.closest('#btnTimeframe')) {
      closeDropdown();
    }
  });

  // Preset option clicks
  document.querySelectorAll('.gp-tf-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const preset = opt.dataset.preset;
      if (preset === 'custom') {
        // Show custom sub-panel, keep dropdown open
        tfCustomPanel.style.display = 'flex';
        document.querySelectorAll('.gp-tf-option').forEach(o =>
          o.classList.toggle('selected', o.dataset.preset === 'custom'));
        return;
      }
      applyPreset(preset);
      closeDropdown();
      updateTimeframeUI();
    });
  });

  // Custom range Apply
  btnApplyCustom.addEventListener('click', () => {
    const fromVal = tfFromDate.value;
    const toVal   = tfToDate.value;
    if (!fromVal || !toVal) return;

    activePreset = 'custom';
    tfFrom = new Date(fromVal);
    tfTo   = new Date(toVal);
    // extend To to end of day
    tfTo.setHours(23, 59, 59, 999);

    closeDropdown();
    updateTimeframeUI();
  });

  // Dismiss active timeframe pill ×
  btnClearTimeframe.addEventListener('click', () => {
    applyPreset('any');
    updateTimeframeUI();
  });

  // ==========================================================================
  // FULLSCREEN PHOTO VIEWER (Section 13 — simple, photo-first)
  // ==========================================================================
  function openViewer(photo) {
    viewerImg.src = photo.url;
    viewerDate.textContent = photo.dateStr;
    viewerLoc.textContent = photo.loc;
    viewerTags.innerHTML = photo.tags
      .map(t => `<span class="gp-viewer-tag">${t}</span>`)
      .join('');
    photoViewer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeViewer() {
    photoViewer.style.display = 'none';
    viewerImg.src = '';
    document.body.style.overflow = '';
  }

  btnViewerClose.addEventListener('click', closeViewer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && photoViewer.style.display !== 'none') closeViewer();
  });

  // ==========================================================================
  // INIT
  // ==========================================================================
  buildTimeline();
});
