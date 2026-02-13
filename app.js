const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';

/**
 * Lädt die Beiträge von der WordPress API und erstellt die Kacheln
 */
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div class="col-12 text-center">Keine Inhalte gefunden.</div>';
            return;
        }

        container.innerHTML = posts.map(post => {
            // Beitragsbild abrufen oder Platzhalter nutzen
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url 
                          || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=600';
            
            // Prüfen, ob H5P im Text vorkommt (für den grünen Button)
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            return `
                <div class="post-card-container">
                    <div class="card">
                        <div class="img-box">
                            <img src="${media}" class="card-img-top" alt="Vorschau">
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${post.title.rendered}</h5>
                            <div class="mt-auto d-flex gap-2">
                                <button onclick="window.openContent(${post.id}, false)" class="btn btn-outline-primary btn-pill flex-fill">Details</button>
                                ${hasH5P ? `<button onclick="window.openContent(${post.id}, true)" class="btn btn-success btn-pill flex-fill text-white">🚀 Start</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (e) {
        console.error("Fehler beim Laden:", e);
        container.innerHTML = "<div class='col-12 text-center'>Fehler beim Laden der API-Daten.</div>";
    }
}

/**
 * Öffnet das Modal und lädt entweder Details oder direkt das H5P-Iframe
 * @param {number} postId - Die ID des WordPress-Beitrags
 * @param {boolean} directH5P - Wenn true, wird sofort das Iframe geladen
 */
window.openContent = async function(postId, directH5P) {
    const modalEl = document.getElementById('contentModal');
    if (!modalEl) return;

    // Bootstrap Modal Instanz initialisieren
    const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById('modalTextContent');
    const footer = document.getElementById('modalFooter');
    
    // UI zurücksetzen und Ladeanzeige zeigen
    body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Lernelement wird vorbereitet...</p></div>';
    footer.innerHTML = "";
    bModal.show();

    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        // H5P-ID aus den Tags extrahieren (Tag-Name muss eine Zahl sein)
        let h5pId = null;
        if (post._embedded?.['wp:term']) {
            const tags = post._embedded['wp:term'][1] || [];
            const idTag = tags.find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            // MODUS: H5P Vollbild Iframe
            body.innerHTML = `
                <div class="ratio ratio-16x9">
                    <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                            allowfullscreen style="border:0; width:100%; height:100%;"></iframe>
                </div>`;
        } else {
            // MODUS: Textuelle Details
            body.innerHTML =
