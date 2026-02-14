const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

/**
 * 1. BEITRÄGE LADEN
 * Holt die Daten von WordPress und erstellt die Kacheln.
 */
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        
        container.innerHTML = ""; // Spinner entfernen

        posts.forEach(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600x400';
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            // Grid-Spalte erstellen
            const col = document.createElement('div');
            col.className = 'w-full'; // Tailwind Grid übernimmt das Layout

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
            
            // Events binden
            card.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) card.querySelector('.js-start').onclick = () => openContent(post.id, true);
            
            col.appendChild(card);
            container.appendChild(col);
        });
    } catch (e) {
        console.error("Ladefehler:", e);
        container.innerHTML = "<p class='text-center py-10 col-span-full'>Inhalte konnten nicht geladen werden.</p>";
    }
}

/**
 * 2. SUCHE
 * Filtert die Kacheln und zeigt eine Meldung, wenn nichts gefunden wurde.
 */
function performSearch() {
    const sInput = document.getElementById('searchInput');
    const term = sInput ? sInput.value.toLowerCase().trim() : "";
    const container = document.getElementById('posts-container');
    const cards = container.querySelectorAll('.hover-card');
    
    let visibleCount = 0;

    cards.forEach(card => {
        const title = card.querySelector('h5').innerText.toLowerCase();
        // Wir blenden das Elternelement (die Grid-Spalte) ein/aus
        if (title.includes(term)) {
            card.parentElement.style.display = 'block';
            visibleCount++;
        } else {
            card.parentElement.style.display = 'none';
        }
    });

    const existingMsg = document.getElementById('no-results-msg');
    if (existingMsg) existingMsg.remove();

    if (visibleCount === 0 && term !== "") {
        const msg = document.createElement('div');
        msg.id = 'no-results-msg';
        msg.className = 'col-span-full text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200';
        msg.innerHTML = `
            <h3 class="text-xl font-bold text-[#003366]">Nichts gefunden für "${term}"</h3>
            <button onclick="document.getElementById('searchInput').value=''; performSearch();" class="mt-4 text-[#00aaff] font-bold underline cursor-pointer">Alle Inhalte anzeigen</button>
        `;
        container.appendChild(msg);
    }
}

/**
 * 3. MODAL (INHALT ÖFFNEN)
 * Mit dem "Reiniger-Fix" für H5P (schneidet Kopf- und Fußzeilen weg).
 */
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    if (!modal) return;

    modal.classList.remove('hidden');
    body.innerHTML = '<div class="text-center py-10"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#00aaff] border-r-transparent"></div></div>';
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
            // H5P-MODUS mit "Clipping": Schneidet oben 45px und unten den Rest ab
            body.innerHTML = `
                <div style="position: relative; width: 100%; padding-bottom: 56.25%; overflow: hidden; border-radius: 1.5rem; background: #fff; box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);">
                    <iframe 
                        src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                        style="position: absolute; top: -45px; left: 0; width: 100%; height: calc(100% + 90px); border: 0;" 
                        allowfullscreen 
                        scrolling="no">
                    </iframe>
                </div>`;
        } else {
            // NORMALER TEXT-MODUS
            body.innerHTML = `
                <h2 class="text-3xl font-extrabold text-[#003366] mb-6 leading-tight">${post.title.rendered}</h2>
                <div class="prose prose-slate max-w-none text-lg text-slate-600">
                    ${post.content.rendered}
                </div>`;
            
            if (h5pId) {
                const btn = document.createElement('button');
                btn.className = "px-10 py-4 bg-[#22c55e] text-white font-bold rounded-full cursor-pointer hover:bg-[#16a34a] shadow-lg transition-all text-xl";
                btn.innerText = "🚀 Übung jetzt starten";
                btn.onclick = () => openContent(post.id, true);
                footer.appendChild(btn);
            }
        }
    } catch (e) {
        body.innerHTML = "<p class='text-center text-red-500'>Inhalt konnte nicht geladen werden.</p>";
    }
}

/**
 * 4. START-EVENTS
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    const sInput = document.getElementById('searchInput');
    const sBtn = document.getElementById('searchButton');
    
    if (sInput) sInput.oninput = performSearch;
    if (sBtn) sBtn.onclick = performSearch;
    
    // Modal Schließen
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('contentModal').classList.add('hidden');
            document.getElementById('modalTextContent').innerHTML = "";
        };
    }
});
