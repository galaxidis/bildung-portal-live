import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import basicAuth from 'express-basic-auth';

const app = express();
const PORT = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CACHE VARIABLEN
let cachedData = null;
let cachedCats = null;
let lastFetch = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 Minuten in Millisekunden

app.use(basicAuth({
    users: { 'lehrer': 'digital2026' },
    challenge: true,
    realm: 'BILDUNGdigital Login',
}));

app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));

app.get('/', async (req, res) => {
    try {
        const now = Date.now();
        const forceRefresh = req.query.refresh === 'true';

        // PRÜFEN: MÜSSEN WIR NEU LADEN?
        if (!cachedData || (now - lastFetch > CACHE_DURATION) || forceRefresh) {
            console.log("🔄 Lade frische Daten von WordPress...");
            const [postsRes, catsRes] = await Promise.all([
                axios.get("https://bildungdigital.at/wp-json/wp/v2/posts?per_page=100"),
                axios.get("https://bildungdigital.at/wp-json/wp/v2/categories")
            ]);
            cachedData = postsRes.data;
            cachedCats = catsRes.data;
            lastFetch = now;
        } else {
            console.log("⚡ Nutze Daten aus dem Cache (Blitzschnell!)");
        }

        const findH5PId = (post) => {
            const textToScan = (post.content.rendered + post.excerpt.rendered);
            const regex = /\[h5p id=["']?(\d+)["']?\]|H5P:(\d+)|h5p-(\d+)/i;
            const match = textToScan.match(regex);
            return match ? (match[1] || match[2] || match[3]) : null;
        };

        const h5pCount = cachedData.filter(p => findH5PId(p)).length;

        let html = `<!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>BILDUNGdigital | Pro</title>
            <link rel="stylesheet" href="/css/bootstrap.min.css">
            <style>
                :root { --primary-color: #2c3e50; --accent-color: #18bc9c; }
                body { background: #e9ecef; font-family: 'Segoe UI', sans-serif; }
                .hero { background: linear-gradient(135deg, var(--primary-color) 0%, #34495e 100%); color: white; padding: 30px 0; border-bottom: 5px solid var(--accent-color); }
                .filter-btn { border-radius: 20px; padding: 8px 18px; margin: 3px; transition: 0.3s; }
                .card { border: none; border-radius: 15px; transition: 0.3s; background: white; }
                .card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
                .h5p-box { display: none; margin-top: 15px; border: 2px solid var(--accent-color); border-radius: 10px; overflow: hidden; }
                .hidden { display: none !important; }
                .cache-info { font-size: 0.7rem; opacity: 0.6; margin-top: 10px; }
            </style>
        </head>
        <body>

        <div class="hero shadow">
            <div class="container d-flex justify-content-between align-items-center flex-wrap">
                <div>
                    <h1 class="h3 fw-bold mb-0">🌐 BILDUNGdigital</h1>
                    <div class="cache-info">Stand: ${new Date(lastFetch).toLocaleTimeString()} | <a href="/?refresh=true" class="text-white text-decoration-underline">Jetzt aktualisieren</a></div>
                </div>
                <div class="w-50">
                    <input type="text" id="searchInput" class="form-control rounded-pill" placeholder="🔍 Suche...">
                </div>
            </div>
        </div>

        <div class="container mt-4">
            <div class="text-center mb-4">
                <button class="btn btn-dark filter-btn" onclick="filterCat('all')">Alle</button>
                ${cachedCats.map(cat => `
                    <button class="btn btn-white shadow-sm border filter-btn" onclick="filterCat('${cat.id}')">${cat.name}</button>
                `).join('')}
            </div>

            <div class="row" id="postsContainer">
                ${cachedData.map(post => {
                    const h5pId = findH5PId(post);
                    return `
                    <div class="col-md-6 col-lg-4 mb-4 post-column" data-title="${post.title.rendered.toLowerCase()}" data-cats="${post.categories.join(',')}">
                        <div class="card h-100 shadow-sm p-4">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h4 class="fw-bold h5">${post.title.rendered}</h4>
                                ${h5pId ? '<span class="badge bg-success">H5P</span>' : ''}
                            </div>
                            <p class="text-muted small">${post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
                            <div class="mt-auto d-grid">
                                ${h5pId ? `
                                    <button class="btn btn-success fw-bold" onclick="toggleH5P('box-${post.id}')">STARTEN</button>
                                    <div id="box-${post.id}" class="h5p-box">
                                        <iframe src="https://bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" width="100%" height="450" frameborder="0"></iframe>
                                    </div>
                                ` : '<button class="btn btn-outline-secondary disabled">Info-Material</button>'}
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <script>
            function filterCat(id) {
                document.querySelectorAll('.post-column').forEach(post => {
                    const cats = post.getAttribute('data-cats').split(',');
                    post.classList.toggle('hidden', id !== 'all' && !cats.includes(id));
                });
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.replace('btn-dark', 'btn-white'));
                event.target.classList.replace('btn-white', 'btn-dark');
            }

            document.getElementById('searchInput').addEventListener('input', function(e) {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.post-column').forEach(post => {
                    post.style.display = post.getAttribute('data-title').includes(term) ? 'block' : 'none';
                });
            });

            function toggleH5P(id) {
                const box = document.getElementById(id);
                box.style.display = (box.style.display === 'block') ? 'none' : 'block';
            }
        </script>
        </body></html>`;
        res.send(html);
    } catch (e) {
        res.status(500).send("Fehler: " + e.message);
    }
});

app.listen(PORT, () => console.log(`🚀 Performance-Dashboard auf http://localhost:${PORT}`));