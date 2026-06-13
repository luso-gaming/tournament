import { supabase } from "/js/supabase.js";

/* ───────────────────────────
   STATE
─────────────────────────── */
let allPastCards     = [];   // { element, tournamentId }
let myTournamentIds  = new Set();
let joinedMap        = {};   // tournamentId -> slot_number
let currentPastFilter = "all";

const PAST_CHUNK   = 6;
let pastOffset     = 0;
let pastHasMore    = true;
let pastLoading    = false;

/* ───────────────────────────
   HELPERS
─────────────────────────── */
function getBannerByType(type) {
  const banners = {
    elite:  "/assets/images/elite.webp",
    pro:    "/assets/images/pro.webp",
    legend: "/assets/images/legend.webp"
  };
  return banners[type] || "/assets/images/elite.webp";
}

/* Batch-fetch participant counts for a set of tournament ids in ONE query */
async function getParticipantCounts(tournamentIds) {
  const counts = {};
  if (!tournamentIds.length) return counts;

  const { data, error } = await supabase
    .from("participants")
    .select("tournament_id")
    .in("tournament_id", tournamentIds);

  if (error) { console.error("Participant count error:", error); return counts; }

  data?.forEach(p => {
    counts[p.tournament_id] = (counts[p.tournament_id] || 0) + 1;
  });

  return counts;
}

/* ───────────────────────────
   INIT
─────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const allBtn = document.getElementById("allPastBtn");
  const myBtn  = document.getElementById("myPastBtn");

  if (allBtn && myBtn) {
    moveSlider(allBtn);

    allBtn.addEventListener("click", () => {
      currentPastFilter = "all";
      setActiveBtn("allPastBtn");
      moveSlider(allBtn);
      renderPastTournaments();
    });

    myBtn.addEventListener("click", () => {
      currentPastFilter = "my";
      setActiveBtn("myPastBtn");
      moveSlider(myBtn);
      renderPastTournaments();
    });
  }

  // Event delegation for all join buttons (current & future chunks)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".join-btn");
    if (btn) handleJoinClick(btn);

    const loadMoreBtn = e.target.closest("#loadMorePastBtn");
    if (loadMoreBtn) loadMorePastTournaments();
  });

  init();
});

async function init() {
  showActiveSkeleton();
  showPastSkeleton();

  // Resolve session + user's joined tournaments ONCE, used by both sections
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    const { data: joined, error } = await supabase
      .from("participants")
      .select("tournament_id, slot_number")
      .eq("user_id", session.user.id);

    if (!error && joined) {
      joined.forEach(j => {
        myTournamentIds.add(j.tournament_id);
        joinedMap[j.tournament_id] = j.slot_number;
      });
    }
  }

  // Fire both loads — active first (small + fast), past starts right after
  await loadActiveTournaments();
  await loadMorePastTournaments();
}

/* ───────────────────────────
   ACTIVE / UPCOMING / LIVE
─────────────────────────── */
async function loadActiveTournaments() {
  const container = document.getElementById("tournamentList");

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .neq("status", "completed")
    .order("start_date", { ascending: true });

  container.innerHTML = "";

  if (error) {
    console.error("Load error:", error);
    container.innerHTML = "<p style='color:var(--text-muted);padding:20px;'>Could not load tournaments.</p>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p style='color:var(--text-muted);padding:20px;'>No active tournaments available</p>";
    return;
  }

  const counts = await getParticipantCounts(data.map(t => t.id));

  data.forEach(t => {
    const playerCount = counts[t.id] || 0;
    const card = buildTournamentCard(t, playerCount);
    container.appendChild(card);
  });
}

/* ───────────────────────────
   PAST TOURNAMENTS (chunked)
─────────────────────────── */
async function loadMorePastTournaments() {
  if (pastLoading || !pastHasMore) return;
  pastLoading = true;

  const loadMoreBtn = document.getElementById("loadMorePastBtn");
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Loading...";
  }

  const from = pastOffset;
  const to   = pastOffset + PAST_CHUNK - 1;

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("status", "completed")
    .order("start_date", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Past load error:", error);
    pastLoading = false;
    if (loadMoreBtn) loadMoreBtn.textContent = "Load More";
    return;
  }

  if (data && data.length > 0) {
    const counts = await getParticipantCounts(data.map(t => t.id));

    data.forEach(t => {
      const playerCount = counts[t.id] || 0;
      const card = buildTournamentCard(t, playerCount);
      allPastCards.push({ element: card, tournamentId: t.id });
    });

    pastOffset += data.length;
  }

  if (!data || data.length < PAST_CHUNK) {
    pastHasMore = false;
  }

  pastLoading = false;
  renderPastTournaments();

  // Hide whole past section if there's truly nothing
  const pastSection = document.getElementById("pastTournamentSection");
  if (allPastCards.length === 0) {
    pastSection.style.display = "none";
  } else {
    pastSection.style.display = "";
  }
}

