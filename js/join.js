import { supabase } from "/js/supabase.js";

/* 🔐 CHECK LOGIN */
async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    alert("Please login to join tournaments");
    window.location.href = "/login.html";
    return;
  }

  loadTournaments();
}

/* 📥 LOAD LIVE + UPCOMING TOURNAMENTS */
async function loadTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .or("status.eq.live,status.eq.upcoming")
    .order("date", { ascending: true });

  if (error) {
    console.error("Load error:", error);
    alert(error.message);
    return;
  }

  const container = document.getElementById("tournamentList");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No tournaments available</p>";
    return;
  }

  data.forEach(t => {
    const card = document.createElement("div");
    card.className = "tournament";

    card.innerHTML = `
      <h1>${t.name}</h1>

      <div class="details-box">
        <div class="detail">
          <span>Date</span>
          <p>${t.date}</p>
        </div>

        <div class="detail">
          <span>Time</span>
          <p>${t.time}</p>
        </div>

        <div class="detail">
          <span>Status</span>
          <p>${t.status.toUpperCase()}</p>
        </div>
      </div>

      <button class="join-btn" data-id="${t.id}">
        Join Tournament
      </button>
    `;

    container.appendChild(card);
  });

  attachJoinHandlers();
}

/* 📝 JOIN HANDLER */
function attachJoinHandlers() {
  document.querySelectorAll(".join-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tournamentId = btn.dataset.id;
      joinTournament(tournamentId);
    });
  });
}

/* 🚀 JOIN TOURNAMENT */
async function joinTournament(tournamentId) {
  alert("Tournament joined successfully!");
  // Next step: insert into participants table
}

checkUser();
