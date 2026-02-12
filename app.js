/**
 * app.js - Portal Konfiguration
 * Fokus: Headless WordPress Anbindung & Klick-Statistik
 */

// 1. Die neue Datenquelle (Hub-Subdomain mit der korrekten Kategorie-ID 3)
const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

// 2. Die Statistik-Brücke (vcounter / bridge.php)
const STATS_BRIDGE = 'https://hub.bildungdigital.at/bridge.php';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    
    // Header-Titel setzen
    const headerTitle = document.querySelector('header h1') || document.querySelector('h1');
    if (headerTitle) {
        headerTitle.innerText = "Lehrer und Digital 2026";
    }

    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const posts = await response.json();

        // Falls die API leer zurückgibt (z.B. keine Beiträge in ID 3)
        if (!posts || posts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <p>Momentan sind keine Beiträge in der Kategorie "Portal" verfügbar.</p>
                    <p><small>(Prüfe in WordPress, ob die Beiträge wirklich ID 3 zugeordnet sind)</small></p>
                </div>`;
            return;
        }

        // Kacheln generieren
        container.innerHTML = posts.map(post => {
            const media = post._embedded && post._embedded['wp:featuredmedia'] 
                          ? post._embedded['wp:featuredmedia'][0].source_url 
                          : 'https://via.placeholder.com/600x400?text=Bild+folgt';
            
            const title = post.title.rendered;
            const excerpt = post.excerpt.rendered.replace(/<[^>]+>/g, '').substring(0, 120);

            return `
                <div class="card" onclick="trackAndOpen('${post.link}', ${post.id})" style="cursor: pointer;">
                    <div class="card-image" style="background-image: url('${media}'); height: 200px; background-size: cover; background-position: center;"></div>
                    <div class="card-content" style="padding: 15px;">
                        <h3 style="margin-top: 0; color: #333;">${title}</h3>
                        <p style="color: #666; font-size: 0.9em;">${excerpt}...</p>
                        <span style="color: #007bff; font-weight: bold;">Inhalt öffnen →</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 50px; color: red;">
                <h3>Verbindung zum Hub fehlgeschlagen</h3>
                <p>Bitte prüfen Sie die Internetverbindung oder ob hub.bildungdigital.at erreichbar ist.</p>
            </div>`;
    }
}

/**
 * Zählt den Klick via bridge.php und öffnet dann den WordPress-Link
 */
async function openContent(postId) {
    const modal = new bootstrap.Modal(document.getElementById('contentModal'));
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    // 1. Modal zeigen & Ladezustand
    title.innerText = "Lade...";
    body.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
    footer.innerHTML = '';
    modal.show();

    try {
        // 2. Den kompletten Beitrag von WordPress holen
        const response = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await response.json();

        // 3. Titel und Text setzen (Dein Design!)
        title.innerText = post.title.rendered;
        body.innerHTML = `<div class="wp-content-style">${post.content.rendered}</div>`;

        // 4. H5P Check: Suchen wir nach einem H5P-Shortcode oder Link im Text
        if (post.content.rendered.includes('h5p')) {
            footer.innerHTML = `
                <button class="btn btn-success w-100 fw-bold" onclick="launchH5P('${postId}')">
                    🚀 Interaktive Übung (H5P) starten
                </button>`;
        }
    } catch (e) {
        body.innerHTML = "Fehler beim Laden des Inhalts.";
    }
}

function launchH5P(postId) {
    // Hier laden wir dann später gezielt den H5P-Embed-Link in das Modal
    const body = document.getElementById('modalTextContent');
    body.innerHTML = `<iframe src="https://hub.bildungdigital.at/h5p/embed/${postId}" 
                      style="width:100%; height:600px; border:none;" 
                      allowfullscreen></iframe>`;
}

// Initialisierung
fetchPosts();

