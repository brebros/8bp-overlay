/*
 * 8bp_overlay.js — overlay aim-assist buat 8 Ball Pool (Android / AutoJs6)
 *
 * Runtime : AutoJs6 (docs.autojs6.com). Layout pakai XML STRING — BUKAN JSX.
 * Fitur   : panel floaty di atas game: drag C/O/P + hub X + handle A (garis pantul V),
 *           solver multi-rail kick/bank, list solusi, auto swipe SHOOT.
 * Izin    : "Tampil di atas aplikasi lain" + Aksesibilitas (buat swipe).
 * API     : floaty.rawWindow(xml) / view.on('touch_down'|'touch_move'|'touch_up') /
 *           list.setDataSource(array) + {{binding}} / canvas.on('draw') / swipe().
 * Status  : solver core VERIFIED; UI layer ikut doc resmi, belum diuji di device.
 */
// ===================== state & geometri =====================
var TW = 2.24, TH = 1.12;                  // meja 9-ft (x/y satuan sama)
var st = {
  mode: 'kick', maxRails: 3,
  C: [0.40, 0.90], O: [1.50, 0.50], P: [1.12, 1.12],
  X: [1.12, 0.56], A: [1.68, 0.20],
  sols: [], sel: 0
};
var dmDensity = context.getResources().getDisplayMetrics().density;
function dp(v) { return Math.round(v * dmDensity); }
var sw = device.width, sh = device.height;
var PAD = 6;
var panelW = Math.round(sw * 0.62);
var clothW = panelW - 2 * PAD;
var clothH = Math.round(clothW * TH / TW);
var oX = PAD, oY = PAD, scl = clothW / TW;
var ballPx = Math.max(8, scl * 0.0286 * 1.6);

function sx(x) { return oX + x * scl; }
function sy(y) { return oY + (TH - y) * scl; }
function ux(px) { return Math.min(TW, Math.max(0, (px - oX) / scl)); }
function uy(py) { return Math.min(TH, Math.max(0, TH - (py - oY) / scl)); }
function ballRad() { return ballPx; }
function clampP(px, py) { return [ux(px), uy(py)]; }
function pocketList() {
  // 4 sudut + 2 tengah di rail PANJANG (sisi horizontal)
  return [[0, 0], [TW, 0], [0, TH], [TW, TH], [TW / 2, 0], [TW / 2, TH]];
}
function C(hex) {                          // string warna -> int
  try { return colors.parseColor(hex); }
  catch (e) { return android.graphics.Color.parseColor(hex); }
}

// ===================== panel floaty (XML string, tanpa JSX) =====================
var layout =
  '<vertical bg="#66000000" padding="4">' +
    '<canvas id="cv" w="' + clothW + '" h="' + clothH + '"/>' +
    '<horizontal>' +
      '<button id="bMode"  w="66" h="46" text="KICK"    textSize="10sp"/>' +
      '<button id="bRails" w="72" h="46" text="rails 3" textSize="10sp"/>' +
      '<button id="bShoot" w="78" h="46" text="SHOOT"   textSize="10sp"/>' +
      '<button id="bExit"  w="60" h="46" text="EXIT"    textSize="10sp"/>' +
    '</horizontal>' +
    '<text id="lbl" text="KICK | 0 sol" textSize="10sp" textColor="#FFD166" bg="#44000000"/>' +
    '<list id="lv" w="' + clothW + '" h="150">' +
      '<vertical padding="3" bg="{{bg}}">' +
        '<horizontal>' +
          '<text w="72" text="{{tag}}" textSize="11sp" textColor="#58A6FF"/>' +
          '<text w="*"  text="{{m1}}"  textSize="9sp"  textColor="#DDDDDD"/>' +
        '</horizontal>' +
        '<text text="{{m2}}" textSize="9sp" textColor="#888888"/>' +
      '</vertical>' +
    '</list>' +
  '</vertical>';

var win = floaty.rawWindow(layout);
win.setPosition(8, Math.round(sh * 0.20));

