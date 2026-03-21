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
  

  showSkeletonLoader();


  console.log("Loading result for:", tournamentId);

  const cached = localStorage.getItem("result_" + tournamentId);
  let finalData = null;

  // ✅ Use cache first
  if (cached) {
    finalData = JSON.parse(cached);
  }

  // ✅ Fetch fresh data
  const { data, error } = await supabase
    .from("match_results")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("total_points", { ascending: false });

  if (error) {
    console.error(error);
    
    // If API fails, fallback to cache
    if (finalData) {
      renderTable(finalData);
    }
    return;
  }

  if (!data || data.length === 0) {
    document.getElementById("noTournamentMessage").style.display = "none";
    document.getElementById("resultContainer").style.display = "block";
    renderTable([]);
    return;
  }

  // ✅ Update cache
  localStorage.setItem("result_" + tournamentId, JSON.stringify(data));
  window.teamsData = data;

  // ✅ Render ONLY ONCE
  renderTable(data);
}

/* RENDER TABLE */
async function renderTable(data) {
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

  // 🔐 Get logged-in user
  const { data: { user } } = await supabase.auth.getUser();

  let userTeam = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles") // ⚠️ change if needed
      .select("team_name")
      .eq("id", user.id)
      .single();

    userTeam = profile?.team_name || null;
  }

  data.forEach((player, index) => {
    const row = document.createElement("tr");

    // 🎯 Highlight user team
    if (userTeam && player.team_name === userTeam) {
      row.classList.add("highlight-row");
    }

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


function showSkeletonLoader(rows = 6) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  for (let i = 0; i < rows; i++) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><div class="skeleton sk-rank"></div></td>
      <td><div class="skeleton sk-name"></div></td>
      <td><div class="skeleton sk-name"></div></td>
      <td><div class="skeleton sk-small"></div></td>
      <td><div class="skeleton sk-small"></div></td>
      <td><div class="skeleton sk-small"></div></td>
    `;

    tbody.appendChild(row);
  }
}