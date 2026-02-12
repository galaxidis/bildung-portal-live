// Konfiguration: Dein WordPress Hub
const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

// 1. Initialisierung: Posts beim Laden der Seite holen
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
});

// 2. Funktion: Kacheln vom Hub laden und anzeigen
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const response = await fetch(API_URL);
        const posts = await response.json();
        
        container.innerHTML = posts.map(post => {
            // Vorschaubild extrahieren
            const media = post._embedded && post._embedded['wp:featuredmedia'] 
                          ? post._embedded['wp:featuredmedia'][0].source_url 
                          : 'https://via.placeholder.com/600x400?text=Bild+folgt';
            
            // Prüfen, ob H5P im Text vorkommt (für das grüne Label)
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            return `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 shadow-sm border-0" 
                         onclick="openContent(${post.id})" 
                         style="cursor: pointer; transition: transform 0.2s; border-radius: 15px; overflow: hidden;">
                        
                        <div style="height: 200px; overflow: hidden;">
                            <img src="${media}" class="card-img" style="object-fit: cover; width: 100%; height: 100%;">
                        </div>
                        
                        <div class="card-body">
                            <h5 class="card-title fw-bold" style="color: #2c3e50;">${post.title.rendered}</h5>
                            <div class="card-text text-muted small">
                                ${post.excerpt.rendered.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                            </div>
                        </div>
                        
                        <div class="card-footer bg-white border-0 pb-3 mt-auto">
                            <span class="badge rounded-pill bg-primary px-3">Inhalt öffnen</span>
                            ${hasH5P ? '<span class="badge rounded-pill bg-success px-3">H5P inkl.</span>' : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error("Fehler:", e);
        container.innerHTML = `<div class="alert alert-danger">Inhalte konnten nicht geladen werden.</div>`;
    }
}

// 3. Funktion: Inhalt im Modal (Portal-Fenster) öffnen
async function openContent(postId) {
    // Bootstrap Modal Elemente greifen
    const modalElement = document.getElementById('contentModal');
    const modal = new bootstrap.Modal(modalElement);
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    // Ladezustand anzeigen
    title.innerText = "Lade...";
    body.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div><p class="mt-2">Inhalt wird vom Hub abgerufen...</p></div>';
    footer.innerHTML = '';
    
    modal.show();

    try {
        // Einzelnen Post laden
        const response = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await response.json();

        // Inhalt setzen
        title.innerText = post.title.rendered;
        // Wir packen den WP-Inhalt in ein div mit eigener Klasse für späteres Styling
        body.innerHTML = `<div class="wp-content-rendered">${post.content.rendered}</div>`;

        // Prüfen, ob H5P vorhanden ist, dann Button im Footer einfügen
        if (post.content.rendered.toLowerCase().includes('h5p')) {
            footer.innerHTML = `
                <button class="btn btn-success w-100 fw-bold py-2" onclick="launchH5P('${postId}')">
                    🚀 Interaktive Übung (H5P) starten
                </button>`;
        }
    } catch (e) {
        body.innerHTML = "Fehler beim Laden des Beitrags.";
    }
}

// 4. Funktion: H5P Player im selben Fenster starten
function launchH5P(postId) {
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    // Footer leeren, da wir jetzt im Vollbild-Modus sind
    footer.innerHTML = '<button class="btn btn-secondary" onclick="location.reload()">Zurück zur Übersicht</button>';
    
    // Iframe laden (Standard WP-H5P Pfad)
    body.innerHTML = `
        <div class="ratio ratio-16x9">
            <iframe src="https://hub.bildungdigital.at/h5p/embed/${postId}" 
                    allowfullscreen 
                    style="border:none;"></iframe>
        </div>`;
}
