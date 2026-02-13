/**
 * BILDUNGdigital - UNKAPUTTBAR VERSION
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = 'DEIN_KEY_HIER'; // <-- DEIN KEY REIN
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let allPosts = [];
let currentH5PId = null;

// --- 1. SICHERER START ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("System startet...");
    fetchPosts();

    // Suche sicher einbinden
    const sInput = document.getElementById('searchInput');
    if (sInput) {
        sInput.addEventListener('input', (e) => {
            const t = e.target.value.toLowerCase();
            displayPosts(allPosts.filter(p => p.title.rendered.toLowerCase().includes(t)));
        });
    }
});

// --- 2. KACHELN LADEN (KERNFUNKTION) ---
async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Server antwortet nicht");
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) {
        console.error("WP-Fehler:", e);
        const container = document.getElementById('posts-container');
        if (container) container.innerHTML = "Fehler beim Laden der WordPress-Daten.";
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        const contentStr = (post.content.rendered + post.title.rendered).toLowerCase();
        const hasH5P = contentStr.includes('h5p');

        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius:15px; overflow:hidden;">
                    <img src="${media}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold" style="color:#003366;">${post.title.rendered}</h5>
                        <div class="mt-auto d-flex gap-2">
                            <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary px-3 rounded-pill flex-fill">Details</button>
                            ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success px-3 rounded-pill flex-fill">🚀 H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- 3. MODAL & H5P ---
window.openContent = async function(postId, directH5P = false) {
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');
    
    // Prüfen ob Modal-Elemente existieren, sonst nutzen wir Ersatz
    if (body) body.innerHTML = 'Lädt...';
    if (footer) footer.innerHTML = '';
    
    // Modal anzeigen (Sichere Variante)
    const modalEl = document.getElementById('contentModal');
    if (modalEl) {
        const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bModal.show();
    }

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        if (title) title.innerText = post.title.rendered;

        // H5P ID suchen
        currentH5PId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1];
            const idTag = tags?.find(t => !isNaN(t.name));
            if (idTag) currentH5PId = idTag.name;
        }

        if (directH5P && currentH5PId) {
            window.launchH5P();
        } else {
            if (body) body.innerHTML = post.content.rendered;
            if (currentH5PId && footer) {
                footer.innerHTML = `<button onclick="window.launchH5P()" class="btn btn-success w-100 py-2 fw-bold">🚀 Übung jetzt öffnen</button>`;
            }
        }
    } catch (e) { console.error(e); }
};

window.launchH5P = function() {
    const body = document.getElementById('modalTextContent');
    if (!currentH5PId || !body) return;
    body.innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${currentH5PId}" allowfullscreen style="border:none;"></iframe></div>`;
};

// --- 4. KI-CHAT ---
window.toggleChat = function() {
    const c = document.getElementById('ai-chat-window');
    if (c) c.style.display = (c.style.display === 'none' || c.style.display === '') ? 'flex' : 'none';
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    const container = document.getElementById('chat-messages');
    if (!input || !container || !input.value.trim()) return;

    const val = input.value;
    input.value = "";
    
    const msg = document.createElement('div');
    msg.style.cssText = "background:#003366; color:white; padding:8px; border-radius:10px; margin:5px 0 5px auto; max-width:80%;";
    msg.innerText = val;
    container.appendChild(msg);

    try {
        const r = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: val }] }] })
        });
        const d = await r.json();
        const aiMsg = document.createElement('div');
        aiMsg.style.cssText = "background:#eee; padding:8px; border-radius:10px; margin:5px auto 5px 0; max-width:80%;";
        aiMsg.innerText = d.candidates ? d.candidates[0].content.parts[0].text : "Fehler.";
        container.appendChild(aiMsg);
    } catch (e) { console.error(e); }
    container.scrollTop = container.scrollHeight;
};
