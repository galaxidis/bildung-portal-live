const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = 'DEIN_KEY_HIER'; // <-- KEY EINTRAGEN
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let allPosts = [];
let currentH5PId = null;

async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) { console.error(e); }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;
    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600x400';
        const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
        return `
            <div class="col-md-4">
                <div class="card p-0">
                    <img src="${media}" class="card-img-top">
                    <div class="card-body">
                        <h5 class="card-title">${post.title.rendered}</h5>
                        <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary">Details</button>
                        ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success">🚀 H5P Start</button>` : ''}
                    </div>
                </div>
            </div>`;
    }).join('');
}

window.openContent = async function(postId, directH5P) {
    const modal = new bootstrap.Modal(document.getElementById('contentModal'));
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    modal.show();
    
    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        document.getElementById('modalTitle').innerText = post.title.rendered;
        
        currentH5PId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1];
            const idTag = tags?.find(t => !isNaN(t.name));
            if (idTag) currentH5PId = idTag.name;
        }

        if (directH5P && currentH5PId) {
            window.launchH5P();
        } else {
            body.innerHTML = post.content.rendered;
            footer.innerHTML = currentH5PId ? `<button onclick="window.launchH5P()" class="btn btn-success w-100">🚀 Übung öffnen</button>` : '';
        }
    } catch (e) { body.innerHTML = "Fehler."; }
};

window.launchH5P = function() {
    document.getElementById('modalTextContent').innerHTML = `<div class="ratio ratio-16x9"><iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${currentH5PId}" allowfullscreen style="border:none;"></iframe></div>`;
};

window.toggleChat = function() {
    const win = document.getElementById('ai-chat-window');
    win.style.display = (win.style.display === 'none' || win.style.display === '') ? 'flex' : 'none';
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    const msg = input.value;
    if(!msg) return;
    input.value = "";
    const container = document.getElementById('chat-messages');
    container.innerHTML += `<div style="text-align:right; margin-bottom:10px;"><b>Du:</b> ${msg}</div>`;
    
    try {
        const r = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({contents: [{parts: [{text: msg}]}]})
        });
        const d = await r.json();
        const responseText = d.candidates[0].content.parts[0].text;
        container.innerHTML += `<div style="margin-bottom:10px;"><b>KI:</b> ${responseText}</div>`;
    } catch (e) { container.innerHTML += `<div>KI Fehler.</div>`; }
    container.scrollTop = container.scrollHeight;
};

document.addEventListener('DOMContentLoaded', fetchPosts);
