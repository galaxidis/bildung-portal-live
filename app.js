/**
 * BILDUNGdigital Portal - Kernlogik
 * Stand: Februar 2026
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let allPosts = [];
let currentH5PId = null;

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPosts.filter(p => 
            p.title.rendered.toLowerCase().includes(term) || 
            p.content.rendered.toLowerCase().includes(term)
        );
        displayPosts(filtered);
    });
});

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

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted"><p>Keine Ergebnisse gefunden.</p></div>';
        return;
    }

    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 
                      'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        
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

        if (post._embedded && post._embedded['wp:term']) {
            const tags = post._embedded['wp:term'][1]; 
            if (tags) {
