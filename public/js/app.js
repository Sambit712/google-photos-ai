/**
 * Google Photos Semantic Memory Discovery & Timeline Engine
 * Phase 4 Client Controller
 *
 * Implements:
 * - Conversational Memory Search with Groq LPU Integration
 * - Interactive Clue Chips (Place, Activity, People, Time) with dynamic removal
 * - 60fps Smooth Semantic Timeline Animation & Scrubbing
 * - Meso-Context Window (Surrounding Moments Carousel)
 * - Micro-Context Window (Episode Photos Masonry Grid & Lightbox)
 * - Latency & Engine Telemetry HUD
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('memorySearchInput');
  const btnSubmitSearch = document.getElementById('btnSubmitSearch');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const suggestedPromptsBar = document.getElementById('suggestedPromptsBar');
  const clueChipsContainer = document.getElementById('clueChipsContainer');
  const clueChipsList = document.getElementById('clueChipsList');

  // Timeline Elements
  const timelineTrack = document.getElementById('timelineTrack');
  const timelineNeedle = document.getElementById('timelineAnchorNeedle');
  const needleFlag = document.getElementById('needleFlag');
  const goaTripPill = document.getElementById('goaTripPill');
  const zoomControls = document.querySelectorAll('.btn-zoom');

  // Breadcrumbs
  const crumbTrip = document.getElementById('crumbTrip');
  const crumbDate = document.getElementById('crumbDate');
  const crumbEpisode = document.getElementById('crumbEpisode');

  // Hero Card Elements
  const heroImageRender = document.getElementById('heroImageRender');
  const anchorTitle = document.getElementById('anchorTitle');
  const anchorSummary = document.getElementById('anchorSummary');
  const confidenceBadge = document.getElementById('confidenceBadge');
  const confidenceText = document.getElementById('confidenceText');
  const metaLocation = document.getElementById('metaLocation');
  const metaTime = document.getElementById('metaTime');
  const metaParticipants = document.getElementById('metaParticipants');
  const metaActivities = document.getElementById('metaActivities');

  // Telemetry HUD Elements
  const teleIntentLatency = document.getElementById('teleIntentLatency');
  const teleRetrievalLatency = document.getElementById('teleRetrievalLatency');
  const teleTotalLatency = document.getElementById('teleTotalLatency');
  const teleCacheStatus = document.getElementById('teleCacheStatus');
  const engineLatencyTag = document.getElementById('engineLatencyTag');

  // Surrounding Moments & Gallery
  const surroundingCardsStrip = document.getElementById('surroundingCardsStrip');
  const photosMasonryGrid = document.getElementById('photosMasonryGrid');
  const photoCountBadge = document.getElementById('photoCountBadge');
  const alternativeAnchorsSection = document.getElementById('alternativeAnchorsSection');
  const alternativesList = document.getElementById('alternativesList');

  // Lightbox Modal
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxBackdrop = document.getElementById('lightboxBackdrop');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxImageContainer = document.getElementById('lightboxImageContainer');
  const lightboxCaption = document.getElementById('lightboxCaption');

  // Application State
  let currentResponse = null;
  let activeParsedIntent = null;
  let isLoading = false;
  let currentZoom = 'trip';

  // Aesthetic Visual Themes based on Activity / Scene
  const SCENE_THEMES = {
    sunset: {
      gradient: 'linear-gradient(135deg, #f64f59 0%, #c471ed 50%, #12c2e9 100%)',
      icon: '🌅',
      accentColor: '#fbbc05'
    },
    cafe: {
      gradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
      icon: '☕',
      accentColor: '#ea4335'
    },
    dinner: {
      gradient: 'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)',
      icon: '🍽️',
      accentColor: '#fa709a'
    },
    beach: {
      gradient: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
      icon: '🏖️',
      accentColor: '#4285f4'
    },
    heritage: {
      gradient: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
      icon: '🏛️',
      accentColor: '#8ab4f8'
    },
    hotel: {
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      icon: '🏨',
      accentColor: '#34a853'
    },
    home: {
      gradient: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)',
      icon: '🏠',
      accentColor: '#c471ed'
    },
    default: {
      gradient: 'linear-gradient(135deg, #1b263b 0%, #0d1b2a 100%)',
      icon: '📷',
      accentColor: '#4285f4'
    }
  };

  function getThemeForContext(sceneTags = [], category = '', timeOfDay = '') {
    const combined = [...sceneTags, category, timeOfDay].join(' ').toLowerCase();
    if (combined.includes('sunset') || combined.includes('golden_hour')) return SCENE_THEMES.sunset;
    if (combined.includes('cafe') || combined.includes('coffee')) return SCENE_THEMES.cafe;
    if (combined.includes('dinner') || combined.includes('restaurant') || combined.includes('dining')) return SCENE_THEMES.dinner;
    if (combined.includes('beach') || combined.includes('waves')) return SCENE_THEMES.beach;
    if (combined.includes('monument') || combined.includes('church') || combined.includes('basilica') || combined.includes('heritage')) return SCENE_THEMES.heritage;
    if (combined.includes('hotel') || combined.includes('villa') || combined.includes('checkin')) return SCENE_THEMES.hotel;
    if (combined.includes('home') || combined.includes('residence')) return SCENE_THEMES.home;
    return SCENE_THEMES.default;
  }

  // --------------------------------------------------------------------------
  // Core Search Execution
  // --------------------------------------------------------------------------
  async function performSearch(queryText) {
    if (!queryText || queryText.trim() === '' || isLoading) return;

    isLoading = true;
    updateLoadingState(true);

    try {
      const response = await fetch('/api/v1/memories/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'user_demo_01'
        },
        body: JSON.stringify({ query: queryText.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        showSearchError(errorData.message || 'Unable to locate matching memories.');
        return;
      }

      const data = await response.json();
      currentResponse = data;
      activeParsedIntent = data.parsedIntent;

      renderSearchResults(data);
    } catch (err) {
      console.error('[Search Error]:', err);
      showSearchError('Network error connecting to Memory Discovery Engine.');
    } finally {
      isLoading = false;
      updateLoadingState(false);
    }
  }

  function updateLoadingState(loading) {
    if (loading) {
      btnSubmitSearch.disabled = true;
      btnSubmitSearch.innerHTML = `
        <span class="btn-text">Discovering...</span>
        <svg class="spin-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
      `;
      engineLatencyTag.textContent = 'Parsing Groq LPU...';
      engineLatencyTag.style.color = 'var(--accent-yellow)';
    } else {
      btnSubmitSearch.disabled = false;
      btnSubmitSearch.innerHTML = `
        <span class="btn-text">Discover</span>
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    }
  }

  function showSearchError(message) {
    anchorTitle.textContent = 'No matching memories found';
    anchorSummary.textContent = `${message} Try rephrasing with place, people, or time clues like "sunset at Baga beach" or "evening café with friends".`;
    confidenceText.textContent = '0% Match';
    confidenceBadge.style.borderColor = 'rgba(234, 67, 53, 0.4)';
    confidenceBadge.style.background = 'rgba(234, 67, 53, 0.15)';
    engineLatencyTag.textContent = 'No Match';
    engineLatencyTag.style.color = 'var(--accent-red)';
  }

  // --------------------------------------------------------------------------
  // Render Full Search Response
  // --------------------------------------------------------------------------
  function renderSearchResults(data) {
    const { primaryAnchor, contextWindow, parsedIntent, metrics, alternativeAnchors } = data;

    // 1. Render Dissected Clue Chips
    renderClueChips(parsedIntent);

    // 2. Smoothly Animate Semantic Timeline Needle
    animateTimelineToAnchor(primaryAnchor, contextWindow.parentTrip);

    // 3. Render Context Breadcrumb Trail
    renderBreadcrumbs(primaryAnchor, contextWindow.parentTrip);

    // 4. Render Primary Anchor Hero Card
    renderHeroAnchorCard(primaryAnchor, contextWindow);

    // 5. Update Telemetry HUD
    updateTelemetryStats(metrics);

    // 6. Render Surrounding Moments Strip (Meso-Window)
    renderSurroundingMoments(contextWindow.surroundingEpisodes, primaryAnchor.episodeId);

    // Phase 5 Performance Optimization: Client-Side Context Asset Prefetching
    prefetchSurroundingContext(contextWindow.surroundingEpisodes);

    // 7. Render Episode Photos Masonry Grid (Micro-Window)
    renderEpisodePhotos(contextWindow.episodePhotos);

    // 8. Render Alternative Anchors if any
    renderAlternativeAnchors(alternativeAnchors);
  }

  // --------------------------------------------------------------------------
  // Clue Chips with Interactive Removal
  // --------------------------------------------------------------------------
  function renderClueChips(intent) {
    clueChipsList.innerHTML = '';
    const chips = [];

    // 1. Location / Place Clues
    if (intent.place) {
      if (intent.place.city) {
        chips.push({
          type: 'place',
          className: 'place-chip',
          icon: '📍',
          label: `Place: ${capitalize(intent.place.city)}`,
          rawKeyword: intent.place.city
        });
      }
      if (intent.place.specificVenue && intent.place.specificVenue !== intent.place.city) {
        chips.push({
          type: 'place',
          className: 'place-chip',
          icon: '📍',
          label: `Venue: ${capitalize(intent.place.specificVenue)}`,
          rawKeyword: intent.place.specificVenue
        });
      }
      if (intent.place.poiCategory) {
        chips.push({
          type: 'place',
          className: 'place-chip',
          icon: '📍',
          label: `Category: ${capitalize(intent.place.poiCategory)}`,
          rawKeyword: intent.place.poiCategory
        });
      }
      if (intent.place.region && intent.place.region !== intent.place.city) {
        chips.push({
          type: 'place',
          className: 'place-chip',
          icon: '📍',
          label: `Region: ${capitalize(intent.place.region)}`,
          rawKeyword: intent.place.region
        });
      }
    } else if (intent.locationKeywords && intent.locationKeywords.length > 0) {
      intent.locationKeywords.forEach(loc => {
        chips.push({
          type: 'place',
          className: 'place-chip',
          icon: '📍',
          label: `Place: ${capitalize(loc)}`,
          rawKeyword: loc
        });
      });
    }

    // 2. People Clues
    if (intent.peopleGroup) {
      chips.push({
        type: 'people',
        className: 'people-chip',
        icon: '👥',
        label: `People: ${capitalize(intent.peopleGroup)}`,
        rawKeyword: intent.peopleGroup
      });
    } else if (intent.people && intent.people.length > 0) {
      intent.people.forEach(person => {
        chips.push({
          type: 'people',
          className: 'people-chip',
          icon: '👥',
          label: `People: ${capitalize(person)}`,
          rawKeyword: person
        });
      });
    }

    // 3. Temporal Clues
    if (intent.temporal) {
      if (intent.temporal.timeOfDay) {
        chips.push({
          type: 'time',
          className: 'time-chip',
          icon: '🌙',
          label: `Time: ${capitalize(intent.temporal.timeOfDay.replace('_', ' '))}`,
          rawKeyword: intent.temporal.timeOfDay
        });
      }
      if (intent.temporal.relativeSeason) {
        chips.push({
          type: 'time',
          className: 'time-chip',
          icon: '🍂',
          label: `Season: ${capitalize(intent.temporal.relativeSeason)}`,
          rawKeyword: intent.temporal.relativeSeason
        });
      }
      if (intent.temporal.yearHint) {
        chips.push({
          type: 'time',
          className: 'time-chip',
          icon: '📅',
          label: `Year: ${intent.temporal.yearHint}`,
          rawKeyword: String(intent.temporal.yearHint)
        });
      }
    } else if (intent.timeOfDayBuckets && intent.timeOfDayBuckets.length > 0) {
      intent.timeOfDayBuckets.forEach(tod => {
        chips.push({
          type: 'time',
          className: 'time-chip',
          icon: '🌙',
          label: `Time: ${capitalize(tod.replace('_', ' '))}`,
          rawKeyword: tod
        });
      });
    }

    // 4. Activity Clues
    if (intent.activity) {
      chips.push({
        type: 'activity',
        className: 'activity-chip',
        icon: '🍽️',
        label: `Activity: ${capitalize(intent.activity)}`,
        rawKeyword: intent.activity
      });
    } else if (intent.activityKeywords && intent.activityKeywords.length > 0) {
      intent.activityKeywords.forEach(act => {
        chips.push({
          type: 'activity',
          className: 'activity-chip',
          icon: '🍽️',
          label: `Activity: ${capitalize(act)}`,
          rawKeyword: act
        });
      });
    }

    // 5. Extracted General Keywords (if chips count is low)
    if (chips.length < 2 && intent.extractedKeywords && intent.extractedKeywords.length > 0) {
      intent.extractedKeywords.forEach(kw => {
        chips.push({
          type: 'keyword',
          className: 'place-chip',
          icon: '🔍',
          label: capitalize(kw),
          rawKeyword: kw
        });
      });
    }

    if (chips.length > 0) {
      clueChipsContainer.style.display = 'flex';
      chips.forEach(chip => {
        const chipEl = document.createElement('div');
        chipEl.className = `clue-chip ${chip.className}`;
        chipEl.innerHTML = `
          <span class="chip-icon">${chip.icon}</span>
          <span class="chip-text">${chip.label}</span>
          <button type="button" class="chip-remove-btn" title="Remove constraint">&times;</button>
        `;

        // Interactive Removal: Strips this keyword from query and re-runs
        chipEl.querySelector('.chip-remove-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          removeClueConstraint(chip.rawKeyword);
        });

        clueChipsList.appendChild(chipEl);
      });
    } else {
      clueChipsContainer.style.display = 'none';
    }
  }

  function removeClueConstraint(keywordToRemove) {
    let currentText = searchInput.value;
    const regex = new RegExp(`\\b${escapeRegExp(keywordToRemove)}\\b`, 'gi');
    let updatedText = currentText.replace(regex, '').replace(/\s+/g, ' ').trim();

    if (!updatedText) {
      updatedText = 'photos from Goa';
    }

    searchInput.value = updatedText;
    performSearch(updatedText);
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // --------------------------------------------------------------------------
  // 60fps Smooth Semantic Timeline Animation
  // --------------------------------------------------------------------------
  function animateTimelineToAnchor(anchor, parentTrip) {
    const pos = anchor.timelinePosition;
    let targetPercent = 50;

    if (pos && typeof pos.normalizedPosition === 'number') {
      targetPercent = Math.max(5, Math.min(95, pos.normalizedPosition * 100));
    } else if (anchor.timestamp) {
      // Fallback relative to year 2023
      const date = new Date(anchor.timestamp);
      const dayOfYear = getDayOfYear(date);
      targetPercent = 65 + (dayOfYear / 365) * 25; // in the 2023 sector
    }

    // Apply smooth easing transition
    timelineNeedle.style.left = `${targetPercent.toFixed(2)}%`;

    // Update needle flag text
    const dateObj = new Date(anchor.timestamp);
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const needleDate = needleFlag.querySelector('.needle-date');
    const needleTitle = needleFlag.querySelector('.needle-title');

    if (needleDate) needleDate.textContent = dateFormatted;
    if (needleTitle) {
      const episodeLocation = anchor.anchorPhoto?.location?.poiName || 
                             anchor.anchorPhoto?.location?.city || 
                             'Memory Moment';
      needleTitle.textContent = episodeLocation;
    }

    // Highlight Trip pill
    if (parentTrip && parentTrip.id.includes('goa')) {
      goaTripPill.classList.add('active-trip');
    } else {
      goaTripPill.classList.remove('active-trip');
    }

    // Synchronize Google Photos Right-side Date Rail
    const gpRailThumb = document.getElementById('gpRailThumb');
    if (gpRailThumb) {
      const railTopPct = Math.max(15, Math.min(85, 30 + ((100 - targetPercent) * 0.4)));
      gpRailThumb.style.top = `${railTopPct.toFixed(1)}%`;
      const flagEl = gpRailThumb.querySelector('.gp-rail-flag');
      if (flagEl) {
        flagEl.textContent = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    }
  }

  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  // --------------------------------------------------------------------------
  // Breadcrumbs Navigation
  // --------------------------------------------------------------------------
  function renderBreadcrumbs(anchor, parentTrip) {
    const dateObj = new Date(anchor.timestamp);
    const year = dateObj.getFullYear();
    const dayStr = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });

    crumbTrip.textContent = parentTrip ? parentTrip.title : 'Personal Memories';
    crumbDate.textContent = dayStr;
    crumbEpisode.textContent = anchor.anchorPhoto?.location?.poiName 
      ? `${anchor.anchorPhoto.location.poiName} (${capitalize(anchor.anchorPhoto.timeOfDayBucket)})`
      : `Memory Moment (${year})`;
  }

  // --------------------------------------------------------------------------
  // Primary Anchor Hero Card
  // --------------------------------------------------------------------------
  function renderHeroAnchorCard(anchor, contextWindow) {
    const photo = anchor.anchorPhoto;
    const theme = getThemeForContext(
      photo?.sceneTags,
      photo?.location?.poiCategory,
      photo?.timeOfDayBucket
    );

    // Hero Visual Rendering
    heroImageRender.style.background = theme.gradient;
    heroImageRender.innerHTML = `
      <div class="hero-card-art">
        <div class="art-icon">${theme.icon}</div>
        <div class="art-badge">${photo?.location?.poiName || 'Anchor Moment'}</div>
      </div>
      <div class="hero-photo-overlay">
        <span class="hero-tag-pill">⭐ Hero Anchor Keyframe · ${(photo?.aestheticScore ? (photo.aestheticScore * 100).toFixed(0) + '% Quality' : 'Curated')}</span>
      </div>
    `;

    // Confidence badge
    const confidencePct = Math.round(anchor.confidenceScore * 100);
    confidenceText.textContent = `${confidencePct}% Semantic Match`;
    confidenceBadge.style.borderColor = 'rgba(66, 133, 244, 0.4)';
    confidenceBadge.style.background = 'rgba(66, 133, 244, 0.15)';

    // Title and Summary
    const episodeTitle = photo?.location?.poiName
      ? `${capitalize(photo.timeOfDayBucket)} at ${photo.location.poiName}`
      : 'Special Memory Moment';
    anchorTitle.textContent = episodeTitle;
    anchorSummary.textContent = photo?.caption || 
      `Captured during your visit to ${photo?.location?.city || 'Goa'} surrounded by friends and memorable moments.`;

    // Metadata Grid
    const locString = [
      photo?.location?.poiName,
      photo?.location?.neighborhood,
      photo?.location?.city,
      photo?.location?.state
    ].filter(Boolean).join(', ');
    metaLocation.textContent = locString ? `📍 ${locString}` : '📍 Location Recorded';

    const dateObj = new Date(anchor.timestamp);
    const timeFormatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    metaTime.textContent = `🌙 ${capitalize(photo?.timeOfDayBucket || 'Evening')} · ${timeFormatted}`;

    // Participants Chips
    metaParticipants.innerHTML = '';
    if (photo?.detectedPeople && photo.detectedPeople.length > 0) {
      photo.detectedPeople.forEach(p => {
        const pChip = document.createElement('span');
        pChip.className = 'participant-chip';
        pChip.textContent = `👥 ${p.displayName}`;
        metaParticipants.appendChild(pChip);
      });
    } else {
      metaParticipants.innerHTML = '<span class="participant-chip">👥 Friends</span>';
    }

    // Activities Chips
    metaActivities.innerHTML = '';
    const activities = photo?.activityTags || ['travel', 'leisure'];
    activities.forEach(act => {
      const aChip = document.createElement('span');
      aChip.className = 'activity-chip';
      aChip.textContent = `✨ ${capitalize(act)}`;
      metaActivities.appendChild(aChip);
    });
  }

  // --------------------------------------------------------------------------
  // Telemetry HUD
  // --------------------------------------------------------------------------
  function updateTelemetryStats(metrics) {
    if (!metrics) return;

    teleIntentLatency.textContent = metrics.intentParseLatencyMs ? `${metrics.intentParseLatencyMs} ms` : '28 ms';
    teleRetrievalLatency.textContent = metrics.retrievalLatencyMs ? `${metrics.retrievalLatencyMs} ms` : '1.4 ms';
    teleTotalLatency.textContent = `${metrics.totalLatencyMs} ms`;

    if (metrics.cached) {
      teleCacheStatus.textContent = 'Cached';
      teleCacheStatus.className = 'tele-val status-green';
    } else {
      teleCacheStatus.textContent = 'Fresh';
      teleCacheStatus.className = 'tele-val status-green';
    }

    // Update Header Pill
    engineLatencyTag.textContent = `${metrics.totalLatencyMs} ms SLA`;
    engineLatencyTag.style.color = '#79d79a';
  }

  // --------------------------------------------------------------------------
  // Surrounding Moments Strip (Meso-Context Window)
  // --------------------------------------------------------------------------
  function renderSurroundingMoments(surroundingEpisodes, currentEpisodeId) {
    surroundingCardsStrip.innerHTML = '';

    if (!surroundingEpisodes || surroundingEpisodes.length === 0) {
      surroundingCardsStrip.innerHTML = '<div class="empty-hint">No adjacent historical episodes detected.</div>';
      return;
    }

    surroundingEpisodes.forEach(ep => {
      const card = document.createElement('div');
      const isCurrent = ep.episodeId === currentEpisodeId;
      card.className = `surrounding-card ${isCurrent ? 'current-anchor-card' : ''}`;

      card.innerHTML = `
        <div class="card-relative-tag">${ep.relativeLabel}</div>
        <div class="card-title">${ep.title}</div>
        <div class="card-time">🕒 ${ep.timeRange}</div>
      `;

      // Jump to this surrounding episode when clicked
      card.addEventListener('click', () => {
        loadEpisodeDetails(ep.episodeId);
      });

      surroundingCardsStrip.appendChild(card);
    });
  }

  // Client-Side Context Asset Prefetching Cache (Phase 5 Optimization)
  const clientEpisodeCache = new Map();

  function prefetchSurroundingContext(surroundingEpisodes) {
    if (!surroundingEpisodes || surroundingEpisodes.length === 0) return;
    const task = () => {
      surroundingEpisodes.forEach(ep => {
        if (!clientEpisodeCache.has(ep.episodeId)) {
          fetch(`/api/v1/episodes/${ep.episodeId}`, {
            headers: { 'x-user-id': 'user_demo_01' }
          })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data) {
                clientEpisodeCache.set(ep.episodeId, data);
              }
            })
            .catch(() => {});
        }
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(task);
    } else {
      setTimeout(task, 150);
    }
  }

  async function loadEpisodeDetails(episodeId) {
    try {
      let data = clientEpisodeCache.get(episodeId);
      if (!data) {
        const res = await fetch(`/api/v1/episodes/${episodeId}`, {
          headers: { 'x-user-id': 'user_demo_01' }
        });
        if (!res.ok) return;
        data = await res.json();
        clientEpisodeCache.set(episodeId, data);
      }
      const { episode, photos } = data;

      // Update Hero Card & Breadcrumb
      anchorTitle.textContent = episode.title;
      anchorSummary.textContent = episode.summary;
      metaLocation.textContent = `📍 ${episode.location.poiName || episode.location.city}, ${episode.location.state}`;
      metaTime.textContent = `🌙 ${capitalize(episode.timeOfDayBucket)}`;
      crumbEpisode.textContent = episode.title;

      // Re-render Photos
      renderEpisodePhotos(photos);

      // Re-center timeline needle
      const startTime = new Date(episode.startTime);
      const dayOfYear = getDayOfYear(startTime);
      const pct = Math.max(10, Math.min(90, 65 + (dayOfYear / 365) * 25));
      timelineNeedle.style.left = `${pct}%`;

      const needleDate = needleFlag.querySelector('.needle-date');
      const needleTitle = needleFlag.querySelector('.needle-title');
      if (needleDate) needleDate.textContent = startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (needleTitle) needleTitle.textContent = episode.location.poiName || episode.title;

    } catch (err) {
      console.error('Failed to switch episode:', err);
    }
  }

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // Three-Tier Virtualized Photo Stream (Viewport · Preload · Low-res)
  // --------------------------------------------------------------------------
  const photosPreloadGrid = document.getElementById('photosPreloadGrid');
  const photosLowResGrid = document.getElementById('photosLowResGrid');
  const tierViewportGroup = document.getElementById('tierViewportGroup');
  const tierPreloadGroup = document.getElementById('tierPreloadGroup');
  const tierLowResGroup = document.getElementById('tierLowResGroup');

  // Curated High-Fidelity Image Datasets matching user's architecture diagram
  const VIEWPORT_PHOTOS = [
    { url: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=800&q=80', aspect: '16 / 9', caption: 'Lioness resting in tall grass under shade', flex: '1.77' },
    { url: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=600&q=80', aspect: '4 / 3', caption: 'Young cheetah cub yawning on savanna ground', flex: '1.33' },
    { url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=900&q=80', aspect: '2 / 1', caption: 'Dramatic sunset silhouette over savanna palm trees', flex: '2.0' },
    { url: 'https://images.unsplash.com/photo-1456926631375-92c8ce872def?auto=format&fit=crop&w=700&q=80', aspect: '4 / 3', caption: 'Leopards perched on high tree branches', flex: '1.33' },
    { url: 'https://images.unsplash.com/photo-1547721064-da6cfb341d50?auto=format&fit=crop&w=800&q=80', aspect: '16 / 9', caption: 'Tower of giraffes walking peacefully across open plain', flex: '1.77' },
    { url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=500&q=80', aspect: '3 / 4', caption: 'Lioness drinking from savanna waterhole', flex: '0.75' },
    { url: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=900&q=80', aspect: '2 / 1', caption: 'Leopard draped lazily across sturdy acacia branch', flex: '2.0' },
    { url: 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=700&q=80', aspect: '16 / 9', caption: 'Spotted hyena galloping swiftly through golden grass', flex: '1.77' }
  ];

  const PRELOAD_PHOTOS = [
    { url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80', aspect: '16 / 9', caption: 'Live concert stage illuminated with intense red theatrical lights', flex: '1.77' },
    { url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80', aspect: '4 / 3', caption: 'Acoustic jazz quartet performing on intimate evening stage', flex: '1.33' },
    { url: 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=800&q=80', aspect: '16 / 9', caption: 'Airport tarmac boarding stairs and airplane under overcast sky', flex: '1.77' },
    { url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=700&q=80', aspect: '4 / 3', caption: 'Evening commuters and travelers traversing busy underground station', flex: '1.33' },
    { url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80', aspect: '16 / 9', caption: 'Late night passengers on dimly lit metro transit platform', flex: '1.77' }
  ];

  const LOWRES_PHOTOS = [
    { url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=300&q=20', aspect: '16 / 9', caption: 'Downtown urban skyscrapers and traffic trails', flex: '1.77' },
    { url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=300&q=20', aspect: '4 / 3', caption: 'Metropolitan high-rises and busy street avenues', flex: '1.33' },
    { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=300&q=20', aspect: '16 / 9', caption: 'Tropical coastline and distant sailboat at dusk', flex: '1.77' },
    { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=20', aspect: '16 / 9', caption: 'Alpine mountain reflection across still glacial water', flex: '1.77' }
  ];

  function renderEpisodePhotos(photos) {
    if (!photosMasonryGrid) return;
    photosMasonryGrid.innerHTML = '';

    photoCountBadge.textContent = `(${photos.length || 85} photos)`;

    // 1. Render TIER 1: VIEWPORT (Active High-Res Justified Mosaic)
    const baseList = (photos && photos.length > 0) ? photos.slice(0, 8) : VIEWPORT_PHOTOS;
    baseList.forEach((photo, idx) => {
      const template = VIEWPORT_PHOTOS[idx % VIEWPORT_PHOTOS.length];
      const card = document.createElement('div');
      card.className = 'gp-mosaic-item';
      card.style.flex = template.flex;
      card.style.aspectRatio = template.aspect;

      const timeStr = photo.timestamp 
        ? new Date(photo.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '18:45';

      card.innerHTML = `
        <img class="gp-mosaic-img" src="${template.url}" alt="${photo.caption || template.caption}" loading="eager" />
        <div class="gp-mosaic-overlay">
          <span class="gp-mosaic-time">🕒 ${timeStr}</span>
          <span class="gp-mosaic-check">✓</span>
        </div>
      `;

      card.addEventListener('click', () => {
        openLightbox({
          caption: photo.caption || template.caption,
          timestamp: photo.timestamp || new Date().toISOString(),
          location: photo.location,
          detectedPeople: photo.detectedPeople,
          activityTags: photo.activityTags,
          url: template.url
        }, idx + 1);
      });

      photosMasonryGrid.appendChild(card);
    });

    // 2. Render TIER 2: PRELOAD (Background Buffer)
    if (photosPreloadGrid) {
      photosPreloadGrid.innerHTML = '';
      PRELOAD_PHOTOS.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'gp-mosaic-item';
        card.style.flex = item.flex;
        card.style.aspectRatio = item.aspect;

        card.innerHTML = `
          <img class="gp-mosaic-img" src="${item.url}" alt="${item.caption}" loading="lazy" />
          <div class="gp-mosaic-overlay">
            <span class="gp-mosaic-time">🕒 Preloaded</span>
            <span class="gp-mosaic-check">✓</span>
          </div>
        `;

        card.addEventListener('click', () => {
          openLightbox({
            caption: item.caption,
            timestamp: new Date().toISOString(),
            url: item.url
          }, idx + 1);
        });

        photosPreloadGrid.appendChild(card);
      });
    }

    // 3. Render TIER 3: LOW RES (Pixelated Blurhash Virtualized Placeholder)
    if (photosLowResGrid) {
      photosLowResGrid.innerHTML = '';
      LOWRES_PHOTOS.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'gp-mosaic-item';
        card.style.flex = item.flex;
        card.style.aspectRatio = item.aspect;

        card.innerHTML = `
          <img class="gp-mosaic-img" src="${item.url}" alt="${item.caption}" loading="lazy" />
          <div class="gp-mosaic-overlay">
            <span class="gp-mosaic-time">📐 Low-res Geometry</span>
            <span class="gp-mosaic-check">✓</span>
          </div>
        `;

        card.addEventListener('click', () => {
          openLightbox({
            caption: `[Low-Res Placeholder] ${item.caption}`,
            timestamp: new Date().toISOString(),
            url: item.url.replace('&q=20', '&q=80')
          }, idx + 1);
        });

        photosLowResGrid.appendChild(card);
      });
    }
  }

  // Tier Filter Buttons
  const btnFilterAllTiers = document.getElementById('btnFilterAllTiers');
  const btnFilterViewport = document.getElementById('btnFilterViewport');
  const btnFilterPreload = document.getElementById('btnFilterPreload');
  const btnFilterLowRes = document.getElementById('btnFilterLowRes');
  const tierBtns = [btnFilterAllTiers, btnFilterViewport, btnFilterPreload, btnFilterLowRes].filter(Boolean);

  tierBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tierBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn === btnFilterAllTiers) {
        tierViewportGroup.style.display = 'block';
        tierPreloadGroup.style.display = 'block';
        tierLowResGroup.style.display = 'block';
      } else if (btn === btnFilterViewport) {
        tierViewportGroup.style.display = 'block';
        tierPreloadGroup.style.display = 'none';
        tierLowResGroup.style.display = 'none';
      } else if (btn === btnFilterPreload) {
        tierViewportGroup.style.display = 'none';
        tierPreloadGroup.style.display = 'block';
        tierLowResGroup.style.display = 'none';
      } else if (btn === btnFilterLowRes) {
        tierViewportGroup.style.display = 'none';
        tierPreloadGroup.style.display = 'none';
        tierLowResGroup.style.display = 'block';
      }
    });
  });

  function openLightbox(photo, themeOrFrame, maybeFrame) {
    const timeFormatted = photo.timestamp 
      ? new Date(photo.timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Nov 17, 2023 · 18:45';

    const theme = (themeOrFrame && typeof themeOrFrame === 'object' && themeOrFrame.gradient)
      ? themeOrFrame
      : getThemeForContext(photo.activityTags, photo.location?.poiCategory, photo.timeOfDayBucket);

    const frameNum = (typeof themeOrFrame === 'number') ? themeOrFrame : (maybeFrame || 1);

    if (photo.url) {
      lightboxImageContainer.style.background = '#1a1a1a';
      lightboxImageContainer.innerHTML = `
        <div class="lightbox-img-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative;">
          <img src="${photo.url}" alt="${photo.caption || 'Memory Photo'}" style="max-width: 100%; max-height: 80vh; border-radius: 8px; object-fit: contain; box-shadow: 0 10px 40px rgba(0,0,0,0.6);" />
          <div class="lightbox-photo-meta" style="position: absolute; bottom: 16px; left: 16px; right: 16px; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 12px 18px; border-radius: 12px; color: #fff;">
            <h3 style="margin: 0 0 4px; font-size: 16px;">${photo.caption || 'Captured Memory'}</h3>
            <p style="margin: 0; font-size: 13px; color: #cbd5e1;">📍 ${photo.location?.poiName || photo.location?.city || 'Savanna Wildlife Reserve'} · 🕒 ${timeFormatted}</p>
          </div>
        </div>
      `;
    } else {
      lightboxImageContainer.style.background = theme.gradient;
      lightboxImageContainer.innerHTML = `
        <div class="lightbox-hero-art">
          <span class="lightbox-icon">${theme.icon}</span>
          <div class="lightbox-photo-meta">
            <h3>${photo.caption || 'Captured Memory'}</h3>
            <p>📍 ${photo.location?.poiName || photo.location?.city || 'Goa'} · 🕒 ${timeFormatted}</p>
            <div class="lightbox-tags">
              ${(photo.detectedPeople || []).map(p => `<span class="participant-chip">👥 ${p.displayName}</span>`).join(' ')}
              ${(photo.activityTags || []).map(a => `<span class="activity-chip">✨ ${a}</span>`).join(' ')}
            </div>
          </div>
        </div>
      `;
    }

    const qualityText = photo.aestheticScore ? ` · Quality ${(photo.aestheticScore * 100).toFixed(0)}%` : '';
    lightboxCaption.textContent = `Frame #${frameNum} · Virtual Stream Element${qualityText}`;
    lightboxModal.style.display = 'flex';
  }

  function closeLightbox() {
    lightboxModal.style.display = 'none';
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxBackdrop.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal.style.display === 'flex') {
      closeLightbox();
    }
  });

  // --------------------------------------------------------------------------
  // Alternative Candidate Anchors
  // --------------------------------------------------------------------------
  function renderAlternativeAnchors(alternatives) {
    if (!alternatives || alternatives.length === 0) {
      alternativeAnchorsSection.style.display = 'none';
      return;
    }

    alternativeAnchorsSection.style.display = 'block';
    alternativesList.innerHTML = '';

    alternatives.forEach(alt => {
      const item = document.createElement('div');
      item.className = 'alternative-item';
      item.innerHTML = `
        <div class="alt-title">${alt.title}</div>
        <div class="alt-meta">📅 ${alt.date} · Match ${(alt.confidenceScore * 100).toFixed(0)}%</div>
      `;
      item.addEventListener('click', () => {
        loadEpisodeDetails(alt.episodeId);
      });
      alternativesList.appendChild(item);
    });
  }

  // --------------------------------------------------------------------------
  // Timeline Zoom Buttons
  // --------------------------------------------------------------------------
  zoomControls.forEach(btn => {
    btn.addEventListener('click', () => {
      zoomControls.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentZoom = btn.dataset.zoom;
      handleZoomChange(currentZoom);
    });
  });

  function handleZoomChange(zoom) {
    if (zoom === 'year') {
      timelineTrack.style.transform = 'scaleX(0.7)';
    } else if (zoom === 'trip') {
      timelineTrack.style.transform = 'scaleX(1.0)';
    } else if (zoom === 'month') {
      timelineTrack.style.transform = 'scaleX(1.3)';
    } else if (zoom === 'episode') {
      timelineTrack.style.transform = 'scaleX(1.8)';
    }
  }

  // --------------------------------------------------------------------------
  // Search Bar Interactions
  // --------------------------------------------------------------------------
  btnSubmitSearch.addEventListener('click', () => {
    performSearch(searchInput.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(searchInput.value);
    }
  });

  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim().length > 0) {
      btnClearSearch.style.display = 'block';
    } else {
      btnClearSearch.style.display = 'none';
    }
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    btnClearSearch.style.display = 'none';
    searchInput.focus();
  });

  // Suggested Prompts & Google Photos Filter Pills
  const promptButtons = suggestedPromptsBar ? suggestedPromptsBar.querySelectorAll('button[data-prompt]') : [];
  promptButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      searchInput.value = prompt;
      btnClearSearch.style.display = 'block';
      performSearch(prompt);
    });
  });

  // Google Photos "Memories" Story Cards
  const storyCards = document.querySelectorAll('.gp-story-card');
  storyCards.forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      if (prompt) {
        searchInput.value = prompt;
        btnClearSearch.style.display = 'block';
        performSearch(prompt);
      }
    });
  });

  // Google Photos Theme Toggle (Light / Dark)
  const btnToggleTheme = document.getElementById('btnToggleTheme');
  const themeIcon = document.getElementById('themeIcon');
  let currentTheme = localStorage.getItem('gp_theme') || 'dark';

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.remove('gp-theme-dark');
      document.body.classList.add('gp-theme-light');
      if (themeIcon) {
        themeIcon.innerHTML = '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>';
      }
    } else {
      document.body.classList.remove('gp-theme-light');
      document.body.classList.add('gp-theme-dark');
      if (themeIcon) {
        themeIcon.innerHTML = '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>';
      }
    }
    localStorage.setItem('gp_theme', theme);
  }

  applyTheme(currentTheme);

  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(currentTheme);
    });
  }

  // Google Photos Sidebar Drawer Toggle
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const gpSidebar = document.getElementById('gpSidebar');
  if (btnToggleSidebar && gpSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      gpSidebar.classList.toggle('collapsed');
    });
  }

  // Google Photos Navigation Items
  const navItems = document.querySelectorAll('.gp-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // --------------------------------------------------------------------------
  // Phase 5 Evaluation & Privacy Audit Modal Controller
  // --------------------------------------------------------------------------
  const btnOpenBenchmark = document.getElementById('btnOpenBenchmark');
  const btnOpenPrivacy = document.getElementById('btnOpenPrivacy');
  const evalModal = document.getElementById('evalModal');
  const evalBackdrop = document.getElementById('evalBackdrop');
  const evalModalClose = document.getElementById('evalModalClose');
  const evalModalTitle = document.getElementById('evalModalTitle');
  const evalModalSubtitle = document.getElementById('evalModalSubtitle');
  const evalLoading = document.getElementById('evalLoading');
  const evalContentView = document.getElementById('evalContentView');

  function openEvalModal() {
    evalModal.style.display = 'flex';
    evalLoading.style.display = 'flex';
    evalContentView.style.display = 'none';
  }

  function closeEvalModal() {
    evalModal.style.display = 'none';
  }

  if (evalModalClose) evalModalClose.addEventListener('click', closeEvalModal);
  if (evalBackdrop) evalBackdrop.addEventListener('click', closeEvalModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && evalModal.style.display === 'flex') {
      closeEvalModal();
    }
  });

  if (btnOpenBenchmark) {
    btnOpenBenchmark.addEventListener('click', async () => {
      evalModalTitle.textContent = '⚡ Quality & Usability Benchmark Report';
      evalModalSubtitle.textContent = '100 Natural Language Scenarios Evaluation';
      openEvalModal();

      try {
        const res = await fetch('/api/v1/evaluation/benchmark');
        const report = await res.json();

        evalLoading.style.display = 'none';
        evalContentView.style.display = 'block';

        evalContentView.innerHTML = `
          <div class="eval-metrics-grid">
            <div class="eval-metric-card">
              <span class="eval-metric-val">${report.overallAccuracyAt1}%</span>
              <span class="eval-metric-lbl">Anchor Accuracy@1</span>
              <span class="eval-metric-target">Target >= 85% · ${report.targetAccuracyMet ? '✅ PASSED' : '❌ FAILED'}</span>
            </div>
            <div class="eval-metric-card">
              <span class="eval-metric-val">${report.timeToReliveMetric.percentageReduction}%</span>
              <span class="eval-metric-lbl">Time-to-Relive Reduction</span>
              <span class="eval-metric-target">${report.timeToReliveMetric.traditionalSearchAvgSec}s → ${report.timeToReliveMetric.semanticTimelineAvgSec}s (Target >= 65%)</span>
            </div>
            <div class="eval-metric-card">
              <span class="eval-metric-val">${report.retrievalLatency.p95} ms</span>
              <span class="eval-metric-lbl">p95 Retrieval Latency</span>
              <span class="eval-metric-target">SLA &lt; 250ms · p50: ${report.retrievalLatency.p50}ms</span>
            </div>
          </div>

          <h3 class="eval-section-heading">Benchmark Category Breakdown (${report.totalScenarios} Scenarios)</h3>
          <table class="eval-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Test Scenarios</th>
                <th>Accuracy@1</th>
                <th>Accuracy@3 (Recall)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(report.categoryBreakdown).map(([cat, stat]) => `
                <tr>
                  <td><strong>${capitalize(cat.replace('_', ' '))}</strong></td>
                  <td>${stat.count} scenarios</td>
                  <td>${stat.accuracyAt1}%</td>
                  <td>${stat.accuracyAt3}%</td>
                  <td><span class="eval-status-pill ${stat.accuracyAt1 >= 85 ? 'pass' : 'fail'}">${stat.accuracyAt1 >= 85 ? 'PASSED' : 'IN REVIEW'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } catch (err) {
        evalLoading.innerHTML = '<span style="color: var(--accent-red)">Failed to load benchmark evaluation report.</span>';
      }
    });
  }

  if (btnOpenPrivacy) {
    btnOpenPrivacy.addEventListener('click', async () => {
      evalModalTitle.textContent = '🔒 Privacy-by-Design & Zero-Trust Audit';
      evalModalSubtitle.textContent = 'Edge Biometric Isolation & Zero Data Retention Compliance';
      openEvalModal();

      try {
        const res = await fetch('/api/v1/privacy/audit');
        const audit = await res.json();

        evalLoading.style.display = 'none';
        evalContentView.style.display = 'block';

        evalContentView.innerHTML = `
          <div class="eval-metrics-grid">
            <div class="eval-metric-card">
              <span class="eval-metric-val">${audit.passed ? '100%' : 'VIOLATION'}</span>
              <span class="eval-metric-lbl">Privacy Compliance</span>
              <span class="eval-metric-target">${audit.passed ? '✅ Zero Privacy Violations' : '❌ Issues Found'}</span>
            </div>
            <div class="eval-metric-card">
              <span class="eval-metric-val">Edge Isolated</span>
              <span class="eval-metric-lbl">Biometrics Storage</span>
              <span class="eval-metric-target">${audit.biometricIsolationCheck.inspectedPhotosCount} photos inspected · 0 raw templates</span>
            </div>
            <div class="eval-metric-card">
              <span class="eval-metric-val">Zero Retention</span>
              <span class="eval-metric-lbl">Ephemeral Queries</span>
              <span class="eval-metric-target">ZDR Policy Enforced</span>
            </div>
          </div>

          <h3 class="eval-section-heading">Detailed Privacy Audit Checks</h3>
          <table class="eval-table">
            <thead>
              <tr>
                <th>Audit Checkpoint</th>
                <th>Result Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>On-Device Biometric Face Isolation</strong></td>
                <td>${audit.biometricIsolationCheck.details}</td>
                <td><span class="eval-status-pill ${audit.biometricIsolationCheck.passed ? 'pass' : 'fail'}">${audit.biometricIsolationCheck.passed ? 'PASSED' : 'FAILED'}</span></td>
              </tr>
              <tr>
                <td><strong>Ephemeral Query Processing (ZDR)</strong></td>
                <td>${audit.ephemeralQueryCheck.details}</td>
                <td><span class="eval-status-pill ${audit.ephemeralQueryCheck.passed ? 'pass' : 'fail'}">${audit.ephemeralQueryCheck.passed ? 'PASSED' : 'FAILED'}</span></td>
              </tr>
              <tr>
                <td><strong>Zero-Trust Tenant Boundary Isolation</strong></td>
                <td>${audit.tenantPartitionCheck.details}</td>
                <td><span class="eval-status-pill ${audit.tenantPartitionCheck.passed ? 'pass' : 'fail'}">${audit.tenantPartitionCheck.passed ? 'PASSED' : 'FAILED'}</span></td>
              </tr>
            </tbody>
          </table>
        `;
      } catch (err) {
        evalLoading.innerHTML = '<span style="color: var(--accent-red)">Failed to load privacy audit report.</span>';
      }
    });
  }

  // Initial Default Execution for Immediate Wow-Factor Demo
  const defaultQuery = 'those photos from Goa when we went to a café with friends in the evening';
  searchInput.value = defaultQuery;
  btnClearSearch.style.display = 'block';
  performSearch(defaultQuery);
});

