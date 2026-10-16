const icon = n => `<svg class="ic"><use href="#i-${n}"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Kontent ----------
fetch('/api/data').then(r => r.json()).then(d => {
  document.getElementById('tagline').textContent = d.tagline;
  document.getElementById('serviceGrid').innerHTML = d.services.map(s =>
    `<div class="card glass"><div class="icon">${icon(s.icon)}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join('');
  document.getElementById('projectGrid').innerHTML = d.projects.map(p => {
    const ext = p.link.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    const head = p.live
      ? `<div class="ch-head"><div class="ch-av">G<img data-live-img="${p.live}" alt="${esc(p.title)} kanali" hidden></div><h3>${esc(p.title)}</h3></div>`
      : `<h3>${esc(p.title)}</h3>`;
    const sub = p.live ? `<span class="sub" data-live-sub="${p.live}">${icon('users')}<span>…</span></span>` : '<span></span>';
    return `<a class="card glass" href="${p.link}"${ext}>${head}<p>${esc(p.text)}</p>
      <div class="foot">${sub}<span>${esc(p.tag)} ${icon('arrow')}</span></div></a>`;
  }).join('');
  refreshLive();
});

// ---------- Telegramdan jonli ma'lumot ----------
function setImg(img, handle) {
  if (!img) return;
  img.onload = () => { img.hidden = false; };
  img.onerror = () => { img.hidden = true; };
  img.src = `/api/avatar/${handle}?t=${Math.floor(Date.now() / 300000)}`; // 5 daqiqada bir yangilanadi
}
async function refreshLive() {
  // Shaxsiy profil
  try {
    const r = await fetch('/api/telegram/AnvarovCoder'); if (!r.ok) throw 0;
    const i = await r.json();
    if (i.title) document.getElementById('p-name').textContent = i.title;
    if (i.description) document.getElementById('p-bio').textContent = i.description;
    if (i.title) document.getElementById('p-initial').textContent = i.title.trim()[0].toUpperCase();
    setImg(document.getElementById('p-img'), 'AnvarovCoder');
    document.getElementById('p-time').textContent = 'Yangilandi: ' + new Date().toLocaleTimeString('uz-UZ');
  } catch { document.getElementById('p-time').textContent = 'Telegramga ulanib bo\'lmadi, saqlangan ma\'lumot ko\'rsatilmoqda'; setImg(document.getElementById('p-img'), 'AnvarovCoder'); }
  // Kanal(lar)
  document.querySelectorAll('[data-live-sub]').forEach(async el => {
    const h = el.dataset.liveSub;
    try {
      const r = await fetch('/api/telegram/' + h); if (!r.ok) throw 0;
      const i = await r.json();
      if (i.extra) el.lastElementChild.textContent = i.extra;
    } catch { el.lastElementChild.textContent = 'Telegram kanali'; }
    setImg(document.querySelector(`[data-live-img="${h}"]`), h);
  });
}
setInterval(refreshLive, 60000);

// ---------- Qora-oq jonli fon ----------
const cv = document.getElementById('bg'), ctx = cv.getContext('2d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let W, H, dpr, pts = [];
const mouse = { x: -9999, y: -9999 };
const fogs = [
  { sx: .00021, sy: .00017, px: 0, py: 1, r: .55, a: .10 },
  { sx: .00015, sy: .00026, px: 2, py: 3, r: .45, a: .08 },
  { sx: .00028, sy: .00019, px: 4, py: 0, r: .38, a: .07 }
];
function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = Math.min(110, Math.floor(W * H / 12000));
  pts = Array.from({ length: n }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.2 + .5
  }));
}
addEventListener('resize', resize); resize();
addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

function frame(t) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // oq tuman (siljuvchi yorug'lik dog'lari)
  ctx.globalCompositeOperation = 'lighter';
  const m = Math.max(W, H);
  for (const f of fogs) {
    const x = W * (.5 + .4 * Math.sin(t * f.sx + f.px)), y = H * (.5 + .4 * Math.cos(t * f.sy + f.py)), r = m * f.r;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${f.a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // nuqtalar va ularni bog'lovchi chiziqlar
  ctx.globalCompositeOperation = 'source-over';
  for (const p of pts) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > W) p.vx *= -1;
    if (p.y < 0 || p.y > H) p.vy *= -1;
    const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
    if (d < 140 && d > 0) { p.x += dx / d * .6; p.y += dy / d * .6; } // sichqonchadan sal qochadi
  }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
    for (let j = i + 1; j < pts.length; j++) {
      const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 120) { ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 120) * .22})`; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
    if (dm < 160) { ctx.strokeStyle = `rgba(255,255,255,${(1 - dm / 160) * .5})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
  }
  if (!reduce) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
