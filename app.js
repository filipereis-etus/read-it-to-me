// ============================================================
// Read It To Me — main application logic
// ============================================================

const STORAGE_KEYS = {
  speed: 'ritm.speed',
  queue: 'ritm.queue',
  lastId: 'ritm.lastId'
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
  currentUtterance: null,
  wakeLock: null
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
    status: 'pending',
    resumeIndex: 0,
    totalChunks: 0
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
  localStorage.setItem(STORAGE_KEYS.lastId, id);
  showView('player');
  renderPlayer(article);

  if (!article.article) {
    await processArticle(article);
  } else if (article.resumeIndex > 0 && article.totalChunks > 0) {
    setStatus('paused', 'Paused — tap play to resume');
    setProgress((article.resumeIndex / article.totalChunks) * 100);
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
  article.article = trimExtras(extracted.article);
  article.readingMinutes = Math.max(1, Math.round((article.article.split(/\s+/).length || 1) / 220));
  article.totalChunks = splitIntoChunks(article.article).length;
  article.resumeIndex = 0;
  article.status = 'ready';

  saveQueue();
  renderQueues();
  renderPlayer(article);
  setStatus('idle', 'Ready to play');
  setProgress(0);

  playArticle(article);
}

// Strip boilerplate that Readability tends to keep: author bios at the tail,
// image captions, share/subscribe prompts, "read also" links, photo credits.
function trimExtras(text) {
  if (!text) return '';
  const lines = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const junkLine = /^(advertisement|sponsored|subscribe|sign up|follow us|share this|share on|click here|read more|read also|read next|related articles?|continue reading|you may also like|more from|trending|most read|newsletter|join our|support (our|us)|(photo|image|picture|illustration) (by|credit|caption)|getty images|reuters|associated press|copyright ©)/i;
  const captionLine = /^(photo|image|picture|illustration|figure|file photo|stock photo)[:.]/i;
  const creditLine = /^(credit|source|via)[:.]\s/i;
  const authorBio = /^(about the author|the author is|.{0,60} is (a|an|the) (journalist|reporter|writer|editor|correspondent|columnist|contributor|analyst))/i;

  let cutIndex = lines.length;
  for (let i = Math.max(0, lines.length - 6); i < lines.length; i++) {
    if (authorBio.test(lines[i])) { cutIndex = i; break; }
  }

  return lines
    .slice(0, cutIndex)
    .filter((p) => {
      if (junkLine.test(p)) return false;
      if (captionLine.test(p)) return false;
      if (creditLine.test(p)) return false;
      // Short paragraphs without sentence punctuation are usually captions or UI chrome
      if (p.length < 60 && !/[.!?…]$/.test(p) && !/[.!?…]\s/.test(p)) return false;
      return true;
    })
    .join('\n\n')
    .trim();
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
// Chunk by paragraph so we stay on natural prose boundaries; split a long
// paragraph at sentence boundaries only when it exceeds MAX. Larger chunks =
// fewer utterance restarts = smoother, less-stuttered reading.
function splitIntoChunks(text) {
  if (!text) return [];
  const MAX = 500;
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const chunks = [];
  for (const p of paragraphs) {
    if (p.length <= MAX) { chunks.push(p); continue; }
    const sentences = p.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý0-9"'“‘])|(?<=[。！？])/g).filter(Boolean);
    let buf = '';
    for (const s of sentences) {
      if ((buf + ' ' + s).trim().length > MAX && buf) {
        chunks.push(buf.trim());
        buf = s;
      } else {
        buf = buf ? buf + ' ' + s : s;
      }
    }
    if (buf) chunks.push(buf.trim());
  }
  return chunks;
}

// Pre-process text before handing to the TTS engine. Targets the engine's
// biggest pain points: unpunctuated dashes, straight-quoted typography,
// abbreviations that get spelled letter-by-letter.
function prepareForSpeech(text) {
  return text
    .replace(/[—–]\s*/g, ', ')
    .replace(/…/g, '. ')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\bU\.S\.A?\.?\b/g, 'USA')
    .replace(/\bU\.K\.\b/g, 'UK')
    .replace(/\bE\.U\.\b/g, 'EU')
    .replace(/\bU\.N\.\b/g, 'UN')
    .replace(/\be\.g\./gi, 'for example')
    .replace(/\bi\.e\./gi, 'that is')
    .replace(/\betc\./gi, 'etcetera')
    .replace(/\bvs\./gi, 'versus')
    .replace(/\s+/g, ' ')
    .trim();
}

let voices = [];
function refreshVoices() {
  voices = window.speechSynthesis.getVoices() || [];
}
if ('speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

// Prefer higher-quality voices when the device has them installed. On Android
// that usually means a Google "natural" or "neural" voice — far less robotic
// than the default. Falls back to any matching-language voice.
function pickVoice(lang) {
  if (!voices.length) refreshVoices();
  if (!voices.length || !lang) return null;
  const base = lang.toLowerCase().slice(0, 2);
  const matches = voices.filter((v) => v.lang.toLowerCase().slice(0, 2) === base);
  if (!matches.length) return null;

  const score = (v) => {
    let s = 0;
    const name = (v.name || '').toLowerCase();
    if (/neural|natural|wavenet|premium|enhanced|studio/.test(name)) s += 10;
    if (/google/.test(name)) s += 3;
    if (v.localService === false) s += 1;
    if (v.lang.toLowerCase() === lang.toLowerCase()) s += 2;
    if (v.default) s += 1;
    return s;
  };
  return matches.slice().sort((a, b) => score(b) - score(a))[0];
}

function playArticle(article, opts = {}) {
  if (!article || !article.article) return;
  state.chunks = splitIntoChunks(article.article);
  article.totalChunks = state.chunks.length;
  const fromStart = opts.fromStart === true;
  state.chunkIndex = fromStart ? 0 : Math.min(article.resumeIndex || 0, Math.max(0, state.chunks.length - 1));
  startSpeaking(article);
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { state.wakeLock = await navigator.wakeLock.request('screen'); }
  catch (e) { /* denied or throttled — not fatal */ }
}

function releaseWakeLock() {
  if (state.wakeLock) {
    state.wakeLock.release().catch(() => {});
    state.wakeLock = null;
  }
}

function setMediaSession(article) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: article.title || 'Article',
      artist: article.source || '',
      album: 'Read It To Me'
    });
    navigator.mediaSession.setActionHandler('play', () => { if (!state.playing || state.paused) togglePlayPause(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (state.playing && !state.paused) togglePlayPause(); });
    navigator.mediaSession.setActionHandler('stop', () => stopPlayback());
  } catch (e) {}
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
  setMediaSession(article);
  requestWakeLock();
  speakNextChunk(article);
}

