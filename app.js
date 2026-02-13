/**
 * BILDUNGdigital - VOLLVERSION MIT H5P-LINKS & CHAT
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = 'DEIN_KEY_HIER'; // <-- BITTE HIER DEINEN PROFI-KEY EINSETZEN
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let allPosts = [];
let currentH5PId = null;

// --- 1. KACHELN LADEN & ANZEIGEN ---
async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) {
        console.error("Ladefehler:", e);
        const container = document.getElementById('posts-container');
        if (container) container.innerHTML = "Fehler beim Laden der Inhalte.";
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        
        // Prüfen, ob H5P im Inhalt vorkommt
        const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
        
        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius:15px; overflow:hidden;">
                    <div style="height:180px; overflow:hidden;">
                        <img src="${media}" class="card-img-top" style="height:100%; width:100%; object-fit:cover;">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold" style="color:#003366;">${post.title.rendered}</h5>
                        <div class="mt-auto pt-3 d-flex gap-2">
                            <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary px-3 rounded-pill">Details</button>
                            
                            ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success px-3 rounded-pill">🚀 H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- 2. MODAL ÖFFNEN & H5P LOGIK ---
window.openContent = async function(postId, directH5P = false) {
    const modalEl = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);

    if (body) body.innerHTML = 'Lädt...';
    if (footer) footer.innerHTML = "";
    currentH5PId = null;
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        if (title) title.innerText = post.title.rendered;

        // ID aus den Tags extrahieren
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
