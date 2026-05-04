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

  document.getElementById("adminEmail").textContent = profile.email;

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
    container.innerHTML = "<p style='color:var(--text-faint);font-size:13px;padding:12px;'>No tournaments found</p>";
    return;
  }

  data.forEach(t => {
    const div = document.createElement("div");
    div.className = "tournament";

    // Status badge color
    const statusColor = t.status === "live" ? "#4ade80" : t.status === "completed" ? "#9b9aa3" : "#DAFF02";

    div.innerHTML = `
      <div class="details title">${t.title}</div>
      <div class="details">📅 ${t.start_date} &nbsp;·&nbsp; ⏰ ${t.start_time}</div>
      <div class="details">🏷 ${t.type.toUpperCase()} &nbsp;·&nbsp; <span style="color:${statusColor};font-weight:600;">${t.status.toUpperCase()}</span></div>
      <div class="details">🔑 Room ID: <strong>${t.room_id || "—"}</strong> &nbsp; Pass: <strong>${t.room_password || "—"}</strong></div>
      <div class="tournament-actions">
        <button class="edit edit-btn" data-id="${t.id}">✏️ Edit All</button>
        <button class="edit edit-room-btn" data-id="${t.id}">🔑 Edit IDP</button>
        <button class="edit edit-status-btn" data-id="${t.id}">🔄 Status</button>
        <button class="edit delete-btn" data-id="${t.id}">🗑 Delete</button>
      </div>
    `;
    container.appendChild(div);
  });

  attachAdminActions();
}

/* ================= MODAL HELPERS ================= */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.style.display = "flex"; document.body.style.overflow = "hidden"; }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.style.display = "none"; document.body.style.overflow = ""; }
}

// Close on overlay click or X button
document.addEventListener("click", (e) => {
  // X buttons and cancel buttons with data-modal
  if (e.target.classList.contains("modal-close")) {
    const modalId = e.target.dataset.modal;
    if (modalId) closeModal(modalId);
  }
  // Click outside modal box
  if (e.target.classList.contains("modal-overlay")) {
    closeModal(e.target.id);
  }
});

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    ["modalEditAll","modalEditIDP","modalEditStatus"].forEach(closeModal);
  }
});

/* ================= MODAL SAVE HANDLERS ================= */

// SAVE EDIT ALL
document.getElementById("saveEditAll")?.addEventListener("click", async () => {
  const id    = document.getElementById("editAllId").value;
  const title = document.getElementById("editAllTitle").value.trim();
  if (!title) { alert("Tournament name is required"); return; }

  const { error } = await supabase
    .from("tournaments")
    .update({
      title,
      description: document.getElementById("editAllDesc").value,
      type:        document.getElementById("editAllType").value,
      status:      document.getElementById("editAllStatus").value,
      start_date:  document.getElementById("editAllDate").value,
      start_time:  document.getElementById("editAllTime").value,
    })
    .eq("id", id);

  if (error) { alert(error.message); return; }
  closeModal("modalEditAll");
  loadTournaments();
});

// SAVE EDIT IDP
document.getElementById("saveEditIDP")?.addEventListener("click", async () => {
  const id   = document.getElementById("editIDPId").value;
  const room = document.getElementById("editRoomID").value.trim();
  const pass = document.getElementById("editRoomPass").value.trim();
  if (!room || !pass) { alert("Both Room ID and Password are required"); return; }

  const { error } = await supabase
    .from("tournaments")
    .update({ room_id: room, room_password: pass })
    .eq("id", id);

  if (error) { alert(error.message); return; }
  closeModal("modalEditIDP");
  loadTournaments();
});

