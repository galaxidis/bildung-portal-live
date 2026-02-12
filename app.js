const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let allPosts = [];
let currentH5PId = null;

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
        document.getElementById('posts-container').innerHTML = "Fehler beim Laden.";
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
        
        return `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm">
                    <img src="${media}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold">${post.title.rendered}</h5>
                        <div class="mt-auto pt-3">
                            <button onclick="window.openContent(${post.id})" class="btn btn-sm btn-primary px-3 rounded-pill">Ansehen</button>
                            ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success px-3 rounded-pill">H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// Global machen, damit onclick im HTML greift
window.openContent = async function(postId, directH5P = false) {
    const modal = new bootstrap.Modal(document.getElementById('contentModal'));
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    body.innerHTML = "Wird geladen...";
    footer.innerHTML = "";
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        title.innerText = post.title.rendered;
        let content = post.content.rendered;
        
        // H5P ID finden
        const match = content.match(/h5p[ \-]?id=["']?(\d+)["']?/i);
        currentH5PId = match ? match[1] : null;

        if (directH5P && currentH5PId) {
            window.launchH5P();
        } else {
            body.innerHTML = content;
            if (currentH5PId) {
                footer.innerHTML = `<button onclick="window.launchH5P()" class="btn btn-success w-100 py-2">🚀 H5P Übung jetzt starten</button>`;
            }
        }
        
        // Links fixen
        body.querySelectorAll('a').forEach(link => link.target = "_blank");

    } catch (e) {
        body.innerHTML = "Fehler beim Laden des Beitrags.";
    }
};

window.launchH5P = function() {
    if (!currentH5PId) return;
    document.getElementById('modalTextContent').innerHTML = `
        <div class="ratio ratio-16x9">
            <iframe src="https://hub.bildungdigital.at/h5p/embed/${currentH5PId}" allowfullscreen style="border:none;"></iframe>
        </div>`;
    document.getElementById('modalFooter').innerHTML = `<button class="btn btn-outline-secondary w-100" onclick="location.reload()">Zurück</button>`;
};
