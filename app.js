/**
 * HUB BILDUNG DIGITAL - MASTER FIX
 * Fokus: Suche-Funktion & Browser-Kompatibilität
 */

(function() {
    const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
    const AI_API_KEY = "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"; 
    const AI_MODEL = "llama-3.1-8b-instant";
    
    let allPosts = []; // Speicher für die Suche

    // 1. MODAL STEUERUNG
    window.closeModal = function() {
        const modal = document.getElementById('contentModal');
        if (modal) modal.classList.add('hidden');
    };

    // 2. KACHELN RENDERN (Zentralisiert)
    function renderPosts(postsToDisplay) {
        const container = document.getElementById('posts-container');
        if (!container) return;
        container.innerHTML = ""; 

        if (postsToDisplay.length === 0) {
            container.innerHTML = '<p class="p-10 text-center text-slate-500">Keine passenden Inhalte gefunden.</p>';
            return;
        }

        postsToDisplay.forEach((post) => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || `https://picsum.photos/seed/${post.id}/600/400`;
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            const title = post.title.rendered;
            
            const col = document.createElement('div');
            col.className = 'w-full'; 
            col.innerHTML = `
                <div class="hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full">
                    <div class="h-44 overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img src="${media}" class="w-full h-full object-cover" loading="lazy">
                    </div>
                    <div class="p-5 flex flex-col flex-grow">
                        <h5 class="text-lg font-bold text-[#003366] mb-4 leading-tight">${title}</h5>
                        <div class="flex gap-2 mt-auto">
                            <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold hover:bg-[#003366] hover:text-white transition-all text-sm">Details</button>
                            ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold hover:bg-[#16a34a] shadow-sm transition-all text-sm">🚀 Start</button>` : ''}
                        </div>
                    </div>
                </div>`;
            
            col.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) {
                const startBtn = col.querySelector('.js-start');
                if(startBtn) startBtn.onclick = () => openContent(post.id, true);
            }
            container.appendChild(col);
        });
    }

    // 3. DATEN LADEN
    async function fetchPosts() {
        try {
            const res = await fetch(API_URL);
            allPosts = await res.json();
            renderPosts(allPosts);
        } catch (e) {
            console.error("Daten-Ladefehler:", e);
        }
    }

    // 4. SUCHE-LOGIK (Lokal & Blitzschnell)
    function initSearch() {
        const searchInput = document.querySelector('input[type="text"][placeholder*="Suche"]');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allPosts.filter(post => 
                post.title.rendered.toLowerCase().includes(term) || 
                post.content.rendered.toLowerCase().includes(term)
            );
            renderPosts(filtered);
        });
    }

    // 5. INHALT LADEN (MODAL)
    async function openContent(postId, directH5P) {
        const modal = document.getElementById('contentModal');
        const body = document.getElementById('modalTextContent');
        if (!modal || !body) return;
        
        modal.classList.remove('hidden');
        body.innerHTML = 'Lädt...';
        
        try {
            const post = allPosts.find(p => p.id === postId) || await (await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`)).json();
            
            let h5pId = null;
            if (post._embedded?.['wp:term']?.[1]) {
                const idTag = post._embedded['wp:term'][1].find(t => !isNaN(t.name.trim()));
                if (idTag) h5pId = idTag.name.trim();
            }

            if (directH5P && h5pId) {
                body.innerHTML = `<div class="w-full h-[75vh]"><iframe
