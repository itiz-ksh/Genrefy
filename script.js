const dropZone              = document.getElementById('dropZone');
const fileInput             = document.getElementById('fileInput');
const fileLabel             = document.getElementById('fileLabel');
const fileInfo              = document.getElementById('fileInfo');
const fileName              = document.getElementById('fileName');
const removeFileBtn         = document.getElementById('removeFile');
const recordButton          = document.getElementById('recordButton');
const recordText            = document.getElementById('recordText');
const visualizer            = document.getElementById('visualizer');
const recordingTimer        = document.getElementById('recordingTimer');
const audioPlayer           = document.getElementById('audioPlayer');
const audioElement          = document.getElementById('audioElement');
const analyzeButton         = document.getElementById('analyzeButton');
const loadingSection        = document.getElementById('loadingSection');
const genreResult           = document.getElementById('genreResult');
const detectedGenre         = document.getElementById('detectedGenre');
const resultConfidence      = document.getElementById('resultConfidence');
const confidenceFill        = document.getElementById('confidenceFill');
const confidenceText        = document.getElementById('confidenceText');
const top3Container         = document.getElementById('top3Container');
const playerStatus          = document.getElementById('playerStatus');
const playPauseButton       = document.getElementById('playPauseButton');
const playPauseIcon         = document.getElementById('playPauseIcon');
const playerProgressBar     = document.getElementById('playerProgressBar');
const playerProgress        = document.getElementById('playerProgress');
const currentTimeEl         = document.getElementById('currentTime');
const durationTimeEl        = document.getElementById('durationTime');
const resultsDiv            = document.getElementById('results');
const recommendationsSection = document.getElementById('recommendationsSection');

const API_BASE = 'http://localhost:5000';

let currentAudioFile   = null;
let mediaRecorder      = null;
let audioChunks        = [];
let isRecording        = false;
let recordingStartTime = null;
let timerInterval      = null;
let micStream          = null;

function formatTime(seconds) {
  if (!isFinite(seconds)) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function isValidAudioFile(file) {
  return file.type.startsWith('audio/') ||
    /\.(mp3|wav|ogg|flac|m4a|aac|webm|opus)$/i.test(file.name);
}

function showFile(file) {
  if (!file) return;
  currentAudioFile = file;

  fileName.textContent = file.name;
  fileInfo.classList.add('visible');
  dropZone.style.display = 'none';

  const url = URL.createObjectURL(file);
  audioElement.src = url;
  audioPlayer.classList.add('visible');

  if (playerStatus)   playerStatus.textContent = 'Ready to play';
  if (playPauseIcon)  playPauseIcon.textContent = '▶';
  if (currentTimeEl)  currentTimeEl.textContent = '00:00';
  if (durationTimeEl) durationTimeEl.textContent = '00:00';
  if (playerProgress) playerProgress.style.width = '0%';

  audioElement.onplay        = () => { if (playerStatus)  playerStatus.textContent = 'Playing';         if (playPauseIcon) playPauseIcon.textContent = '⏸'; };
  audioElement.onpause       = () => { if (playerStatus)  playerStatus.textContent = 'Paused';          if (playPauseIcon) playPauseIcon.textContent = '▶'; };
  audioElement.onended       = () => { if (playerStatus)  playerStatus.textContent = 'Ready to replay'; if (playPauseIcon) playPauseIcon.textContent = '▶'; };
  audioElement.ontimeupdate  = () => {
    const pct = audioElement.duration ? (audioElement.currentTime / audioElement.duration) * 100 : 0;
    if (playerProgress) playerProgress.style.width = `${pct}%`;
    if (currentTimeEl)  currentTimeEl.textContent  = formatTime(audioElement.currentTime);
  };
  audioElement.onloadedmetadata = () => {
    if (durationTimeEl) durationTimeEl.textContent = formatTime(audioElement.duration);
  };

  analyzeButton.disabled = false;
  hideResults();
}

function clearFile() {
  currentAudioFile = null;
  fileInfo.classList.remove('visible');
  dropZone.style.display = 'block';
  audioPlayer.classList.remove('visible');
  audioElement.pause();
  audioElement.src = '';
  fileInput.value  = '';
  if (playerStatus)   playerStatus.textContent = 'Ready to play';
  if (playPauseIcon)  playPauseIcon.textContent = '▶';
  if (currentTimeEl)  currentTimeEl.textContent = '00:00';
  if (durationTimeEl) durationTimeEl.textContent = '00:00';
  if (playerProgress) playerProgress.style.width = '0%';
  analyzeButton.disabled = true;
  hideResults();
}

function hideResults() {
  genreResult.classList.remove('visible');
  resultConfidence.classList.remove('visible');
  if (top3Container) top3Container.innerHTML = '';
  if (recommendationsSection) recommendationsSection.classList.remove('visible');
  if (resultsDiv)             resultsDiv.innerHTML = '';
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev =>
  document.body.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); })
);

