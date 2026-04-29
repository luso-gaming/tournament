const rules = [
  { num:'01', title:'Fair Play',      body:'Any cheating, hacking, or bug exploiting is prohibited and results in immediate disqualification.' },
  { num:'02', title:'Team Roster',    body:'Each team needs 4-6 players. Roster changes are not allowed after registration closes.' },
  { num:'03', title:'Match Schedule', body:'Teams must be ready 10 minutes before match time. A 5-minute no-show results in a forfeit.' },
  { num:'04', title:'Communication',  body:'All official communication is via Discord. Teams are responsible for staying updated on announcements.' },
  { num:'05', title:'Prize Payout',   body:'Prizes are distributed within 7 business days. Winners must submit valid ID proof to claim.' },
  { num:'06', title:'Conduct',        body:'Toxic behavior or harassment in any form will result in a ban from current and future events.' },
  { num:'07', title:'Disputes',       body:'Disputes must be raised within 15 minutes of match end. Admin decisions are final and binding.' }
];

const N = rules.length;
function sidx(i) { return ((i % N) + N) % N; }

const SLOTS = {
  '-3': { x: -460, s: 0.40, o: 0,    z: 0  },
  '-2': { x: -268, s: 0.58, o: 0.35, z: 1  },
  '-1': { x: -144, s: 0.76, o: 0.65, z: 2  },
   '0': { x:    0, s: 1.00, o: 1.00, z: 10 },
   '1': { x:  144, s: 0.76, o: 0.65, z: 2  },
   '2': { x:  268, s: 0.58, o: 0.35, z: 1  },
   '3': { x:  460, s: 0.40, o: 0,    z: 0  }
};

const sw = document.getElementById('sw');
const dotsEl = document.getElementById('dots');
let center = 0, busy = false, cards = [];

function lerp(x1, y1, x2, y2, t) {
  return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
}

function drawSegs(x1, y1, x2, y2, segs, col, w, op) {
  op = op === undefined ? 1 : op;
  return segs.map(function(seg) {
    var s = seg[0], e = seg[1];
    var a = lerp(x1, y1, x2, y2, s);
    var b = lerp(x1, y1, x2, y2, e);
    return '<line x1="' + a[0].toFixed(2) + '" y1="' + a[1].toFixed(2) +
           '" x2="' + b[0].toFixed(2) + '" y2="' + b[1].toFixed(2) +
           '" stroke="' + col + '" stroke-width="' + w +
           '" stroke-linecap="square" opacity="' + op + '"/>';
  }).join('');
}

var TWO_SEG   = [[0, 0.44], [0.56, 1]];
var THREE_SEG = [[0, 0.30], [0.37, 0.63], [0.70, 1]];

function buildSVG(W, H, active) {
  var col  = active ? '#b0b0b0' : '#5a1f2e';
  var col2 = active ? '#ffffff' : '#7a2f42';
  var bg   = '#080006';

  var cut = W * 0.28;
  var cx  = W / 2;

  var pts = [
    [cx,  0    ],
    [W,   cut  ],
    [W,   H-cut],
    [cx,  H    ],
    [0,   H-cut],
    [0,   cut  ]
  ];

  var ins = 7;
  var iPts = [
    [cx,      ins       ],
    [W - ins, cut + ins ],
    [W - ins, H-cut-ins ],
    [cx,      H - ins   ],
    [ins,     H-cut-ins ],
    [ins,     cut + ins ]
  ];

  // edges: 0=top-right diag, 1=right side, 2=bottom-right diag,
  //        3=bottom-left diag, 4=left side, 5=top-left diag
  var edgeSegs = [TWO_SEG, THREE_SEG, TWO_SEG, TWO_SEG, THREE_SEG, TWO_SEG];

  var outerLines = '', innerLines = '';
  for (var i = 0; i < 6; i++) {
    var p0 = pts[i],  p1 = pts[(i + 1) % 6];
    var ip0 = iPts[i], ip1 = iPts[(i + 1) % 6];
    var segs = edgeSegs[i];
    outerLines += drawSegs(p0[0], p0[1], p1[0], p1[1], segs, col2, 3.0);
    innerLines += drawSegs(ip0[0], ip0[1], ip1[0], ip1[1], segs, col, 1.5, 0.6);
  }

  var polyPts = pts.map(function(p) { return p.join(','); }).join(' ');

  // Diamond: wide & short, side tips aligned to card border slope
  var dH = 10;
  var alignedDW = (cx / cut) * dH * 0.95;

  // Top diamond centered on [cx, 0]
  var topDia = cx + ',' + (-dH) + ' ' +
               (cx + alignedDW) + ',0 ' +
               cx + ',' + dH + ' ' +
               (cx - alignedDW) + ',0';

  // Bottom diamond centered on [cx, H]
  var botDia = cx + ',' + (H - dH) + ' ' +
               (cx + alignedDW) + ',' + H + ' ' +
               cx + ',' + (H + dH) + ' ' +
               (cx - alignedDW) + ',' + H;

  return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"' +
    ' xmlns="http://www.w3.org/2000/svg"' +
    ' style="position:absolute;inset:0;display:block;overflow:visible">' +
    '<polygon points="' + polyPts + '" fill="' + bg + '"/>' +
    outerLines + innerLines +
    '<polygon points="' + topDia + '" fill="' + bg + '" stroke="' + col2 + '" stroke-width="2" stroke-linejoin="miter"/>' +
    '<polygon points="' + botDia + '" fill="' + bg + '" stroke="' + col2 + '" stroke-width="2" stroke-linejoin="miter"/>' +
    '</svg>';
}

