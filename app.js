const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

/**
 * 1. HAUPTFUNKTION: LÄDT DIE BEITRÄGE VON DER API
 */
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        
        // Spinner entfernen
        container.innerHTML = ""; 

        posts.forEach(post => {
            // Beitragsbild oder Platzhalter
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600x400';
            // Prüfen, ob H5P Inhalt vorhanden ist
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            // Kachel-Element erstellen
            const card = document.createElement('div');
            card.className = 'hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full';
            
            card.innerHTML = `
                <div class="h-44 overflow-hidden bg-slate-200">
                    <img src="${media}" class="w-full h-full object-cover">
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <h5 class="text-lg font-bold text-[#003366] mb-4 leading-tight">${post.title.rendered}</h5>
                    <div class="flex gap-2 mt-auto">
                        <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold cursor-pointer hover:bg-[#003366] hover:text-white transition-all">
                            Details
                        </button>
                        ${hasH5P ? `
                        <button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold cursor-pointer hover:bg-[#16a34a] shadow-sm transition-all">
                            🚀 Start
                        </button>` : ''}
                    </div>
                </div>`;
            
            // Events für die Buttons binden
            card.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) {
                card.querySelector('.js-start').onclick = () => openContent(post.id, true);
            }

            container.appendChild(card);
        });
    } catch (e) {
        console.error("Fehler beim Laden:", e);
        container.innerHTML = "<p class='text-center py-10 col-span-full text-red-500'>Inhalte konnten nicht geladen werden.</p>";
    }
}

/**
 * 2. SUCH-LOGIK: FILTERT DIE KACHELN
 */
function performSearch() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('#posts-container > div');
    
    cards.forEach(card => {
        // Wir suchen im Titel (h5)
        const title = card.querySelector('h5').innerText.toLowerCase();
        if (title.includes(term)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * 3. MODAL-LOGIK: ÖFFNET DETAILS ODER H5P
 */
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    if (!modal) return;

    // Modal zeigen & vorbereiten
    modal.classList.remove('hidden');
    body.innerHTML = '<div class="text-center py-20"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#00aaff] border-r-transparent"></div></div>';
    footer.innerHTML = "";

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        // H5P ID aus den Schlagworten/Tags extrahieren
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1] || [];
            const idTag = tags.find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            // H5P MODUS: Mit Fix gegen schwarze "Check out more" Balken
            body.innerHTML = `
                <div class="aspect-video w-full rounded-2xl overflow-hidden shadow-lg bg-black">
                    <iframe 
                        src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                        class="w-full h-full border-0" 
                        allowfullscreen 
                        style="display: block;"
                        scrolling="no">
                    </iframe>
                </div>`;
        } else {
            // DETAILS MODUS
            body.innerHTML = `
                <h2 class="text-2xl font-extrabold text-[#003366] mb-4">${post.title.rendered}</h2>
                <div class="prose prose-slate max-w-none text-slate-600 text-lg">
                    ${post.content.rendered}
                </div>`;
            
            if (h5pId) {
                const btn = document.createElement('button');
                btn.className = "px-10 py-3 bg-[#22c55e] text-white font-bold rounded-full cursor-pointer hover:bg-[#16a34a] shadow-lg transition-all";
                btn.innerText = "🚀 Jetzt Übung starten";
                btn.onclick = () => openContent(post.id, true);
                footer.appendChild(btn);
            }
        }
    } catch (e) {
        body.innerHTML = "<p class='text-center text-red-500'>Fehler beim Laden des Inhalts.</p>";
    }
}

/**
 * 4. EVENT LISTENER & INITIALISIERUNG
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Beiträge laden
    fetchPosts();
    
    // 2. Suche binden
    const sInput = document.getElementById('searchInput');
    const sBtn = document.getElementById('searchButton');
    
    if (sInput) {
        sInput.oninput = performSearch;
        sInput.onkeydown = (e) => { if (e.key === 'Enter') performSearch(); };
    }
    if (sBtn) {
        sBtn.onclick = performSearch;
    }
    
    // 3. Modal Schließen-Button
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('contentModal').classList.add('hidden');
            // Stoppt Video/Audio im Modal beim Schließen
            document.getElementById('modalTextContent').innerHTML = "";
        };
    }
});
