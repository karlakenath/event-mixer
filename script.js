// --- Global Variables ---
let player; // YouTube Player instance

// --- Correção Áudio Bluetooth: Web Audio API Setup ---
// Cria um único AudioContext para ser reutilizado.
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
// Cria um Analyser para o visualizador de áudio.
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256; // Define a complexidade da análise.
// --- Fim da Correção ---

// --- YouTube IFrame API Setup ---
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        playerVars: {
            listType: 'playlist',
            list: 'PL8A83124F1D092353', // Default playlist
            autoplay: 0, controls: 0, rel: 0, showinfo: 0,
            iv_load_policy: 3, modestbranding: 1,
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

// --- Player Event Handlers ---
function onPlayerReady(event) {
    console.log("Player is ready.");
    updateVolume(document.getElementById('volume-bar').value);
    setInterval(updateProgressBar, 250);
}

function onPlayerStateChange(event) {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const icon = playPauseBtn.querySelector('i');
    const state = event.data;

    if (state === YT.PlayerState.PLAYING) {
        // --- Correção Áudio Bluetooth: Resume o AudioContext ---
        // Garante que o áudio não seja suspenso pelo navegador ao trocar de dispositivo.
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        // --- Fim da Correção ---
        icon.className = 'ph-bold ph-pause';
        updatePlaylistTitle(); 
    } else {
        icon.className = 'ph-bold ph-play';
        stopVisualizer(); // Limpa o canvas se a música parar
    }
    
    if (state === YT.PlayerState.CUED) {
        updatePlaylistTitle();
    }
}

function onPlayerError(event) {
    console.error("YouTube Player Error:", event.data);
    showError(`Erro no Player: ${event.data}. Verifique o ID da playlist.`);
}

// --- DOMContentLoaded: Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const playPauseBtn = document.getElementById('play-pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const volumeBar = document.getElementById('volume-bar');
    const progressBar = document.getElementById('progress-bar');
    const vignetteUpload = document.getElementById('vignette-upload');
    const vignetteListEl = document.getElementById('vignette-list');
    
    const playlistInput = document.getElementById('playlist-input');
    const loadPlaylistBtn = document.getElementById('load-playlist-btn');
    const errorMessageEl = document.getElementById('error-message');

    let vignettes = []; // { name, url, audio, element, sourceNode }
    let originalPlayerVolume = 100;

    // --- Playlist Loader Logic ---
    loadPlaylistBtn.addEventListener('click', loadPlaylistFromInput);
    playlistInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadPlaylistFromInput();
    });

    function loadPlaylistFromInput() {
        const url = playlistInput.value.trim();
        if (!url) {
            showError("Por favor, insira a URL da playlist.");
            return;
        }
        const playlistId = extractPlaylistIdFromUrl(url);
        if (playlistId) {
            hideError();
            player.loadPlaylist({ list: playlistId, listType: 'playlist' });
            playlistInput.value = '';
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
        errorMessageEl.textContent = message;
        errorMessageEl.classList.remove('hidden');
        setTimeout(hideError, 4000);
    }

    function hideError() {
        errorMessageEl.classList.add('hidden');
    }

    // --- Player Controls ---
    playPauseBtn.addEventListener('click', togglePlayPause);
    nextBtn.addEventListener('click', () => player && player.nextVideo());
    prevBtn.addEventListener('click', () => player && player.previousVideo());
    volumeBar.addEventListener('input', (e) => updateVolume(e.target.value));
    progressBar.addEventListener('input', (e) => {
        const duration = player.getDuration();
        if (duration) player.seekTo(duration * (e.target.value / 100), true);
    });

    function togglePlayPause() {
        if (!player || typeof player.getPlayerState !== 'function') return;
        
        // --- Correção Áudio Bluetooth: Resume o AudioContext ---
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        // --- Fim da Correção ---

        const playerState = player.getPlayerState();
        if (playerState === YT.PlayerState.PLAYING) player.pauseVideo();
        else player.playVideo();
    }

    // --- Vignette Handling ---
    vignetteUpload.addEventListener('change', handleVignetteUpload);

    function handleVignetteUpload(event) {
        const files = event.target.files;
        if (!files.length) return;
        for (const file of files) {
            if (vignettes.some(v => v.name === file.name)) continue;
            const fileURL = URL.createObjectURL(file);
            const audio = new Audio(fileURL);

            // --- Correção Áudio Bluetooth: Conecta a vinheta ao AudioContext ---
            // Cria uma fonte de mídia a partir do elemento de áudio.
            const source = audioCtx.createMediaElementSource(audio);
            // Conecta a fonte ao destino do sistema (alto-falantes). ESSENCIAL para o áudio sair.
            source.connect(audioCtx.destination);
            // Conecta a fonte ao analyser para o visualizador funcionar.
            source.connect(analyser);
            // --- Fim da Correção ---

            const newVignette = { name: file.name, url: fileURL, audio: audio, element: null, sourceNode: source };
            vignettes.push(newVignette);
            audio.addEventListener('play', () => handleVignettePlay(newVignette));
            audio.addEventListener('ended', () => handleVignetteEnd(newVignette));
            audio.addEventListener('pause', () => handleVignetteEnd(newVignette));
        }
        renderVignetteList();
        event.target.value = '';
    }

    function renderVignetteList() {
        vignetteListEl.innerHTML = '';
        vignettes.forEach(vignette => {
            const card = document.createElement('div');
            card.className = 'vignette-card';
            card.innerHTML = `
                <i class="ph ph-play-circle"></i>
                <span class="vignette-name">${vignette.name}</span>
            `;
            card.addEventListener('click', () => toggleVignette(vignette));
            vignetteListEl.appendChild(card);
            vignette.element = card;
        });
    }

    function toggleVignette(vignetteToPlay) {
        // --- Correção Áudio Bluetooth: Resume o AudioContext ---
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        // --- Fim da Correção ---

        const icon = vignetteToPlay.element.querySelector('i');
        if (vignetteToPlay.audio.paused) {
            vignettes.forEach(v => {
                if (v !== vignetteToPlay) {
                    v.audio.pause();
                    v.audio.currentTime = 0;
                    v.element.querySelector('i').className = 'ph ph-play-circle';
                }
            });
            vignetteToPlay.audio.play();
            icon.className = 'ph ph-stop-circle';
        } else {
            vignetteToPlay.audio.pause();
            vignetteToPlay.audio.currentTime = 0;
            icon.className = 'ph ph-play-circle';
        }
    }
    
    function handleVignettePlay(vignette) {
        vignette.element.classList.add('playing');
        vignette.element.querySelector('i').className = 'ph ph-stop-circle';
        if (player && typeof player.getVolume === 'function') {
            originalPlayerVolume = player.getVolume();
            player.setVolume(0);
        }
        // --- Correção Áudio Bluetooth: Inicia o visualizador real ---
        startVisualizer();
        // --- Fim da Correção ---
    }

    function handleVignetteEnd(vignette) {
        vignette.element.classList.remove('playing');
        vignette.element.querySelector('i').className = 'ph ph-play-circle';
        if (player && typeof player.setVolume === 'function') {
            player.setVolume(originalPlayerVolume);
        }
        // --- Correção Áudio Bluetooth: Para o visualizador ---
        stopVisualizer();
        // --- Fim da Correção ---
    }

    // --- UI Updates ---
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');

    function updateVolume(volume) {
        if (player && typeof player.setVolume === 'function') player.setVolume(volume);
    }

    function updateProgressBar() {
        if (!player || typeof player.getDuration !== 'function') return;
        const duration = player.getDuration();
        const currentTime = player.getCurrentTime();
        if (duration > 0) progressBar.value = (currentTime / duration) * 100;
        currentTimeEl.textContent = formatTime(currentTime);
        totalTimeEl.textContent = formatTime(duration);
    }

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
        return isNaN(min) || isNaN(sec) ? '0:00' : `${min}:${sec}`;
    }
});

