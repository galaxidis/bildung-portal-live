const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        container.innerHTML = ""; 

        posts.forEach(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600x400';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            const col = document.createElement('div');
            col.className = 'post-card-container';
            col.innerHTML = `
                <div class="card h-100">
                    <div class="img-box"><img src="${media}" class="card-img-top"></div>
                    <div class="card-body">
                        <h5 class="card-title">${post.title.rendered}</h5>
                        <div class="mt-auto d-flex gap-2">
                            <button class="btn btn-outline-primary btn-pill flex-fill js-details">Details</button>
                            ${hasH5P ? `<button class="btn btn-success btn-pill flex-fill text-white js-start">🚀 Start</button>` : ''}
                        </div>
                    </div>
                </div>`;
            
            // KLICK-BINDUNG OHNE ONCLICK-ATTRIBUT
            col.querySelector('.js-details').addEventListener('click', () => window.openContent(post.id, false));
            if (hasH5P) {
                col.querySelector('.js-start').addEventListener('click', () => window.openContent(post.id, true));
            }

            container.appendChild(col);
        });
    } catch (e) {
        container.innerHTML = "API Fehler.";
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
            body.innerHTML = `<h3>${post.title.rendered}</h3><hr>${post.content.rendered}`;
            if (h5pId) {
                const startBtn = document.createElement('button');
                startBtn.className = "btn btn-success btn-pill w-100 py-3";
                startBtn.innerText = "🚀 Übung jetzt öffnen";
                startBtn.onclick = () => window.openContent(post.id, true);
                footer.appendChild(startBtn);
            }
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
};

document.addEventListener('DOMContentLoaded', fetchPosts);

document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.post-card-container').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(term) ? 'block' : 'none';
    });
});
