const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let allPosts = []; 
let currentH5PId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterAndDisplay(searchTerm);
        });
    }
});

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    try {
        const response = await fetch(API_URL);
        allPosts = await response.json();
        displayPosts(allPosts);
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger">Fehler beim Laden vom Hub.</div>`;
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;
    if (posts.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted"><p>Nichts gefunden.</p></div>';
        return;
    }

    container.innerHTML = posts.map(post => {
        const media = post._embedded && post._embedded['wp:featuredmedia'] 
                      ? post._embedded['wp:featuredmedia'][0].source_url 
                      : 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?q=80&w=600&auto=format&fit=crop';
        
        const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
        
        // WICHTIG: Kein onclick mehr im äußeren div!
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius: 15px; overflow: hidden;">
                    <div style="height: 200px; overflow: hidden;">
                        <img src="${media}" class="card-img-top" style="object-fit: cover; width: 100%; height: 100%;">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold">${post.title.rendered}</h5>
                        <div class="card-text text-muted small mb-3">
                            ${post.excerpt.rendered.replace(/<[^>]*>?/gm, '').substring(0, 90)}...
                        </div>
                        <div class="mt-auto d-flex gap-2">
                            <button onclick="openContent(${post.id})" class="btn btn-primary btn-sm rounded-pill px-3">Details</button>
                            ${hasH5P ? `<button onclick="openContent(${post.id}, true)" class="btn btn-success btn-sm rounded-pill px-3">H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function filterAndDisplay(term) {
    const filtered = allPosts.filter(post => 
        post.title.rendered.toLowerCase().includes(term) || 
        post.content.rendered.toLowerCase().includes(term)
    );
    displayPosts(filtered);
}

// Erweiterte Funktion: Kann jetzt direkt H5P starten, wenn der zweite Parameter true ist
async function openContent(postId, directH5P = false) {
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

        const h5pMatch = content.match(/h5p[ \-]?id=["']?(\d+)["']?/i);
        
        if (h5pMatch && h5pMatch[1]) {
            currentH5PId = h5pMatch[1];
            // Wenn directH5P wahr ist, starten wir sofort den Iframe
            if (directH5P) {
                launchH5P();
                return; 
            }
            footer.innerHTML = `<button class="btn btn-success w-100 py-3 fw-bold" onclick="launchH5P()">🚀 Interaktive H5P Übung öffnen</button>`;
        } else {
            footer.innerHTML = '<button class="btn btn-secondary w-100" data-bs-dismiss="modal">Schließen</button>';
        }

        body.innerHTML = content;
        
        const links = body.getElementsByTagName('a');
        for (let link of links) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }

    } catch (e) {
        body.innerHTML = "Fehler beim Laden.";
    }
}

function launchH5P() {
    if (!currentH5PId) return;
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    footer.innerHTML = '<button class="btn btn-outline-secondary w-100" onclick="location.reload()">← Zurück zur Übersicht</button>';
    
    body.innerHTML = `
        <div class="ratio ratio-16x9 shadow-sm" style="border-radius: 10px; overflow: hidden;">
            <iframe src="https://hub.bildungdigital.at/h5p/embed/${currentH5PId}" 
                    allowfullscreen 
                    style="border:none;"></iframe>
        </div>`;
}
