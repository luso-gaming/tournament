import { supabase } from "/js/supabase.js";

let currentMode = "season";
let currentTypeFilter = "all";
let leaderboardData = [];
let timerInterval;

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  setupToggle();
  setupTypeFilters();
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

  // FIX: also fetch user_id so we can resolve current team names
  const { data: results } = await supabase
    .from("match_results")
    .select("user_id, team_name, kills, total_points")
    .in("tournament_id", ids);

  const resolvedResults = await resolveTeamNames(results || []);
  buildLeaderboard(resolvedResults);
}

/* ================= WEEKLY LEADERBOARD ================= */
async function loadWeeklyLeaderboard() {
  showLeaderboardSkeleton();

  // FIX: use the corrected IST week range
  const { start, end } = getISTWeekRange();

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

  // FIX: also fetch user_id so we can resolve current team names
  const { data: results } = await supabase
    .from("match_results")
    .select("user_id, team_name, kills, total_points")
    .in("tournament_id", ids);

  if (!results || results.length === 0) {
    renderLeaderboard([]);
    return;
  }

  const resolvedResults = await resolveTeamNames(results);
  buildLeaderboard(resolvedResults);
}

/* ================= RESOLVE CURRENT TEAM NAMES ================= */
// FIX: Look up the latest team_name from profiles using user_id.
// Falls back to the stored team_name if user_id is missing or profile not found.
async function resolveTeamNames(results) {
  // Collect unique user_ids that exist
  const userIds = [...new Set(results.map(r => r.user_id).filter(Boolean))];

  if (userIds.length === 0) return results; // no user_ids stored, use old names as-is

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, team_name")
    .in("id", userIds);

  if (!profiles || profiles.length === 0) return results;

  const profileMap = {};
  profiles.forEach(p => { profileMap[p.id] = p.team_name; });

  return results.map(r => ({
    ...r,
    // Use current team_name from profile if available, otherwise keep stored name
    team_name: (r.user_id && profileMap[r.user_id]) ? profileMap[r.user_id] : r.team_name
  }));
}

/* ================= BUILD LEADERBOARD ================= */
function buildLeaderboard(results) {
  const map = {};

  results.forEach(r => {
    const key = r.team_name;
    if (!map[key]) {
      map[key] = { team: key, kills: 0, points: 0 };
    }
    map[key].kills  += r.kills || 0;
    map[key].points += r.total_points || 0;
  });

  leaderboardData = Object.values(map).sort((a, b) => b.points - a.points);
  const top50 = leaderboardData.slice(0, 50);

  const countEl = document.getElementById("lbCount");
  if (countEl) countEl.textContent = `Top ${top50.length} teams`;

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

    if (index === 0) row.classList.add("rank-1");
    if (index === 1) row.classList.add("rank-2");
    if (index === 2) row.classList.add("rank-3");

    const rankSpan = document.createElement("span");
    rankSpan.className = "rank";
    const medals = ["🥇","🥈","🥉"];
    rankSpan.textContent = index < 3 ? medals[index] : `#${index + 1}`;
    row.appendChild(rankSpan);

    const teamCol = document.createElement("span");
    teamCol.className = "team-col";
    const teamName = document.createElement("span");
    teamName.className = "team-name";
    teamName.textContent = team.team;
    teamCol.appendChild(teamName);
    row.appendChild(teamCol);

    const killsSpan = document.createElement("span");
    killsSpan.className = "kills";
    killsSpan.textContent = team.kills;
    row.appendChild(killsSpan);

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
    const diff   = getNextResetTime() - new Date();
    const infoEl = document.getElementById("infoText");

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
  const rankEl = document.getElementById("userRankText");
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

  // FIX: compare against the already-resolved current team names in fullData
  const index = fullData.findIndex(
    t => t.team.toLowerCase() === profile.team_name.toLowerCase()
  );

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
// FIX: Rewritten to correctly compute the current IST week boundaries in UTC
function getISTWeekRange() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const RESET_HOUR = 5, RESET_MINUTE = 30;

  // Current time in IST
  const nowUTC = new Date();
  const istNow = new Date(nowUTC.getTime() + IST_OFFSET_MS);

  // If before 5:30 AM IST, treat as previous day (week hasn't reset yet)
  const resetMinutesOfDay = RESET_HOUR * 60 + RESET_MINUTE;
  const istMinutesOfDay   = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();

  if (istMinutesOfDay < resetMinutesOfDay) {
    istNow.setUTCDate(istNow.getUTCDate() - 1);
  }

  // Find Monday of the current IST week
  const dayOfWeek = istNow.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Monday at 05:30 IST = Monday at 00:00 UTC
  const monday = new Date(istNow);
  monday.setUTCDate(istNow.getUTCDate() - daysFromMonday);
  monday.setUTCHours(RESET_HOUR, RESET_MINUTE, 0, 0);

  // Convert to UTC: subtract IST offset
  const startUTC = new Date(monday.getTime() - IST_OFFSET_MS);

  // Sunday at 05:29:59.999 IST = next Monday at 05:30 IST minus 1ms
  const endUTC = new Date(startUTC.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  return { start: startUTC.toISOString(), end: endUTC.toISOString() };
}