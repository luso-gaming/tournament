import { loadUserPoints } from "./sidebar.js";

fetch('../sidebar.html')
    .then(res => res.text())
    .then(data => {
        document.getElementById("sidebar-container").innerHTML = data;

        loadUserPoints();
    });
