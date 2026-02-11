function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("active");
}

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

  loadUserPoints();