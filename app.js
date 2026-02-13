const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Netzwerk-Antwort war nicht ok");
        const posts = await res.json();
        
        if (posts.length === 0) {
            container.innerHTML = '<div class="col-12 text-center">Keine Beiträge gefunden.</div>';
            return;
        }

        container.innerHTML = posts.map(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600x400';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            return `
                <div class="post-card-container">
                    <div class="card">
                        <div class="img-box">
                            <img src="${media}" class="card-img-top">
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${post.title.rendered}</h5>
                            <div class="mt-auto d-flex gap-2">
                                <button onclick="window.openContent(${post.id}, false)" class="btn btn-outline-primary btn-pill flex-fill">Details</button>
                                ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-success btn-pill flex-fill">🚀 Start</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error("API Fehler:", e);
        container.innerHTML = `<div class="col-12 text-center text-danger py-5">
            <b>Fehler beim Laden:</b> Bitte prüfen Sie Ihre Internetverbindung oder versuchen Sie es später erneut.
        </div>`;
    }
}

// GLOBALER SCOPE FÜR LINKS
window.openContent = async function(postId, directH5P) {
    const modalEl = document.getElementById('contentModal');
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Inhalt wird geladen...</p></div>';
    footer.innerHTML = "";
    bModal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        // H5P ID finden (Tag muss eine Nummer sein)
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1] || [];
            const idTag = tags.find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            body.innerHTML = `
                <div class="ratio ratio-16x9">
                    <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                            allowfullscreen style="border:0; width:100%; height:100%;"></iframe>
                </div>`;
        } else {
            body.innerHTML = `<h3 class="fw-bold mb-3">${post.title.rendered}</h3><hr><div>${post.content.rendered}</div>`;
            if (h5pId) {
                footer.innerHTML = `<button onclick="window.openContent(${post.id}, true)" class="btn btn-success btn-pill w-100 py-3">🚀 Übung jetzt öffnen</button>`;
            }
        }
    } catch (e) { 
        body.innerHTML = '<div class="alert alert-danger">Fehler beim Laden des Inhalts.</div>'; 
    }
};

// INITIALISIERUNG
document.addEventListener('DOMContentLoaded', fetchPosts);

// SUCHE
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.post-card-container').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(term) ? 'block' : 'none';
    });
});
