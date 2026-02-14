const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        container.innerHTML = ""; 

        posts.forEach(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            // Kachel-Container
            const col = document.createElement('div');
            col.className = 'col-md-4 col-sm-6 post-card-container';
            
            // Karte erstellen
            const card = document.createElement('div');
            card.className = 'card';
            
            // Bild-Box
            const imgBox = document.createElement('div');
            imgBox.className = 'img-box';
            const img = document.createElement('img');
            img.src = media;
            img.className = 'card-img-top';
            imgBox.appendChild(img);
            
            // Body
            const body = document.createElement('div');
            body.className = 'card-body';
            const title = document.createElement('h5');
            title.className = 'fw-bold mb-4';
            title.style.color = '#003366';
            title.textContent = post.title.rendered.replace(/&nbsp;/g, ' ');
            
            const btnGroup = document.createElement('div');
            btnGroup.className = 'd-flex';

            // Details Button
            const dBtn = document.createElement('button');
            dBtn.className = 'btn-pill btn-details flex-fill';
            dBtn.textContent = 'Details';
            dBtn.addEventListener('click', () => openContent(post.id, false));

            btnGroup.appendChild(dBtn);

            // Start Button
            if (hasH5P) {
                const sBtn = document.createElement('button');
                sBtn.className = 'btn-pill btn-start flex-fill';
                sBtn.textContent = '🚀 Start';
                sBtn.addEventListener('click', () => openContent(post.id, true));
                btnGroup.appendChild(sBtn);
            }

            body.appendChild(title);
            body.appendChild(btnGroup);
            card.appendChild(imgBox);
            card.appendChild(body);
            col.appendChild(card);
            container.appendChild(col);
        });
    } catch (e) {
        container.innerHTML = "Fehler beim Laden.";
    }
}

async function openContent(postId, directH5P) {
    const modalEl = document.getElementById('contentModal');
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = 'Lädt...';
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
            body.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" allowfullscreen style="border:none; border-radius:15px;"></iframe></div>`;
        } else {
            body.innerHTML = `<h2 class="fw-bold mb-3">${post.title.rendered}</h2><hr>${post.content.rendered}`;
            if (h5pId) {
                const fBtn = document.createElement('button');
                fBtn.className = "btn-pill btn-start px-5 py-3";
                fBtn.textContent = "🚀 Jetzt Übung starten";
                fBtn.addEventListener('click', () => openContent(post.id, true));
                footer.appendChild(fBtn);
            }
        }
    } catch (e) { body.innerHTML = "Fehler."; }
}

document.addEventListener('DOMContentLoaded', fetchPosts);

document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.post-card-container').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(term) ? 'block' : 'none';
    });
});
