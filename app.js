// ============================================================
// Read It To Me — main application logic
// ============================================================

const STORAGE_KEYS = {
  speed: 'ritm.speed',
  queue: 'ritm.queue'
};

// CORS proxies — tried in order. If one fails or returns an empty page we
// move to the next. All are free and anonymous.
const CORS_PROXIES = [
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`
];

// ------------------------------------------------------------
// State
// ------------------------------------------------------------
const state = {
  queue: [],          // [{ id, url, title, source, language, article, readingMinutes, status }]
  currentId: null,
  view: 'home',
  // Playback
  speed: 1.5,
  chunks: [],         // string[]
  chunkIndex: 0,
  playing: false,
  paused: false,
  finished: false,
  currentUtterance: null
};

// ------------------------------------------------------------
// DOM helpers
// ------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showView(name) {
  state.view = name;
  $('#view-home').hidden = name !== 'home';
  $('#view-player').hidden = name !== 'player';
  $('#view-settings').hidden = name !== 'settings';
  $('#view-queue').hidden = name !== 'queue';
  window.scrollTo(0, 0);
}

function toast(msg, ms = 2400) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, ms);
}

function setStatus(phase, text) {
  const dot = $('#status-dot');
  dot.className = 'dot ' + phase;
  $('#status-text').textContent = text;
}

function setProgress(pct) {
  $('#progress-bar').style.width = Math.max(0, Math.min(100, pct)) + '%';
}

function updateQueueBadge() {
  const badge = $('#queue-badge');
  const count = state.queue.length;
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

// ------------------------------------------------------------
// Persistence
// ------------------------------------------------------------
function loadSettings() {
  state.speed = parseFloat(localStorage.getItem(STORAGE_KEYS.speed) || '1.5');
  $('#default-speed').value = String(state.speed);
  highlightSpeed(state.speed);
}

function saveSettings() {
  const speed = parseFloat($('#default-speed').value);
  localStorage.setItem(STORAGE_KEYS.speed, String(speed));
  state.speed = speed;
  highlightSpeed(speed);
  toast('Settings saved');
}

function loadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.queue);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) state.queue = parsed;
  } catch (e) {}
}

function saveQueue() {
  localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(state.queue));
  updateQueueBadge();
}

// ------------------------------------------------------------
// Queue & articles
// ------------------------------------------------------------
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function hostnameOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

function addArticle(url) {
  url = (url || '').trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try { new URL(url); } catch { toast('Invalid URL'); return null; }

  const existing = state.queue.find((a) => a.url === url);
  if (existing) {
    toast('Already in queue');
    return existing;
  }

  const article = {
    id: uid(),
    url,
    title: url,
    source: hostnameOf(url),
    language: null,
    article: null,
    readingMinutes: null,
    status: 'pending'
  };
  state.queue.push(article);
  saveQueue();
  renderQueues();
  return article;
}

function removeArticle(id) {
  const idx = state.queue.findIndex((a) => a.id === id);
  if (idx === -1) return;
  state.queue.splice(idx, 1);
  if (state.currentId === id) {
    stopPlayback();
    state.currentId = null;
  }
  saveQueue();
  renderQueues();
}

function findArticle(id) {
  return state.queue.find((a) => a.id === id);
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
function renderQueues() {
  renderQueueList($('#home-queue'), true);
  renderQueueList($('#queue-list'), false);
  $('#empty-queue').hidden = state.queue.length > 0;
  $('#queue-empty').hidden = state.queue.length > 0;
  updateQueueBadge();
}

function renderQueueList(ul, compact) {
  ul.innerHTML = '';
  for (const item of state.queue) {
    const li = document.createElement('li');
    li.className = 'queue-item' + (item.id === state.currentId ? ' active' : '');

    const main = document.createElement('div');
    main.className = 'qi-main';
    main.innerHTML = `
      <div class="qi-source">${escapeHtml(item.source || '')}</div>
      <div class="qi-title">${escapeHtml(item.title || item.url)}</div>
      <div class="qi-meta">${item.readingMinutes ? item.readingMinutes + ' min read · ' : ''}${escapeHtml(statusLabel(item))}</div>
    `;
    main.addEventListener('click', () => openArticle(item.id));

    const rm = document.createElement('button');
    rm.className = 'qi-remove';
    rm.setAttribute('aria-label', 'Remove');
    rm.textContent = '✕';
    rm.addEventListener('click', (e) => { e.stopPropagation(); removeArticle(item.id); });

    li.appendChild(main);
    li.appendChild(rm);
    ul.appendChild(li);
  }
}

function statusLabel(item) {
  if (item.id === state.currentId && state.playing) return state.paused ? 'Paused' : 'Playing';
  if (item.status === 'pending') return 'Ready';
  if (item.status === 'loading') return 'Loading…';
  if (item.status === 'ready') return 'Ready';
  if (item.status === 'error') return 'Error';
  return '';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ------------------------------------------------------------
// Open article → fetch & process if needed → switch to player
// ------------------------------------------------------------
async function openArticle(id) {
  const article = findArticle(id);
  if (!article) return;
  stopPlayback();
  state.currentId = id;
  showView('player');
  renderPlayer(article);

  if (!article.article) {
    await processArticle(article);
  } else {
    setStatus('idle', 'Ready');
    setProgress(0);
  }
}

function renderPlayer(article) {
  $('#article-source').textContent = article.source || '';
  $('#article-title').textContent = article.title || article.url;
  $('#article-reading-time').textContent = article.readingMinutes ? article.readingMinutes + ' min read' : '';
  $('#article-lang').textContent = article.language ? article.language.toUpperCase() : '';
  $('#article-text').textContent = article.article || '';
}

// ------------------------------------------------------------
// Fetch & extract via Claude
// ------------------------------------------------------------
async function processArticle(article) {
  article.status = 'loading';
  renderQueues();
  setStatus('loading', 'Fetching article…');
  setProgress(10);

  let html;
  try {
    html = await fetchViaProxies(article.url);
  } catch (err) {
    console.error('[ritm] fetch failed:', err);
    article.status = 'error';
    setStatus('error', 'Could not load page');
    toast(err.message || 'Could not fetch article');
    renderQueues();
    return;
  }

  setStatus('summarizing', 'Extracting main text…');
  setProgress(50);

  let extracted;
  try {
    extracted = extractWithReadability(html, article.url);
  } catch (err) {
    console.error(err);
    article.status = 'error';
    setStatus('error', 'Could not parse article');
    toast('Could not extract article text');
    renderQueues();
    return;
  }

  if (!extracted || !extracted.article || extracted.article.length < 200) {
    article.status = 'error';
    setStatus('error', 'No article text found');
    toast('Couldn\'t find readable article content on this page');
    renderQueues();
    return;
  }

  article.title = extracted.title || article.title;
  article.source = extracted.source || hostnameOf(article.url);
  article.language = (extracted.language || 'en').toLowerCase().slice(0, 5);
  article.article = extracted.article;
  article.readingMinutes = Math.max(1, Math.round((article.article.split(/\s+/).length || 1) / 220));
  article.status = 'ready';

  saveQueue();
  renderQueues();
  renderPlayer(article);
  setStatus('idle', 'Ready to play');
  setProgress(0);

  playArticle(article);
}

async function fetchViaProxies(url) {
  const errors = [];
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyUrl = CORS_PROXIES[i](url);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      const resp = await fetch(proxyUrl, { redirect: 'follow', signal: ctrl.signal });
      clearTimeout(timer);
      if (!resp.ok) { errors.push(`proxy ${i + 1}: HTTP ${resp.status}`); continue; }
      const text = await resp.text();
      if (!text || text.length < 500) {
        errors.push(`proxy ${i + 1}: empty response (${text.length} bytes)`);
        continue;
      }
      console.log(`[ritm] fetched via proxy ${i + 1} (${text.length} bytes)`);
      return text;
    } catch (err) {
      errors.push(`proxy ${i + 1}: ${err.message || err.name}`);
    }
  }
  throw new Error('All proxies failed — ' + errors.join('; '));
}

function extractWithReadability(html, sourceUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Give Readability a <base> so relative links resolve, and snapshot language
  // from the source document before Readability clones it.
  if (!doc.querySelector('base')) {
    const base = doc.createElement('base');
    base.href = sourceUrl;
    doc.head && doc.head.prepend(base);
  }
  const htmlLang = (doc.documentElement.getAttribute('lang') || '').trim();
  const metaLang = (doc.querySelector('meta[http-equiv="content-language" i]') || {}).content || '';
  const ogSite = (doc.querySelector('meta[property="og:site_name"]') || {}).content || '';

  const reader = new Readability(doc, { charThreshold: 300 });
  const result = reader.parse();
  if (!result) return null;

  const text = cleanupText(result.textContent || '');
  const lang = (result.lang || htmlLang || metaLang || detectLangHeuristic(text) || 'en').slice(0, 5);

  return {
    title: result.title || '',
    source: ogSite || result.siteName || hostnameOf(sourceUrl),
    language: lang,
    article: text
  };
}

function cleanupText(s) {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Very rough language guess from stopword frequency — only used when the page
// sets no lang attribute at all. Good enough to distinguish a handful of
// common languages; defaults to English if nothing matches.
function detectLangHeuristic(text) {
  const sample = (' ' + text.toLowerCase().slice(0, 2000) + ' ');
  const hits = (pattern) => (sample.match(pattern) || []).length;
  const scores = {
    pt: hits(/\b(de|para|não|com|uma|que|dos|das|pelo|pela|você)\b/g),
    es: hits(/\b(de|para|no|con|una|que|los|las|por|del|usted)\b/g),
    en: hits(/\b(the|and|of|to|in|that|with|for|this|you)\b/g),
    fr: hits(/\b(le|la|de|et|un|une|que|avec|pour|dans|vous)\b/g),
    it: hits(/\b(il|la|di|e|un|una|che|con|per|nel|voi)\b/g),
    de: hits(/\b(der|die|das|und|ist|mit|für|nicht|auf|sie)\b/g)
  };
  let best = 'en', bestScore = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v > bestScore) { best = k; bestScore = v; }
  }
  return bestScore > 3 ? best : 'en';
}

// ------------------------------------------------------------
// Playback (Web Speech API)
// ------------------------------------------------------------
function splitIntoChunks(text) {
  if (!text) return [];
  // Split on sentence boundaries; keep chunks under ~220 chars for mobile stability.
  const parts = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+|(?<=[。！？])/g)
    .filter(Boolean);
  const chunks = [];
  let buf = '';
  for (const s of parts) {
    if ((buf + ' ' + s).trim().length > 220) {
      if (buf) chunks.push(buf.trim());
      buf = s;
    } else {
      buf = buf ? buf + ' ' + s : s;
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks;
}

let voices = [];
function refreshVoices() {
  voices = window.speechSynthesis.getVoices() || [];
}
if ('speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

function pickVoice(lang) {
  if (!voices.length) refreshVoices();
  if (!voices.length || !lang) return null;
  const l = lang.toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(l)) ||
         voices.find((v) => v.lang.toLowerCase().slice(0, 2) === l.slice(0, 2)) ||
         null;
}

function playArticle(article) {
  if (!article || !article.article) return;
  state.chunks = splitIntoChunks(article.article);
  state.chunkIndex = 0;
  startSpeaking(article);
}

function startSpeaking(article) {
  if (!('speechSynthesis' in window)) {
    toast('Text-to-speech not supported on this device');
    return;
  }
  window.speechSynthesis.cancel();
  state.playing = true;
  state.paused = false;
  state.finished = false;
  setPlayIcon(true);
  setStatus('playing', 'Reading article');
  speakNextChunk(article);
}

function speakNextChunk(article) {
  if (!state.playing) return;
  if (state.chunkIndex >= state.chunks.length) {
    onPhaseEnd();
    return;
  }
  const text = state.chunks[state.chunkIndex];
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(article.language);
  if (v) u.voice = v;
  u.lang = (v && v.lang) || article.language || 'en-US';
  u.rate = state.speed;
  u.pitch = 1.0;
  u.onend = () => {
    state.chunkIndex += 1;
    updateProgress();
    speakNextChunk(article);
  };
  u.onerror = (e) => {
    console.warn('TTS error', e);
    state.chunkIndex += 1;
    speakNextChunk(article);
  };
  state.currentUtterance = u;
  window.speechSynthesis.speak(u);
  updateProgress();
}

function updateProgress() {
  if (!state.chunks.length) { setProgress(0); return; }
  const pct = (state.chunkIndex / state.chunks.length) * 100;
  setProgress(pct);
}

function onPhaseEnd() {
  // Guard against double-fire (Chrome's speechSynthesis occasionally emits a
  // stray onend after playback has already ended).
  if (state.finished) return;
  state.playing = false;
  state.paused = false;
  state.finished = true;
  setPlayIcon(false);
  setProgress(100);
  setStatus('idle', 'Finished');
}

function togglePlayPause() {
  const article = findArticle(state.currentId);
  if (!article) return;
  if (!state.playing) {
    playArticle(article);
    return;
  }
  if (state.paused) {
    window.speechSynthesis.resume();
    state.paused = false;
    setPlayIcon(true);
    setStatus('playing', 'Reading article');
  } else {
    window.speechSynthesis.pause();
    state.paused = true;
    setPlayIcon(false);
    setStatus('paused', 'Paused');
  }
}

function stopPlayback() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  state.playing = false;
  state.paused = false;
  state.finished = true;
  state.chunks = [];
  state.chunkIndex = 0;
  setPlayIcon(false);
  setProgress(0);
  setStatus('idle', 'Stopped');
}

function setPlayIcon(isPlaying) {
  $('#icon-play').hidden = isPlaying;
  $('#icon-pause').hidden = !isPlaying;
}

function highlightSpeed(s) {
  $$('.speed-btn').forEach((b) => {
    b.classList.toggle('active', parseFloat(b.dataset.speed) === parseFloat(s));
  });
}

function setSpeed(s) {
  state.speed = parseFloat(s);
  localStorage.setItem(STORAGE_KEYS.speed, String(state.speed));
  highlightSpeed(state.speed);
  // Restart current chunk at new speed
  if (state.playing && !state.paused) {
    const article = findArticle(state.currentId);
    if (article) {
      window.speechSynthesis.cancel();
      speakNextChunk(article);
    }
  }
}

function playPrev() {
  const idx = state.queue.findIndex((a) => a.id === state.currentId);
  if (idx > 0) openArticle(state.queue[idx - 1].id);
}

function playNext() {
  const idx = state.queue.findIndex((a) => a.id === state.currentId);
  if (idx !== -1 && idx < state.queue.length - 1) openArticle(state.queue[idx + 1].id);
}

// ------------------------------------------------------------
// Event wiring
// ------------------------------------------------------------
function wire() {
  $('#btn-settings').addEventListener('click', () => showView('settings'));
  $('#btn-close-settings').addEventListener('click', () => showView('home'));
  $('#btn-save-settings').addEventListener('click', saveSettings);
  $('#btn-clear-queue').addEventListener('click', () => {
    if (!confirm('Clear the entire queue?')) return;
    stopPlayback();
    state.queue = [];
    state.currentId = null;
    saveQueue();
    renderQueues();
    toast('Queue cleared');
  });

  $('#btn-queue').addEventListener('click', () => { renderQueues(); showView('queue'); });
  $('#btn-queue-back').addEventListener('click', () => showView(state.currentId ? 'player' : 'home'));
  $('#btn-back').addEventListener('click', () => showView('home'));

  $('#btn-add-url').addEventListener('click', () => {
    const url = $('#url-input').value;
    const a = addArticle(url);
    if (a) {
      $('#url-input').value = '';
      openArticle(a.id);
    }
  });
  $('#url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-add-url').click();
  });

  $('#btn-playpause').addEventListener('click', togglePlayPause);
  $('#btn-stop').addEventListener('click', stopPlayback);
  $('#btn-prev').addEventListener('click', playPrev);
  $('#btn-next').addEventListener('click', playNext);
  $('#btn-replay-article').addEventListener('click', () => {
    const a = findArticle(state.currentId);
    if (a && a.article) { stopPlayback(); playArticle(a); }
  });

  $$('.speed-btn').forEach((b) => {
    b.addEventListener('click', () => setSpeed(b.dataset.speed));
  });

  // Keep TTS alive when the tab is active; stop when hidden on mobile to avoid ghost audio
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.playing && !state.paused) {
      // Most mobile browsers will pause automatically; nothing to do.
    }
  });
}

// ------------------------------------------------------------
// Share target handler
// ------------------------------------------------------------
function handleShareTarget() {
  const params = new URLSearchParams(location.search);
  const candidates = [params.get('url'), params.get('text'), params.get('title')].filter(Boolean);
  let shared = null;
  for (const c of candidates) {
    const m = c.match(/https?:\/\/\S+/);
    if (m) { shared = m[0].replace(/[)\].,;!?]+$/, ''); break; }
  }
  if (shared) {
    const a = addArticle(shared);
    // Clean the URL so refresh doesn't re-add
    history.replaceState({}, '', location.pathname);
    if (a) openArticle(a.id);
  }
}

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
function boot() {
  wire();
  loadSettings();
  loadQueue();
  renderQueues();
  showView('home');

  handleShareTarget();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('sw.js', { updateViaCache: 'none' })
        .catch((err) => console.warn('SW register failed', err));
    });
  }
}

document.addEventListener('DOMContentLoaded', boot);
