const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

const LEAGUES = [
  { code: 'PL', id: 'PL' },
  { code: 'PD', id: 'PD' },
  { code: 'SA', id: 'SA' },
  { code: 'BL1', id: 'BL1' },
  { code: 'FL1', id: 'FL1' },
  { code: 'DED', id: 'DED' },
  { code: 'PPL', id: 'PPL' },
  { code: 'BSA', id: 'BSA' }
];

async function runTickerEngine() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const leaguesPayload = {};

  for (const league of LEAGUES) {
    const leagueCodeLower = league.code.toLowerCase();
    try {
      console.log(`Fetching ticker matches for ${league.code}...`);
      
      const response = await axios.get(`https://api.football-data.org/v4/competitions/${league.id}/matches?status=FINISHED`, {
        headers: { 'X-Auth-Token': API_KEY }
      });

      const matches = response.data.matches || [];
      
      if (matches.length > 0) {
        const maxMatchday = Math.max(...matches.map(m => m.matchday || 0));
        const weekMatches = matches.filter(m => m.matchday === maxMatchday);

        leaguesPayload[leagueCodeLower] = weekMatches.map(m => {
          const hScore = m.score.fullTime.home ?? 0;
          const aScore = m.score.fullTime.away ?? 0;
          const h1_home = m.score.halfTime.home ?? 0;
          const h1_away = m.score.halfTime.away ?? 0;

          return {
            home: m.homeTeam.shortName || m.homeTeam.name,
            away: m.awayTeam.shortName || m.awayTeam.name,
            home_score: hScore,
            away_score: aScore,
            week: maxMatchday,
            h1_home: h1_home,
            h1_away: h1_away,
            h2_home: hScore - h1_home,
            h2_away: aScore - h1_away
          };
        });
      } else {
        leaguesPayload[leagueCodeLower] = [];
      }
    } catch (err) {
      console.error(`Ticker update error for ${league.code}:`, err.message);
      leaguesPayload[leagueCodeLower] = [];
    }
  }

  const masterPayload = {
    updated_at: new Date().toISOString(),
    leagues: leaguesPayload
  };

  fs.writeFileSync(
    path.join(dataDir, 'ticker.json'),
    JSON.stringify(masterPayload, null, 2)
  );

  console.log('Successfully generated isolated data/ticker.json');
}

runTickerEngine();
