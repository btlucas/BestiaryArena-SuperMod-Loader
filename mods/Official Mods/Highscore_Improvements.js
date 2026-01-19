// DOM Improved Highscore mod for Bestiary Arena
if (window.DEBUG) console.log('Improved Highscore Mod initializing...');

// Use shared translation system via API
const t = (key) => api.i18n.t(key);

// Create the Highscore button using the API
if (api) {
  if (window.DEBUG) console.log('BestiaryModAPI available in Improved Highscore Mod');
  
  // Create button to show highscore modal
  window.highscoreButton = api.ui.addButton({
    id: 'highscore-button',
    text: t('mods.highscore.buttonText'),
    tooltip: t('mods.highscore.buttonTooltip'),
    primary: false,
    onClick: showImprovementsModal
  });
  
  if (window.DEBUG) console.log('Highscore improvement button added');
} else {
  console.error('BestiaryModAPI not available in Improved Highscore Mod');
}

// Map of room codes to names
let ROOM_NAMES;

// ============================================================================
// CONFIGURATION: Maps to ignore in all improvements
// ============================================================================
// Add map codes here to exclude them from Tick, Rank, and Floor improvements
// Example: const IGNORED_MAPS = ['kof', 'vbk', 'fbox'];
const IGNORED_MAPS = [
  // Add map codes to ignore here
  // 'kof',
  // 'vbk',
  'fxmas',
  'kxmas',
  'vxmas',
  'crxmas'
];

// Helper function to fetch data from TRPC API
async function fetchTRPC(method) {
  try {
    const inp = encodeURIComponent(JSON.stringify({ 0: { json: null, meta: { values: ["undefined"] } } }));
    const res = await fetch(`/pt/api/trpc/${method}?batch=1&input=${inp}`, {
      headers: { 
        'Accept': '*/*', 
        'Content-Type': 'application/json', 
        'X-Game-Version': '1' 
      }
    });
    
    if (!res.ok) {
      throw new Error(`${method} → ${res.status}`);
    }
    
    const json = await res.json();
    return json[0].result.data.json;
  } catch (error) {
    console.error('Error fetching from TRPC:', error);
    throw error;
  }
}

// Helper function to create an item sprite element
function createItemSprite(itemId) {
  // Create the sprite container
  const spriteContainer = document.createElement('div');
  spriteContainer.className = `sprite item relative id-${itemId}`;
  
  // Create the viewport
  const viewport = document.createElement('div');
  viewport.className = 'viewport';
  
  // Create the image
  const img = document.createElement('img');
  img.alt = itemId;
  img.setAttribute('data-cropped', 'false');
  img.className = 'spritesheet';
  img.style.cssText = '--cropX: 0; --cropY: 0';
  
  // Assemble the structure
  viewport.appendChild(img);
  spriteContainer.appendChild(viewport);
  
  return spriteContainer;
}