// ===================== auto shot (swipe) =====================
function shootSelected() {
  var s = st.sols.length ? st.sols[st.sel] : null;
  if (!s) { toast('belum ada solusi dipilih'); return; }
  if (!auto.service) { toast('Aksesibilitas belum aktif — SHOOT ga bisa'); return; }
  // arah bidik = ruas terakhir jalur (cue -> titik kontak)
  var a = s.pts[s.pts.length - 2], b = s.pts[s.pts.length - 1];
  var wx = win.getX() + 4, wy = win.getY() + 4;      // offset canvas di layar
  var ax = wx + sx(a[0]), ay = wy + sy(a[1]);
  var bx = wx + sx(b[0]), by = wy + sy(b[1]);
  var L = Math.hypot(bx - ax, by - ay) || 1;
  var vx = (bx - ax) / L, vy = (by - ay) / L;
  var x0 = Math.round(ax - vx * L * 0.6), y0 = Math.round(ay - vy * L * 0.6);
  var x1 = Math.round(ax + vx * L * 0.4), y1 = Math.round(ay + vy * L * 0.4);
  toast('SWIPE: ' + (s.rails.length ? s.rails.join('->') : 'direct'));
  threads.start(function () { sleep(400); swipe(x0, y0, x1, y1, 220); });
}

//=== CORE BEGIN ===
// Faithful port of ball_solver_agent.py (mirror/unfold geometry, stdlib-free).
var RAILS = ['L', 'R', 'B', 'T'];
var BALL_R = 0.0286;

