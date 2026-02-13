const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("API Fehler");
        const posts = await res.json();
        
        if (posts.length === 0) {
            container.innerHTML = `<div class="text-center w-100">Keine Inhalte gefunden.</div>`;
            return;
        }

        container.innerHTML = posts.map(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
            
            // Check for H5P (either in content or via tag)
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p') || 
                          (post._embedded?.['wp:term']?.[1]?.some(t => !isNaN(t.name)));
            
            return `
                <div class="col-md-6 col-lg-4 post-item">
                    <div class="card h-100">
                        <div class="img-wrapper">
                            <img src="${media}" class="card-img-top" alt="${post.title.rendered}" loading="lazy">
                            ${hasH5P ? `<span class="h5p-badge">Interactive</span>` : ''}
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
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-warning d-inline-block">
                    Ups! Das Portal konnte nicht geladen werden. Bitte versuche es später erneut.
                </div>
            </div>`;
    }
}

window.openContent = async function(postId, directH5P) {
    const modalEl = document.getElementById('contentModal');
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Inhalt wird geladen...</p></div>`;
    footer.innerHTML = "";
    bModal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        // H5P ID aus dem Tag finden (Tag ist eine Zahl)
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1] || [];
            const idTag = tags.find(t => !isNaN(t.name));
            if (idTag) h5pId = idTag.name;
        }

        if (directH5P && h5pId) {
            // Vollbild-Modus für H5P
            body.innerHTML = `
                <div class="ratio ratio-16x9">
                    <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                            allowfullscreen style="border:none;"></iframe>
                </div>`;
        } else {
            // Detail-Ansicht
            body.innerHTML = `
                <h2 class="fw-800 mb-4" style="color:#003366">${post.title.rendered}</h2>
                <div class="post-content-inner">${post.content.rendered}</div>`;
            
            if (h5pId) {
                footer.innerHTML = `
                    <button onclick="window.openContent(${post.id}, true)" class="btn btn-success btn-pill px-5 py-3">
                        🚀 Jetzt Übung starten
                    </button>`;
            }
        }
    } catch (e) { 
        body.innerHTML = `<div class="alert alert-danger">Fehler beim Laden des Inhalts.</div>`; 
    }
};

// Intelligente Suche (Live-Filter)
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.post-item');
    
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        if (text.includes(term)) {
            item.style.display = 'block';
            item.classList.add('animate__animated', 'animate__fadeIn');
        } else {
            item.style.display = 'none';
        }
    });
});

document.addEventListener('DOMContentLoaded', fetchPosts);
