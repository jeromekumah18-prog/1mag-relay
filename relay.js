// Tiny relay for 1Mag cosmetic sync. No dependencies: `RELAY_KEY=yoursecret node relay.js`
const http = require("http");
const KEY = process.env.RELAY_KEY || "1magddpxxttiov";
const PORT = process.env.PORT || 3000;
const TTL_MS = 20000;
const jobs = new Map(); // jobId -> Map(userId -> { t, loadout })

http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/sync") { res.writeHead(404); return res.end(); }
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 20000) req.destroy(); });
  req.on("end", () => {
    let m;
    try { m = JSON.parse(body); } catch { res.writeHead(400); return res.end(); }
    if (m.key !== KEY || typeof m.jobId !== "string" || m.jobId.length > 64 || !Number.isInteger(m.userId)) {
      res.writeHead(403); return res.end();
    }
    if (!jobs.has(m.jobId)) jobs.set(m.jobId, new Map());
    const job = jobs.get(m.jobId);
    const loadout = m.loadout && typeof m.loadout === "object" && !Array.isArray(m.loadout) ? m.loadout : {};
    job.set(m.userId, { t: Date.now(), loadout });
    const players = {};
    for (const [uid, v] of job) if (uid !== m.userId) players[uid] = v.loadout;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ players }));
  });
}).listen(PORT, () => console.log("relay on " + PORT));

setInterval(() => {
  const now = Date.now();
  for (const [jid, job] of jobs) {
    for (const [uid, v] of job) if (now - v.t > TTL_MS) job.delete(uid);
    if (job.size === 0) jobs.delete(jid);
  }
}, 5000);
