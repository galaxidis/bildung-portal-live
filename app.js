/**
 * BILDUNGdigital Portal - Kernlogik
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let allPosts = [];
let currentH5PId = null;

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    // Live-Suche
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPosts.filter(p => 
            p.title.rendered.toLowerCase().includes(term) || 
            p.excerpt.rendered.toLowerCase().includes(term)
        );
        displayPosts(filtered);
    });
});

async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Netzwerk-Antwort war nicht ok");
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) {
        console.error("API-Fehler:", e);
        const container = document.getElementById('posts-container');
        if (container) {
            container.innerHTML = `<div class="col-12 text-center py-5">
                <p class="text-danger">Fehler: Die Inhalte konnten nicht geladen werden.</p>
                <button class="btn btn-primary btn-round" onclick="location.reload()">Nochmal versuchen</button>
            </div>`;
        }
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = '<div class="col-12 text-center"><p>Nichts gefunden.</p></div>';
        return;
    }

    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 
                      'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        
        const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
        
        return `
            <div class="col-md-4">
                <div class="card shadow-sm border-0">
                    <img src="${media}" class="card-img-top">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold" style="color:#003366;">${post.title.rendered}</h5>
                        <div class="card-text text-muted small mb-3">
                            ${post.excerpt.rendered.replace(/<[^>]*>?/gm, '').substring(0, 90)}...
                        </div>
                        <div class="mt-auto d-flex gap-2">
                            <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary btn-round">Details</button>
                            ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success btn-round">🚀 H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

window.openContent = async function(postId, directH5P = false) {
    const modalElement = document.getElementById('contentModal');
    const modal = new bootstrap.Modal(modalElement);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
    footer.innerHTML = "";
    currentH5PId = null;
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        document.getElementById('modalTitle').innerText = post.title.rendered;
        
        // ID-Suche (Tags oder Text)
        if (post._embedded?.['wp:term']) {
            const idTag = post._embedded['wp:term'][1]?.find(t => !isNaN(t.name));
            if (idTag) currentH5PId = idTag.name;
        }
        if (!currentH5PId) {
            const match = post.content.rendered.match(/h5p[ \-]?id=["']?(\d+)["']?/i);
            if (match) currentH5PId = match[1];
        }

        if (directH5P && currentH5PId) {
            window.launchH5P();
        } else {
            body.innerHTML = post.content.rendered;
            if (currentH5PId) {
                footer.innerHTML = `<button onclick="window.launchH5P()" class="btn btn-success btn-round w-100 py-3">🚀 Interaktive Übung öffnen</button>`;
            }
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
};

window.launchH5P = function() {
    if (!currentH5PId) return;
    document.getElementById('modalTextContent').innerHTML = `
        <div class="ratio ratio-16x9 shadow rounded overflow-hidden">
            <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${currentH5PId}" allowfullscreen style="border:none;"></iframe>
        </div>`;
    document.getElementById('modalFooter').innerHTML = `<button class="btn btn-outline-secondary btn-round w-100" onclick="location.reload()">← Zurück</button>`;
};
