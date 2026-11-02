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

async function runEngine() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const leaguesPayload = {};
  const globalTickerStream = [];

  for (const league of LEAGUES) {
    const leagueCodeLower = league.code.toLowerCase();
    try {
      console.log(`Fetching full-week match data for ${league.name}...`);
      
      const response = await axios.get(`https://api.football-data.org/v4/competitions/${league.id}/matches?status=FINISHED`, {
        headers: { 'X-Auth-Token': API_KEY }
      });

      const matches = response.data.matches || [];
      
      if (matches.length > 0) {
        // Find the maximum completed matchday/week
        const maxMatchday = Math.max(...matches.map(m => m.matchday || 0));
        
        // Filter ALL matches belonging to that latest completed matchday
        const weekMatches = matches.filter(m => m.matchday === maxMatchday);

        const structuredMatches = weekMatches.map(m => {
          const home = m.homeTeam.shortName || m.homeTeam.name;
          const away = m.awayTeam.shortName || m.awayTeam.name;
          const hScore = m.score.fullTime.home ?? 0;
          const aScore = m.score.fullTime.away ?? 0;

          // Halves score calculation
          const h1_home = m.score.halfTime.home ?? 0;
          const h1_away = m.score.halfTime.away ?? 0;
          const h2_home = hScore - h1_home;
          const h2_away = aScore - h1_away;

          // Push string stream for legacy compatibility
          globalTickerStream.push(`${home} ${hScore} - ${aScore} ${away}`);

          return {
            id: m.id,
            week: maxMatchday,
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

        leaguesPayload[leagueCodeLower] = structuredMatches;

        // Write individual league match files (e.g., data/pl-matches.json)
        fs.writeFileSync(
          path.join(dataDir, `${leagueCodeLower}-matches.json`),
          JSON.stringify(structuredMatches, null, 2)
        );
      } else {
        leaguesPayload[leagueCodeLower] = [];
      }

    } catch (err) {
      console.error(`Error processing ${league.name}:`, err.message);
      leaguesPayload[leagueCodeLower] = [];
    }
  }

  // Fallback ticker stream if API returned no data
  const finalTickerStream = globalTickerStream.length > 0 ? globalTickerStream : [
    "Arsenal 2 - 1 Chelsea",
    "Real Madrid 3 - 1 Barcelona",
    "Inter 2 - 0 Juventus",
    "Bayern 4 - 1 Dortmund",
    "PSG 2 - 0 Marseille"
  ];

  // Output master payload to data/ticker.json
  const masterPayload = {
    updated_at: new Date().toISOString(),
    ticker_stream: finalTickerStream,
    leagues: leaguesPayload
  };

  fs.writeFileSync(
    path.join(dataDir, 'ticker.json'),
    JSON.stringify(masterPayload, null, 2)
  );

  console.log('Successfully generated full-week match payloads in data/!');
}

runEngine();
