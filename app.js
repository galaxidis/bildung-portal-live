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
            
            const card = document.createElement('div');
            card.className = 'hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col';
            card.innerHTML = `
                <img src="${media}" class="h-44 w-full object-cover">
                <div class="p-5 flex flex-col flex-grow">
                    <h5 class="text-lg font-bold text-[#003366] mb-4">${post.title.rendered}</h5>
                    <div class="flex gap-2 mt-auto">
                        <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold cursor-pointer hover:bg-[#003366] hover:text-white">Details</button>
                        ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold cursor-pointer hover:bg-[#16a34a]">🚀 Start</button>` : ''}
                    </div>
                </div>`;
            
            card.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) card.querySelector('.js-start').onclick = () => openContent(post.id, true);

            container.appendChild(card);
        });
    } catch (e) { container.innerHTML = "Fehler beim Laden."; }
}

async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    // 1. Erst Modal zeigen, dann laden
    modal.classList.remove('hidden');
    body.innerHTML = '<p class="text-center py-10">Lade Inhalt...</p>';
    footer.innerHTML = "";

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
            body.innerHTML = `<div class="aspect-video"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" class="w-full h-full rounded-xl" allowfullscreen></iframe></div>`;
        } else {
            body.innerHTML = `<h2 class="text-2xl font-bold text-[#003366] mb-4">${post.title.rendered}</h2><div class="text-slate-600">${post.content.rendered}</div>`;
            if (h5pId) {
                const b = document.createElement('button');
                b.className = "px-8 py-3 bg-[#22c55e] text-white font-bold rounded-full cursor-pointer";
                b.innerText = "🚀 Jetzt Übung starten";
                b.onclick = () => openContent(post.id, true);
                footer.appendChild(b);
            }
        }
    } catch (e) { body.innerHTML = "Fehler."; }
}

// Schließen-Logik
document.getElementById('closeModal').onclick = () => document.getElementById('contentModal').classList.add('hidden');

// Suche
document.getElementById('searchInput').oninput = (e) => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('#posts-container > div').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(val) ? 'flex' : 'none';
    });
};

document.addEventListener('DOMContentLoaded', fetchPosts);
