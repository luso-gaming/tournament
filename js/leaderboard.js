import { supabase } from "/js/supabase.js";

let currentMode = "season";
let leaderboardData = [];
let timerInterval; // 🔥 control timer

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  setupToggle();
  loadSeasonLeaderboard();
  loadSeasonInfoBox(); // ✅ default info
});

/* ================= TOGGLE ================= */

function setupToggle() {
  const toggle = document.getElementById("leaderboardToggle");
  const buttons = toggle.querySelectorAll("button");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {

      // Remove active from all
      buttons.forEach(b => b.classList.remove("active"));

      // Add active to clicked
      btn.classList.add("active");

      // 🔥 MOVE SLIDER
      if (btn.dataset.mode === "weekly") {
        toggle.classList.add("total-active");
      } else {
        toggle.classList.remove("total-active");
      }

      // 🔄 LOAD DATA
      currentMode = btn.dataset.mode;

      if (currentMode === "season") {
        document.getElementById("leaderboardTitle").innerText = "Season Leaderboard";
        loadSeasonLeaderboard();
        loadSeasonInfoBox(); // ✅ show season info
      } else {
        document.getElementById("leaderboardTitle").innerText = "Weekly Leaderboard";
        loadWeeklyLeaderboard();
        startWeeklyTimer(); // ✅ show timer
      }
    });
  });
}

/* ================= SEASON LEADERBOARD ================= */

async function loadSeasonLeaderboard() {

  showLeaderboardSkeleton();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "current")
    .single();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id")
    .eq("season_id", season.id);

  const ids = tournaments.map(t => t.id);
  if (ids.length === 0) return;

  const { data: results } = await supabase
    .from("match_results")
    .select("*")
    .in("tournament_id", ids);
  
  buildLeaderboard(results);
}

/* ================= WEEKLY LEADERBOARD ================= */

async function loadWeeklyLeaderboard() {

  showLeaderboardSkeleton();

  const now = new Date();
  
  // Clone date (IMPORTANT)
  const monday = new Date(now);
  const day = monday.getDay();
  
  // Fix Sunday issue
  const diff = day === 0 ? -6 : 1 - day;
  
  monday.setDate(monday.getDate() + diff);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  // Format
  const start = monday.toISOString().split("T")[0];
  const end = sunday.toISOString().split("T")[0];

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id")
    .gte("start_date", start)
    .lte("start_date", end);

  const ids = tournaments.map(t => t.id);
  if (ids.length === 0) {
    renderLeaderboard([]);
    return;
  }

  const { data: results } = await supabase
    .from("match_results")
    .select("*")
    .in("tournament_id", ids);

  if (!results || results.length === 0) {
    renderLeaderboard([]);
    return;
  }
  buildLeaderboard(results);
}

/* ================= BUILD LEADERBOARD ================= */

function buildLeaderboard(results) {

  const map = {};

  results.forEach(r => {

    if (!map[r.team_name]) {
      map[r.team_name] = {
        team: r.team_name,
        kills: 0,
        points: 0
      };
    }

    map[r.team_name].kills += r.kills || 0;
    map[r.team_name].points += r.total_points || 0;
  });

  leaderboardData = Object.values(map);
  leaderboardData.sort((a, b) => b.points - a.points);

  const top50 = leaderboardData.slice(0, 50);
  renderLeaderboard(top50);
  showUserRank(leaderboardData); // 🔥 NEW
}

/* ================= RENDER ================= */

function renderLeaderboard(data) {

  const container = document.querySelector(".leaderboard");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>No data available</p>";
    return;
  }

  data.forEach((team, index) => {

    const div = document.createElement("div");
    div.className = "leaderboard-row";

    div.innerHTML = `
      <span class="rank">#${index + 1}</span>
      <span class="team">${team.team}</span>
      <span class="kills">${team.kills}</span>
      <span class="totalPoint">${team.points} pts</span>
    `;

    container.appendChild(div);
  });
}

/* ================= SEARCH ================= */

window.searchLeaderboard = function () {

  const input = document.getElementById("leaderboardSearch").value.toUpperCase();

  const filtered = leaderboardData.filter(team =>
    team.team.toUpperCase().includes(input)
  );

  renderLeaderboard(filtered);
};

/* ================= INFO BOX ================= */

/* 🟦 SEASON INFO */
async function loadSeasonInfoBox() {

  clearInterval(timerInterval);

  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "current")
    .single();

  if (error || !data) {
    document.getElementById("infoText").innerText = "No active season";
    return;
  }

  document.getElementById("infoText").innerText =
    `${data.name} (${data.start_date} → ${data.end_date})`;
}

/* 🟨 WEEKLY TIMER */
function startWeeklyTimer() {

  clearInterval(timerInterval);

  function updateTimer() {

    const now = new Date();

    const day = now.getDay();
    const daysUntilReset = (8 - day) % 7;

    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilReset);
    nextMonday.setHours(0, 0, 0, 0);

    const diff = nextMonday - now;

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    document.getElementById("infoText").innerText =
      `Weekly reset in: ${d}d ${h}h ${m}m ${s}s`;
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}



async function showUserRank(fullData) {

  const rankEl = document.getElementById("userRankText");

  // 🔐 Check login
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    rankEl.innerText = "Login to see your rank";
    return;
  }

  // 🧠 Get user's team name
  const { data: profile } = await supabase
    .from("profiles") // ⚠️ change if needed
    .select("team_name")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.team_name) {
    rankEl.innerText = "No team found";
    return;
  }

  // 🔍 Find rank
  const index = fullData.findIndex(
    t => t.team === profile.team_name
  );

  if (index === -1) {
    rankEl.innerText = "Unranked";
    return;
  }

  const rank = index + 1;

  // 🚫 Limit to 10,000
  if (rank > 10000) {
    rankEl.innerText = "Unranked";
    return;
  }
if (rank <= 1000) {
  rankEl.innerText = `Your Rank: #${rank}`;
} else {
  const percent = Math.floor(rank / 1000); // 1434 → 1%, 3245 → 3%
  rankEl.innerText = `Your Rank: ${percent}%`;
}
}


function showLeaderboardSkeleton(rows = 10) {
  const container = document.querySelector(".leaderboard");

  if (!container) {
    console.error("❌ .leaderboard not found");
    return;
  }

  container.innerHTML = "";

  for (let i = 0; i < rows; i++) {
    const div = document.createElement("div");
    div.className = "leaderboard-row";

    div.innerHTML = `
      <span class="skeleton sk-rank"></span>
      <span class="skeleton sk-team"></span>
      <span class="skeleton sk-small"></span>
      <span class="skeleton sk-small"></span>
    `;

    container.appendChild(div);
  }

  // 🧠 Your rank box skeleton
  const rankBox = document.getElementById("yourRank");
  if (rankBox) {
    rankBox.innerHTML = `<div class="skeleton sk-rank-box"></div>`;
  }
}
