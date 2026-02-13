const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        container.innerHTML = ""; // Spinner entfernen

        posts.forEach(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600x400';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            // Erstelle das Element
            const col = document.createElement('div');
            col.className = 'post-card-container';
            col.innerHTML = `
                <div class="card h-100">
                    <div class="img-box"><img src="${media}" class="card-img-top"></div>
                    <div class="card-body">
                        <h5 class="card-title">${post.title.rendered}</h5>
                        <div class="mt-auto d-flex gap-2">
                            <button class="btn btn-outline-primary btn-pill flex-fill view-btn">Details</button>
                            ${hasH5P ? `<button class="btn btn-success btn-pill flex-fill text-white start-btn">🚀 Start</button>` : ''}
                        </div>
                    </div>
                </div>`;
            
            // Klicks direkt im JavaScript binden (sicherste Methode)
            col.querySelector('.view-btn').addEventListener('click', () => window.openContent(post.id, false));
            if (hasH5P) {
                col.querySelector('.start-btn').addEventListener('click', () => window.openContent(post.id, true));
            }

            container.appendChild(col);
        });
    } catch (e) {
        container.innerHTML = "Fehler beim Laden der API.";
    }
}

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
            body.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" allowfullscreen style="border:0; width:100%; height:100%;"></iframe></div>`;
        } else {
            body.innerHTML = `<h3 class="fw-bold">${post.title.rendered}</h3><hr>${post.content.rendered}`;
            if (h5pId) {
                footer.innerHTML = `<button id="modalStartBtn" class="btn btn-success btn-pill w-100 py-3">🚀 Übung jetzt öffnen</button>`;
                document.getElementById('modalStartBtn').onclick = () => window.openContent(post.id, true);
            }
        }
    } catch (e) { body.innerHTML = "Inhalt konnte nicht geladen werden."; }
};

document.addEventListener('DOMContentLoaded', fetchPosts);

// Suche
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.post-card-container').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(term) ? 'block' : 'none';
    });
});
