const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = "AIzaSyAkblWC7lKCvFiXYkKht7BKobVVdaNEQc0"; 

// 1. MODAL & H5P (FIXIERT)
function closeModal() {
    const modal = document.getElementById('contentModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('modalTextContent').innerHTML = ""; 
    }
}

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
    } catch (e) { console.error("WP-Fehler"); }
}

async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    if (!modal || !body) return;
    modal.classList.remove('hidden');
    body.innerHTML = 'Lade...';
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
            body.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-[#003366]">${post.title.rendered}</h2><div class="prose max-w-none">${post.content.rendered}</div>`;
        }
    } catch (e) { body.innerHTML = "Fehler."; }
}

// 4. CHAT-BOT (MIT CHIP-KORREKTUR)
function initChat() {
    const win = document.getElementById('chat-window');
    const input = document.getElementById('chat-input');
    const msgs = document.getElementById('chat-messages');

    document.getElementById('chat-toggle').onclick = () => win.classList.toggle('hidden');
    document.getElementById('close-chat').onclick = () => win.classList.add('hidden');

    async function ask(q) {
        if (!q.trim()) return;
        const m = document.createElement('div');
        m.className = "bg-white p-3 rounded-2xl shadow-sm border mb-2 text-xs text-slate-800 max-w-[85%]";
        m.innerText = "Frage wird gesendet...";
        msgs.appendChild(m);
        input.value = "";
        msgs.scrollTop = msgs.scrollHeight;

        try {
            // HINWEIS: Falls Google blockiert, hier eine Proxy-URL oder einen anderen Anbieter nutzen
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: q }] }] })
            });
            const data = await response.json();
            m.innerText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Google blockiert den Zugriff (Region/CORS).";
        } catch (err) { m.innerText = "Netzwerkfehler."; }
        msgs.scrollTop = msgs.scrollHeight;
    }

    // CHIPS ANKLICKBAR MACHEN
    function bindChips() {
        const chips = document.querySelectorAll('.chat-chip');
        chips.forEach(chip => {
            chip.style.cursor = "pointer";
            chip.onclick = (e) => {
                e.preventDefault();
                ask(chip.innerText);
            };
        });
    }

    // Da Chips oft dynamisch sind, binden wir sie beim Start
    bindChips();

    document.getElementById('send-chat').onclick = () => ask(input.value);
    input.onkeypress = (e) => { if(e.key === 'Enter') ask(input.value); };
}

document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    initChat();
    const c = document.getElementById('closeModal');
    if (c) c.onclick = closeModal;
});
