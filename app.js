// Wir nutzen die Hauptdomain, da hier das SSL-Zertifikat stabil läuft
const API_URL = 'https://bildungdigital.at/wp-json/wp/v2/posts?categories=6&per_page=100&_embed';

async function fetchPosts() {
    const container = document.getElementById('posts-container');
    
    // Setzt den Titel im Header auf dein neues Motto
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
                    <p>Momentan sind keine Beiträge in der Kategorie "6" verfügbar.</p>
                    <p><small>(Prüfe in WordPress, ob Beiträge in dieser Kategorie veröffentlicht sind)</small></p>
                </div>`;
            return;
        }

        container.innerHTML = posts.map(post => {
            // Holt das Vorschaubild (Featured Image) oder nutzt einen Platzhalter
            const media = post._embedded && post._embedded['wp:featuredmedia'] 
                          ? post._embedded['wp:featuredmedia'][0].source_url 
                          : 'https://via.placeholder.com/600x400?text=Bild+folgt';
            
            // Titel und Text bereinigen
            const title = post.title.rendered;
            const excerpt = post.excerpt.rendered.replace(/<[^>]+>/g, '').substring(0, 120);

            return `
                <div class="card" onclick="window.open('${post.link}', '_blank')" style="cursor: pointer;">
                    <div class="card-image" style="background-image: url('${media}'); height: 200px; background-size: cover; background-position: center;"></div>
                    <div class="card-content" style="padding: 15px;">
                        <h3 style="margin-top: 0; color: #333;">${title}</h3>
                        <p style="color: #666; font-size: 0.9em;">${excerpt}...</p>
                        <span style="color: #007bff; font-weight: bold;">Mehr lesen →</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 50px; color: red;">
                <h3>Verbindung zum Server fehlgeschlagen</h3>
                <p>Das Portal konnte keine Daten von bildungdigital.at empfangen.</p>
                <p><small>Fehler: ${error.message}</small></p>
            </div>`;
    }
}

// Startet den Ladevorgang
fetchPosts();
