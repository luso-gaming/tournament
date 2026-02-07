import { supabase } from "./supabase.js";

/*  AUTH CHECK  */

const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  window.location.href = "/login.html";
}

/*  USER INFO  */

document.getElementById("userEmail").textContent = session.user.email;
document.getElementById("userName").textContent =
  session.user.user_metadata?.full_name || "Not provided";

/*  CHANGE PASSWORD  */

document
  .getElementById("changePasswordBtn")
  .addEventListener("click", async () => {

    const newPassword = document.getElementById("newPassword").value.trim();

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Password updated successfully");
      document.getElementById("newPassword").value = "";
    }
  });

/*  LOGOUT  */

document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/index.html";
  });
