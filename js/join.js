import { supabase } from "/js/supabase.js";

function getBannerByType(type) {
  const banners = {
    elite: "/assets/images/elite.png",
    pro: "/assets/images/pro.png",
    legend: "/assets/images/legend.png"
  };
  return banners[type] || "/assets/images/elite.png";
}

/* LOAD TOURNAMENTS */
async function loadTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Load error:", error);
    return;
  }

  const container = document.getElementById("tournamentList");
  const pastContainer = document.getElementById("pastTournamentList");

  container.innerHTML = "";
  pastContainer.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No tournaments available</p>";
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  let joinedIds = [];

  if (session) {
    const { data: joined } = await supabase
      .from("participants")
      .select("tournament_id")
      .eq("user_id", session.user.id);

    joinedIds = joined?.map(j => j.tournament_id) || [];
  }

  for (const t of data) {

    const { data: participants } = await supabase
      .from("participants")
      .select("id")
      .eq("tournament_id", t.id);

      


    const playerCount = participants ? participants.length : 0;
    const maxPlayers = t.max_players ?? 16;

    const isCompleted = t.status === "completed";
    const now = new Date();
    const startDateTime = new Date(`${t.start_date}T${t.start_time}`);
    const joinOpenTime = new Date(startDateTime.getTime() - 20 * 60000);
    
    const isFull = playerCount >= maxPlayers;
    const isLive = now >= startDateTime;
    const isJoinOpen = now >= joinOpenTime && now < startDateTime;
    const isBeforeJoin = now < joinOpenTime;

    const userJoined = joinedIds.includes(t.id);

    let buttonDisabled = false;
    let buttonText = "Join Tournament";
    let idpContent = "";

    /* BEFORE REGISTRATION (More than 20 min left) */
    if (isBeforeJoin) {
      buttonDisabled = true;
      idpContent = `<p class="countdown" id="timer-${t.id}" data-start="${joinOpenTime.toISOString()}"></p>`;
    }

    /* REGISTRATION OPEN */
    else if (isJoinOpen && !isFull && !userJoined) {
      buttonDisabled = false;
    }

    /* FULL */
    else if (isFull && !userJoined) {
      buttonDisabled = true;
      idpContent = `<p style="color:red;">Tournament Full</p>`;
    }

    /* MATCH LIVE */
    else if (isLive && !userJoined) {
      buttonDisabled = true;
      idpContent = `<p style="color:red;">Registration Closed</p>`;
    }

    /* USER JOINED (Before Live) */
    if (userJoined && !isLive) {
      buttonDisabled = true;
      buttonText = "Joined ✅";
      idpContent = `<p style="color:#00d4ff;">
        ✅ Joined successfully<br>
        Room details will be visible when match goes live.
      </p>`;
    }

    /* USER JOINED & MATCH LIVE */
    if (userJoined && isLive) {
      buttonDisabled = true;
      buttonText = "Match Live 🔥";
      idpContent = `
        <p><strong>Room ID:</strong> ${t.room_id || "Will be announced"}</p>
        <p><strong>Password:</strong> ${t.room_password || "Will be announced"}</p>
      `;
    }

    const card = document.createElement("div");
    card.className = "tournament";

    card.innerHTML = `
      <div class="tournament-card">

        <div class="image-box">
          <img src="${getBannerByType(t.type)}" alt="${t.type}banner">
        </div>

        <div class="details-box">
          <div class="detail">

           <div class="bottom-card">
            <h2>${t.title}</h2>
            <div class="players">
              <span>Players Joined</span>
              <p>${playerCount} / ${maxPlayers}</p>
            </div>

           </div>
            <span>Details</span>
            <p class="description">${t.description}</p>

            <div id="bar">
              <p id="time">${startDateTime.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true
            })}</p>
              <p id="status">${t.status?.toUpperCase() || ""}</p>
            </div>

            <div class="bottom-card">
              <div class="fee">
                <span>Entry Fee</span>
                <p>${t.entry_points === 0 ? "Free" : t.entry_points + " TC"}</p>
              </div>

              <div class="idp">
                ${idpContent}
              </div>
            </div>

            <button class="join-btn" data-id="${t.id}" ${buttonDisabled ? "disabled" : ""}>
              ${buttonText}
            </button>

          </div>
        </div>

      </div>
    `;

    if (isCompleted) {
      pastContainer.prepend(card); // newest completed on top
    } else {
      container.appendChild(card);
    }
    

    if (isBeforeJoin) {
      startCountdown(t.id, joinOpenTime);
    }
  }
if (pastContainer.innerHTML === "") {
  document.getElementById("pastTournamentSection").style.display = "none";
}

  attachJoinHandlers();
}


/* COUNTDOWN */
function startCountdown(tournamentId, joinOpenTime) {
  const el = document.getElementById(`timer-${tournamentId}`);
  if (!el) return;

  function updateTimer() {
    const now = new Date();
    const diff = joinOpenTime - now;

    if (diff <= 0) {
      location.reload();
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (days > 0) {
      el.innerText = `Registration opens in ${days}d ${hours}h`;
    } 
    else if (hours > 0) {
      el.innerText = `Registration opens in ${hours}h ${minutes}m`;
    } 
    else {
      el.innerText = `Registration opens in ${minutes}m ${seconds}s`;
    }
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}


/* JOIN BUTTON */
function attachJoinHandlers() {
  document.querySelectorAll(".join-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert("Please login to join");
        window.location.href = "/login.html";
        return;
      }

      const tournamentId = btn.dataset.id;

      btn.disabled = true;
      btn.innerText = "Joining...";

      const { data, error } = await supabase.rpc("join_tournament", {
        p_tournament_id: tournamentId
      });

      if (error) {
        alert(error.message);
        btn.disabled = false;
        btn.innerText = "Join Tournament";
        return;
      }

      alert(data);
      location.reload();
    });
  });
}

/* RUN */
loadTournaments();
