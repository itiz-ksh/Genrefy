// /**
//  * Genrefy - Audio Genre Detection App
//  * Connected to Flask backend at http://localhost:5000
//  */

// // ========================================
// // DOM Elements
// // ========================================
// const dropZone       = document.getElementById('dropZone');
// const fileInput      = document.getElementById('fileInput');
// const fileInfo       = document.getElementById('fileInfo');
// const fileName       = document.getElementById('fileName');
// const removeFile     = document.getElementById('removeFile');
// const recordButton   = document.getElementById('recordButton');
// const recordIcon     = document.getElementById('recordIcon');
// const recordText     = document.getElementById('recordText');
// const visualizer     = document.getElementById('visualizer');
// const recordingTimer = document.getElementById('recordingTimer');
// const audioPlayer    = document.getElementById('audioPlayer');
// const audioElement   = document.getElementById('audioElement');
// const analyzeButton  = document.getElementById('analyzeButton');
// const loadingSection = document.getElementById('loadingSection');
// const genreResult    = document.getElementById('genreResult');
// const detectedGenre  = document.getElementById('detectedGenre');
// const resultConfidence = document.getElementById('resultConfidence');
// const confidenceFill = document.getElementById('confidenceFill');
// const confidenceText = document.getElementById('confidenceText');
// const top3Container  = document.getElementById('top3Container');   // [ADDED]
// const playerStatus   = document.getElementById('playerStatus');
// const playPauseButton = document.getElementById('playPauseButton');
// const playPauseIcon   = document.getElementById('playPauseIcon');
// const playerProgressBar = document.getElementById('playerProgressBar');
// const playerProgress = document.getElementById('playerProgress');
// const currentTimeEl = document.getElementById('currentTime');
// const durationTimeEl = document.getElementById('durationTime');

// // ========================================
// // State
// // ========================================
// let currentAudioFile  = null;
// let mediaRecorder     = null;
// let audioChunks       = [];
// let isRecording       = false;
// let recordingStartTime = null;
// let timerInterval     = null;
// let micStream         = null;   // [ADDED] track stream for proper cleanup

// // ========================================
// // Utility
// // ========================================
// function formatTime(seconds) {
//   const mins = Math.floor(seconds / 60);
//   const secs = Math.floor(seconds % 60);
//   // [FIX] Original code had broken template literals (backtick stripped to plain string)
//   return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
// }

// function isValidAudioFile(file) {
//   return file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name);
// }

// function showFile(file) {
//   currentAudioFile = file;
//   fileName.textContent = file.name;
//   fileInfo.classList.add('visible');
//   dropZone.style.display = 'none';

//   const url = URL.createObjectURL(file);
//   audioElement.src = url;
//   audioPlayer.classList.add('visible');
//   playerStatus.textContent = 'Ready to play';
//   playPauseIcon.textContent = '▶';
//   currentTimeEl.textContent = '00:00';
//   durationTimeEl.textContent = '00:00';
//   playerProgress.style.width = '0%';

//   audioElement.onplay = () => {
//     playerStatus.textContent = 'Playing';
//     playPauseIcon.textContent = '⏸';
//   };

//   audioElement.onpause = () => {
//     playerStatus.textContent = 'Paused';
//     playPauseIcon.textContent = '▶';
//   };

//   audioElement.onended = () => {
//     playerStatus.textContent = 'Ready to replay';
//     playPauseIcon.textContent = '▶';
//   };

//   audioElement.ontimeupdate = () => {
//     const current = audioElement.currentTime;
//     const duration = audioElement.duration || 0;
//     const percent = duration ? (current / duration) * 100 : 0;
//     playerProgress.style.width = `${percent}%`;
//     currentTimeEl.textContent = formatTime(current);
//   };

//   audioElement.onloadedmetadata = () => {
//     durationTimeEl.textContent = formatTime(audioElement.duration);
//   };

//   analyzeButton.disabled = false;
//   hideResults();
// }

