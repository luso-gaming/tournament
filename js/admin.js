import { supabase } from "/js/supabase.js";

/*CHECK ADMIN */
async function checkAdmin() {
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (!session || sessionError) {
    window.location.href = "/login.html";
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile) {
    window.location.href = "/";
    return;
  }

  if (profile.role !== "admin") {
    window.location.href = "/";
    return;
  }

  document.getElementById("adminEmail").innerText = profile.email;

  loadTournaments();
}

/*  LOAD TOURNAMENTS */
async function loadTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const container = document.getElementById("tournamentsContainer");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No tournaments found</p>";
    return;
  }

  data.forEach(t => {
    const div = document.createElement("div");
    div.className = "tournament";
    div.innerHTML = `
      <div class="details title"> <strong>${t.title}</strong></div>
      <div class="details id">Room ID: ${t.room_id} </div>
      <div class="details pass">Room Password: ${t.room_password || "N/A"}</div>
      <div class="details time">${t.start_date} ${t.start_time}</div>
      <div class="details status">Status: ${t.status}</div>
      <div class="details type">Type: ${t.type}</div>
      <button class="edit edit-btn" data-id="${t.id}">Edit All</button>
      <button class="edit edit-room-btn" data-id="${t.id}">Edit IDP</button>
      <button class="edit edit-status-btn" data-id="${t.id}">Edit Status</button>
      <button class="edit delete-btn" data-id="${t.id}">Delete</button>
    `;
    container.appendChild(div);
  });

  attachAdminActions();
}

function attachAdminActions() {
  // DELETE
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("Are you sure you want to delete this tournament?")) return;

      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", id);

      if (error) alert(error.message);
      else {
        alert("Tournament deleted");
        loadTournaments();
      }
    });
  });

  // EDIT ALL (existing)
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const title = prompt("Enter new title:");
      if (!title) return;
      const description = prompt("Enter description:");
      const type = prompt("Type (elite / pro / legend):", "elite");
      const status = prompt("Status (upcoming / live / completed):", "upcoming");
      const start_date = prompt("Start date (YYYY-MM-DD):");
      const start_time = prompt("Start time (HH:MM):");

      const { error } = await supabase
        .from("tournaments")
        .update({ title, description, type, status, start_date, start_time })
        .eq("id", id);

      if (error) alert(error.message);
      else {
        alert("Tournament updated");
        loadTournaments();
      }
    });
  });

    // EDIT ROOM ID & PASSWORD
  document.querySelectorAll(".edit-room-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
  
      const newRoomID = prompt("Enter new Room ID:");
      if (!newRoomID) return;
  
      const newRoomPass = prompt("Enter new Room Password:");
      if (!newRoomPass) return;
  
      const { error } = await supabase
        .from("tournaments")
        .update({ room_id: newRoomID, room_password: newRoomPass })
        .eq("id", id);
  
      if (error) alert(error.message);
      else {
        alert("Room ID & Password updated");
        loadTournaments();
      }
    });
  });
  
  // EDIT STATUS ONLY
  document.querySelectorAll(".edit-status-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const newStatus = prompt("Enter new status (upcoming / live / completed):");
      if (!newStatus) return;
    
      // 1. Update status
      const { error } = await supabase
        .from("tournaments")
        .update({ status: newStatus })
        .eq("id", id);
    
      if (error) {
        alert(error.message);
        return;
      }
    
      // 2. If completed → initialize results
      if (newStatus === "completed") {
        const { error: rpcError } = await supabase.rpc("finalize_tournament", {
          p_tournament_id: id
        });
      
        if (rpcError) {
          console.error(rpcError);
          alert("Error initializing results");
          return;
        }
      }
    
      alert("Status updated");
      loadTournaments();
    });
  });
  
}


/*  CREATE TOURNAMENT */
document
  .getElementById("tournamentForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      alert("Not logged in");
      return;
    }

    const tournament = {
      title: form.title.value,                
      description: form.description.value,
      type: form.type.value,
      status: form.status.value,
      start_date: form.start_date.value,      
      start_time: form.start_time.value,       
      created_by: session.user.id            
    };

    const { error } = await supabase
      .from("tournaments")
      .insert([tournament]);

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      alert("Tournament Created");
      form.reset();
      loadTournaments();
    }
  });
 
/*  LOGOUT */
document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  });

checkAdmin();
/* ================= NAVIGATION ================= */
document.addEventListener("DOMContentLoaded", () => {

  const createSection = document.getElementById("createSection");
  const resultSection = document.getElementById("resultSection");
  const seasonSection = document.getElementById("seasonSection");

  const navCreate = document.getElementById("navCreate");
  const navResults = document.getElementById("navResults");
  const navSeason = document.getElementById("navSeason");

  if (!navCreate || !navResults || !navSeason) return;

  function setActive(nav) {
    navCreate.classList.remove("active");
    navResults.classList.remove("active");
    navSeason.classList.remove("active");

    nav.classList.add("active");
  }

  // Default
  createSection.style.display = "block";
  resultSection.style.display = "none";
  seasonSection.style.display = "none";

  setActive(navCreate);

  navCreate.addEventListener("click", () => {
    createSection.style.display = "block";
    resultSection.style.display = "none";
    seasonSection.style.display = "none";

    setActive(navCreate);
  });

  navResults.addEventListener("click", () => {
    createSection.style.display = "none";
    resultSection.style.display = "block";
    seasonSection.style.display = "none";

    setActive(navResults);
    setTodayDate();
  });

  navSeason.addEventListener("click", () => {
    createSection.style.display = "none";
    resultSection.style.display = "none";
    seasonSection.style.display = "block";

    setActive(navSeason);
    loadSeasonData();
  });

});

