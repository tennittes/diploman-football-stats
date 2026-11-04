const fs = require('fs');
const path = require('path');

// Configuration for all 8 leagues
const leagues = [
  { id: "pl", name: "Premier League", file: "pl-matches.json", code: "PL" },
  { id: "pd", name: "La Liga", file: "pd-matches.json", code: "PD" },
  { id: "sa", name: "Serie A", file: "sa-matches.json", code: "SA" },
  { id: "bl1", name: "Bundesliga", file: "bl1-matches.json", code: "BL1" },
  { id: "fl1", name: "Ligue 1", file: "fl1-matches.json", code: "FL1" },
  { id: "ded", name: "Eredivisie", file: "ded-matches.json", code: "DED" },
  { id: "ppl", name: "Primeira Liga", file: "ppl-matches.json", code: "PPL" },
  { id: "bsa", name: "Brasileirão", file: "bsa-matches.json", code: "BSA" }
];

const dataDir = path.join(__dirname, '../data');
const outputDir = path.join(__dirname, '../reports');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function computeStandings(matches) {
  if (!matches || matches.length === 0) return [];
  const maxWeek = Math.max(...matches.map(m => m.week || 1));
  const filtered = matches.filter(m => (m.week || 1) <= maxWeek);
  const teamMap = {};

  filtered.forEach(m => {
    if (!teamMap[m.home]) teamMap[m.home] = { team: m.home, mp: 0, gs: 0, ga: 0, plPts: 0, dfsPts: 0 };
    if (!teamMap[m.away]) teamMap[m.away] = { team: m.away, mp: 0, gs: 0, ga: 0, plPts: 0, dfsPts: 0 };

    const home = teamMap[m.home];
    const away = teamMap[m.away];

    home.mp++; away.mp++;
    home.gs += (Number(m.home_score) || 0);
    home.ga += (Number(m.away_score) || 0);
    away.gs += (Number(m.away_score) || 0);
    away.ga += (Number(m.home_score) || 0);

    if (Number(m.home_score) > Number(m.away_score)) {
      home.plPts += 3;
    } else if (Number(m.home_score) < Number(m.away_score)) {
      away.plPts += 3;
    } else {
      home.plPts += 1; away.plPts += 1;
    }

    let h1Home = (Number(m.h1_home) > Number(m.h1_away) ? 1 : 0);
    let h1Away = (Number(m.h1_home) < Number(m.h1_away) ? 1 : 0);
    let h2Home = (Number(m.h2_home) > Number(m.h2_away) ? 1 : 0);
    let h2Away = (Number(m.h2_home) < Number(m.h2_away) ? 1 : 0);

    home.dfsPts += h1Home + h2Home + (h1Home && h2Home ? 1 : 0);
    away.dfsPts += h1Away + h2Away + (h1Away && h2Away ? 1 : 0);
  });

  return Object.values(teamMap).map(t => ({
    ...t,
    gg: t.gs - t.ga
  })).sort((a, b) => b.dfsPts - a.dfsPts || b.gg - a.gg || b.gs - a.gs);
}

