import { supabase } from "./supabase.js";

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  sidebar.classList.toggle("active");

  if (overlay) {
    overlay.classList.toggle("active"); // ✅ added safely
  }
}
window.toggleSidebar = toggleSidebar;

document.addEventListener("click", function (e) {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (
    sidebar &&
    sidebar.classList.contains("active") &&
    !sidebar.contains(e.target) &&
    !e.target.closest(".menu-btn")
  ) {
    sidebar.classList.remove("active");

    if (overlay) {
      overlay.classList.remove("active");
    }
  }
});
/*  USER POINTS  */

export async function loadUserPoints() {
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

  const pointsEl = document.getElementById("userPoints");
  if (pointsEl) {
    pointsEl.innerText = data.points;
  }
}

