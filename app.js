const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let GEMINI_API_KEY = "";

/**
 * 0. KEY VOM SERVER LADEN
 * Wir nutzen die absolute URL, um den 404-Fehler sicher zu umgehen.
 */
async function loadApiKey() {
    try {
        const response = await fetch('https://hub.bildungdigital.at/key.txt?v=' + new Date().getTime()); 
        if (!response.ok) throw new Error("Key-Datei konnte nicht geladen werden.");
        const text = await response.text();
        GEMINI_API_KEY = text.trim();
        console.log("✅ KI-Schnittstelle bereit. Key erfolgreich geladen.");
    } catch (e) {
        console.error("❌ KI-Key Fehler:", e.message);
    }
}

/**
 * 1. BEITRÄGE LADEN & KACHELN ERSTELLEN
 */
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        container.innerHTML = ""; 
        
        posts.forEach((post) => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url 
                          || `https://picsum.photos/seed/${post.id}/600/400`;
            
            const contentString = post.content.rendered.toLowerCase();
            const hasH5P = contentString.includes('h5p');

            const col = document.createElement('div');
            col.className = 'w-full'; 
            col.innerHTML = `
                <div class="hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full">
                    <div class="h-44 overflow-hidden bg-slate-50 flex items-center justify-center">
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
            
            // Klick-Events
            col.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) {
                col.querySelector('.js-start').onclick = () => openContent(post.id, true);
            }
            container.appendChild(col);
        });
        console.log("✅ Kacheln geladen.");
    } catch (e) { 
        console.error("Fehler beim Laden der Posts:", e);
    }
}

/**
 * 2. MODAL ÖFFNEN (TEXT ODER H5P IFRAME)
 */
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    body.innerHTML = '<div class="text-center py-20 italic">Wird geladen...</div>';
    
    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        let h5pId = null;
        if (post._embedded?.['wp:term']?.[1]) {
            const idTag = post._embedded['wp:term'][1].find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            body.innerHTML = `
                <div class="w-full h-[70vh]">
                    <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                            class="w-full h-full border-0" allowfullscreen></iframe>
                </div>`;
        } else {
            body.innerHTML = `
                <h2 class="text-2xl font-bold mb-4 text-[#003366]">${post.title.rendered}</h2>
                <div class="prose max-w-none text-slate-700">${post.content.rendered}</div>
            `;
        }
    } catch (e) { 
        body.innerHTML = "Fehler beim Laden."; 
    }
}

/**
 * 3. CHAT-BOT LOGIK (GEMINI 1.5 FLASH)
 */
function initChat() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const msgArea = document.getElementById('chat-messages');

    chatToggle?.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
    document.getElementById('close-chat')?.addEventListener('click', () => chatWindow.classList.add('hidden'));

    // Chips / Vorschläge sofort senden
    document.querySelectorAll('.chat-chip').forEach(chip => {
        chip.addEventListener('click', () => { 
            const text = chip.innerText;
            chatInput.value = text; 
            askGemini(text); 
        });
    });

    async function askGemini(question) {
        if (!GEMINI_API_KEY) {
            alert("Fehler: API-Key wurde nicht geladen.");
            return;
        }
        
        const addMessage = (text, isBot = true) => {
            const m = document.createElement('div');
            m.className = isBot ? "bg-white p-3 rounded-2xl shadow-sm border border-slate-100 max-w-[85%] text-xs text-slate-800 mb-2" : "bg-[#00aaff] text-white p-3 rounded-2xl ml-auto max-w-[85%] text-right text-xs mb-2";
            m.innerText = text;
            msgArea.appendChild(m);
            msgArea.scrollTop = msgArea.scrollHeight;
            return m;
        };

        addMessage(question, false);
        chatInput.value = "";
        const loadingMsg = addMessage("Ich überlege...");

        try {
            // Stabiler Endpunkt für Gemini 1.5 Flash
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Antworte als freundlicher Bildungs-Assistent kurz auf Deutsch: " + question }] }]
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                loadingMsg.innerText = "Fehler: " + (data.error?.message || "Google lehnt die Anfrage ab.");
                return;
            }

            if (data.candidates && data.candidates[0].content.parts[0].text) {
                loadingMsg.innerText = data.candidates[0].content.parts