/* ================= BGMI POINT SYSTEM ================= */

const placementPoints = {
  1: 10,
  2: 8,
  3: 6,
  4: 4,
  5: 2,
  6: 1,
  7: 1,
  8: 1,
  9: 1,
  10: 1
};


/* ================= DATE SET ================= */

function setTodayDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("resultDate").value = today;
  loadResultTournamentsByDate(today);
}


/* ================= LOAD TOURNAMENTS BY DATE ================= */

async function loadResultTournamentsByDate(date) {

  const { data, error } = await supabase
    .from("tournaments")
    .select("id, title")
    .eq("status", "completed")
    .eq("start_date", date);

  const select = document.getElementById("resultTournamentSelect");
  select.innerHTML = "";

  if (error || !data || data.length === 0) {
    select.innerHTML = `<option>No tournaments</option>`;
    document.querySelector("#resultTable tbody").innerHTML = "";
    return;
  }

  data.forEach(t => {
    const option = document.createElement("option");
    option.value = t.id;
    option.textContent = t.title;
    select.appendChild(option);
  });

  loadMatchResults(data[0].id);
}


/* ================= LOAD MATCH RESULTS ================= */

async function loadMatchResults(tournamentId) {

  const { data, error } = await supabase
    .from("match_results")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("slot_number", { ascending: true });

  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  if (error || !data) return;

  data.forEach(player => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${player.slot_number}</td>
      <td>${player.team_name}</td>
      <td>${player.in_game_name}</td>
      <td><input type="number" class="kills" value="${player.kills || 0}"></td>
      <td><input type="number" class="placement" value="${player.placement || 0}"></td>
      <td class="total">0</td>
    `;

    tbody.appendChild(row);

    const killsInput = row.querySelector(".kills");
    const placementInput = row.querySelector(".placement");
    const totalCell = row.querySelector(".total");

    function updateTotal() {
      const kills = parseInt(killsInput.value) || 0;
      const place = parseInt(placementInput.value) || 0;
      const placePoints = placementPoints[place] || 0;

      totalCell.innerText = kills + placePoints;
    }

    killsInput.addEventListener("input", updateTotal);
    placementInput.addEventListener("input", updateTotal);

    updateTotal();
  });

}


/* ================= DATE CHANGE ================= */

document
  .getElementById("resultDate")
  ?.addEventListener("change", (e) => {
    loadResultTournamentsByDate(e.target.value);
  });


/* ================= TOURNAMENT CHANGE ================= */

document
  .getElementById("resultTournamentSelect")
  ?.addEventListener("change", (e) => {
    loadMatchResults(e.target.value);
  });


/* ================= SAVE RESULTS ================= */

document
  .getElementById("saveResultsBtn")
  ?.addEventListener("click", async () => {

    const tournamentId = document.getElementById("resultTournamentSelect").value;
    const rows = document.querySelectorAll("#resultTable tbody tr");

    for (let row of rows) {

      const slot = row.children[0].innerText;
      const kills = parseInt(row.querySelector(".kills").value) || 0;
      const placement = parseInt(row.querySelector(".placement").value) || 0;

      const total_points = kills + (placementPoints[placement] || 0);

      await supabase
        .from("match_results")
        .update({
          kills,
          placement,
          total_points
        })
        .eq("tournament_id", tournamentId)
        .eq("slot_number", slot);
    }

    alert("Results Saved ✅");
  });






// season section
async function loadSeasonData() {

  // Update status automatically
  await supabase.rpc("update_season_status");

  /* CURRENT SEASON */
  const { data: current } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "current")
    .single();

  document.getElementById("currentSeason").innerText =
    current
      ? `${current.name} (${current.season_code}) [${current.start_date} → ${current.end_date}]`
      : "No active season";

  /* UPCOMING SEASONS */
  const { data: upcoming } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "upcoming");

  const select = document.getElementById("upcomingSeasonSelect");
  select.innerHTML = "";

  if (!upcoming || upcoming.length === 0) {
    select.innerHTML = `<option>No upcoming seasons</option>`;
    return;
  }

  upcoming.forEach(s => {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.name;
    select.appendChild(option);
  });
}

document.getElementById("createSeasonBtn")?.addEventListener("click", async () => {

  const name = document.getElementById("seasonName").value;
  const code = document.getElementById("seasonCode").value;
  const start = document.getElementById("seasonStart").value;
  const end = document.getElementById("seasonEnd").value;

  if (!name || !code || !start || !end) {
    alert("Fill all fields");
    return;
  }

  const { error } = await supabase
    .from("seasons")
    .insert([
      {
        name,
        season_code: code,
        start_date: start,
        end_date: end,
        status: "upcoming"
      }
    ]);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Season Created ✅");
  loadSeasonData();
});

document.getElementById("setUpcomingBtn")?.addEventListener("click", async () => {

  const seasonId = document.getElementById("upcomingSeasonSelect").value;

  if (!seasonId) return;

  // Set all upcoming to past (safety)
  await supabase
    .from("seasons")
    .update({ status: "past" })
    .eq("status", "upcoming");

  // Set selected as upcoming
  const { error } = await supabase
    .from("seasons")
    .update({ status: "upcoming" })
    .eq("id", seasonId);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Upcoming season updated ✅");
  loadSeasonData();
});
