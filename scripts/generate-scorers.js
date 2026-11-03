const fs = require('fs');
const path = require('path');

const LEAGUES = [
  { file: 'pl-matches.json', name: 'Premier League' },
  { file: 'laliga-matches.json', name: 'La Liga' },
  { file: 'sa-matches.json', name: 'Serie A' },
  { file: 'bl1-matches.json', name: 'Bundesliga' },
  { file: 'fl1-matches.json', name: 'Ligue 1' },
  { file: 'ded-matches.json', name: 'Eredivisie' },
  { file: 'ppl-matches.json', name: 'Primeira Liga' },
  { file: 'bsa-matches.json', name: 'Brasileirão' }
];

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'top-scorers.json');

function aggregateScorers() {
  const scorerMap = {};

  LEAGUES.forEach(league => {
    const filePath = path.join(DATA_DIR, league.file);
    if (fs.existsSync(filePath)) {
      try {
        const matches = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        matches.forEach(match => {
          // Expecting an array of goal events in each match: match.goal_events = [{player: "Name", team: "Club"}]
          if (Array.isArray(match.goal_events)) {
            match.goal_events.forEach(event => {
              if (!event.player) return;
              
              const key = event.player.toLowerCase();
              if (!scorerMap[key]) {
                scorerMap[key] = {
                  player: event.player,
                  club: event.team || match.home, // Default to home/away if team is missing
                  league: league.name,
                  goals: 0,
                  photo: event.photo || ""
                };
              }
              scorerMap[key].goals++;
            });
          }
        });
      } catch (err) {
        console.error(`Error reading ${league.file}:`, err);
      }
    }
  });

  // Convert map to array, sort descending by goals
  const sortedScorers = Object.values(scorerMap).sort((a, b) => b.goals - a.goals);

  // Write to top-scorers.json
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sortedScorers, null, 2), 'utf8');
  console.log(`Successfully generated top-scorers.json with ${sortedScorers.length} players.`);
}

aggregateScorers();
