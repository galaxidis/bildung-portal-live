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
function trackAndOpen(url, postId) {
    // Klick im Hintergrund registrieren (silent fetch)
    fetch(`${STATS_BRIDGE}?id=${postId}`, { mode: 'no-cors' })
        .catch(err => console.log("Statistik-Info:", err));

    // Den Beitrag in neuem Tab öffnen (funktioniert jetzt für JEDEN Beitrag)
    window.open(url, '_blank');
}

// Initialisierung
fetchPosts();
