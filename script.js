document.addEventListener('DOMContentLoaded', () => {
    // Elementos das Vinhetas
    const vignetteUpload = document.getElementById('vignette-upload');
    const vignetteList = document.getElementById('vignette-list');
    const vignettes = []; // Array para armazenar as vinhetas

    // Elementos do Player de Playlist
    const playlistInput = document.getElementById('playlist-input');
    const loadPlaylistBtn = document.getElementById('load-playlist-btn');
    const youtubePlayer = document.getElementById('youtube-player');

    // --- LÓGICA DO PLAYER DE PLAYLIST (CORRIGIDA) ---

    loadPlaylistBtn.addEventListener('click', loadPlaylistFromInput);

    /**
     * Pega a URL do input, valida, extrai o ID da playlist e atualiza o player.
     */
    function loadPlaylistFromInput() {
        const url = playlistInput.value.trim();
        console.log(`[ETAPA 1/3] Tentando carregar a URL: "${url}"`);

        if (!url) {
            alert("Por favor, insira a URL da playlist.");
            console.error("Erro: O campo de URL está vazio.");
            return;
        }

        const playlistId = extractPlaylistIdFromUrl(url);

        if (playlistId) {
            updatePlayer(playlistId);
        } else {
            alert("URL inválida. Por favor, cole uma URL de playlist do YouTube ou YouTube Music válida (deve conter o parâmetro 'list=').");
            console.error("Erro: Falha ao extrair o ID da playlist da URL fornecida.");
        }
    }

    /**
     * Valida a URL e extrai o ID da playlist usando uma expressão regular robusta.
     * @param {string} url - A URL completa da playlist.
     * @returns {string|null} O ID da playlist ou null se a URL for inválida.
     */
    function extractPlaylistIdFromUrl(url) {
        console.log("[ETAPA 2/3] Extraindo o ID da playlist...");

        // Expressão regular para encontrar o parâmetro 'list=' e capturar seu valor.
        // Funciona mesmo que a URL não tenha protocolo (http/https).
        const regex = /[?&]list=([^&]+)/;
        const match = url.match(regex);

        // Se a regex encontrar uma correspondência, o ID estará no primeiro grupo de captura (índice 1).
        if (match && match[1]) {
            const playlistId = match[1];
            console.log(`ID da playlist encontrado: "${playlistId}"`);
            return playlistId;
        }

        // Retorna null se nenhum ID for encontrado.
        return null;
    }

    /**
     * Atualiza o atributo 'src' do iframe do player com o novo ID da playlist.
     * @param {string} playlistId - O ID da playlist a ser carregada.
     */
    function updatePlayer(playlistId) {
        console.log(`[ETAPA 3/3] Atualizando o player com o ID: "${playlistId}"`);
        const newSrc = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&controls=0&loop=1`;
        
        console.log(`Nova URL do iframe: "${newSrc}"`);
        youtubePlayer.src = newSrc;
    }


    // --- LÓGICA DAS VINHETAS (sem alterações) ---

    vignetteUpload.addEventListener('change', handleFileUpload);

    function handleFileUpload(event) {
        const files = event.target.files;
        if (!files.length) return;

        for (const file of files) {
            if (vignettes.some(v => v.name === file.name)) {
                console.warn(`A vinheta "${file.name}" já foi carregada.`);
                continue;
            }
            const fileURL = URL.createObjectURL(file);
            vignettes.push({ name: file.name, url: fileURL });
        }
        renderVignetteList();
        event.target.value = '';
    }

    function renderVignetteList() {
        vignetteList.innerHTML = '';
        vignettes.forEach(vignette => {
            const item = document.createElement('div');
            item.className = 'vignette-item';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = vignette.name;
            nameSpan.title = vignette.name;
            const playButton = document.createElement('button');
            playButton.className = 'play-button';
            playButton.textContent = 'TOCAR';
            playButton.addEventListener('click', () => playVignette(vignette.url));
            item.appendChild(nameSpan);
            item.appendChild(playButton);
            vignetteList.appendChild(item);
        });
    }

    function playVignette(url) {
        const audio = new Audio(url);
        audio.volume = 1.0;
        audio.play().catch(error => console.error("Erro ao tocar a vinheta:", error));
    }
});