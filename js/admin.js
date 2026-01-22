import { supabase } from "/js/supabase.js";

/* 🔐 CHECK ADMIN */
async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,email")
    .eq("id", session.user.id)
    .single();

  if (profile.role !== "admin") {
    alert("Access denied");
    window.location.href = "/";
    return;
  }

  document.getElementById("adminEmail").innerText = profile.email;
  loadTournaments();
}

/* 📥 LOAD TOURNAMENTS */
async function loadTournaments() {
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  const container = document.getElementById("tournamentsContainer");
  container.innerHTML = "";

  data.forEach(t => {
    const div = document.createElement("div");
    div.className = "tournament";
    div.innerHTML = `
      <strong>${t.name}</strong><br>
      ${t.date} ${t.time}<br>
      Status: ${t.status}
    `;
    container.appendChild(div);
  });
}

/* ➕ CREATE TOURNAMENT */
document.getElementById("tournamentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;

  const tournament = {
    name: form.name.value,
    date: form.date.value,
    time: form.time.value,
    status: form.status.value,
    description: form.description.value
  };

  const { error } = await supabase.from("tournaments").insert([tournament]);

  if (error) {
    alert(error.message);
  } else {
    alert("Tournament Created");
    form.reset();
    loadTournaments();
  }
});

/* 🚪 LOGOUT */
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "/";
});

checkAdmin();
