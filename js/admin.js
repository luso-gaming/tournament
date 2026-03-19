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
