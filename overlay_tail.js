// ====================== PART 3 : kontrol, drag, list, init ======================
if (typeof dp !== 'function') function dp(v) { return Math.round(v * dmDensity); }

var barX = 8, barY = tableWin.getY() + tableWin.getHeight() + 6;
var bMode = mkTile(barX, barY, 'KICK', '#FFFFFF', '#1F6FEB');
var bRails = mkTile(barX + 68, barY, 'rails 3', '#FFFFFF', '#444444');
var bShoot = mkTile(barX + 136, barY, 'SHOOT', '#FFFFFF', '#B8860B');
var bExit = mkTile(barX + 204, barY, 'EXIT', '#FFFFFF', '#8B2222');
var listW = Math.min(sw - 20, 300);
var listWin = mkList(sw - listW - 8, Math.round(sh * 0.62), listW);
listWin.setTouchable(true);

var items = [];
function pushItems() {
  items = [];
  for (var i = 0; i < st.sols.length; i++) {
    var s = st.sols[i];
    items.push({
      tag: s.rails.length ? s.rails.join(' > ') : 'direct',
      m1: 'aim ' + s.aim.toFixed(1) + ' | cut ' + s.cut.toFixed(1),
      m2: 'len ' + s.len.toFixed(2) + ' | score ' + s.score.toFixed(1),
      sel: i === st.sel
    });
  }
  ui.run(function () { listWin.lv.setData(items); });
}

function solveAll() {
  st.sols = (st.mode === 'kick')
    ? solveKick(st.C, st.O, st.P, TW, TH, st.maxRails)
    : solveBank(st.O, st.P, st.C, TW, TH, st.maxRails);
  st.sel = 0;
  pushItems();
  ui.run(function () {
    listWin.hdr.text = (st.mode === 'kick' ? 'KICK' : 'BANK') + ' | ' +
      st.sols.length + ' sol | #' + (st.sols.length ? st.sel + 1 : 0);
  });
  refresh();
}

bMode.click(function () {
  st.mode = st.mode === 'kick' ? 'bank' : 'kick';
  bMode.setText('mode: ' + st.mode.toUpperCase());
  solveAll();
});
bRails.click(function () {
  st.maxRails = st.maxRails >= 5 ? 1 : st.maxRails + 1;
  bRails.setText('rails ' + st.maxRails);
  solveAll();
});
bShoot.click(function () { shootSelected(); });
bExit.click(function () {
  engines.stopAll();
});

listWin.lv.on('item_click', function (item, i) {
  st.sel = i;
  pushItems();
  ui.run(function () {
    listWin.hdr.text = st.mode.toUpperCase() + ' | ' + st.sols.length + ' sol | #' + (i + 1);
  });
  refresh();
});

// ---- drag bola di panel tabel ----
var dragK = null;
ui.run(function () {
  drawTable();
  var cvx = tableWin.cv;
  cvx.on('touch_down', function (e) {
    var px = e.getX(), py = e.getY(), best = null, bd = 1e9;
    var ks = ['C', 'O', 'P'];
    for (var i = 0; i < 3; i++) {
      var d = Math.hypot(sx(st[ks[i]][0]) - px, sy(st[ks[i]][1]) - py);
      if (d < bd) { bd = d; best = ks[i]; }
    }
    dragK = bd <= 26 ? best : null;
  });
  cvx.on('touch_move', function (e) {
    if (!dragK) return;
    st[dragK] = clampP(e.getX(), e.getY());
    refresh();
  });
  cvx.on('touch_up', function () {
    if (dragK) { dragK = null; solveAll(); }
  });
});

bMode.setText('mode: KICK');
solveAll();
toast('8bp overlay aktif — tarik 3 bola, tap solusi, SHOOT');
