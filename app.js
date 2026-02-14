const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

/**
 * 1. HAUPTFUNKTION: LÄDT DIE BEITRÄGE
 */
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
                <div class="h-44 overflow-hidden bg-slate-200">
                    <img src="${media}" class="w-full h-full object-cover">
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <h5 class="text-lg font-bold text-[#003366] mb-4 leading-tight">${post.title.rendered}</h5>
                    <div class="flex gap-2 mt-auto">
                        <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold cursor-pointer hover:bg-[#003366] hover:text-white transition-all">Details</button>
                        ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold cursor-pointer hover:bg-[#16a34a] shadow-sm transition-all">🚀 Start</button>` : ''}
                    </div>
                </div>`;
            
            card.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) card.querySelector('.js-start').onclick = () => openContent(post.id, true);
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = "<p class='text-center py-10 col-span-full'>Fehler beim Laden.</p>";
    }
}

/**
 * 2. RADIKALE SUCH-LOGIK: EINFACH & STABIL
 */
function performSearch() {
    const sInput = document.getElementById('searchInput');
    if (!sInput) return;
    
    const term = sInput.value.toLowerCase().trim();
    const container = document.getElementById('posts-container');
    const cards = container.querySelectorAll('.hover-card');
    
    let visibleCount = 0;

    cards.forEach(card => {
        const title = card.querySelector('h5').innerText.toLowerCase();
        if (title.includes(term)) {
            card.parentElement.style.display = 'block'; // Zeigt das Grid-Element (col)
            visibleCount++;
        } else {
            card.parentElement.style.display = 'none';
        }
    });

    // Negativ-Meldung Logik
    const existingMsg = document.getElementById('no-results-msg');
    if (existingMsg) existingMsg.remove();

    if (visibleCount === 0 && term !== "") {
        const msg = document.createElement('div');
        msg.id = 'no-results-msg';
        msg.className = 'col-span-full text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200';
        msg.innerHTML = `<h3 class="text-xl font-bold text-[#003366]">Nichts gefunden für "${term}"</h3>
                         <button onclick="document.getElementById('searchInput').value=''; performSearch();" class="mt-4 text-[#00aaff] font-bold underline">Alle Inhalte anzeigen</button>`;
        container.appendChild(msg);
    }
}

/**
 * 3. MODAL-LOGIK: H5P OHNE SCHWARZE RÄNDER
 */
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    modal.classList.remove('hidden');
    body.innerHTML = '<div class="text-center py-10">Lade...</div>';
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
            // DER FIX: Wir setzen die Höhe des Iframes so, dass der untere H5P-Müll abgeschnitten wird
            body.innerHTML = `
                <div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; overflow: hidden; border-radius: 1.5rem; background: white;">
                    <iframe 
                        src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
                        allowfullscreen 
                        scrolling="no">
                    </iframe>
                </div>`;
        } else {
            body.innerHTML = `<h2 class="text-2xl font-bold text-[#003366] mb-4">${post.title.rendered}</h2><div class="prose max-w-none">${post.content.rendered}</div>`;
            if (h5pId) {
                const btn = document.createElement('button');
                btn.className = "px-10 py-3 bg-[#22c55e] text-white font-bold rounded-full cursor-pointer";
                btn.innerText = "🚀 Übung starten";
                btn.onclick = () => openContent(post.id, true);
                footer.appendChild(btn);
            }
        }
    } catch (e) { body.innerHTML = "Fehler."; }
}

/**
 * 4. INITIALISIERUNG
 */
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
