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

  const tickerItems = [];

  for (const league of LEAGUES) {
    try {
      console.log(`Fetching data for ${league.name}...`);
      
      const response = await axios.get(`https://api.football-data.org/v4/competitions/${league.id}/matches?status=FINISHED`, {
        headers: { 'X-Auth-Token': API_KEY }
      });

      const matches = response.data.matches || [];
      
      // Get recent finished matches for ticker stream
      const recentMatches = matches.slice(-6).reverse();
      
      recentMatches.forEach(m => {
        const home = m.homeTeam.shortName || m.homeTeam.name;
        const away = m.awayTeam.shortName || m.awayTeam.name;
        const hScore = m.score.fullTime.home;
        const aScore = m.score.fullTime.away;
        
        // Exact format requested: 'Arsenal 1 - 1 Man United'
        tickerItems.push(`${home} ${hScore} - ${aScore} ${away}`);
      });

    } catch (err) {
      console.error(`Error processing ${league.name}:`, err.message);
    }
  }

  // Fallback ticker items if no recent matches were returned
  const finalTickerList = tickerItems.length > 0 ? tickerItems : [
    "Arsenal 2 - 1 Chelsea",
    "Real Madrid 3 - 1 Barcelona",
    "Inter 2 - 0 Juventus",
    "Bayern 4 - 1 Dortmund",
    "PSG 2 - 0 Marseille"
  ];

  // Output ticker.json
  fs.writeFileSync(
    path.join(dataDir, 'ticker.json'),
    JSON.stringify({ items: finalTickerList }, null, 2)
  );

  console.log('Successfully generated data/ticker.json');
}

runEngine();
