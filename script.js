const targetDate = new Date("2026-06-01T00:00:00").getTime(); // nustatoma data, iki kada skaiciuos
const countdownEl = document.getElementById("countdown");

function updateCountdown() {
  const now = new Date().getTime();
  const distance = targetDate - now;

  //jei laikas baigesi
  if (distance <= 0) {
    countdownEl.innerHTML = "🎉 Egzaminai prasidėjo! Sėkmės! 🎉";
    countdownEl.classList.add('pulse');
    clearInterval(interval);
    return;
  }

  //cia boom boom skaiciavimai
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  //cia bbz ka daro 
  countdownEl.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  countdownEl.classList.remove('pulse');
  countdownEl.offsetWidth;
  countdownEl.classList.add('pulse');

  setTimeout(() => countdownEl.classList.remove('pulse'), 420);
}

updateCountdown();
const interval = setInterval(updateCountdown, 1000);

// --- Random sound playback support (gesture-driven, WebAudio fallback) ---

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
  // Grąžina atsitiktinį vėlinimo dydį (ms) tarp `minIntervalMs` ir `maxIntervalMs`.
  // Naudojama nustatyti, po kiek laiko bus paleistas kitas atsitiktinis garsas.
  return Math.floor(Math.random() * (maxIntervalMs - minIntervalMs)) + minIntervalMs;
}

function scheduleNextRandomPlay() {
  // Suplanuoja kitą atsitiktinį garso paleidimą.
  // Jei garsas neįjungtas arba jau yra suplanuotas timeout, nieko nedaro.
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
    // Paruošia Web Audio kontekstą ir nuskaito bei dekoduoja garso failą.
    // Jei dekodavimas pavyksta, tas garso srautas bus saugomas `audioBuffer`.
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
    // Paleidžia garso buferį per Web Audio API.
    // Grąžina `true`, jei reproducavimas pradėtas sėkmingai, kitaip `false`.
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
  // Vykdo vieną garso paleidimą: visų pirma bando WebAudio, o jei jis
  // nepasiruošęs arba nepavyksta, krenta atgal į `HTMLAudio` elemento paleidimą.
  // Po to suplanuoja kitą atsitiktinį paleidimą.
}

// Enable sound after user performs an explicit gesture anywhere on the page.
async function enableSoundFromGesture() {
  if (soundEnabled) return;
  soundEnabled = true;
  // prepare WebAudio and try to resume context (some browsers start suspended)
  // Funkcija įjungiama po vartotojo gesto (pvz., paspaudimo ant nuotraukos).
  // Ji paruošia garso sistemą (WebAudio arba HTMLAudio), bando nedelsiant paleisti garsą
  // ir pradeda planuoti tolimesnius atsitiktinius paleidimus.
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

// Also make the main image a direct control: clicking or pressing Enter/Space on it enables and plays sound.
const surpriseImg = document.getElementById('surprise-img');
if (surpriseImg) {
  surpriseImg.addEventListener('click', (e) => {
    enableSoundFromGesture();
  });
  surpriseImg.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      enableSoundFromGesture();
    }
  });
}

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
