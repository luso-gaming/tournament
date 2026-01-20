import { supabase } from "./supabase.js";

async function updateAuthUI() {
  const { data: { session } } = await supabase.auth.getSession();

  const loginBtn = document.getElementById("loginBtn");
  const accountBtn = document.getElementById("accountBtn");

  if (session) {
    if (loginBtn) loginBtn.style.display = "none";
    if (accountBtn) accountBtn.style.display = "inline-block";
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (accountBtn) accountBtn.style.display = "none";
  }
}

// Run on load
updateAuthUI();

// React to login/logout instantly
supabase.auth.onAuthStateChange(() => {
  updateAuthUI();
});
