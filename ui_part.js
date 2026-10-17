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
