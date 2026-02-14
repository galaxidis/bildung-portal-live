const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = 'DEIN_KEY_HIER_EINTRAGEN'; // Dein Gemini Key

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        
        container.innerHTML = posts.map(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            return `
                <div class="col-md-4 col-sm-6">
                    <div class="post-card">
                        <div class="img-container"><img src="${media}"></div>
                        <div class="card-body p-4">
                            <h5 class="fw-bold mb-3" style="color:#003366;">${post.title.rendered}</h5>
                            <div class="mt-auto d-flex gap-2">
                                <button onclick="openContent(${post.id}, false)" class="btn-pill btn-details flex-fill">Details</button>
                                ${hasH5P ? `<button onclick="openContent(${post.id}, true)" class="btn-pill btn-start flex-fill">🚀 Start</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (e) { console.error("API Fehler", e); }
}

// Global für Klick-Events
window.openContent = async function(postId, directH5P) {
    const modalEl = document.getElementById('contentModal');
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    footer.innerHTML = "";
    bModal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1] || [];
            const idTag = tags.find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            body.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" allowfullscreen></iframe></div>`;
        } else {
            body.innerHTML = `<h2 class="fw-bold mb-4">${post.title.rendered}</h2><div>${post.content.rendered}</div>`;
            if (h5pId) {
                footer.innerHTML = `<button onclick="openContent(${post.id}, true)" class="btn btn-success btn-pill px-5 py-3">🚀 Übung jetzt starten</button>`;
            }
        }
    } catch (e) { body.innerHTML = "Inhalt konnte nicht geladen werden."; }
};

// Chat Logik
const chatBtn = document.getElementById('chat-button');
const chatWin = document.getElementById('chat-window');

chatBtn.addEventListener('click', () => {
    chatWin.style.display = chatWin.style.display === 'flex' ? 'none' : 'flex';
});

// Suche
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.col-md-4').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(term) ? 'block' : 'none';
    });
});

document.addEventListener('DOMContentLoaded', fetchPosts);
