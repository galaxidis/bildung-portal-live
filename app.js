const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const KEY_URL = 'https://hub.bildungdigital.at/key.txt'; 
let GEMINI_API_KEY = "";

/**
 * 1. KEY LADEN
 */
async function loadApiKey() {
    console.log("🔍 Lade Key von:", KEY_URL);
    try {
        const response = await fetch(KEY_URL);
        if (!response.ok) throw new Error(`Server-Status: ${response.status}`);
        const text = await response.text();
        GEMINI_API_KEY = text.trim();
        console.log("✅ Key bereit.");
    } catch (e) {
        console.error("❌ Key-Ladefehler (CORS prüfen!):", e.message);
    }
}

/**
 * 2. BEITRÄGE LADEN
 */
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        container.innerHTML = ""; 
        posts.forEach((post) => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || `https://picsum.photos/seed/${post.id}/600/400`;
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            const col = document.createElement('div');
            col.className = 'w-full'; 
            const card = document.createElement('div');
            card.className = 'hover-card bg-white rounded-[20px] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full';
            card.innerHTML = `
                <div class="h-44 overflow-hidden bg-slate-50 flex items-center justify-center"><img src="${media}" class="w-full h-full object-cover"></div>
                <div class="p-5 flex flex-col flex-grow">
                    <h5 class="text-lg font-bold text-[#003366] mb-4">${post.title.rendered}</h5>
                    <div class="flex gap-2 mt-auto">
                        <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold hover:bg-[#003366] hover:text-white transition-all text-xs">Details</button>
                        ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold hover:bg-[#16a34a] text-xs transition-all">🚀 Start</button>` : ''}
                    </div>
                </div>`;
            card.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) card.querySelector('.js-start').onclick = () => openContent(post.id, true);
            col.appendChild(card);
            container.appendChild(col);
        });
    } catch (e) { console.error("Fehler beim Laden der Posts", e); }
}

/**
 * 3. MODAL & SUCHE
 */
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    modal.classList.remove('hidden');
    body.innerHTML = 'Wird geladen...';
    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        body.innerHTML = `<h2 class="text-2xl font-bold mb-4">${post.title.rendered}</h2><div class="prose max-w-none">${post.content.rendered}</div>`;
    } catch (e) { body.innerHTML = "Inhalt konnte nicht geladen werden."; }
}

function performSearch() {
    const term = document.getElementById('searchInput')?.value.toLowerCase().trim() || "";
    document.querySelectorAll('.hover-card').forEach(card => {
        const match = card.querySelector('h5').innerText.toLowerCase().includes(term);
        card.parentElement.style.display = match ? 'block' : 'none';
    });
}

/**
 * 4. CHAT-BOT (STABILE VERSION v1)
 */
function initChat() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const msgArea = document.getElementById('chat-messages');

    chatToggle?.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
    document.getElementById('close-chat')?.addEventListener('click', () => chatWindow.classList.add('hidden'));

    // Fix für die Vorschläge (Chips)
    document.querySelectorAll('.chat-chip').forEach(chip => {
        chip.addEventListener('click', () => { 
            const question = chip.innerText;
            chatInput.value = question;
            askGemini(question); 
        });
    });

    async function askGemini(question) {
        if (!GEMINI_API_KEY) {
            alert("KI-Key fehlt. Bitte prüfe die Konsole (F12).");
            return;
        }

        const addMsg = (text, isBot = true) => {
            const m = document.createElement('div');
            m.className = isBot ? "bg-white p-3 rounded-2xl shadow-sm border border-slate-100 max-w-[85%] text-xs" : "bg-[#00aaff] text-white p-3 rounded-2xl ml-auto max-w-[85%] text-right text-xs";
            m.innerText = text;
            msgArea.appendChild(m);
            msgArea.scrollTop = msgArea.scrollHeight;
            return m;
        };

        addMsg(question, false);
        chatInput.value = "";
        const loadingMsg = addMsg("KI überlegt...");

        try {
            // Umstellung auf v1 für bessere Kompatibilität
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Antworte als hilfreicher Assistent kurz auf Deutsch: " + question }] }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Google Fehler:", data);
                loadingMsg.innerHTML = `<span class="text-red-500">Fehler: ${data.error?.message || 'Zugriff verweigert'}</span>`;
                return;
            }

            loadingMsg.innerText = data.candidates[0].content.parts[0].text;
        } catch (err) {
            loadingMsg.innerText = "Netzwerk-Fehler.";
        }
    }

    sendBtn?.addEventListener('click', () => { if(chatInput.value.trim()) askGemini(chatInput.value.trim()); });
    chatInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter' && chatInput.value.trim()) askGemini(chatInput.value.trim()); });
}

/**
 * START
 */
document.addEventListener('DOMContentLoaded', async () => {
    await loadApiKey();
    fetchPosts();
    initChat();
    
    document.getElementById('searchInput')?.addEventListener('input', performSearch);
    document.getElementById('closeModal')?.addEventListener('click', () => {
        document.getElementById('contentModal').classList.add('hidden');
    });
});
