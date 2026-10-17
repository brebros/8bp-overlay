
var TW=2.24, TH=1.12, scl=200, dp=function(v){return v;};
var android={graphics:{Paint:{Style:{STROKE:'S',FILL:'F'},Align:{CENTER:'C'}}}};
function sx(x){return x*scl;} function sy(y){return y*scl;}
var st={mode:'kick',C:[0.9,0.25],O:[1.6,0.95],A:[0.3,1.05],X:[1.12,0.56]};
var lines=[];
var paint={setStyle:function(){},setStrokeWidth:function(){},setColor:function(){},setTextSize:function(){},setTextAlign:function(){},ascent:function(){return -5;},descent:function(){return 5;}};
var colors={parseColor:function(s){return s;}};
var canvas={drawLine:function(a,b,c,dd){lines.push([[+(a/scl).toFixed(6),+(b/scl).toFixed(6)],[+(c/scl).toFixed(6),+(dd/scl).toFixed(6)]]);},drawCircle:function(){},drawText:function(){}};
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


console.log(JSON.stringify(lines));