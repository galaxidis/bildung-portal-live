/**
 * BILDUNGdigital - NOTFALL-REPARATUR
 */

// 1. Grundeinstellungen
const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = 'DEIN_KEY_HIER'; // <-- BITTE KEY EINTRAGEN
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let allPosts = [];

// 2. Initialisierung (Der Motor der Seite)
document.addEventListener('DOMContentLoaded', () => {
    console.log("Seite bereit, lade Inhalte...");
    fetchPosts();
    
    // Suche aktivieren
    const sInput = document.getElementById('searchInput');
    if(sInput) {
        sInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allPosts.filter(p => p.title.rendered.toLowerCase().includes(term));
            displayPosts(filtered);
        });
    }
});

// 3. WordPress Inhalte laden
async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (err) {
        console.error("WP-Fehler:", err);
        document.getElementById('posts-container').innerHTML = "Fehler beim Laden der Kacheln.";
    }
}

// 4. Kacheln anzeigen
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600x400';
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius:15px; overflow:hidden;">
                    <img src="${media}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body">
                        <h5 class="card-title fw-bold">${post.title.rendered}</h5>
                        <button onclick="window.openContent(${post.id})" class="btn btn-sm btn-outline-primary rounded-pill">Details</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// 5. Chat-Funktionen
window.toggleChat = function() {
    const chat = document.getElementById('ai-chat-window');
    if (chat) {
        chat.style.display = (chat.style.display === 'none' || chat.style.display === '') ? 'flex' : 'none';
    }
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    const container = document.getElementById('chat-messages');
    if (!input || !input.value.trim()) return;

    const msg = input.value;
    input.value = "";
    
    // User Nachricht anzeigen
    const uDiv = document.createElement('div');
    uDiv.style.cssText = "background:#003366; color:white; padding:8px 12px; border-radius:10px; margin-bottom:5px; align-self:flex-end; max-width:80%; margin-left:auto;";
    uDiv.innerText = msg;
    container.appendChild(uDiv);

    // KI Antwort
    const aiDiv = document.createElement('div');
    aiDiv.style.cssText = "background:#f1f1f1; padding:8px 12px; border-radius:10px; margin-bottom:5px; align-self:flex-start; max-width:80%;";
    aiDiv.innerText = "...";
    container.appendChild(aiDiv);

    try {
        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: msg }] }] })
        });
        const data = await res.json();
        aiDiv.innerText = data.candidates[0].content.parts[0].text;
    } catch (e) {
        aiDiv.innerText = "Fehler bei der KI-Anbindung.";
    }
    container.scrollTop = container.scrollHeight;
};

// Platzhalter für Content-Funktion (damit kein Fehler entsteht)
window.openContent = function(id) { alert("Beitrag ID: " + id); };
