import { supabase } from "/js/supabase.js";

window.onerror = function (message, source, lineno, colno, error) {
  console.error("🚨 JS CRASH");
  console.error("Message:", message);
  console.error("Source:", source);
  console.error("Line:", lineno);
  console.error("Column:", colno);
  console.error("Error:", error);
};

window.addEventListener("unhandledrejection", (event) => {
  console.error("🚨 PROMISE ERROR");
  console.error(event.reason);
});

console.log("✅ Logged in 1");
const SLICES = [
  { label: '10%', discount: 10, color: '#1a1f35', text: '#7eb8f7' },
  { label: '50%', discount: 50, color: '#2a1a10', text: '#ffb830' },
  { label: '20%', discount: 20, color: '#0f2a1a', text: '#22d07a' },
  { label: '5%',  discount: 5,  color: '#1a1220', text: '#cc88ff' },
  { label: '30%', discount: 30, color: '#1a1025', text: '#ff88cc' },
  { label: '15%', discount: 15, color: '#0d1f2d', text: '#55ccff' },
  { label: '25%', discount: 25, color: '#2a1508', text: '#ff9955' },
  { label: '10%', discount: 10, color: '#1a1f35', text: '#7eb8f7' },
];

const NUM_SLICES = SLICES.length;
const SLICE_ARC  = (2 * Math.PI) / NUM_SLICES;

// ─── STATE ────────────────────────────────────────────────
let currentAngle   = 0;
let spinning       = false;
let spinsAvailable = 0;
let currentUser    = null;  

// ─── DOM REFS ─────────────────────────────────────────────
const canvas         = document.getElementById('wheelCanvas');
const ctx            = canvas.getContext('2d');
const spinBtn        = document.getElementById('spinBtn');
const btnText        = spinBtn.querySelector('.btn-text');
const btnLoader      = document.getElementById('btnLoader');
const spinsText      = document.getElementById('spinsText');
const resultPanel    = document.getElementById('resultPanel');
const historySection = document.getElementById('historySection');

// popup elements
const popup          = document.getElementById('spinPopup');
const popupIcon      = document.getElementById('popupIcon');
const popupTitle     = document.getElementById('popupTitle');
const popupMsg       = document.getElementById('popupMsg');
const popupClose     = document.getElementById('popupClose');

function showPopup(type) {
  console.log("✅ Logged in 2");
  if (type === 'login') {
    popupIcon.textContent  = '🔒';
    popupTitle.textContent = 'Login to Spin';
    popupMsg.textContent   = 'You need to be logged in to spin the wheel and win discounts.';
    popupClose.textContent = 'Login';
    popupClose.onclick     = () => {
      hidePopup();
      document.querySelector('.auth-login-btn, .login-btn, [data-auth="login"]')?.click();
    };
  } else if (type === 'nospins') {
    popupIcon.textContent  = '🎯';
    popupTitle.textContent = 'No Spins Left';
    popupMsg.textContent   = "You don't have any spins left. Complete challenges or wait for an admin to add more spins to your account.";
    popupClose.textContent = 'Got it';
    popupClose.onclick     = hidePopup;
  } else {
    popupIcon.textContent  = '⚠️';
    popupTitle.textContent = 'Something went wrong';
    popupMsg.textContent   = 'Could not process your spin. Please try again.';
    popupClose.textContent = 'Close';
    popupClose.onclick     = hidePopup;
  }
  popup.classList.add('show');
}

function hidePopup() {
  console.log("✅ Logged in 3");
  popup.classList.remove('show');
}

// Close popup when clicking the dark overlay
popup.addEventListener('click', (e) => {
  if (e.target === popup) hidePopup();
});

