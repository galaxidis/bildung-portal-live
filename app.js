const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const KEY_URL = 'https://hub.bildungdigital.at/key.txt'; // Der Pfad zu deinem Server
let GEMINI_API_KEY = "";

/**
 * 0. KEY VOM HUB-SERVER LADEN (CORS-Lösung)
 */
async function loadApiKey() {
    try {
        const response = await fetch(KEY_URL);
        if (!response.ok) throw new Error("Key-Datei auf dem Server nicht erreichbar");
        const text = await response.text();
        GEMINI_API_KEY = text.trim();
        console.log("KI-Schnittstelle erfolgreich vom Hub-Server initialisiert.");
    } catch (e) {
        console.error("KI-Fehler: Der Browser blockiert den Key-Zugriff (CORS) oder die Datei fehlt.", e);
    }
}

/**
 * 1. BEITRÄGE LADEN & BILDER
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
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            const col = document.createElement('div');
            col.className = 'w-full'; 
            const card = document.createElement('div');
            card.className = 'hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full';
            card.innerHTML = `
                <div class="h-44 overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img src="${media}" class="w-full h-full object-cover" loading="lazy">
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <h5 class="text-lg font-bold text-[#003366] mb-4 leading-tight">${post.title.rendered}</h5>
                    <div class="flex gap-2 mt-auto">
                        <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold hover:bg-[#003366] hover:text-white transition-all text-sm">Details</button>
                        ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold hover:bg-[#16a34a] shadow-sm transition-all text-sm">🚀 Start</button>` : ''}
                    </div>
                </div>`;
            
            card.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) card.querySelector('.js-start').onclick = () => openContent(post.id, true);
            
            col.appendChild(card);
            container.appendChild(col);
        });
    } catch (e) { 
        container.innerHTML = "<p class='col-span-full text-center py-10'>Inhalte konnten nicht geladen werden.</p>"; 
    }
}

/**
 * 2. SUCHE & MODAL
 */
function performSearch() {
    const term = document.getElementById('searchInput')?.value.toLowerCase().trim() || "";
    const cards = document.querySelectorAll('.hover-card');
    cards.forEach(card => {
        const isMatch = card.querySelector('h5').innerText.toLowerCase().includes(term);
        card.parentElement.style.display = isMatch ? 'block' : 'none';
    });
}

async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    if (!modal) return;
    
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
            body.innerHTML = `<div class="w-full h-[65vh]"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" class="w-full h-full border-0" allowfullscreen></iframe></div>`;
        } else {
            body.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-[#003366]">${post.title.rendered}</h2><div class="prose max-w-none text-slate-700">${post.content.rendered}</div>`;
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden des Inhalts."; }
}

/**
 * 3. CHAT-BOT LOGIK (GEMINI)
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
            chatInput.value = chip.innerText; 
            chatInput.focus(); 
        });
    });

    async function askGemini(question) {
        if (!GEMINI_API_KEY) {
            alert("Der KI-Schlüssel konnte nicht geladen werden. Bitte CORS-Einstellungen am Server prüfen.");
            return;
        }

        const addMessage = (text, isBot = true) => {
            const m = document.createElement('div');
            m.className = isBot ? "bg-white p-3 rounded-2xl shadow-sm border border-slate-100 max-w-[85%] text-xs text-slate-800" : "bg-[#00aaff] text-white p-3 rounded-2xl ml-auto max-w-[85%] text-right text-xs";
            m.innerText = text;
            msgArea.appendChild(m);
            msgArea.scrollTop = msgArea.scrollHeight;
            return m;
        };

        addMessage(question, false);
        chatInput.value = "";
        const loadingMsg = addMessage("Überlege...");

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Antworte als freundlicher Assistent für digitale Bildung kurz und präzise auf Deutsch: " + question }] }]
                })
            });
            const data = await response.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                loadingMsg.innerText = data.candidates[0].content.parts[0].text;
            } else {
                throw new Error();
            }
        } catch (err) {
            loadingMsg.innerText = "Verbindung fehlgeschlagen. Der API-Key ist eventuell ungültig oder gesperrt.";
        }
    }

    sendBtn?.addEventListener('click', () => { if(chatInput.value.trim()) askGemini(chatInput.value.trim()); });
    chatInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter' && chatInput.value.trim()) askGemini(chatInput.value.trim()); });
}

/**
 * 4. START-SEQUENZ
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Zuerst den Key vom Hub-Server holen
    await loadApiKey();
    
    // 2. Dann die restlichen Funktionen starten
    fetchPosts();
    initChat();
    
    document.getElementById('searchInput')?.addEventListener('input', performSearch);
    document.getElementById('searchButton')?.addEventListener('click', performSearch);
    
    document.getElementById('closeModal')?.addEventListener('click', () => {
        document.getElementById('contentModal').classList.add('hidden');
    });
});