// function clearFile() {
//   currentAudioFile = null;
//   fileInfo.classList.remove('visible');
//   dropZone.style.display = 'block';
//   audioPlayer.classList.remove('visible');
//   audioElement.pause();
//   audioElement.currentTime = 0;
//   audioElement.src = '';
//   playerStatus.textContent = 'Ready to play';
//   playPauseIcon.textContent = '▶';
//   currentTimeEl.textContent = '00:00';
//   durationTimeEl.textContent = '00:00';
//   playerProgress.style.width = '0%';
//   fileInput.value = '';
//   analyzeButton.disabled = true;
//   hideResults();
// }

// function formatTime(seconds) {
//   const min = Math.floor(seconds / 60).toString().padStart(2, '0');
//   const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
//   return `${min}:${sec}`;
// }

// function hideResults() {
//   genreResult.classList.remove('visible');
//   resultConfidence.classList.remove('visible');
//   if (top3Container) top3Container.innerHTML = '';
// }

// // ========================================
// // Drag & Drop
// // ========================================
// ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
//   document.body.addEventListener(event, e => {
//     e.preventDefault();
//     e.stopPropagation();
//   });
// });

// // [ADDED] Visual feedback on drag over the drop zone specifically
// dropZone.addEventListener('dragenter', () => dropZone.classList.add('drag-over'));
// dropZone.addEventListener('dragover',  () => dropZone.classList.add('drag-over'));
// dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

// dropZone.addEventListener('drop', (e) => {
//   dropZone.classList.remove('drag-over');
//   const file = e.dataTransfer.files[0];
//   if (file && isValidAudioFile(file)) showFile(file);
// });

// dropZone.addEventListener('click', () => fileInput.click());

// fileInput.addEventListener('change', (e) => {
//   const file = e.target.files[0];

//   if (file && isValidAudioFile(file)) {
//     currentAudioFile = file;   // 🔥 set here
//     showFile(file);            // UI update
//   }
// });

// removeFile.addEventListener('click', clearFile);

// // ========================================
// // Recording
// // ========================================
// async function startRecording() {
//   try {
//     micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
//   } catch (err) {
//     alert('Microphone access denied. Please allow microphone permissions.');
//     return;
//   }

//   mediaRecorder = new MediaRecorder(micStream, { mimeType: 'audio/webm' });
//   audioChunks = [];

//   mediaRecorder.ondataavailable = e => {
//     if (e.data.size > 0) {
//       audioChunks.push(e.data);
//     }
//   };

//   mediaRecorder.onstop = () => {
//     // Stop all mic tracks
//     micStream.getTracks().forEach(t => t.stop());
//     micStream = null;

//     // Create WebM blob (MediaRecorder native, reliable format)
//     const blob = new Blob(audioChunks, { type: 'audio/webm' });
//     const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
//     showFile(file);
//   };

//   mediaRecorder.start();
//   isRecording = true;

//   recordButton.classList.add('recording');
//   recordText.textContent = 'Stop Recording';
//   visualizer.classList.add('active');
//   recordingTimer.classList.add('active');

//   recordingStartTime = Date.now();
//   timerInterval = setInterval(() => {
//     const elapsed = (Date.now() - recordingStartTime) / 1000;
//     recordingTimer.textContent = formatTime(elapsed);
//   }, 1000);
// }

// function stopRecording() {
//   clearInterval(timerInterval);
//   timerInterval = null;
//   recordingTimer.classList.remove('active');
//   recordingTimer.textContent = '00:00';
//   visualizer.classList.remove('active');
//   recordButton.classList.remove('recording');
//   recordText.textContent = 'Start Recording';

//   mediaRecorder.stop();
//   isRecording = false;
// }

// recordButton.addEventListener('click', () => {
//   isRecording ? stopRecording() : startRecording();
// });

