import { supabase } from "./supabase.js";

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("active");
}

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

