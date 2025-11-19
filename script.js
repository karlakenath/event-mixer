// --- Global Variables ---
let player; // YouTube Player instance

// --- YouTube IFrame API Setup ---
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        playerVars: {
            listType: 'playlist',
            list: 'PL8A83124F1D092353', // Default playlist
            autoplay: 0, // Start paused
            controls: 0, // Use custom controls
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            modestbranding: 1,
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
    // A onStateChange cuidará da atualização inicial da UI
}

function onPlayerStateChange(event) {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const icon = playPauseBtn.querySelector('i');
    const state = event.data;

    if (state === YT.PlayerState.PLAYING) {
        icon.className = 'ph-bold ph-pause';
        startVisualizer();
        updateUiForNewTrack(); // Atualiza tudo quando uma nova faixa começa
    } else {
        icon.className = 'ph-bold ph-play';
        stopVisualizer();
    }
    
    if (state === YT.PlayerState.CUED) {
        // Quando uma nova playlist é carregada, o primeiro vídeo é "cued".
        // É um bom momento para atualizar a UI.
        updateUiForNewTrack();
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

    let vignettes = []; // { name, url, audio, element }
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
            const newVignette = { name: file.name, url: fileURL, audio: audio, element: null };
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
            vignetteToPlay.audio.currentTime = 0; // Reset on stop
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
    }

    function handleVignetteEnd(vignette) {
        vignette.element.classList.remove('playing');
        vignette.element.querySelector('i').className = 'ph ph-play-circle';
        if (player && typeof player.setVolume === 'function') {
            player.setVolume(originalPlayerVolume);
        }
    }

    // --- UI & Visualizer Updates ---
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

    // --- Audio Visualizer Logic ---
    const canvas = document.getElementById('audio-visualizer');
    const canvasCtx = canvas.getContext('2d');
    let animationId;

    function startVisualizer() {
        if (animationId) return;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        function draw() {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            const barCount = 64;
            const barWidth = canvas.width / barCount;
            const time = Date.now() * 0.0015;
            for (let i = 0; i < barCount; i++) {
                const sin_1 = Math.sin(time + i * 0.2) * 0.5 + 0.5;
                const sin_2 = Math.sin(time * 0.7 + i * 0.1) * 0.5 + 0.5;
                const barHeight = (sin_1 * 0.7 + sin_2 * 0.3) * canvas.height * 0.6;
                const x = i * barWidth;
                const y = canvas.height - barHeight;
                const gradient = canvasCtx.createLinearGradient(x, y, x, canvas.height);
                gradient.addColorStop(0, `hsla(${280 + i * 2}, 100%, 60%, 0.8)`);
                gradient.addColorStop(1, `hsla(${200 + i * 2}, 100%, 50%, 0.1)`);
                canvasCtx.fillStyle = gradient;
                canvasCtx.fillRect(x, y, barWidth - 1, barHeight);
            }
            animationId = requestAnimationFrame(draw);
        }
        draw();
    }

    function stopVisualizer() {
        cancelAnimationFrame(animationId);
        animationId = null;
        setTimeout(() => canvasCtx.clearRect(0, 0, canvas.width, canvas.height), 100);
    }
});

// --- Global UI Update Functions ---

/**
 * Atualiza o título da playlist e a lista de próximas faixas.
 * Chamada quando uma nova faixa começa a tocar ou uma nova playlist é carregada.
 */
function updateUiForNewTrack() {
    if (!player || typeof player.getPlaylist !== 'function' || !player.getPlaylist()) return;

    // 1. Atualizar Título da Playlist
    const playlistNameEl = document.getElementById('playlist-name');
    const playlistSubtitleEl = document.getElementById('playlist-subtitle');
    const videoData = player.getVideoData();
    
    // A API IFrame não fornece o título da playlist, então usamos o título do vídeo atual como uma aproximação.
    if (videoData && videoData.title) {
        playlistNameEl.textContent = videoData.title;
        playlistSubtitleEl.textContent = "Tocando agora";
    }

    // 2. Atualizar Lista "Próximas na Fila"
    const playlist = player.getPlaylist();
    const playlistIndex = player.getPlaylistIndex();
    const trackListEl = document.getElementById('track-list');

    trackListEl.innerHTML = ''; // Limpa a lista antiga

    if (playlist.length === 0 || playlistIndex === playlist.length - 1) {
        trackListEl.innerHTML = '<p style="padding: 1rem; color: var(--gray-light); text-align: center;">Fim da playlist.</p>';
        return;
    }

    // Mostra apenas as faixas *depois* da atual
    for (let i = playlistIndex + 1; i < playlist.length; i++) {
        const videoId = playlist[i];
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';

        // Não podemos obter o título ou duração de faixas futuras sem a API de Dados do YouTube.
        // Usaremos um placeholder.
        const title = `Próxima Faixa ${i + 1}`;

        trackItem.innerHTML = `
            <img src="https://i.ytimg.com/vi/${videoId}/mqdefault.jpg" alt="Track thumbnail">
            <div class="track-info">
                <div class="title">${title}</div>
                <div class="artist">YouTube</div>
            </div>
        `;
        trackListEl.appendChild(trackItem);
    }
}