// Helper function to create HTML content for tick improvements
function createTickContent(opportunities, total, minTheo, gain) {
  // Create scrollable container using the API
  const scrollContainer = api.ui.components.createScrollContainer({
    height: 264,
    padding: true,
    content: ''
  });
  
  // Add opportunities list
  if (opportunities.length > 0) {
    opportunities.forEach(o => {
      const itemEl = document.createElement('div');
      itemEl.className = 'frame-1 surface-regular flex items-center gap-2 p-1';
      itemEl.innerHTML = `
        <div class="frame-pressed-1 shrink-0" style="width: 48px; height: 48px;">
          <img 
            alt="${o.name}" 
            class="pixelated size-full object-cover cursor-pointer" 
            src="/assets/room-thumbnails/${o.code}.png" 
            onclick="globalThis.state.board.send({ type: 'selectRoomById', roomId: '${o.code}' });" />
        </div>
        <div class="grid w-full gap-1">
          <div 
            class="text-whiteExp 
            cursor-pointer" 
            onclick="globalThis.state.board.send({ type: 'selectRoomById', roomId: '${o.code}' });">
              ${o.name}
            </div>
          <div class="pixel-font-14">Your ${o.yours} → Top ${o.best}</div>
          <div class="pixel-font-14" style="color: #8f8;">+${o.diff} ticks (${o.pct}%)</div>
          <div class="pixel-font-14" style="font-size: 11px; color: #ccc;">by ${o.player}</div>
        </div>
      `;
      scrollContainer.addContent(itemEl);
    });
  } else {
    const emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'text-align: center; color: #eee; padding: 20px;';
    emptyEl.textContent = 'You are already at the top in all rooms!';
    scrollContainer.addContent(emptyEl);
  }
  
  // Add stats footer
  const statsContainer = document.createElement('div');
  statsContainer.className = 'frame-pressed-1 surface-dark p-2 pixel-font-14';
  statsContainer.innerHTML = `
    <div>Total: ${total}</div>
    <div>Theoretical minimum: ${minTheo}</div>
    <div>Possible gain: ${gain} ticks</div>
  `;
  
  return {
    scrollContainer,
    statsContainer
  };
}

// Helper function to create HTML content for rank improvements
function createRankContent(opportunities) {
  // Create scrollable container using the API
  const scrollContainer = api.ui.components.createScrollContainer({
    height: 264,
    padding: true,
    content: ''
  });
  
  // Add opportunities list
  if (opportunities.length > 0) {
    opportunities.forEach(o => {
      const itemEl = document.createElement('div');
      itemEl.className = 'frame-1 surface-regular flex items-center gap-2 p-1';
      
      // Build tick improvement text if applicable
      let tickInfo = '';
      if (o.type === 'tick') {
        tickInfo = `<div class="pixel-font-14" style="color: #ff8;">Your ${o.yourTicks} → Top ${o.bestTicks} ticks</div>`;
      }
      
      itemEl.innerHTML = `
        <div class="frame-pressed-1 shrink-0 cursor-pointer" style="width: 48px; height: 48px;">
          <img 
            alt="${o.name}" 
            class="pixelated size-full object-cover" 
            src="/assets/room-thumbnails/${o.code}.png" 
            onclick="globalThis.state.board.send({ type: 'selectRoomById', roomId: '${o.code}' });" />
        </div>
        <div class="grid w-full gap-1">
          <div 
            class="text-whiteExp cursor-pointer"
            onclick="globalThis.state.board.send({ type: 'selectRoomById', roomId: '${o.code}' });" >
              ${o.name}
            </div>
          <div class="pixel-font-14">Your score ${o.yourScore} → Top ${o.bestScore}</div>
          ${o.type === 'score' ? `<div class="pixel-font-14" style="color: #8f8;">+${o.diff} rank points</div>` : ''}
          ${tickInfo}
          <div class="pixel-font-14" style="font-size: 11px; color: #ccc;">by ${o.player}</div>
        </div>
      `;
      scrollContainer.addContent(itemEl);
    });
  } else {
    const emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'text-align: center; color: #eee; padding: 20px;';
    emptyEl.textContent = 'You already have the maximum rank score in all rooms!';
    scrollContainer.addContent(emptyEl);
  }
  
  // Add stats footer
  const scoreOpps = opportunities.filter(o => o.type === 'score');
  const tickOpps = opportunities.filter(o => o.type === 'tick');
  const statsContainer = document.createElement('div');
  statsContainer.className = 'frame-pressed-1 surface-dark p-2 pixel-font-14';
  statsContainer.innerHTML = `
    <div>Rooms with score improvement: ${scoreOpps.length}</div>
    <div>Rooms with tick improvement: ${tickOpps.length}</div>
    <div>Total rank points to gain: ${scoreOpps.reduce((sum, o) => sum + o.diff, 0)}</div>
  `;
  
  return {
    scrollContainer,
    statsContainer
  };
}

