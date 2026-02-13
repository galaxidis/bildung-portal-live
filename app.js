const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    console.log("Versuche Daten zu laden...");
    const container = document.getElementById('posts-container');
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
        
        const posts = await response.json();
        console.log("Daten empfangen:", posts.length, "Beiträge");
        
        if (posts.length === 0) {
            container.innerHTML = '<div class="col-12 text-center">Keine Beiträge gefunden.</div>';
            return;
        }

        container.innerHTML = posts.map(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/400x250';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            return `
                <div class="col-md-4 mb-4">
                    <div class="card p-0 shadow-sm">
                        <img src="${media}" class="card-img-top">
                        <div class="card-body">
                            <h5 class="card-title fw-bold">${post.title.rendered}</h5>
                            <div class="d-flex gap-2">
                                <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary rounded-pill">Details</button>
                                ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success rounded-pill">🚀 Start</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');

    } catch (error) {
        console.error("KRITISCHER FEHLER:", error);
        container.innerHTML = `<div class="col-12 text-center text-danger">
            <h4>Fehler beim Laden</h4>
            <p>${error.message}</p>
            <button class="btn btn-primary" onclick="location.reload()">Neu laden</button>
        </div>`;
    }
}

// Global verfügbare Funktionen
window.openContent = async function(postId, directH5P) {
    const modal = new bootstrap.Modal(document.getElementById('contentModal'));
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = "Lade...";
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        document.getElementById('modalTitle').innerText = post.title.rendered;
        
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const idTag = post._embedded['wp:term'][1]?.find(t => !isNaN(t.name));
            if (idTag) h5pId = idTag.name;
        }

        if (directH5P && h5pId) {
            body.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" allowfullscreen style="border:none;"></iframe></div>`;
            footer.innerHTML = `<button class="btn btn-secondary w-100" data-bs-dismiss="modal">Schließen</button>`;
        } else {
            body.innerHTML = post.content.rendered;
            footer.innerHTML = h5pId ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-success w-100 py-2">🚀 Interaktive Übung öffnen</button>` : '';
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
};

// Start
document.addEventListener('DOMContentLoaded', fetchPosts);

// Suche
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('#posts-container .col-md-4');
    cards.forEach(card => {
        const title = card.querySelector('.card-title').innerText.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
});
