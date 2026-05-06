import { supabase } from "/js/supabase.js";

let currentMode = "season";
let currentTypeFilter = "all";   // NEW: all | elite | pro | legend
let leaderboardData = [];        // full sorted data for current mode+filter
let timerInterval;

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  setupToggle();
  setupTypeFilters();   // NEW
  loadSeasonLeaderboard();
  loadSeasonInfoBox();
});

/* ================= SEASON / WEEKLY TOGGLE ================= */
function setupToggle() {
  const toggle  = document.getElementById("leaderboardToggle");
  const buttons = toggle.querySelectorAll("button");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      if (btn.dataset.mode === "weekly") {
        toggle.classList.add("total-active");
      } else {
        toggle.classList.remove("total-active");
      }

      currentMode = btn.dataset.mode;

      if (currentMode === "season") {
        document.getElementById("leaderboardTitle").textContent = "Season Leaderboard";
        loadSeasonLeaderboard();
        loadSeasonInfoBox();
      } else {
        document.getElementById("leaderboardTitle").textContent = "Weekly Leaderboard";
        loadWeeklyLeaderboard();
        startWeeklyTimer();
      }
    });
  });
}

/* ================= TYPE FILTER CHIPS ================= */
function setupTypeFilters() {
  const chips = document.querySelectorAll(".filter-chip");

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      currentTypeFilter = chip.dataset.type;

      // Reload with new filter
      if (currentMode === "season") {
        loadSeasonLeaderboard();
      } else {
        loadWeeklyLeaderboard();
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

  if (!season) {
    renderLeaderboard([]);
    return;
  }

  // Build tournament query with optional type filter
  let tourneyQuery = supabase
    .from("tournaments")
    .select("id, type")
    .eq("season_id", season.id);

  if (currentTypeFilter !== "all") {
    tourneyQuery = tourneyQuery.eq("type", currentTypeFilter);
  }

  const { data: tournaments } = await tourneyQuery;
  const ids = tournaments?.map(t => t.id) || [];

  if (ids.length === 0) {
    renderLeaderboard([]);
    return;
  }

  const { data: results } = await supabase
    .from("match_results")
    .select("team_name, kills, total_points")
    .in("tournament_id", ids);

  buildLeaderboard(results || []);
}

/* ================= WEEKLY LEADERBOARD ================= */
async function loadWeeklyLeaderboard() {
  showLeaderboardSkeleton();

  const { start, end } = getISTWeekRange();

  // Build tournament query with optional type filter
  let tourneyQuery = supabase
    .from("tournaments")
    .select("id, type")
    .gte("start_date", start)
    .lte("start_date", end);

  if (currentTypeFilter !== "all") {
    tourneyQuery = tourneyQuery.eq("type", currentTypeFilter);
  }

  const { data: tournaments } = await tourneyQuery;
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
      map[r.team_name] = { team: r.team_name, kills: 0, points: 0 };
    }
    map[r.team_name].kills  += r.kills || 0;
    map[r.team_name].points += r.total_points || 0;
  });

  leaderboardData = Object.values(map).sort((a, b) => b.points - a.points);

  const top50 = leaderboardData.slice(0, 50);

  // Update count label
  const countEl = document.getElementById("lbCount");
  if (countEl) {
    countEl.textContent = `Top ${top50.length} teams`;
  }

  renderLeaderboard(top50);
  showUserRank(leaderboardData);
}

/* ================= RENDER ================= */
function renderLeaderboard(data) {
  const container = document.getElementById("leaderboardContainer");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    const empty = document.createElement("div");
    empty.className = "lb-empty";
    const p = document.createElement("p");
    p.textContent = "No data available for this filter";
    empty.appendChild(p);
    container.appendChild(empty);
    return;
  }

  data.forEach((team, index) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.style.animationDelay = `${index * 30}ms`;

    // rank class for top 3
    if (index === 0) row.classList.add("rank-1");
    if (index === 1) row.classList.add("rank-2");
    if (index === 2) row.classList.add("rank-3");

    // Rank cell
    const rankSpan = document.createElement("span");
    rankSpan.className = "rank";
    const medals = ["🥇","🥈","🥉"];
    rankSpan.textContent = index < 3 ? medals[index] : `#${index + 1}`;
    row.appendChild(rankSpan);

    // Team cell
    const teamCol = document.createElement("span");
    teamCol.className = "team-col";

    const teamName = document.createElement("span");
    teamName.className = "team-name";
    teamName.textContent = team.team;
    teamCol.appendChild(teamName);
    row.appendChild(teamCol);

    // Kills
    const killsSpan = document.createElement("span");
    killsSpan.className = "kills";
    killsSpan.textContent = team.kills;
    row.appendChild(killsSpan);

    // Points
    const ptsSpan = document.createElement("span");
    ptsSpan.className = "totalPoint";
    ptsSpan.textContent = team.points + " pts";
    row.appendChild(ptsSpan);

    container.appendChild(row);
  });
}

