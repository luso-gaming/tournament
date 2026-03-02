import { supabase } from "./supabase.js";

/*  AUTH CHECK  */

const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  window.location.href = "/login.html";
}

/*  USER INFO  */

document.getElementById("userEmail").textContent = session.user.email;
document.getElementById("userName").textContent =
  session.user.user_metadata?.full_name || "Not provided";
document.getElementById("userTeam").textContent =
  session.user.user_metadata?.team_name || "Not provided";
document.getElementById("userIgn").textContent =
  session.user.user_metadata?.in_game_name || "Not provided";

/*  USER POINTS  */
async function loadUserPoints() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", session.user.id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("userPoints").innerText = data.points;
}

document.getElementById("backBtn")
  ?.addEventListener("click", () => {
    window.history.back();
  });

/*  LOGOUT  */

document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/index.html";
  });

  loadUserPoints();
