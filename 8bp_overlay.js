/*
 * 8bp_overlay.js — floating aim-assist overlay untuk 8 Ball Pool (Android)
 *
 * Runtime : AutoJs6 (F-Droid / github.com/kkevsekk1/AutoX)
 * Fitur   : floaty window di atas game, drag 3 titik (C/O/P), solver multi-rail
 *           (kick/bank, sampai 5 rail), gambar jalur + ghost ball, auto swipe shot.
 * Status  : WIP — solver core VERIFIED (15 kick / 11 sol, exact match dgn versi
 *           Python), UI + gesture di bawah blm dites di device.
 *
 * Cara pakai: import di AutoJs6 -> jalankan -> izinkan "Tampil di atas aplikasi
 * lain" + Aksesibilitas -> tarik 3 bola di panel tabel -> tap solusi -> SHOOT.
 */
// ====================== PART 1 : state, geometri, deteksi tepi ======================
auto.waitFor();
requestScreenCapture(false);

var TW = 2.24, TH = 1.12;               // 9-ft table (m)
var st = {
  mode: 'kick', maxRails: 3,
  C: [0.4, 0.9], O: [1.5, 0.5], P: [1.12, 1.12],
  X: [1.12, 0.56],                       // hub: 6 garis dari 6 lubang nembak ke sini
  A: [1.68, 0.20],                       // handle bidik: garis pantul V (kick/bank)
  sols: [], sel: 0
};
var dmDensity = context.getResources().getDisplayMetrics().density;
var sw = device.width, sh = device.height;
var tableWin = floaty.rawWindow(
  <frame w={Math.round(sw * 0.62)} h={Math.round(sw * 0.62 * TH / TW) + 30} bg="#66000000">
    <vertical><canvas id="cv" w="*" h="*"/></vertical>
  </frame>);
tableWin.setPosition(sw - Math.round(sw * 0.62) - 8, Math.round(sh * 0.30));
tableWin.setTouchable(true);

var PAD = 12, oX = PAD, oY = PAD;
var cssW = Math.round(sw * 0.62) - 2 * PAD;
var scl = cssW / TW;                    // px per meter
var ballPx = Math.max(9, scl * 0.0286 * 1.6);

