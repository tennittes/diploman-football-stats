const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'top-scorers.json');

// Configuration for your 8 leagues using football-data.org codes & custom labels
const LEAGUES = [
  { code: 'PL', label: 'Premier League', short: 'PL' },
  { code: 'PD', label: 'La Liga', short: 'PD' },
  { code: 'SA', label: 'Serie A', short: 'SA' },
  { code: 'BL1', label: 'Bundesliga', short: 'BL1' },
  { code: 'FL1', label: 'Ligue 1', short: 'FL1' },
  { code: 'DED', label: 'Eredivisie', short: 'DED' },
  { code: 'PPL', label: 'Primeira Liga', short: 'PPL' },
  { code: 'BSA', label: 'Brasileirao', short: 'BSA' } // Note: Check free-tier availability for BSA if applicable
];

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

async function fetchLeagueScorers(league) {
  if (!API_KEY) {
    console.warn("⚠️ FOOTBALL_DATA_API_KEY environment variable is missing.");
    return [];
  }

  try {
    const url = `https://api.football-data.org/v4/competitions/${league.code}/scorers?limit=10`;
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': API_KEY }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch scorers for ${league.name}: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Parse football-data.org response structure
    // Each scorer item typically contains: player { name }, team { name }, goals, assists, penalties
    if (data && Array.isArray(data.scorers)) {
      return data.scorers.map(item => ({
        player: item.player.name,
        club: item.team.name,
        league: league.label,
        leagueShort: league.short,
        goals: item.goals || 0,
        assists: item.assists || 0
      }));
    }
  } catch (err) {
    console.error(`Error fetching data for ${league.code}:`, err.message);
  }
  return [];
}

async function runDataSourcing() {
  console.log("Fetching live player stats from football-data.org...");
  let globalScorers = [];

  for (const league of LEAGUES) {
    const scorers = await fetchLeagueScorers(league);
    globalScorers.push(...scorers);
    // Respect rate limits (Free tier allows ~10 requests per minute)
    await new Promise(resolve => setTimeout(resolve, 4000)); 
  }

  // Fallback check if API call failed or returned empty
  if (globalScorers.length === 0) {
    console.error("❌ No data fetched from API. Keeping existing file or exiting.");
    process.exit(1);
  }

  // Deduplicate or sort globally if needed (sorting primary by goals descending)
  globalScorers.sort((a, b) => b.goals - a.goals || b.assists - a.assists);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(globalScorers, null, 2), 'utf8');
  console.log(`Successfully pulled and generated top-scorers.json with ${globalScorers.length} total entries.`);
}

runDataSourcing();
