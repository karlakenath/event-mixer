// Variável global para o player do YouTube
let player;

// Esta função é chamada automaticamente pela API do YouTube quando o script carrega
function onYouTubeIframeAPIReady() {
    console.log("API do YouTube pronta.");
    // ID de uma playlist padrão para iniciar
    const initialPlaylist = 'PL8A83124F1D092353';
    
    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        playerVars: {
            // 'listType' é essencial para carregar playlists
            listType: 'playlist',
            list: initialPlaylist,
            autoplay: 1,
            controls: 0 // Esconde os controles padrão
        },
        events: {
            'onReady': onPlayerReady,
            'onError': onPlayerError
        }
    });
}

// Função chamada quando o player está pronto
function onPlayerReady(event) {
    console.log("Player pronto e tocando.");
    // Você pode silenciar o player no início se quiser
    // event.target.mute();
}

// Função para lidar com erros do player
function onPlayerError(event) {
    console.error("Ocorreu um erro no player do YouTube:", event.data);
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = `Erro no Player: ${event.data}. Verifique o ID da playlist e a conexão.`;
    errorMessage.classList.remove('hidden');
}


document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    // Player
    const playlistInput = document.getElementById('playlist-input');
    const loadPlaylistBtn = document.getElementById('load-playlist-btn');
    const errorMessage = document.getElementById('error-message');
    const playBtn = document.getElementById('play-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');

    // Vinhetas
    const vignetteUpload = document.getElementById('vignette-upload');
    const vignetteList = document.getElementById('vignette-list');
    const vignettes = []; // Array para armazenar objetos de vinheta { name, url, audio }

    // --- LÓGICA DO PLAYER DE PLAYLIST ---

    loadPlaylistBtn.addEventListener('click', loadPlaylistFromInput);
    
    playBtn.addEventListener('click', () => player && player.playVideo());
    pauseBtn.addEventListener('click', () => player && player.pauseVideo());
    nextBtn.addEventListener('click', () => player && player.nextVideo());
    prevBtn.addEventListener('click', () => player && player.previousVideo());

    function loadPlaylistFromInput() {
        const url = playlistInput.value.trim();
        console.log(`[ETAPA 1/3] Tentando carregar a URL: "${url}"`);

        if (!url) {
            showError("Por favor, insira a URL da playlist.");
            return;
        }

        const playlistId = extractPlaylistIdFromUrl(url);

        if (playlistId) {
            console.log("[ETAPA 2/3] ID da playlist extraído:", playlistId);
            hideError();
            // Usa a função da API para carregar a nova playlist
            player.loadPlaylist({
                list: playlistId,
                listType: 'playlist'
            });
            console.log("[ETAPA 3/3] Comando para carregar a playlist enviado.");
        } else {
            showError("URL inválida. Use uma URL de playlist do YouTube (deve conter 'list=').");
        }
    }

    function extractPlaylistIdFromUrl(url) {
        const regex = /[?&]list=([^&]+)/;
        const match = url.match(regex);
        return (match && match[1]) ? match[1] : null;
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        console.error("Erro:", message);
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // --- LÓGICA DAS VINHETAS (COM NOVOS CONTROLES) ---

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
            const audio = new Audio(fileURL); // Cria o objeto de áudio aqui

            vignettes.push({ name: file.name, url: fileURL, audio: audio });
        }
        renderVignetteList();
        event.target.value = '';
    }

    function renderVignetteList() {
        vignetteList.innerHTML = '';
        vignettes.forEach(vignette => {
            const item = document.createElement('div');
            item.className = 'vignette-item';

            const nameSpan = document.createElement('div');
            nameSpan.className = 'name';
            nameSpan.textContent = vignette.name;
            nameSpan.title = vignette.name;

            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'vignette-controls';

            // Botão Play
            const playButton = document.createElement('button');
            playButton.className = 'vignette-play-btn';
            playButton.textContent = 'Play';
            playButton.addEventListener('click', () => vignette.audio.play());

            // Botão Pause
            const pauseButton = document.createElement('button');
            pauseButton.className = 'vignette-pause-btn';
            pauseButton.textContent = 'Pause';
            pauseButton.addEventListener('click', () => vignette.audio.pause());

            // Botão Stop
            const stopButton = document.createElement('button');
            stopButton.className = 'vignette-stop-btn';
            stopButton.textContent = 'Stop';
            stopButton.addEventListener('click', () => {
                vignette.audio.pause();
                vignette.audio.currentTime = 0; // Volta para o início
            });

            controlsDiv.appendChild(playButton);
            controlsDiv.appendChild(pauseButton);
            controlsDiv.appendChild(stopButton);
            
            item.appendChild(nameSpan);
            item.appendChild(controlsDiv);
            vignetteList.appendChild(item);
        });
    }
});