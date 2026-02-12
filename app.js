const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let allPosts = [];
let currentH5PId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        displayPosts(allPosts.filter(p => p.title.rendered.toLowerCase().includes(term) || p.content.rendered.toLowerCase().includes(term)));
    });
});

async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) { document.getElementById('posts-container').innerHTML = "Fehler beim Laden."; }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        
        // Prüfen ob H5P im Text oder Titel vorkommt
        const hasH5P = post.content.rendered.toLowerCase().includes('h5p') || post.title.rendered.toLowerCase().includes('h5p');
        
        return `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius:15px; overflow:hidden;">
                    <img src="${media}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold" style="font-size: 1.1rem;">${post.title.rendered}</h5>
                        <div class="mt-auto pt-3 d-flex gap-2">
                            <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary px-3 rounded-pill">Details</button>
                            ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success px-3 rounded-pill">🚀 H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

window.openContent = async function(postId, directH5P = false) {
    const modal = new bootstrap.Modal(document.getElementById('contentModal'));
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    body.innerHTML = 'Inhalt wird geladen...';
    footer.innerHTML = "";
    currentH5PId = null; 
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        title.innerText = post.title.rendered;
        let content = post.content.rendered;

        // --- NEUE SUCHE ---
        // 1. Suche in den TAGS (Schlagwörtern) - Das ist am sichersten!
        if (post._embedded && post._embedded['wp:term']) {
            const tags = post._embedded['wp:term'][1]; // Index 1 sind meistens die Tags
            if (tags) {
                const idTag = tags.find(t => !isNaN(t.name)); // Suche ein Tag, das eine Zahl ist
                if (idTag) currentH5PId = idTag.name;
            }
        }

        // 2. Fallback: Suche im Text (falls kein Tag da ist)
        if (!currentH5PId) {
            const match = content.match(/h5p[ \-]?id=["']?(\d+)["']?/i) || content.match(/h5p\/embed\/(\d+)/i);
            if (match) currentH5PId = match[1];
        }

        if (directH5P && currentH5PId) {
            window.launchH5P();
        } else {
            body.innerHTML = content;
            if (currentH5PId) {
                footer.innerHTML = `<button onclick="window.launchH5P()" class="btn btn-success w-100 py-3 fw-bold">🚀 Interaktive Übung (ID: ${currentH5PId}) öffnen</button>`;
            } else if (directH5P) {
                body.innerHTML = `<div class="alert alert-warning">H5P erkannt, aber keine ID gefunden. Bitte schreibe die H5P-ID (z.B. 1) als Schlagwort in den WordPress-Beitrag!</div>` + content;
            }
        }
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
};

window.launchH5P = function() {
    if (!currentH5PId) return;
    document.getElementById('modalTextContent').innerHTML = `
        <div class="ratio ratio-16x9">
            <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${currentH5PId}" allowfullscreen style="border:none;"></iframe>
        </div>`;
    document.getElementById('modalFooter').innerHTML = `<button class="btn btn-outline-secondary w-100" onclick="location.reload()">← Zurück</button>`;
};
// KI-Chat Fenster öffnen/schließen
window.toggleChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
    } else {
        chatWindow.style.display = 'none';
    }
}

// Nachricht senden (Platzhalter-Funktion)
window.sendChatMessage = function() {
    const input = document.getElementById('chatInput');
    const messageContainer = document.getElementById('chat-messages');
    
    if (input.value.trim() === "") return;

    // Deine Nachricht anzeigen
    const userMsg = document.createElement('div');
    userMsg.style.cssText = "background: #003366; color: white; padding: 12px; border-radius: 15px; border-bottom-right-radius: 2px; align-self: flex-end; max-width: 85%; font-size: 0.9rem; margin-left: auto;";
    userMsg.innerText = input.value;
    messageContainer.appendChild(userMsg);

    const text = input.value;
    input.value = ""; // Feld leeren
    
    // Automatische Antwort (noch ohne echte KI)
    setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.style.cssText = "background: white; padding: 12px; border-radius: 15px; border-bottom-left-radius: 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); max-width: 85%; font-size: 0.9rem;";
        aiMsg.innerText = "Das ist eine gute Frage! Ich lerne gerade noch, wie ich auf '" + text + "' antworten soll. Bald bin ich mit der KI verbunden!";
        messageContainer.appendChild(aiMsg);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 1000);
}
