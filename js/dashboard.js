import { supabase } from "./supabase.js";

/* AUTH CHECK */

const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  window.location.href = "/login.html";
}

const userId = session.user.id;

document.getElementById("userEmail").textContent = session.user.email;
document.getElementById("userName").textContent =
  session.user.user_metadata?.full_name || "Not provided";

/* LOAD PROFILE DATA */

let lastUpdateDate = null;

async function loadProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      team_name,
      in_game_name,
      points,
      last_name_update
    `)
    .eq("id", userId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  if (!data) return;

  // ✅ SET DATA
  document.getElementById("userName").textContent =
    session.user.user_metadata?.full_name || "Not provided";

  document.getElementById("userEmail").textContent =
    session.user.email;

  document.getElementById("userTeam").textContent =
    data.team_name || "Not set";

  document.getElementById("userIgn").textContent =
    data.in_game_name || "Not set";

  document.getElementById("userPoints").innerText =
    data.points || 0;

  // ✅ REMOVE SKELETON
  removeSkeleton("userName");
  removeSkeleton("userEmail");
  removeSkeleton("userTeam");
  removeSkeleton("userIgn");

  lastUpdateDate = data.last_name_update;
}


/* LOAD STATS DATA */

async function loadStats() {

  // 🔹 Get team name first
  const { data: profile } = await supabase
    .from("profiles")
    .select("team_name")
    .eq("id", userId)
    .single();

  if (!profile || !profile.team_name) {
    console.warn("No team found");
    return;
  }

  const teamName = profile.team_name;

  // 🔹 Fetch match data using team name
  const { data, error } = await supabase
    .from("match_results")
    .select("kills")
    .eq("team_name", teamName);

  console.log("Match Data:", data);

  if (error) {
    console.error(error);
    return;
  }

  let totalKills = 0;
  let matches = data.length;

  data.forEach(row => {
    totalKills += row.kills || 0;
  });

  const kd = matches > 0 ? (totalKills / matches).toFixed(2) : "0.00";

  document.getElementById("userKills").innerText = totalKills;
  document.getElementById("userMatches").innerText = matches;
  document.getElementById("userKD").innerText = kd;
}
await loadProfile();
await loadStats();

/* EDIT / SAVE LOGIC */

const editBtn = document.getElementById("editProfileBtn");
const teamSpan = document.getElementById("userTeam");
const ignSpan = document.getElementById("userIgn");
const teamInput = document.getElementById("teamInput");
const ignInput = document.getElementById("ignInput");

let editMode = false;

editBtn.addEventListener("click", async () => {

  if (!editMode) {

    // ⛔ 14 DAY RULE
    if (lastUpdateDate) {
      const last = new Date(lastUpdateDate);
      const now = new Date();
      const diffDays = (now - last) / (1000 * 60 * 60 * 24);

      if (diffDays < 14) {
        alert("You can update team name only once every 14 days.");
        return;
      }
    }

    // 👉 ENTER EDIT MODE
    editMode = true;
    editBtn.textContent = "Save";

    teamInput.value = teamSpan.textContent;
    ignInput.value = ignSpan.textContent;

    teamSpan.classList.add("hidden");
    ignSpan.classList.add("hidden");

    teamInput.classList.remove("hidden");
    ignInput.classList.remove("hidden");

  } else {

    const newTeam = teamInput.value.trim();
    const newIgn = ignInput.value.trim();

    if (!newTeam || !newIgn) {
      alert("Both fields are required");
      return;
    }

    // 🔍 CHECK UNIQUE TEAM NAME
    const { data: existingTeam } = await supabase
      .from("profiles")
      .select("id")
      .eq("team_name", newTeam)
      .neq("id", userId)
      .maybeSingle();

    if (existingTeam) {
      alert("Team name already taken");
      return;
    }

    // 🔄 UPDATE PROFILE
    editBtn.disabled = true;
    editBtn.textContent = "Saving...";

    const { error } = await supabase
      .from("profiles")
      .update({
        team_name: newTeam,
        in_game_name: newIgn,
        last_name_update: new Date()
      })
      .eq("id", userId);

    editBtn.disabled = false;

    if (error) {
      alert("Error updating profile");
      console.error(error);
      return;
    }

    alert("Profile updated successfully");

    // 👉 EXIT EDIT MODE
    editMode = false;
    editBtn.textContent = "Edit Profile";

    teamSpan.classList.remove("hidden");
    ignSpan.classList.remove("hidden");

    teamInput.classList.add("hidden");
    ignInput.classList.add("hidden");

    await loadProfile();
  }
});


function removeSkeleton(id) {
  document.getElementById(id).classList.remove("skeleton-text");
}


/* BACK BUTTON */

document.getElementById("backBtn")
  ?.addEventListener("click", () => {
    window.history.back();
  });

/* LOGOUT */

document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/index.html";
  });