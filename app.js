// Konfiguration
const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let allPosts = []; // Speicher für die Suchfunktion
let currentH5PId = null; // Speicher für die erkannte H5P-ID

// 1. Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    // Suchfunktion aktivieren
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterAndDisplay(searchTerm);
        });
    }
});

// 2. Posts vom WordPress-Hub laden
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    try {
        const response = await fetch(API_URL);
        allPosts = await response.json();
        displayPosts(allPosts);
    } catch (e) {
        console.error("Ladefehler:", e);
        container.innerHTML = `<div class="alert alert-danger">Fehler beim Laden der Inhalte vom Hub.</div>`;
    }
}

// 3. Posts auf der Seite rendern
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted"><p>Keine Ergebnisse gefunden.</p></div>';
        return;
    }

    container.innerHTML = posts.map(post => {
        // Bild-Logik: Beitragsbild oder schöner Unsplash-Ersatz
        const media = post._embedded && post._embedded['wp:featuredmedia'] 
                      ? post._embedded['wp:featuredmedia'][0].source_url 
                      : 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?q=80&w=600&auto=format&fit=crop';
        
        const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
        
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0" onclick="openContent(${post.id})" style="cursor: pointer; transition: transform 0.2s; border-radius: 15px; overflow: hidden;">
                    <div style="height: 200px; overflow: hidden;">
                        <img src="${media}" class="card-img-top" style="object-fit: cover; width: 100%; height: 100%;">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold" style="color: #2c3e50;">${post.title.rendered}</h5>
                        <div class="card-text text-muted small mb-3">
                            ${post.excerpt.rendered.replace(/<[^>]*>?/gm, '').substring(0, 90)}...
                        </div>
                        <div class="mt-auto">
                            <span class="badge rounded-pill bg-primary px-3">Ansehen</span>
                            ${hasH5P ? '<span class="badge rounded-pill bg-success px-3">H5P Übung</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// 4. Echtzeit-Suche
function filterAndDisplay(term) {
    const filtered = allPosts.filter(post => 
        post.title.rendered.toLowerCase().includes(term) || 
        post.content.rendered.toLowerCase().includes(term)
    );
    displayPosts(filtered);
}

// 5. Inhalt im Modal öffnen & H5P-ID finden
async function openContent(postId) {
    const modalElement = document.getElementById('contentModal');
    const modal = new bootstrap.Modal(modalElement);
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    title.innerText = "Lade...";
    body.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
    footer.innerHTML = '';
    currentH5PId = null; 
    
    modal.show();

    try {
        const response = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await response.json();

        title.innerText = post.title.rendered;
        let content = post.content.rendered;

        // Versuche die H5P ID aus dem Shortcode [h5p id="XX"] zu extrahieren
        const h5pMatch = content.match(/h5p id=["']?(\d+)["']?/i);
        
        if (h5pMatch && h5pMatch[1]) {
            currentH5PId = h5pMatch[1];
            footer.innerHTML = `
                <button class="btn btn-success w-100 py-3 fw-bold" onclick="launchH5P()">
                    🚀 Interaktive Übung (H5P) starten
                </button>`;
        } else {
            footer.innerHTML = '<button class="btn btn-secondary w-100" data-bs-dismiss="modal">Schließen</button>';
        }

        body.innerHTML = content;

        // Alle Links im Modal so umbauen, dass sie in neuem Tab öffnen
        const links = body.getElementsByTagName('a');
        for (let link of links) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }

    } catch (e) {
        body.innerHTML = "Fehler beim Laden des Beitrags.";
    }
}

// 6. H5P Iframe laden
function launchH5P() {
    if (!currentH5PId) return;
    
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    footer.innerHTML = '<button class="btn btn-outline-secondary w-100" onclick="location.reload()">← Zurück zur Übersicht</button>';
    
    // Der Embed-Pfad für WordPress H5P Plugin
    body.innerHTML = `
        <div class="ratio ratio-16x9">
            <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${currentH5PId}" 
                    allowfullscreen 
                    style="border:none;"></iframe>
        </div>`;
}
