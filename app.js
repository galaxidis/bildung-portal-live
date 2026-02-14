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
            const col = document.createElement('div');
            const card = document.createElement('div');
            card.className = 'hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full';
            card.innerHTML = `
                <div class="h-44 overflow-hidden bg-slate-200"><img src="${media}" class="w-full h-full object-cover"></div>
                <div class="p-5 flex flex-col flex-grow">
                    <h5 class="text-lg font-bold text-[#003366] mb-4 leading-tight">${post.title.rendered}</h5>
                    <div class="flex gap-2 mt-auto">
                        <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold cursor-pointer hover:bg-[#003366] hover:text-white transition-all">Details</button>
                        ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold cursor-pointer hover:bg-[#16a34a] shadow-sm transition-all">🚀 Start</button>` : ''}
                    </div>
                </div>`;
            card.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) card.querySelector('.js-start').onclick = () => openContent(post.id, true);
            col.appendChild(card);
            container.appendChild(col);
        });
    } catch (e) { container.innerHTML = "Fehler beim Laden."; }
}

function performSearch() {
    const sInput = document.getElementById('searchInput');
    const term = sInput ? sInput.value.toLowerCase().trim() : "";
    const container = document.getElementById('posts-container');
    const cards = container.querySelectorAll('.hover-card');
    let visibleCount = 0;
    cards.forEach(card => {
        const title = card.querySelector('h5').innerText.toLowerCase();
        card.parentElement.style.display = title.includes(term) ? 'block' : 'none';
        if (title.includes(term)) visibleCount++;
    });
    const existingMsg = document.getElementById('no-results-msg');
    if (existingMsg) existingMsg.remove();
    if (visibleCount === 0 && term !== "") {
        const msg = document.createElement('div');
        msg.id = 'no-results-msg';
        msg.className = 'col-span-full text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200';
        msg.innerHTML = `<h3 class="text-xl font-bold text-[#003366]">Nichts gefunden</h3><button onclick="document.getElementById('searchInput').value=''; performSearch();" class="mt-4 text-[#00aaff] font-bold underline cursor-pointer">Alle anzeigen</button>`;
        container.appendChild(msg);
    }
}

async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    modal.classList.remove('hidden');
    body.innerHTML = '<div class="text-center py-10">Lade Inhalt...</div>';
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
            // SAUBERER H5P-IFRAME (Ohne Clipping-Experimente, die Text erzeugen könnten)
            body.innerHTML = `
                <div class="w-full bg-white rounded-2xl shadow-inner overflow-hidden" style="height: 60vh;">
                    <iframe 
                        src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                        class="w-full h-full border-0" 
                        allowfullscreen>
                    </iframe>
                </div>`;
        } else {
            body.innerHTML = `<h2 class="text-3xl font-extrabold text-[#003366] mb-6">${post.title.rendered}</h2><div class="prose max-w-none text-lg text-slate-600">${post.content.rendered}</div>`;
            if (h5pId) {
                const btn = document.createElement('button');
                btn.className = "px-10 py-4 bg-[#22c55e] text-white font-bold rounded-full cursor-pointer hover:bg-[#16a34a] shadow-lg text-xl";
                btn.innerText = "🚀 Übung jetzt starten";
                btn.onclick = () => openContent(post.id, true);
                footer.appendChild(btn);
            }
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    const sInput = document.getElementById('searchInput');
    const sBtn = document.getElementById('searchButton');
    if (sInput) sInput.oninput = performSearch;
    if (sBtn) sBtn.onclick = performSearch;
    document.getElementById('closeModal').onclick = () => {
        document.getElementById('contentModal').classList.add('hidden');
        document.getElementById('modalTextContent').innerHTML = "";
    };
});
