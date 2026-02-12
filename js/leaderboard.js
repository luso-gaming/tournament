/* ================= CONFIG ================= */

const SHEET_URL =
  "https://opensheet.elk.sh/18iJoY4REDlBCEEw718CSp3-iS00ccPIaQ0L5EvDukiw/Public";

let leaderboardData = [];
let currentMode = "Points"; // Default = Total Points

/* ================= LOAD DATA ================= */

fetch(SHEET_URL)
  .then(res => {
    if (!res.ok) throw new Error("Sheet fetch failed");
    return res.json();
  })
  .then(data => {
    if (!Array.isArray(data)) {
      console.error("Sheet data is not an array");
      return;
    }

    leaderboardData = data;
    renderLeaderboard();
  })
  .catch(err => {
    console.error("Sheet load error:", err.message);
  });

/* ================= LEADERBOARD RENDER ================= */

function renderLeaderboard() {
  const leaderboard = document.querySelector(".leaderboard");
  if (!leaderboard) return;

  leaderboard.innerHTML = "";


    /* ================= TITLE UPDATE ================= */
  const title = document.getElementById("leaderboardTitle");
  
  if (title) {
    if (currentMode === "Today") {
  
      const dateFromSheet = leaderboardData[0]?.["Data"] || "";
  
      title.textContent = dateFromSheet
        ? `${dateFromSheet} Leaderboard`
        : "Leaderboard";
  
    } else {
      title.textContent = "Final Leaderboard";
    }
  }


  const sortedData = [...leaderboardData]
    .map(team => ({
      ...team,
      Points: Number(team["Points"]) || 0,
      Today: Number(team["Today"]) || 0
    }))
    .sort((a, b) => b[currentMode] - a[currentMode]);

  sortedData.forEach((team, index) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";

    row.dataset.name = (team["Team Name"] || "").toLowerCase();
    row.dataset.id = (team["Team ID"] || "").toLowerCase();

    let rankDisplay = index + 1;
    
    if (index === 0) rankDisplay = "🥇";
    if (index === 1) rankDisplay = "🥈";
    if (index === 2) rankDisplay = "🥉";
    
    row.innerHTML = `
      <span class="rank">${rankDisplay}</span>
      <span>${team["Team Name"] || "Unnamed Team"}</span>
      <span>${team[currentMode]}</span>
    `;
    

    leaderboard.appendChild(row);
  });
}

/* ================= TOGGLE BUTTONS ================= */
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("leaderboardToggle");
  if (!toggle) return;

  const buttons = toggle.querySelectorAll("button");

  // 🔥 Load saved mode
  currentMode = localStorage.getItem("leaderboardMode") || "Points";

  updateToggleUI();
  renderLeaderboard();

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const selectedMode = button.dataset.mode;

      if (selectedMode === currentMode) return;

      currentMode = selectedMode;
      localStorage.setItem("leaderboardMode", currentMode);

      updateToggleUI();
      renderLeaderboard();
    });
  });

  function updateToggleUI() {
    buttons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === currentMode);
    });

    toggle.classList.toggle("total-active", currentMode === "Points");
  }
});



/* ================= SEARCH (UNCHANGED) ================= */

function searchLeaderboard() {
  const input = document
    .getElementById("leaderboardSearch")
    .value
    .toLowerCase()
    .trim();

  const rows = document.querySelectorAll(".leaderboard-row");
  let found = false;

  rows.forEach(row => {
    const name = row.dataset.name;
    const id = row.dataset.id;

    if (!input || name.includes(input) || id.includes(input)) {
      row.style.display = "grid";
      found = true;
    } else {
      row.style.display = "none";
    }
  });

  toggleNoResult(!found && input !== "");
}

/* ================= NO RESULT MESSAGE ================= */

function toggleNoResult(show) {
  let msg = document.getElementById("leaderboardNotFound");

  if (!msg) {
    msg = document.createElement("div");
    msg.id = "leaderboardNotFound";
    msg.className = "not-found";
    msg.textContent = "❌ No team found";
    document
      .querySelector(".leaderboard-section")
      .appendChild(msg);
  }

  msg.style.display = show ? "block" : "none";
}

