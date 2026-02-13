const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        
        container.innerHTML = posts.map(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            // col-md-4 sorgt für 3 Kacheln nebeneinander auf dem Desktop
            return `
                <div class="col-12 col-sm-6 col-md-4 post-card-container">
                    <div class="card">
                        <div class="img-box">
                            <img src="${media}" class="card-img-top">
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${post.title.rendered}</h5>
                            <div class="mt-auto d-flex gap-2">
                                <button onclick="openContent(${post.id}, false)" class="btn btn-outline-primary btn-pill flex-fill">Details</button>
                                ${hasH5P ? `<button onclick="openContent(${post.id}, true)" class="btn btn-success btn-pill flex-fill">🚀 Start</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        container.innerHTML = "Fehler beim Laden.";
    }
}

// Öffnen-Logik
window.openContent = async function(postId, directH5P) {
    const modalEl = document.getElementById('contentModal');
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = "Wird geladen...";
    footer.innerHTML = "";
    bModal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1] || [];
            const idTag = tags.find(t => !isNaN(t.name));
            if (idTag) h5pId = idTag.name;
        }

        if (directH5P && h5pId) {
            body.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" allowfullscreen></iframe></div>`;
        } else {
            body.innerHTML = `<h3>${post.title.rendered}</h3><hr>${post.content.rendered}`;
            if (h5pId) {
                footer.innerHTML = `<button onclick="openContent(${post.id}, true)" class="btn btn-success btn-pill w-100 py-3">🚀 Übung jetzt öffnen</button>`;
            }
        }
    } catch (e) { body.innerHTML = "Fehler."; }
};

document.addEventListener('DOMContentLoaded', fetchPosts);

// Suche
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.post-card-container').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(term) ? 'block' : 'none';
    });
});
