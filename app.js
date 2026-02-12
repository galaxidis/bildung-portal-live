/**
 * BILDUNGdigital Portal - REPARATUR VERSION
 * Fokus: Stabiles Laden der Inhalte + Profi-KI Anbindung
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const GEMINI_API_KEY = 'DEIN_KEY_HIER'; // <-- BITTE HIER DEINEN PROFI-KEY EINTRAGEN

// Wir nutzen v1 und gemini-1.5-flash (Standard für Profi-Accounts)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let allPosts = [];
let currentH5PId = null;

// 1. Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        displayPosts(allPosts.filter(p => 
            p.title.rendered.toLowerCase().includes(term) || 
            p.content.rendered.toLowerCase().includes(term)
        ));
    });

    addQuickButtons();

    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.sendChatMessage();
    });
});

// 2. Daten laden (WordPress)
async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('WP API nicht erreichbar');
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) {
        console.error("WP-Fehler:", e);
        document.getElementById('posts-container').innerHTML = `<div class="col-12 text-center text-danger">Inhalte konnten nicht geladen werden.</div>`;
    }
}

// 3. Kacheln anzeigen
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

// 4. Modal & H5P
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
    } catch (e) { body.innerHTML = "Fehler beim Laden."; }
};

window.launchH5P = function() {
    if (!currentH5PId) return;
    document.getElementById('modalTextContent').innerHTML = `<div class="ratio ratio-16x9"><iframe src="
