import { supabase } from "/js/supabase.js";

let currentUser = null;

/* 🔐 CHECK LOGIN */
async function checkLogin() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
}

/* 📥 LOAD TOURNAMENTS */
async function loadTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("status", "active")
    .order("date", { ascending: true });

  if (error) {
    alert("Failed to load tournaments");
    console.error(error);
    return;
  }

  const container = document.getElementById("tournamentList");
  container.innerHTML = "";

  if (!data.length) {
    container.innerHTML = "<p>No tournaments available.</p>";
    return;
  }

  data.forEach(t => {
    const card = document.createElement("div");
    card.className = "tournament-card";

    card.innerHTML = `
      <h2>${t.name}</h2>
      <div class="details-box">
        <div class="detail"><span>Date</span><p>${t.date}</p></div>
        <div class="detail"><span>Time</span><p>${t.time}</p></div>
        <div class="detail"><span>Status</span><p>${t.status}</p></div>
      </div>
      <button class="join-btn" data-id="${t.id}">Join Tournament</button>
    `;

    container.appendChild(card);
  });

  bindJoinButtons();
}

/* 🧩 JOIN HANDLER */
function bindJoinButtons() {
  document.querySelectorAll(".join-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!currentUser) {
        alert("Please login to join the tournament");
        return;
      }

      const tournamentId = btn.dataset.id;

      const { error } = await supabase
        .from("tournament_joins")
        .insert({
          user_id: currentUser.id,
          tournament_id: tournamentId
        });

      if (error) {
        if (error.code === "23505") {
          alert("You already joined this tournament");
        } else {
          alert("Failed to join tournament");
          console.error(error);
        }
        return;
      }

      alert("Successfully joined the tournament!");
      btn.disabled = true;
      btn.innerText = "Joined";
    });
  });
}

/* 🚀 INIT */
(async () => {
  await checkLogin();
  await loadTournaments();
})();
