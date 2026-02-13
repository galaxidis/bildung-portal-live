/**
 * BILDUNGdigital - VOLLVERSION (REPARIERT)
 * Alle Buttons und Links sind hier enthalten.
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = 'DEIN_KEY_HIER'; // <-- Bitte Key hier einfügen
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let allPosts = [];
let currentH5PId = null;

// 1. Laden der WordPress-Inhalte
async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) {
        console.error("Fehler beim Laden:", e);
    }
}

// 2. Kacheln zeichnen (HIER SIND DIE BUTTONS)
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        
        // KRITISCH: Wir prüfen hier sehr genau auf H5P Inhalte
        const contentString = (post.content.rendered + post.title.rendered).toLowerCase();
        const hasH5P = contentString.includes('h5p');
        
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius:15px; overflow:hidden; display:flex; flex-direction:column;">
                    <div style="height:180px; overflow:hidden;">
                        <img src="${media}" class="card-img-top" style="height:100%; width:100%; object-fit:cover;">
                    </div>
                    <div class="card-body d-flex flex-column" style="flex-grow:1;">
                        <h5 class="card-title fw-bold" style="color:#003366; font-size:1.1rem; margin-bottom:15px;">${post.title.rendered}</h5>
                        <div class="mt-auto d-flex gap-2">
                            <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary px-3 rounded-pill flex-fill">Details</button>
                            
                            ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success px-3 rounded-pill flex-fill">🚀 H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// 3. Modal-Inhalt steuern
window.openContent = async function(postId, directH5P = false) {
    const modalEl = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);

    if (body) body.innerHTML = 'Wird geladen...';
    if (footer) footer.innerHTML = "";
    currentH5PId = null;
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        if (title) title.innerText = post.title.rendered;

        // Wir suchen die H5P-ID in den Tags
        if (post._embedded && post._embedded['wp:term']) {
            const tags = post._embedded['wp:term'][1]; 
            if (tags) {
                const idTag = tags.find(t => !isNaN(t.name)); 
                if (idTag) currentH5PId = idTag.name;
            }
        }

        if (directH5P && currentH5PId) {
            window.launchH5P();
        } else {
            if (body) body.innerHTML = post.content.rendered;
            if (currentH5PId && footer) {
                footer.innerHTML = `<button onclick="window.launchH5P()" class="btn btn-success w-100 py-2 fw-bold">🚀 Übung jetzt öffnen</button>`;
            }
        }
    } catch (e) {
        if (body) body.innerHTML = "Fehler beim Laden.";
    }
};

window.launchH5P = function() {
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    if (!currentH5PId || !body) return;

    body.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${currentH5PId}" allowfullscreen style="border:none;"></iframe></div>`;
    if (footer) footer.innerHTML = `<button class="btn btn-outline-secondary w-100" onclick="location.reload()">← Zurück</button>`;
};

// 4. Chatbot
window.toggleChat = function() {
    const chat = document.getElementById('ai-chat-window');
    if (chat) chat.style.display = (chat.style.display === 'none' || chat.style.display === '') ? 'flex' : 'none';
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    const container = document.getElementById('chat-messages');
    if (!input || !input.value.trim()) return;

    const text = input.value;
    input.value = "";
    
    const uMsg = document.createElement('div');
    uMsg.style.cssText = "background:#003366; color:white; padding:10px; border-radius:10px; margin:5px 0 5px auto; max-width:85%; font-size:0.9rem;";
    uMsg.innerText = text;
    container.appendChild(uMsg);

    const aiMsg = document.createElement('div');
    aiMsg.style.cssText = "background:#f1f1f1; padding:10px; border-radius:10px; margin:5px auto 5px 0; max-width:85%; font-size:0.9rem; border:1px solid #ddd;";
    aiMsg.innerText = "...";
    container.appendChild(aiMsg);

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: text }] }] })
        });
        const data = await response.json();
        aiMsg.innerText = data.candidates ? data.candidates[0].content.parts[0].text : "Fehler: " + data.error.message;
    } catch (e) { aiMsg.innerText = "KI Fehler."; }
    container.scrollTop = container.scrollHeight;
};

// 5. Start
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const t = e.target.value.toLowerCase();
        displayPosts(allPosts.filter(p => p.title.rendered.toLowerCase().includes(t)));
    });
});
