/**
 * HUB BILDUNG DIGITAL - MASTER APP SCRIPT (FINAL STABLE)
 * Features: WordPress API, H5P Embed, Local Search & Groq AI
 */

(function() {
    // KONFIGURATION
    const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
    const AI_API_KEY = "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"; 
    const AI_MODEL = "llama-3.1-8b-instant";
    
    let allPosts = []; // Globaler Zwischenspeicher für die Suche

    // --- 1. MODAL STEUERUNG ---
    window.closeModal = function() {
        const modal = document.getElementById('contentModal');
        if (modal) {
            modal.classList.add('hidden');
            const body = document.getElementById('modalTextContent');
            if (body) body.innerHTML = "";
        }
    };

    // --- 2. KACHELN RENDERN ---
    function renderPosts(postsToDisplay) {
        const container = document.getElementById('posts-container');
        if (!container) return;
        
        container.innerHTML = ""; 

        // Wenn die Suche keine Treffer liefert
        if (!postsToDisplay || postsToDisplay.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <p class="text-xl text-slate-400 font-sans">Sorry, dazu wurde leider nichts gefunden. 😕</p>
                </div>`;
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
                        <img src="${media}" class="w-full h-full object-cover" alt="${title}" loading="lazy">
                    </div>
                    <div class="p-5 flex flex-col flex-grow">
                        <h5 class="text-lg font-bold text-[#003366] mb-4 leading-tight">${title}</h5>
                        <div class="flex gap-2 mt-auto">
                            <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold hover:bg-[#003366] hover:text-white transition-all text-sm">Details</button>
                            ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold hover:bg-[#16a34a] shadow-sm transition-all text-sm">🚀 Start</button>` : ''}
                        </div>
                    </div>
                </div>`;
            
            // Klick-Events für Details und Start
            col.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) {
                const startBtn = col.querySelector('.js-start');
                if(startBtn) startBtn.onclick = () => openContent(post.id, true);
            }
            container.appendChild(col);
        });
    }

    // --- 3. DATEN LADEN ---
    async function fetchPosts() {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error("Server antwortet nicht");
            allPosts = await res.json();
            renderPosts(allPosts); // Kacheln anzeigen
            initSearch(); // Suche erst nach erfolgreichem Laden aktivieren
        } catch (e) { 
            console.error("Ladefehler:", e);
            const container = document.getElementById('posts-container');
            if (container) container.innerHTML = "Fehler beim Laden der Inhalte.";
        }
    }

    // --- 4. SUCHE-LOGIK (Dynamisch & Lokal) ---
    function initSearch() {
        const searchInput = document.querySelector('input[type="text"]');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (term === "") {
                renderPosts(allPosts);
            } else {
                const filtered = allPosts.filter(post => 
                    post.title.rendered.toLowerCase().includes(term) || 
                    post.content.rendered.toLowerCase().includes(term)
                );
                renderPosts(filtered);
            }
        });
    }

    // --- 5. MODAL INHALT ---
    async function openContent(postId, directH5P) {
        const modal = document.getElementById('contentModal');
        const body = document.getElementById('modalTextContent');
        if (!modal || !body) return;
        
        modal.classList.remove('hidden');
        body.innerHTML = '<div class="p-10 text-center italic">Inhalt wird geladen...</div>';
        
        // Post aus lokalem Speicher suchen
        const post = allPosts.find(p => p.id === postId);
        if(!post) return;

        let h5pId = null;
        if (post._embedded?.['wp:term']?.[1]) {
            const idTag = post._embedded['wp:term'][1].find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            body.innerHTML = `
                <div class="w-full h-[75vh]">
                    <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                            class="w-full h-full border-0" allowfullscreen></iframe>
                </div>`;
        } else {
            body.innerHTML = `
                <h2 class="text-2xl font-bold mb-4 text-[#003366]">${post.title.rendered}</h2>
                <div class="prose max-w-none text-slate-700">
                    ${post.content.rendered}
                </div>`;
        }
    }

    // --- 6. CHATBOT (Groq API) ---
    async function askAI(q) {
        const msgs = document.getElementById('chat-messages');
        const input = document.getElementById('chat-input');
        if (!q || !q.trim()) return;

        // User Nachricht anzeigen
        const userM = document.createElement('div');
        userM.className = "bg-slate-100 p-2 rounded-lg mb-2 text-xs text-slate-600 self-end ml-auto max-w-[80%]";
        userM.innerText = q;
        msgs.appendChild(userM);

        // KI Lade-Nachricht
        const aiM = document.createElement('div');
        aiM.className = "bg-white p-3 rounded-2xl shadow-sm border mb-2 text-xs text-slate-800 max-w-[85%]";
        aiM.innerText = "...";
        msgs.appendChild(aiM);
        
        input.value = "";
        msgs.scrollTop = msgs.scrollHeight;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "Authorization": "Bearer " + AI_API_KEY.trim()
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        { role: "system", content: "Antworte kurz und hilfreich auf Deutsch." },
                        { role: "user", content: q }
                    ]
                })
            });
            const data = await response.json();
            aiM.innerText = data.choices[0].message.content;
        } catch (err) { 
            aiM.innerText = "Fehler: Verbindung zur KI unterbrochen."; 
        }
        msgs.scrollTop = msgs.scrollHeight;
    }

    // --- 7. INITIALISIERUNG BEIM START ---
    document.addEventListener('DOMContentLoaded', () => {
        // 1. Kacheln holen
        fetchPosts();
        
        // 2. Chat Toggle Logik
        const chatWin = document.getElementById('chat-window');
        const chatToggle = document.getElementById('chat-toggle');
        const closeChat = document.getElementById('close-chat');
        
        if(chatToggle) chatToggle.onclick = () => chatWin.classList.toggle('hidden');
        if(closeChat) closeChat.onclick = () => chatWin.classList.add('hidden');
        
        // 3. Chat Senden Logik
        const sendBtn = document.getElementById('send-chat');
        const chatInput = document.getElementById('chat-input');
        
        if(sendBtn) sendBtn.onclick = () => askAI(chatInput.value);
        if(chatInput) chatInput.onkeypress = (e) => { if(e.key === 'Enter') askAI(chatInput.value); };
        
        // 4. Chat Chips (Vorschläge)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-chip')) {
                askAI(e.target.innerText);
            }
        });

        // 5. Modal Schließen
        const modalClose = document.getElementById('closeModal');
        if (modalClose) modalClose.onclick = window.closeModal;
    });

})();
