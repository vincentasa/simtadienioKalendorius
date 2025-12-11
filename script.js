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