// --- Global UI & Visualizer Functions ---

/**
 * Atualiza o título da playlist no cabeçalho.
 * A API IFrame não fornece o título da playlist, então usamos o título do vídeo atual.
 */
function updatePlaylistTitle() {
    if (!player || typeof player.getVideoData !== 'function') return;
    
    const playlistNameEl = document.getElementById('playlist-name');
    const playlistSubtitleEl = document.getElementById('playlist-subtitle');
    const videoData = player.getVideoData();
    
    if (videoData && videoData.title) {
        playlistNameEl.textContent = videoData.title;
        const playlist = player.getPlaylist();
        const playlistIndex = player.getPlaylistIndex();
        if (playlist && playlist.length > 0) {
            playlistSubtitleEl.textContent = `Faixa ${playlistIndex + 1} de ${playlist.length}`;
        } else {
            playlistSubtitleEl.textContent = "Tocando agora";
        }
    }
}

const canvas = document.getElementById('audio-visualizer');
const canvasCtx = canvas.getContext('2d');
let animationId;

// --- Correção Áudio Bluetooth: Visualizador de áudio real ---
// O visualizador agora lê os dados do "analyser" e os desenha no canvas.
// NOTA: Este visualizador só funcionará para as vinhetas, pois não é possível
// acessar o stream de áudio do player do YouTube por restrições de segurança.
function startVisualizer() {
    if (animationId) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];

            const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(140, 22, 224, 0.9)'); // Roxo Neon
            gradient.addColorStop(0.5, 'rgba(0, 178, 255, 0.7)'); // Azul Neon
            gradient.addColorStop(1, 'rgba(140, 22, 224, 0.9)');
            
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    draw();
}

function stopVisualizer() {
    cancelAnimationFrame(animationId);
    animationId = null;
    // Limpa o canvas após um pequeno atraso para suavizar a transição
    setTimeout(() => canvasCtx.clearRect(0, 0, canvas.width, canvas.height), 100);
}