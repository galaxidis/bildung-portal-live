(function() {
    const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
    const AI_API_KEY = "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"; 
    const AI_MODEL = "llama-3.1-8b-instant";
    
    let allPosts = []; // Hier speichern wir die Daten für die Suche

    // --- 1. MODAL STEUERUNG ---
    window.closeModal = function() {
        const modal = document.getElementById('contentModal');
        if (modal) modal.classList.add('hidden');
    };

    // --- 2. KACHELN RENDERN (Mit "Sorry"-Logik) ---
    function renderPosts(postsToDisplay) {
        const container = document.getElementById('posts-container');
        if (!container) return;
        container.innerHTML = ""; 

        if (postsToDisplay.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <p class="text-xl text-slate-400">Sorry, dazu wurde leider nichts gefunden. 😕</p>
                </div>`;
            return;
        }

        postsToDisplay.forEach((post) => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || `https://picsum.photos/seed/${post.id}/600/400`;
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            const col = document.createElement('div');
            col.className = 'w-full'; 
            col.innerHTML = `
                <div class="hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full">
                    <div class="h-44 overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img src="${media}" class="w-full h-full object-cover" loading="lazy">
                    </div>
                    <div class="p-5 flex flex-col flex-grow">
                        <h5 class="text-lg font-bold text-[#003366] mb-4 leading-tight">${post.title.rendered}</h5>
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

    // --- 3. DATEN LADEN & SUCHE INITIALISIEREN ---
    async function fetchPosts() {
        try {
            const res = await fetch(API_URL);
            allPosts = await res.json();
            renderPosts(allPosts); // Erstmal alles anzeigen
            
            // Suche verknüpfen, sobald Daten da sind
            const searchInput = document.querySelector('input[type="text"]');
            if (searchInput) {
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
        } catch (e) { console.error("WP-Ladefehler", e); }
    }

    // --- 4. INHALT LADEN (MODAL) ---
    async function openContent(postId, directH5P) {
        const modal = document.getElementById('contentModal');
        const body = document.getElementById('modalTextContent');
        if (!modal || !body) return;
        modal.classList.remove('hidden');
        body.innerHTML = 'Lade...';
        
        const post = allPosts.find(p => p.id === postId);
        if(!post) return;

        let h5pId = null;
        if (post._embedded?.['wp:term']?.[1]) {
            const idTag = post._embedded['wp:term'][1].find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            body.innerHTML = `<div class="w-full h-[75vh]"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" class="w-full h-full border-0" allowfullscreen></iframe></div>`;
        } else {
            body.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-[#003366]">${post.title.rendered}</h2><div class="prose max-w-none">${post.content.rendered}</div>`;
        }
    }

    // --- 5. CHATBOT (UNVERÄNDERT & STABIL) ---
    async function askAI(q) {
        const msgs = document.getElementById('chat-messages');
        const input = document.getElementById('chat-input');
        if (!q.trim()) return;

        const m = document.createElement('div');
        m.className = "bg-white p-3 rounded-2xl shadow-sm border mb-2 text-xs text-slate-800 max-w-[85%]";
        m.innerText = "...";
        msgs.appendChild(m);
        input.value = "";
        msgs.scrollTop = msgs.scrollHeight;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + AI_API_KEY },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: [{ role: "user", content: "Antworte kurz: " + q }]
                })
            });
            const data = await response.json();
            m.innerText = data.choices[0].message.content;
        } catch (err) { m.innerText = "Verbindung unterbrochen."; }
        msgs.scrollTop = msgs.scrollHeight;
    }

    // --- INITIALISIERUNG ---
    document.addEventListener('DOMContentLoaded', () => {
        fetchPosts();
        
        // Chat Toggle
        const toggle = document.getElementById('chat-toggle');
        if(toggle) toggle.onclick = () => document.getElementById('chat-window').classList.toggle('hidden');
        
        // Chat Send
        const sendBtn = document.getElementById('send-chat');
        if(sendBtn) sendBtn.onclick = () => askAI(document.getElementById('chat-input').value);
        
        // Chips
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('chat-chip')) askAI(
