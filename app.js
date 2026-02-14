const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const KEY_URL = 'https://hub.bildungdigital.at/key.txt'; 
let GEMINI_API_KEY = "";

/**
 * 0. DETEKTIV-MODUS: KEY VOM SERVER LADEN
 */
async function loadApiKey() {
    try {
        console.log("🕵️ Detektiv: Versuche Key zu laden von:", KEY_URL);
        const response = await fetch(KEY_URL);
        
        if (!response.ok) throw new Error(`Server-Fehler: ${response.status}`);
        
        const text = await response.text();
        GEMINI_API_KEY = text.trim();

        // Analyse des geladenen Keys
        console.log("📊 Analyse Ergebnis:");
        console.log("- Länge des Keys:", GEMINI_API_KEY.length, "Zeichen");
        console.log("- Startet mit:", GEMINI_API_KEY.substring(0, 6));
        console.log("- Endet mit:", GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4));

        if (GEMINI_API_KEY.length < 20) {
            console.warn("⚠️ Warnung: Der Key sieht verdächtig kurz aus!");
        }
    } catch (e) {
        console.error("❌ Detektiv-Alarm beim Key-Laden:", e.message);
    }
}

/**
 * 1. BEITRÄGE LADEN
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
            card.className = 'hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full';
            card.innerHTML = `
                <div class="h-44 overflow-hidden bg-slate-100 flex items-center justify-center"><img src="${media}" class="w-full h-full object-cover"></div>
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
    } catch (e) { console.error("Fehler beim Post-Laden", e); }
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
    modal.classList.remove('hidden');
    body.innerHTML = 'Laden...';
    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        body.innerHTML = `<h2 class="text-2xl font-bold mb-4">${post.title.rendered}</h2><div class="prose">${post.content.rendered}</div>`;
    } catch (e) { body.innerHTML = "Fehler."; }
}

/**
 * 3. CHAT-BOT (DETEKTIV-VERSION)
 */
function initChat() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const msgArea = document.getElementById('chat-messages');

    chatToggle?.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
    document.getElementById('close-chat')?.addEventListener('click', () => chatWindow.classList.add('hidden'));

    async function askGemini(question) {
        const addMessage = (text, isBot = true) => {
            const m = document.createElement('div');
            m.className = isBot ? "bg-white p-3 rounded-2xl shadow-sm border border-slate-100 max-w-[85%] text-xs" : "bg-[#00aaff] text-white p-3 rounded-2xl ml-auto max-w-[85%] text-right text-xs";
            m.innerText = text;
            msgArea.appendChild(m);
            msgArea.scrollTop = msgArea.scrollHeight;
            return m;
        };

        addMessage(question, false);
        chatInput.value = "";
        const loadingMsg = addMessage("Überlege...");

        console.log("🚀 Sende Anfrage an Google mit Key:", GEMINI_API_KEY.substring(0, 6) + "...");

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: question }] }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // HIER IST DIE DETEKTIV-LOGIK
                console.error("❌ GOOGLE FEHLER-ANTWORT:", data);
                const reason = data.error?.message || "Unbekannter Fehler";
                const status = data.error?.status || response.status;
                loadingMsg.innerHTML = `<b class="text-red-500">Google lehnt ab:</b><br>${reason}<br><small>Status: ${status}</small>`;
                return;
            }

            loadingMsg.innerText = data.candidates[0].content.parts[0].text;
        } catch (err) {
            console.error("❌ NETZWERK-FEHLER:", err);
            loadingMsg.innerText = "Netzwerk-Fehler. Schau in die F12-Konsole!";
        }
    }

    sendBtn?.addEventListener('click', () => askGemini(chatInput.value.trim()));
    chatInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') askGemini(chatInput.value.trim()); });
}

/**
 * 4. START
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