// ─── DRAW WHEEL ───────────────────────────────────────────
function drawWheel(angle) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r  = cx - 4;
console.log("✅ Logged in 4");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < NUM_SLICES; i++) {
    const start = angle + i * SLICE_ARC;
    const end   = start + SLICE_ARC;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = SLICES[i].color;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + SLICE_ARC / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = SLICES[i].text;
    ctx.font = '700 15px Syne, sans-serif';
    ctx.fillText(SLICES[i].label, r - 14, 6);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ─── ANIMATE TO SLICE ─────────────────────────────────────
function animateToSlice(targetIndex, onComplete) {
  const extraFullSpins = 5 + Math.random() * 4;
  const sliceMidAngle  = targetIndex * SLICE_ARC + SLICE_ARC / 2;
  const targetAngle    = currentAngle
    - ((currentAngle + sliceMidAngle) % (2 * Math.PI))
    - (2 * Math.PI * extraFullSpins);
console.log("✅ Logged in 5");
  const duration   = 4500;
  const startTime  = performance.now();
  const startAngle = currentAngle;

  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

  function frame(now) {
    console.log("✅ Logged in 6");
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    currentAngle   = startAngle + (targetAngle - startAngle) * easeOut(progress);
    drawWheel(currentAngle);
    if (progress < 1) { requestAnimationFrame(frame); } else { onComplete(); }
  }

  requestAnimationFrame(frame);
}

// ─── UPDATE SPINS BADGE ───────────────────────────────────
function updateSpinsUI(count) {
  spinsAvailable = count;
  console.log("✅ Logged in 7");
  if (!currentUser) {
    spinsText.innerHTML = 'Login to see your spins';
  } else if (count > 0) {
    spinsText.innerHTML = `<strong>${count}</strong> spin${count > 1 ? 's' : ''} available`;
  } else {
    spinsText.innerHTML = '<strong>0</strong> spins available';
  }
}

// ─── SHOW RESULT PANEL ────────────────────────────────────
function showResult(discount, couponCode) {
  console.log("✅ Logged in 8");
  document.getElementById('resultDiscount').textContent = discount + '% off';
  document.getElementById('couponCode').textContent = couponCode;
  document.getElementById('confettiRow').textContent =
    discount >= 40 ? '🎉🏆🎉' : discount >= 25 ? '🎊✨🎊' : '🎁✨🎁';
  resultPanel.style.display = 'block';
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── LOAD HISTORY ─────────────────────────────────────────
async function loadHistory() {
  if (!currentUser) return;
console.log("✅ Logged in 9");
  const { data, error } = await supabase
    .from('spin_history')
    .select('coupon_code, discount_percent, is_used, created_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) return;
console.log("✅ Logged in 10");
  historySection.style.display = 'block';
  document.getElementById('historyList').innerHTML = data.map(row => `
    <div class="history-item">
      <span class="h-coupon">${row.coupon_code}</span>
      <div class="h-right">
        <span class="h-discount">${row.discount_percent}% off</span>
        <span class="h-badge ${row.is_used ? 'used' : 'active'}">
          ${row.is_used ? 'Used' : 'Active'}
        </span>
      </div>
    </div>
  `).join('');
}

// ─── LOAD USER & SPINS ────────────────────────────────────
async function loadUserData() {
  console.log("=== LOAD USER DATA START ===");
console.log("✅ Logged in 11");
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  console.log("USER:", user);
  console.log("USER ERROR:", userError);

  if (!user) {
    console.log("❌ NO USER FOUND");

    currentUser = null;
    updateSpinsUI(0);
    return;
  }

  currentUser = user;

  console.log("✅ Logged in user:", user.id);

  const { data: spinData, error: spinError } = await supabase
    .from('user_spins')
    .select('*')
    .eq('user_id', user.id)
    .single();

  console.log("SPIN DATA:", spinData);
  console.log("SPIN ERROR:", spinError);

  updateSpinsUI(spinData?.spins_available ?? 0);

  await loadHistory();

  console.log("=== LOAD USER DATA END ===");
}

// ─── SPIN BUTTON CLICK ────────────────────────────────────
spinBtn.addEventListener('click', async () => {
  if (spinning) return;

  // ── Guard 1: Not logged in ──
  if (!currentUser) {
    showPopup('login');
    return;
  }

  // ── Guard 2: No spins left ──
  if (spinsAvailable <= 0) {
    showPopup('nospins');
    return;
  }
console.log("✅ Logged in 12");
  // ── Proceed with spin ──
  spinning = true;
  spinBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'flex';

  const { data, error } = await supabase.rpc('do_spin', {
    p_user_id: currentUser.id
  });

  btnText.style.display = 'inline';
  btnLoader.style.display = 'none';

  if (error || !data) {
    showPopup('error');
    spinning = false;
    spinBtn.disabled = false;
    return;
  }

  if (!data.success) {
    // Double-check from server (race condition safety)
    showPopup('nospins');
    updateSpinsUI(0);
    spinning = false;
    spinBtn.disabled = false;
    return;
  }

  // Animate wheel to the slice Supabase returned
  const winnerIndex = SLICES.findIndex(s => s.discount === data.discount);
  const safeIndex   = winnerIndex >= 0 ? winnerIndex : 0;

  animateToSlice(safeIndex, async () => {
    console.log("✅ Logged in 13");
    showResult(data.discount, data.coupon_code);
    updateSpinsUI(data.spins_remaining);
    spinning = false;
    spinBtn.disabled = false;
    await loadHistory();
  });
});

// ─── COPY BUTTON ─────────────────────────────────────────
document.getElementById('copyBtn').addEventListener('click', () => {
  const code = document.getElementById('couponCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const confirm = document.getElementById('copyConfirm');
    confirm.style.display = 'block';
    setTimeout(() => { confirm.style.display = 'none'; }, 2000);
  });
});

// ─── LISTEN FOR AUTH CHANGES (login/logout in header) ─────
// This makes the page react when user logs in via your header
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log("AUTH EVENT:", event);
  console.log("SESSION:", session);
console.log("✅ Logged in 14");
  if (event === 'SIGNED_IN' && session?.user) {
    currentUser = session.user;

    const { data: spinData, error } = await supabase
      .from('user_spins')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    console.log("SIGNED IN USER:", session.user.id);
    console.log("SPIN DATA:", spinData);
    console.log("SPIN ERROR:", error);

    updateSpinsUI(spinData?.spins_available ?? 0);

    await loadHistory();
  }

  if (event === 'SIGNED_OUT') {
    console.log("❌ USER SIGNED OUT");

    currentUser = null;
    updateSpinsUI(0);

    historySection.style.display = 'none';
  }
});

