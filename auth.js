import { supabase } from "./supabase.js";

const loginBtn = document.getElementById("googleLogin");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://www.lusoesports.in/auth.html"
      }
    });

    if (error) {
      alert(error.message);
      console.error(error);
    }
  });
}