// Helper function to create HTML content for difficulty improvements
function createDifficultyContent(opportunities) {
  // Create scrollable container using the API
  const scrollContainer = api.ui.components.createScrollContainer({
    height: 264,
    padding: true,
    content: ''
  });
  
  // Add opportunities list
  if (opportunities.length > 0) {
    opportunities.forEach(o => {
      const itemEl = document.createElement('div');
      itemEl.className = 'frame-1 surface-regular flex items-center gap-2 p-1';
      itemEl.innerHTML = `
        <div class="frame-pressed-1 shrink-0 cursor-pointer" style="width: 48px; height: 48px;">
          <img 
            alt="${o.name}" 
            class="pixelated size-full object-cover" 
            src="/assets/room-thumbnails/${o.code}.png" 
            onclick="globalThis.state.board.send({ type: 'selectRoomById', roomId: '${o.code}' });" />
        </div>
        <div class="grid w-full gap-1">
          <div 
            class="text-whiteExp cursor-pointer"
            onclick="globalThis.state.board.send({ type: 'selectRoomById', roomId: '${o.code}' });" >
              ${o.name}
            </div>
          <div class="pixel-font-14">Your floor ${o.yourFloor} → Top ${o.bestFloor}</div>
          <div class="pixel-font-14" style="color: #8f8;">+${o.diff} floors</div>
          <div class="pixel-font-14" style="font-size: 11px; color: #ccc;">by ${o.player}</div>
        </div>
      `;
      scrollContainer.addContent(itemEl);
    });
  } else {
    const emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'text-align: center; color: #eee; padding: 20px;';
    emptyEl.textContent = 'You already have the maximum floor in all rooms!';
    scrollContainer.addContent(emptyEl);
  }
  
  // Add stats footer
  const statsContainer = document.createElement('div');
  statsContainer.className = 'frame-pressed-1 surface-dark p-2 pixel-font-14';
  statsContainer.innerHTML = `
    <div>Rooms with floor improvement: ${opportunities.length}</div>
    <div>Total floors to gain: ${opportunities.reduce((sum, o) => sum + o.diff, 0)}</div>
  `;
  
  return {
    scrollContainer,
    statsContainer
  };
}

