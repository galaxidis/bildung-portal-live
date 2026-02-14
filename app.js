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
            card.className = 'hover-card bg-white rounded-[2rem] overflow-hidden shadow-md flex flex-col h-full border border-slate-100';
            
            card.innerHTML = `
                <div class="h-48 overflow-hidden bg-slate-200">
                    <img src="${media}" class="w-full h-full object-cover">
                </div>
                <div class="p-6 flex flex-col flex-grow">
                    <h5 class="text-xl font-bold text-[#003366] mb-6 leading-tight flex-grow">
                        ${post.title.rendered}
                    </h5>
                    <div class="flex gap-3">
                        <button class="js-details flex-1 px-4 py-3 rounded-full border-2 border-[#003366] text-[#003366] font-bold hover:bg-[#003366] hover:text-white transition-all cursor-pointer">
                            Details
                        </button>
                        ${hasH5P ? `
                        <button class="js-start flex-1 px-4 py-3 rounded-full bg-[#22c55e] text-white font-bold hover:bg-[#16a34a] shadow-lg shadow-green-200 transition-all cursor-pointer">
                            🚀 Start
                        </button>` : ''}
                    </div>
                </div>`;
            
            card.querySelector('.js-details').addEventListener('click', () => openContent(post.id, false));
            if (hasH5P) {
                card.querySelector('.js-start').addEventListener('click', () => openContent(post.id, true));
            }

            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = "<p class='text-center col-span-full'>Fehler beim Laden.</p>";
    }
}

async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    body.innerHTML = '<div class="flex justify-center py-20"><div class="animate-spin h-10 w-10 border-4 border-[#00aaff] border-r-transparent rounded-full"></div></div>';
    footer.innerHTML = "";
    modal.classList.remove('modal-hidden');

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
                <div class="aspect-video w-full rounded-2xl overflow-hidden shadow-inner">
                    <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                    class="w-full h-full border-0" allowfullscreen></iframe>
                </div>`;
        } else {
            body.innerHTML = `<h2 class="text-3xl font-extrabold text-[#003366] mb-6">${post.title.rendered}</h2>
                              <div class="prose prose-slate max-w-none text-lg">${post.content.rendered}</div>`;
            if (h5pId) {
                const sBtn = document.createElement('button');
                sBtn.className = "px-12 py-4 rounded-full bg-[#22c55e] text-white font-bold text-xl hover:bg-[#16a34a] transition-all cursor-pointer shadow-xl";
                sBtn.innerText = "🚀 Übung jetzt starten";
                sBtn.onclick = () => openContent(post.id, true);
                footer.appendChild(sBtn);
            }
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
}

// Modal schließen
document.getElementById('closeModal').onclick = () => {
    document.getElementById('contentModal').classList.add('modal-hidden');
};

// Suche
document.getElementById('searchInput').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#posts-container > div').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
    });
};

document.addEventListener('DOMContentLoaded', fetchPosts);
