// ===================== kontrol, drag, list, init =====================
function evX(e) { try { return e.getX(); } catch (err) { return e.x || 0; } }
function evY(e) { try { return e.getY(); } catch (err) { return e.y || 0; } }

function solveAll() {
  st.sols = (st.mode === 'kick')
    ? solveKick(st.C, st.O, st.P, TW, TH, st.maxRails)
    : solveBank(st.O, st.P, st.C, TW, TH, st.maxRails);
  if (st.sel >= st.sols.length) st.sel = 0;
  pushItems();
}

function pushItems() {
  var items = [], i, s;
  for (i = 0; i < st.sols.length; i++) {
    s = st.sols[i];
    items.push({
      tag: s.rails.length ? s.rails.join(' > ') : 'direct',
      m1: 'aim ' + s.aim.toFixed(1) + '  cut ' + s.cut.toFixed(1),
      m2: 'len ' + s.len.toFixed(2) + '  score ' + s.score.toFixed(1),
      bg: (i === st.sel) ? '#331F6FEB' : '#00000000'
    });
  }
  ui.run(function () {
    try { win.lv.setDataSource(items); } catch (e) { lastDrawError = 'list: ' + e; }
    try { win.lbl.text((st.mode === 'kick' ? 'KICK' : 'BANK') + ' | ' + st.sols.length + ' sol | #' + (st.sols.length ? st.sel + 1 : 0)); } catch (e) {}
  });
}

// ---- tombol ----
win.bMode.on('click', function () {
  st.mode = (st.mode === 'kick') ? 'bank' : 'kick';
  win.bMode.text(st.mode === 'kick' ? 'KICK' : 'BANK');
  solveAll();
});
win.bRails.on('click', function () {
  st.maxRails = (st.maxRails >= 5) ? 1 : st.maxRails + 1;
  win.bRails.text('rails ' + st.maxRails);
  solveAll();
});
win.bShoot.on('click', function () { shootSelected(); });
win.bExit.on('click', function () { win.close(); engines.stopAll(); });

// ---- pilih solusi ----
win.lv.on('item_click', function (item, position) {
  st.sel = position;
  pushItems();
});

// ---- canvas: gambar + drag ----
win.cv.setMaxFps(15);
win.cv.on('draw', function (canvas, view) { renderFrame(canvas); });

var dragK = null;
win.cv.on('touch_down', function (e) {
  var px = evX(e), py = evY(e), ks = ['C', 'O', 'P', 'X', 'A'], best = null, bd = 1e9, i, d;
  for (i = 0; i < ks.length; i++) {
    d = Math.hypot(sx(st[ks[i]][0]) - px, sy(st[ks[i]][1]) - py);
    if (d < bd) { bd = d; best = ks[i]; }
  }
  dragK = (bd <= dp(26)) ? best : null;
});
win.cv.on('touch_move', function (e) {
  if (!dragK) return;
  st[dragK] = clampP(evX(e), evY(e));
});
win.cv.on('touch_up', function () {
  if (!dragK) return;
  dragK = null;
  solveAll();
});

// ---- init ----
if (!auto.service) { toast('Aksesibilitas belum aktif — drag & solver jalan, SHOOT belum'); }
solveAll();
toast('8bp overlay aktif (v4) — tarik C/O/P/X/A, tap solusi, SHOOT');
setInterval(function () {}, 1000);   // tahan window tetap hidup
