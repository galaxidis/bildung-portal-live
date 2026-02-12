/**
 * BILDUNGdigital Portal - Kernlogik mit KI-Assistent
 * Stand: 12. Februar 2026
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
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

    // Chat-Vorschläge beim Start anzeigen
    addQuickButtons();
});

// 2. Daten laden
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

// 4. Inhalts-Modal
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

        // ID Suche über Tags (unser bewährter Weg!)
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

// --- 5. KI-ASSISTENT LOGIK ---

window.toggleChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    chatWindow.style.display = (chatWindow.style.display === 'none' || chatWindow.style.display === '') ? 'flex' : 'none';
}

// Erstellt kleine Klick-Buttons für den Chat-Start
function addQuickButtons() {
    const messageContainer = document.getElementById('chat-messages');
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = "display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;";
    
    const suggestions = ["Was ist H5P?", "Suche Hilfe", "KI im Unterricht"];
    
    suggestions.forEach(text => {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.style.cssText = "border: 1px solid #003366; background: white; color: #003366; border-radius: 15px; padding: 4px 12px; font-size: 0.8rem; cursor: pointer;";
        btn.onclick = () => {
            document.getElementById('chatInput').value = text;
            window.sendChatMessage();
        };
        btnContainer.appendChild(btn);
    });
    
    messageContainer.appendChild(btnContainer);
}

window.sendChatMessage = function() {
    const input = document.getElementById('chatInput');
    const messageContainer = document.getElementById('chat-messages');
    
    if (input.value.trim() === "") return;

    // User Nachricht
    const userMsg = document.createElement('div');
    userMsg.style.cssText = "background: #003366; color: white; padding: 10px 15px; border-radius: 15px; border-bottom-right-radius: 2px; align-self: flex-end; max-width: 85%; font-size: 0.9rem; margin-left: auto; margin-top: 5px;";
    userMsg.innerText = input.value;
    messageContainer.appendChild(userMsg);

    const text = input.value;
    input.value = ""; 

    // Fake KI-Antwort (Platzhalter für echte API)
    setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.style.cssText = "background: white; padding: 10px 15px; border-radius: 15px; border-bottom-left-radius: 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); max-width: 85%; font-size: 0.9rem; margin-top: 5px;";
        aiMsg.innerText = "Interessant! Du fragst nach '" + text + "'. Sobald mein Schöpfer mir eine API-Anbindung gibt, kann ich dir hier richtig schlaue Antworten geben! ✨";
        messageContainer.appendChild(aiMsg);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 800);
}