function makeCardEl(ruleIdx, slot) {
  var r  = rules[sidx(ruleIdx)];
  var sp = SLOTS[String(slot)];
  var W  = 155, H = 360;
  var isCenter = slot === 0;
  var numColor  = isCenter ? '#e0e0e0' : '#5a2535';
  var divColor  = isCenter ? '#aaa'    : '#5a2535';
  var txtColor  = isCenter ? '#ccc'    : '#7a3545';

  var el = document.createElement('div');
  el.className = 'oc';
  el.style.cssText = 'width:' + W + 'px;height:' + H + 'px;margin-left:' + (-W/2) + 'px;' +
    'top:20px;transition:none;' +
    'transform:translateX(' + sp.x + 'px) scale(' + sp.s + ');' +
    'opacity:' + sp.o + ';z-index:' + sp.z + ';';

  var frontSVG = buildSVG(W, H, isCenter);
  var backSVG  = buildSVG(W, H, true);

  el.innerHTML =
    '<div class="ci">' +
      '<div class="cf" style="height:' + H + 'px">' +
        frontSVG +
        '<div style="position:absolute;left:0;right:0;top:30px;bottom:30px;' +
          'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
          'padding:0 18px;text-align:center;pointer-events:none">' +
          '<div style="font-size:48px;font-weight:700;color:' + numColor + ';line-height:1;font-family:Georgia,serif">' + r.num + '</div>' +
          '<div style="width:28px;height:1px;background:' + divColor + ';margin:10px auto"></div>' +
          '<div style="font-size:11px;font-weight:600;color:' + txtColor + ';letter-spacing:1.5px;text-transform:uppercase">' + r.title + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cb" style="height:' + H + 'px">' +
        backSVG +
        '<div style="position:absolute;left:0;right:0;top:30px;bottom:30px;' +
          'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
          'padding:0 20px;text-align:center;pointer-events:none">' +
          '<div style="font-size:10px;color:#aaa;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Rule ' + r.num + '</div>' +
          '<div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">' + r.title + '</div>' +
          '<div style="width:20px;height:1px;background:#888;margin-bottom:10px"></div>' +
          '<div style="font-size:10.5px;color:#ccc;line-height:1.7">' + r.body + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  sw.appendChild(el);
  return { el: el, inner: el.querySelector('.ci'), ruleIdx: ruleIdx, slot: slot, flipped: false };
}

function placeCard(card, slot, animate) {
  var p = SLOTS[String(slot)];
  card.el.style.transition = animate ? 'transform 0.7s ease, opacity 0.7s ease' : 'none';
  card.el.style.transform  = 'translateX(' + p.x + 'px) scale(' + p.s + ')';
  card.el.style.opacity    = p.o;
  card.el.style.zIndex     = p.z;
  card.slot = slot;
}

function setFlip(card, flipped, animate) {
  card.inner.style.transition = animate ? 'transform 0.7s ease' : 'none';
  card.inner.style.transform  = flipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
  card.flipped = flipped;
}

function buildDots() {
  dotsEl.innerHTML = '';
  rules.forEach(function(_, i) {
    var d = document.createElement('div');
    d.className = 'dot' + (i === center ? ' on' : '');
    dotsEl.appendChild(d);
  });
}

function init() {
  sw.innerHTML = '';
  cards = [];
  for (var slot = -2; slot <= 3; slot++) {
    var c = makeCardEl(center + slot, slot);
    if (slot === 0) setFlip(c, true, false);
    cards.push(c);
  }
  buildDots();
}

function advance() {
  if (busy) return;
  busy = true;
  center = (center + 1) % N;
  buildDots();
  sw.offsetHeight;
  var toRemove = [];
  cards.forEach(function(c) {
    c.slot -= 1;
    if (c.slot < -2) {
      placeCard(c, -3, true);
      toRemove.push(c);
    } else {
      placeCard(c, c.slot, true);
      if (c.slot === 0)              setFlip(c, true, true);
      if (c.slot === -1 && c.flipped) setFlip(c, false, true);
    }
  });
  setTimeout(function() {
    toRemove.forEach(function(c) { c.el.remove(); });
    cards = cards.filter(function(c) { return c.slot >= -2; });
    cards.push(makeCardEl(center + 3, 3));
    busy = false;
  }, 750);
}

init();
setInterval(advance, 3200);