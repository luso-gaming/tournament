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
    .select("team_name, in_game_name, points, last_name_update")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("userTeam").textContent =
    data.team_name || "Not set";

  document.getElementById("userIgn").textContent =
    data.in_game_name || "Not set";

  document.getElementById("userPoints").innerText =
    data.points || 0;

  lastUpdateDate = data.last_name_update;
}

await loadProfile();

/* EDIT / SAVE LOGIC */

const editBtn = document.getElementById("editProfileBtn");
const teamSpan = document.getElementById("userTeam");
const ignSpan = document.getElementById("userIgn");
const teamInput = document.getElementById("teamInput");
const ignInput = document.getElementById("ignInput");

let editMode = false;

editBtn.addEventListener("click", async () => {

  if (!editMode) {
    // CHECK 14 DAY RULE
    if (lastUpdateDate) {
      const last = new Date(lastUpdateDate);
      const now = new Date();
      const diffDays = (now - last) / (1000 * 60 * 60 * 24);

      if (diffDays < 14) {
        alert("You can update team name only once every 14 days.");
        return;
      }
    }

    // Switch to edit mode
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

    const { error } = await supabase
      .from("profiles")
      .update({
        team_name: newTeam,
        in_game_name: newIgn,
        last_name_update: new Date()
      })
      .eq("id", userId);

    if (error) {
      if (error.message.includes("unique")) {
        alert("Team name already taken");
      } else {
        alert("Error updating profile");
      }
      return;
    }

    alert("Profile updated successfully");

    editMode = false;
    editBtn.textContent = "Update";

    teamSpan.classList.remove("hidden");
    ignSpan.classList.remove("hidden");

    teamInput.classList.add("hidden");
    ignInput.classList.add("hidden");

    await loadProfile();
  }
});

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