const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

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

        posts.forEach((post, index) => {
            // Stabile Dummy-Bilder von Unsplash
            const imageIds = ['1485856407642-7f9ba0f2085c', '1454165833267-0e1e9c43fbb3', '1519389950473-47ba0277781c', '1501504905953-f841e0ad064c', '1498050108023-c5249f4df085', '1550745165-9bc0b252726f'];
            const imageId = imageIds[index % imageIds.length];
            const fallbackImage = `https://images.unsplash.com/photo-${imageId}?auto=format&fit=crop&q=80&w=600&h=400`;
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || fallbackImage;

            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            const col = document.createElement('div');
            col.className = 'w-full'; 
            
            const card = document.createElement('div');
            card.className = 'hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full cursor-default';
            card.innerHTML = `
                <div class="h-44 overflow-hidden bg-slate-100"><img src="${media}" class="w-full h-full object-cover"></div>
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
    const sInput = document.getElementById('searchInput');
    const term = sInput ? sInput.value.toLowerCase().trim() : "";
    const container = document.getElementById('posts-container');
    const cards = container.querySelectorAll('.hover-card');
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
        msg.innerHTML = `<h3 class="text-xl font-bold text-[#003366]">Nichts gefunden für "${term}"</h3><button onclick="document.getElementById('searchInput').value=''; performSearch();" class="mt-4 text-[#00aaff] font-bold underline cursor-pointer">Alle anzeigen</button>`;
        container.appendChild(msg);
    }
}

/**
 * 3. MODAL (DETAILS / H5P)
 */
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    modal.classList.remove('hidden');
    body.innerHTML = '<div class="text-center py-20">Lädt...</div>';
    footer.innerHTML = "";

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
            body.innerHTML = `<h2 class="text-3xl font-extrabold text-[#003366] mb-6">${post.title.rendered}</h2><div class="prose max-w-none text-lg text-slate-600">${post.content.rendered}</div>`;
            if (h5pId) {
                const btn = document.createElement('button');
                btn.className = "px-10 py-4 bg-[#22c55e] text-white font-bold rounded-full cursor-pointer text-xl shadow-lg";
                btn.innerText = "🚀 Übung jetzt starten";
                btn.onclick = () => openContent(post.id, true);
                footer.appendChild(btn);
            }
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
}

/**
 * 4. CHATBOT INITIALISIERUNG
 */
function initChat() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const chatChips = document.querySelectorAll('.chat-chip');
    const sendBtn = document.getElementById('send-chat');
    const msgArea = document.getElementById('chat-messages');

    if (chatToggle) chatToggle.onclick = () => chatWindow.classList.toggle('hidden');
    if (document.getElementById('close-chat')) document.getElementById('close-chat').onclick = () => chatWindow.classList.add('hidden');

    chatChips.forEach(chip => {
        chip.onclick = () => {
            chatInput.value = "Frage zu: " + chip.innerText;
            chatInput.focus();
        };
    });

    sendBtn.onclick = () => {
        const text = chatInput.value.trim();
        if (!text) return;
        const uMsg = document.createElement('div');
        uMsg.className = "bg-[#00aaff] text-white p-3 rounded-2xl shadow-sm max-w-[85%] ml-auto text-right text-xs";
        uMsg.innerText = text;
        msgArea.appendChild(uMsg);
        chatInput.value = "";
        msgArea.scrollTop = msgArea.scrollHeight;
        
        setTimeout(() => {
            const bMsg = document.createElement('div');
            bMsg.className = "bg-white p-3 rounded-2xl shadow-sm border border-slate-100 max-w-[85%] text-xs";
            bMsg.innerText = "Sobald mein API-Key bereit ist, beantworte ich dir das!";
            msgArea.appendChild(bMsg);
            msgArea.scrollTop = msgArea.scrollHeight;
        }, 1000);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    initChat();
    if (document.getElementById('searchInput')) document.getElementById('searchInput').oninput = performSearch;
    if (document.getElementById('searchButton')) document.getElementById('searchButton').onclick = performSearch;
    if (document.getElementById('closeModal')) {
        document.getElementById('closeModal').onclick = () => {
            document.getElementById('contentModal').classList.add('hidden');
            document.getElementById('modalTextContent').innerHTML = "";
        };
    }
});
