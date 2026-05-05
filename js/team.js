import { supabase } from "/js/supabase.js";

/* GET TOURNAMENT ID */
function getTournamentId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || localStorage.getItem("lastTournament");
}

/* ── LOAD RESULTS ── */
async function loadResults() {
  const tournamentId = getTournamentId();

  if (!tournamentId) {
    showNoSelection();
    return;
  }

  showSkeletonLoader();

  console.log("Loading result for:", tournamentId);

  const cached = localStorage.getItem("result_" + tournamentId);
  let finalData = null;

  if (cached) {
    finalData = JSON.parse(cached);
  }

  const { data, error } = await supabase
    .from("match_results")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("total_points", { ascending: false });

  if (error) {
    console.error(error);
    if (finalData) renderTable(finalData);
    return;
  }

  if (!data || data.length === 0) {
    document.getElementById("noTournamentMessage").style.display = "none";
    document.getElementById("resultContainer").style.display = "block";
    renderTable([]);
    return;
  }

  localStorage.setItem("result_" + tournamentId, JSON.stringify(data));
  window.teamsData = data;

  renderTable(data);
}

/* ── POPULATE PODIUM ── */
function populatePodium(data) {
  const podiumSection = document.getElementById("podiumSection");

  if (!data || data.length < 1) {
    if (podiumSection) podiumSection.style.display = "none";
    return;
  }

  if (podiumSection) podiumSection.style.display = "block";

  const setSlot = (rank, player) => {
    const nameEl = document.getElementById(`p${rank}name`);
    const ignEl  = document.getElementById(`p${rank}ign`);
    const ptsEl  = document.getElementById(`p${rank}pts`);
    if (nameEl) nameEl.textContent = player ? player.team_name    || "—" : "—";
    if (ignEl)  ignEl.textContent  = player ? player.in_game_name || "—" : "—";
    if (ptsEl)  ptsEl.textContent  = player ? (player.total_points || 0) + " pts" : "—";
  };

  setSlot(1, data[0] || null);
  setSlot(2, data[1] || null);
  setSlot(3, data[2] || null);

  // Hide podium slots that don't exist
  if (!data[1]) document.getElementById("podium2")?.style.setProperty("display", "none");
  if (!data[2]) document.getElementById("podium3")?.style.setProperty("display", "none");
}

/* ── RENDER TABLE ── */
async function renderTable(data) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  document.getElementById("noTournamentMessage").style.display = "none";
  document.getElementById("resultContainer").style.display    = "block";

  if (!data || data.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.setAttribute("colspan", "6");
    cell.style.cssText = "text-align:center;padding:32px;color:var(--text-muted);font-size:14px;";
    cell.textContent = "Results not available yet";
    row.appendChild(cell);
    tbody.appendChild(row);

    // Hide podium
    const ps = document.getElementById("podiumSection");
    if (ps) ps.style.display = "none";
    return;
  }

  // Populate top-3 podium
  populatePodium(data);

  // Get logged-in user team for highlight
  const { data: { user } } = await supabase.auth.getUser();
  let userTeam = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_name")
      .eq("id", user.id)
      .single();
    userTeam = profile?.team_name || null;
  }

  data.forEach((player, index) => {
    const row = document.createElement("tr");

    // Stagger animation
    row.style.animationDelay = `${index * 35}ms`;

    if (userTeam && player.team_name === userTeam) {
      row.classList.add("highlight-row");
    }

    // Rank cell
    const rankTd = document.createElement("td");
    const medals = ["🥇","🥈","🥉"];
    rankTd.textContent = index < 3 ? medals[index] : index + 1;
    row.appendChild(rankTd);

    // Team name
    const teamTd = document.createElement("td");
    teamTd.textContent = player.team_name || "—";
    row.appendChild(teamTd);

    // IGN
    const ignTd = document.createElement("td");
    ignTd.textContent = player.in_game_name || "—";
    row.appendChild(ignTd);

    // Kills
    const killsTd = document.createElement("td");
    killsTd.textContent = player.kills || 0;
    row.appendChild(killsTd);

    // Placement
    const placeTd = document.createElement("td");
    placeTd.textContent = player.placement || 0;
    row.appendChild(placeTd);

    // Total
    const totalTd = document.createElement("td");
    totalTd.textContent = player.total_points || 0;
    row.appendChild(totalTd);

    tbody.appendChild(row);
  });
}

/* ── NO SELECTION ── */
function showNoSelection() {
  document.getElementById("noTournamentMessage").style.display = "flex";
  document.getElementById("resultContainer").style.display    = "none";

  const btn = document.getElementById("goBackBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      window.location.href = "/join.html";
    });
  }
}

/* ── SKELETON LOADER ── */
function showSkeletonLoader(rows = 8) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  // Hide podium while loading
  const ps = document.getElementById("podiumSection");
  if (ps) ps.style.display = "none";

  for (let i = 0; i < rows; i++) {
    const row = document.createElement("tr");
    row.style.animationDelay = `${i * 40}ms`;

    const cells = [
      "sk-rank", "sk-name", "sk-name", "sk-small", "sk-small", "sk-small"
    ];

    cells.forEach(cls => {
      const td  = document.createElement("td");
      const div = document.createElement("div");
      div.className = `skeleton ${cls}`;
      td.appendChild(div);
      row.appendChild(td);
    });

    tbody.appendChild(row);
  }
}

/* ── RUN ── */
loadResults();