// // ========================================
// // Render Top-3 Genre Cards  [ADDED]
// // Moved top-3 from console.log into a real UI section
// // ========================================
// function renderTop3(predictions) {
//   if (!top3Container) return;
//   top3Container.innerHTML = '';

//   predictions.forEach((item, i) => {
//     const pct = (item.confidence * 100).toFixed(1);
//     const card = document.createElement('div');
//     card.className = `genre-card rank-${i + 1}`;
//     card.style.animationDelay = `${i * 0.12}s`;
//     card.innerHTML = `
//       <div class="card-rank">#${i + 1}</div>
//       <div class="card-genre">${item.genre}</div>
//       <div class="card-bar-wrap">
//         <div class="card-bar" style="width: 0%" data-width="${pct}%"></div>
//       </div>
//       <div class="card-pct">${pct}%</div>
//     `;
//     top3Container.appendChild(card);
//   });

//   // Animate bars after paint
//   requestAnimationFrame(() => {
//     requestAnimationFrame(() => {
//       top3Container.querySelectorAll('.card-bar').forEach(bar => {
//         bar.style.width = bar.dataset.width;
//       });
//     });
//   });
// }

// // ========================================
// // Analyze — Real Backend Call
// // ========================================
// async function analyzeAudio() {
//   if (!currentAudioFile) return;

//   analyzeButton.classList.add('loading');
//   analyzeButton.disabled = true;
//   loadingSection.classList.add('visible');
//   hideResults();

//   try {
//     const formData = new FormData();
//     formData.append('audio', currentAudioFile);

//     const response = await fetch('http://localhost:5000/predict', {
//       method: 'POST',
//       body: formData,
//     });

//     const data = await response.json();

//     loadingSection.classList.remove('visible');
//     analyzeButton.classList.remove('loading');
//     analyzeButton.disabled = false;

//     if (data.error) {
//       alert(`Error: ${data.error}`);
//       return;
//     }

//     const predictions = data.predictions;
//     const top = predictions[0];

//     // show main result
//     detectedGenre.textContent = top.genre;

//     // render top 3
//     renderTop3(predictions);

//     // Primary result
//     detectedGenre.textContent = top.genre;
//     genreResult.classList.add('visible');

//     setTimeout(() => {
//       resultConfidence.classList.add('visible');
//       confidenceFill.style.width = `${(top.confidence * 100).toFixed(1)}%`;
//       confidenceText.textContent = `${(top.confidence * 100).toFixed(1)}% confidence`;
//     }, 300);

//   } catch (err) {
//     console.error(err);
//     loadingSection.classList.remove('visible');
//     analyzeButton.classList.remove('loading');
//     analyzeButton.disabled = false;
//     alert('Could not reach the backend. Make sure Flask is running on http://localhost:5000');
//   }
// }

// playPauseButton.addEventListener('click', () => {
//   if (!currentAudioFile) return;

//   if (audioElement.paused) {
//     audioElement.play().catch(() => {
//       playerStatus.textContent = 'Playback blocked';
//     });
//   } else {
//     audioElement.pause();
//   }
// });

// playerProgressBar.addEventListener('click', (event) => {
//   if (!currentAudioFile) return;
//   const rect = playerProgressBar.getBoundingClientRect();
//   const clickX = event.clientX - rect.left;
//   const percent = Math.min(Math.max(clickX / rect.width, 0), 1);
//   if (audioElement.duration) {
//     audioElement.currentTime = percent * audioElement.duration;
//   }
// });

// analyzeButton.addEventListener('click', (e) => {
//   e.preventDefault();   // 🔥 stops reload
//   analyzeAudio();
// });

// // ========================================
// // Init
// // ========================================
// console.log('Genrefy Connected 🚀');


