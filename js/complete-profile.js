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
    document.getElementById("teamName").value.trim();

  const ign =
    document.getElementById("ign").value.trim();

  const ageConfirm =
    document.getElementById("ageConfirm").checked;

  const termsPrivacy =
    document.getElementById("termsPrivacy").checked;

  resetButton();

  messageBox.classList.remove(
    "success-message",
    "error-message"
  );

  // =========================
  // EMPTY FIELD CHECK
  // =========================

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

  // =========================
  // AGE CHECK
  // =========================

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

  // =========================
  // TERMS + PRIVACY CHECK
  // =========================

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

  // =========================
  // LOADING
  // =========================

  saveBtn.classList.add("loading");

  // =========================
  // GET CURRENT LEGAL VERSIONS
  // =========================

  const {
    data: legalDocuments,
    error: legalError
  } = await supabase
    .from("legal_documents")
    .select("document_type, current_version")
    .in("document_type", ["terms", "privacy"]);

  if (legalError) {

    console.error("Legal documents error:", legalError);

    resetButton();
    saveBtn.classList.add("error");

    messageBox.innerHTML =
      "<p>Unable to verify the current Terms and Privacy Policy. Please try again.</p>";

    messageBox.classList.add("error-message");

    setTimeout(() => {
      saveBtn.classList.remove("error");
      saveBtn.classList.add("retry");
    }, 700);

    return;
  }

  // =========================
  // FIND TERMS + PRIVACY
  // =========================

  const termsDocument =
    legalDocuments.find(
      document => document.document_type === "terms"
    );

  const privacyDocument =
    legalDocuments.find(
      document => document.document_type === "privacy"
    );

  if (!termsDocument || !privacyDocument) {

    console.error(
      "Missing legal document:",
      legalDocuments
    );

    resetButton();
    saveBtn.classList.add("error");

    messageBox.innerHTML =
      "<p>Terms or Privacy Policy version is unavailable. Please try again later.</p>";

    messageBox.classList.add("error-message");

    setTimeout(() => {
      saveBtn.classList.remove("error");
      saveBtn.classList.add("retry");
    }, 700);

    return;
  }

  const termsVersion =
    termsDocument.current_version;

  const privacyVersion =
    privacyDocument.current_version;

  // =========================
  // CONSENT TIMESTAMPS
  // =========================

  const consentTime =
    new Date().toISOString();

  // =========================
  // CHECK TEAM NAME
  // =========================

  const {
    data: existingTeam,
    error: teamCheckError
  } = await supabase
    .from("profiles")
    .select("id")
    .eq("team_name", teamName)
    .neq("id", userId)
    .maybeSingle();

  if (teamCheckError) {

    console.error(
      "Team check error:",
      teamCheckError
    );

    resetButton();
    saveBtn.classList.add("error");

    messageBox.innerHTML =
      "<p>Unable to check team name. Please try again.</p>";

    messageBox.classList.add("error-message");

    setTimeout(() => {
      saveBtn.classList.remove("error");
      saveBtn.classList.add("retry");
    }, 700);

    return;
  }

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

  // =========================
  // SAVE PROFILE + CONSENTS
  // =========================

  const { error } = await supabase
    .from("profiles")
    .update({

      // Profile
      team_name: teamName,
      in_game_name: ign,

      // Age consent
      age_confirmed: true,
      age_consented_at: consentTime,

      // Terms consent
      terms_version_accepted: termsVersion,
      terms_consented_at: consentTime,

      // Privacy consent
      privacy_version_accepted: privacyVersion,
      privacy_consented_at: consentTime

    })
    .eq("id", userId);

  resetButton();

  // =========================
  // SAVE ERROR
  // =========================

  if (error) {

    console.error(
      "Profile save error:",
      error
    );

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

  // =========================
  // SUCCESS
  // =========================

  saveBtn.classList.add("success");

  messageBox.innerHTML =
    "<p>Profile completed successfully.</p>";

  messageBox.classList.add("success-message");

  setTimeout(() => {
    window.location.href = "/index.html";
  }, 1500);

});