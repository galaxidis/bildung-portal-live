const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        
        container.innerHTML = posts.map(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            return `
                <div class="col-md-4">
                    <div class="card shadow-sm">
                        <img src="${media}" class="card-img-top">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title fw-bold" style="color:#003366;">${post.title.rendered}</h5>
                            <div class="mt-auto d-flex gap-2">
                                <button onclick="window.openContent(${post.id}, false)" class="btn btn-outline-primary btn-pill flex-fill">Details</button>
                                ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-success btn-pill flex-fill text-white">🚀 Start</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        container.innerHTML = "Portal konnte nicht geladen werden.";
    }
}

window.openContent = async function(postId, directH5P) {
    const modalEl = document.getElementById('contentModal');
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = "Lädt...";
    footer.innerHTML = "";
    bModal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const idTag = post._embedded['wp:term'][1]?.find(t => !isNaN(t.name));
            if (idTag) h5pId = idTag.name;
        }

        if (directH5P && h5pId) {
            body.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" allowfullscreen style="border:none;"></iframe></div>`;
        } else {
            body.innerHTML = `<h3>${post.title.rendered}</h3><hr>${post.content.rendered}`;
            if (h5pId) {
                footer.innerHTML = `<button onclick="window.openContent(${post.id}, true)" class="btn btn-success btn-pill w-100 py-3">🚀 Übung jetzt öffnen</button>`;
            }
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
};

document.addEventListener('DOMContentLoaded', fetchPosts);

// Suche
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#posts-container .col-md-4').forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
});
