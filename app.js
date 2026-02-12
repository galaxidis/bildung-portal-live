const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
let allPosts = [];
let currentH5PId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPosts.filter(p => 
            p.title.rendered.toLowerCase().includes(term) || 
            p.content.rendered.toLowerCase().includes(term)
        );
        displayPosts(filtered);
    });
});

async function fetchPosts() {
    try {
        const res = await fetch(API_URL);
        allPosts = await res.json();
        displayPosts(allPosts);
    } catch (e) {
        document.getElementById('posts-container').innerHTML = "Fehler beim Laden.";
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = posts.map(post => {
        const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
        
        // H5P Erkennung für die Buttons
        const contentStr = post.content.rendered.toLowerCase();
        const hasH5P = contentStr.includes('h5p');
        
        return `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm border-0">
                    <img src="${media}" class="card-img-top" style="height:180px; object-fit:cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold">${post.title.rendered}</h5>
                        <div class="mt-auto pt-3 d-flex gap-2">
                            <button onclick="window.openContent(${post.id}, false)" class="btn btn-sm btn-outline-primary px-3 rounded-pill">Ansehen</button>
                            ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-sm btn-success px-3 rounded-pill">🚀 H5P Start</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// Die "Intelligenz-Zentrale"
window.openContent = async function(postId, directH5P = false) {
    const modal = new bootstrap.Modal(document.getElementById('contentModal'));
    const body = document.getElementById('modalTextContent');
    const title = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    body.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div><p>Bereite Inhalt vor...</p></div>';
    footer.innerHTML = "";
    currentH5PId = null; 
    modal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        title.innerText = post.title.rendered;
        let content = post.content.rendered;
        
        // VERBESSERTE H5P-ID SUCHE:
        // Sucht nach [h5p id="5"], h5p-php-5 oder h5p/embed/5
        const match = content.match(/h5p[ \-\/]?id?=["'\/]?(\d+)["'\/]?/i);
        currentH5PId = match ? match[1] : null;

        // ENTSCHEIDUNG: Direkt H5P oder erst Text?
        if (directH5P && currentH5PId) {
            // Wir springen sofort zum Iframe
            window.launchH5P();
        } else {
            // Wir zeigen den Text
            body.innerHTML = content;
            if (currentH5PId) {
                footer.innerHTML = `<button onclick="window.launchH5P()" class="btn btn-success w-100 py-3 fw-bold">🚀 Übung jetzt starten</button>`;
            } else if (directH5P) {
                // Falls H5P Start geklickt wurde, aber keine ID gefunden wurde:
                body.innerHTML = `<div class="alert alert-warning">H5P-Übung wurde erkannt, aber die ID konnte nicht automatisch extrahiert werden. Hier ist der Beitragsinhalt:</div>` + content;
            }
        }
        
        body.querySelectorAll('a').forEach(link => link.target = "_blank");

    } catch (e) {
        body.innerHTML = "Fehler beim Laden des Beitrags.";
    }
};

window.launchH5P = function() {
    if (!currentH5PId) {
        alert("H5P ID wurde nicht gefunden.");
        return;
    }
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    // Iframe laden
    body.innerHTML = `
        <div class="ratio ratio-16x9 shadow-sm" style="border-radius: 12px; overflow: hidden; background: #000;">
            <iframe src="https://hub.bildungdigital.at/h5p/embed/${currentH5PId}" 
                    allowfullscreen 
                    style="border:none;"></iframe>
        </div>`;
    
    footer.innerHTML = `<button class="btn btn-outline-secondary w-100" onclick="window.openContent(${allPosts.find(p => p.content.rendered.includes(currentH5PId))?.id || 0}, false)">← Zurück zur Beschreibung</button>`;
};
