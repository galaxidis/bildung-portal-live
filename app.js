/**
 * BILDUNGdigital Portal - Kernlogik
 * Stand: Februar 2026
 * Features: Live-Suche, H5P-Detektiv via Tags, Responsive Modals
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let allPosts = [];
let currentH5PId = null;

// 1. Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    // Live-Suche Event-Listener
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPosts.filter(p => 
            p.title.rendered.toLowerCase().includes(term) || 
            p.content.rendered.toLowerCase().includes(term)
        );
        displayPosts(filtered);
    });
});

// 2. Daten vom WordPress-Hub abrufen
async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) {
        console.error("API-Fehler:", e);
        document.getElementById('posts-container').innerHTML = 
            '<div class="col-12 text-center text-danger"><p>Inhalte konnten nicht geladen werden.</p></div>';
    }
}

// 3. Kacheln im Grid anzeigen
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted"><p>Keine Ergebnisse gefunden.</p></div>';
        return;
    }

    container.innerHTML = posts.map(post => {
        // Beitragsbild oder Platzhalter
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 
                      'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        
        // H5P-Check (für die Button-Anzeige)
        const hasH5P = post.content.rendered.toLowerCase().includes('h5p') || 
                       post.title.rendered.toLowerCase().includes('h5p');
        
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius:15px; overflow:hidden;">
                    <img src="${media}" class="card-img-top" style="height:180px; object-fit:cover;" alt="Thumbnail">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold" style="font-size: 1.1rem; color: #2c3e50;">${post.title.rendered}</h5>
                        <div class="card-text text-muted small mb-3">
                            ${post.excerpt.rendered.replace(/<[^>]*>?/gm, '').substring(0, 80)}...
                        </div>
                        <div class="mt-auto pt-2 d-flex gap-2">
                            <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary px-3 rounded-pill">Details</button>
                            ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success px-3 rounded-pill shadow-sm">🚀 H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// 4. Inhalt im Modal öffnen & ID-Detektiv
window.openContent = async function(postId, directH5P = false) {
    const modalElement = document.getElementById('contentModal');
    const modal = new bootstrap.Modal(modalElement);
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    body.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
    footer.innerHTML = "";
    currentH5PId = null; 
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        title.innerText = post.title.rendered;
        let content = post.content.rendered;

        // --- ID-DETEKTIV LOGIK ---
        // Weg A: Suche in den Schlagwörtern (Tags) - Priorität 1
        if (post._embedded && post._embedded['wp:term']) {
            const tags = post._embedded['wp:term'][1]; 
            if (tags) {
                const idTag = tags.find(t => !isNaN(t.name)); 
                if (idTag) currentH5PId = idTag.name;
            }
        }

        // Weg B: Fallback Suche im Text
        if (!currentH5PId) {
            const match = content.match(/h5p[ \-]?id=["']?(\d+)["']?/i) || content.match(/h5p\/embed\/(\d+)/i);
            if (match) currentH5PId = match[1];
        }

        // Anzeige-Entscheidung
        if (directH5P && currentH5PId) {
            window.launchH5P();
        } else {
            body.innerHTML = content;
            if (currentH5PId) {
                footer.innerHTML = `<button onclick="window.launchH5P()" class="btn btn-success w-100 py-3 fw-bold">🚀 Interaktive Übung öffnen</button>`;
            } else if (directH5P) {
                body.innerHTML = `<div class="alert alert-warning">H5P-Tag fehlt! Bitte die ID (z.B. 1) als Schlagwort im Hub hinzufügen.</div>` + content;
            }
        }
        
        // Externe Links in neuem Tab öffnen
        body.querySelectorAll('a').forEach(link => link.target = "_blank");

    } catch (e) {
        body.innerHTML = "Fehler beim Laden des Beitrags.";
    }
};

// 5. H5P Iframe laden
window.launchH5P = function() {
    if (!currentH5PId) return;
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = `
        <div class="ratio ratio-16x9 shadow-sm" style="border-radius:12px; overflow:hidden;">
            <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${currentH5PId}" 
                    allowfullscreen 
                    style="border:none; width:100%; height:100%;"></iframe>
        </div>`;
    
    footer.innerHTML = `<button class="btn btn-outline-secondary w-100" onclick="location.reload()">← Zurück zur Übersicht</button>`;
};