// Function to create tabs
function createTabs(tickContent, rankContent, difficultyContent) {
  const container = document.createElement('div');
  container.className = 'flex flex-col';
  
  // Create tab buttons
  const tabButtons = document.createElement('div');
  tabButtons.className = 'flex mb-2';
  
  const tickTabButton = document.createElement('button');
  tickTabButton.className = 'frame-pressed-1 surface-regular px-4 py-1 flex-1 tab-active';
  tickTabButton.textContent = 'Tick';
  
  const rankTabButton = document.createElement('button');
  rankTabButton.className = 'frame-pressed-1 surface-dark px-4 py-1 flex-1';
  rankTabButton.textContent = 'Rank';
  
  const difficultyTabButton = document.createElement('button');
  difficultyTabButton.className = 'frame-pressed-1 surface-dark px-4 py-1 flex-1';
  difficultyTabButton.textContent = 'Floor';
  
  tabButtons.appendChild(tickTabButton);
  tabButtons.appendChild(rankTabButton);
  tabButtons.appendChild(difficultyTabButton);
  
  // Create content containers
  const tickTab = document.createElement('div');
  tickTab.style.display = 'flex';
  tickTab.style.flexDirection = 'column';
  tickTab.appendChild(tickContent.scrollContainer.element);
  
  const separator1 = document.createElement('div');
  separator1.setAttribute('role', 'none');
  separator1.className = 'separator my-2.5';
  tickTab.appendChild(separator1);
  tickTab.appendChild(tickContent.statsContainer);
  
  const rankTab = document.createElement('div');
  rankTab.style.display = 'none';
  rankTab.style.flexDirection = 'column';
  rankTab.appendChild(rankContent.scrollContainer.element);
  
  const separator2 = document.createElement('div');
  separator2.setAttribute('role', 'none');
  separator2.className = 'separator my-2.5';
  rankTab.appendChild(separator2);
  rankTab.appendChild(rankContent.statsContainer);
  
  const difficultyTab = document.createElement('div');
  difficultyTab.style.display = 'none';
  difficultyTab.style.flexDirection = 'column';
  difficultyTab.appendChild(difficultyContent.scrollContainer.element);
  
  const separator3 = document.createElement('div');
  separator3.setAttribute('role', 'none');
  separator3.className = 'separator my-2.5';
  difficultyTab.appendChild(separator3);
  difficultyTab.appendChild(difficultyContent.statsContainer);
  
  // Add event listeners to tab buttons
  tickTabButton.addEventListener('click', () => {
    tickTabButton.className = 'frame-pressed-1 surface-regular px-4 py-1 flex-1 tab-active';
    rankTabButton.className = 'frame-pressed-1 surface-dark px-4 py-1 flex-1';
    difficultyTabButton.className = 'frame-pressed-1 surface-dark px-4 py-1 flex-1';
    tickTab.style.display = 'flex';
    rankTab.style.display = 'none';
    difficultyTab.style.display = 'none';
  });
  
  rankTabButton.addEventListener('click', () => {
    tickTabButton.className = 'frame-pressed-1 surface-dark px-4 py-1 flex-1';
    rankTabButton.className = 'frame-pressed-1 surface-regular px-4 py-1 flex-1 tab-active';
    difficultyTabButton.className = 'frame-pressed-1 surface-dark px-4 py-1 flex-1';
    tickTab.style.display = 'none';
    rankTab.style.display = 'flex';
    difficultyTab.style.display = 'none';
  });
  
  difficultyTabButton.addEventListener('click', () => {
    tickTabButton.className = 'frame-pressed-1 surface-dark px-4 py-1 flex-1';
    rankTabButton.className = 'frame-pressed-1 surface-dark px-4 py-1 flex-1';
    difficultyTabButton.className = 'frame-pressed-1 surface-regular px-4 py-1 flex-1 tab-active';
    tickTab.style.display = 'none';
    rankTab.style.display = 'none';
    difficultyTab.style.display = 'flex';
  });
  
  // Add everything to the container
  container.appendChild(tabButtons);
  container.appendChild(tickTab);
  container.appendChild(rankTab);
  container.appendChild(difficultyTab);
  
  return container;
}

