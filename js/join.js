import { supabase } from "/js/supabase.js";

function getBannerByType(type) {
  const banners = {
    elite: "/assets/images/elite.png",
    pro: "/assets/images/pro.png",
    legend: "/assets/images/legend.png"
  };

  return banners[type] || "/assets/images/elite.png";
}


/*  LOAD LIVE + UPCOMING TOURNAMENTS (PUBLIC) */
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
      <div class="tournament-card">

      <div class="image-box">
        <img src="${getBannerByType(t.type)}" alt="${t.type} banner">
      </div>



      <div class="details-box">
        <div class="detail">

          <h2>${t.title}</h2>
        
          <span>Details</span>
          <p class="description">${t.description}</p>
          <div id="bar"><p id="time">${
            (() => {
              const d = new Date(`${t.start_date}T${t.start_time}`);
              return d.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
              });
            })()
          }</p>
          <p id="status">${t.status.toUpperCase()}</p>
         </div>
        
          <span>Entry Fee</span>
          <p>${t.entry_points === 0 ? "Free" : t.entry_points + " TC" }</p>


        <button onclick="joinTournament('TOURNAMENT_UUID')">
          Join Tournament
        </button>
        </div>
      </div>


      </div>
    `;

    container.appendChild(card);
  });

  attachJoinHandlers();
}

/*  JOIN CLICK → CHECK LOGIN */
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

/*  JOIN TOURNAMENT (NEXT STEP) */
const joinTournament = async (tournamentId) => {
  const { data, error } = await supabase.rpc("join_tournament", {
    p_tournament_id: tournamentId
  });

  if (error) {
    alert(error.message);
  } else {
    alert(data); // Joined successfully
  }
};


loadTournaments();
