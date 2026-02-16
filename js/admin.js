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
      <strong>${t.title}</strong><br>
      Room ID: ${t.room_id} <br>
      Room Password: ${t.room_password || "N/A"} <br>
      ${t.start_date} ${t.start_time}<br>
      Status: ${t.status}<br>
      Type: ${t.type}<br><br>

      <button class="edit-btn" data-id="${t.id}">Edit All</button>
      <button class="edit-room-btn" data-id="${t.id}">Edit Room ID & Password</button>
      <button class="edit-status-btn" data-id="${t.id}">Edit Status</button>
      <button class="delete-btn" data-id="${t.id}">Delete</button>
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
  
      const { error } = await supabase
        .from("tournaments")
        .update({ status: newStatus })
        .eq("id", id);
  
      if (error) alert(error.message);
      else {
        alert("Status updated");
        loadTournaments();
      }
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
