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

    // --- LÓGICA DAS VINHETAS (COM DUCKING E NOVOS CONTROLES) ---

    let originalVolume = 100; // Volume padrão
    let fadeInterval; // Para controlar o intervalo de fade-in

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
            const audio = new Audio(fileURL);

            // Evento que é acionado quando a vinheta começa a tocar
            audio.addEventListener('play', () => {
                // Se o player do YouTube existir e estiver tocando
                if (player && typeof player.getVolume === 'function') {
                    originalVolume = player.getVolume(); // Salva o volume atual
                    
                    // Para qualquer fade in anterior se uma nova vinheta começar
                    clearInterval(fadeInterval); 
                    
                    // Baixa o volume da música
                    player.setVolume(originalVolume * 0.2); // Reduz para 20% do volume original
                    console.log(`Ducking: Volume da música reduzido para ${originalVolume * 0.2}`);
                }
            });

            // Evento que é acionado quando a vinheta termina
            audio.addEventListener('ended', () => {
                // Se o player do YouTube existir, restaura o volume suavemente
                if (player && typeof player.setVolume === 'function') {
                    smoothlyRestoreVolume();
                }
            });

            vignettes.push({ name: file.name, url: fileURL, audio: audio });
        }
        renderVignetteList();
        event.target.value = '';
    }

    function smoothlyRestoreVolume() {
        let currentVolume = player.getVolume();
        const targetVolume = originalVolume;
        
        // Para o fade in se já estiver rodando
        clearInterval(fadeInterval);

        if (currentVolume >= targetVolume) {
            player.setVolume(targetVolume);
            console.log("Fade-in: Volume da música já estava no valor correto.");
            return;
        }

        console.log("Fade-in: Iniciando restauração suave do volume.");
        
        fadeInterval = setInterval(() => {
            currentVolume += 5; // Aumenta o volume em 5 unidades
            if (currentVolume >= targetVolume) {
                player.setVolume(targetVolume);
                clearInterval(fadeInterval); // Para o intervalo
                console.log(`Fade-in: Volume da música restaurado para ${targetVolume}.`);
            } else {
                player.setVolume(currentVolume);
            }
        }, 80); // A cada 80ms
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
            playButton.addEventListener('click', () => {
                // Garante que apenas uma vinheta toque por vez, se necessário (opcional)
                vignettes.forEach(v => {
                    if (v.audio !== vignette.audio) {
                        v.audio.pause();
                    }
                });
                vignette.audio.play();
            });

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
                vignette.audio.currentTime = 0;
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