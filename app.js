const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let allPosts = []; // Hier speichern wir die Posts für die Suche zwischen

document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    // SUCHE AKTIVIEREN: Lauscht auf jede Tasteneingabe
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
        allPosts = await response.json(); // Speichern für Suche
        displayPosts(allPosts); // Anzeigen
    } catch (e) {
        container.innerHTML = "Fehler beim Laden.";
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = posts.map(post => {
        // Bild-Logik: Prüfen, ob WordPress ein Bild liefert
        const media = post._embedded && post._embedded['wp:featuredmedia'] 
                      ? post._embedded['wp:featuredmedia'][0].source_url 
                      : 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?q=80&w=600&auto=format&fit=crop'; // Schöneres Standardbild
        
        return `
            <div class="col-md-4 mb-4 post-card">
                <div class="card h-100 shadow-sm border-0" onclick="openContent(${post.id})" style="cursor: pointer;">
                    <img src="${media}" class="card-img-top" style="height:200px; object-fit:cover;">
                    <div class="card-body">
                        <h5 class="card-title fw-bold">${post.title.rendered}</h5>
                        <p class="small text-muted">${post.excerpt.rendered.replace(/<[^>]*>?/gm, '').substring(0, 80)}...</p>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// Such-Logik
function filterAndDisplay(term) {
    const filtered = allPosts.filter(post => 
        post.title.rendered.toLowerCase().includes(term) || 
        post.content.rendered.toLowerCase().includes(term)
    );
    displayPosts(filtered);
}

// Die bekannte openContent Funktion von vorhin...
async function openContent(postId) {
    const modalElement = document.getElementById('contentModal');
    const modal = new bootstrap.Modal(modalElement);
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    title.innerText = "Lade...";
    body.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
    footer.innerHTML = '';
    modal.show();

    try {
        const response = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await response.json();
        title.innerText = post.title.rendered;
        body.innerHTML = post.content.rendered;
        
        if (post.content.rendered.toLowerCase().includes('h5p')) {
            footer.innerHTML = `<button class="btn btn-success w-100 py-3 fw-bold" onclick="launchH5P(${postId})">🚀 Interaktive Übung starten</button>`;
        }
    } catch (e) {
        body.innerHTML = "Inhalt konnte nicht geladen werden.";
    }
}

function launchH5P(postId) {
    const body = document.getElementById('modalTextContent');
    body.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/h5p/embed/${postId}" allowfullscreen></iframe></div>`;
}