/* ───────────────────────────
   CARD BUILDER (shared)
─────────────────────────── */
function buildTournamentCard(t, playerCount) {
  const maxPlayers   = t.max_players ?? 16;
  const isCompleted  = t.status === "completed";
  const now          = new Date();
  const startDateTime = new Date(`${t.start_date}T${t.start_time}`);
  const joinOpenTime  = new Date(startDateTime.getTime() - 20 * 60000);

  const isFull       = playerCount >= maxPlayers;
  const isLive       = now >= startDateTime;
  const isJoinOpen   = now >= joinOpenTime && now < startDateTime;
  const isBeforeJoin = now < joinOpenTime;

  const userSlot   = joinedMap[t.id];
  const userJoined = userSlot !== undefined;

  let buttonDisabled = false;
  let buttonText     = "Join Tournament";
  let idpContent     = "";

  if (isBeforeJoin) {
    buttonDisabled = true;
    idpContent = `<p class="countdown" id="timer-${t.id}" data-start="${joinOpenTime.toISOString()}"></p>`;
  } else if (isJoinOpen && !isFull && !userJoined) {
    buttonDisabled = false;
    idpContent = `<p style="color:var(--success);">Registration Open</p>`;
  } else if (isFull && !userJoined) {
    buttonDisabled = true;
    idpContent = `<p style="color:var(--danger);">Tournament Full</p>`;
  } else if (isLive && !userJoined) {
    buttonDisabled = true;
    idpContent = `<p style="color:var(--danger);">Registration Closed</p>`;
  }

  if (userJoined && !isLive) {
    buttonDisabled = true;
    buttonText = "Joined ✅";
    if (!t.room_id || !t.room_password) {
      idpContent = `<p style="color:#00d4ff;">Room details will appear here.</p>`;
    } else {
      idpContent = `
        <p><strong>ID:</strong> ${t.room_id}</p>
        <p><strong>PASS:</strong> ${t.room_password}</p>
      `;
    }
  }

  if (isLive) {
    buttonDisabled = false;
    buttonText = "Watch Live";
    idpContent = `<p style="color:var(--orange);font-weight:bold;">Registration Closed</p>`;
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
        <img src="${getBannerByType(t.type)}" alt="${t.type} banner" loading="lazy">
      </div>
      <div class="details-box">
        <div class="detail">
          <div class="upper-card">
            <h2></h2>
            <div class="players">
              <span>Players Joined</span>
              <p>${playerCount} / ${maxPlayers}</p>
            </div>
          </div>
          <span>Details</span>
          <p class="description"></p>
          <div id="bar">
            <p id="time">${startDateTime.toLocaleString("en-US", {
              month: "short", day: "numeric", year: "numeric",
              hour: "numeric", minute: "2-digit", hour12: true
            })}</p>
            <p id="status"></p>
          </div>
          <div class="bottom-card">
            <div class="fee">
              ${userJoined
                ? `<span>Your Slot</span><p style="color:var(--success);font-weight:bold;">${userSlot}</p>`
                : `<span>Registration Fee</span><p>${t.entry_points === 0 ? "Free" : t.entry_points + " TC"}</p>`
              }
            </div>
            <div class="idp">${idpContent}</div>
          </div>
          <button class="join-btn" data-id="${t.id}" ${buttonDisabled ? "disabled" : ""}></button>
        </div>
      </div>
    </div>
  `;

  // Use textContent for user-supplied data (XSS safe)
  card.querySelector("h2").textContent           = t.title;
  card.querySelector(".description").textContent = t.description || "";
  card.querySelector("#status").textContent      = (t.status || "").toUpperCase();
  card.querySelector(".join-btn").textContent    = buttonText;

  // Live → YouTube redirect
  if (isLive && !isCompleted) {
    const liveBtn = card.querySelector(".join-btn");
    if (liveBtn) {
      liveBtn.style.cssText = "background:#ff0000;color:#fff;";
      liveBtn.dataset.action = "watch-live";
    }
  }

  // Completed → blue button
  if (isCompleted) {
    const resultBtn = card.querySelector(".join-btn");
    if (resultBtn) {
      resultBtn.style.cssText = "background:#1e90ff;color:#fff;border:none;";
    }
  }

  if (isBeforeJoin) startCountdown(t.id, joinOpenTime);

  return card;
}

/* ───────────────────────────
   COUNTDOWN
─────────────────────────── */
function startCountdown(tournamentId, joinOpenTime) {
  // Use a small delay so the element exists in the DOM after append
  requestAnimationFrame(() => {
    const el = document.getElementById(`timer-${tournamentId}`);
    if (!el) return;

    function updateTimer() {
      const now  = new Date();
      const diff = joinOpenTime - now;
      if (diff <= 0) { location.reload(); return; }

      const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours   = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (days > 0)        el.textContent = `Opens in ${days}d ${hours}h`;
      else if (hours > 0)  el.textContent = `Opens in ${hours}h ${minutes}m`;
      else                 el.textContent = `Opens in ${minutes}m ${seconds}s`;
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  });
}

/* ───────────────────────────
   JOIN BUTTON CLICK (delegated)
─────────────────────────── */
async function handleJoinClick(btn) {
  const tournamentId = btn.dataset.id;

  if (btn.dataset.action === "watch-live") {
    window.open("https://youtube.com/@lusogaming?si=2LPftdAmWbC3czgp", "_blank");
    return;
  }

  if (btn.textContent.includes("View Result")) {
    window.location.href = `/teams.html?id=${tournamentId}`;
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();

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

  if (profileError) { alert("Error loading profile"); return; }

  if (!profile.team_name || !profile.in_game_name) {
    alert("Please fill Team Name & IGN in Dashboard to join tournament");
    window.location.href = "/dashboard.html";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Joining...";

  const { data, error } = await supabase.rpc("join_tournament", {
    p_tournament_id: tournamentId
  });

  if (error) {
    alert(error.message);
    btn.disabled = false;
    btn.textContent = "Join Tournament";
    return;
  }

  alert(data);
  location.reload();
}

/* ───────────────────────────
   RENDER PAST
─────────────────────────── */
function renderPastTournaments() {
  const pastContainer = document.getElementById("pastTournamentList");
  pastContainer.innerHTML = "";

  const filtered = currentPastFilter === "all"
    ? allPastCards
    : allPastCards.filter(t => myTournamentIds.has(t.tournamentId));

  if (filtered.length === 0) {
    pastContainer.innerHTML = `
      <div class="no-data">
        <p>No tournaments found</p>
      </div>
    `;
  } else {
    filtered.forEach(t => pastContainer.appendChild(t.element));
  }

  renderLoadMoreButton();
}

function renderLoadMoreButton() {
  const pastSection = document.getElementById("pastTournamentSection");
  let wrap = document.getElementById("loadMorePastWrap");

  if (!pastHasMore) {
    if (wrap) wrap.remove();
    return;
  }

  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "loadMorePastWrap";
    wrap.className = "load-more-wrap";
    wrap.innerHTML = `<button id="loadMorePastBtn" class="load-more-btn">Load More</button>`;
    pastSection.appendChild(wrap);
  } else {
    pastSection.appendChild(wrap); // keep it at the bottom
  }

  const btn = document.getElementById("loadMorePastBtn");
  btn.disabled = pastLoading;
  btn.textContent = pastLoading ? "Loading..." : "Load More";
}

function setActiveBtn(id) {
  ["allPastBtn","myPastBtn"].forEach(b => {
    document.getElementById(b)?.classList.remove("active");
  });
  document.getElementById(id)?.classList.add("active");
}

/* ───────────────────────────
   SKELETONS
─────────────────────────── */
function showActiveSkeleton() {
  const container = document.getElementById("tournamentList");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < 3; i++) container.appendChild(createSkeletonCard());
}

function showPastSkeleton() {
  const pastContainer = document.getElementById("pastTournamentList");
  if (!pastContainer) return;
  pastContainer.innerHTML = "";
  for (let i = 0; i < 3; i++) pastContainer.appendChild(createSkeletonCard());
}

function createSkeletonCard() {
  const card = document.createElement("div");
  card.className = "tournament";
  card.innerHTML = `
    <div class="tournament-card">
      <div class="image-box"><div class="skeleton sk-img"></div></div>
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

/* ───────────────────────────
   SLIDER
─────────────────────────── */
function moveSlider(activeBtn) {
  const slider    = document.querySelector(".filter-slider");
  const btnRect   = activeBtn.getBoundingClientRect();
  const parentRect = activeBtn.parentElement.getBoundingClientRect();
  slider.style.width     = btnRect.width + "px";
  slider.style.transform = `translateX(${btnRect.left - parentRect.left}px)`;
}