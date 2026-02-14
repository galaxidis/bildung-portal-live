const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

// TRAGE HIER DEINEN KEY EIN (zwischen die Anführungszeichen)
const MANUAL_KEY = "AIzaSyBKBn9GfXIvy-jSo6-W9siAukUYgFjg0S4"; 

let GEMINI_API_KEY = MANUAL_KEY;

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
            col.innerHTML = `
                <div class="hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full">
                    <div class="h-44 overflow-hidden bg-slate-50 flex items-center justify-center">
                        <img src="${media}" class="w-full h-full object-cover">
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
            if (hasH5P) col.querySelector('.js-start').onclick = () => openContent(post.id, true);
            container.appendChild(col);
        });
    } catch (e) { console.error("Fehler Posts:", e); }
}

/**
 * 2. MODAL ÖFFNEN
 */
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    modal.classList.remove('hidden');
    body.innerHTML = 'Lädt...';
    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        let h5pId = null;
        if (post._embedded?.['wp:term']?.[1]) {
            const idTag = post._embedded['wp:term'][1].find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }
        if (directH5P && h5pId) {
            body.innerHTML = `<div class="w-full h-[70vh]"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" class="w-full h-full border-0" allowfullscreen></iframe></div>`;
        } else {
            body.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-[#003366]">${post.title.rendered}</h2><div class="prose max-w-none text-slate-700">${post.content.rendered}</div>`;
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
}

/**
 * 3. CHAT-BOT (DIREKT-MODUS)
 */
function initChat() {
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const msgArea = document.getElementById('chat-messages');

    document.getElementById('chat-toggle')?.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
    document.getElementById('close-chat')?.addEventListener('click', () => chatWindow.classList.add('hidden'));

    document.querySelectorAll('.chat-chip').forEach(chip => {
        chip.addEventListener('click', () => { chatInput.value = chip.innerText; askGemini(chip.innerText); });
    });

    async function askGemini(question) {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("DEIN_AIZA")) {
            alert("Bitte trage den API-Key im Code ein!");
            return;
        }
        
        const addMsg = (text, isBot = true) => {
            const m = document.createElement('div');
            m.className = isBot ? "bg-white p-3 rounded-2xl shadow-sm border border-slate-100 max-w-[85%] text-xs mb-2" : "bg-[#00aaff] text-white p-3 rounded-2xl ml-auto max-w-[85%] text-right text-xs mb-2";
            m.innerText = text;
            msgArea.appendChild(m);
            msgArea.scrollTop = msgArea.scrollHeight;
            return m;
        };

        addMsg(question, false);
        chatInput.value = "";
        const loadingMsg = addMsg("KI antwortet...");

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Antworte kurz: " + question }] }] })
            });
            const data = await response.json();
            if (data.candidates) {
                loadingMsg.innerText = data.candidates[0].content.parts[0].text;
            } else {
                loadingMsg.innerText = "Fehler: " + (data.error?.message || "Check Console");
                console.log(data);
            }
        } catch (err) { loadingMsg.innerText = "Verbindung fehlgeschlagen."; }
    }

    document.getElementById('send-chat')?.addEventListener('click', () => { if(chatInput.value.trim()) askGemini(chatInput.value.trim()); });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    initChat();
    document.getElementById('closeModal')?.addEventListener('click', () => document.getElementById('contentModal').classList.add('hidden'));
});
