// Hech qanday paket kerak emas (npm install shart emas). Node 18+ yetarli.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

// ====== Shu yerdan ma'lumotlarni o'zgartiring ======
const data = {
  name: 'Anvarov',
  username: 'AnvarovCoder',
  channel: 'giftxona',
  tagline: "Telegram Premium, Stars va NFT sovg'alar. Tez yetkazish, aniq narx, ochiq muloqot.",
  services: [
    { icon: 'gem',  title: 'Telegram Premium', text: "1, 3, 6 va 12 oylik obuna. Akkauntga kirish shart emas, username yetarli." },
    { icon: 'star', title: 'Telegram Stars',   text: "Bot, kanal va mini-app to'lovlari uchun Stars paketlari. Istalgan miqdorda." },
    { icon: 'gift', title: "NFT va sovg'alar", text: "Telegram NFT sovg'alar va username savdosi. Kelishuv oldindan, to'lov xavfsiz." },
    { icon: 'code', title: 'Dasturlash',       text: "Telegram botlar va Node.js saytlar buyurtma asosida." }
  ],
  projects: [
    { title: 'Giftxona', text: "Telegram Premium, Stars va NFT sotiladigan kanal. Men uning adminiman.", link: 'https://t.me/giftxona', tag: '@giftxona', live: 'giftxona' },
    { title: 'Shaxsiy portfolio', text: "Qora-oq jonli fon va shisha vidjetlar. Telegram profil ma'lumotlari sayt ochilganda jonli olinadi.", link: '#top', tag: 'Node.js' }
    // Yangi loyiha: { title, text, link, tag }
  ]
};
// ===================================================

const ALLOWED = new Set([data.username, data.channel].map(s => s.toLowerCase()));
const cache = new Map(); // handle -> { at, info }
const TTL = 5 * 60 * 1000;
const UA = 'Mozilla/5.0 (compatible; PortfolioBot/1.0)';

const decode = s => (s || '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
const pick = (html, re) => { const m = html.match(re); return m ? decode(m[1]) : ''; };

async function fetchTelegram(handle) {
  const hit = cache.get(handle);
  if (hit && Date.now() - hit.at < TTL) return hit.info;
  const res = await fetch(`https://t.me/${handle}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('t.me status ' + res.status);
  const html = await res.text();
  const info = {
    handle,
    title: pick(html, /<div class="tgme_page_title"[^>]*>([\s\S]*?)<\/div>/) || pick(html, /property="og:title" content="([^"]*)"/),
    description: pick(html, /<div class="tgme_page_description"[^>]*>([\s\S]*?)<\/div>/) || pick(html, /property="og:description" content="([^"]*)"/),
    extra: pick(html, /<div class="tgme_page_extra"[^>]*>([\s\S]*?)<\/div>/),
    image: pick(html, /property="og:image" content="([^"]*)"/),
    fetchedAt: new Date().toISOString()
  };
  cache.set(handle, { at: Date.now(), info });
  return info;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

function serveFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Topilmadi'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === '/api/data') return json(res, 200, data);

    let m = p.match(/^\/api\/telegram\/([A-Za-z0-9_]+)$/);
    if (m) {
      const h = m[1].toLowerCase();
      if (!ALLOWED.has(h)) return json(res, 403, { error: 'ruxsat yo\'q' });
      try { const i = await fetchTelegram(h); return json(res, 200, { ...i, image: undefined, hasImage: !!i.image }); }
      catch (e) { return json(res, 502, { error: 'Telegramdan olib bo\'lmadi' }); }
    }

    m = p.match(/^\/api\/avatar\/([A-Za-z0-9_]+)$/);
    if (m) {
      const h = m[1].toLowerCase();
      if (!ALLOWED.has(h)) { res.writeHead(403); return res.end(); }
      try {
        const info = await fetchTelegram(h);
        const u = new URL(info.image);
        if (!/(telesco\.pe|telegram\.org|cdn\d*\.)/.test(u.hostname)) throw new Error('host');
        const img = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
        if (!img.ok) throw new Error('img');
        const buf = Buffer.from(await img.arrayBuffer());
        res.writeHead(200, { 'Content-Type': img.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'public, max-age=300' });
        return res.end(buf);
      } catch (e) {
        // zaxira: public/avatar-<handle>.jpg bo'lsa shuni beradi
        const fb = path.join(PUBLIC, `avatar-${h}.jpg`);
        if (fs.existsSync(fb)) return serveFile(res, fb);
        res.writeHead(404); return res.end();
      }
    }

    const file = path.join(PUBLIC, p === '/' ? 'index.html' : p);
    if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
    serveFile(res, file);
  } catch (e) { res.writeHead(500); res.end('Xato'); }
}).listen(PORT, () => console.log(`Sayt ishga tushdi: http://localhost:${PORT}`));
