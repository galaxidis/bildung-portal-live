const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let allPosts = [];
let currentH5PId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        displayPosts(allPosts.filter(p => p.title.rendered.toLowerCase().includes(term) || p.content.rendered.toLowerCase().includes(term)));
    });
});

async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) { document.getElementById('posts-container').innerHTML = "Fehler beim Laden."; }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
        return `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius:15px; overflow:hidden;">
                    <img src="${media}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold" style="font-size: 1.1rem;">${post.title.rendered}</h5>
                        <div class="mt-auto pt-3 d-flex gap-2">
                            <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary px-3 rounded-pill">Details</button>
                            ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success px-3 rounded-pill">🚀 H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// HILFSFUNKTION: Sucht die ID in allen möglichen Formaten
function findH5PId(content) {
    // 1. Suche nach Shortcode [h5p id="5"]
    const shortcodeMatch = content.match(/h5p[ \-]?id=["']?(\d+)["']?/i);
    if (shortcodeMatch) return shortcodeMatch[1];

    // 2. Suche nach Iframe-Links (falls H5P bereits gerendert wurde)
    const iframeMatch = content.match(/h5p\/embed\/(\d+)/i);
    if (iframeMatch) return iframeMatch[1];

    // 3. Suche nach div-Attributen (Gutenberg Block)
    const attrMatch = content.match(/data-content-id=["']?(\d+)["']?/i);
    if (attrMatch) return attrMatch[1];

    return null;
}

window.openContent = async function(postId, directH5P = false) {
    const modal = new bootstrap.Modal(document.getElementById('contentModal'));
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    body.innerHTML = 'Wird geladen...';
    footer.innerHTML = "";
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        title.innerText = post.title.rendered;
        
        // ID finden
        currentH5PId = findH5PId(post.content.rendered);

        if (directH5P && currentH5PId) {
            window.launchH5P();
        } else {
            body.innerHTML = post.content.rendered;
            if (currentH5PId) {
                footer.innerHTML = `<button onclick="window.launchH5P()" class="btn btn-success w-100 py-3 fw-bold">🚀 Übung (ID: ${currentH5PId}) starten</button>`;
            } else if (directH5P) {
                body.innerHTML = `<div class="alert alert-warning">H5P erkannt, aber keine ID im Text gefunden. Bitte prüfe den Shortcode im Hub.</div>` + post.content.rendered;
            }
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
};

window.launchH5P = function() {
    if (!currentH5PId) return;
    document.getElementById('modalTextContent').innerHTML = `
        <div class="ratio ratio-16x9">
            <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${currentH5PId}" allowfullscreen style="border:none;"></iframe>
        </div>`;
    document.getElementById('modalFooter').innerHTML = `<button class="btn btn-outline-secondary w-100" onclick="location.reload()">← Zurück</button>`;
};
