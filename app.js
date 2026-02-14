const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

// 1. HAUPTFUNKTION: LÄDT DIE KACHELN
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("API Antwort nicht ok");
        const posts = await res.json();
        
        if (posts.length === 0) {
            container.innerHTML = '<div class="col-12 text-center">Keine Inhalte gefunden.</div>';
            return;
        }

        container.innerHTML = ""; // Spinner entfernen

        posts.forEach(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            const col = document.createElement('div');
            col.className = 'col-md-4 col-sm-6 post-card-container';
            col.innerHTML = `
                <div class="card">
                    <div class="img-box"><img src="${media}" class="card-img-top"></div>
                    <div class="card-body">
                        <h5 class="fw-bold mb-4" style="color:#003366;">${post.title.rendered}</h5>
                        <div class="mt-auto d-flex gap-2">
                            <button class="btn-pill btn-details flex-fill">Details</button>
                            ${hasH5P ? `<button class="btn-pill btn-start flex-fill">🚀 Start</button>` : ''}
                        </div>
                    </div>
                </div>`;
            
            // Klicks binden (mit Hand-Cursor Garantie)
            col.querySelector('.btn-details').onclick = () => window.openContent(post.id, false);
            if (hasH5P) {
                col.querySelector('.btn-start').onclick = () => window.openContent(post.id, true);
            }

            container.appendChild(col);
        });
    } catch (e) {
        console.error("Fehler:", e);
        container.innerHTML = `<div class="col-12 text-center py-5 text-danger">
            <h3>Oje! Das Portal klemmt.</h3>
            <p>Bitte lade die Seite einmal neu (STRG + F5).</p>
        </div>`;
    }
}

// 2. MODAL-FUNKTION: ÖFFNET DAS EXTRA FENSTER
window.openContent = async function(postId, directH5P) {
    const modalEl = document.getElementById('contentModal');
    if (!modalEl) return;
    
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    footer.innerHTML = "";
    bModal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        // H5P ID finden
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1] || [];
            const idTag = tags.find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            body.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" allowfullscreen style="border:none; border-radius:15px;"></iframe></div>`;
        } else {
            body.innerHTML = `<h2 class="fw-bold mb-3" style="color:#003366;">${post.title.rendered}</h2><hr>${post.content.rendered}`;
            if (h5pId) {
                footer.innerHTML = `<button onclick="window.openContent(${post.id}, true)" class="btn-pill btn-start px-5 py-3">🚀 Übung jetzt starten</button>`;
            }
        }
    } catch (e) { 
        body.innerHTML = "Inhalt konnte nicht geladen werden."; 
    }
};

// 3. INITIALISIERUNG
document.addEventListener('DOMContentLoaded', fetchPosts);

// 4. SUCHE OHNE HÄNGER
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.post-card-container').forEach(el => {
        const isMatch = el.innerText.toLowerCase().includes(term);
        el.style.display = isMatch ? 'block' : 'none';
    });
});
