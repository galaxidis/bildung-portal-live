const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let GEMINI_API_KEY = "";

/**
 * 0. KEY VOM SERVER LADEN
 */
async function loadApiKey() {
    try {
        const response = await fetch('key.txt'); 
        if (!response.ok) throw new Error("Key-Datei nicht gefunden");
        const text = await response.text();
        GEMINI_API_KEY = text.trim();
        console.log("KI-Schnittstelle bereit.");
    } catch (e) {
        console.warn("KI-Key konnte nicht geladen werden.");
    }
}

/**
 * 1. BEITRÄGE LADEN & H5P-LEITUNG
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
            
            // Prüfen, ob H5P im Inhalt vorkommt
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            const col = document.createElement('div');
            col.className = 'w-full'; 
            const card = document.createElement('div');
            card.className = 'hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full';
            card.innerHTML = `
                <div class="h-44 overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img src="${media}" class="w-full h-full object-cover">
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <h5 class="text-lg font-bold text-[#003366] mb-4 leading-tight">${post.title.rendered}</h5>
                    <div class="flex gap-2 mt-auto">
                        <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold hover:bg-[#003366] hover:text-white transition-all text-sm">Details</button>
                        ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold hover:bg-[#16a34a] shadow-sm transition-all text-sm">🚀 Start</button>` : ''}
                    </div>
                </div>`;
            
            // Details-Button -> Textansicht (directH5P = false)
            card.querySelector('.js-details').onclick = () => openContent(post.id, false);
            
            // Start-Button -> H5P-Direktansicht (directH5P = true)
            if (hasH5P) {
                card.querySelector('.js-start').onclick = () => openContent(post.id, true);
            }
            
            col.appendChild(card);
            container.appendChild(col);
        });
    } catch (e) { container.innerHTML = "Fehler beim Laden."; }
}

/**
 * 2. MODAL LOGIK (H5P IFRAME ODER TEXT)
 */
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    body.innerHTML = '<div class="text-center py-20 italic">Inhalt wird geladen...</div>';
    
    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        let h5pId = null;
        // Suche nach der H5P-ID in den Tags (deine bewährte Logik)
        if (post._embedded?.['wp:term']?.[1]) {
            const idTag = post._embedded['wp:term'][1].find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            // Wenn Start gedrückt wurde: Zeige nur das Iframe
            body.innerHTML = `
                <div class="w-full h-[70vh]">
                    <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                            class="w-full h-full border-0" 
                            allowfullscreen></iframe>
                </div>`;
        } else {
            // Wenn Details gedrückt wurde: Zeige Titel und Text
            body.innerHTML = `
                <h2 class="text-2xl font-bold mb-4 text-[#003366]">${post.title.rendered}</h2>
                <div class="prose max-w-none text-slate-700">${post.content.rendered}</div>
            `;
        }
    } catch (e) { 
        body.innerHTML = "Inhalt konnte nicht geladen werden."; 
    }
}

/**
 * 3. CHAT-BOT LOGIK (STABIL MIT CHIP-AUTOSTART)
 */
function initChat() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const msgArea = document.getElementById('chat-messages');

    chatToggle?.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
    document.getElementById('close-chat')?.addEventListener('click', () => chatWindow.classList.add('hidden'));

    document.querySelectorAll('.chat-chip').forEach(chip => {
        chip.addEventListener('click', () => { 
            const text = chip.innerText;
            chatInput.value = text; 
            askGemini(text); 
        });
    });

    async function askGemini(question) {
        if (!GEMINI_API_KEY) return;
        
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
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Antworte als freundlicher Assistent kurz auf Deutsch: " + question }] }]
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                loadingMsg.innerText = data.candidates[0].content.parts[0].text;
            } else {
                loadingMsg.innerText = "Google Fehler: " + (data.error?.message || "Fehlermeldung vom Key.");
            }
        } catch (err) {
            loadingMsg.innerText = "Verbindung fehlgeschlagen.";
        }
    }

    sendBtn?.addEventListener('click', () => { if(chatInput.value.trim()) askGemini(chatInput.value.trim()); });
    chatInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter' && chatInput.value.trim()) askGemini(chatInput.value.trim()); });
}

/**
 * 4. START-SEQUENZ
 */
document.addEventListener('DOMContentLoaded', async () => {
    await loadApiKey();
    fetchPosts();
    initChat();
    
    document.getElementById('searchInput')?.addEventListener('input', () => {
        const term = document.getElementById('searchInput').value.toLowerCase().trim();
        document.querySelectorAll('.hover-card').forEach(card => {
            const isMatch = card.querySelector('h5').innerText.toLowerCase().includes(term);
            card.parentElement.style.display = isMatch ? 'block' : 'none';
        });
    });

    document.getElementById('closeModal')?.addEventListener('click', () => {
        document.getElementById('contentModal').classList.add('hidden');
    });
});
