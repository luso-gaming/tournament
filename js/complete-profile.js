import { supabase } from "./supabase.js";

const {
  data: { session }
} = await supabase.auth.getSession();

if (!session) {
  window.location.href = "/login.html";
}

const userId = session.user.id;

const saveBtn = document.getElementById("saveBtn");
const messageBox = document.getElementById("formMessage");

function resetButton() {

  saveBtn.classList.remove(
    "success",
    "loading",
    "error",
    "retry"
  );

}

saveBtn.addEventListener("click", async () => {

  const teamName =
    document.getElementById("teamName")
    .value
    .trim();

  const ign =
    document.getElementById("ign")
    .value
    .trim();

  const ageConfirm =
    document.getElementById("ageConfirm")
    .checked;

  const termsPrivacy =
    document.getElementById("termsPrivacy")
    .checked;

  resetButton();

  messageBox.classList.remove(
    "success-message",
    "error-message"
  );

  // EMPTY CHECK

  if (!teamName || !ign) {

    saveBtn.classList.add("error");

    messageBox.innerHTML =
      "<p>Please fill all fields.</p>";

    messageBox.classList.add("error-message");

    setTimeout(() => {

      saveBtn.classList.remove("error");
      saveBtn.classList.add("retry");

    }, 700);

    return;
  }

  // AGE CHECK

  if (!ageConfirm) {

    saveBtn.classList.add("error");

    messageBox.innerHTML =
      "<p>You must confirm that you are 18 years or older.</p>";

    messageBox.classList.add("error-message");

    setTimeout(() => {

      saveBtn.classList.remove("error");
      saveBtn.classList.add("retry");

    }, 700);

    return;
  }

  // TERMS & PRIVACY CHECK

  if (!termsPrivacy) {

    saveBtn.classList.add("error");

    messageBox.innerHTML =
      "<p>Please agree to the Terms & Conditions and Privacy Policy.</p>";

    messageBox.classList.add("error-message");

    setTimeout(() => {

      saveBtn.classList.remove("error");
      saveBtn.classList.add("retry");

    }, 700);

    return;
  }

  // LOADING

  saveBtn.classList.add("loading");

  // CHECK TEAM

  const { data: existingTeam } = await supabase
    .from("profiles")
    .select("id")
    .eq("team_name", teamName)
    .neq("id", userId)
    .maybeSingle();

  if (existingTeam) {

    resetButton();

    saveBtn.classList.add("error");

    let countdown = 5;

    messageBox.innerHTML =
      `<p>Team name already taken. Try again in ${countdown}s</p>`;

    messageBox.classList.add("error-message");

    const timer = setInterval(() => {

      countdown--;

      messageBox.innerHTML =
        `<p>Team name already taken. Try again in ${countdown}s</p>`;

      if (countdown <= 0) {

        clearInterval(timer);

        resetButton();

        saveBtn.classList.add("retry");

        messageBox.innerHTML =
          "<p>Please try another team name.</p>";

      }

    }, 1000);

    return;
  }

  // SAVE PROFILE

  const { error } = await supabase
    .from("profiles")
    .update({
      team_name: teamName,
      in_game_name: ign
    })
    .eq("id", userId);

  resetButton();

  // SAVE ERROR

  if (error) {

    console.error(error);

    saveBtn.classList.add("error");

    let countdown = 5;

    messageBox.innerHTML =
      `<p>Error saving profile. Try again in ${countdown}s</p>`;

    messageBox.classList.add("error-message");

    const timer = setInterval(() => {

      countdown--;

      messageBox.innerHTML =
        `<p>Error saving profile. Try again in ${countdown}s</p>`;

      if (countdown <= 0) {

        clearInterval(timer);

        resetButton();

        saveBtn.classList.add("retry");

        messageBox.innerHTML =
          "<p>Please try again.</p>";

      }

    }, 1000);

    return;
  }

  // SUCCESS

  saveBtn.classList.add("success");

  messageBox.innerHTML =
    "<p>Profile completed successfully.</p>";

  messageBox.classList.add("success-message");

  setTimeout(() => {
    window.location.href = "/index.html";
  }, 1500);

});