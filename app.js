// 1. Die neue Datenquelle (Hub-Subdomain)
const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=6&per_page=100&_embed';
// 2. Die neue Statistik-Brücke
const STATS_BRIDGE = 'https://hub.bildungdigital.at/bridge.php';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    
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

        if (!posts || posts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <p>Momentan sind keine Beiträge verfügbar.</p>
                </div>`;
            return;
        }

        container.innerHTML = posts.map(post => {
            const media = post._embedded && post._embedded['wp:featuredmedia'] 
                          ? post._embedded['wp:featuredmedia'][0].source_url 
                          : 'https://via.placeholder.com/600x400?text=Bild+folgt';
            
            const title = post.title.rendered;
            const excerpt = post.excerpt.rendered.replace(/<[^>]+>/g, '').substring(0, 120);

            // Hier bauen wir die Logik: Erst Statistik zählen, dann Link öffnen
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
                <p>Das Portal konnte keine Daten von hub.bildungdigital.at empfangen.</p>
            </div>`;
    }
}

/**
 * Zählt den Klick in der bridge.php und öffnet dann den Link
 */
function trackAndOpen(url, postId) {
    // Wir senden den Klick im Hintergrund an die Bridge
    fetch(`${STATS_BRIDGE}?id=${postId}`, { mode: 'no-cors' })
        .catch(err => console.log("Statistik-Fehler (unwichtig):", err));

    // Öffnet den WordPress-Beitrag (egal ob H5P oder Text)
    window.open(url, '_blank');
}

// Startet den Ladevorgang
fetchPosts();
