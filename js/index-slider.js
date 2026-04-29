const arr=['BGMI Squad Showdown','Red Line Clash Cup','Silver Night League','Legend Battle Arena','Classic Weekend Cup','Royal Pro Faceoff'];
    const box=document.getElementById('tourList');
    arr.forEach(t=>box.innerHTML+=`
    <div class='card'>
    <h4>${t}</h4>
    <p class='muted'>Entry starts now. Limited slots available.</p>
    <a class='btn btn1' href='/join.html' style='margin-top:12px'>Join Now</a>
    </div>`
);
const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting)e.target.classList.add('show')
    }
),{threshold:.15});
document.querySelectorAll('.reveal').forEach(x=>io.observe(x));
        
const slides = [
  {name:'Royal Warrior Finals',     prize:'₹8000 Prize Pool', sub:'16 Teams'},
  {name:'Classic Cup',   prize:'16 Teams Open',       sub:'Weekend Event'},
  {name:'Silver Night League', prize:'Weekend Battles',     sub:'Open Entry'},
  {name:'Red Line Clash',      prize:'Fast Registration',   sub:'16 Teams'},
  {name:'Pro League Cup',   prize:'Advance Tournament',      sub:'₹8,000 Pool'},
  {name:'Legend Arena',       prize:'Pro Rooms',           sub:'₹20,000 Pool'},
  {name:'Silver Night',      prize:'Fun Event',           sub:'Open Entry'},
];

const N = slides.length;
function sidx(i){ return ((i % N) + N) % N; }

// slot -2..+2, plus slot +3 for the waiting card just off screen right
const SLOTS = {
  '-2': {x:-290, s:0.65, o:0.38, z:1},
  '-1': {x:-150, s:0.80, o:0.70, z:2},
   '0': {x:   0, s:1.00, o:1.00, z:10},
   '1': {x: 150, s:0.80, o:0.70, z:2},
   '2': {x: 290, s:0.65, o:0.38, z:1},
   '3': {x: 430, s:0.52, o:0.00, z:0},  // hidden staging area
  '-3': {x:-430, s:0.52, o:0.00, z:0},  // hidden exit area
};

const sw = document.getElementById('sw');
const dotsEl = document.getElementById('dots');
let center = 0;
let busy = false;
let cards = [];

function cardHTML(s) {
  return `<div class="ci">
    <div class="cf">
      <div style="background:linear-gradient(transparent,rgba(0,0,0,.9));padding:16px 14px;border-radius:0 0 18px 18px">
        <div style="color:#fff;font-weight:700;font-size:15px">${s.name}</div>
        <div style="color:#aaa;font-size:12px;margin-top:2px">Limited slots available</div>
      </div>
    </div>
    <div class="cb">
      <div style="color:#32d46b;font-weight:700;font-size:16px">${s.name}</div>
      <div style="color:#32d46b;font-size:20px;font-weight:800">${s.prize}</div>
      <div style="color:#aaa;font-size:13px">${s.sub}</div>
      <a href="/join.html" style="margin-top:6px;background:#32d46b;color:#000;padding:8px 18px;border-radius:12px;font-weight:700;font-size:13px;text-decoration:none">Join Now</a>
    </div>
  </div>`;
}

function placeCard(el, slot, instant) {
  const p = SLOTS[String(slot)];
  if (instant) {
    el.style.transition = 'none';
  } else {
    el.style.transition = 'transform 0.7s ease, opacity 0.7s ease';
  }
  el.style.transform = `translateX(${p.x}px) scale(${p.s})`;
  el.style.opacity = p.o;
  el.style.zIndex = p.z;
}

function setFlip(card, flipped, instant) {
  card.inner.style.transition = instant ? 'none' : 'transform 0.7s ease';
  card.inner.style.transform = flipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
  card.flipped = flipped;
}

function buildDots() {
  dotsEl.innerHTML = '';
  slides.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'dot' + (i === center ? ' on' : '');
    dotsEl.appendChild(d);
  });
}

function createCard(slideIdx, slot, flipped) {
  const s = slides[sidx(slideIdx)];
  const el = document.createElement('div');
  el.className = 'oc';
  el.innerHTML = cardHTML(s);
  const inner = el.querySelector('.ci');
  // set flip instantly
  inner.style.transition = 'none';
  inner.style.transform = flipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
  // set position instantly
  placeCard(el, slot, true);
  sw.appendChild(el);
  return { el, inner, slideIdx, slot, flipped };
}

function init() {
  sw.innerHTML = '';
  cards = [];
  // slots -2 to +2 = 5 visible cards
  // also pre-create slot +3 (the next incoming, hidden off-screen right)
  for (let slot = -2; slot <= 3; slot++) {
    const c = createCard(center + slot, slot, slot === 0);
    cards.push(c);
  }
  buildDots();
}

function advance() {
  if (busy) return;
  busy = true;

  center = (center + 1) % N;
  buildDots();

  // Force reflow so all instant placements are committed
  sw.offsetHeight;

  const toRemove = [];

  cards.forEach(c => {
    c.slot -= 1;

    if (c.slot < -2) {
      // animate to -3 (off screen left) then remove
      placeCard(c.el, -3, false);
      toRemove.push(c);
    } else {
      placeCard(c.el, c.slot, false);
      if (c.slot === 0)  setFlip(c, true, false);   // entering center → flip to back
      if (c.slot === -1 && c.flipped) setFlip(c, false, false); // leaving center → flip to front
    }
  });

  // After transition, remove off-screen cards and add next incoming card at slot +3
  setTimeout(() => {
    toRemove.forEach(c => c.el.remove());
    cards = cards.filter(c => c.slot >= -2);

    // Add next card waiting at slot +3 (hidden, ready for next cycle)
    const nextCard = createCard(center + 3, 3, false);
    cards.push(nextCard);

    busy = false;
  }, 750);
}

init();
setInterval(advance, 3000);