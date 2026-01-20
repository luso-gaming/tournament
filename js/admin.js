import { supabase } from "./supabase.js";

/* ======================
   CHECK ADMIN ACCESS
====================== */
async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  // Fetch profile role
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", session.user.id)
    .single();

  if (error || profile.role !== "admin") {
    alert("Unauthorized access");
    window.location.href = "/";
    return;
  }

  document.getElementById("adminEmail").innerText =
    "Admin: " + profile.email;

  loadTournaments();
}

/* ======================
   LOAD TOURNAMENTS
====================== */
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

  data.forEach(t => {
    const div = document.createElement("div");
    div.className = "tournament-card";
    div.innerHTML = `
      <h3>${t.title}</h3>
      <p>Type: ${t.type}</p>
      <p>Status: ${t.status}</p>
      <button onclick="editStatus('${t.id}')">Edit Status</button>
      <button onclick="managePlayers('${t.id}')">Players</button>
    `;
    container.appendChild(div);
  });
}

/* ======================
   CREATE TOURNAMENT
====================== */
document
  .getElementById("tournamentForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = e.target.title.value;
    const description = e.target.description.value;
    const type = e.target.type.value;
    const status = e.target.status.value;

    const { error } = await supabase
      .from("tournaments")
      .insert({ title, description, type, status });

    if (error) {
      alert(error.message);
      return;
    }

    e.target.reset();
    loadTournaments();
  });

/* ======================
   EDIT STATUS
====================== */
window.editStatus = async (id) => {
  const status = prompt("Enter status: upcoming / live / completed");
  if (!status) return;

  await supabase
    .from("tournaments")
    .update({ status })
    .eq("id", id);

  loadTournaments();
};

/* ======================
   PLAYER MANAGEMENT
====================== */
window.managePlayers = (id) => {
  location.href = `/admin-players.html?tournament=${id}`;
};

/* ======================
   LOGOUT
====================== */
document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  });

/* ======================
   INIT
====================== */
checkAdmin();
