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
