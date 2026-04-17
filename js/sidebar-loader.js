import { loadUserPoints } from "./sidebar.js";

fetch('/sidebar.html') // also fixed path here
  .then(res => res.text())
  .then(async (data) => {
    document.getElementById("sidebar-container").innerHTML = data;

    // Load user points
    loadUserPoints();

    await handleAuthUI();

    // ===== COOKIE POPUP =====
    const popup = document.getElementById("cookiePopup");
    if (!popup) return;

    const acceptBtn = popup.querySelector(".acceptButton");
    const declineBtn = popup.querySelector(".declineButton");

    // Hide if already selected
    if (localStorage.getItem("cookieConsent")) {
      popup.style.display = "none";
    }

    // Accept
    acceptBtn.addEventListener("click", () => {
      localStorage.setItem("cookieConsent", "accepted");
      popup.style.display = "none";
    });

    // Decline
    declineBtn.addEventListener("click", () => {
      localStorage.setItem("cookieConsent", "declined");
      popup.style.display = "none";
    });

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