const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = "AIzaSyAkblWC7lKCvFiXYkKht7BKobVVdaNEQc0"; 

// 1. MODAL-STEUERUNG (SICHERGESTELLT)
function closeModal() {
    const modal = document.getElementById('contentModal');
    if (modal) modal.classList.add('hidden');
}

// 2. BEITRÄGE LADEN
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
                <div class="hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full">
                    <div class="h-44 overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img src="${media}" class="w-full h-full object-cover">
                    </div>
                    <div class="p-5 flex flex-col flex-grow">
                        <h5 class="text-lg font-bold text-[#003366] mb-4 leading-tight font-sans">${post.title.rendered}</h5>
                        <div class="flex gap-2 mt-auto">
                            <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold hover:bg-[#003366] hover:text-white transition-all text-sm">Details</button>
                            ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold hover:bg-[#16a34a] shadow-sm transition-all text-sm">🚀 Start</button>` : ''}
                        </div>
                    </div>
                </div>`;
            col.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) col.querySelector('.js-start').onclick = () => openContent(post.id, true);
            container.appendChild(col);
        });
    } catch (e) { console.error("Kacheln:", e); }
}

// 3. INHALT ÖFFNEN
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    if (!modal || !body) return;
    modal.classList.remove('hidden');
    body.innerHTML = '<div class="p-10 text-center">Inhalt wird geladen...</div>';
    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        body.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-[#003366] font-sans">${post.title.rendered}</h2><div class="prose max-w-none font-sans text-slate-700">${post.content.rendered}</div>`;
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
}

// 4. CHAT-BOT (ROBUSTE VERSION)
function initChat() {
    const toggle = document.getElementById('chat-toggle');
    const win = document.getElementById('chat-window');
    const input = document.getElementById('chat-input');
    const btn = document.getElementById('send-chat');
    const msgs = document.getElementById('chat-messages');

    if (!toggle || !win) return;

    toggle.onclick = () => win.classList.toggle('hidden');
    const closeChatBtn = document.getElementById('close-chat');
    if (closeChatBtn) closeChatBtn.onclick = () => win.classList.add('hidden');

    async function ask(q) {
        if (!q.trim()) return;
        
        // Nachricht des Users anzeigen
        const userM = document.createElement('div');
        userM.className = "bg-[#00aaff] text-white p-3 rounded-2xl ml-auto mb-2 text-xs text-right max-w-[85%]";
        userM.innerText = q;
        msgs.appendChild(userM);
        input.value = "";
        
        const botM = document.createElement('div');
        botM.className = "bg-white p-3 rounded-2xl shadow-sm border mb-2 text-xs text-slate-800 max-w-[85%]";
        botM.innerText = "KI denkt nach...";
        msgs.appendChild(botM);
        msgs.scrollTop = msgs.scrollHeight;

        try {
            // WIR NUTZEN JETZT EINE ANDERE URL-STRUKTUR, DIE BEI NEUEN KEYS STABILER IST
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Antworte kurz und präzise auf Deutsch: " + q }] }]
                })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content) {
                botM.innerText = data.candidates[0].content.parts[0].text;
            } else {
                // Wenn Google wieder meckert, zeigen wir die Fehlermeldung direkt im Chat für die Diagnose
                botM.innerText = "Fehler: " + (data.error?.message || "Unerwartete Antwort.");
                console.log("Detaillierter Fehler:", data);
            }
        } catch (err) {
            botM.innerText = "Verbindung zum Server fehlgeschlagen.";
        }
        msgs.scrollTop = msgs.scrollHeight;
    }

    btn.onclick = () => ask(input.value);
    input.onkeypress = (e) => { if(e.key === 'Enter') ask(input.value); };
}

// 5. START
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    initChat();
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) closeBtn.onclick = closeModal;
});