function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function mul(a, s) { return [a[0] * s, a[1] * s]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
function dist(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
function norm(v) {
  var d = Math.hypot(v[0], v[1]);
  return d ? [v[0] / d, v[1] / d] : [0, 0];
}
function ang(a, b) {
  var n = norm(a), m = norm(b), c = dot(n, m);
  return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
}
function aimDeg(v) { return (Math.atan2(v[1], v[0]) * 180 / Math.PI + 360) % 360; }

function reflect(p, rail, W, H) {
  var x = p[0], y = p[1];
  if (rail === 'L') return [-x, y];
  if (rail === 'R') return [2 * W - x, y];
  if (rail === 'B') return [x, -y];
  return [x, 2 * H - y];
}
function railGeom(rail, W, H) {
  if (rail === 'L') return ['v', 0];
  if (rail === 'R') return ['v', W];
  if (rail === 'B') return ['h', 0];
  return ['h', H];
}
function cross(p0, p1, rail, W, H) {
  var g = railGeom(rail, W, H), kind = g[0], c = g[1];
  var x0 = p0[0], y0 = p0[1], x1 = p1[0], y1 = p1[1];
  if (kind === 'v') {
    if (x1 === x0) return [null, null];
    var t = (c - x0) / (x1 - x0);
    return [[c, y0 + t * (y1 - y0)], t];
  }
  if (y1 === y0) return [null, null];
  var t2 = (c - y0) / (y1 - y0);
  return [[x0 + t2 * (x1 - x0), c], t2];
}
function onRail(p, rail, W, H, eps) {
  eps = eps || 1e-6;
  var kind = railGeom(rail, W, H)[0];
  return kind === 'v'
    ? (-eps <= p[1] && p[1] <= H + eps)
    : (-eps <= p[0] && p[0] <= W + eps);
}
function build(S, T, rails, W, H) {
  var end = T.slice();
  for (var i = rails.length - 1; i >= 0; i--) end = reflect(end, rails[i], W, H);
  var start = S.slice(), pts = [S.slice()], length = 0;
  for (var j = 0; j < rails.length; j++) {
    var r = rails[j];
    var cr = cross(start, end, r, W, H), B = cr[0], t = cr[1];
    if (B === null || t < 0 || t > 1 || !onRail(B, r, W, H)) return null;
    pts.push(B);
    length += dist(start, B);
    end = reflect(end, r, W, H);
    start = B;
  }
  pts.push(T);
  length += dist(start, T);
  return [pts, length];
}
function verify(pts, rails, W, H, tol) {
  tol = tol || 1e-3;
  for (var i = 0; i < rails.length; i++) {
    var A = pts[i], Bp = pts[i + 1], C = pts[i + 2];
    var inc = norm(sub(Bp, A)), out = norm(sub(C, Bp));
    var kind = railGeom(rails[i], W, H)[0];
    if (kind === 'v') {
      if (Math.abs(out[0] + inc[0]) > tol || Math.abs(out[1] - inc[1]) > tol) return false;
    } else {
      if (Math.abs(out[1] + inc[1]) > tol || Math.abs(out[0] - inc[0]) > tol) return false;
    }
  }
  return true;
}
function solveRaw(S, T, W, H, maxRails) {
  var out = [];
  for (var n = 0; n <= maxRails; n++) {
    var stacks = [[]];
    for (var i = 0; i < n; i++) {
      var next = [];
      for (var s = 0; s < stacks.length; s++)
        for (var k = 0; k < RAILS.length; k++) next.push(stacks[s].concat([RAILS[k]]));
      stacks = next;
    }
    for (var si = 0; si < stacks.length; si++) {
      var rails = stacks[si], skip = false;
      for (var a = 0; a < rails.length - 1; a++) if (rails[a] === rails[a + 1]) { skip = true; break; }
      if (skip) continue;
      var res = build(S, T, rails, W, H);
      if (!res) continue;
      if (!verify(res[0], rails, W, H)) continue;
      out.push({ rails: rails, pts: res[0], len: res[1] });
    }
  }
  return out;
}
function solveKick(C, O, P, W, H, maxRails) {
  var dObj = norm(sub(P, O));
  var ghost = sub(O, mul(dObj, 2 * BALL_R));
  var raw = solveRaw(C, ghost, W, H, maxRails), res = [];
  for (var i = 0; i < raw.length; i++) {
    var c = raw[i], pts = c.pts;
    var dCue = pts.length >= 2 ? norm(sub(pts[pts.length - 1], pts[pts.length - 2])) : norm(sub(ghost, C));
    var cut = ang(dCue, dObj);
    if (cut >= 85) continue;
    res.push({
      rails: c.rails, pts: pts,
      len: +c.len.toFixed(4), cut: +cut.toFixed(2), aim: +aimDeg(dCue).toFixed(2),
      score: +(c.rails.length * 100 + c.len * 10 + cut * 2).toFixed(2)
    });
  }
  res.sort(function (x, y) { return x.score - y.score; });
  return res;
}
function solveBank(O, P, C, W, H, maxRails) {
  var raw = solveRaw(O, P, W, H, maxRails), res = [];
  for (var i = 0; i < raw.length; i++) {
    var c = raw[i], pts = c.pts;
    var dObj = pts.length >= 2 ? norm(sub(pts[1], pts[0])) : norm(sub(P, O));
    var ghost = sub(O, mul(dObj, 2 * BALL_R));
    var dCue = norm(sub(ghost, C));
    var cut = ang(dCue, dObj);
    if (cut >= 85) continue;
    res.push({
      rails: c.rails, pts: pts, len: +c.len.toFixed(4),
      cut: +cut.toFixed(2), aim: +aimDeg(dCue).toFixed(2),
      ghost: [+ghost[0].toFixed(4), +ghost[1].toFixed(4)],
      score: +(c.rails.length * 100 + c.len * 10 + cut * 2).toFixed(2)
    });
  }
  res.sort(function (x, y) { return x.score - y.score; });
  return res;
}
function selfTest() {
  var W = 2.24, H = 1.12;
  var ks = solveKick([0.90, 0.25], [1.60, 0.95], [2.24, 1.12], W, H, 3);
  var bs = solveBank([0.60, 0.40], [0.05, 0.05], [1.80, 0.90], W, H, 3);
  if (!ks.length) throw new Error('kick returned no solutions');
  if (!bs.length) throw new Error('bank returned no solutions');
  var tp = build([1.5, 0.4], [1.08, 0.7467], ['B', 'L'], W, H);
  if (!tp || !verify(tp[0], ['B', 'L'], W, H)) throw new Error('2-rail verification failed');
  return 'self-test OK: kick=' + ks.length + ' sols, bank=' + bs.length + ' sols, verification pass';
}
//=== CORE END ===
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { solveKick: solveKick, solveBank: solveBank, selfTest: selfTest, build: build, verify: verify };
}

// ===================== layer gambar (canvas 'draw') =====================
// Paint global disediakan AutoJs6. Semua digambar per-frame; exception DI DALAM
// handler 'draw' bisa mematikan script, jadi seluruh body dibungkus try/catch.
var pk = {
  fill: new Paint(Paint.ANTI_ALIAS_FLAG),
  stroke: new Paint(Paint.ANTI_ALIAS_FLAG)
};
var lastDrawError = '';

function renderFrame(canvas) {
  try {
    pk.fill.setStyle(Paint.Style.FILL);
    pk.stroke.setStyle(Paint.Style.STROKE);
    pk.stroke.setAntiAlias(true);
    pk.fill.setAntiAlias(true);

    // meja + cushion
    canvas.drawColor(C('#0D1117'));
    pk.fill.setColor(C('#2B1A0E'));
    canvas.drawRect(oX - PAD, oY - PAD, oX + TW * scl + PAD, oY + TH * scl + PAD, pk.fill);
    pk.fill.setColor(C('#14663A'));
    canvas.drawRect(oX, oY, oX + TW * scl, oY + TH * scl, pk.fill);

    // label rail
    pk.fill.setColor(C('#66FFFFFF'));
    pk.fill.setTextSize(dp(9));
    pk.fill.setTextAlign(Paint.Align.CENTER);
    canvas.drawText('L', sx(0) - dp(3), sy(TH / 2), pk.fill);
    canvas.drawText('R', sx(TW) + dp(3), sy(TH / 2), pk.fill);
    canvas.drawText('B', sx(TW / 2), sy(0) + dp(11), pk.fill);
    canvas.drawText('T', sx(TW / 2), sy(TH) - dp(4), pk.fill);

    // lubang + highlight target
    var pp = pocketList(), rad = Math.max(dp(4), scl * 0.07);
    for (var i = 0; i < pp.length; i++) {
      pk.fill.setColor(C('#000000'));
      canvas.drawCircle(sx(pp[i][0]), sy(pp[i][1]), rad, pk.fill);
      if (Math.hypot(pp[i][0] - st.P[0], pp[i][1] - st.P[1]) < 0.07) {
        pk.stroke.setColor(C('#3FB950'));
        pk.stroke.setStrokeWidth(dp(2));
        canvas.drawCircle(sx(pp[i][0]), sy(pp[i][1]), rad, pk.stroke);
      }
    }

    // hub X: 6 garis dari 6 lubang
    var hubR = Math.max(dp(9), scl * 0.055), Xp = st.X;
    pk.stroke.setColor(C('#CC58A6FF'));
    pk.stroke.setStrokeWidth(dp(1.5));
    for (var q = 0; q < pp.length; q++) {
      var rx = Xp[0] - pp[q][0], ry = Xp[1] - pp[q][1], rl = Math.hypot(rx, ry) || 1;
      canvas.drawLine(sx(pp[q][0]), sy(pp[q][1]),
        sx(Xp[0] - rx / rl * (hubR / scl)), sy(Xp[1] - ry / rl * (hubR / scl)), pk.stroke);
    }
    pk.fill.setColor(C('#3358A6FF'));
    canvas.drawCircle(sx(Xp[0]), sy(Xp[1]), hubR, pk.fill);
    pk.stroke.setColor(C('#FF58A6FF'));
    pk.stroke.setStrokeWidth(dp(2));
    canvas.drawCircle(sx(Xp[0]), sy(Xp[1]), hubR, pk.stroke);
    pk.fill.setColor(C('#FF58A6FF'));
    pk.fill.setTextSize(dp(10));
    canvas.drawText('X', sx(Xp[0]), sy(Xp[1]) + dp(3), pk.fill);

    // garis pantul V: origin (C kalau KICK / O kalau BANK) -> handle A
    var org = (st.mode === 'bank') ? st.O : st.C, Av = st.A;
    var dvx = Av[0] - org[0], dvy = Av[1] - org[1], dl = Math.hypot(dvx, dvy);
    if (dl > 1e-6) {
      dvx /= dl; dvy /= dl;
      var pv = [org[0], org[1]];
      pk.stroke.setColor(C('#FFFF7B72'));
      pk.stroke.setStrokeWidth(dp(2));
      for (var b = 0; b < 3; b++) {
        var bt = Infinity, rail = null, t;
        if (dvx < 0) { t = (0 - pv[0]) / dvx; if (t > 1e-9 && t < bt) { bt = t; rail = 'L'; } }
        if (dvx > 0) { t = (TW - pv[0]) / dvx; if (t > 1e-9 && t < bt) { bt = t; rail = 'R'; } }
        if (dvy < 0) { t = (0 - pv[1]) / dvy; if (t > 1e-9 && t < bt) { bt = t; rail = 'B'; } }
        if (dvy > 0) { t = (TH - pv[1]) / dvy; if (t > 1e-9 && t < bt) { bt = t; rail = 'T'; } }
        if (!rail || !isFinite(bt)) break;
        var hx = Math.min(TW, Math.max(0, pv[0] + dvx * bt));
        var hy = Math.min(TH, Math.max(0, pv[1] + dvy * bt));
        canvas.drawLine(sx(pv[0]), sy(pv[1]), sx(hx), sy(hy), pk.stroke);
        if (rail === 'L' || rail === 'R') dvx = -dvx; else dvy = -dvy;
        pv = [hx, hy];
        pk.fill.setColor(C('#FFFF7B72'));
        canvas.drawCircle(sx(hx), sy(hy), dp(3.5), pk.fill);
      }
    }
    var aR = Math.max(dp(8), scl * 0.045);
    pk.fill.setColor(C('#33FF7B72'));
    canvas.drawCircle(sx(Av[0]), sy(Av[1]), aR, pk.fill);
    pk.stroke.setColor(C('#FFFF7B72'));
    pk.stroke.setStrokeWidth(dp(2));
    canvas.drawCircle(sx(Av[0]), sy(Av[1]), aR, pk.stroke);
    pk.fill.setColor(C('#FFFF7B72'));
    pk.fill.setTextSize(dp(10));
    pk.fill.setTextAlign(Paint.Align.CENTER);
    canvas.drawText('A', sx(Av[0]), sy(Av[1]) + dp(3), pk.fill);

    // jalur solusi terpilih
    var s = st.sols.length ? st.sols[st.sel] : null;
    if (s && s.pts && s.pts.length > 1) {
      if (s.ghost) {
        pk.fill.setColor(C('#88FFFFFF'));
        canvas.drawCircle(sx(s.ghost[0]), sy(s.ghost[1]), ballRad() * 0.9, pk.fill);
      }
      pk.stroke.setColor(C('#FFD166'));
      pk.stroke.setStrokeWidth(dp(2.5));
      var path = new android.graphics.Path();
      path.moveTo(sx(s.pts[0][0]), sy(s.pts[0][1]));
      for (var j = 1; j < s.pts.length; j++) path.lineTo(sx(s.pts[j][0]), sy(s.pts[j][1]));
      canvas.drawPath(path, pk.stroke);
      pk.fill.setColor(C('#FFD166'));
      for (var k = 1; k <= s.rails.length; k++) canvas.drawCircle(sx(s.pts[k][0]), sy(s.pts[k][1]), dp(3.5), pk.fill);
    }

    // bola C/O/P
    var keys = ['C', 'O', 'P'], cols = { C: '#F2F2F2', O: '#FFB02E', P: '#3FB950' };
    pk.fill.setTextSize(dp(9));
    for (var m = 0; m < keys.length; m++) {
      var kk = keys[m], pt = st[kk];
      pk.fill.setColor(C(cols[kk]));
      canvas.drawCircle(sx(pt[0]), sy(pt[1]), ballRad(), pk.fill);
      pk.fill.setColor(C('#0D1117'));
      canvas.drawText(kk, sx(pt[0]), sy(pt[1]) + dp(3), pk.fill);
    }

    if (lastDrawError) {
      pk.fill.setColor(C('#FFFF5555'));
      pk.fill.setTextSize(dp(10));
      canvas.drawText('draw err: ' + lastDrawError.substr(0, 40), clothW / 2, clothH - dp(6), pk.fill);
    }
  } catch (e) {
    lastDrawError = String(e && e.message ? e.message : e);   // jangan biarkan exception mematikan script
  }
}

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
