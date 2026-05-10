import { supabase } from "./supabase.js";

const {
  data: { session }
} = await supabase.auth.getSession();

if (!session) {
  window.location.href = "/login.html";
}

const userId = session.user.id;

document
  .getElementById("saveBtn")
  .addEventListener("click", async () => {

    const teamName =
      document.getElementById("teamName")
      .value
      .trim();

    const ign =
      document.getElementById("ign")
      .value
      .trim();

    if (!teamName || !ign) {
      alert("All fields are required");
      return;
    }

    // CHECK UNIQUE TEAM NAME
    const { data: existingTeam } = await supabase
      .from("profiles")
      .select("id")
      .eq("team_name", teamName)
      .neq("id", userId)
      .maybeSingle();

    if (existingTeam) {
      alert("Team name already taken");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        team_name: teamName,
        in_game_name: ign
      })
      .eq("id", userId);

    if (error) {
      alert("Error saving profile");
      console.error(error);
      return;
    }

    window.location.href = "/index.html";
});