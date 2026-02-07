import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import basicAuth from 'express-basic-auth';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BRIDGE_URL = "https://bildungdigital.at/stats-bridge.php";

app.use(basicAuth({
    users: { 'lehrer': 'digital2026' },
    challenge: true,
    realm: 'BILDUNGdigital Login',
}));

app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));

app.get('/api/track/:id', async (req, res) => {
    try {
        await axios.get(`${BRIDGE_URL}?action=track&id=${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Tracking Error:", err.message);
        res.status(500).json({ error: "Bridge Error" });
    }
});

app.get('/', async (req, res) => {
    try {
        const [postsRes, statsRes] = await Promise.all([
            axios.get("https://bildungdigital.at/wp-json/wp/v2/posts?per_page=100").catch(() => ({ data: [] })),
            axios.get(BRIDGE_URL).catch(() => ({ data: {} }))
        ]);

        const posts = postsRes.data || [];
        const stats = statsRes.data || {};

        let html = `<!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>BILDUNGdigital | Portal</title>
            <link rel="stylesheet" href="/css/bootstrap.min.css">
            <style>
                :root { --primary: #2c3e50; --accent: #18bc9c; }
                body { background: #f4f7f6; font-family: 'Segoe UI', sans-serif; }
                .hero { background: var(--primary); color: white; padding: 30px 0; border-bottom: 5px solid var(--accent); }
                .card { border: none; border-radius: 15px; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.1); position: relative; }
                .card:hover { transform: translateY(-5px); }
                .stat-badge { position: absolute; top: 10px; right: 10px; background: rgba(24, 188, 156, 0.1); color: var(--accent); padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: bold; }
                .h5p-modal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background: white; }
                .h5p-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
                iframe { width: 100%; height: calc(100% - 70px); border: none; }
            </style>
        </head>
        <body>
        <div id="h5pLayer" class="h5p-modal">
            <div class="h5p-header">
                <h5 id="h5pTitle" class="m-0">Aufgabe</h5>
                <button class="btn btn-danger rounded-pill" onclick="closeH5P()">Beenden ✕</button>
            </div>
            <iframe id="h5pFrame" src=""></iframe>
        </div>
        <div class="hero text-center">
            <div class="container">
                <h1>BILDUNGdigital</h1>
                <p>Deine interaktive Lernplattform</p>
                <input type="text" id="searchInput" class="form-control form-control-lg rounded-pill shadow-sm" placeholder="Nach Thema suchen...">
            </div>
        </div>
        <div class="container mt-4">
            <div class="row" id="postsContainer">
                ${posts.map(post => {
                    if (!post || !post.id) return '';
                    
                    // DIE WICHTIGE REPARATUR: Wir suchen im gerenderten Content nach der H5P ID
                    const contentString = post.content ? post.content.rendered : "";
                    const h5pMatch = contentString.match(/h5p-?(\d+)/i) || contentString.match(/id="(\d+)"/i);
                    const h5pId = h5pMatch ? h5pMatch[1] : null;
                    
                    const count = stats[post.id] || 0;
                    return `
                    <div class="col-12 col-md-6 col-lg-4 mb-4 post-column" data-title="${post.title.rendered.toLowerCase()}">
                        <div class="card h-100 p-3">
                            <span class="stat-badge">Aufrufe: ${count}</span>
                            <h5 class="fw-bold mt-2">${post.title.rendered}</h5>
                            <div class="small text-muted mb-3">${post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 90)}...</div>
                            ${h5pId ? `
                                <button class="btn btn-success w-100 mt-auto fw-bold" onclick="openH5P('${post.title.rendered}', '${h5pId}', '${post.id}')">LERNEN STARTEN</button>
                            ` : '<button class="btn btn-secondary w-100 mt-auto disabled">Kein H5P gefunden</button>'}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
        <script>
            function openH5P(title, h5pId, postId) {
                document.getElementById('h5pTitle').innerText = title;
                document.getElementById('h5pFrame').src = 'https://bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=' + h5pId;
                document.getElementById('h5pLayer').style.display = 'block';
                document.body.style.overflow = 'hidden';
                fetch('/api/track/' + postId);
            }
            function closeH5P() {
                document.getElementById('h5pLayer').style.display = 'none';
                document.getElementById('h5pFrame').src = '';
                document.body.style.overflow = 'auto';
                location.reload(); 
            }
            document.getElementById('searchInput').addEventListener('input', function(e) {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.post-column').forEach(post => {
                    post.style.display = post.getAttribute('data-title').includes(term) ? 'block' : 'none';
                });
            });
        </script>
        </body></html>`;
        res.send(html);
    } catch (e) {
        console.error("Fehler:", e);
        res.status(500).send("Portal konnte nicht geladen werden.");
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Portal aktiv auf Port ${PORT}`));
