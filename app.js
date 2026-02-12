/**
 * BILDUNGdigital Portal - EMERGENCY REPAIR VERSION
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = 'DEIN_KEY_HIER'; // <-- KEY EINTRAGEN

// WICHTIG: v1 statt v1beta
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let allPosts = [];
let currentH5PId = null;

// --- 1. CORE FUNKTIONEN (Müssen laufen!) ---

async function fetchPosts() {
    console.log("Starte Laden der Posts...");
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        console.log("Posts geladen:", allPosts.length);
        displayPosts(allPosts);
    } catch (e) {
        console.error("Fehler beim Laden der WordPress-Daten:", e);
        const container = document.getElementById('posts-container');
        if(container) container.innerHTML = "Fehler beim Laden der Inhalte.";
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;
    
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

// --- 2. MODAL & H5P ---

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
        <div class="ratio ratio-16x9">
            <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${currentH5PId}" allowfullscreen style="border:none;"></iframe>
        </div>`;
    document.getElementById('modalFooter').innerHTML = `<button class="btn btn-outline-secondary w-100" onclick="location.reload()">← Zurück</button>`;
};

// --- 3. KI LOGIK ---

window.toggleChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    if(chatWindow) chatWindow.style.display = (chatWindow.style.display === 'none' || chatWindow.style.display === '') ? 'flex' : 'none';
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    const container = document.getElementById('chat-messages');
    if (!input || !input.value.trim()) return;

    const userText = input.value;
    appendMessage("user", userText);
    input.value = "";
    
    const loadingDiv = appendMessage("ai", "...");

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userText }] }]
            })
        });

        const data = await response.json();
        if (data.error) {
            loadingDiv.innerText = "Fehler: " + data.error.message;
        } else {
            loadingDiv.innerText = data.candidates[0].content.parts[0].text;
        }
    } catch (error) {
        loadingDiv.innerText = "Keine Verbindung zur KI möglich.";
    }
    container.scrollTop = container.scrollHeight;
};

function appendMessage(role, text) {
    const container = document.getElementById('chat-messages');
    if(!container) return;
    const msg = document.createElement('div');
    msg.style.cssText = role === "user" 
        ? "background: #003366; color: white; padding: 10px 15px; border-radius: 15px; margin-left: auto; margin-top: 5px; max-width: 85%;"
        : "background: #f1f1f1; color: black; padding: 10px 15px; border-radius: 1