dropZone.addEventListener('dragenter', () => dropZone.classList.add('drag-over'));
dropZone.addEventListener('dragover',  () => dropZone.classList.add('drag-over'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && isValidAudioFile(file)) showFile(file);
});

dropZone.addEventListener('click', e => {
  if (e.target.closest('label') || e.target === fileInput) return;
  fileInput.click();
});

if (fileLabel) {
  fileLabel.addEventListener('click', e => e.stopPropagation());
}

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file && isValidAudioFile(file)) showFile(file);
});

removeFileBtn.addEventListener('click', clearFile);

async function startRecording() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    alert('Microphone access denied. Please allow microphone permissions and try again.');
    return;
  }

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : '';

  mediaRecorder = mimeType
    ? new MediaRecorder(micStream, { mimeType })
    : new MediaRecorder(micStream);

  audioChunks = [];
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };

  mediaRecorder.onstop = () => {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    const type = mediaRecorder.mimeType || 'audio/webm';
    const ext  = type.includes('mp4') || type.includes('m4a') ? 'm4a' : 'webm';
    const blob = new Blob(audioChunks, { type });
    const file = new File([blob], `recording.${ext}`, { type });
    showFile(file);
  };

  mediaRecorder.start();
  isRecording = true;
  recordButton.classList.add('recording');
  recordText.textContent = 'Stop Recording';
  visualizer.classList.add('active');
  recordingTimer.classList.add('active');
  recordingStartTime = Date.now();
  timerInterval = setInterval(() => {
    recordingTimer.textContent = formatTime((Date.now() - recordingStartTime) / 1000);
  }, 1000);
}

function stopRecording() {
  clearInterval(timerInterval);
  timerInterval = null;
  recordingTimer.classList.remove('active');
  recordingTimer.textContent = '00:00';
  visualizer.classList.remove('active');
  recordButton.classList.remove('recording');
  recordText.textContent = 'Start Recording';
  mediaRecorder.stop();
  isRecording = false;
}

recordButton.addEventListener('click', () => {
  isRecording ? stopRecording() : startRecording();
});

if (playPauseButton) {
  playPauseButton.addEventListener('click', () => {
    if (!currentAudioFile) return;
    audioElement.paused
      ? audioElement.play().catch(() => { if (playerStatus) playerStatus.textContent = 'Playback blocked'; })
      : audioElement.pause();
  });
}

if (playerProgressBar) {
  playerProgressBar.addEventListener('click', e => {
    if (!currentAudioFile || !audioElement.duration) return;
    const rect = playerProgressBar.getBoundingClientRect();
    audioElement.currentTime =
      Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) * audioElement.duration;
  });
}

