const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const KEY_URL = 'https://hub.bildungdigital.at/key.txt'; 
let GEMINI_API_KEY = "";

/**
 * 1. KEY LADEN
 */
async function loadApiKey() {
    try {
        const response = await fetch(KEY_URL);
        if (!response.ok) throw new Error("Key nicht gefunden");
        const text = await response.text();
        GEMINI_API_KEY = text.trim();
        console.log("✅ Key geladen.");
    } catch (e) {
        console.error("❌ Key-Fehler:", e.message);
    }
}

/**
 * 2. BEITRÄGE LADEN (MIT FIX FÜR START- UND DETAILS-BUTTON)
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
            col.innerHTML = `
                <div class="hover-card bg-white rounded-[20px] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full">
                    <div class="h-44 overflow-hidden bg-slate-50 flex items-center justify-center">
                        <img src="${media}" class="w-full h-full object-cover">
                    </div>
                    <div class="p-5 flex flex-col flex-grow">
                        <h5 class="text-lg font-bold text-[#003366] mb-4">${post.title.rendered}</h5>
                        <div class="flex gap-2 mt-auto">
                            <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold hover:bg-[#003366] hover:text-white transition-all text-xs">Details</button>
                            ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold hover:bg-[#16a34a] text-xs transition-all">🚀 Start</button>` : ''}
                        </div>
                    </div>
                </div>`;
            
            // WICHTIG: Direkte Zuweisung der Klick-Events
            col.querySelector('.js-details').addEventListener('click', () => openContent(post.id));
            if (hasH5P) {
                col.querySelector('.js-start').addEventListener('click', () => openContent(post.id));
            }
            container.appendChild(col);
        });
    } catch (e) { console.error("Fehler beim Laden:", e); }
}

/**
 * 3. MODAL ÖFFNEN
 */
async function openContent(postId) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    if (modal && body) {
        modal.classList.remove('hidden');
        body.innerHTML = 'Laden...';
        try {
            const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
            const post = await res.json();
            body.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-[#003366]">${post.title.rendered}</h2><div class="prose max-w-none">${post.content.rendered}</div>`;
        } catch (e) { body.innerHTML = "Fehler beim Laden des Inhalts."; }
    }
}

/**
 * 4. CHAT-BOT (STEUERUNG UND API)
 */
function initChat() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const chatClose = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const msgArea = document.getElementById('chat-messages');

    // Chat öffnen
    if (chatToggle && chatWindow) {
        chatToggle.onclick = () => chatWindow.classList.toggle('hidden');
    }

    // Chat schließen
    if (chatClose && chatWindow) {
        chatClose.onclick = () => chatWindow.classList.add('hidden');
    }

    // Chips (Vorschläge)
    document.querySelectorAll('.chat-chip').forEach(chip => {
        chip.onclick = () => {
            if (chatInput) {
                chatInput.value = chip.innerText;
                askGemini(chip.innerText);
            }
        };
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
        if (chatInput) chatInput.value = "";
        const loadingMsg = addMsg("KI überlegt...");

        try {
            // Wir nutzen v1beta, da Pro-Keys dort oft flexibler sind
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Antworte kurz auf Deutsch: " + question }] }]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "Fehler");
            loadingMsg
