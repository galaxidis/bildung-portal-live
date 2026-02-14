/**
 * HUB BILDUNG DIGITAL - MASTER APP SCRIPT
 * Integration: WordPress REST API, H5P Embed & Groq AI Chat
 */

const API_URL = 'https://hub.bildungdigital.at/wp-json/wp/v2/posts?categories=3&per_page=100&_embed';
const AI_API_KEY = "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"; 
const AI_MODEL = "llama-3.3-70b-versatile"; // Aktuelles Groq Modell

// 1. MODAL-STEUERUNG
function closeModal() {
    const modal = document.getElementById('contentModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('modalTextContent').innerHTML = ""; 
    }
}

// 2. KACHELN LADEN & H5P-LOGIK
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    try {
        const res = await fetch(API_URL);
        const posts = await res.json();
        container.innerHTML = ""; 
        
        posts.forEach((post) => {
            const media = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || `https://picsum.photos/seed/${post.id}/600/400`;
            const hasH5P = post.content.rendered.toLowerCase().includes('h5p');
            
            const col = document.createElement('div');
            col.className = 'w-full'; 
            col.innerHTML = `
                <div class="hover-card bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col h-full">
                    <div class="h-44 overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img src="${media}" class="w-full h-full object-cover" alt="${post.title.rendered}">
                    </div>
                    <div class="p-5 flex flex-col flex-grow">
                        <h5 class="text-lg font-bold text-[#003366] mb-4 leading-tight">${post.title.rendered}</h5>
                        <div class="flex gap-2 mt-auto">
                            <button class="js-details flex-1 py-2 rounded-full border-2 border-[#003366] text-[#003366] font-bold hover:bg-[#003366] hover:text-white transition-all text-sm">Details</button>
                            ${hasH5P ? `<button class="js-start flex-1 py-2 rounded-full bg-[#22c55e] text-white font-bold hover:bg-[#16a34a] shadow-sm transition-all text-sm">🚀 Start</button>` : ''}
                        </div>
                    </div>
                </div>`;
            
            col.querySelector('.js-details').onclick = () => openContent(post.id, false);
            if (hasH5P) col.querySelector('.js-start').onclick = () => openContent(post.id, true);
            container.appendChild(col);
        });
    } catch (e) {
        console.error("WordPress API Error:", e);
    }
}

// 3. INHALT IM MODAL ANZEIGEN
async function openContent(postId, directH5P) {
    const modal = document.getElementById('contentModal');
    const body = document.getElementById('modalTextContent');
    if (!modal || !body) return;
    
    modal.classList.remove('hidden');
    body.innerHTML = '<div class="p-10 text-center italic">Lade Lerninhalt...</div>';
    
    try {
        const res = await fetch(`https://hub.bildungdigital.at/wp-json/wp/v2/posts/${postId}?_embed`);
        const post = await res.json();
        
        let h5pId = null;
        if (post._embedded?.['wp:term']?.[1]) {
            const idTag = post._embedded['wp:term'][1].find(t => !isNaN(t.name.trim()));
            if (idTag) h5pId = idTag.name.trim();
        }

        if (directH5P && h5pId) {
            // H5P Direkt-Iframe
            body.innerHTML = `
                <div class="w-full h-[75vh]">
                    <iframe src="https://hub.bildungdigital.at/wp-admin/admin-ajax.php?action=h5p_embed&id=${h5pId}" 
                            class="w-full h-full border-0" 
                            allowfullscreen></iframe>
                </div>`;
        } else {
            // Normaler Post Content
            body.innerHTML = `
                <h2 class="text-2xl font-bold mb-4 text-[#003366]">${post.title.rendered}</h2>
                <div class="prose max-w-none text-slate-700 font-sans">
                    ${post.content.rendered}
                </div>`;
        }
    } catch (e) {
        body.innerHTML = `<div class="p-10 text-red-500">Inhalt konnte nicht geladen werden.</div>`;
    }
}

// 4. KI CHAT-BOT (Groq Engine)
function initChat() {
    const win = document.getElementById('chat-window');
    const input = document.getElementById('chat-input');
    const msgs = document.getElementById('chat-messages');

    // Chat UI Toggle
    document.getElementById('chat-toggle').onclick = () => win.classList.toggle('hidden');
    document.getElementById('close-chat').onclick = () => win.classList.add('hidden');

    // Kern-Funktion für API-Anfrage
    async function askAI(question) {
        if (!question || !question.trim()) return;
        
        // Nutzer-Nachricht anzeigen
        const userMsg = document.createElement('div');
        userMsg.className = "bg-slate-100 p-2 rounded-lg mb-2 text-xs text-slate-600 self-end ml-auto max-w-[80%]";
        userMsg.innerText = question;
        msgs.appendChild(userMsg);

        // KI-Lade-Platzhalter
        const aiMsg = document.createElement('div');
        aiMsg.className = "bg-white p-3 rounded-2xl shadow-sm border mb-2 text-xs text-slate-800 max-w-[85%]";
        aiMsg.innerText = "KI schreibt...";
        msgs.appendChild(aiMsg);
        
        input.value = "";
        msgs.scrollTop = msgs.scrollHeight;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + AI_API_KEY.trim()
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        { role: "system", content: "Du bist ein hilfreicher Assistent für digitales Lernen. Antworte präzise und kurz auf Deutsch." },
                        { role: "user", content: question }
                    ],
                    temperature: 0.6
                })
            });

            if (!response.ok) {
                const err = await response.json();
                aiMsg.innerText = "Fehler: " + (err.error?.message || "API-Limit erreicht.");
            } else {
                const data = await response.json();
                aiMsg.innerText = data.choices[0].message.content;
            }
        } catch (err) {
            aiMsg.innerText = "Netzwerkfehler. Bitte Internetverbindung prüfen.";
            console.error("Groq-Error:", err);
        }
        msgs.scrollTop = msgs.scrollHeight;
    }

    // Chips (Vorschläge) Event-Delegation (Damit Klicks immer funktionieren)
    document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('chat-chip')) {
            askAI(e.target.innerText);
        }
    });

    // Senden-Events
    document.getElementById('send-chat').onclick = () => askAI(input.value);
    input.onkeypress = (e) => { if (e.key === 'Enter') askAI(input.value); };
}

// 5. APP INITIALISIERUNG
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    initChat();
    
    // Modal Close Button
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) closeBtn.onclick = closeModal;
});
