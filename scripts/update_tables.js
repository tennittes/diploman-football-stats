const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

const LEAGUES = [
  { code: 'PL', id: 'PL', name: 'Premier League' },
  { code: 'PD', id: 'PD', name: 'La Liga' },
  { code: 'SA', id: 'SA', name: 'Serie A' },
  { code: 'BL1', id: 'BL1', name: 'Bundesliga' },
  { code: 'FL1', id: 'FL1', name: 'Ligue 1' },
  { code: 'DED', id: 'DED', name: 'Eredivisie' },
  { code: 'PPL', id: 'PPL', name: 'Primeira Liga' },
  { code: 'BSA', id: 'BSA', name: 'Brasileirão' }
];

async function runCoreEngine() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  for (const league of LEAGUES) {
    const leagueCodeLower = league.code.toLowerCase();
    try {
      console.log(`Processing core data for ${league.name}...`);
      
      const response = await axios.get(`https://api.football-data.org/v4/competitions/${league.id}/matches?status=FINISHED`, {
        headers: { 'X-Auth-Token': API_KEY }
      });

      const matches = response.data.matches || [];
      
      if (matches.length > 0) {
        // Map ALL finished matches across the season to build true cumulative standings
        const structuredMatches = matches.map(m => {
          const home = m.homeTeam.shortName || m.homeTeam.name;
          const away = m.awayTeam.shortName || m.awayTeam.name;
          const hScore = m.score.fullTime.home ?? 0;
          const aScore = m.score.fullTime.away ?? 0;

          const h1_home = m.score.halfTime.home ?? 0;
          const h1_away = m.score.halfTime.away ?? 0;
          const h2_home = hScore - h1_home;
          const h2_away = aScore - h1_away;

          return {
            id: m.id,
            week: m.matchday,
            home: home,
            away: away,
            home_score: hScore,
            away_score: aScore,
            h1_home: h1_home,
            h1_away: h1_away,
            h2_home: h2_home,
            h2_away: h2_away,
            utcDate: m.utcDate
          };
        });

        // Save the complete cumulative match dataset (e.g., data/pl-matches.json)
        fs.writeFileSync(
          path.join(dataDir, `${leagueCodeLower}-matches.json`),
          JSON.stringify(structuredMatches, null, 2)
        );
        console.log(`Updated data/${leagueCodeLower}-matches.json with ${structuredMatches.length} total cumulative matches.`);
      }
    } catch (err) {
      console.error(`Error processing core data for ${league.name}:`, err.message);
    }
  }

  console.log('Successfully completed cumulative match dataset updates!');
}

runCoreEngine();
