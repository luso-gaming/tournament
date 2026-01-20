/* ================= CONFIG ================= */

const SHEET_URL =
  "https://opensheet.elk.sh/18iJoY4REDlBCEEw718CSp3-iS00ccPIaQ0L5EvDukiw/Public";

const DEFAULT_LOGO =
  "https://i.ibb.co/G4wSTbqV/dafault.jpg";

let teamsData = [];

/* ================= UTIL ================= */

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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

    teamsData = data;
    renderTeams(teamsData);
  })
  .catch(err => {
    console.error("Sheet load error:", err.message);
  });

/* ================= RENDER TEAMS ================= */

function renderTeams(data) {
  const container = document.querySelector(".teams-grid");
  if (!container) return;

  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `
      <div class="not-found">
        ❌ No teams found
      </div>
    `;
    return;
  }

  data.forEach(team => {
    const card = document.createElement("div");
    card.className = "team-card";

    const img = document.createElement("img");
    const logoValue = team["Logo URL"];

    img.src = isValidHttpUrl(logoValue) ? logoValue : DEFAULT_LOGO;
    img.onerror = () => {
      img.onerror = null;
      img.src = DEFAULT_LOGO;
    };

    const name = document.createElement("h3");
    name.textContent = team["Team Name"] || "Unnamed Team";

    const id = document.createElement("p");
    id.textContent = `ID: ${team["Team ID"] || "N/A"}`;

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(id);

    container.appendChild(card);
  });
}

/* ================= FILTER SEARCH ================= */

function filterTeams() {
  const input = document
    .getElementById("teamSearchInput")
    .value
    .trim()
    .toUpperCase();

  if (!input) {
    renderTeams(teamsData);
    return;
  }

  const filtered = teamsData.filter(team => {
    const teamId = team["Team ID"]?.toUpperCase() || "";
    const teamName = team["Team Name"]?.toUpperCase() || "";
    return teamId.includes(input) || teamName.includes(input);
  });

  renderTeams(filtered);
}
