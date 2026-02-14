const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        
        container.innerHTML = ""; // Alten Inhalt/Spinner löschen

        posts.forEach(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600x400';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            // Grid-Spalte
            const col = document.createElement('div');
            col.className = 'col-12 col-sm-6 col-lg-4 post-card-container';
            
            // Die Kachel (Card)
            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="img-box">
                        <img src="${media}" alt="Vorschau">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold" style="color: #003366; min-height: 3rem;">
                            ${post.title.rendered.replace(/&nbsp;/g, ' ')}
                        </h5>
                        <div class="mt-auto d-grid gap-2 d-flex">
                            <button class="btn btn-outline-primary btn-pill flex-fill js-details">Details</button>
                            ${hasH5P ? `<button class="btn btn-success btn-pill flex-fill js-start">🚀 Start</button>` : ''}
                        </div>
                    </div>
                </div>`;
            
            // Event Listener hinzufügen (Sicher vor CSP)
            col.querySelector('.js-details').addEventListener('click', () => openContent(post.id, false));
            if (hasH5P) {
                col.querySelector('.js-start').addEventListener('click', () => openContent(post.id, true));
            }

            container.appendChild(col);
        });
    } catch (e) {
        container.innerHTML = `<div class="alert alert-warning">Inhalte konnten nicht geladen werden.</div>`;
    }
}

async function openContent(postId, directH5P) {
    const modalEl = document.getElementById('contentModal');
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
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
            body.innerHTML = `
                <div class="ratio ratio-16x9">
                    <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                    allowfullscreen style="border-radius: 15px;"></iframe>
                </div>`;
        } else {
            body.innerHTML = `<h2 class="fw-bold mb-3">${post.title.rendered}</h2><hr>${post.content.rendered}`;
            if (h5pId) {
                const sBtn = document.createElement('button');
                sBtn.className = "btn btn-success btn-pill px-5 py-2";
                sBtn.innerText = "🚀 Übung jetzt starten";
                sBtn.addEventListener('click', () => openContent(post.id, true));
                footer.appendChild(sBtn);
            }
        }
    } catch (e) {
        body.innerHTML = "Fehler beim Laden.";
    }
}

// Suche
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.post-card-container').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(term) ? 'block' : 'none';
    });
});

document.addEventListener('DOMContentLoaded', fetchPosts);