function speakNextChunk(article) {
  if (!state.playing) return;
  if (state.chunkIndex >= state.chunks.length) {
    onPhaseEnd(article);
    return;
  }
  const text = prepareForSpeech(state.chunks[state.chunkIndex]);
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(article.language);
  if (v) u.voice = v;
  u.lang = (v && v.lang) || article.language || 'en-US';
  u.rate = state.speed;
  u.pitch = 1.0;
  u.onend = () => {
    state.chunkIndex += 1;
    persistResume(article);
    updateProgress();
    speakNextChunk(article);
  };
  u.onerror = (e) => {
    console.warn('TTS error', e);
    // Cancellations (e.g. Chrome backgrounding) shouldn't skip a chunk; only
    // real errors should move past the current one.
    if (e.error && e.error !== 'canceled' && e.error !== 'interrupted') {
      state.chunkIndex += 1;
      persistResume(article);
    }
    if (state.playing) speakNextChunk(article);
  };
  state.currentUtterance = u;
  window.speechSynthesis.speak(u);
  updateProgress();
}

function persistResume(article) {
  article.resumeIndex = state.chunkIndex;
  article.totalChunks = state.chunks.length;
  saveQueue();
}

function updateProgress() {
  if (!state.chunks.length) { setProgress(0); return; }
  const pct = (state.chunkIndex / state.chunks.length) * 100;
  setProgress(pct);
}

function onPhaseEnd(article) {
  // Guard against double-fire (Chrome's speechSynthesis occasionally emits a
  // stray onend after playback has already ended).
  if (state.finished) return;
  state.playing = false;
  state.paused = false;
  state.finished = true;
  setPlayIcon(false);
  setProgress(100);
  setStatus('idle', 'Finished');
  if (article) {
    article.resumeIndex = 0;
    saveQueue();
  }
  releaseWakeLock();
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
    requestWakeLock();
  } else {
    window.speechSynthesis.pause();
    state.paused = true;
    setPlayIcon(false);
    setStatus('paused', 'Paused');
    releaseWakeLock();
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
  releaseWakeLock();
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
    if (a && a.article) {
      stopPlayback();
      a.resumeIndex = 0;
      saveQueue();
      playArticle(a, { fromStart: true });
    }
  });

  $$('.speed-btn').forEach((b) => {
    b.addEventListener('click', () => setSpeed(b.dataset.speed));
  });

  // When returning to the tab after it was backgrounded, Chrome may have
  // paused or dropped the current utterance. Re-acquire the wake lock and
  // restart from the last confirmed chunk so we don't skip content.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (!state.playing || state.paused) return;
    requestWakeLock();
    const article = findArticle(state.currentId);
    if (!article) return;
    const synth = window.speechSynthesis;
    if (!synth.speaking) {
      // Chrome killed our utterance while backgrounded — restart the chunk
      // that was in flight. chunkIndex hasn't advanced, so no content is lost.
      synth.cancel();
      speakNextChunk(article);
    } else if (synth.paused) {
      synth.resume();
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

  // If the user was mid-article last session (Chrome killed the tab, phone
  // rebooted, whatever) — restore that article's player view so the play
  // button picks up right where they left off.
  const lastId = localStorage.getItem(STORAGE_KEYS.lastId);
  if (lastId && !state.currentId) {
    const a = findArticle(lastId);
    if (a && a.article && a.resumeIndex > 0) openArticle(lastId);
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('sw.js', { updateViaCache: 'none' })
        .catch((err) => console.warn('SW register failed', err));
    });
  }
}

document.addEventListener('DOMContentLoaded', boot);
