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

  const ids = tournaments?.map(t => t.id) || [];
  if (ids.length === 0) {
    renderLeaderboard([]);
    return;
  }

  const { data: results } = await supabase
    .from("match_results")
    .select("team_name, kills, total_points")
    .in("tournament_id", ids);
  
  buildLeaderboard(results);
}

/* ================= WEEKLY LEADERBOARD ================= */

async function loadWeeklyLeaderboard() {

  showLeaderboardSkeleton();

  const { start, end } = getISTWeekRange();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id")
    .gte("start_date", start)
    .lte("start_date", end);

  const ids = tournaments?.map(t => t.id) || [];

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
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }
  document.getElementById("infoText").innerHTML = `
    <span class="season-title">${data.name}</span><br>
    <span class="season-dates">
      ${formatDate(data.start_date)} → ${formatDate(data.end_date)}
    </span>
  `;
}

/* 🟨 WEEKLY TIMER */
function startWeeklyTimer() {

  clearInterval(timerInterval);

  let hasReset = false; // ✅ ONLY HERE
  function getNextResetTime() {
  const now = new Date();

  // 🇮🇳 IST time
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const resetHour = 5;
  const resetMinute = 30;

  let nextReset = new Date(istNow);

  const day = istNow.getDay();

  let daysUntilMonday = (8 - day) % 7;

  // If today is Monday after 5:30 AM → next week
  if (
    daysUntilMonday === 0 &&
    (istNow.getHours() > resetHour ||
      (istNow.getHours() === resetHour && istNow.getMinutes() >= resetMinute))
  ) {
    daysUntilMonday = 7;
  }

  nextReset.setDate(istNow.getDate() + daysUntilMonday);
  nextReset.setHours(resetHour, resetMinute, 0, 0);

  return nextReset; // ✅ NO UTC CONVERSION
}

  function updateTimer() {
  const now = new Date();
  const nextReset = getNextResetTime();

  const diff = nextReset - now;

  if (diff <= 0 && !hasReset) {
    hasReset = true;
    loadWeeklyLeaderboard();
    return;
  }

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);

  let timeText = "";
  
  if (d > 1) {
    timeText = `${d} days`;
  } else if (d === 1) {
    timeText = `1 day ${h}h`;
  } else {
    timeText = `${h}h ${m}m ${s}s`;
  }
  
  document.getElementById("infoText").innerHTML = `
    <span class="reset-title">RESET IN</span><br>
    <span class="reset-time">${timeText}</span>
  `;
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



function getISTWeekRange() {

  const now = new Date();

  // 🇮🇳 Convert to IST (UTC + 5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  // 🔥 SHIFT DAY START TO 5:30 AM
  const resetHour = 5;
  const resetMinute = 30;

  if (
    istNow.getHours() < resetHour ||
    (istNow.getHours() === resetHour && istNow.getMinutes() < resetMinute)
  ) {
    istNow.setDate(istNow.getDate() - 1);
  }

  // 📅 Get Monday
  const day = istNow.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(istNow);
  monday.setDate(istNow.getDate() + diff);
  monday.setHours(resetHour, resetMinute, 0, 0);

  // 📅 Sunday
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  sunday.setHours(5, 29, 59, 999);;

  // 🔁 Convert back to UTC for Supabase
  const startUTC = new Date(monday.getTime() - istOffset);
  const endUTC = new Date(sunday.getTime() - istOffset);

  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString()
  };
}