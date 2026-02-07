import express from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import basicAuth from 'express-basic-auth';

const app = express();
const PORT = process.env.PORT || 3000; // Wichtig für Render!
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATS_FILE = path.join(__dirname, 'stats.json');

// CACHE & STATS INITIALISIEREN
let cachedData = null;
let cachedCats = null;
let lastFetch = 0;
const CACHE_DURATION = 10 * 60 * 1000;

// Hilfsfunktion: Statistik laden/speichern
const getStats = () => {
    if (!fs.existsSync(STATS_FILE)) return {};
    return JSON.parse(fs.readFileSync(STATS_FILE));
};

app.use(basicAuth({
    users: { 'lehrer': 'digital2026' },
    challenge: true,
    realm: 'BILDUNGdigital Login',
}));

app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));

// ROUTE FÜR STATISTIK-UPDATE (Wird per JavaScript vom Browser gerufen)
app.get('/api/track/:id', (res, req) => {
    const postId = req.params.id;
    const stats = getStats();
    stats[postId] = (stats[postId] || 0) + 1;
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats));
    res.json({ success: true, count: stats[postId] });
});

app.get('/', async (req, res) => {
    try {
        const now = Date.now();
        if (!cachedData || (now - lastFetch > CACHE_DURATION) || req.query.refresh === 'true') {
            const [postsRes, catsRes] = await Promise.all([
                axios.get("https://bildungdigital.at/wp-json/wp/v2/posts?per_page=100"),
                axios.get("https://bildungdigital.at/wp-json/wp/v2/categories")
            ]);
            cachedData = postsRes.data;
            cachedCats = catsRes.data;
            lastFetch = now;
        }

        const stats = getStats();

        const findH5PId = (post) => {
            const textToScan = (post.content.rendered + post.excerpt.rendered);
            const regex = /\[h5p id=["']?(\d+)["']?\]|H5P:(\d+)|h5p-(\d+)/i;
            const match = textToScan.match(regex);
            return match ? (match[1] || match[2] || match[3]) : null;
        };

        let html = `<!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>BILDUNGdigital | Mobil</title>
            <link rel="stylesheet" href="/css/bootstrap.min.css">
            <style>
                :root { --primary-color: #2c3e50; --accent-color: #18bc9c; }
                body { background: #f8f9fa; font-family: sans-serif; -webkit-tap-highlight-color: transparent; }
                .hero { background: var(--primary-color); color: white; padding: 20px 0; border-bottom: 5px solid var(--accent-color); }
                .card { border-radius: 12px; border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 15px; }
                .btn-primary { background-color: var(--accent-color); border: none; padding: 12px; font-weight: bold; }
                
                /* H5P Fullscreen Modal Style */
                .h5p-modal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background: white; }
                .h5p-header { background: #eee; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
                iframe { width: 100%; height: calc(100% - 50px); border: none; }
                
                .stat-badge { font-size: 0.7rem; background: #eee; padding: 2px 6px; border-radius: 10px; color: #666; }
                @media (max-width: 600px) { .hero h1 { font-size: 1.5rem; } }
            </style>
        </head>
        <body>

        <div id="h5pLayer" class="h5p-modal">
            <div class="h5p-header">
                <span id="h5pTitle" class="fw-bold ms-2">Aufgabe</span>
                <button class="btn btn-sm btn-danger" onclick="closeH5P()">Schließen ✕</button>
            </div>
            <iframe id="h5pFrame" src=""></iframe>
        </div>

        <div class="hero text-center">
            <div class="container">
                <h1 class="fw-bold">🌐 BILDUNGdigital</h1>
                <input type="text" id="searchInput" class="form-control rounded-pill mt-3" placeholder="Suchen...">
            </div>
        </div>

        <div class="container mt-3">
            <div class="row" id="postsContainer">
                ${cachedData.map(post => {
                    const h5pId = findH5PId(post);
                    const clicks = stats[post.id] || 0;
                    return `
                    <div class="col-12 col-md-6 col-lg-4 post-column" data-title="${post.title.rendered.toLowerCase()}">
                        <div class="card p-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <h5 class="fw-bold">${post.title.rendered}</h5>
                                <span class="stat-badge">Aufrufe: ${clicks}</span>
                            </div>
                            <p class="small text-muted">${post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 80)}...</p>
                            ${h5pId ? `
                                <button class="btn btn-primary w-100" onclick="openH5P('${post.title.rendered}', '${h5pId}', '${post.id}')">LERNEN STARTEN</button>
                            ` : '<button class="btn btn-light w-100 disabled">Nur Info</button>'}
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
                document.body.style.overflow = 'hidden'; // Scrollen verhindern
                
                // Statistik an Server senden
                fetch('/api/track/' + postId);
            }

            function closeH5P() {
                document.getElementById('h5pLayer').style.display = 'none';
                document.getElementById('h5pFrame').src = '';
                document.body.style.overflow = 'auto';
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
        res.status(500).send("Fehler: " + e.message);
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Live auf Port ${PORT}`));
