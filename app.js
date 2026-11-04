const $ = id => document.getElementById(id);
const storageKey = 'still-breathing-history-v1';
let history = {};
try { history = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (_) { history = {}; }
let minutes = 5, elapsed = 0, startedAt = 0, running = false, interval;
let audioContext, scheduledSounds = [], soundOn = true;
try { soundOn = localStorage.getItem('still-sound') !== 'off'; } catch (_) {}
function savePreference(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
function setTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('theme-toggle').setAttribute('aria-pressed', String(dark));
  $('theme-toggle').setAttribute('aria-label', dark ? 'Enable light theme' : 'Enable dark theme');
  $('theme-toggle').innerHTML = dark ? '☀ <span>Day mode</span>' : '☾ <span>Night mode</span>';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#000000' : '#f5f5ef';
}
try { setTheme(localStorage.getItem('still-theme') === 'dark'); } catch (_) { setTheme(false); }
function updateSoundButton() {
  $('sound-toggle').setAttribute('aria-pressed', String(soundOn));
  $('sound-toggle').innerHTML = soundOn ? '♪ <span>Sound on</span>' : '♪ <span>Sound off</span>';
  $('sound-test').disabled = !soundOn || running;
  if (!soundOn) $('sound-status').textContent = ''; 
}
function setAudioSession(type) {
  try { if (navigator.audioSession) navigator.audioSession.type = type; } catch (_) {}
}
function createAudioContext() {
  setAudioSession('playback');
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) throw new Error('Audio is not supported in this browser.');
  audioContext ||= new Audio();
  if (audioContext.state !== 'running') {
    audioContext.resume().then(() => {
      if (audioContext.state !== 'running') $('sound-status').textContent = 'Audio is paused. Check your phone’s sound settings.';
    }).catch(() => { $('sound-status').textContent = 'Audio could not start. Check your phone’s sound settings.'; });
  }
  return audioContext;
}
function playTone(context, at, frequency, duration = 0.7) {
  const oscillator = context.createOscillator(), gain = context.createGain();
  oscillator.type = 'sine'; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.22, at + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.start(at); oscillator.stop(at + duration);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  return oscillator;
}
function stopSounds() {
  for (const node of scheduledSounds) { try { node.stop(); } catch (_) {} node.disconnect(); }
  scheduledSounds = [];
  setAudioSession('auto');
}
function scheduleSounds() {
  stopSounds();
  if (!soundOn || !running) return;
  try {
    createAudioContext();
    $('sound-status').textContent = ''; 
    const position = Math.min(minutes * 60, elapsed + (Date.now() - startedAt) / 1000);
    const now = audioContext.currentTime;
    function tone(at, frequency, duration = 0.7) { scheduledSounds.push(playTone(audioContext, at, frequency, duration)); }
    // Cue the current phase immediately, then schedule each remaining boundary.
    tone(now + 0.02, position % 10 < 4 ? 523.25 : 392);
    for (let cycle = Math.floor(position / 10) * 10; cycle < minutes * 60; cycle += 10) {
      for (const [boundary, frequency] of [[cycle, 523.25], [cycle + 4, 392]]) {
        if (boundary > position + 0.05 && boundary < minutes * 60) tone(now + boundary - position, frequency);
      }
    }
    const end = now + minutes * 60 - position;
    tone(end, 523.25); tone(end + 0.75, 659.25, 1);
    const lastTone = scheduledSounds[scheduledSounds.length - 1];
    lastTone.addEventListener('ended', () => { if (!running) setAudioSession('auto'); }, { once: true });
  } catch (_) { setAudioSession('auto'); $('sound-status').textContent = 'Audio could not start. Check your phone’s sound settings.'; }
}
$('theme-toggle').addEventListener('click', () => { const dark = document.documentElement.dataset.theme !== 'dark'; setTheme(dark); savePreference('still-theme', dark ? 'dark' : 'light'); });
$('sound-test').addEventListener('click', () => {
  try {
    const context = createAudioContext(), now = context.currentTime;
    playTone(context, now + 0.05, 523.25);
    const lastTone = playTone(context, now + 1, 392);
    lastTone.addEventListener('ended', () => { if (!running) setAudioSession('auto'); }, { once: true });
    $('sound-status').textContent = 'Listen for two tones: higher for in, lower for out.';
  } catch (_) { setAudioSession('auto'); $('sound-status').textContent = 'Audio could not start. Check your phone’s sound settings.'; }
});
$('sound-toggle').addEventListener('click', () => { soundOn = !soundOn; savePreference('still-sound', soundOn ? 'on' : 'off'); updateSoundButton(); if (running) scheduleSounds(); });
updateSoundButton();
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function renderHistory() {
  const today = new Date(), count = history[dayKey(today)] || 0;
  $('today-count').innerHTML = `${count} <small>/ 3</small>`;
  [...$('progress-dots').children].forEach((dot, i) => dot.classList.toggle('done', i < count));
  $('progress-caption').textContent = count >= 3 ? 'Your daily goal is complete. Beautifully done.' : count === 0 ? 'Your first pause is waiting for you.' : `${3-count} more ${3-count === 1 ? 'pause' : 'pauses'} to reach your daily goal.`;
  $('week-days').replaceChildren();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate()-i), n = history[dayKey(date)] || 0;
    const day = document.createElement('div'); day.className = 'day';
    const label = document.createElement('div'); label.className = 'day-label'; label.textContent = date.toLocaleDateString(undefined, {weekday:'short'}).slice(0,1);
    const circle = document.createElement('div'); circle.className = `day-circle ${n >= 3 ? 'full' : n > 0 ? 'some' : ''} ${i === 0 ? 'today' : ''}`; circle.textContent = n >= 3 ? '✓' : date.getDate(); circle.setAttribute('aria-label', `${date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}: ${n} sessions`);
    day.append(label,circle); $('week-days').append(day);
  }
}
function formatTime(seconds) { const n = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }
function draw() {
  const total = minutes * 60, current = Math.min(total, elapsed + (running ? (Date.now()-startedAt)/1000 : 0));
  $('timer').textContent = formatTime(total-current);
  if (running && current >= total) { complete(); return; }
  if (running) { const inhale = current % 10 < 4; $('orb').className = `breath-orb ${inhale ? 'inhale' : 'exhale'}`; $('phase').textContent = inhale ? 'Breathe in' : 'Breathe out'; $('phase-detail').textContent = inhale ? 'Gently fill your lungs' : 'Slowly let it go'; }
}
function controls() { updateSoundButton(); $('start').innerHTML = running ? 'Pause session <span>Ⅱ</span>' : elapsed ? 'Resume breathing <span>↗</span>' : 'Begin breathing <span>↗</span>'; $('reset').hidden = !running && !elapsed; document.querySelectorAll('[data-minutes]').forEach(b => { b.disabled = running || elapsed > 0; b.classList.toggle('selected', +b.dataset.minutes === minutes); b.setAttribute('aria-pressed', String(+b.dataset.minutes === minutes)); }); }
function reset() { stopSounds(); running = false; elapsed = 0; clearInterval(interval); $('orb').className = 'breath-orb'; $('phase').textContent = 'Ready?'; $('phase-detail').textContent = 'Your time starts when you do'; $('timer-caption').textContent = 'CHOOSE YOUR MOMENT'; controls(); draw(); }
function complete() { running = false; clearInterval(interval); elapsed = 0; const key = dayKey(new Date()); history[key] = (history[key] || 0) + 1; try { localStorage.setItem(storageKey, JSON.stringify(history)); } catch (_) { $('progress-caption').textContent = 'Your browser could not save this session.'; } renderHistory(); controls(); $('timer').textContent = '00:00'; $('timer-caption').textContent = 'SESSION COMPLETE'; $('orb').className = 'breath-orb'; $('phase').textContent = 'Well done'; $('phase-detail').textContent = 'Thank you for taking this time'; }
$('start').addEventListener('click', () => { if (running) { elapsed += (Date.now()-startedAt)/1000; running = false; stopSounds(); clearInterval(interval); $('orb').className = 'breath-orb'; $('phase').textContent = 'Paused'; $('phase-detail').textContent = 'Take your time'; $('timer-caption').textContent = 'SESSION PAUSED'; } else { running = true; startedAt = Date.now(); $('timer-caption').textContent = 'TIME REMAINING'; scheduleSounds(); draw(); interval = setInterval(draw, 100); } controls(); });
$('reset').addEventListener('click', reset);
document.querySelectorAll('[data-minutes]').forEach(b => b.addEventListener('click', () => { minutes = +b.dataset.minutes; reset(); }));
document.addEventListener('visibilitychange', () => { if (running) draw(); });
renderHistory(); controls(); draw();
