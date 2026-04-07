/**
 * Momentos de Calma - Application Logic
 */

// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ocimmllaqsyvoxxsfiue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaW1tbGxhcXN5dm94eHNmaXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTE5MDMsImV4cCI6MjA4OTY2NzkwM30.MN7CAN3trlxKbTMMI-op2J2WxerYW1D2kZ2teaav6ho';
let supabaseClient;
try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase library is not loaded.");
    }
} catch (e) {
    console.error("Error initializing Supabase:", e);
}

// ==========================================
// ESTADOS DE LA APLICACIÓN
// ==========================================
const appState = {
    tips: [], // All data loaded from DB
    currentTipId: null,
    currentCategory: null
};

// ==========================================
// UTILIDADES (YouTube)
// ==========================================
/**
 * Convierte un enlace de youtube (shorts o youtu.be) a formato embed.
 */
function extractYouTubeId(url) {
    if (!url) return null;
    let videoId = null;

    if (url.includes('youtube.com/shorts/')) {
        videoId = url.split('youtube.com/shorts/')[1].split('?')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1].split('&')[0];
    }

    return videoId;
}

// ==========================================
// GESTIÓN DE VISTAS (SPA Routing)
// ==========================================
const app = {
    getCategoryColor: function(categoryStr) {
        if (!categoryStr) return '';
        const cat = categoryStr.toLowerCase();
        if (cat.includes('paz interior')) return '#E8F4F8'; // match cat-blue
        if (cat.includes('vínculo') || cat.includes('vinculo')) return '#F4EEF8'; // match cat-purple
        if (cat.includes('poder personal')) return '#FFF7EB'; // match cat-yellow
        if (cat.includes('bienestar integral')) return '#ECF5EF'; // match cat-green
        return '';
    },
    
    updateBackgroundColor: function(categoryStr) {
        const color = this.getCategoryColor(categoryStr);
        document.body.style.backgroundColor = color || '';
        document.querySelectorAll('.header-solid').forEach(el => el.style.backgroundColor = color || '');
    },

    navigate: function (viewId, param = null) {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => el.classList.remove('section-active'));
        document.querySelectorAll('.view').forEach(el => el.classList.add('view-hidden'));

        switch (viewId) {
            case 'home':
                this.updateBackgroundColor(null);
                document.getElementById('view-home').classList.remove('view-hidden');
                document.getElementById('view-home').classList.add('section-active');
                this.renderHome();
                break;
            case 'category':
                this.updateBackgroundColor(param);
                document.getElementById('view-category').classList.remove('view-hidden');
                document.getElementById('view-category').classList.add('section-active');
                appState.currentCategory = param;
                this.renderCategoryList(param);
                break;
            case 'search':
                this.updateBackgroundColor(null);
                document.getElementById('view-category').classList.remove('view-hidden');
                document.getElementById('view-category').classList.add('section-active');
                this.renderSearchList(param);
                break;
            case 'detail':
                const tip = appState.tips.find(t => t.id === param);
                this.updateBackgroundColor(tip ? tip.categoria : null);
                document.getElementById('view-detail').classList.remove('view-hidden');
                document.getElementById('view-detail').classList.add('section-active');
                appState.currentTipId = param;
                this.renderDetail(param);
                break;
            case 'about':
                this.updateBackgroundColor(null);
                document.getElementById('view-about').classList.remove('view-hidden');
                document.getElementById('view-about').classList.add('section-active');
                break;
        }

        // Update active nav state
        document.querySelectorAll('nav a.nav-link').forEach(el => el.classList.remove('active'));
        const activeLink = document.querySelector(`nav a.nav-link[data-target="${viewId}"]`);
        if (activeLink) activeLink.classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ==========================================
    // RENDERIZADOS
    // ==========================================
    renderHome: function () {
        if (appState.tips.length === 0) return;

        // 1. Latest Tip (highest Numero Interno or latest created_at)
        const latestTip = [...appState.tips].sort((a, b) => b['Numero Interno'] - a['Numero Interno'])[0] || appState.tips[0];

        const latestTipHTML = `
            <span class="tip-label"><i class="fa-solid fa-leaf"></i> ÚLTIMO CONSEJO</span>
            <h2 class="latest-tip-title">${latestTip.titulo}</h2>
            <p class="latest-tip-summary">${latestTip.resumen}</p>
            <hr class="divider">
            <p class="latest-tip-cta">${latestTip['Frase de Síntesis'] ? '"' + latestTip['Frase de Síntesis'] + '"' : 'Toma tres respiraciones profundas. Este es tu momento para volver a ti.'}</p>
            
            <div class="media-buttons">
                <button class="btn btn-primary" onclick="app.navigate('detail', ${latestTip.id})">
                    Acceder al consejo &rarr;
                </button>
                <div class="btn-row">
                    ${latestTip.video_url ? `<button class="btn btn-secondary" onclick="app.openExternal('${latestTip.video_url}')"><i class="fa-brands fa-youtube"></i> Ver Vídeo &middot; 9:16</button>` : ''}
                    ${latestTip['Relato Asociado'] ? `<button class="btn btn-secondary" onclick="app.openExternal('${latestTip['Relato Asociado']}')"><i class="fa-solid fa-book-open"></i> Leer Relato &middot; 16:9</button>` : ''}
                </div>
            </div>
        `;
        document.getElementById('latest-tip-container').innerHTML = latestTipHTML;

        // Set background if image available (Assuming we fetch heroes differently, setting static color transition here)
        // For now, let's just let CSS handle the soothing gradient background.

        // 2. Feed List (Latest 10)
        const feedList = [...appState.tips].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
        let feedHTML = '';
        feedList.forEach(tip => {
            feedHTML += `
                <div class="feed-item glass-panel" onclick="app.navigate('detail', ${tip.id})">
                    <span class="feed-item-title">${tip.titulo}</span>
                    <span class="feed-item-phrase">"${tip['Frase de Síntesis']}"</span>
                </div>
            `;
        });
        document.getElementById('feed-container').innerHTML = feedHTML;
    },

    renderCategoryList: function (category) {
        document.getElementById('category-title').innerText = category;
        
        const filtered = appState.tips.filter(tip => 
            tip.categoria && tip.categoria.toLowerCase().includes(category.toLowerCase())
        ).sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return (b['Numero Interno'] || 0) - (a['Numero Interno'] || 0);
        });

        let listHTML = '';
        if (filtered.length === 0) {
            listHTML = '<p>No hay consejos en esta categoría aún.</p>';
        } else {
            filtered.forEach(tip => {
                listHTML += `
                    <div class="list-item" onclick="app.navigate('detail', ${tip.id})">
                        <span class="feed-item-title">${tip.titulo}</span>
                        <span class="feed-item-phrase">"${tip['Frase de Síntesis']}"</span>
                        <p class="list-item-summary">${tip.resumen}</p>
                    </div>
                `;
            });
        }
        document.getElementById('category-list-container').innerHTML = listHTML;
    },

    renderSearchList: function (query) {
        document.getElementById('category-title').innerText = `Resultados para "${query}"`;
        
        const q = query.toLowerCase();
        const filtered = appState.tips.filter(tip => 
            (tip.titulo && tip.titulo.toLowerCase().includes(q)) ||
            (tip.resumen && tip.resumen.toLowerCase().includes(q)) ||
            (tip.contenido && tip.contenido.toLowerCase().includes(q)) ||
            (tip['Frase de Síntesis'] && tip['Frase de Síntesis'].toLowerCase().includes(q)) ||
            (tip.categoria && tip.categoria.toLowerCase().includes(q))
        ).sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return (b['Numero Interno'] || 0) - (a['Numero Interno'] || 0);
        });

        let listHTML = '';
        if (filtered.length === 0) {
            listHTML = '<p style="text-align:center; padding:2rem;">No se encontraron resultados para tu búsqueda.</p>';
        } else {
            filtered.forEach(tip => {
                listHTML += `
                    <div class="list-item" onclick="app.navigate('detail', ${tip.id})">
                        <span class="feed-item-title">${tip.titulo}</span>
                        <span class="feed-item-phrase">"${tip['Frase de Síntesis']}"</span>
                        <p class="list-item-summary">${tip.resumen}</p>
                    </div>
                `;
            });
        }
        document.getElementById('category-list-container').innerHTML = listHTML;
    },

    renderDetail: function (tipId) {
        const tip = appState.tips.find(t => t.id === tipId);
        if (!tip) return;

        let videoHTML = '';
        if (tip.video_url) {
            videoHTML += `
            <div class="media-action-bar" onclick="app.openExternal('${tip.video_url}')">
                <div class="media-action-icon" style="color: #ff0000;"><i class="fa-brands fa-youtube"></i></div>
                <div class="media-action-text">
                    <h4>Ver Vídeo Corto</h4>
                    <p>Meditación visual rápida (9:16)</p>
                </div>
                <div class="media-action-arrow"><i class="fa-solid fa-arrow-right"></i></div>
            </div>`;
        }

        if (tip['Relato Asociado']) {
            videoHTML += `
            <div class="media-action-bar" onclick="app.openExternal('${tip['Relato Asociado']}')">
                <div class="media-action-icon" style="color: #4A69A3;"><i class="fa-solid fa-headphones"></i></div>
                <div class="media-action-text">
                    <h4>Escuchar Relato Guiado</h4>
                    <p>Experiencia inmersiva expandida (16:9)</p>
                </div>
                <div class="media-action-arrow"><i class="fa-solid fa-arrow-right"></i></div>
            </div>`;
        }

        const detailHTML = `
            <div class="detail-content">
                <div class="detail-header">
                    <span class="detail-meta">${tip.categoria} · Consejo #${tip['Numero Interno']}</span>
                    <h2 class="detail-title">${tip.titulo}</h2>
                    <p class="feed-item-phrase">"${tip['Frase de Síntesis']}"</p>
                </div>
                
                <div class="detail-body">
                    ${tip.contenido}
                </div>
                
                ${(videoHTML) ? `<div class="media-section">${videoHTML}</div>` : ''}
            </div>
        `;
        document.getElementById('detail-container').innerHTML = detailHTML;
    },

    openExternal: function (url) {
        window.open(url, '_blank');
    },

    // ==========================================
    // DATA FETCHING
    // ==========================================
    fetchDataAndInitialize: async function () {
        try {
            // Real Supabase data fetch
            const { data, error } = await supabaseClient
                .from('tips')
                .select('*');

            if (error) throw error;
            appState.tips = data || [];

            // Setup Search
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const query = e.target.value.trim();
                        if (query.length > 0) {
                            this.navigate('search', query);
                            e.target.value = ''; // clear
                        }
                    }
                });
                
                const searchIcon = document.querySelector('.search-icon');
                if (searchIcon) {
                    searchIcon.style.cursor = 'pointer';
                    searchIcon.addEventListener('click', () => {
                        const query = searchInput.value.trim();
                        if (query.length > 0) {
                            this.navigate('search', query);
                            searchInput.value = '';
                        }
                    });
                }
            }

            // Initial render
            this.renderHome();

        } catch (error) {
            const errorMsg = error.message || error.error_description || JSON.stringify(error) || "Error desconocido";
            document.getElementById('latest-tip-container').innerHTML = `
                <div style="background: rgba(255,255,255,0.9); padding: 20px; border-radius: 15px; border-left: 5px solid #d9534f; color: #333; text-align: left; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 style="color: #d9534f; margin-bottom: 10px; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> Error de Conexión a Supabase</h3>
                    <p style="margin-bottom: 10px; font-size: 0.95rem;"><strong>Detalle técnico:</strong> <code style="color: #d9534f; word-break: break-all;">${errorMsg}</code></p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
                    <p style="font-size: 0.95rem; margin-bottom: 8px;"><strong>¿Cómo solucionarlo?</strong></p>
                    <ul style="font-size: 0.9rem; margin-left: 25px; line-height: 1.6; color: #555;">
                        <li><strong>Tu Clave es incorrecta:</strong> La clave que pegaste empieza por <code>sb_secret_</code> (un token personal). Supabase necesita tu clave pública anónima, que casi siempre empieza por <code>eyJ...</code>. Búscala en tu Dashboard de Supabase en <em>Project Settings &rarr; API &rarr; Project API keys (anon / public)</em>.</li>
                        <li><strong>Políticas RLS Activas:</strong> Si la tabla <code>tips</code> tiene Row Level Security activado, debes ir a Supabase y crear una política que permita a todos (anon) hacer operaciones "SELECT" (Leer) en la tabla.</li>
                    </ul>
                </div>
            `;
            console.error("Fetch Data Error:", error);
        }
    }
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    app.fetchDataAndInitialize();
});
