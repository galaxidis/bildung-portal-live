const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const KEY_URL = 'https://hub.bildungdigital.at/key.txt'; 
let GEMINI_API_KEY = "";

/**
 * 1. KEY LADEN
 */
async function loadApiKey() {
    try {
        const response = await fetch(KEY_URL);
        if (!response.ok) throw new Error("Key-Datei nicht erreichbar");
        const text = await response.text();
        GEMINI_API_KEY = text.trim();
        console.log("✅ Pro-Key erfolgreich geladen.");
    } catch (e) {
        console.error("❌ Key-Fehler:", e.message);
    }
}

/**
 * 2. BEITRÄGE LADEN & MODAL (Gekürzt für Übersicht)
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
            const col = document.createElement('div');
            col.className = 'w-full'; 
            col.innerHTML = `
                <div class="hover-card bg-white rounded-[20px] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full">
                    <div class="h-44 overflow-hidden bg-slate-50 flex items-center justify-center"><img src="${media}" class="w-full h-full object-cover"></div>
                    <div class="p-5 flex flex-col flex-grow">
                        <h5 class="text-lg font-bold text-[#003366] mb-4">${post.title.rendered}</h5>
                        <button class="js-details w-full py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold hover:bg-[#003366] hover:text-white transition-all text-xs">Details</button>
                    </div>
                </div>`;
            col.querySelector('.js-details').onclick = () => openContent(post.id);
            container.appendChild(col);
        });
    } catch (e) { console.error(e); }
}

async function openContent(postId) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    modal.classList.remove('hidden');
    body.innerHTML = 'Laden...';
    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        body.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-[#003366]">${post.title.rendered}</h2><div class="prose max-w-none">${post.content.rendered}</div>`;
    } catch (e) { body.innerHTML = "Fehler."; }
}

/**
 * 3. CHAT-BOT (STABILER PRO-MODUS)
 */
function initChat() {
    const chatInput = document.getElementById('chat-input');
    const msgArea = document.getElementById('chat-messages');

    document.querySelectorAll('.chat-chip').forEach(chip => {
        chip.addEventListener('click', () => { 
            chatInput.value = chip.innerText;
            askGemini(chip.innerText); 
        });
    });

    async function askGemini(question) {
        if (!GEMINI_API_KEY) return;
        
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
        const loadingMsg = addMsg("KI (Pro) antwortet...");

        try {
            // BEI PRO-ACCOUNTS: Immer die stabile v1 nutzen
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Antworte kurz und präzise auf Deutsch: " + question }] }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // FALLBACK: Falls v1 doch nicht will, versuche v1beta mit dem exakt gleichen Key
                console.warn("Versuche v1beta Fallback...");
                const fbResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: question }] }] })
                });
                const fbData = await fbResponse.json();
                
                if (fbResponse.ok) {
                    loadingMsg.innerText = fbData.candidates[0].content.parts[0].text;
                } else {
                    throw new Error(fbData.error?.message || "Google Pro-Schnittstelle verweigert den Dienst.");
                }
                return;
            }

            loadingMsg.innerText = data.candidates[0].content.parts[0].text;
        } catch (err) {
            loadingMsg.innerHTML = `<span class="text-red-500">Pro-Fehler: ${err.message}</span>`;
        }
    }

    document.getElementById('send-chat')?.addEventListener('click', () => { if(chatInput.value.trim()) askGemini(chatInput.value.trim()); });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadApiKey();
    fetchPosts();
    initChat();
    document.getElementById('closeModal')?.addEventListener('click', () => document.getElementById('contentModal').classList.add('hidden'));
});
