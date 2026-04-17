import { loadUserPoints } from "./sidebar.js";

fetch('/sidebar.html') // also fixed path here
  .then(res => res.text())
  .then(data => {
    document.getElementById("sidebar-container").innerHTML = data;

    // Load user points
    loadUserPoints();

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