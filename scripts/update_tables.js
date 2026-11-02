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
      console.log(`Processing core & upcoming matches for ${league.name}...`);
      
      // Fetch both FINISHED and SCHEDULED matches
      const response = await axios.get(`https://api.football-data.org/v4/competitions/${league.id}/matches`, {
        headers: { 'X-Auth-Token': API_KEY }
      });

      const allMatches = response.data.matches || [];
      
      // 1. Process Finished Matches for Standing Engine
      const finishedMatches = allMatches.filter(m => m.status === 'FINISHED');
      if (finishedMatches.length > 0) {
        const maxMatchday = Math.max(...finishedMatches.map(m => m.matchday || 0));
        const weekFinished = finishedMatches.filter(m => m.matchday === maxMatchday);

        const structuredFinished = weekFinished.map(m => ({
          id: m.id,
          week: maxMatchday,
          home: m.homeTeam.shortName || m.homeTeam.name,
          away: m.awayTeam.shortName || m.awayTeam.name,
          home_score: m.score.fullTime.home ?? 0,
          away_score: m.score.fullTime.away ?? 0,
          h1_home: m.score.halfTime.home ?? 0,
          h1_away: m.score.halfTime.away ?? 0,
          h2_home: (m.score.fullTime.home ?? 0) - (m.score.halfTime.home ?? 0),
          h2_away: (m.score.fullTime.away ?? 0) - (m.score.halfTime.away ?? 0),
          utcDate: m.utcDate
        }));

        fs.writeFileSync(
          path.join(dataDir, `${leagueCodeLower}-matches.json`),
          JSON.stringify(structuredFinished, null, 2)
        );
      }

      // 2. Process Scheduled/Upcoming Matches for Upcoming Fixtures Widget
      const scheduledMatches = allMatches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED');
      if (scheduledMatches.length > 0) {
        const nextMatchday = Math.min(...scheduledMatches.map(m => m.matchday || 999));
        const weekUpcoming = scheduledMatches.filter(m => m.matchday === nextMatchday);

        const structuredUpcoming = weekUpcoming.map(m => ({
          id: m.id,
          week: nextMatchday,
          home: m.homeTeam.shortName || m.homeTeam.name,
          away: m.awayTeam.shortName || m.awayTeam.name,
          utcDate: m.utcDate
        }));

        fs.writeFileSync(
          path.join(dataDir, `${leagueCodeLower}-upcoming.json`),
          JSON.stringify(structuredUpcoming, null, 2)
        );
      } else {
        // Fallback empty array
        fs.writeFileSync(
          path.join(dataDir, `${leagueCodeLower}-upcoming.json`),
          JSON.stringify([], null, 2)
        );
      }

    } catch (err) {
      console.log(`Error processing ${league.name}: ${err.message}`);
    }
  }

  console.log('Successfully updated core and upcoming match files!');
}

runCoreEngine();
