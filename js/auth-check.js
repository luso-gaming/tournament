import { supabase } from "./supabase.js";

async function checkAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    window.location.href = "/login.html";
    return;
  }

  const userId = session.user.id;

  // 🔐 CHECK USER STATUS FROM DATABASE
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    console.error(profileError);
    return;
  }

  // 🚫 BLOCK IF NOT ACTIVE
  if (profile.status !== "active") {
    alert("Your account is suspended or deactivated.");

    await supabase.auth.signOut();
    window.location.href = "/login.html";
    return;
  }

  // ✅ USER IS SAFE → OPTIONAL UI
  const emailEl = document.getElementById("userEmail");
  if (emailEl) {
    emailEl.innerText = session.user.email;
  }
}

checkAuth();