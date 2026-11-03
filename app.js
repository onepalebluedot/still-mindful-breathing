const $ = id => document.getElementById(id);
const storageKey = 'still-breathing-history-v1';
let history = {};
try { history = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (_) { history = {}; }
let minutes = 5, elapsed = 0, startedAt = 0, running = false, interval;
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
function controls() { $('start').innerHTML = running ? 'Pause session <span>Ⅱ</span>' : elapsed ? 'Resume breathing <span>↗</span>' : 'Begin breathing <span>↗</span>'; $('reset').hidden = !running && !elapsed; document.querySelectorAll('[data-minutes]').forEach(b => { b.disabled = running || elapsed > 0; b.classList.toggle('selected', +b.dataset.minutes === minutes); b.setAttribute('aria-pressed', String(+b.dataset.minutes === minutes)); }); }
function reset() { running = false; elapsed = 0; clearInterval(interval); $('orb').className = 'breath-orb'; $('phase').textContent = 'Ready?'; $('phase-detail').textContent = 'Your time starts when you do'; $('timer-caption').textContent = 'CHOOSE YOUR MOMENT'; controls(); draw(); }
function complete() { running = false; clearInterval(interval); elapsed = 0; const key = dayKey(new Date()); history[key] = (history[key] || 0) + 1; try { localStorage.setItem(storageKey, JSON.stringify(history)); } catch (_) { $('progress-caption').textContent = 'Your browser could not save this session.'; } renderHistory(); controls(); $('timer').textContent = '00:00'; $('timer-caption').textContent = 'SESSION COMPLETE'; $('orb').className = 'breath-orb'; $('phase').textContent = 'Well done'; $('phase-detail').textContent = 'Thank you for taking this time'; }
$('start').addEventListener('click', () => { if (running) { elapsed += (Date.now()-startedAt)/1000; running = false; clearInterval(interval); $('orb').className = 'breath-orb'; $('phase').textContent = 'Paused'; $('phase-detail').textContent = 'Take your time'; $('timer-caption').textContent = 'SESSION PAUSED'; } else { running = true; startedAt = Date.now(); $('timer-caption').textContent = 'TIME REMAINING'; draw(); interval = setInterval(draw, 100); } controls(); });
$('reset').addEventListener('click', reset);
document.querySelectorAll('[data-minutes]').forEach(b => b.addEventListener('click', () => { minutes = +b.dataset.minutes; reset(); }));
document.addEventListener('visibilitychange', () => { if (running) draw(); });
renderHistory(); controls(); draw();
