import { supabase } from "/js/supabase.js";

/* GET TOURNAMENT ID */
function getTournamentId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || localStorage.getItem("lastTournament");
}

/* LOAD RESULTS */
async function loadResults() {
  const tournamentId = getTournamentId();

  if (!tournamentId) {
    showNoSelection();
    return;
  }

  console.log("Loading result for:", tournamentId);

  // Try cache first
  const cached = localStorage.getItem("result_" + tournamentId);

  if (cached) {
    renderTable(JSON.parse(cached));
  }

  // Fetch fresh data
  const { data, error } = await supabase
    .from("match_results")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("total_points", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    document.getElementById("noTournamentMessage").style.display = "none";
    document.getElementById("resultContainer").style.display = "block";
  
    renderTable([]);
    return;
  }

  // Save cache
  localStorage.setItem("result_" + tournamentId, JSON.stringify(data));
  
  window.teamsData = data;

  renderTable(data);
}

/* RENDER TABLE */
function renderTable(data) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  document.getElementById("noTournamentMessage").style.display = "none";
  document.getElementById("resultContainer").style.display = "block";

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:20px;">
          Results not available yet
        </td>
      </tr>
    `;
    return;
  }

  data.forEach((player, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.team_name}</td>
      <td>${player.in_game_name}</td>
      <td>${player.kills || 0}</td>
      <td>${player.placement || 0}</td>
      <td>${player.total_points || 0}</td>
    `;

    tbody.appendChild(row);
  });
}


/* ================= FILTER SEARCH ================= */
function filterTeams() {
  const input = document
    .getElementById("teamSearchInput")
    .value
    .trim()
    .toUpperCase();

  if (!input) {
    renderTable(window.teamsData || []);
    return;
  }

  const filtered = (window.teamsData || []).filter(team => {
    const teamName = team.team_name?.toUpperCase() || "";
    const ign = team.in_game_name?.toUpperCase() || "";
    return teamName.includes(input) || ign.includes(input);
  });

  renderTable(filtered);
}

function showNoSelection() {
  document.getElementById("noTournamentMessage").style.display = "block";
  document.getElementById("resultContainer").style.display = "none";

  const btn = document.getElementById("goBackBtn");

  if (btn) {
    btn.addEventListener("click", () => {
      window.location.href = "/join.html";
    });
  }
}

/* RUN */
loadResults();