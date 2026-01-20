// Initialize Supabase
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check login and admin role
async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    alert("You must log in!");
    window.location.href = "/login.html";
    return;
  }

  // Save user in your users table if not exists
  const email = session.user.email;
  const username = session.user.user_metadata.full_name;

  await supabase.from('users').upsert(
    { id: session.user.id, email, username },
    { onConflict: 'id' }
  );

  // Check admin role
  const { data: user, error } = await supabase
    .from('users')
    .select('role,email')
    .eq('id', session.user.id)
    .single();

  if (!user || user.role !== 'admin') {
    alert("You are not authorized to access this page.");
    window.location.href = "/";
    return;
  }

  document.getElementById("adminEmail").textContent = "Logged in as: " + user.email;

  // Load existing tournaments
  loadTournaments();
}

// Load tournaments
async function loadTournaments() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  const container = document.getElementById('tournamentsContainer');
  container.innerHTML = "";

  if (error) return console.error(error);

  data.forEach(t => {
    const div = document.createElement('div');
    div.textContent = `${t.name} - ${t.date} ${t.time}`;
    container.appendChild(div);
  });
}

// Handle tournament creation
document.getElementById("tournamentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value;
  const date = form.date.value;
  const time = form.time.value;
  const description = form.description.value;

  const { data, error } = await supabase
    .from('tournaments')
    .insert([{ name, date, time, description }]);

  if (error) return alert("Error creating tournament: " + error.message);

  alert("Tournament created successfully!");
  form.reset();
  loadTournaments();
});

// Logout button
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "/login.html";
});

// Run on page load
checkAdmin();
