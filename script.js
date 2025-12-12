const targetDate = new Date("2026-06-01T00:00:00").getTime();
const countdownEl = document.getElementById("countdown");

function updateCountdown() {
  const now = new Date().getTime();
  const distance = targetDate - now;

  if (distance <= 0) {
    countdownEl.innerHTML = "🎉 It's June 1st, 2026! 🎉";
    countdownEl.classList.add('pulse');
    clearInterval(interval);
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  countdownEl.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  // brief pulse to draw attention on update
  countdownEl.classList.remove('pulse');
  // trigger reflow so animation can re-run reliably
  // eslint-disable-next-line no-unused-expressions
  countdownEl.offsetWidth;
  countdownEl.classList.add('pulse');

  // remove pulse class after animation completes
  setTimeout(() => countdownEl.classList.remove('pulse'), 420);
}

updateCountdown();
const interval = setInterval(updateCountdown, 1000);

// --- Random sound playback support (gesture-driven, WebAudio fallback) ---
// Place a sound file at project root named `sound.mp3` or update `audioSrc` below.
const audioSrc = 'sound/funny_sound.mp3';
const audioEl = new Audio(audioSrc);
audioEl.preload = 'auto';

let soundEnabled = false; // becomes true after first user gesture
let soundTimeout = null;

// Web Audio API resources
let audioCtx = null;
let audioBuffer = null;

// configurable interval bounds (ms) for random playback
const minIntervalMs = 30 * 1000; // 30 seconds
const maxIntervalMs = 60 * 2 * 1000; // 2 minutes

function getRandomDelayMs() {
  return Math.floor(Math.random() * (maxIntervalMs - minIntervalMs)) + minIntervalMs;
}

function scheduleNextRandomPlay() {
  if (!soundEnabled) return;
  if (soundTimeout) clearTimeout(soundTimeout);
  const delay = getRandomDelayMs();
  // for quicker local testing, set a small delay manually here
  soundTimeout = setTimeout(() => playRandomSound(), delay);
}

async function prepareWebAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // fetch and decode the file
    const resp = await fetch(audioSrc, { cache: 'no-store' });
    if (!resp.ok) throw new Error('Fetch failed: ' + resp.status);
    const arrayBuffer = await resp.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('WebAudio preparation failed:', e);
    audioCtx = null;
    audioBuffer = null;
  }
}

function playViaWebAudio() {
  if (!audioCtx || !audioBuffer) return false;
  try {
    const src = audioCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(audioCtx.destination);
    src.start(0);
    return true;
  } catch (e) {
    console.warn('WebAudio play failed:', e);
    return false;
  }
}

function playRandomSound() {
  if (!soundEnabled) return;
  // Prefer WebAudio if prepared
  if (audioCtx && audioBuffer) {
    const ok = playViaWebAudio();
    if (!ok) {
      // fallback to HTMLAudio
      const p = audioEl.play();
      if (p && typeof p.then === 'function') p.catch((err) => console.warn('Fallback audio failed:', err));
    }
  } else {
    // fallback to HTMLAudio element
    const p = audioEl.play();
    if (p && typeof p.then === 'function') {
      p.catch((err) => {
        console.warn('Audio playback prevented or failed:', err);
        soundEnabled = false;
        if (soundTimeout) { clearTimeout(soundTimeout); soundTimeout = null; }
      });
    }
  }
  // schedule next play
  scheduleNextRandomPlay();
}

// Enable sound after user performs an explicit gesture anywhere on the page.
async function enableSoundFromGesture() {
  if (soundEnabled) return;
  soundEnabled = true;
  // prepare WebAudio and try to resume context (some browsers start suspended)
  await prepareWebAudio();
  if (audioCtx && typeof audioCtx.resume === 'function') {
    try { await audioCtx.resume(); } catch (e) { /* ignore */ }
  }

  // Try immediate play via WebAudio first, then fallback to audioEl
  let played = false;
  if (audioCtx && audioBuffer) {
    played = playViaWebAudio();
  }
  if (!played) {
    try {
      const p = audioEl.play();
      if (p && typeof p.then === 'function') {
        await p;
      }
      played = true;
    } catch (err) {
      console.warn('Initial audio play blocked or failed on gesture:', err);
      soundEnabled = false;
    }
  }

  if (played) scheduleNextRandomPlay();
  removeGestureListeners();
}

function removeGestureListeners() {
  window.removeEventListener('pointerdown', gestureHandler);
  window.removeEventListener('keydown', gestureHandler);
  window.removeEventListener('touchstart', gestureHandler);
}

function gestureHandler() {
  enableSoundFromGesture();
}

// Attach one-time listeners to capture a valid user gesture without showing UI.
window.addEventListener('pointerdown', gestureHandler, { once: true });
window.addEventListener('keydown', gestureHandler, { once: true });
window.addEventListener('touchstart', gestureHandler, { once: true });

// when the countdown finishes, stop any scheduled sound and pause audio
const originalUpdateCountdown = updateCountdown;
function wrappedUpdateCountdown() {
  originalUpdateCountdown();
  const now = Date.now();
  if (targetDate - now <= 0) {
    // countdown ended: stop scheduled sound
    if (soundTimeout) { clearTimeout(soundTimeout); soundTimeout = null; }
    try {
      if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
      if (audioCtx) { audioCtx.suspend && audioCtx.suspend(); }
    } catch (e) { /* ignore */ }
  }
}

// Replace the running interval handler to call the wrapped version
clearInterval(interval);
wrappedUpdateCountdown();
const newInterval = setInterval(wrappedUpdateCountdown, 1000);
