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
  C: [0.4, 0.9], O: [1.5, 0.5], P: [2.24, 0.0],
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
  return [[0, 0], [TW, 0], [0, TH], [TW, TH], [0, TH / 2], [TW, TH / 2]];
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
