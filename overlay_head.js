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