// ─── INIT ─────────────────────────────────────────────────
drawWheel(0);

supabase.auth.onAuthStateChange(async (event, session) => {
  console.log("AUTH EVENT:", event);
  console.log("SESSION:", session);

  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {

    if (session?.user) {
      currentUser = session.user;
      console.log("✅ USER:", session.user.id);

      // Check if user_spins row exists, create it if not
      let { data: spinData, error: spinError } = await supabase
        .from('user_spins')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      console.log("SPIN DATA:", spinData);
      console.log("SPIN ERROR:", spinError);

      // If no row exists, create one with 1 free spin
      if (!spinData) {
        const { data: newRow, error: insertError } = await supabase
          .from('user_spins')
          .insert({ user_id: session.user.id, spins_available: 1 })
          .select()
          .single();

        console.log("CREATED SPIN ROW:", newRow);
        console.log("INSERT ERROR:", insertError);
        spinData = newRow;
      }

      updateSpinsUI(spinData?.spins_available ?? 0);
      await loadHistory();

    } else {
      // INITIAL_SESSION with no user = not logged in
      currentUser = null;
      updateSpinsUI(0);
    }

  } else if (event === 'SIGNED_OUT') {
    console.log("❌ SIGNED OUT");
    currentUser = null;
    updateSpinsUI(0);
    historySection.style.display = 'none';
  }
});