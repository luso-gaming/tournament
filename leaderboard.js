/* ================= CONFIG ================= */

const SHEET_URL =
  "https://opensheet.elk.sh/18iJoY4REDlBCEEw718CSp3-iS00ccPIaQ0L5EvDukiw/Public";

let leaderboardData = [];

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
    renderLeaderboard(data);
  })
  .catch(err => {
    console.error("Sheet load error:", err.message);
  });

/* ================= LEADERBOARD RENDER ================= */

function renderLeaderboard(data) {
  const leaderboard = document.querySelector(".leaderboard");
  if (!leaderboard) return;

  leaderboard.innerHTML = "";

  [...data]
    .sort((a, b) => Number(b["Points"]) - Number(a["Points"]))
    .forEach((team, index) => {
      const row = document.createElement("div");
      row.className = "leaderboard-row";

      row.dataset.name = (team["Team Name"] || "").toLowerCase();
      row.dataset.id = (team["Team ID"] || "").toLowerCase();

      row.innerHTML = `
        <span>${index + 1}</span>
        <span>${team["Team Name"] || "Unnamed Team"}</span>
        <span>${team["Points"] || 0}</span>
      `;

      leaderboard.appendChild(row);
    });
}

/* ================= SEARCH (TEAMS-STYLE) ================= */

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
