/**
 * BILDUNGdigital - RADIKALER RESET
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

async function fetchPosts() {
    console.log("Versuche Kacheln zu laden...");
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        const container = document.getElementById('posts-container');
        if (!container) {
            console.error("HILFE: 'posts-container' nicht in der HTML gefunden!");
            return;
        }

        container.innerHTML = data.map(post => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/600';
            return `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 shadow-sm border-0" style="border-radius:15px; overflow:hidden;">
                        <img src="${media}" class="card-img-top" style="height:180px; object-fit:cover;">
                        <div class="card-body">
                            <h5 class="card-title fw-bold">${post.title.rendered}</h5>
                        </div>
                    </div>
                </div>`;
        }).join('');
        
        console.log("Kacheln erfolgreich gezeichnet!");
    } catch (error) {
        console.error("Fehler beim Abrufen:", error);
    }
}

// Startet sofort beim Laden
document.addEventListener('DOMContentLoaded', fetchPosts);

// Minimal-Funktion für den Chat-Button, damit die Seite nicht abstürzt
window.toggleChat = function() {
    alert("Kacheln sind da! Chat bauen wir als Nächstes wieder ein.");
};