// SAVE EDIT STATUS
document.getElementById("saveEditStatus")?.addEventListener("click", async () => {
  const id        = document.getElementById("editStatusId").value;
  const selected  = document.querySelector('input[name="newStatus"]:checked');
  if (!selected)  { alert("Please select a status"); return; }
  const newStatus = selected.value;

  const { error } = await supabase
    .from("tournaments")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) { alert(error.message); return; }

  if (newStatus === "completed") {
    const { error: rpcError } = await supabase.rpc("finalize_tournament", { p_tournament_id: id });
    if (rpcError) { console.error(rpcError); alert("Error initializing results"); return; }
  }

  closeModal("modalEditStatus");
  loadTournaments();
});

/* ================= ATTACH ACTIONS ================= */
function attachAdminActions() {

  // DELETE
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("Are you sure you want to delete this tournament?")) return;

      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) alert(error.message);
      else loadTournaments();
    });
  });

  // OPEN EDIT ALL MODAL — pre-fill with current values
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const { data, error } = await supabase
        .from("tournaments").select("*").eq("id", id).single();

      if (error || !data) { alert("Could not load tournament"); return; }

      document.getElementById("editAllId").value       = id;
      document.getElementById("editAllTitle").value    = data.title || "";
      document.getElementById("editAllDesc").value     = data.description || "";
      document.getElementById("editAllDate").value     = data.start_date || "";
      document.getElementById("editAllTime").value     = data.start_time || "";
      document.getElementById("editAllType").value     = data.type || "elite";
      document.getElementById("editAllStatus").value   = data.status || "upcoming";

      openModal("modalEditAll");
    });
  });

  // OPEN EDIT IDP MODAL — pre-fill
  document.querySelectorAll(".edit-room-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const { data, error } = await supabase
        .from("tournaments").select("room_id, room_password").eq("id", id).single();

      document.getElementById("editIDPId").value    = id;
      document.getElementById("editRoomID").value   = (data && data.room_id) ? data.room_id : "";
      document.getElementById("editRoomPass").value = (data && data.room_password) ? data.room_password : "";

      openModal("modalEditIDP");
    });
  });

  // OPEN EDIT STATUS MODAL — pre-select current status
  document.querySelectorAll(".edit-status-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      const { data, error } = await supabase
        .from("tournaments").select("title, status").eq("id", id).single();

      document.getElementById("editStatusId").value = id;
      document.getElementById("editStatusTournamentName").textContent = (data && data.title) ? data.title : "—";

      // Pre-select current status radio
      const radios = document.querySelectorAll('input[name="newStatus"]');
      radios.forEach(r => { r.checked = (data && r.value === data.status); });

      openModal("modalEditStatus");
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
      alert("Tournament Created ✅");
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
  1: 10, 2: 8, 3: 6, 4: 4, 5: 2,
  6: 1, 7: 1, 8: 1, 9: 1, 10: 1
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
      <td><input type="number" class="kills" value="${player.kills || 0}" min="0"></td>
      <td><input type="number" class="placement" value="${player.placement || 0}" min="0"></td>
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
      totalCell.textContent = kills + placePoints;
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
      const slot = row.children[0].textContent;
      const kills = parseInt(row.querySelector(".kills").value) || 0;
      const placement = parseInt(row.querySelector(".placement").value) || 0;
      const total_points = kills + (placementPoints[placement] || 0);

      await supabase
        .from("match_results")
        .update({ kills, placement, total_points })
        .eq("tournament_id", tournamentId)
        .eq("slot_number", slot);
    }

    alert("Results Saved ✅");
  });


/* ================= SEASON SECTION ================= */
async function loadSeasonData() {
  await supabase.rpc("update_season_status");

  const { data: current } = await supabase
    .from("seasons")
    .select("*")
    .eq("status", "current")
    .single();

  document.getElementById("currentSeason").textContent =
    current
      ? `${current.name} (${current.season_code})\n${current.start_date} → ${current.end_date}`
      : "No active season";

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
    .insert([{ name, season_code: code, start_date: start, end_date: end, status: "upcoming" }]);

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

  await supabase.from("seasons").update({ status: "past" }).eq("status", "upcoming");

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