/**
 * Genrefy — script.js
 *
 * BUG FIXES IN THIS VERSION:
 *
 * FIX 1 — Double file picker (the "must click twice" bug)
 * ─────────────────────────────────────────────────────────
 * Root cause: The drop zone had a blanket click→fileInput.click() listener.
 * When the user clicked the "Browse Files" <label>, TWO things happened:
 *   (a) The <label for="fileInput"> natively triggered the file input (HTML spec)
 *   (b) The click bubbled up to dropZone, which called fileInput.click() again
 * That opened a SECOND picker immediately after the first one was closed.
 * The first pick registered nothing (picker closed before change fired on the
 * second open), so the UI reset. The second time around it appeared to "work"
 * because now only one picker was open.
 *
 * Fix: Stop the click event on the label from bubbling up to the drop zone.
 * The label now handles itself via its native for="fileInput" behaviour.
 * The dropZone click listener is guarded to ignore clicks that originate
 * from the label or the hidden input.
 *
 * FIX 2 — Recording gives "Audio processing failed" error
 * ─────────────────────────────────────────────────────────
 * Root cause: Chrome/Brave/Edge MediaRecorder outputs audio/webm (Opus codec).
 * librosa (via libsoundfile) cannot read WebM. The file arrived at the server,
 * librosa tried to load it, got an empty signal, and returned the error.
 *
 * Fix (two-part):
 *   • app.py: detect non-native formats (.webm, .m4a) and convert to WAV
 *     server-side using ffmpeg before passing to librosa. (See app.py.)
 *   • script.js (here): no format change needed on the browser side —
 *     we keep audio/webm because it's the most reliable cross-browser format.
 *     The server now handles conversion transparently.
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────
const dropZone          = document.getElementById('dropZone');
const fileInput         = document.getElementById('fileInput');
const fileLabel         = document.getElementById('fileLabel');        // NEW: ref to the label
const fileInfo          = document.getElementById('fileInfo');
const fileName          = document.getElementById('fileName');
const removeFileBtn     = document.getElementById('removeFile');
const recordButton      = document.getElementById('recordButton');
const recordText        = document.getElementById('recordText');
const visualizer        = document.getElementById('visualizer');
const recordingTimer    = document.getElementById('recordingTimer');
const audioPlayer       = document.getElementById('audioPlayer');
const audioElement      = document.getElementById('audioElement');
const analyzeButton     = document.getElementById('analyzeButton');
const loadingSection    = document.getElementById('loadingSection');
const genreResult       = document.getElementById('genreResult');
const detectedGenre     = document.getElementById('detectedGenre');
const resultConfidence  = document.getElementById('resultConfidence');
const confidenceFill    = document.getElementById('confidenceFill');
const confidenceText    = document.getElementById('confidenceText');
const top3Container     = document.getElementById('top3Container');
const playerStatus      = document.getElementById('playerStatus');
const playPauseButton   = document.getElementById('playPauseButton');
const playPauseIcon     = document.getElementById('playPauseIcon');
const playerProgressBar = document.getElementById('playerProgressBar');
const playerProgress    = document.getElementById('playerProgress');
const currentTimeEl     = document.getElementById('currentTime');
const durationTimeEl    = document.getElementById('durationTime');

// ── State ─────────────────────────────────────────────────────────────────────
let currentAudioFile   = null;
let mediaRecorder      = null;
let audioChunks        = [];
let isRecording        = false;
let recordingStartTime = null;
let timerInterval      = null;
let micStream          = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
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

  // File info bar
  fileName.textContent = file.name;
  fileInfo.classList.add('visible');
  dropZone.style.display = 'none';

  // Audio player
  const url = URL.createObjectURL(file);
  audioElement.src = url;
  audioPlayer.classList.add('visible');

  // Reset player state
  if (playerStatus)   playerStatus.textContent = 'Ready to play';
  if (playPauseIcon)  playPauseIcon.textContent = '▶';
  if (currentTimeEl)  currentTimeEl.textContent = '00:00';
  if (durationTimeEl) durationTimeEl.textContent = '00:00';
  if (playerProgress) playerProgress.style.width = '0%';

  audioElement.onplay = () => {
    if (playerStatus)  playerStatus.textContent = 'Playing';
    if (playPauseIcon) playPauseIcon.textContent = '⏸';
  };
  audioElement.onpause = () => {
    if (playerStatus)  playerStatus.textContent = 'Paused';
    if (playPauseIcon) playPauseIcon.textContent = '▶';
  };
  audioElement.onended = () => {
    if (playerStatus)  playerStatus.textContent = 'Ready to replay';
    if (playPauseIcon) playPauseIcon.textContent = '▶';
  };
  audioElement.ontimeupdate = () => {
    const pct = audioElement.duration
      ? (audioElement.currentTime / audioElement.duration) * 100
      : 0;
    if (playerProgress) playerProgress.style.width = `${pct}%`;
    if (currentTimeEl)  currentTimeEl.textContent = formatTime(audioElement.currentTime);
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
  fileInput.value = '';   // allow re-selecting the same file
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
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
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

// ── FIX 1: Drop zone click — GUARD against label/input bubbling ───────────────
//
// The old code was:
//   dropZone.addEventListener('click', () => fileInput.click());
//
// Problem: clicking the <label> fires a native click on fileInput (HTML spec),
// THEN the event bubbles to dropZone, which calls fileInput.click() a SECOND time.
// Two pickers open back-to-back. The first close resets the UI; the second
// open is what the user ends up using — hence "must click twice".
//
// Fix: Only open the picker when the click target IS the drop zone background
// itself (or its icon/text), never when it came from the label or the input.
dropZone.addEventListener('click', e => {
  // If the click came from the label or the hidden input, do nothing —
  // the label already handles opening the picker natively via for="fileInput".
  if (e.target.closest('label') || e.target === fileInput) return;
  fileInput.click();
});

// The label still works via its native for="fileInput" — no JS needed.
// But we must stop its click from bubbling to dropZone (which would call
// fileInput.click() a second time).
if (fileLabel) {
  fileLabel.addEventListener('click', e => e.stopPropagation());
}

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file && isValidAudioFile(file)) showFile(file);
});

removeFileBtn.addEventListener('click', clearFile);

// ── Recording ─────────────────────────────────────────────────────────────────
async function startRecording() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    alert('Microphone access denied. Please allow microphone permissions and try again.');
    return;
  }

  // Use audio/webm — most reliable cross-browser format for MediaRecorder.
  // The server (app.py) converts it to WAV with ffmpeg before librosa reads it.
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : '';   // let browser choose if neither is declared supported

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

// ── Audio player controls ─────────────────────────────────────────────────────
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

// ── Top-3 genre cards ─────────────────────────────────────────────────────────
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

  // Animate bars after layout paint
  requestAnimationFrame(() => requestAnimationFrame(() => {
    top3Container.querySelectorAll('.card-bar').forEach(b => {
      b.style.width = b.dataset.width;
    });
  }));
}

// ── Analyze ───────────────────────────────────────────────────────────────────
async function analyzeAudio() {
  if (!currentAudioFile) return;

  analyzeButton.classList.add('loading');
  analyzeButton.disabled = true;
  loadingSection.classList.add('visible');
  hideResults();

  try {
    const form = new FormData();
    form.append('audio', currentAudioFile);

    const res  = await fetch('http://localhost:5000/predict', { method: 'POST', body: form });
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
      confidenceFill.style.width = `${(top.confidence * 100).toFixed(1)}%`;
      confidenceText.textContent = `${(top.confidence * 100).toFixed(1)}% confidence`;
    }, 300);

    renderTop3(data.predictions);

  } catch (err) {
    console.error(err);
    loadingSection.classList.remove('visible');
    analyzeButton.classList.remove('loading');
    analyzeButton.disabled = false;
    alert('Could not reach the backend. Make sure Flask is running on http://localhost:5000');
  }
}

analyzeButton.addEventListener('click', e => {
  e.preventDefault();
  analyzeAudio();
});

console.log('Genrefy ready 🚀');