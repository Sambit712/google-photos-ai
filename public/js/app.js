/**
 * Google Photos — Semantic Memory Locator Client Controller
 * Built strictly according to docs/UI.txt
 *
 * Implements:
 * - Screen 1: Photos Home (Memories carousel + 3-col Chronological Timeline)
 * - Screen 2: Search (Suggestions + Conversational Query + "I understood" chips)
 * - Screen 3: Possible Memory Locations (Moments found + Preview strips + "View memory →")
 * - Screen 4: Memory Locator (Timeline jump + Subtle highlight + Surrounding photos preserved + Floating navigator)
 * - Screen 5: Library
 * - Screen 13: Fullscreen Photo Viewer
 * - Screen 14: Progressive Memory Refinement ("Add another detail")
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // CURATED TIMELINE & MEMORY DATASET (Historical Timeline with Surrounding Context)
  // ==========================================================================
  const TIMELINE_DATA = [
    {
      id: 'ep_goa_checkin',
      dateStr: 'Nov 16, 2023',
      timeOfDay: 'Afternoon',
      location: 'Panaji, Goa',
      venue: 'Heritage Villa Stay',
      contextTags: ['Travel', 'Arrival', 'Villa', 'Pool'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80', caption: 'Villa courtyard pool in morning sun' },
        { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80', caption: 'Tropical garden lounge chairs' },
        { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80', caption: 'Arriving with friends and luggage at the villa' }
      ]
    },
    {
      id: 'ep_baga_sunset',
      dateStr: 'Nov 16, 2023',
      timeOfDay: 'Sunset',
      location: 'Baga Beach, Goa',
      venue: 'Baga Shoreline',
      contextTags: ['Sunset', 'Beach', 'Friends', 'Golden Hour'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', caption: 'Golden sunset over the Arabian Sea at Baga' },
        { url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80', caption: 'Walking along the warm ocean shoreline' },
        { url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80', caption: 'Palm silhouettes glowing in evening orange light' }
      ]
    },
    {
      id: 'ep_curlies_night',
      dateStr: 'Nov 16, 2023',
      timeOfDay: 'Night',
      location: 'Anjuna Beach, Goa',
      venue: 'Curlies Beach Shack',
      contextTags: ['Café', 'Music', 'Nightlife', 'Friends'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80', caption: 'Beach shack illuminated with fairy lights and music' },
        { url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80', caption: 'Acoustic evening band performing for the crowd' },
        { url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80', caption: 'Friends enjoying the warm seaside night' }
      ]
    },
    {
      id: 'ep_anjuna_flea_market',
      dateStr: 'Nov 17, 2023',
      timeOfDay: 'Morning',
      location: 'Anjuna, Goa',
      venue: 'Anjuna Flea Market',
      contextTags: ['Walk', 'Shopping', 'Handicrafts', 'Friends'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=600&q=80', caption: 'Colorful spices and crafts under canopy tents' },
        { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80', caption: 'Morning market stroll with handmade jewelry' },
        { url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=600&q=80', caption: 'Artisan souvenirs and friendly market vendors' }
      ]
    },
    {
      id: 'ep_anjuna_cafe_evening',
      dateStr: 'Nov 17, 2023',
      timeOfDay: 'Evening',
      location: 'Anjuna Beach, Goa',
      venue: 'Café Lilliput',
      contextTags: ['Café', 'Dinner', 'Friends', 'Evening'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80', caption: 'Beachside café table with evening dinner and drinks' },
        { url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80', caption: 'Cozy café lighting and coffee mugs with sea breeze' },
        { url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80', caption: 'Laughing with friends around dinner table at dusk' }
      ]
    },
    {
      id: 'ep_old_goa_heritage',
      dateStr: 'Nov 18, 2023',
      timeOfDay: 'Morning',
      location: 'Velha Goa',
      venue: 'Basilica of Bom Jesus',
      contextTags: ['Architecture', 'Churches', 'Walk', 'History'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80', caption: 'Historic Portuguese colonial basilica in morning light' },
        { url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=600&q=80', caption: 'Ancient stone archways and church bell tower' },
        { url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80', caption: 'Sunny heritage walk along Old Goa cobbled street' }
      ]
    },
    {
      id: 'ep_panaji_brunch',
      dateStr: 'Nov 18, 2023',
      timeOfDay: 'Afternoon',
      location: 'Fontainhas, Panaji',
      venue: 'Latin Quarter Heritage Café',
      contextTags: ['Brunch', 'Café', 'Pastries', 'Friends'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80', caption: 'Freshly baked pastries and cold brew at boutique cafe' },
        { url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', caption: 'Vibrant yellow and blue Portuguese heritage houses' },
        { url: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=600&q=80', caption: 'Enjoying Latin Quarter brunch with friends' }
      ]
    },
    {
      id: 'ep_bangalore_coffee',
      dateStr: 'Nov 25, 2023',
      timeOfDay: 'Morning',
      location: 'Bangalore, Karnataka',
      venue: 'Home Balcony',
      contextTags: ['Coffee', 'Home', 'Family', 'Morning'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80', caption: 'Traditional hot filter coffee in stainless steel dabara' },
        { url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=600&q=80', caption: 'Quiet morning reading on sunny balcony with house plants' },
        { url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80', caption: 'Golden morning light filtering through living room' }
      ]
    }
  ];

  // Memories / Highlights Row Data
  const HIGHLIGHTS_DATA = [
    { label: 'Goa Trip', episodeId: 'ep_anjuna_cafe_evening', img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80' },
    { label: 'Sunset Glow', episodeId: 'ep_baga_sunset', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80' },
    { label: 'Café Days', episodeId: 'ep_curlies_night', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=300&q=80' },
    { label: 'Heritage Walk', episodeId: 'ep_old_goa_heritage', img: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=300&q=80' },
    { label: 'College Friends', episodeId: 'ep_panaji_brunch', img: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80' },
    { label: '1 Year Ago', episodeId: 'ep_bangalore_coffee', img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=80' }
  ];

  // DOM Elements
  const tabPhotos = document.getElementById('tabPhotos');
  const tabSearch = document.getElementById('tabSearch');
  const tabLibrary = document.getElementById('tabLibrary');
  const screenPhotos = document.getElementById('screenPhotos');
  const screenSearch = document.getElementById('screenSearch');
  const screenLibrary = document.getElementById('screenLibrary');
  const brandHomeBtn = document.getElementById('brandHomeBtn');

  // Memories Carousel & Timeline
  const memoriesCarousel = document.getElementById('memoriesCarousel');
  const photosTimelineStream = document.getElementById('photosTimelineStream');

  // Search Elements
  const mainSearchInput = document.getElementById('mainSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const searchSuggestionsView = document.getElementById('searchSuggestionsView');
  const searchResultsView = document.getElementById('searchResultsView');
  const emptySearchView = document.getElementById('emptySearchView');
  const understoodChipsList = document.getElementById('understoodChipsList');
  const resultsCountHeading = document.getElementById('resultsCountHeading');
  const memoryMomentsList = document.getElementById('memoryMomentsList');

  // Floating Memory Navigator
  const memoryNavigator = document.getElementById('memoryNavigator');
  const btnPrevMemory = document.getElementById('btnPrevMemory');
  const btnNextMemory = document.getElementById('btnNextMemory');
  const memoryCounterText = document.getElementById('memoryCounterText');
  const btnCloseNavigator = document.getElementById('btnCloseNavigator');

  // Photo Viewer Modal
  const photoViewerModal = document.getElementById('photoViewerModal');
  const btnViewerBack = document.getElementById('btnViewerBack');
  const viewerMainImage = document.getElementById('viewerMainImage');
  const viewerDate = document.getElementById('viewerDate');
  const viewerLocation = document.getElementById('viewerLocation');
  const viewerContext = document.getElementById('viewerContext');

  // State Management
  let activeTab = 'photos';
  let activeMatchedMoments = [];
  let currentNavIndex = 0;

  // ==========================================================================
  // INITIALIZATION & RENDERING
  // ==========================================================================

  function init() {
    renderMemoriesCarousel();
    renderTimelineStream();
    setupNavigationTabs();
    setupSearchInteractions();
    setupMemoryNavigator();
    setupPhotoViewer();
  }

  // 1. Render Memories / Highlights Carousel (Vertical Rounded Cards)
  function renderMemoriesCarousel() {
    memoriesCarousel.innerHTML = '';
    HIGHLIGHTS_DATA.forEach(item => {
      const card = document.createElement('div');
      card.className = 'gp-memory-card';
      card.innerHTML = `
        <img class="gp-memory-card-bg" src="${item.img}" alt="${item.label}" loading="lazy" />
        <div class="gp-memory-card-gradient"></div>
        <div class="gp-memory-card-label">${item.label}</div>
      `;
      card.addEventListener('click', () => {
        jumpToTimelineMoment(item.episodeId);
      });
      memoriesCarousel.appendChild(card);
    });
  }

  // 2. Render Main Chronological Photo Timeline (3-column photo grid)
  function renderTimelineStream() {
    photosTimelineStream.innerHTML = '';

    TIMELINE_DATA.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'gp-timeline-group';
      groupEl.id = `group-${group.id}`;

      groupEl.innerHTML = `
        <div class="gp-group-header">
          <span class="gp-group-date">${group.dateStr}</span>
          <span class="gp-group-location">${group.location} · ${group.venue}</span>
        </div>
        <div class="gp-photo-grid-3col">
          ${group.photos.map(p => `
            <div class="gp-photo-item" data-src="${p.url}" data-caption="${p.caption}" data-date="${group.dateStr}" data-loc="${group.location}" data-ctx="${group.contextTags.join(' · ')}">
              <img class="gp-photo-img" src="${p.url}" alt="${p.caption}" loading="lazy" />
            </div>
          `).join('')}
        </div>
      `;

      // Click to open photo in viewer
      groupEl.querySelectorAll('.gp-photo-item').forEach(item => {
        item.addEventListener('click', () => {
          openPhotoViewer({
            url: item.dataset.src,
            caption: item.dataset.caption,
            date: item.dataset.date,
            location: item.dataset.loc,
            context: item.dataset.ctx
          });
        });
      });

      photosTimelineStream.appendChild(groupEl);
    });
  }

  // ==========================================================================
  // NAVIGATION TABS (Photos / Search / Library)
  // ==========================================================================
  function setupNavigationTabs() {
    const tabs = [
      { btn: tabPhotos, screen: screenPhotos, name: 'photos' },
      { btn: tabSearch, screen: screenSearch, name: 'search' },
      { btn: tabLibrary, screen: screenLibrary, name: 'library' }
    ];

    tabs.forEach(t => {
      t.btn.addEventListener('click', () => switchTab(t.name));
    });

    brandHomeBtn.addEventListener('click', () => switchTab('photos'));
  }

  function switchTab(tabName) {
    activeTab = tabName;

    [tabPhotos, tabSearch, tabLibrary].forEach(b => b.classList.remove('active'));
    [screenPhotos, screenSearch, screenLibrary].forEach(s => s.classList.remove('active'));

    if (tabName === 'photos') {
      tabPhotos.classList.add('active');
      screenPhotos.classList.add('active');
    } else if (tabName === 'search') {
      tabSearch.classList.add('active');
      screenSearch.classList.add('active');
      mainSearchInput.focus();
    } else if (tabName === 'library') {
      tabLibrary.classList.add('active');
      screenLibrary.classList.add('active');
    }
  }

  // ==========================================================================
  // SEARCH INTERACTIONS & PROGRESSIVE MEMORY LOCATOR
  // ==========================================================================
  function setupSearchInteractions() {
    // Clear button
    btnClearSearch.addEventListener('click', () => {
      mainSearchInput.value = '';
      btnClearSearch.style.display = 'none';
      searchSuggestionsView.style.display = 'block';
      searchResultsView.style.display = 'none';
      emptySearchView.style.display = 'none';
      mainSearchInput.focus();
    });

    // Input typing
    mainSearchInput.addEventListener('input', () => {
      btnClearSearch.style.display = mainSearchInput.value ? 'flex' : 'none';
    });

    // Enter submission
    mainSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = mainSearchInput.value.trim();
        if (query) executeMemorySearch(query);
      }
    });

    // Example suggestion clicks
    document.querySelectorAll('.gp-suggestion-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.dataset.query;
        mainSearchInput.value = query;
        btnClearSearch.style.display = 'flex';
        executeMemorySearch(query);
      });
    });

    // Progressive refinement chips (+ Place, + People, etc.)
    document.querySelectorAll('.gp-refine-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.dataset.type;
        const currentQuery = mainSearchInput.value.trim();
        let addition = '';
        if (type === 'place') addition = 'at the beach';
        if (type === 'people') addition = 'with friends';
        if (type === 'activity') addition = 'relaxing';
        if (type === 'time') addition = 'in the evening';

        const updatedQuery = `${currentQuery} ${addition}`.trim();
        mainSearchInput.value = updatedQuery;
        executeMemorySearch(updatedQuery);
      });
    });

    // Empty state hints
    document.querySelectorAll('.gp-empty-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const hint = pill.dataset.hint;
        let sample = 'Goa café with friends in the evening';
        if (hint === 'place') sample = 'Goa beach';
        if (hint === 'people') sample = 'with friends in Goa';
        if (hint === 'activity') sample = 'sunset walk at the beach';
        if (hint === 'time') sample = 'evening dinner in Goa';

        mainSearchInput.value = sample;
        btnClearSearch.style.display = 'flex';
        executeMemorySearch(sample);
      });
    });
  }

  // Execute Memory Search (Queries API or resolves matching moments)
  async function executeMemorySearch(query) {
    searchSuggestionsView.style.display = 'none';
    emptySearchView.style.display = 'none';
    searchResultsView.style.display = 'block';

    // 1. Try real API call to Groq LPU backend
    try {
      const res = await fetch('/api/v1/memories/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_demo_01'
        },
        body: JSON.stringify({ query: query })
      });

      if (res.ok) {
        const data = await res.json();
        handleSearchResponse(query, data);
        return;
      }
    } catch (err) {
      console.warn('Backend search API offline, using local semantic resolver:', err);
    }

    // 2. Fallback semantic resolution
    fallbackLocalSearch(query);
  }

  function handleSearchResponse(query, data) {
    const slots = data.parsedIntent?.extractedSlots || {};
    const clues = [];

    // Extract natural human clue chips
    if (slots.places && slots.places.length) clues.push(...slots.places.map(p => p.rawText || p.resolvedEntity || 'Goa'));
    if (slots.activities && slots.activities.length) clues.push(...slots.activities.map(a => a.rawText || a.normalizedActivity || 'Café'));
    if (slots.participants && slots.participants.length) clues.push(...slots.participants.map(p => p.rawText || 'Friends'));
    if (slots.temporal && slots.temporal.timeOfDay) clues.push(capitalize(slots.temporal.timeOfDay));

    // Fallback if empty
    if (!clues.length) {
      clues.push('Goa', 'Café', 'Friends', 'Evening');
    }

    renderUnderstoodChips(clues);

    // Map matched moments
    const moments = [];
    if (data.primaryAnchor) {
      const epMatch = TIMELINE_DATA.find(t => t.id === data.primaryAnchor.episodeId) || TIMELINE_DATA[4];
      moments.push({
        ...epMatch,
        strengthLabel: 'Closest match'
      });
    }

    // Secondary moments
    if (data.alternativeAnchors && data.alternativeAnchors.length) {
      data.alternativeAnchors.forEach((alt, idx) => {
        const epMatch = TIMELINE_DATA.find(t => t.id === alt.episodeId);
        if (epMatch && !moments.some(m => m.id === epMatch.id)) {
          moments.push({
            ...epMatch,
            strengthLabel: idx === 0 ? 'Similar memory' : 'Another possible memory'
          });
        }
      });
    }

    // Ensure at least 3 moments for the user demo
    fillMomentsBuffer(moments);
    displayFoundMoments(moments);
  }

  function fallbackLocalSearch(query) {
    const q = query.toLowerCase();
    const clues = [];

    if (q.includes('goa')) clues.push('Goa');
    if (q.includes('café') || q.includes('cafe')) clues.push('Café');
    if (q.includes('friend')) clues.push('Friends');
    if (q.includes('evening') || q.includes('night')) clues.push('Evening');
    if (q.includes('sunset')) clues.push('Sunset');
    if (q.includes('beach')) clues.push('Beach');
    if (q.includes('coffee')) clues.push('Coffee');

    if (!clues.length) clues.push('Goa', 'Café', 'Friends', 'Evening');
    renderUnderstoodChips(clues);

    const moments = [];
    if (q.includes('cafe') || q.includes('café') || q.includes('evening') || q.includes('dinner')) {
      moments.push({ ...TIMELINE_DATA[4], strengthLabel: 'Closest match' });
      moments.push({ ...TIMELINE_DATA[2], strengthLabel: 'Similar memory' });
      moments.push({ ...TIMELINE_DATA[6], strengthLabel: 'Another possible memory' });
    } else if (q.includes('sunset') || q.includes('baga') || q.includes('beach')) {
      moments.push({ ...TIMELINE_DATA[1], strengthLabel: 'Closest match' });
      moments.push({ ...TIMELINE_DATA[4], strengthLabel: 'Similar memory' });
      moments.push({ ...TIMELINE_DATA[2], strengthLabel: 'Another possible memory' });
    } else {
      moments.push({ ...TIMELINE_DATA[4], strengthLabel: 'Closest match' });
      moments.push({ ...TIMELINE_DATA[1], strengthLabel: 'Similar memory' });
      moments.push({ ...TIMELINE_DATA[5], strengthLabel: 'Another possible memory' });
    }

    displayFoundMoments(moments);
  }

  function fillMomentsBuffer(moments) {
    if (moments.length < 3) {
      const candidates = [TIMELINE_DATA[4], TIMELINE_DATA[2], TIMELINE_DATA[1], TIMELINE_DATA[6]];
      candidates.forEach(cand => {
        if (moments.length < 3 && !moments.some(m => m.id === cand.id)) {
          moments.push({ ...cand, strengthLabel: 'Similar memory' });
        }
      });
    }
  }

  function renderUnderstoodChips(clues) {
    understoodChipsList.innerHTML = '';
    clues.forEach(clue => {
      const chip = document.createElement('div');
      chip.className = 'gp-clue-chip';
      chip.innerHTML = `
        <span>${clue}</span>
        <button type="button" class="gp-clue-chip-remove" aria-label="Remove ${clue}">✕</button>
      `;
      chip.querySelector('.gp-clue-chip-remove').addEventListener('click', () => {
        chip.remove();
      });
      understoodChipsList.appendChild(chip);
    });
  }

  // Display Found Memory Moments (Screen 3)
  function displayFoundMoments(moments) {
    activeMatchedMoments = moments;
    currentNavIndex = 0;

    resultsCountHeading.textContent = `${moments.length} possible memory location${moments.length > 1 ? 's' : ''}`;
    memoryMomentsList.innerHTML = '';

    moments.forEach((moment, idx) => {
      const card = document.createElement('div');
      card.className = 'gp-moment-card';

      card.innerHTML = `
        <div class="gp-moment-header">
          <div class="gp-moment-location">${moment.location}</div>
          <span class="gp-moment-strength">${moment.strengthLabel || (idx === 0 ? 'Closest match' : 'Similar memory')}</span>
        </div>
        <div class="gp-moment-datetime">${moment.dateStr} · ${moment.timeOfDay}</div>
        
        <div class="gp-moment-preview-strip">
          ${moment.photos.slice(0, 3).map(p => `
            <img class="gp-moment-preview-thumb" src="${p.url}" alt="${p.caption}" loading="lazy" />
          `).join('')}
        </div>

        <div class="gp-moment-footer">
          <span class="gp-moment-context">${moment.contextTags.slice(0, 3).join(' · ')}</span>
          <button type="button" class="gp-btn-view-memory" data-index="${idx}" data-id="${moment.id}">
            View memory →
          </button>
        </div>
      `;

      // Tap "View memory →" jumps into timeline (Screen 4 interaction)
      card.querySelector('.gp-btn-view-memory').addEventListener('click', () => {
        jumpToTimelineMoment(moment.id, idx);
      });

      // Tap preview image opens viewer
      card.querySelectorAll('.gp-moment-preview-thumb').forEach((thumb, pIdx) => {
        thumb.addEventListener('click', (e) => {
          e.stopPropagation();
          const photo = moment.photos[pIdx];
          openPhotoViewer({
            url: photo.url,
            caption: photo.caption,
            date: moment.dateStr,
            location: moment.location,
            context: moment.contextTags.join(' · ')
          });
        });
      });

      memoryMomentsList.appendChild(card);
    });
  }

  // ==========================================================================
  // SCREEN 4: MEMORY LOCATOR (Jump to Timeline & Floating Navigator)
  // ==========================================================================
  function jumpToTimelineMoment(episodeId, navIndex = 0) {
    currentNavIndex = navIndex;

    // 1. Switch back to normal chronological photo timeline
    switchTab('photos');

    // 2. Remove any previous memory highlight banners
    document.querySelectorAll('.gp-timeline-group').forEach(grp => {
      grp.classList.remove('is-located-memory');
      const banner = grp.querySelector('.gp-located-indicator-banner');
      if (banner) banner.remove();
    });

    // 3. Locate target group element
    const targetGroup = document.getElementById(`group-${episodeId}`);
    if (targetGroup) {
      // Highlight the located memory group
      targetGroup.classList.add('is-located-memory');

      const indicator = document.createElement('div');
      indicator.className = 'gp-located-indicator-banner';
      indicator.innerHTML = `
        <span class="gp-located-sparkle">✦</span>
        <span>Possible memory</span>
      `;
      targetGroup.insertBefore(indicator, targetGroup.firstChild);

      // Smoothly scroll to the date in the timeline
      setTimeout(() => {
        targetGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);

      // Show floating memory navigator if we came from search results
      if (activeMatchedMoments && activeMatchedMoments.length > 1) {
        updateMemoryNavigator();
        memoryNavigator.style.display = 'flex';
      }
    }
  }

  function setupMemoryNavigator() {
    btnNextMemory.addEventListener('click', () => {
      if (currentNavIndex < activeMatchedMoments.length - 1) {
        currentNavIndex++;
        const nextMoment = activeMatchedMoments[currentNavIndex];
        jumpToTimelineMoment(nextMoment.id, currentNavIndex);
      }
    });

    btnPrevMemory.addEventListener('click', () => {
      if (currentNavIndex > 0) {
        currentNavIndex--;
        const prevMoment = activeMatchedMoments[currentNavIndex];
        jumpToTimelineMoment(prevMoment.id, currentNavIndex);
      }
    });

    btnCloseNavigator.addEventListener('click', () => {
      memoryNavigator.style.display = 'none';
      document.querySelectorAll('.gp-timeline-group').forEach(grp => {
        grp.classList.remove('is-located-memory');
        const banner = grp.querySelector('.gp-located-indicator-banner');
        if (banner) banner.remove();
      });
    });
  }

  function updateMemoryNavigator() {
    const total = activeMatchedMoments.length;
    const current = currentNavIndex + 1;
    memoryCounterText.textContent = `${current} of ${total}`;

    btnPrevMemory.disabled = currentNavIndex <= 0;
    btnNextMemory.disabled = currentNavIndex >= total - 1;
  }

  // ==========================================================================
  // SCREEN 13: FULLSCREEN PHOTO VIEWER
  // ==========================================================================
  function setupPhotoViewer() {
    btnViewerBack.addEventListener('click', closePhotoViewer);

    // Escape key closes viewer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && photoViewerModal.style.display === 'flex') {
        closePhotoViewer();
      }
    });
  }

  function openPhotoViewer({ url, caption, date, location, context }) {
    viewerMainImage.src = url;
    viewerDate.textContent = date || 'Nov 17, 2023';
    viewerLocation.textContent = location || 'Goa';
    viewerContext.textContent = context || 'Memory Moment';

    photoViewerModal.style.display = 'flex';
  }

  function closePhotoViewer() {
    photoViewerModal.style.display = 'none';
    viewerMainImage.src = '';
  }

  // Helper
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Start app
  init();

});