/* ================= SEARCH ================= */
window.searchLeaderboard = function () {
  const input    = document.getElementById("leaderboardSearch").value.toUpperCase();
  const filtered = leaderboardData.filter(team =>
    team.team.toUpperCase().includes(input)
  );
  renderLeaderboard(filtered);
};

/* ================= SEASON INFO BOX ================= */
async function loadSeasonInfoBox() {
  clearInterval(timerInterval);

  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "current")
    .single();

  const infoEl = document.getElementById("infoText");

  if (error || !data) {
    infoEl.textContent = "No active season";
    return;
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  // Use textContent-safe approach
  infoEl.innerHTML = "";

  const title = document.createElement("span");
  title.className = "season-title";
  title.textContent = data.name;

  const dates = document.createElement("span");
  dates.className = "season-dates";
  dates.textContent = `${formatDate(data.start_date)} → ${formatDate(data.end_date)}`;

  infoEl.appendChild(title);
  infoEl.appendChild(document.createElement("br"));
  infoEl.appendChild(dates);
}

/* ================= WEEKLY TIMER ================= */
function startWeeklyTimer() {
  clearInterval(timerInterval);
  let hasReset = false;

  function getNextResetTime() {
    const now    = new Date();
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const resetHour = 5, resetMinute = 30;

    let daysUntilMonday = (8 - istNow.getDay()) % 7;

    if (
      daysUntilMonday === 0 &&
      (istNow.getHours() > resetHour ||
        (istNow.getHours() === resetHour && istNow.getMinutes() >= resetMinute))
    ) {
      daysUntilMonday = 7;
    }

    const nextReset = new Date(istNow);
    nextReset.setDate(istNow.getDate() + daysUntilMonday);
    nextReset.setHours(resetHour, resetMinute, 0, 0);
    return nextReset;
  }

  function updateTimer() {
    const diff     = getNextResetTime() - new Date();
    const infoEl   = document.getElementById("infoText");

    if (diff <= 0 && !hasReset) {
      hasReset = true;
      loadWeeklyLeaderboard();
      return;
    }

    const d = Math.floor(diff / (1000*60*60*24));
    const h = Math.floor((diff / (1000*60*60)) % 24);
    const m = Math.floor((diff / (1000*60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    let timeText = d > 1 ? `${d} days` : d === 1 ? `1 day ${h}h` : `${h}h ${m}m ${s}s`;

    infoEl.innerHTML = "";

    const label = document.createElement("span");
    label.className   = "reset-title";
    label.textContent = "Reset In";

    const time = document.createElement("span");
    time.className   = "reset-time";
    time.textContent = timeText;

    infoEl.appendChild(label);
    infoEl.appendChild(document.createElement("br"));
    infoEl.appendChild(time);
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

/* ================= USER RANK ================= */
async function showUserRank(fullData) {
  const rankEl    = document.getElementById("userRankText");
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    rankEl.textContent = "Login to see your rank";
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_name")
    .eq("id", user.id)
    .single();

  if (!profile?.team_name) {
    rankEl.textContent = "No team found";
    return;
  }

  const index = fullData.findIndex(t => t.team === profile.team_name);

  if (index === -1) {
    rankEl.textContent = currentMode === "weekly" ? "No participation this week" : "Unranked";
    return;
  }

  const rank = index + 1;
  if (rank > 10000) {
    rankEl.textContent = "Unranked";
  } else if (rank <= 1000) {
    rankEl.textContent = `#${rank}`;
  } else {
    const percent = Math.floor(rank / 1000);
    rankEl.textContent = `Top ${percent}%`;
  }
}

/* ================= SKELETON ================= */
function showLeaderboardSkeleton(rows = 10) {
  const container = document.getElementById("leaderboardContainer");
  if (!container) return;
  container.innerHTML = "";

  for (let i = 0; i < rows; i++) {
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.style.animationDelay = `${i * 30}ms`;

    ["sk-rank","sk-team","sk-small","sk-small"].forEach(cls => {
      const span = document.createElement("span");
      span.className = `skeleton ${cls}`;
      row.appendChild(span);
    });

    container.appendChild(row);
  }
}

/* ================= IST WEEK RANGE ================= */
function getISTWeekRange() {
  const now       = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow    = new Date(now.getTime() + istOffset);

  const resetHour = 5, resetMinute = 30;

  if (
    istNow.getHours() < resetHour ||
    (istNow.getHours() === resetHour && istNow.getMinutes() < resetMinute)
  ) {
    istNow.setDate(istNow.getDate() - 1);
  }

  const day  = istNow.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(istNow);
  monday.setDate(istNow.getDate() + diff);
  monday.setHours(resetHour, resetMinute, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  sunday.setHours(5, 29, 59, 999);

  const startUTC = new Date(monday.getTime() - istOffset);
  const endUTC   = new Date(sunday.getTime() - istOffset);

  return { start: startUTC.toISOString(), end: endUTC.toISOString() };
}