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
     * Pega o valor do input, extrai o ID da playlist e atualiza o player.
     */
    function loadPlaylistFromInput() {
        const inputValue = playlistInput.value.trim();
        if (!inputValue) {
            alert("Por favor, insira a URL ou ID da playlist.");
            return;
        }

        const playlistId = extractPlaylistId(inputValue);

        if (playlistId) {
            updatePlayer(playlistId);
        } else {
            alert("Não foi possível encontrar um ID de playlist válido. Verifique o valor inserido.");
        }
    }

    /**
     * Extrai o ID da playlist de uma URL do YouTube ou assume que o input já é o ID.
     * @param {string} input - A URL completa ou o ID da playlist.
     * @returns {string|null} O ID da playlist ou null se não for encontrado.
     */
    function extractPlaylistId(input) {
        // Expressão regular para encontrar o parâmetro 'list' em URLs do YouTube
        const regex = /[?&]list=([^&]+)/;
        const match = input.match(regex);

        if (match && match[1]) {
            // Se encontrou o ID na URL, retorna a captura
            return match[1];
        }
        
        // Se não encontrou na URL, assume que o próprio input é o ID.
        // Uma verificação simples é se começa com 'PL', que é padrão para playlists.
        if (input.startsWith('PL')) {
            return input;
        }

        return null; // Retorna null se não conseguir extrair
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