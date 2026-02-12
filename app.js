/**
 * BILDUNGdigital Portal - Kernlogik mit ECHTER Gemini KI
 * Stand: 12. Februar 2026
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = 'AIzaSyB3ahktzahiHeKvd7r_ZgOm18EgU2HHyR8'; 
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let allPosts = [];
let currentH5PId = null;

// 1. Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    // Live-Suche
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        displayPosts(allPosts.filter(p => 
            p.title.rendered.toLowerCase().includes(term) || 
            p.content.rendered.toLowerCase().includes(term)
        ));
    });

    addQuickButtons();

    // Enter-Taste im Chat unterstützen
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.sendChatMessage();
    });
});

// 2. Daten laden (WP-API)
async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) {
        document.getElementById('posts-container').innerHTML = "Fehler beim Laden.";
    }
}

// 3. Kacheln anzeigen
function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius:15px; overflow:hidden;">
                    <img src="${media}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold">${post.title.rendered}</h5>
                        <div class="mt-auto pt-3 d-flex gap-2">
                            <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary px-3 rounded-pill">Details</button>
                            ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success px-3 rounded-pill">🚀 H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// 4. Inhalts-Modal & H5P
window.openContent = async function(postId, directH5P = false) {
    const modal = new bootstrap.Modal(document.getElementById('contentModal'));
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    body.innerHTML = 'Wird geladen...';
    footer.innerHTML = "";
    currentH5PId = null; 
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        title.innerText = post.title.rendered;
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
            body.innerHTML = post.content.rendered;
            if (currentH5PId) {
                footer.innerHTML = `<button onclick="window.launchH5P()" class="btn btn-success w-100 py-3 fw-bold">🚀 Übung öffnen</button>`;
            }
        }
    } catch (e) { body.innerHTML = "Fehler."; }
};

window.launchH5P = function() {
    if (!currentH5PId) return;
    document.getElementById('modalTextContent').innerHTML = `
        <div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${currentH5PId}" allowfullscreen style="border:none;"></iframe></div>`;
    document.getElementById('modalFooter').innerHTML = `<button class="btn btn-outline-secondary w-100" onclick="location.reload()">← Zurück</button>`;
};

// --- 5. KI-ASSISTENT LOGIK MIT GEMINI API ---

window.toggleChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    chatWindow.style.display = (chatWindow.style.display === 'none' || chatWindow.style.display === '') ? 'flex' : 'none';
}

function addQuickButtons() {
    const messageContainer = document.getElementById('chat-messages');
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = "display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;";
    const suggestions = ["Was ist H5P?", "KI im Unterricht", "Hilfe zur Seite"];
    suggestions.forEach(text => {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.style.cssText = "border: 1px solid #003366; background: white; color: #003366; border-radius: 15px; padding: 4px 12px; font-size: 0.8rem; cursor: pointer;";
        btn.onclick = () => { document.getElementById('chatInput').value = text; window.sendChatMessage(); };
        btnContainer.appendChild(btn);
    });
    messageContainer.appendChild(btnContainer);
}

// Nachricht an Gemini senden
window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    const container = document.getElementById('chat-messages');
    const userText = input.value.trim();
    
    if (!userText) return;

    // User-Blase
    appendMessage("user", userText);
    input.value = "";

    // Lade-Anzeige ("KI denkt nach...")
    const loadingDiv = appendMessage("ai", "...");
    
    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Du bist ein hilfreicher Assistent für das Bildungsportal BILDUNGdigital. Deine Antworten sind kurz, präzise und freundlich. Nutzerfrage: ${userText}` }]
                }]
            })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        loadingDiv.innerText = aiText; // Ersetze "..." durch echte Antwort
    } catch (error) {
        loadingDiv.innerText = "Huch, mein Gehirn hat gerade einen Schluckauf. Prüfe bitte deinen API-Key!";
        console.error("Gemini Error:", error);
    }
    container.scrollTop = container.scrollHeight;
}

function appendMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    const isUser = role === "user";
    
    msg.style.cssText = isUser 
        ? "background: #003366; color: white; padding: 10px 15px; border-radius: 15px; border-bottom-right-radius: 2px; align-self: flex-end; max-width: 85%; font-size: 0.9rem; margin-left: auto; margin-top: 5px;"
        : "background: white; padding: 10px 15px; border-radius: 15px; border-bottom-left-radius: 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); max-width: 85%; font-size: 0.9rem; margin-top: 5px;";
    
    msg.innerText = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
}


