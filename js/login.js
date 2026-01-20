import { supabase } from "./supabase.js";

const loginBtn = document.getElementById("googleLogin");

loginBtn.addEventListener("click", async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://www.lusoesports.in/auth.html"
    }
  });

  if (error) {
    alert("Login failed. Please try again.");
    console.error(error);
  }
});
