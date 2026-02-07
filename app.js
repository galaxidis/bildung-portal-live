const API_URL = 'https://bildungdigital.at/wp-json/wp/v2/posts?categories=6&per_page=100&_embed';
const STATS_URL = 'https://backend.bildungdigital.at/stats-bridge.php';

async function fetchPosts() {
    try {
        console.log('Lade Daten von:', API_URL);
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
        const posts = await response.json();
        displayPosts(posts);
        setupSearch(posts);
        setupCategoryFilter(posts);
    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        document.getElementById('post-container').innerHTML = `
            <div style="text-align:center; padding: 20px;">
                <p>Inhalte konnten nicht geladen werden.</p>
                <small>Bitte prüfe, ob die Brücke unter backend.bildungdigital.at aktiv ist.</small>
            </div>`;
    }
}

function displayPosts(posts) {
    const container = document.getElementById('post-container');
    container.innerHTML = '';

    posts.forEach(post => {
        // H5P-Shortcode aus dem Content extrahieren
        const content = post.content.rendered;
        const h5pMatch = content.match(/\[h5p id="(\d+)"\]/);
        const h5pId = h5pMatch ? h5pMatch[1] : null;

        if (h5pId) {
            const card = document.createElement('div');
            card.className = 'post-card';
            
            // Die Iframe-URL nutzt nun auch die backend-Subdomain
            const iframeSrc = `https://backend.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}`;
            
            card.innerHTML = `
                <h3>${post.title.rendered}</h3>
                <div class="h5p-container">
                    <iframe src="${iframeSrc}" width="100%" height="400" frameborder="0" allowfullscreen="allowfullscreen"></iframe>
                </div>
            `;
            
            // Statistik-Event
            card.addEventListener('click', () => {
                fetch(STATS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `post_id=${post.id}&post_title=${encodeURIComponent(post.title.rendered)}`
                }).catch(err => console.error('Statistik-Fehler:', err));
            });

            container.appendChild(card);
        }
    });
}

function setupSearch(posts) {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = posts.filter(post => 
            post.title.rendered.toLowerCase().includes(term)
        );
        displayPosts(filtered);
    });
}

function setupCategoryFilter(posts) {
    const filterContainer = document.getElementById('category-filter');
    if (!filterContainer) return;
    const categories = ['Alle', 'Mathematik', 'Deutsch', 'Religion'];
    
    filterContainer.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.textContent = cat;
        btn.onclick = () => {
            if (cat === 'Alle') {
                displayPosts(posts);
            } else {
                const filtered = posts.filter(post => 
                    post.content.rendered.toLowerCase().includes(cat.toLowerCase())
                );
                displayPosts(filtered);
            }
        };
        filterContainer.appendChild(btn);
    });
}

// Start
fetchPosts();


