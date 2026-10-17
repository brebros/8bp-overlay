
var SOL_COLOR = '#FFD166', TEXT_W = '#FFFFFF', TEXT_DIM = '#BBBBBB';
var TW = 2.24, TH = 1.12, scl = 200, oX = 12, oY = 12;
var dp = function(v){return Math.round(v);};
function sx(x){ return oX + x * scl; }
function sy(y){ return oY + (TH - y) * scl; }
function ballRad(){ return 9; }
function pocketList(){ return [[0,0],[TW,0],[0,TH],[TW,TH],[TW/2,0],[TW/2,TH]]; }
var st = {mode:'kick', C:[0.4,0.9], O:[1.5,0.5], P:[1.12,1.12], X:[1.12,0.56], A:[1.68,0.20],
  sols: [{rails:['R'], pts:[[0.4,0.9],[2.24,0.5],[1.5,0.5]], len:2.0, cut:30, aim:45, score:120, ghost:[1.44,0.43]}],
  sel: 0};
var android = { graphics: { Paint: { Style: {STROKE:'stroke', FILL:'fill'}, Align: {CENTER:'center'} },
  Path: function(){ this.pts=[]; this.moveTo=function(x,y){this.pts.push(['M',x,y]);}; this.lineTo=function(x,y){this.pts.push(['L',x,y]);}; } } };
var colors = { parseColor: function(s){ return s; } };
android.graphics.PorterDuff = { Mode: { CLEAR: 'clear' } };
var ops = [];
function PaintStub() {
  this.style='fill'; this.color='#000'; this.stroke=0; this.size=0; this.align='left';
  this.setAntiAlias=function(){}; this.setColor=function(c){this.color=c;};
  this.setStyle=function(s){this.style=s;}; this.setStrokeWidth=function(w){this.stroke=w;};
  this.setTextSize=function(s){this.size=s;}; this.setTextAlign=function(a){this.align=a;};
  this.ascent=function(){return -this.size*0.8;}; this.descent=function(){return this.size*0.2;};
}
android.graphics.Paint = PaintStub;
android.graphics.Paint.Style = {STROKE:'stroke', FILL:'fill'};
android.graphics.Paint.Align = {CENTER:'center'};
var canvas = {
  drawColor: function(){ ops.push({op:'clear'}); },
  save: function(){ return 1; }, restoreToCount: function(){},
  drawRect: function(a,b,c,d,p){ ops.push({op:'rect', a,b,c,d, color:p.color, style:p.style, stroke:p.stroke}); },
  drawCircle: function(x,y,r,p){ ops.push({op:'circle', x,y,r, color:p.color, style:p.style, stroke:p.stroke}); },
  drawLine: function(x0,y0,x1,y1,p){ ops.push({op:'line', x0,y0,x1,y1, color:p.color, stroke:p.stroke}); },
  drawPath: function(path,p){ ops.push({op:'path', pts:path.pts, color:p.color, stroke:p.stroke}); },
  drawText: function(t,x,y,p){ ops.push({op:'text', t, x, y, color:p.color, size:p.size}); }
};
var paint = new android.graphics.Paint();
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
renderFrame(canvas);
console.log(JSON.stringify(ops));
