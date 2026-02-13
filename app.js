/**
 * BILDUNGdigital - VOLLVERSION (STABIL)
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = 'DEIN_KEY_HIER'; // <-- Dein Profi-Key
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let allPosts = [];

// --- 1. KACHELN LADEN ---
async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) {
        console.error("Fehler beim Laden:", e);
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    container.innerHTML = posts.map(post => {
        // Bild-Logik (WordPress Pfad)
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius:15px; overflow:hidden;">
                    <img src="${media}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold">${post.title.rendered}</h5>
                        <div class="mt-auto pt-3">
                            <button onclick="window.openContent(${post.id})" class="btn btn-sm btn-primary px-3 rounded-pill">Ansehen</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- 2. MODAL FUNKTION ---
window.openContent = async function(postId) {
    const modal = new bootstrap.Modal(document.getElementById('contentModal'));
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');

    body.innerHTML = 'Lädt...';
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}`);
        const post = await res.json();
        title.innerText = post.title.rendered;
        body.innerHTML = post.content.rendered;
    } catch (e) {
        body.innerHTML = "Fehler beim Laden des Inhalts.";
    }
};

// --- 3. CHAT FUNKTIONEN ---
window.toggleChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    if (chatWindow) {
        chatWindow.style.display = (chatWindow.style.display === 'none' || chatWindow.style.display === '') ? 'flex' : 'none';
    }
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    const container = document.getElementById('chat-messages');
    if (!input || !input.value.trim()) return;

    const userText = input.value;
    input.value = "";

    // User Nachricht
    const uMsg = document.createElement('div');
    uMsg.style.cssText = "background:#003366; color:white; padding:10px; border-radius:10px; margin:5px 0 5px auto; max-width:80%; font-size:0.9rem;";
    uMsg.innerText = userText;
    container.appendChild(uMsg);

    // KI Nachricht Platzhalter
    const aiMsg = document.createElement('div');
    aiMsg.style.cssText = "background:#eee; color:black; padding:10px; border-radius:10px; margin:5px auto 5px 0; max-width:80%; font-size:0.9rem;";
    aiMsg.innerText = "...";
    container.appendChild(aiMsg);
    container.scrollTop = container.scrollHeight;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: userText }] }] })
        });
        const data = await response.json();
        
        if (data.error) {
            aiMsg.innerText = "Fehler: " + data.error.message;
        } else {
            aiMsg.innerText = data.candidates[0].content.parts[0].text;
        }
    } catch (e) {
        aiMsg.innerText = "Verbindung unterbrochen.";
    }
    container.scrollTop = container.scrollHeight;
};

// --- 4. START ---
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();

    // Suche
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        displayPosts(allPosts.filter(p => p.title.rendered.toLowerCase().includes(term)));
    });

    // Enter im Chat
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.sendChatMessage();
    });
});
