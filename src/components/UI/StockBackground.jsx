import React, { useEffect, useRef } from 'react';

/**
 * Animated stock-market backdrop (canvas, no assets):
 *  - left:  classic bronze candlestick market (the "real" bull)
 *  - right: holographic iridescent live price line + green data streams (the "digital" bull)
 *  - centre spotlight, glowing floor with a perspective grid, drifting particles
 * Runs in a continuous loop; pauses only while the tab is hidden.
 */
export function StockBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    // Always loops (user request). Reduced-motion users get a calmer speed instead of a frozen frame.
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const speed = reduce ? 0.6 : 1;
    let W = 0, H = 0, raf = 0, last = performance.now(), t = 0;

    // --- market data -------------------------------------------------------
    const rnd = (a, b) => a + Math.random() * (b - a);
    let price = 100;
    const candles = [];
    const nextCandle = () => {
      const o = price;
      const c = o + rnd(0.8, 2.2); // steady growth: every candle closes higher
      price = c;
      return { o, c, h: c + rnd(0.2, 0.9), l: o - rnd(0.2, 0.9) };
    };
    for (let i = 0; i < 60; i++) candles.push(nextCandle());
    let line = Array.from({ length: 140 }, (_, i) => 60 + Math.sin(i / 9) * 14 + i * 0.25 + rnd(-3, 3));
    let candleShift = 0, lineShift = 0;

    const streams = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), v: rnd(0.08, 0.28), len: rnd(0.04, 0.14), a: rnd(0.15, 0.6) }));
    const dust = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(0.4, 1.8), v: rnd(0.004, 0.018), p: Math.random() * 6.28 }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (dt) => {
      t += dt;
      const floorY = H * 0.78;

      // backdrop: charcoal studio with a centre spotlight
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.8);
      bg.addColorStop(0, '#3a3d44'); bg.addColorStop(0.45, '#1c1e23'); bg.addColorStop(1, '#08090b');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // --- left: bronze candlestick market ---------------------------------
      candleShift += dt * 42 * speed;
      const cw = Math.max(9, W / 110), gap = cw * 0.55, step = cw + gap;
      if (candleShift >= step) { candleShift -= step; candles.shift(); candles.push(nextCandle()); }
      const vis = candles.slice(-Math.ceil((W * 0.5) / step) - 2);
      let lo = Infinity, hi = -Infinity;
      vis.forEach((c) => { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); });
      const top = H * 0.16, bot = floorY - H * 0.06;
      const y = (v) => bot - ((v - lo) / (hi - lo || 1)) * (bot - top);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W * 0.5, H); ctx.clip();
      vis.forEach((c, i) => {
        const x = W * 0.5 - (vis.length - i) * step + candleShift;
        const fade = Math.min(1, Math.max(0, x / (W * 0.35)));
        const up = c.c >= c.o;
        ctx.globalAlpha = 0.18 + fade * 0.55;
        ctx.strokeStyle = up ? '#E9C58A' : '#8A6A48';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x + cw / 2, y(c.h)); ctx.lineTo(x + cw / 2, y(c.l)); ctx.stroke();
        const g = ctx.createLinearGradient(x, 0, x + cw, 0);
        g.addColorStop(0, up ? '#F7DDA8' : '#6E5236'); g.addColorStop(1, up ? '#B98A4E' : '#3E2E1F');
        ctx.fillStyle = g;
        const yy = Math.min(y(c.o), y(c.c));
        ctx.fillRect(x, yy, cw, Math.max(2, Math.abs(y(c.o) - y(c.c))));
      });
      ctx.restore(); ctx.globalAlpha = 1;

      // --- right: holographic live line --------------------------------------
      lineShift += dt * 55 * speed;
      const lstep = (W * 0.5) / 90;
      while (lineShift >= lstep) {
        lineShift -= lstep;
        const prev = line[line.length - 1];
        line.shift();
        line.push(Math.max(20, Math.min(110, prev + rnd(-3.2, 3.6) + (prev < 50 ? 1.2 : 0) - (prev > 95 ? 1.2 : 0))));
      }
      const pts = line.slice(-92);
      const ly = (v) => bot - ((v - 20) / 95) * (bot - top);
      const hue = (t * 40) % 360;
      ctx.save();
      ctx.beginPath(); ctx.rect(W * 0.5, 0, W * 0.5, H); ctx.clip();
      const holo = ctx.createLinearGradient(W * 0.5, 0, W, 0);
      for (let k = 0; k <= 4; k++) holo.addColorStop(k / 4, `hsl(${Math.round((hue + k * 70) % 360)}, 95%, 65%)`);
      // filled glass area
      ctx.beginPath();
      pts.forEach((v, i) => { const x = W * 0.5 + i * lstep - lineShift; i ? ctx.lineTo(x, ly(v)) : ctx.moveTo(x, ly(v)); });
      ctx.lineTo(W, floorY); ctx.lineTo(W * 0.5, floorY); ctx.closePath();
      const area = ctx.createLinearGradient(0, top, 0, floorY);
      area.addColorStop(0, `hsla(${Math.round((hue + 140) % 360)}, 90%, 60%, 0.28)`); area.addColorStop(1, 'hsla(160, 90%, 50%, 0)');
      ctx.fillStyle = area; ctx.fill();
      // glowing line
      ctx.shadowColor = `hsl(${Math.round((hue + 120) % 360)}, 100%, 70%)`; ctx.shadowBlur = 18;
      ctx.strokeStyle = holo; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach((v, i) => { const x = W * 0.5 + i * lstep - lineShift; i ? ctx.lineTo(x, ly(v)) : ctx.moveTo(x, ly(v)); });
      ctx.stroke(); ctx.shadowBlur = 0;
      // live price dot
      const lx = W * 0.5 + (pts.length - 1) * lstep - lineShift, lyv = ly(pts[pts.length - 1]);
      const pulse = 6 + Math.sin(t * 4) * 3;
      ctx.fillStyle = 'rgba(120,255,200,0.25)'; ctx.beginPath(); ctx.arc(lx, lyv, pulse * 2, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#B9FFE4'; ctx.beginPath(); ctx.arc(lx, lyv, 3.5, 0, 6.28); ctx.fill();
      // digital rain (green streams like the holographic bull)
      streams.forEach((s) => {
        s.y += s.v * dt * speed; if (s.y - s.len > 1) { s.y = -rnd(0, 0.3); s.x = Math.random(); }
        const x = W * 0.5 + s.x * W * 0.5, y0 = (s.y - s.len) * floorY, y1 = s.y * floorY;
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, 'rgba(60,255,150,0)'); g.addColorStop(1, `rgba(120,255,170,${s.a})`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      });
      ctx.restore();

      // centre: spotlight where the two markets meet
      const meet = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.45);
      meet.addColorStop(0, 'rgba(255,255,255,0.16)'); meet.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = meet; ctx.fillRect(0, 0, W, H);

      // glowing floor + moving perspective grid
      const fl = ctx.createLinearGradient(0, floorY, 0, H);
      fl.addColorStop(0, 'rgba(235,238,245,0.55)'); fl.addColorStop(0.08, 'rgba(160,165,175,0.35)'); fl.addColorStop(1, 'rgba(10,11,13,0.95)');
      ctx.fillStyle = fl; ctx.fillRect(0, floorY, W, H - floorY);
      const glow = ctx.createRadialGradient(W * 0.5, floorY, 0, W * 0.5, floorY, W * 0.45);
      glow.addColorStop(0, 'rgba(255,255,255,0.55)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, floorY - 30, W, H - floorY + 30);
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
      for (let i = -14; i <= 14; i++) {
        ctx.beginPath(); ctx.moveTo(W * 0.5 + i * W * 0.02, floorY); ctx.lineTo(W * 0.5 + i * W * 0.12, H); ctx.stroke();
      }
      const off = (t * 0.25) % 1;
      for (let j = 0; j < 8; j++) {
        const f = Math.pow((j + off) / 8, 2.2), yy = floorY + f * (H - floorY);
        ctx.globalAlpha = 0.04 + f * 0.12; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // drifting dust in the light
      dust.forEach((d) => {
        d.y -= d.v * dt * speed; d.p += dt; if (d.y < 0) { d.y = 1; d.x = Math.random(); }
        ctx.globalAlpha = 0.25 + 0.25 * Math.sin(d.p * 1.5);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d.x * W, d.y * floorY, d.r, 0, 6.28); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // vignette
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    };

    // Never-stopping loop: schedule the next frame FIRST, so an error in one frame can't end the animation
    let lastFrame = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; lastFrame = performance.now();
      try { draw(dt); } catch (err) { /* skip this frame, keep looping */ }
    };
    const start = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop); };
    const onVis = () => { if (!document.hidden) start(); };
    // Watchdog: if frames ever stop while the page is visible, restart the loop
    const watchdog = setInterval(() => {
      if (!document.hidden && performance.now() - lastFrame > 1200) start();
    }, 1000);

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    start();
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(watchdog);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="fixed inset-0 w-full h-full -z-0 pointer-events-none" />;
}

export default StockBackground;
