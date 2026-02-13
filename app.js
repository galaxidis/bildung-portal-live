const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        
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
                                ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-success btn-pill flex-fill text-white">🚀 Start</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        container.innerHTML = "<div class='col-12 text-center py-5'>Fehler beim Laden der API.</div>";
    }
}

// DIESE FUNKTION MUSS GLOBAL SEIN
window.openContent = async function(postId, directH5P) {
    const modalEl = document.getElementById('contentModal');
    if (!modalEl) {
        console.error("Modal-Element nicht gefunden!");
        return;
    }

    // Modal sicher initialisieren
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    // UI leeren und Spinner zeigen
    body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    footer.innerHTML = "";
    bModal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        // H5P-ID aus den Tags extrahieren
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1] || [];
            const idTag = tags.find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            // Iframe Modus
            body.innerHTML = `
                <div class="ratio ratio-16x9">
                    <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                            allowfullscreen style="border:0; width:100%; height:100%;"></iframe>
                </div>`;
        } else {
            // Text Modus
            body.innerHTML = `
                <h3 class="fw-bold mb-3">${post.title.rendered}</h3>
                <div class="post-full-text">${post.content.rendered}</div>`;
            
            if (h5pId) {
                footer.innerHTML = `<button onclick="window.openContent(${post.id}, true)" class="btn btn-success btn-pill w-100 py-2">🚀 Übung jetzt öffnen</button>`;
            }
        }
    } catch (e) { 
        body.innerHTML = '<div class="alert alert-danger">Inhalt konnte nicht geladen werden.</div>'; 
    }
};

// Start
document.addEventListener('DOMContentLoaded', fetchPosts);

// Suche
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.post-card-container').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(term) ? 'block' : 'none';
    });
});
