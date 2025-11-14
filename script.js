document.addEventListener('DOMContentLoaded', () => {
    // Elementos das Vinhetas
    const vignetteUpload = document.getElementById('vignette-upload');
    const vignetteList = document.getElementById('vignette-list');
    const vignettes = []; // Array para armazenar as vinhetas

    // Elementos do Player de Playlist
    const playlistInput = document.getElementById('playlist-input');
    const loadPlaylistBtn = document.getElementById('load-playlist-btn');
    const youtubePlayer = document.getElementById('youtube-player');

    // --- LÓGICA DO PLAYER DE PLAYLIST ---

    loadPlaylistBtn.addEventListener('click', loadPlaylistFromInput);

    /**
     * Pega a URL do input, valida, extrai o ID da playlist e atualiza o player.
     */
    function loadPlaylistFromInput() {
        const url = playlistInput.value.trim();
        if (!url) {
            alert("Por favor, insira a URL da playlist.");
            return;
        }

        const playlistId = extractPlaylistIdFromUrl(url);

        if (playlistId) {
            updatePlayer(playlistId);
        } else {
            alert("URL inválida. Por favor, cole uma URL de playlist do YouTube ou YouTube Music válida (deve conter o parâmetro 'list=').");
        }
    }

    /**
     * Valida a URL e extrai o ID da playlist.
     * @param {string} url - A URL completa da playlist.
     * @returns {string|null} O ID da playlist ou null se a URL for inválida.
     */
    function extractPlaylistIdFromUrl(url) {
        // 1. Valida se é uma URL do YouTube ou YouTube Music
        const isYoutubeUrl = /^(https?:\/\/)?(www\.)?(music\.)?youtube\.com\//.test(url);
        if (!isYoutubeUrl) {
            return null;
        }

        // 2. Extrai o parâmetro 'list' da URL
        try {
            const urlObj = new URL(url);
            const playlistId = urlObj.searchParams.get('list');
            return playlistId; // Retorna o ID ou null se o parâmetro 'list' não existir
        } catch (error) {
            // Se a URL for malformada (ex: 'youtube.com/sem-protocolo')
            console.error("Erro ao parsear a URL:", error);
            return null;
        }
    }

    /**
     * Atualiza o atributo 'src' do iframe do player com o novo ID da playlist.
     * @param {string} playlistId - O ID da playlist a ser carregada.
     */
    function updatePlayer(playlistId) {
        console.log(`Carregando playlist: ${playlistId}`);
        const newSrc = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&controls=0&loop=1`;
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
        console.log(`Tocando vinheta: ${url}`);
        const audio = new Audio(url);
        audio.volume = 1.0;
        audio.play().catch(error => console.error("Erro ao tocar a vinheta:", error));
    }
});
