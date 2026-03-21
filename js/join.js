import { supabase } from "/js/supabase.js";

let allPastCards = [];
let myTournamentIds = new Set();
let currentPastFilter = "all";

function getBannerByType(type) {
  const banners = {
    elite: "/assets/images/elite.png",
    pro: "/assets/images/pro.png",
    legend: "/assets/images/legend.png"
  };
  return banners[type] || "/assets/images/elite.png";
}

document.addEventListener("DOMContentLoaded", () => {

  const allBtn = document.getElementById("allPastBtn");
  const myBtn = document.getElementById("myPastBtn");

  if (allBtn && myBtn) {

    // 🔥 Set initial slider
    moveSlider(allBtn);

    allBtn.addEventListener("click", () => {
      currentPastFilter = "all";
      setActiveBtn("allPastBtn");
      moveSlider(allBtn); // 🔥 slide
      renderPastTournaments();
    });

    myBtn.addEventListener("click", () => {
      currentPastFilter = "my";
      setActiveBtn("myPastBtn");
      moveSlider(myBtn); // 🔥 slide
      renderPastTournaments();
    });
  }
});

/* LOAD TOURNAMENTS */
async function loadTournaments() {
  showTournamentSkeleton(); 
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
  let joinedMap = {};

  if (session) {
    const { data: played } = await supabase
      .from("participants")
      .select("tournament_id")
      .eq("user_id", session.user.id);
  
    played?.forEach(p => myTournamentIds.add(p.tournament_id));
  }

  if (session) {
    const { data: joined } = await supabase
      .from("participants")
      .select("tournament_id, slot_number")
      .eq("user_id", session.user.id);
  
    joined?.forEach(j => {
      joinedMap[j.tournament_id] = j.slot_number;
    });
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

    const userSlot = joinedMap[t.id];
    const userJoined = userSlot !== undefined;

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
      idpContent = `<p style="color:green;">Registration Open</p>`;
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
    
      if (!t.room_id || !t.room_password) {
        idpContent = `
          <p style="color:#00d4ff;">
            Room details will be visible here.
          </p>
        `;
      } else {
        idpContent = `
          <p><strong>ID:</strong> ${t.room_id}</p>
          <p><strong>PASS:</strong> ${t.room_password}</p>
        `;
      }
    }
    
    /* USER JOINED & MATCH LIVE */
    /* MATCH LIVE (For Everyone) */
if (isLive) {
  buttonDisabled = false;
  buttonText = "Watch Live ";

  idpContent = `<p style="color:#DE1412; font-weight:bold;">
    Registration Closed
  </p>`;
}

if (isCompleted) {
  buttonDisabled = false;
  buttonText = "View Result";
  idpContent = `<p style="color:gold;">Match Completed</p>`;
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

           <div class="upper-card">
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
                ${userJoined 
                  ? `
                    <span>Your Slot</span>
                    <p style="color:rgb(135, 231, 9); font-weight:bold;">${userSlot}</p>
                  `
                  : `
                    <span>Entry Fee</span>
                    <p>${t.entry_points === 0 ? "Free" : t.entry_points + " TC"}</p>
                  `
                }
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

    // If match is live → redirect button to YouTube
    if (isLive && !isCompleted) {
      const liveBtn = card.querySelector(".join-btn");
    
      if (liveBtn) {
        liveBtn.style.backgroundColor = "#ff0000";
        liveBtn.style.color = "#ffffff";
    
        liveBtn.addEventListener("click", () => {
          window.open(
            "https://youtube.com/@lusogaming?si=2LPftdAmWbC3czgp",
            "_blank"
          );
        });
      }
    }
    
    if (isCompleted) {
      const resultBtn = card.querySelector(".join-btn");
    
      if (resultBtn) {
        resultBtn.style.backgroundColor = "#1e90ff"; // blue
        resultBtn.style.color = "#fff";
        resultBtn.style.border = "none";
      }
    }

    if (isCompleted) {
    
      // store all past tournament cards
      allPastCards.push({
        element: card,
        tournamentId: t.id
      });
    
    } else {
      container.appendChild(card);
    }
    

    if (isBeforeJoin) {
      startCountdown(t.id, joinOpenTime);
    }
  }
renderPastTournaments();

if (allPastCards.length === 0) {
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
      
      const tournamentId = btn.dataset.id;

      if (btn.innerText.includes("View Result")) {
        window.location.href = `/teams.html?id=${tournamentId}`;
        return;
      }

      if (!session) {
        alert("Please login to join");
        window.location.href = "/login.html";
        return;
      }
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("team_name, in_game_name")
        .eq("id", session.user.id)
        .single();
    
      if (profileError) {
        alert("Error loading profile");
        return;
      }
    
      if (!profile.team_name || !profile.in_game_name) {
        alert("Please fill Team Name & IGN in Dashboard to join tournament");
        window.location.href = "/dashboard.html";
        return;
      }

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


function renderPastTournaments() {
  const pastContainer = document.getElementById("pastTournamentList");
  pastContainer.innerHTML = "";

  let filtered = [];

  if (currentPastFilter === "all") {
    filtered = allPastCards;
  } else {
    filtered = allPastCards.filter(t =>
      myTournamentIds.has(t.tournamentId)
    );
  }

  if (filtered.length === 0) {
  pastContainer.style.display = "flex";   // ⚠️ IMPORTANT
  pastContainer.style.justifyContent = "center";
  pastContainer.style.alignItems = "center";
  pastContainer.style.border = "none";
  pastContainer.style.backgroundColor = "#00000000";
  pastContainer.innerHTML = `
    <div class="no-data">
      <p>No tournaments found</p>
    </div>
  `;
    return;
  }

  filtered.reverse().forEach(t => {
    pastContainer.appendChild(t.element);
  });
}

function setActiveBtn(id) {
  document.getElementById("allPastBtn").classList.remove("active");
  document.getElementById("myPastBtn").classList.remove("active");

  document.getElementById(id).classList.add("active");
}

/* RUN */
loadTournaments();

function showTournamentSkeleton() {
  const container = document.getElementById("tournamentList");
  const pastContainer = document.getElementById("pastTournamentList");

  if (!container || !pastContainer) return;

  container.innerHTML = "";
  pastContainer.innerHTML = "";

  // 🔥 Live tournaments skeleton
  for (let i = 0; i < 3; i++) {
    container.appendChild(createSkeletonCard());
  }

  // 🔥 Past tournaments skeleton
  for (let i = 0; i < 3; i++) {
    pastContainer.appendChild(createSkeletonCard());
  }
}

function createSkeletonCard() {
  const card = document.createElement("div");
  card.className = "tournament";

  card.innerHTML = `
    <div class="tournament-card">

      <div class="image-box">
        <div class="skeleton sk-img"></div>
      </div>

      <div class="details-box">
        <div class="detail">

          <div class="upper-card">
            <div class="skeleton sk-title"></div>
            <div class="players">
              <div class="skeleton sk-small"></div>
              <div class="skeleton sk-small"></div>
            </div>
          </div>

          <div class="skeleton sk-desc"></div>

          <div id="bar">
            <div class="skeleton sk-small"></div>
            <div class="skeleton sk-small"></div>
          </div>

          <div class="bottom-card">
            <div class="skeleton sk-small"></div>
            <div class="skeleton sk-small"></div>
          </div>

          <div class="skeleton sk-btn"></div>

        </div>
      </div>

    </div>
  `;

  return card;
}

function moveSlider(activeBtn) {
  const slider = document.querySelector(".filter-slider");

  const btnRect = activeBtn.getBoundingClientRect();
  const parentRect = activeBtn.parentElement.getBoundingClientRect();

  slider.style.width = btnRect.width + "px";
  slider.style.transform = `translateX(${btnRect.left - parentRect.left}px)`;
}