// Function to show improvement opportunities modal
async function showImprovementsModal() {
  if (window.DEBUG) console.log('Showing improvement opportunities modal...');
  
  try {
    ROOM_NAMES = globalThis.state.utils.ROOM_NAME;
    
    // Show loading modal
    const loadingModal = api.showModal({
      title: '🏆 Improvement Opportunities',
      content: '<div style="text-align: center; padding: 20px;">Loading data...</div>',
      buttons: []
    });
    
    // Get player context and fetch highscores data
    const ctx = globalThis.state.player.getSnapshot().context;
    const rooms = ctx.rooms;
    const you = ctx.userId;
    
    // Fetch data from API
    const [best, lbs, roomsHighscores] = await Promise.all([
      fetchTRPC('game.getTickHighscores'),
      fetchTRPC('game.getTickLeaderboards'),
      fetchTRPC('game.getRoomsHighscores')
    ]);
    
    if (window.DEBUG) {
      console.log('[Highscore Improvements] roomsHighscores full data:', roomsHighscores);
      console.log('[Highscore Improvements] roomsHighscores.rank sample:', Object.entries(roomsHighscores?.rank || {}).slice(0, 5));
      console.log('[Highscore Improvements] roomsHighscores.floor sample:', Object.entries(roomsHighscores?.floor || {}).slice(0, 5));
      console.log('[Highscore Improvements] Player rooms count:', Object.keys(rooms).length);
      console.log('[Highscore Improvements] Player rooms with rank:', Object.entries(rooms).filter(([_, r]) => r.rank).length);
      console.log('[Highscore Improvements] Player rooms with floor:', Object.entries(rooms).filter(([_, r]) => r.floor !== undefined).length);
      if (IGNORED_MAPS.length > 0) {
        console.log('[Highscore Improvements] Ignored maps:', IGNORED_MAPS);
      }
      
      // Sample a few rooms to see the structure
      const sampleRooms = Object.entries(rooms).slice(0, 5);
      sampleRooms.forEach(([code, r]) => {
        const topRank = roomsHighscores?.rank?.[code];
        const topFloor = roomsHighscores?.floor?.[code];
        console.log(`[Highscore Improvements] Room ${code}:`, {
          player: {
            rank: r.rank,
            ticks: r.ticks,
            rankTicks: r.rankTicks,
            floor: r.floor,
            count: r.count
          },
          topRank: topRank ? {
            userId: topRank.userId,
            userName: topRank.userName,
            rank: topRank.rank,
            ticks: topRank.ticks
          } : 'N/A',
          topFloor: topFloor ? {
            userId: topFloor.userId,
            userName: topFloor.userName,
            floor: topFloor.floor
          } : 'N/A'
        });
      });
    }
    
    // Process tick opportunities
    const tickOpportunities = Object.entries(rooms).flatMap(([code, r]) => {
      // Skip ignored maps
      if (IGNORED_MAPS.includes(code)) return [];
      
      const b = best[code];
      if (!b) return [];
      const d = r.ticks - b.ticks;
      if (d <= 0 || b.userId === you) return [];
      return [{
        code, 
        name: ROOM_NAMES[code] || code, 
        yours: r.ticks, 
        best: b.ticks, 
        diff: d, 
        pct: ((d / r.ticks) * 100).toFixed(1), 
        player: b.userName
      }];
    }).sort((a, b) => b.diff - a.diff);
    
    // Calculate tick totals
    const total = Object.values(rooms).reduce((s, r) => s + r.ticks, 0);
    const minTheo = Object.entries(rooms).reduce((s, [c, r]) => 
      s + (best[c] ? Math.min(r.ticks, best[c].ticks) : r.ticks), 0);
    const gain = total - minTheo;
    
    // Process rank opportunities (including tick tiebreaker)
    let rankProcessedCount = 0;
    let rankSkippedNoData = 0;
    let rankSkippedNoTopRank = 0;
    let rankScoreOpps = 0;
    let rankTickOpps = 0;
    let rankSameScoreBetterTick = 0;
    
    const rankOpportunities = Object.entries(rooms).flatMap(([code, r]) => {
      rankProcessedCount++;
      
      // Skip ignored maps
      if (IGNORED_MAPS.includes(code)) return [];
      
      // Skip if no rank data for this room or room has no rank property
      if (!r.rank) {
        rankSkippedNoData++;
        return [];
      }
      
      // Get top rank for this room
      const topRank = roomsHighscores?.rank?.[code];
      if (!topRank) {
        rankSkippedNoTopRank++;
        return [];
      }
      
      const results = [];
      
      // CASE 1: We don't have the highest rank score - show score improvement
      if (topRank.rank > r.rank) {
        rankScoreOpps++;
        if (window.DEBUG && rankScoreOpps <= 3) {
          console.log(`[Highscore Improvements] Rank score opp in ${code}: yours=${r.rank}, best=${topRank.rank}`);
        }
        results.push({
          code,
          name: ROOM_NAMES[code] || code,
          yourScore: r.rank,
          bestScore: topRank.rank,
          diff: topRank.rank - r.rank,
          player: topRank.userName,
          type: 'score',
          sortPriority: 0  // Score improvements first
        });
      } 
      // CASE 2: We have the highest rank score, but can improve tick (tiebreaker)
      else if (topRank.rank === r.rank) {
        rankSameScoreBetterTick++;
        
        // CRITICAL: Use rankTicks, not ticks! 
        // r.ticks = speedrun time
        // r.rankTicks = time to achieve rank score
        const yourRankTicks = r.rankTicks;
        const topRankTicks = topRank.ticks; // API returns as 'ticks' in roomsHighscores.rank
        
        if (window.DEBUG && rankSameScoreBetterTick <= 5) {
          console.log(`[Highscore Improvements] Same rank in ${code}:`, {
            sameScore: topRank.rank === r.rank,
            yourRank: r.rank,
            topRank: topRank.rank,
            yourSpeedrunTicks: r.ticks,
            yourRankTicks: yourRankTicks,
            topRankTicks: topRankTicks,
            topHasBetterRankTick: topRankTicks && yourRankTicks && topRankTicks < yourRankTicks,
            youHaveBetterRankTick: topRankTicks && yourRankTicks && yourRankTicks < topRankTicks,
            isYouTheTop: topRank.userId === you,
            topUserId: topRank.userId,
            yourUserId: you
          });
        }
        
        // Check if record holder has better (lower) rankTick than us for the same rank score
        // This means someone achieved the same rank points in fewer ticks
        if (topRankTicks && yourRankTicks && topRankTicks < yourRankTicks) {
          rankTickOpps++;
          if (window.DEBUG && rankTickOpps <= 5) {
            console.log(`[Highscore Improvements] ✅ Rank tick opp in ${code}: yourRankTicks=${yourRankTicks}, bestRankTicks=${topRankTicks}, rank=${r.rank}`);
          }
          results.push({
            code,
            name: ROOM_NAMES[code] || code,
            yourScore: r.rank,
            bestScore: topRank.rank,
            yourTicks: yourRankTicks,
            bestTicks: topRankTicks,
            diff: 0,
            player: topRank.userName,
            type: 'tick',
            sortPriority: 1  // Tick improvements second
          });
        }
      }
      
      return results;
    }).sort((a, b) => {
      // Sort by priority first (score improvements before tick improvements)
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }
      // Within same priority, sort by diff (for score) or tick difference (for tick)
      if (a.type === 'score' && b.type === 'score') {
        return b.diff - a.diff;
      }
      if (a.type === 'tick' && b.type === 'tick') {
        return (b.yourTicks - b.bestTicks) - (a.yourTicks - a.bestTicks);
      }
      return 0;
    });
    
    // Process difficulty opportunities
    let floorProcessedCount = 0;
    let floorSkippedNoData = 0;
    let floorSkippedNoTopFloor = 0;
    let floorSkippedAlreadyBest = 0;
    let floorOpps = 0;
    
    const difficultyOpportunities = Object.entries(rooms).flatMap(([code, r]) => {
      floorProcessedCount++;
      
      // Skip ignored maps
      if (IGNORED_MAPS.includes(code)) return [];
      
      // Normalize floor data with fallback (same logic as Cyclopedia)
      // If both floor and floorTicks are missing, defaults to floor 0
      let yourFloor = r.floor;
      if (yourFloor === undefined || yourFloor === null) {
        yourFloor = 0; // Default to floor 0 like Cyclopedia does
      }
      
      // Get top floor for this room
      const topFloor = roomsHighscores?.floor?.[code];
      if (!topFloor) {
        floorSkippedNoTopFloor++;
        return [];
      }
      
      // Normalize best floor data with fallback
      let bestFloor = topFloor.floor;
      if (bestFloor === undefined || bestFloor === null) {
        bestFloor = 0;
      }
      
      // Check if we can improve floor (skip if we're already the best)
      if (bestFloor <= yourFloor) {
        floorSkippedAlreadyBest++;
        if (window.DEBUG && floorSkippedAlreadyBest <= 5) {
          console.log(`[Highscore Improvements] Floor skipped (already best or equal) in ${code}: yourFloor=${yourFloor}, bestFloor=${bestFloor}`);
        }
        return [];
      }
      
      floorOpps++;
      if (window.DEBUG && floorOpps <= 5) {
        console.log(`[Highscore Improvements] ✅ Floor opp in ${code}: yourFloor=${yourFloor}, bestFloor=${bestFloor}, diff=${bestFloor - yourFloor}`);
      }
      
      return [{
        code,
        name: ROOM_NAMES[code] || code,
        yourFloor: yourFloor,
        bestFloor: bestFloor,
        diff: bestFloor - yourFloor,
        player: topFloor.userName
      }];
    }).sort((a, b) => b.diff - a.diff);
    
    if (window.DEBUG) {
      console.log('[Highscore Improvements] === RANK PROCESSING SUMMARY ===');
      console.log(`[Highscore Improvements] Rooms processed: ${rankProcessedCount}`);
      console.log(`[Highscore Improvements] Skipped (no rank data): ${rankSkippedNoData}`);
      console.log(`[Highscore Improvements] Skipped (no top rank): ${rankSkippedNoTopRank}`);
      console.log(`[Highscore Improvements] Same score rooms: ${rankSameScoreBetterTick}`);
      console.log(`[Highscore Improvements] Score improvements: ${rankScoreOpps}`);
      console.log(`[Highscore Improvements] Tick improvements: ${rankTickOpps}`);
      console.log(`[Highscore Improvements] Total rank opportunities: ${rankOpportunities.length}`);
      
      console.log('[Highscore Improvements] === FLOOR PROCESSING SUMMARY ===');
      console.log(`[Highscore Improvements] Rooms processed: ${floorProcessedCount}`);
      console.log(`[Highscore Improvements] Skipped (no floor data): ${floorSkippedNoData}`);
      console.log(`[Highscore Improvements] Skipped (no top floor): ${floorSkippedNoTopFloor}`);
      console.log(`[Highscore Improvements] Skipped (already best): ${floorSkippedAlreadyBest}`);
      console.log(`[Highscore Improvements] Floor improvements: ${floorOpps}`);
      console.log(`[Highscore Improvements] Total floor opportunities: ${difficultyOpportunities.length}`);
    }
    
    // Close loading modal
    loadingModal();
    
    // Create content for all three tabs
    const tickContent = createTickContent(tickOpportunities, total, minTheo, gain);
    const rankContent = createRankContent(rankOpportunities);
    const difficultyContent = createDifficultyContent(difficultyOpportunities);
    
    // Create tabbed interface
    const tabbedContent = createTabs(tickContent, rankContent, difficultyContent);
    
    // Show the new modal
    api.showModal({
      title: '🏆 Improvement Opportunities',
      content: tabbedContent,
      buttons: [
        {
          text: 'Close',
          primary: true
        }
      ]
    });
    
    if (window.DEBUG) console.log('Improvement opportunities modal displayed successfully');
  } catch (error) {
    console.error('Error showing improvement opportunities:', error);
    
    // Show error modal
    api.showModal({
      title: 'Error',
      content: '<p>Failed to load improvement opportunities. Please try again later.</p><p style="color: #999; font-size: 12px;">Error: ' + error.message + '</p>',
      buttons: [
        {
          text: 'OK',
          primary: true
        }
      ]
    });
  }
}

if (window.DEBUG) console.log('Improved Highscore Mod initialization complete');

// Export control functions
exports = {
  showImprovements: showImprovementsModal
};

// Cleanup function for Highscore Improvements mod (exposed for mod system)
exports.cleanup = function() {
  console.log('[Highscore Improvements] Running cleanup...');
  
  // Clear any cached data
  if (typeof ROOM_NAMES !== 'undefined') {
    ROOM_NAMES = null;
  }
  
  // Remove any existing modals
  const existingModal = document.querySelector('#highscore-improvements-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Clear any global state
  if (typeof window.highscoreImprovementsState !== 'undefined') {
    delete window.highscoreImprovementsState;
  }
  
  console.log('[Highscore Improvements] Cleanup completed');
}; 