function renderTop3(predictions) {
  if (!top3Container) return;
  top3Container.innerHTML = '';

  predictions.forEach((item, i) => {
    const pct  = (item.confidence * 100).toFixed(1);
    const card = document.createElement('div');
    card.className = `genre-card rank-${i + 1}`;
    card.style.animationDelay = `${i * 0.12}s`;
    card.innerHTML = `
      <div class="card-rank">#${i + 1}</div>
      <div class="card-genre">${item.genre}</div>
      <div class="card-bar-wrap">
        <div class="card-bar" style="width:0%" data-width="${pct}%"></div>
      </div>
      <div class="card-pct">${pct}%</div>`;
    top3Container.appendChild(card);
  });

  requestAnimationFrame(() => requestAnimationFrame(() => {
    top3Container.querySelectorAll('.card-bar').forEach(b => {
      b.style.width = b.dataset.width;
    });
  }));
}

function renderRecommendations(songs, spotifyConfigured) {
  if (!resultsDiv || !recommendationsSection) return;

  resultsDiv.innerHTML = '';

  if (!spotifyConfigured) {
    recommendationsSection.classList.add('visible');
    resultsDiv.innerHTML = `
      <div class="rec-setup-hint">
        <p class="rec-setup-title">⚠ Spotify not configured</p>
        <p class="rec-setup-body">
          Set <code>SPOTIPY_CLIENT_ID</code> and <code>SPOTIPY_CLIENT_SECRET</code>
          as environment variables, then restart Flask.<br><br>
          Get your credentials free at
          <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">
            developer.spotify.com/dashboard
          </a>
        </p>
      </div>`;
    return;
  }

  if (!songs || songs.length === 0) {
    recommendationsSection.classList.remove('visible');
    return;
  }

  songs.forEach(song => {
    const card = document.createElement('div');
    card.className = 'rec-card';

    // FIX: Don't render <audio> at all when preview_url is null
    const previewHTML = song.preview
      ? `<audio class="rec-preview" controls src="${song.preview}"></audio>`
      : `<p class="rec-no-preview">No preview available</p>`;

    card.innerHTML = `
      ${song.image ? `<img class="rec-image" src="${song.image}" alt="${song.name} album art" loading="lazy">` : ''}
      <div class="rec-info">
        <p class="rec-name">${song.name}</p>
        <p class="rec-artist">${song.artist}</p>
        ${previewHTML}
        <a class="rec-link" href="${song.url}" target="_blank" rel="noopener noreferrer">
          Open in Spotify ↗
        </a>
      </div>`;
    resultsDiv.appendChild(card);
  });

  recommendationsSection.classList.add('visible');
}

async function analyzeAudio() {
  if (!currentAudioFile) return;

  analyzeButton.classList.add('loading');
  analyzeButton.disabled = true;
  loadingSection.classList.add('visible');
  hideResults();

  try {
    const form = new FormData();
    form.append('audio', currentAudioFile);

    const res  = await fetch(`${API_BASE}/predict`, { method: 'POST', body: form });
    const data = await res.json();

    loadingSection.classList.remove('visible');
    analyzeButton.classList.remove('loading');
    analyzeButton.disabled = false;

    if (data.error) {
      alert(`Error: ${data.error}`);
      return;
    }

    const top = data.predictions[0];
    detectedGenre.textContent = top.genre;
    genreResult.classList.add('visible');

    setTimeout(() => {
      resultConfidence.classList.add('visible');
      confidenceFill.style.width  = `${(top.confidence * 100).toFixed(1)}%`;
      confidenceText.textContent  = `${(top.confidence * 100).toFixed(1)}% confidence`;
    }, 300);

    renderTop3(data.predictions);

    renderRecommendations(data.recommendations, data.spotify_configured);

  } catch (err) {
    console.error(err);
    loadingSection.classList.remove('visible');
    analyzeButton.classList.remove('loading');
    analyzeButton.disabled = false;
    alert(`Could not reach the backend. Make sure Flask is running on ${API_BASE}`);
  }
}

analyzeButton.addEventListener('click', e => {
  e.preventDefault();
  analyzeAudio();
});