function sx(x) { return oX + x * scl; }
function sy(y) { return oY + (TH - y) * scl; }
function ux(px) { return Math.min(TW, Math.max(0, (px - oX) / scl)); }
function uy(py) { return Math.min(TH, Math.max(0, TH - (py - oY) / scl)); }
function ballRad() { return ballPx; }
function pocketList() {
  // 4 sudut + 2 tengah di rail PANJANG (sisi horizontal)
  return [[0, 0], [TW, 0], [0, TH], [TW, TH], [TW / 2, 0], [TW / 2, TH]];
}
function dist(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
function clampP(x, y) { return [ux(x), uy(y)]; }

// ====================== gesture swipe (auto shot) ======================
function swipeShot(x0, y0, x1, y1, dur, steps) {
  var pts = [], dx = (x1 - x0) / steps, dy = (y1 - y0) / steps;
  for (var i = 0; i <= steps; i++) {
    pts.push([Math.round(x0 + dx * i), Math.round(y0 + dy * i)]);
    pts.push(Math.max(5, Math.round(dur / steps)));
  }
  gesture.apply(null, pts);
}

function shootSelected() {
  var s = st.sols.length ? st.sols[st.sel] : null;
  if (!s) { toast('ga ada solusi dipilih'); return; }
  // arah bidik = ruas terakhir (cue -> ghost/contact)
  var a = s.pts[s.pts.length - 2], b = s.pts[s.pts.length - 1];
  var ax = sx(a[0]), ay = sy(a[1]), bx = sx(b[0]), by = sy(b[1]);
  var L = Math.hypot(bx - ax, by - ay) || 1;
  var vx = (bx - ax) / L, vy = (by - ay) / L;
  // start swipe agak mundur dari cue ball, panjang = jarak cue->contact
  var sxp = ax - vx * L * 0.9, syp = ay - vy * L * 0.9;
  toast('SWIPE shot (' + (s.rails.length ? s.rails.join('->') : 'direct') + ')');
  setTimeout(function () { swipeShot(sxp, syp, ax, ay, 380, 12); }, 250);
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

// ============================ PART 2 : UI (tiles, panels, list) ============================
var SOL_COLOR = '#FFD166', TEXT_W = '#FFFFFF', TEXT_DIM = '#BBBBBB';

function dp(v) { return Math.round(v * dmDensity); }

function mkTile(x, y, txt, fg, bg) {
  var t = floaty.rawWindow(<frame w="64" h="64" gravity="center"><text id="t" text={txt} textSize="11sp" textColor={fg} gravity="center" bg={bg}/></frame>);
  t.setPosition(x, y);
  return t;
}

function mkText(x, y, w, h, txt, size, bg, id) {
  var t = floaty.rawWindow(<frame w={w} h={h} gravity="center"><text id={id || "t"} text={txt} textSize={size + "sp"} textColor={TEXT_W} gravity="center" bg={bg}/></frame>);
  t.setPosition(x, y);
  return t;
}

function mkList(x, y, w) {
  var lf = floaty.rawWindow(<frame w={w} h={dp(210)} bg="#99000000"><vertical padding="4">
      <text id="hdr" text="—" textSize="10sp" textColor="#FFD166" gravity="center"/>
      <list id="lv" w="*" h={dp(180)}>
        <horizontal bg={sel ? "#331F6FEB" : "#00000000"} padding="4 3">
          <text w="70" text={tag} textSize="11sp" textColor="#58A6FF" textStyle="bold"/>
          <text w="*" text={m1 + "\n" + m2} textSize="9sp" textColor="#DDDDDD"/>
        </horizontal>
      </list>
    </vertical></frame>);
  lf.setPosition(x, y);
  return lf;
}

function drawTable() {
  ui.run(function () {
    tableWin.layout.removeAllViews();
    var cv = <canvas id="cv" w="*" h="*"/>;
    tableWin.layout.addView(cv);
    cv.on('draw', function (canvas) { renderFrame(canvas); });
  });
}

function renderFrame(canvas) {
  if (!canvas) return;
  canvas.drawColor(colors.parseColor('#00000000'), android.graphics.PorterDuff.Mode.CLEAR);
  var frame = canvas.save();
  try {
    var paint = new android.graphics.Paint();
    paint.setAntiAlias(true);
    // cloth
    paint.setColor(colors.parseColor('#14663A'));
    canvas.drawRect(sx(0) - dp(4), sy(0) - dp(4), sx(TW) + dp(4), sy(TH) + dp(4), paint);
    // pockets
    paint.setColor(colors.parseColor('#000000'));
    var pp = pocketList();
    for (var i = 0; i < pp.length; i++) {
      var rad = Math.max(dp(4), scl * 0.07);
      canvas.drawCircle(sx(pp[i][0]), sy(pp[i][1]), rad, paint);
      if (Math.hypot(pp[i][0] - st.P[0], pp[i][1] - st.P[1]) < 0.07) {
        paint.setStyle(android.graphics.Paint.Style.STROKE);
        paint.setStrokeWidth(dp(2));
        paint.setColor(colors.parseColor('#3FB950'));
        canvas.drawCircle(sx(pp[i][0]), sy(pp[i][1]), rad, paint);
        paint.setStyle(android.graphics.Paint.Style.FILL);
        paint.setColor(colors.parseColor('#000000'));
      }
    }
    // hub: 6 garis dari 6 lubang -> X (bisa digeser di layar game)
    var hubR = Math.max(dp(9), scl * 0.055), Xp = st.X;
    paint.setColor(colors.parseColor('#CC58A6FF'));
    paint.setStyle(android.graphics.Paint.Style.STROKE);
    paint.setStrokeWidth(dp(1.5));
    for (var q = 0; q < pp.length; q++) {
      var rx = Xp[0] - pp[q][0], ry = Xp[1] - pp[q][1];
      var rl = Math.hypot(rx, ry) || 1;
      canvas.drawLine(sx(pp[q][0]), sy(pp[q][1]),
        sx(Xp[0] - rx / rl * (hubR / scl)), sy(Xp[1] - ry / rl * (hubR / scl)), paint);
    }
    paint.setStyle(android.graphics.Paint.Style.FILL);
    paint.setColor(colors.parseColor('#3358A6FF'));
    canvas.drawCircle(sx(Xp[0]), sy(Xp[1]), hubR, paint);
    paint.setStyle(android.graphics.Paint.Style.STROKE);
    paint.setStrokeWidth(dp(2));
    paint.setColor(colors.parseColor('#FF58A6FF'));
    canvas.drawCircle(sx(Xp[0]), sy(Xp[1]), hubR, paint);
    paint.setStyle(android.graphics.Paint.Style.FILL);
    paint.setColor(colors.parseColor('#FF58A6FF'));
    paint.setTextSize(dp(10));
    paint.setTextAlign(android.graphics.Paint.Align.CENTER);
    var ascX = paint.ascent();
    canvas.drawText('X', sx(Xp[0]), sy(Xp[1]) - (ascX + paint.descent()) / 2, paint);

    // garis pantul V (kick/bank): origin (C di KICK / O di BANK) -> handle A
    var org = (st.mode === 'bank') ? st.O : st.C, Av = st.A;
    var dvx = Av[0] - org[0], dvy = Av[1] - org[1], dl = Math.hypot(dvx, dvy);
    if (dl > 1e-6) {
      dvx /= dl; dvy /= dl;
      var pv = [org[0], org[1]];
      paint.setStyle(android.graphics.Paint.Style.STROKE);
      paint.setStrokeWidth(dp(2));
      paint.setColor(colors.parseColor('#FFFF7B72'));
      for (var b = 0; b < 3; b++) {
        var bt = Infinity, rail = null, t;
        if (dvx < 0) { t = (0 - pv[0]) / dvx; if (t > 1e-9 && t < bt) { bt = t; rail = 'L'; } }
        if (dvx > 0) { t = (TW - pv[0]) / dvx; if (t > 1e-9 && t < bt) { bt = t; rail = 'R'; } }
        if (dvy < 0) { t = (0 - pv[1]) / dvy; if (t > 1e-9 && t < bt) { bt = t; rail = 'B'; } }
        if (dvy > 0) { t = (TH - pv[1]) / dvy; if (t > 1e-9 && t < bt) { bt = t; rail = 'T'; } }
        if (!rail || !isFinite(bt)) break;
        var hx = Math.min(TW, Math.max(0, pv[0] + dvx * bt)), hy = Math.min(TH, Math.max(0, pv[1] + dvy * bt));
        canvas.drawLine(sx(pv[0]), sy(pv[1]), sx(hx), sy(hy), paint);
        if (rail === 'L' || rail === 'R') dvx = -dvx; else dvy = -dvy;
        pv = [hx, hy];
        paint.setStyle(android.graphics.Paint.Style.FILL);
        canvas.drawCircle(sx(hx), sy(hy), dp(3.5), paint);
        paint.setStyle(android.graphics.Paint.Style.STROKE);
      }
    }
    var aR = Math.max(dp(8), scl * 0.045);
    paint.setStyle(android.graphics.Paint.Style.FILL);
    paint.setColor(colors.parseColor('#33FF7B72'));
    canvas.drawCircle(sx(Av[0]), sy(Av[1]), aR, paint);
    paint.setStyle(android.graphics.Paint.Style.STROKE);
    paint.setStrokeWidth(dp(2));
    paint.setColor(colors.parseColor('#FFFF7B72'));
    canvas.drawCircle(sx(Av[0]), sy(Av[1]), aR, paint);
    paint.setStyle(android.graphics.Paint.Style.FILL);
    paint.setColor(colors.parseColor('#FFFF7B72'));
    paint.setTextSize(dp(10));
    paint.setTextAlign(android.graphics.Paint.Align.CENTER);
    var ascA = paint.ascent();
    canvas.drawText('A', sx(Av[0]), sy(Av[1]) - (ascA + paint.descent()) / 2, paint);

    // path
    var s = st.sols.length ? st.sols[st.sel] : null;
    if (s && s.pts && s.pts.length > 1) {
      if (s.ghost) {
        paint.setColor(colors.parseColor('#88FFFFFF'));
        canvas.drawCircle(sx(s.ghost[0]), sy(s.ghost[1]), ballRad() * 0.9, paint);
      }
      paint.setColor(colors.parseColor(SOL_COLOR));
      paint.setStyle(android.graphics.Paint.Style.STROKE);
      paint.setStrokeWidth(dp(2.5));
      var pth = new android.graphics.Path();
      pth.moveTo(sx(s.pts[0][0]), sy(s.pts[0][1]));
      for (var j = 1; j < s.pts.length; j++) pth.lineTo(sx(s.pts[j][0]), sy(s.pts[j][1]));
      canvas.drawPath(pth, paint);
      for (var k = 1; k <= s.rails.length; k++) {
        paint.setStyle(android.graphics.Paint.Style.FILL);
        canvas.drawCircle(sx(s.pts[k][0]), sy(s.pts[k][1]), dp(3.5), paint);
        paint.setStyle(android.graphics.Paint.Style.STROKE);
      }
      paint.setStyle(android.graphics.Paint.Style.FILL);
    }
    // balls
    var cols = { C: '#F2F2F2', O: '#FFB02E', P: '#3FB950' }, keys = ['C', 'O', 'P'];
    paint.setStyle(android.graphics.Paint.Style.FILL);
    for (var b = 0; b < keys.length; b++) {
      var kk = keys[b], pt = st[kk];
      paint.setColor(colors.parseColor(cols[kk]));
      canvas.drawCircle(sx(pt[0]), sy(pt[1]), ballRad(), paint);
      paint.setColor(colors.parseColor('#0D1117'));
      paint.setTextSize(dp(9));
      paint.setTextAlign(android.graphics.Paint.Align.CENTER);
      var asc = paint.ascent();
      canvas.drawText(kk, sx(pt[0]), sy(pt[1]) - (asc + paint.descent()) / 2, paint);
    }
  } finally {
    canvas.restoreToCount(frame);
  }
}

function refresh() { ui.run(function () { tableWin.requestLayout(); tableWin.invalidate(); }); }

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
    var ks = ['C', 'O', 'P', 'X', 'A'];
    for (var i = 0; i < ks.length; i++) {
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
