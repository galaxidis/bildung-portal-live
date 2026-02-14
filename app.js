const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

/**
 * 1. BEITRÄGE LADEN & BILDER-FIX
 */
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        container.innerHTML = ""; 

        posts.forEach((post, index) => {
            // ROBUSTE BILD-LOGIK: Wir nutzen Picsum, das ist für Dummys oft stabiler als Unsplash
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url 
                          || `https://picsum.photos/seed/${post.id}/600/400`;

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
            
            card.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) card.querySelector('.js-start').onclick = () => openContent(post.id, true);
            
            col.appendChild(card);
            container.appendChild(col);
        });
    } catch (e) { container.innerHTML = "Fehler beim Laden."; }
}

/**
 * 2. SUCHE
 */
function performSearch() {
    const term = document.getElementById('searchInput')?.value.toLowerCase().trim() || "";
    const cards = document.querySelectorAll('.hover-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const title = card.querySelector('h5').innerText.toLowerCase();
        const isMatch = title.includes(term);
        card.parentElement.style.display = isMatch ? 'block' : 'none';
        if (isMatch) visibleCount++;
    });

    const existingMsg = document.getElementById('no-results-msg');
    if (existingMsg) existingMsg.remove();
    if (visibleCount === 0 && term !== "") {
        const msg = document.createElement('div');
        msg.id = 'no-results-msg';
        msg.className = 'col-span-full text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200';
        msg.innerHTML = `<h3 class="text-xl font-bold text-[#003366]">Nichts gefunden</h3>`;
        document.getElementById('posts-container').appendChild(msg);
    }
}

/**
 * 3. MODAL (INHALT)
 */
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    modal.classList.remove('hidden');
    body.innerHTML = 'Laden...';

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1] || [];
            const idTag = tags.find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            body.innerHTML = `<div class="w-full bg-white rounded-2xl overflow-hidden" style="height: 65vh;"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" class="w-full h-full border-0" allowfullscreen></iframe></div>`;
        } else {
            body.innerHTML = `<h2 class="text-2xl font-bold mb-4">${post.title.rendered}</h2><div class="prose">${post.content.rendered}</div>`;
        }
    } catch (e) { body.innerHTML = "Fehler."; }
}

/**
 * 4. CHAT-BOT LOGIK (FIXED)
 */
function initChat() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const msgArea = document.getElementById('chat-messages');

    if (chatToggle && chatWindow) {
        chatToggle.addEventListener('click', () => {
            chatWindow.classList.toggle('hidden');
        });
    }

    if (closeChat) {
        closeChat.addEventListener('click', () => {
            chatWindow.classList.add('hidden');
        });
    }

    // Wortvorschläge
    document.querySelectorAll('.chat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chatInput.value = chip.innerText;
        });
    });

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            if (!chatInput.value) return;
            const msg = document.createElement('div');
            msg.className = "bg-[#00aaff] text-white p-2 rounded-xl ml-auto max-w-[80%] text-xs";
            msg.innerText = chatInput.value;
            msgArea.appendChild(msg);
            chatInput.value = "";
            msgArea.scrollTop = msgArea.scrollHeight;
        });
    }
}

// ALLES STARTEN
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    initChat();
    
    // Suche binden
    document.getElementById('searchInput')?.addEventListener('input', performSearch);
    document.getElementById('searchButton')?.addEventListener('click', performSearch);
    
    // Modal schließen
    document.getElementById('closeModal')?.addEventListener('click', () => {
        document.getElementById('contentModal').classList.add('hidden');
        document.getElementById('modalTextContent').innerHTML = "";
    });
});
