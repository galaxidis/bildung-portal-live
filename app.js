const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        container.innerHTML = ""; 

        posts.forEach(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600x400';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            const card = document.createElement('div');
            card.className = 'hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full';
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
    } catch (e) {
        container.innerHTML = "<p class='text-center py-10 col-span-full'>Inhalte konnten nicht geladen werden.</p>";
    }
}

// Such-Logik
function performSearch() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('#posts-container > div').forEach(el => {
        const title = el.querySelector('h5').innerText.toLowerCase();
        el.style.display = title.includes(term) ? 'flex' : 'none';
    });
}

async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    modal.classList.remove('hidden');
    body.innerHTML = '<p class="text-center py-10">Lade...</p>';
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
            body.innerHTML = `<h2 class="text-2xl font-bold text-[#003366] mb-4">${post.title.rendered}</h2><div class="text-slate-600 text-lg">${post.content.rendered}</div>`;
            if (h5pId) {
                const btn = document.createElement('button');
                btn.className = "px-10 py-3 bg-[#22c55e] text-white font-bold rounded-full cursor-pointer hover:bg-[#16a34a]";
                btn.innerText = "🚀 Übung jetzt starten";
                btn.onclick = () => openContent(post.id, true);
                footer.appendChild(btn);
            }
        }
    } catch (e) { body.innerHTML = "Fehler."; }
}

// Events
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    // Suche binden
    const sInput = document.getElementById('searchInput');
    const sBtn = document.getElementById('searchButton');
    
    if(sInput) sInput.oninput = performSearch;
    if(sBtn) sBtn.onclick = performSearch;
    if(sInput) sInput.onkeydown = (e) => { if(e.key === 'Enter') performSearch(); };
    
    document.getElementById('closeModal').onclick = () => document.getElementById('contentModal').classList.add('hidden');
});
