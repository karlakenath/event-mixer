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
            controls: 1, // Mostra os controles padrão (incluindo a barra de progresso)
            rel: 0 // Desativa a exibição de vídeos relacionados ao final/pausa
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange, // Adicionado para o visualizador
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

    // --- LÓGICA DO VISUALIZADOR DE ÁUDIO ---
    const canvas = document.getElementById('audio-visualizer');
    const canvasCtx = canvas.getContext('2d');
    let animationId;

    function drawVisualizer() {
        // Limpa o canvas a cada frame
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        const barCount = 64; // Número de barras
        const barWidth = canvas.width / barCount;
        const time = Date.now() * 0.002; // Fator de tempo para a animação

        canvasCtx.fillStyle = '#1e90ff'; // Cor das barras

        for (let i = 0; i < barCount; i++) {
            // Usa seno para criar um movimento de onda suave e contínuo
            const sin_1 = Math.sin(time + i * 0.2) * 0.5 + 0.5;
            const sin_2 = Math.sin(time * 0.5 + i * 0.1) * 0.5 + 0.5;
            
            // Combina as ondas para um efeito mais complexo
            const barHeight = (sin_1 * 0.6 + sin_2 * 0.4) * canvas.height * 0.8;

            const x = i * barWidth;
            const y = (canvas.height - barHeight) / 2; // Centraliza verticalmente

            canvasCtx.fillRect(x, y, barWidth - 2, barHeight);
        }

        // Continua a animação no próximo frame
        animationId = requestAnimationFrame(drawVisualizer);
    }

    // Função global para ser acessada pela API do YouTube
    window.onPlayerStateChange = (event) => {
        const state = event.data;
        
        if (state === YT.PlayerState.PLAYING) {
            console.log("Visualizador: Iniciando animação.");
            // Garante que o tamanho do canvas está atualizado
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            // Inicia a animação
            if (!animationId) {
                drawVisualizer();
            }
        } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED || state === YT.PlayerState.CUED) {
            console.log("Visualizador: Parando animação.");
            // Para a animação
            cancelAnimationFrame(animationId);
            animationId = null;
            // Limpa o canvas para um estado "desligado"
            setTimeout(() => canvasCtx.clearRect(0, 0, canvas.width, canvas.height), 100);
        }
    };

    // --- LÓGICA DAS VINHETAS (COM MUTING E NOVO LAYOUT) ---

    let originalVolume = 100; // Volume padrão

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
                    player.setVolume(0); // MUTA o volume da música
                    console.log(`MUTING: Volume da música definido como 0.`);
                }
            });

            // Evento que é acionado quando a vinheta termina
            audio.addEventListener('ended', () => {
                // Se o player do YouTube existir, restaura o volume
                if (player && typeof player.setVolume === 'function') {
                    player.setVolume(originalVolume);
                    console.log(`UNMUTING: Volume da música restaurado para ${originalVolume}.`);
                }
            });

            vignettes.push({ name: file.name, url: fileURL, audio: audio });
        }
        renderVignetteList();
        event.target.value = '';
    }

    function renderVignetteList() {
        vignetteList.innerHTML = '';
        vignettes.forEach(vignette => {
            const card = document.createElement('div');
            card.className = 'vignette-card';
            card.textContent = vignette.name;
            card.title = vignette.name;

            card.addEventListener('click', () => {
                // Se a vinheta clicada não estiver tocando
                if (vignette.audio.paused) {
                    // Pausa e reseta todas as outras vinhetas
                    vignettes.forEach(v => {
                        if (v.audio !== vignette.audio) {
                            v.audio.pause();
                            v.audio.currentTime = 0;
                        }
                    });
                    // Toca a vinheta atual
                    vignette.audio.play();
                } else { // Se a vinheta clicada já estiver tocando
                    vignette.audio.pause();
                    vignette.audio.currentTime = 0;
                    // Restaura o volume da música imediatamente
                    if (player && typeof player.setVolume === 'function') {
                        player.setVolume(originalVolume);
                        console.log(`UNMUTING (manual stop): Volume da música restaurado para ${originalVolume}.`);
                    }
                }
            });

            vignetteList.appendChild(card);
        });
    }
});