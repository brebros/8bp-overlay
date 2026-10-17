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
