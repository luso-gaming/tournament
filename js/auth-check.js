async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  // User is logged in
  document.getElementById("userEmail").innerText =
    session.user.email;
}

checkAuth();
