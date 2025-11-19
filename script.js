// --- Global Variables ---
let player; // YouTube Player instance
let audioContext, analyser, sourceNode; // Web Audio API
let dataArray; // Uint8Array for frequency data
let activeVignetteAudio = null; // Track the currently playing vignette audio

// --- YouTube IFrame API Setup ---
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '100%', width: '100%',
        playerVars: {
            listType: 'playlist', list: 'PL8A83124F1D092353',
            autoplay: 0, controls: 0, rel: 0, showinfo: 0,
            iv_load_policy: 3, modestbranding: 1,
        },
        events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange, 'onError': onPlayerError }
    });
}

// --- Player Event Handlers ---
function onPlayerReady(event) {
    console.log("Player is ready.");
    updateVolume(document.getElementById('volume-bar').value);
    setInterval(updateProgressBar, 250);
    startVisualizer(); // Start the visualizer loop permanently
}

function onPlayerStateChange(event) {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const icon = playPauseBtn.querySelector('i');
    const state = event.data;

    if (state === YT.PlayerState.PLAYING) {
        icon.className = 'ph-bold ph-pause';
        updatePlaylistTitle();
        activeVignetteAudio = null; // YouTube takes priority
    } else {
        icon.className = 'ph-bold ph-play';
    }
    if (state === YT.PlayerState.CUED) updatePlaylistTitle();
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

    let vignettes = [];
    let originalPlayerVolume = 100;

    // --- Playlist Loader ---
    loadPlaylistBtn.addEventListener('click', loadPlaylistFromInput);
    playlistInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadPlaylistFromInput(); });

    function loadPlaylistFromInput() {
        const url = playlistInput.value.trim();
        if (!url) { showError("Por favor, insira a URL da playlist."); return; }
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
    function hideError() { errorMessageEl.classList.add('hidden'); }

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

    function setupAudioApi() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
        }
    }

    function handleVignetteUpload(event) {
        setupAudioApi();
        const files = event.target.files;
        if (!files.length) return;

        for (const file of files) {
            if (vignettes.some(v => v.name === file.name)) continue;
            const fileURL = URL.createObjectURL(file);
            const audio = new Audio(fileURL);
            
            // Create a source node for this audio element and store it
            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);

            const newVignette = { name: file.name, audio, element: null, source };
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
            card.innerHTML = `<i class="ph ph-play-circle"></i><span class="vignette-name">${vignette.name}</span>`;
            card.addEventListener('click', () => toggleVignette(vignette));
            vignetteListEl.appendChild(card);
            vignette.element = card;
        });
    }

    function toggleVignette(vignetteToPlay) {
        if (audioContext.state === 'suspended') audioContext.resume();
        
        if (vignetteToPlay.audio.paused) {
            vignettes.forEach(v => {
                if (v !== vignetteToPlay) {
                    v.audio.pause();
                    v.audio.currentTime = 0;
                }
            });
            vignetteToPlay.audio.play();
        } else {
            vignetteToPlay.audio.pause();
            vignetteToPlay.audio.currentTime = 0;
        }
    }
    
    function handleVignettePlay(vignette) {
        activeVignetteAudio = vignette.audio;
        vignette.element.classList.add('playing');
        vignette.element.querySelector('i').className = 'ph ph-stop-circle';
        if (player && typeof player.getVolume === 'function') {
            originalPlayerVolume = player.getVolume();
            player.setVolume(0);
        }
    }

    function handleVignetteEnd(vignette) {
        if (activeVignetteAudio === vignette.audio) activeVignetteAudio = null;
        vignette.element.classList.remove('playing');
        vignette.element.querySelector('i').className = 'ph ph-play-circle';
        if (player && typeof player.setVolume === 'function') {
            player.setVolume(originalPlayerVolume);
        }
    }

    // --- UI Updates ---
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    function updateVolume(volume) { if (player && typeof player.setVolume === 'function') player.setVolume(volume); }
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

function startVisualizer() {
    if (animationId) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    function draw() {
        animationId = requestAnimationFrame(draw);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Se uma vinheta estiver tocando, use o áudio real.
        if (activeVignetteAudio && analyser) {
            analyser.getByteFrequencyData(dataArray);
            drawRealBars(dataArray);
        } 
        // Senão, e se o player do YouTube estiver tocando, use a animação falsa.
        else if (player && player.getPlayerState && player.getPlayerState() === YT.PlayerState.PLAYING) {
            drawFakeBars();
        }
    }
    draw();
}

function drawRealBars(dataArray) {
    const barCount = analyser.frequencyBinCount;
    const barWidth = canvas.width / barCount;
    const centerY = canvas.height / 2;

    for (let i = 0; i < barCount; i++) {
        const barHeight = (dataArray[i] / 255) * centerY * 0.9;
        const x = i * barWidth;
        
        const gradient = canvasCtx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
        gradient.addColorStop(0, 'rgba(140, 22, 224, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 178, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(140, 22, 224, 0.8)');
        canvasCtx.fillStyle = gradient;
        
        canvasCtx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
    }
}

function drawFakeBars() {
    const barCount = 64;
    const barWidth = canvas.width / barCount;
    const time = Date.now() * 0.001;
    const centerY = canvas.height / 2;
    
    // Simula uma batida pulsante
    const pulse = (Math.sin(time * Math.PI * 2 / 2) * 0.25 + 0.75); // Pulsa a cada 2 segundos

    for (let i = 0; i < barCount; i++) {
        const sin_1 = Math.sin(time * 2 + i * 0.25) * 0.5 + 0.5;
        const sin_2 = Math.sin(time * 2.5 + i * 0.15) * 0.5 + 0.5;
        const barHeight = (sin_1 * 0.6 + sin_2 * 0.4) * centerY * 0.7 * pulse;

        const x = i * barWidth;
        
        const gradient = canvasCtx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
        gradient.addColorStop(0, 'rgba(140, 22, 224, 0.7)');
        gradient.addColorStop(0.5, 'rgba(0, 178, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(140, 22, 224, 0.7)');
        canvasCtx.fillStyle = gradient;
        
        canvasCtx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight * 2);
    }
}