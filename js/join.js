import { supabase } from "/js/supabase.js";

/* 📥 LOAD LIVE + UPCOMING TOURNAMENTS (PUBLIC) */
async function loadTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .in("status", ["live", "upcoming"])
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Load error:", error);
    alert("Failed to load tournaments");
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
      <h1>${t.title}</h1>

      <div class="details-box">
        <div class="detail">
          <span>Date</span>
          <p>${t.start_date}</p>
        </div>

        <div class="detail">
          <span>Time</span>
          <p>${t.start_time}</p>
        </div>

        <div class="detail">
          <span>Status</span>
          <p>${t.status.toUpperCase()}</p>
        </div>

        <div class="detail">
          <span>Entry Fee</span>
          <p>${t.entry_fee === 0 ? "Free" : "₹" + t.entry_fee}</p>
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

/* 🔐 JOIN CLICK → CHECK LOGIN */
function attachJoinHandlers() {
  document.querySelectorAll(".join-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert("Please login to join the tournament");
        window.location.href = "/login.html";
        return;
      }

      const tournamentId = btn.dataset.id;
      joinTournament(tournamentId);
    });
  });
}

/* 🚀 JOIN TOURNAMENT (NEXT STEP) */
async function joinTournament(tournamentId) {
  alert("You are logged in. Tournament join logic coming next!");
  // Next: insert into participants table
}

loadTournaments();
