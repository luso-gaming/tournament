import { supabase } from "./supabase.js";
import { loadUserPoints } from "./sidebar.js";

fetch('/sidebar.html')
  .then(res => res.text())
  .then(async (data) => {
    document.getElementById("sidebar-container").innerHTML = data;
 
    loadUserPoints();
 
    await handleAuthUI();
 
    supabase.auth.onAuthStateChange(() => {
      handleAuthUI();
    });

    (function () {
      var banner = document.getElementById('cookie-banner');
      var consent = localStorage.getItem('luso_cookie_consent');
   
      // Only show if user hasn't decided yet
      if (!consent) {
        setTimeout(function () {
          banner.classList.add('show');
        }, 800);
      }
   
      document.getElementById('cookie-accept').addEventListener('click', function () {
        localStorage.setItem('luso_cookie_consent', 'accepted');
        banner.style.transition = 'transform 0.3s ease';
        banner.style.transform = 'translateY(100%)';
        // Enable Google Analytics if you want (optional)
        // window['ga-disable-UA-XXXXXXXX-X'] = false;
      });
   
      document.getElementById('cookie-decline').addEventListener('click', function () {
        localStorage.setItem('luso_cookie_consent', 'declined');
        banner.style.transition = 'transform 0.3s ease';
        banner.style.transform = 'translateY(100%)';
        // Disable Google Analytics tracking on decline (optional)
        // window['ga-disable-UA-XXXXXXXX-X'] = true;
      });
    })();
  })
  .catch(err => console.error("Sidebar load error:", err));



async function handleAuthUI() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const loginBtn = document.getElementById("loginBtn");
  const accountBtn = document.getElementById("accountBtn");
  const avatar = document.getElementById("navAvatar");

  if (!loginBtn || !accountBtn) return;

  if (user) {
    loginBtn.style.display = "none";
    accountBtn.style.display = "flex";

    const avatarUrl =
      user.user_metadata?.avatar_url ||
      `https://ui-avatars.com/api/?name=${user.email}`;

    if (avatar) avatar.src = avatarUrl;

  } else {
    loginBtn.style.display = "flex";
    accountBtn.style.display = "none";
  }
}