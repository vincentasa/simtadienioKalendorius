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

// --- Random sound playback support (gesture-driven, no visible button) ---
// Place a sound file at project root named `sound.mp3` or update `audioSrc` below.
const audioSrc = 'sound/funny_sound.mp3';
const audioEl = new Audio(audioSrc);
audioEl.preload = 'auto';

let soundEnabled = false; // becomes true after first user gesture
let soundTimeout = null;

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
  soundTimeout = setTimeout(() => {
    playRandomSound();
  }, delay);
}

function playRandomSound() {
  if (!soundEnabled) return;
  const p = audioEl.play();
  if (p && typeof p.then === 'function') {
    p.catch((err) => {
      // Playback blocked — disable scheduling until next gesture
      console.warn('Audio playback prevented or failed:', err);
      soundEnabled = false;
      if (soundTimeout) { clearTimeout(soundTimeout); soundTimeout = null; }
    });
  }
  // schedule next one regardless (scheduleNextRandomPlay will only act if enabled)
  scheduleNextRandomPlay();
}

// Enable sound after user performs an explicit gesture anywhere on the page.
function enableSoundFromGesture() {
  if (soundEnabled) return;
  soundEnabled = true;
  // Try a short immediate play to satisfy autoplay policy and reveal any errors early
  // If the file is long, it's up to the user to provide a short clip.
  const p = audioEl.play();
  if (p && typeof p.then === 'function') {
    p.then(() => {
      // started — schedule next random play
      scheduleNextRandomPlay();
    }).catch((err) => {
      console.warn('Audio play blocked on gesture:', err);
      soundEnabled = false;
    });
  } else {
    // synchronous play attempt (old browsers) — schedule next
    scheduleNextRandomPlay();
  }
  // remove the gesture listeners after enabling
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
    try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) { /* ignore */ }
  }
}

// Replace the running interval handler to call the wrapped version
clearInterval(interval);
wrappedUpdateCountdown();
const newInterval = setInterval(wrappedUpdateCountdown, 1000);