async function generateReport() {
  let globalPool = [];
  let highestWeek = 1;

  leagues.forEach(league => {
    const filePath = path.join(dataDir, league.file);
    if (fs.existsSync(filePath)) {
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const leagueMax = Math.max(...rawData.map(m => m.week || 1));
      if (leagueMax > highestWeek) highestWeek = leagueMax;

      const standings = computeStandings(rawData);
      standings.forEach(row => {
        globalPool.push({
          ...row,
          leagueName: league.name,
          code: league.code
        });
      });
    }
  });

  // Sort global pool by DFS points to get top global clubs
  globalPool.sort((a, b) => b.dfsPts - a.dfsPts || b.gg - a.gg);
  const top5 = globalPool.slice(0, 5);

  // Generate HTML Rows for Top 5 Table
  const tableRowsHtml = top5.map((row, idx) => `
    <tr>
      <td>${(idx + 1) < 10 ? '0' + (idx + 1) : (idx + 1)}</td>
      <td><strong>${row.team}</strong></td>
      <td>${row.code}</td>
      <td style="color:#2563EB; font-weight:900;">${row.dfsPts}</td>
      <td>${row.plPts}</td>
      <td>${row.gg > 0 ? '+' + row.gg : row.gg}</td>
    </tr>
  `).join('');

  // Assemble Complete Report HTML
  const reportHtml = `
<!-- DIPLOMAN FOOTBALL STATS - WEEKLY CROSS-LEAGUE INTELLIGENCE REPORT -->
<div id="dfs-weekly-report" style="max-width: 800px; margin: 0 auto; background: #FFFFFF; color: #0F172A; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; border: 1px solid #E2E8F0; border-top: 4px solid #2563EB; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05); box-sizing: border-box;">
  
  <style>
    #dfs-weekly-report * { box-sizing: border-box; }
    #dfs-weekly-report .report-header { background: #FFFFFF; padding: 24px 20px 16px 20px; text-align: left; border-bottom: 1px solid #E2E8F0; }
    #dfs-weekly-report .report-meta { font-size: 10px; font-weight: 800; color: #2563EB; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    #dfs-weekly-report .report-title { font-size: 1.35rem; font-weight: 900; color: #0F172A; text-transform: uppercase; letter-spacing: -0.5px; margin: 0 0 8px 0; line-height: 1.2; }
    #dfs-weekly-report .report-subtitle { font-size: 0.8rem; font-weight: 600; color: #64748B; margin: 0; }
    
    #dfs-weekly-report .report-body { padding: 24px 20px; }
    #dfs-weekly-report .analyst-note { background: #F8FAFC; border-left: 3px solid #2563EB; padding: 14px 16px; font-size: 0.85rem; line-height: 1.6; color: #334155; margin-bottom: 24px; border-radius: 0 6px 6px 0; }
    #dfs-weekly-report .analyst-note strong { color: #0F172A; }

    #dfs-weekly-report .section-heading { font-size: 0.95rem; font-weight: 900; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #0F172A; padding-bottom: 6px; margin: 24px 0 14px 0; display: flex; align-items: center; gap: 8px; }
    
    #dfs-weekly-report .table-wrapper { overflow-x: auto; margin-bottom: 20px; }
    #dfs-weekly-report table { width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left; }
    #dfs-weekly-report th { background: #F1F5F9; color: #0F172A; font-weight: 900; text-transform: uppercase; padding: 8px 10px; border-bottom: 2px solid #CBD5E1; }
    #dfs-weekly-report td { padding: 8px 10px; border-bottom: 1px solid #E2E8F0; color: #334155; font-weight: 700; }
    #dfs-weekly-report tr:hover td { background: #F8FAFC; }

    #dfs-weekly-report .report-footer-cta { text-align: center; background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 16px; border-radius: 6px; margin-top: 24px; }
    #dfs-weekly-report .report-footer-cta p { font-size: 0.75rem; color: #64748B; margin: 0 0 10px 0; font-weight: 700; }
    #dfs-weekly-report .cta-btn { display: inline-block; background: #2563EB; color: #FFFFFF; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; text-decoration: none; padding: 8px 16px; border-radius: 4px; letter-spacing: 0.5px; transition: background 0.2s; }
    #dfs-weekly-report .cta-btn:hover { background: #1D4ED8; }
  </style>

  <div class="report-header">
    <div class="report-meta">Matchday ${highestWeek} • Diploman Football Intelligence</div>
    <h1 class="report-title">Cross-League Tactical Breakdown & Title Race Review</h1>
    <p class="report-subtitle">Comprehensive analytics across all 8 elite tracked football jurisdictions.</p>
  </div>

  <div class="report-body">
    <div class="analyst-note">
      <strong>Analyst’s Touchline View:</strong> Matchday ${highestWeek} brought tactical shifts and intense momentum swings across our 8 tracked leagues. Our exclusive Half-by-Half (DFS) Index highlights elite second-half adjustments shaping the global power rankings.
    </div>

    <div class="section-heading">
      <span>📊</span> Global Power Rankings Snapshot (Top 5 Clubs)
    </div>
    
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Pos</th>
            <th>Club</th>
            <th>League</th>
            <th>DFS Pts</th>
            <th>STD Pts</th>
            <th>GD</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>

    <div class="report-footer-cta">
      <p>Explore full interactive tables, historical match logs, and granular half-by-half breakdowns across all 8 leagues.</p>
      <a href="https://diplomanfootballstats.blogspot.com/" class="cta-btn" target="_top">Access Live Stats Hub</a>
    </div>
  </div>
</div>
  `.trim();

  const outputPath = path.join(outputDir, `weekly-report-matchday-${highestWeek}.html`);
  fs.writeFileSync(outputPath, reportHtml, 'utf8');
  console.log(`Successfully generated weekly report at: ${outputPath}`);
}

generateReport();
