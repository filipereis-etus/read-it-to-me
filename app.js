// ============================================================
// Read It To Me — main application logic
// ============================================================

const STORAGE_KEYS = {
  speed: 'ritm.speed',
  queue: 'ritm.queue',
  queueBackup: 'ritm.queue.backup',
  lastId: 'ritm.lastId'
};

// CORS proxies — tried in order. If one fails or returns an empty page we
// move to the next. All are free and anonymous.
// Keyword-based category classifier. No AI, but covers the common beats in
// both English and Portuguese. The hay is URL path + title + source, normalised
// by stripping non-alphanumerics so "tech-news" and "tech news" both match.
// Added two new categories (Lifestyle, Education) plus much broader keyword
// coverage so fewer articles fall into "Other".
const CATEGORIES = [
  { name: 'Tech', keywords: [
    'tech', 'technology', 'tecnologia', 'software', 'hardware', 'startup', 'startups',
    'programming', 'programacao', 'coding', 'developer', 'developers', 'devs', 'desenvolvedor',
    'ai', 'artificial intelligence', 'inteligencia artificial', 'ia', 'gpt', 'llm', 'claude', 'openai', 'anthropic',
    'machine learning', 'ml', 'deep learning',
    'android', 'ios', 'iphone', 'ipad', 'macbook', 'linux', 'windows',
    'gadget', 'gadgets', 'device', 'robotic', 'robot',
    'apple', 'google', 'alphabet', 'meta', 'facebook', 'microsoft', 'amazon', 'nvidia', 'tesla',
    'chromium', 'chrome', 'firefox', 'safari', 'edge',
    'github', 'gitlab', 'open source', 'open-source', 'api', 'sdk', 'framework',
    'app', 'aplicativo', 'internet', 'saas', 'cloud', 'servidor', 'server', 'cybersecurity', 'cyber',
    'vpn', 'crypto', 'criptomoeda', 'bitcoin', 'ethereum', 'blockchain', 'web3', 'nft',
    'dev-blog', 'hackernews', 'y combinator', 'ycombinator'
  ] },
  { name: 'Business', keywords: [
    'business', 'negocios', 'negocio', 'market', 'mercado', 'markets',
    'stock', 'stocks', 'acoes', 'bolsa', 'wall street',
    'economy', 'economia', 'economic', 'economics',
    'invest', 'investor', 'investment', 'investir', 'investing', 'investimento',
    'finance', 'financas', 'financial', 'financeiro', 'financeira',
    'ceo', 'cfo', 'coo', 'founder', 'executive', 'company', 'companhia', 'empresa', 'empresas',
    'deal', 'deals', 'm&a', 'merger', 'acquisition', 'aquisicao', 'ipo', 'listing',
    'banking', 'bank', 'banco', 'bancos', 'fintech', 'pagamento', 'pagamentos', 'payment',
    'fundos', 'fund', 'hedge', 'private equity', 'venture capital', 'vc',
    'tax', 'imposto', 'impostos', 'tributo', 'tributaria',
    'trade', 'comercio', 'exportacao', 'importacao', 'tariff',
    'inflation', 'inflacao', 'juros', 'interest rates', 'selic', 'fed', 'reserve',
    'bloomberg', 'reuters', 'forbes', 'ft', 'financial times', 'wsj', 'wall street journal',
    'infomoney', 'valor', 'neofeed', 'estadao economia', 'exame'
  ] },
  { name: 'Politics', keywords: [
    'politics', 'political', 'politica', 'politicas',
    'election', 'elections', 'eleicao', 'eleicoes', 'eleitor', 'eleitoral',
    'government', 'gov', 'governo', 'federal', 'estadual', 'municipal', 'executive branch',
    'congress', 'congresso', 'senate', 'senado', 'camara', 'house', 'deputado', 'deputados', 'senador',
    'vote', 'votes', 'votacao', 'voto', 'votos',
    'president', 'presidencia', 'presidente', 'presidential',
    'prime minister', 'primeiro ministro', 'parliament', 'parlamento',
    'supreme court', 'tribunal', 'stf', 'stj', 'ministro',
    'democracy', 'democracia', 'republic', 'republica',
    'biden', 'trump', 'lula', 'bolsonaro', 'haddad', 'tarcisio', 'macron', 'xi',
    'law', 'lei', 'legislation', 'legislacao', 'bill', 'projeto de lei', 'pl', 'pec',
    'conservative', 'liberal', 'progressive', 'esquerda', 'direita',
    'policy', 'polica publica', 'regulatory', 'regulation', 'regulacao'
  ] },
  { name: 'Sports', keywords: [
    'sport', 'sports', 'esporte', 'esportes',
    'football', 'futebol', 'soccer', 'liga', 'league', 'premier', 'laliga', 'brasileirao', 'copa',
    'basketball', 'basquete', 'nba', 'nfl', 'nhl', 'mlb',
    'fifa', 'champions', 'libertadores', 'mundial', 'worldcup',
    'olympic', 'olympics', 'olimpiada', 'olimpiadas', 'jogos olimpicos',
    'tennis', 'tenis', 'wimbledon', 'roland garros',
    'f1', 'formula 1', 'formula one', 'gp ', 'grande premio', 'racing', 'motorsport', 'nascar',
    'baseball', 'hockey', 'cricket', 'rugby', 'volleyball', 'volei',
    'ufc', 'mma', 'boxing', 'boxe',
    'golf', 'golfe', 'ciclismo', 'cycling',
    'messi', 'ronaldo', 'neymar', 'lebron', 'curry',
    'gamewatch', 'globoesporte', 'espn', 'uol esportes', 'lance'
  ] },
  { name: 'Science', keywords: [
    'science', 'sciences', 'ciencia', 'ciencias', 'scientific', 'cientifico',
    'research', 'pesquisa', 'study', 'estudo', 'paper', 'peer review',
    'discovery', 'descoberta', 'breakthrough',
    'astronomy', 'astronomia', 'astrophysics', 'cosmos', 'universo',
    'biology', 'biologia', 'evolution', 'evolucao', 'genome', 'genoma', 'dna', 'rna',
    'physics', 'fisica', 'quantum', 'quantico', 'relativity',
    'chemistry', 'quimica', 'molecule',
    'nasa', 'esa', 'jaxa', 'space', 'espaco', 'mars', 'moon', 'lua', 'astronaut',
    'climate', 'clima', 'environment', 'ambiente', 'sustainability', 'sustentavel', 'carbon',
    'nature', 'scientific american', 'new scientist', 'cnrs',
    'math', 'matematica', 'algebra', 'geometry', 'estatistica',
    'archaeology', 'arqueologia', 'fossil', 'dinosaur', 'dinossauro'
  ] },
  { name: 'Health', keywords: [
    'health', 'saude', 'health news',
    'medic', 'medicine', 'medicina', 'medical', 'clinical',
    'disease', 'doenca', 'doencas', 'illness', 'syndrome', 'sindrome',
    'doctor', 'medico', 'medica', 'hospital', 'clinic', 'clinica',
    'covid', 'coronavirus', 'pandemic', 'pandemia', 'vaccine', 'vacina', 'vaccination',
    'fitness', 'workout', 'exercise', 'exercicio', 'exercicios', 'gym', 'academia',
    'nutrition', 'nutricao', 'dieta', 'diet', 'obesity', 'obesidade',
    'wellness', 'mental health', 'saude mental', 'psychology', 'psicologia', 'psiquiatria',
    'therapy', 'terapia', 'stress', 'ansiedade', 'anxiety', 'depression', 'depressao',
    'crescer', 'viva bem', 'health line', 'webmd', 'mayo clinic',
    'cancer', 'cardio', 'cardiaco', 'heart', 'coracao', 'neurology', 'neurologia',
    'pharma', 'medicamento', 'drug', 'drugs'
  ] },
  { name: 'Culture', keywords: [
    'culture', 'cultura', 'cultural',
    'entertainment', 'entretenimento',
    'movie', 'movies', 'filme', 'filmes', 'film', 'cinema', 'hollywood', 'oscar', 'cannes',
    'music', 'musica', 'album', 'song', 'musico', 'artista', 'band', 'banda', 'concert', 'show musical', 'streaming music',
    'book', 'books', 'livro', 'livros', 'literature', 'literatura', 'novel', 'author',
    'celebrity', 'celebrities', 'celebridade', 'celebridades',
    'tv', 'television', 'serie', 'series', 'netflix', 'hbo', 'disney', 'prime video', 'amazon prime',
    'art', 'arte', 'artist', 'painter', 'pintor', 'exhibition', 'exposicao', 'museum', 'museu',
    'theater', 'theatre', 'teatro', 'play', 'broadway',
    'games', 'gaming', 'videogame', 'jogo', 'esports', 'playstation', 'xbox', 'nintendo', 'steam',
    'pitchfork', 'rolling stone', 'billboard', 'variety', 'deadline', 'ign'
  ] },
  { name: 'World', keywords: [
    'world', 'mundo', 'mundial', 'international', 'internacional', 'global', 'foreign',
    'ukraine', 'ucrania', 'russia', 'russo', 'china', 'chines', 'taiwan', 'hong kong',
    'europe', 'europa', 'european union', 'uniao europeia', 'eu', 'nato', 'otan',
    'asia', 'asian', 'japan', 'japao', 'korea', 'coreia', 'north korea', 'india', 'indonesia',
    'africa', 'africano', 'nigeria', 'south africa', 'egito', 'kenya',
    'americas', 'latin america', 'latam', 'mexico', 'argentina', 'chile', 'venezuela', 'colombia',
    'middle east', 'oriente medio', 'israel', 'gaza', 'palestine', 'iran', 'iraq', 'syria', 'saudi',
    'war', 'guerra', 'conflict', 'conflito', 'refugee', 'refugiado', 'sanction', 'sancao',
    'diplomat', 'embassy', 'embaixada', 'un ', 'onu', 'united nations', 'g20', 'g7',
    'uk', 'britain', 'french', 'german', 'italian', 'spain', 'portugal',
    'canada', 'australia'
  ] },
  { name: 'Opinion', keywords: [
    'opinion', 'opiniao', 'opinions',
    'editorial', 'editorials',
    'column', 'coluna', 'columnist', 'colunista',
    'essay', 'ensaio', 'essays',
    'analysis', 'analise', 'commentary', 'comentario',
    'op-ed', 'oped', 'perspective', 'perspectivas', 'viewpoint',
    'letter to the editor', 'carta ao editor'
  ] },
  { name: 'Lifestyle', keywords: [
    'lifestyle', 'life', 'vida',
    'food', 'comida', 'receita', 'recipe', 'culinaria', 'cooking', 'cook', 'chef', 'restaurant', 'restaurante', 'wine', 'vinho', 'beer', 'cerveja', 'cafe', 'coffee', 'bebida',
    'travel', 'viagem', 'turismo', 'destino', 'destination', 'destinations', 'hotel', 'hotels', 'airbnb', 'airline', 'airlines', 'flight', 'voo', 'vacation', 'ferias',
    'fashion', 'moda', 'style', 'estilo', 'designer', 'outfit', 'apparel',
    'home', 'lar', 'casa', 'decor', 'decoracao', 'interior', 'interiors', 'architecture', 'arquitetura', 'garden', 'jardim',
    'beauty', 'beleza', 'skincare', 'makeup', 'maquiagem', 'cosmetic',
    'relationship', 'relacionamento', 'dating', 'marriage', 'casamento', 'family life', 'parenting', 'mae', 'pai', 'filho', 'filha',
    'personal finance', 'financas pessoais', 'money tips', 'budget', 'orcamento',
    'self-help', 'self help', 'self-improvement', 'desenvolvimento pessoal', 'produtividade', 'productivity', 'habits', 'habitos', 'rotina', 'routine',
    'conde nast traveler', 'vogue', 'glamour', 'harper', 'gq', 'bon appetit', 'eater'
  ] },
  { name: 'Education', keywords: [
    'education', 'educacao', 'educational',
    'school', 'escola', 'high school', 'colegio',
    'university', 'universidade', 'college', 'faculdade', 'campus',
    'student', 'students', 'estudante', 'estudantes', 'aluno', 'alunos',
    'teacher', 'professor', 'professores', 'teaching', 'ensino',
    'learning', 'aprendizagem', 'aprendizado', 'curriculum', 'curriculo',
    'course', 'curso', 'courses', 'cursos', 'mooc', 'coursera', 'udemy', 'edx', 'khan academy',
    'career', 'carreira', 'job', 'emprego', 'profissao', 'profession',
    'phd', 'doutorado', 'master', 'mestrado', 'thesis', 'tese',
    'tuition', 'mensalidade', 'scholarship', 'bolsa de estudos',
    'enem', 'vestibular', 'sat', 'gre'
  ] }
];

// Domain overrides — when the hostname is one of these, categorization is
// decisive regardless of keyword hits. Captures the obvious publications.
const DOMAIN_CATEGORY = {
  'techcrunch.com': 'Tech', 'theverge.com': 'Tech', 'wired.com': 'Tech', 'arstechnica.com': 'Tech',
  'engadget.com': 'Tech', 'gizmodo.com': 'Tech', 'hackernews.com': 'Tech', 'news.ycombinator.com': 'Tech',
  'theregister.com': 'Tech', 'zdnet.com': 'Tech', 'cnet.com': 'Tech', 'tecmundo.com.br': 'Tech',
  'olhardigital.com.br': 'Tech', 'canaltech.com.br': 'Tech', 'tecnoblog.net': 'Tech',
  'bloomberg.com': 'Business', 'ft.com': 'Business', 'wsj.com': 'Business', 'economist.com': 'Business',
  'forbes.com': 'Business', 'fortune.com': 'Business', 'businessinsider.com': 'Business',
  'infomoney.com.br': 'Business', 'valor.globo.com': 'Business', 'neofeed.com.br': 'Business',
  'exame.com': 'Business', 'istoedinheiro.com.br': 'Business', 'seudinheiro.com': 'Business',
  'espn.com': 'Sports', 'espn.com.br': 'Sports', 'globoesporte.com': 'Sports',
  'globoesporte.globo.com': 'Sports', 'lance.com.br': 'Sports', 'uol.com.br/esporte': 'Sports',
  'nature.com': 'Science', 'sciencemag.org': 'Science', 'newscientist.com': 'Science',
  'scientificamerican.com': 'Science', 'quantamagazine.org': 'Science', 'phys.org': 'Science',
  'healthline.com': 'Health', 'webmd.com': 'Health', 'mayoclinic.org': 'Health',
  'crescer.globo.com': 'Health', 'vivabem.uol.com.br': 'Health', 'minhavida.com.br': 'Health',
  'nytimes.com/section/opinion': 'Opinion', 'folha.uol.com.br/opiniao': 'Opinion',
  'nytimes.com': 'World', 'theguardian.com': 'World', 'bbc.com': 'World', 'reuters.com': 'World',
  'aljazeera.com': 'World', 'apnews.com': 'World',
  'pitchfork.com': 'Culture', 'rollingstone.com': 'Culture', 'variety.com': 'Culture',
  'deadline.com': 'Culture', 'ign.com': 'Culture', 'polygon.com': 'Culture',
  'vogue.com': 'Lifestyle', 'gq.com': 'Lifestyle', 'cntraveler.com': 'Lifestyle',
  'bonappetit.com': 'Lifestyle', 'eater.com': 'Lifestyle', 'dwell.com': 'Lifestyle',
  'chronicle.com': 'Education', 'insidehighered.com': 'Education',
  'edutopia.org': 'Education'
};

// Legacy category names from earlier versions → current canonical names.
const CATEGORY_ALIASES = {
  'Business & Finance': 'Business',
  'Culture & Entertainment': 'Culture'
};

// Category accent colors — Reader's Radio palette, rebalanced for warm paper
// tones. Each entry has a light-mode and dark-mode value; we pick one based on
// the system theme.
const CATEGORY_COLORS = {
  'Tech':      { light: '#5754d1', dark: '#8c89ff' },
  'Business':  { light: '#0e8a58', dark: '#3dd197' },
  'Politics':  { light: '#5b6272', dark: '#9aa0ae' },
  'Sports':    { light: '#dc8a13', dark: '#ffb84a' },
  'Science':   { light: '#0d8aa4', dark: '#4fd0e8' },
  'Health':    { light: '#d43b7a', dark: '#ff7fae' },
  'Culture':   { light: '#8a4bc9', dark: '#c28dff' },
  'World':     { light: '#2866c7', dark: '#6fa5ff' },
  'Opinion':   { light: '#b38a00', dark: '#ffd659' },
  'Lifestyle': { light: '#b85d2e', dark: '#f09560' },
  'Education': { light: '#2f8a56', dark: '#6ccf8e' },
  'Other':     { light: '#8a8579', dark: '#9aa0ae' }
};

function isDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function colorForCategory(name) {
  const pair = CATEGORY_COLORS[name] || CATEGORY_COLORS['Other'];
  return pair[isDarkMode() ? 'dark' : 'light'];
}

// Per-category glyph. SVG inner markup; caller wraps in a sized <svg>.
const CATEGORY_GLYPHS = {
  Tech:     '<rect x="4" y="7" width="16" height="10" rx="1.5"/><path d="M8 21h8"/>',
  Business: '<path d="M4 18l5-5 4 3 7-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="8" r="1.6" fill="currentColor"/>',
  Politics: '<path d="M12 3v18M5 8l7-5 7 5H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  Sports:   '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  Science:  '<circle cx="12" cy="12" r="3" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  Health:   '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" fill="currentColor"/>',
  Culture:  '<path d="M12 3l2.4 5.7 6.1.5-4.7 4 1.5 6-5.3-3.3-5.3 3.3 1.5-6-4.7-4 6.1-.5z" fill="currentColor"/>',
  World:    '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  Opinion:  '<path d="M5 17V6h10l4 4v7a1 1 0 0 1-1 1h-5l-3 3v-3H6a1 1 0 0 1-1-1z" fill="currentColor"/>',
  Lifestyle:'<path d="M12 6s-3.5-4-7-1.5C2 7 5 11 12 18c7-7 10-11 7-13.5C15.5 2 12 6 12 6z" fill="currentColor"/>',
  Education:'<path d="M2 9l10-4 10 4-10 4L2 9z" fill="currentColor"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  Other:    '<circle cx="12" cy="12" r="3" fill="currentColor"/>'
};

function categoryGlyphSvg(name, size = 22) {
  const inner = CATEGORY_GLYPHS[name] || CATEGORY_GLYPHS['Other'];
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" fill="currentColor">${inner}</svg>`;
}

// Unsplash photography per category — used by the Suggested reads carousel.
// Served straight from Unsplash's CDN so the app stays free and static.
const CATEGORY_PHOTOS = {
  Science:   'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=440&q=70&auto=format&fit=crop',
  Culture:   'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=440&q=70&auto=format&fit=crop',
  Business:  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=440&q=70&auto=format&fit=crop',
  Tech:      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=440&q=70&auto=format&fit=crop',
  Health:    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=440&q=70&auto=format&fit=crop',
  Politics:  'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=440&q=70&auto=format&fit=crop',
  Sports:    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=440&q=70&auto=format&fit=crop',
  World:     'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=440&q=70&auto=format&fit=crop',
  Opinion:   'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=440&q=70&auto=format&fit=crop',
  Lifestyle: 'https://images.unsplash.com/photo-1481833761820-0509d3217039?w=440&q=70&auto=format&fit=crop',
  Education: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=440&q=70&auto=format&fit=crop',
  Other:     'https://images.unsplash.com/photo-1481487196290-c152efe083f5?w=440&q=70&auto=format&fit=crop'
};

// ------------------------------------------------------------
// Sponsored mockups — static placeholders, no ad-network integration.
// ------------------------------------------------------------
const MOCK_ADS = {
  native: [
    { brand: 'Readwise', tagline: 'Surface your best highlights',
      body: 'Get one random highlight from your past reading, every morning. 30 days free.',
      cta: 'Try free', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z M8 7h8M8 11h6' },
    { brand: 'Matter', tagline: 'Read what you saved, not what\'s trending',
      body: 'Your read-later queue, without the guilt. Free tier for individual readers.',
      cta: 'Install', icon: 'M4 4h16v16H4z M4 12h16 M12 4v16' },
    { brand: 'Instapaper', tagline: 'Distraction-free reading, offline',
      body: 'Clip any article, sync across devices, pick up where you left off.',
      cta: 'Get it', icon: 'M6 3h12v18H6z M9 7h6M9 11h6M9 15h3' }
  ],
  inline: [
    { brand: 'Notion', body: 'One workspace. Every team. Try Notion free →',
      icon: 'M3 11l18-8-8 18-2-8z' },
    { brand: 'Kagi', body: 'Pay for search, skip the ads. First 100 queries on us.',
      icon: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z' },
    { brand: 'Fathom', body: 'Privacy-first analytics for readers who care about privacy too.',
      icon: 'M3 3v18h18 M7 14l4-4 4 4 5-5' }
  ],
  banner: [
    { brand: 'Audible · Featured', headline: 'Your first <em>audiobook</em> free',
      body: 'Try 30 days of unlimited listening. Cancel anytime, keep your first title.',
      cta: 'Start free trial' },
    { brand: 'NYT Audio · Featured', headline: 'Listen to the <em>Daily</em>',
      body: 'Every weekday morning, a deep dive into the biggest story. Free with your subscription.',
      cta: 'Listen now' }
  ]
};

function pickRandom(arr, seedKey) {
  if (!arr.length) return null;
  // Seeded-ish by day so the user sees the same ad within a session rather
  // than flicker on every re-render.
  if (seedKey) {
    const hash = [...seedKey].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
    return arr[Math.abs(hash) % arr.length];
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

function renderSponsoredCard(slot, seed) {
  if (!slot) return;
  const ad = pickRandom(MOCK_ADS.native, seed || new Date().toDateString());
  slot.innerHTML = `
    <div class="sponsored-card" role="complementary" aria-label="Sponsored">
      <div class="sponsored-mark">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          ${ad.icon.split(' M').map((seg, i) => `<path d="${i === 0 ? seg : 'M' + seg}"/>`).join('')}
        </svg>
      </div>
      <div class="sponsored-body">
        <div class="sponsored-brand">${escapeHtml(ad.brand)}</div>
        <div class="sponsored-tagline">${escapeHtml(ad.tagline)}</div>
        <div class="sponsored-desc">${escapeHtml(ad.body)}</div>
        <div class="sponsored-flag">Sponsored · Ad</div>
      </div>
      <button class="sponsored-cta" type="button">${escapeHtml(ad.cta)}</button>
    </div>
  `;
}

function renderBannerAd(slot, seed) {
  if (!slot) return;
  const ad = pickRandom(MOCK_ADS.banner, seed || new Date().toDateString());
  slot.innerHTML = `
    <div class="banner-ad" role="complementary" aria-label="Sponsored banner">
      <div>
        <div class="banner-overline">${escapeHtml(ad.brand)}</div>
        <h3 class="banner-headline">${ad.headline}</h3>
        <p class="banner-body">${escapeHtml(ad.body)}</p>
      </div>
      <div class="banner-foot">
        <button class="banner-cta" type="button">${escapeHtml(ad.cta)}</button>
        <div class="banner-flag">Sponsored · Ad</div>
      </div>
    </div>
  `;
}

function renderQueueAdItem(seed) {
  const ad = pickRandom(MOCK_ADS.inline, seed);
  const li = document.createElement('li');
  li.className = 'queue-item ad';
  li.innerHTML = `
    <div class="qi-ad-thumb">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        ${ad.icon.split(' M').map((seg, i) => `<path d="${i === 0 ? seg : 'M' + seg}"/>`).join('')}
      </svg>
    </div>
    <div class="qi-main">
      <div class="qi-source">${escapeHtml(ad.brand)}</div>
      <div class="qi-title">${escapeHtml(ad.body)}</div>
      <div class="qi-ad-flag">Sponsored · Ad</div>
    </div>
  `;
  return li;
}

// ------------------------------------------------------------
// Suggested reads carousel — picks 3 articles from the user's queue,
// preferring different categories and articles that aren't currently playing.
// ------------------------------------------------------------
function pickSuggested(n = 3) {
  const pool = state.queue.filter((a) => a.id !== state.currentId);
  if (!pool.length) return [];
  const byCat = new Map();
  for (const a of pool) {
    const k = a.category || 'Other';
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k).push(a);
  }
  const picks = [];
  const cats = [...byCat.keys()].sort(() => Math.random() - 0.5);
  for (const c of cats) {
    if (picks.length >= n) break;
    const bucket = byCat.get(c);
    picks.push(bucket[Math.floor(Math.random() * bucket.length)]);
  }
  // If one category dominates, pad from whatever is left.
  while (picks.length < n && pool.length > picks.length) {
    const remaining = pool.filter((a) => !picks.includes(a));
    if (!remaining.length) break;
    picks.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }
  return picks;
}

function renderSuggestedReads(slot) {
  if (!slot) return;
  const picks = pickSuggested(3);
  if (!picks.length) { slot.innerHTML = ''; return; }

  const cards = picks.map((article) => {
    const cat = article.category || 'Other';
    const color = colorForCategory(cat);
    const photo = CATEGORY_PHOTOS[cat] || CATEGORY_PHOTOS['Other'];
    const source = (article.source || hostnameOf(article.url) || '').replace(/^www\./, '');
    const summary = article.article
      ? article.article.split(/\n\n+/)[0].slice(0, 180).trim() + (article.article.length > 180 ? '…' : '')
      : `From ${source}`;
    return `
      <article class="suggested-card" data-id="${escapeHtml(article.id)}" style="--cat-color: ${color}">
        <div class="suggested-thumb" style="background-image: url('${photo}')">
          <div class="suggested-thumb-badge">${categoryGlyphSvg(cat, 15)}</div>
        </div>
        <div class="suggested-card-body">
          <div class="suggested-meta">
            <span class="suggested-cat">${escapeHtml(cat)}</span>
            <span class="qi-dot">·</span>
            <span class="suggested-src">${escapeHtml(source)}</span>
          </div>
          <div class="suggested-title">${escapeHtml(article.title || article.url)}</div>
          <div class="suggested-summary">${escapeHtml(summary)}</div>
          <div class="suggested-foot">
            <div class="suggested-foot-time">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <span>${article.readingMinutes ? article.readingMinutes + ' min' : '—'}</span>
            </div>
            <button class="suggested-play" aria-label="Play">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  slot.innerHTML = `
    <div class="suggested-reads">
      <div class="suggested-header">
        <div class="overline">Suggested reads</div>
        <button class="suggested-refresh" type="button">Refresh</button>
      </div>
      <div class="suggested-carousel">${cards}</div>
    </div>
  `;

  slot.querySelector('.suggested-refresh').addEventListener('click', () => renderSuggestedReads(slot));
  slot.querySelectorAll('.suggested-card').forEach((card) => {
    const id = card.dataset.id;
    card.addEventListener('click', (e) => {
      const isPlayBtn = e.target.closest('.suggested-play');
      openArticle(id, { autoPlay: !!isPlayBtn });
    });
  });
}

function categorize(article) {
  // 1) Domain override — most decisive signal when available.
  const host = (article.source || hostnameOf(article.url) || '').toLowerCase().replace(/^www\./, '');
  if (host) {
    // Try full host + path prefix first, then just host
    const path = (article.url || '').toLowerCase();
    for (const key of Object.keys(DOMAIN_CATEGORY)) {
      if (path.includes(key)) return DOMAIN_CATEGORY[key];
    }
    if (DOMAIN_CATEGORY[host]) return DOMAIN_CATEGORY[host];
  }

  // 2) Keyword scoring across URL path, title, source.
  const raw = `${article.url || ''} ${article.title || ''} ${article.source || ''}`;
  const hay = ' ' + raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  let best = { name: 'Other', score: 0 };
  for (const cat of CATEGORIES) {
    let score = 0;
    for (const k of cat.keywords) {
      const needle = k.replace(/[^a-z0-9]+/g, ' ').trim();
      if (!needle) continue;
      // Multi-word needles are substring-matched; single words get word-boundary check.
      if (needle.includes(' ')) {
        if (hay.includes(' ' + needle + ' ')) score += 2;
      } else {
        if (hay.includes(' ' + needle + ' ')) score += 1;
      }
    }
    if (score > best.score) best = { name: cat.name, score };
  }
  return best.name;
}

const CORS_PROXIES = [
  (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
  (u) => `https://api.cors.lol/?url=${encodeURIComponent(u)}`
];

// Signatures that indicate the response is a bot-check page, login wall, or
// "access denied" screen rather than the actual article. When we see one of
// these we treat the proxy as failed and keep trying.
const BOT_WALL_SIGNATURES = [
  'access denied', 'accesso negado', 'acesso negado',
  'please verify you are a human', 'are you a robot',
  'checking your browser', 'cloudflare',
  'captcha', 'recaptcha',
  'attention required',
  'enable javascript and cookies to continue',
  'your request has been blocked',
  '403 forbidden', '401 unauthorized',
  'you have been blocked',
  'bot detected', 'security check',
  'subscribe to continue reading', 'subscribers only'
];

function looksLikeBotWall(html) {
  if (!html || html.length < 800) return true;
  const lower = html.toLowerCase().slice(0, 4000);
  return BOT_WALL_SIGNATURES.some((sig) => lower.includes(sig));
}

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
  wakeLock: null,
  // Auto-advance scope: null = single article; 'all' = entire queue;
  // { group: 'Tech' } = only items in that category.
  playScope: null,
  // Pagination: home list cap + per-group cap in the Queue view. Stored in
  // memory only — resets on reload, which is fine.
  homeVisible: 10,
  groupVisible: new Map()
};

const GROUP_PAGE_SIZE = 20;
const HOME_PAGE_SIZE = 10;

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
  $('#view-import').hidden = name !== 'import';
  // Lazy-render whatever list the user just switched to.
  if (name === 'home') renderHomeListIfStale();
  if (name === 'queue') renderGroupedListIfStale();
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
  const wrap = $('#status-dot-wrap');
  const textEl = $('#status-text');
  const tailEl = $('#status-tail');
  textEl.textContent = text;

  // Swap waveform/dot based on phase — waveform when playing, solid dot otherwise.
  const showWave = phase === 'playing';
  if (showWave) {
    wrap.innerHTML = '<span class="wave-bars animate"><span></span><span></span><span></span><span></span></span>';
  } else {
    wrap.innerHTML = '<span class="status-dot"></span>';
  }

  // Tail text follows the phase: estimated time left while playing, hint otherwise.
  const article = findArticle(state.currentId);
  if (article && state.chunks.length && phase === 'playing') {
    const remaining = estimateTime(article, state.chunks.length - state.chunkIndex);
    tailEl.textContent = `${formatClock(remaining)} left`;
  } else if (article && article.resumeIndex > 0 && phase !== 'playing') {
    tailEl.textContent = 'tap play to resume';
  } else if (phase === 'idle' || phase === 'error') {
    tailEl.textContent = phase === 'error' ? '' : 'tap play to start';
  } else {
    tailEl.textContent = '';
  }
}

function setProgress(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  const fill = $('#progress-bar');
  const knob = $('#progress-knob');
  if (fill) fill.style.width = clamped + '%';
  if (knob) knob.style.left = clamped + '%';

  // Time codes (best-effort estimate from chunk progress).
  const article = findArticle(state.currentId);
  const total = state.chunks.length;
  if (article && total) {
    const elapsed = estimateTime(article, state.chunkIndex);
    const remaining = estimateTime(article, total - state.chunkIndex);
    const el = $('#time-elapsed'); if (el) el.textContent = formatClock(elapsed);
    const rem = $('#time-remaining'); if (rem) rem.textContent = `-${formatClock(remaining)}`;
  } else if (article) {
    const el = $('#time-elapsed'); if (el) el.textContent = '0:00';
    const rem = $('#time-remaining'); if (rem) rem.textContent = article.readingMinutes ? `-${article.readingMinutes}:00` : '—';
  }
}

function estimateTime(article, chunkCount) {
  if (!article || !article.article || !state.chunks.length) return 0;
  const totalWords = article.article.split(/\s+/).length;
  const wordsPerChunk = totalWords / state.chunks.length;
  const words = chunkCount * wordsPerChunk;
  return Math.round(words / (200 * state.speed) * 60);
}

function formatClock(seconds) {
  seconds = Math.max(0, Math.round(seconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
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
  let raw = localStorage.getItem(STORAGE_KEYS.queue);
  let source = 'primary';
  // If the primary key is missing or empty, fall through to the backup shadow
  // written on every save. Protects against a corrupted or truncated primary
  // write; does not protect against full origin-level storage eviction.
  if (!raw || raw === '[]' || raw === 'null') {
    const backup = localStorage.getItem(STORAGE_KEYS.queueBackup);
    if (backup && backup !== '[]' && backup !== 'null') {
      raw = backup;
      source = 'backup';
      console.warn('[ritm] primary queue empty — restoring from backup');
    }
  }
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    state.queue = parsed;
    for (const a of state.queue) {
      if (a.category && CATEGORY_ALIASES[a.category]) a.category = CATEGORY_ALIASES[a.category];
      if (!a.category) a.category = categorize(a);
    }
    if (source === 'backup' && parsed.length > 0) {
      saveQueue();
      setTimeout(() => toast(`Queue restored from backup (${parsed.length} articles)`), 600);
    }
  } catch (e) {
    console.warn('[ritm] queue parse failed:', e);
  }
}

function saveQueue() {
  const json = JSON.stringify(state.queue);
  localStorage.setItem(STORAGE_KEYS.queue, json);
  // Shadow copy — written every time. Only rescues us if the primary key is
  // cleared or corrupted; a full origin wipe takes both.
  try { localStorage.setItem(STORAGE_KEYS.queueBackup, json); } catch (e) {}
  updateQueueBadge();
}

function exportQueueAsFile() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: state.queue.length,
    currentId: state.currentId || null,
    queue: state.queue
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ritm-queue-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(`Exported ${state.queue.length} articles`);
}

async function importQueueFromBackup(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const incoming = Array.isArray(data) ? data : data.queue;
    if (!Array.isArray(incoming)) throw new Error('Invalid format — expected an array or { queue: [] }');

    const existing = new Set(state.queue.map((a) => a.url));
    let added = 0, updated = 0;
    for (const a of incoming) {
      if (!a || !a.url) continue;
      if (existing.has(a.url)) {
        // If the backup has more progress (higher resumeIndex), adopt it.
        const curr = state.queue.find((x) => x.url === a.url);
        if (a.resumeIndex > (curr.resumeIndex || 0)) {
          curr.resumeIndex = a.resumeIndex;
          curr.totalChunks = a.totalChunks || curr.totalChunks;
          updated++;
        }
        continue;
      }
      if (!a.id) a.id = uid();
      if (a.category && CATEGORY_ALIASES[a.category]) a.category = CATEGORY_ALIASES[a.category];
      if (!a.category) a.category = categorize(a);
      state.queue.push(a);
      added++;
    }
    saveQueue();
    renderQueues();
    toast(`Imported ${added} new · ${updated} updated`);
  } catch (err) {
    console.error(err);
    toast('Could not read that backup file');
  }
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
    totalChunks: 0,
    category: null
  };
  article.category = categorize(article);
  state.queue.push(article);
  saveQueue();
  renderQueues();
  return article;
}

// Bulk-add many URLs — chunked and asynchronous so a 700-item import doesn't
// block the main thread. Yields back to the event loop between chunks so the
// UI stays responsive and Chrome doesn't declare the tab unresponsive.
async function addArticlesBulk(urls, onProgress) {
  const CHUNK = 50;
  const added = [];
  const existing = new Set(state.queue.map((a) => a.url));

  for (let i = 0; i < urls.length; i += CHUNK) {
    const slice = urls.slice(i, i + CHUNK);
    for (let url of slice) {
      if (!url) continue;
      url = url.trim();
      if (!url) continue;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      try { new URL(url); } catch { continue; }
      if (existing.has(url)) continue;
      const a = {
        id: uid(),
        url,
        title: url,
        source: hostnameOf(url),
        language: null,
        article: null,
        readingMinutes: null,
        status: 'pending',
        resumeIndex: 0,
        totalChunks: 0,
        category: null
      };
      a.category = categorize(a);
      state.queue.push(a);
      existing.add(url);
      added.push(a);
    }
    // Persist and yield every chunk so progress is durable and the UI breathes.
    saveQueue();
    if (onProgress) onProgress(Math.min(i + CHUNK, urls.length), urls.length, added.length);
    // Yield to the event loop — lets Chrome paint and handle input.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // One render at the end — incremental renders mid-import would thrash the
  // DOM and make the progress indicator stutter.
  renderQueues();
  return added;
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
// Only re-render the list the user can currently see. Other views are marked
// stale and rebuilt on view switch. With large queues this is a big win — we
// were previously rebuilding 200+ DOM nodes twice on every state change.
let homeListStale = true;
let groupListStale = true;

function renderQueues() {
  $('#queue-empty').hidden = state.queue.length > 0;
  $('#queue-actions').style.display = state.queue.length ? '' : 'none';
  updateQueueBadge();
  renderQueueHeader();

  homeListStale = true;
  groupListStale = true;
  if (state.view === 'home') renderHomeListIfStale();
  if (state.view === 'queue') renderGroupedListIfStale();
}

function renderHomeListIfStale() {
  if (!homeListStale) return;
  renderFlatList($('#home-queue'));
  homeListStale = false;
}

function renderGroupedListIfStale() {
  if (!groupListStale) return;
  renderGroupedQueue($('#grouped-queue'));
  groupListStale = false;
}

function renderFlatList(ul) {
  ul.innerHTML = '';
  const total = state.queue.length;

  // Toggle empty vs populated containers and update the hero copy to match.
  updateHomeHero(total);
  $('#empty-queue').hidden = total > 0;
  $('#home-populated').hidden = total === 0;
  if (total === 0) return;

  // Resume card — if there's a currently playing / paused article, surface it
  // at the top as a condensed player.
  const resumeSlot = $('#resume-slot');
  resumeSlot.innerHTML = '';
  const current = state.currentId ? findArticle(state.currentId) : null;
  const startIndex = current ? 1 : 0;
  if (current && current.article) {
    resumeSlot.appendChild(renderResumeCard(current));
  }

  $('#home-upnext-label').textContent = current
    ? `Up next · ${Math.max(0, total - 1)} in queue`
    : `Up next · ${total} in queue`;

  // Remaining queue as editorial rows.
  const remaining = current ? state.queue.filter((a) => a.id !== current.id) : state.queue;
  const limit = Math.min(state.homeVisible, remaining.length);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < limit; i++) frag.appendChild(renderHomeRow(remaining[i]));
  ul.appendChild(frag);

  if (remaining.length > limit) {
    const li = document.createElement('li');
    li.className = 'queue-more';
    li.innerHTML = `
      <button class="btn ghost full" data-action="home-more">Show ${Math.min(HOME_PAGE_SIZE, remaining.length - limit)} more</button>
      <button class="btn ghost full" data-action="open-queue">See full queue · ${total} articles →</button>
    `;
    li.querySelector('[data-action="home-more"]').addEventListener('click', () => {
      state.homeVisible += HOME_PAGE_SIZE;
      renderQueues();
    });
    li.querySelector('[data-action="open-queue"]').addEventListener('click', () => showView('queue'));
    ul.appendChild(li);
  }

  // Sponsored mockups sit below the queue on home.
  renderSponsoredCard($('#home-ad-slot'), 'home-' + new Date().toDateString());
  renderBannerAd($('#home-banner-slot'), 'banner-' + new Date().toDateString());
}

function renderHomeRow(item) {
  const li = document.createElement('li');
  li.className = 'home-row';
  li.style.setProperty('--cat-color', colorForCategory(item.category || 'Other'));
  li.innerHTML = `
    <div class="home-row-strip"></div>
    <div class="home-row-body">
      <div class="home-row-meta">
        <span class="home-row-cat">${escapeHtml(item.category || 'Other')}</span>
        <span class="qi-dot">·</span>
        <span class="muted" style="font-size: 11px;">${escapeHtml((item.source || '').replace(/^www\./, ''))}</span>
      </div>
      <div class="home-row-title">${escapeHtml(item.title || item.url)}</div>
      <div class="home-row-sub">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        <span>${item.readingMinutes ? item.readingMinutes + ' min' : '—'}</span>
        ${item.language ? `<span>·</span><span>${escapeHtml(item.language.slice(0, 2).toUpperCase())}</span>` : ''}
      </div>
    </div>
    <button class="home-row-play" aria-label="Play">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    </button>
  `;
  li.querySelector('.home-row-body').addEventListener('click', () => openArticle(item.id));
  li.querySelector('.home-row-play').addEventListener('click', (e) => {
    e.stopPropagation();
    openArticle(item.id, { autoPlay: true });
  });
  return li;
}

function renderResumeCard(article) {
  const card = document.createElement('div');
  card.className = 'resume-card';
  const cat = article.category || 'Other';
  card.style.setProperty('--cat-color', colorForCategory(cat));
  const pct = article.totalChunks ? Math.round((article.resumeIndex / article.totalChunks) * 100) : 0;
  const isPlaying = state.playing && !state.paused && state.currentId === article.id;
  card.innerHTML = `
    <div class="resume-head">
      ${isPlaying ? '<span class="wave-bars animate"><span></span><span></span><span></span></span>' : '<span class="status-dot"></span>'}
      <span class="resume-head-label">${isPlaying ? 'Now playing' : 'Continue'} · ${escapeHtml(cat)}</span>
    </div>
    <div class="resume-title">${escapeHtml(article.title || article.url)}</div>
    <div class="resume-row">
      <div class="resume-progress"><div class="resume-progress-fill" style="width: ${pct}%"></div></div>
      <span class="resume-time">${pct}%</span>
      <button class="resume-play" aria-label="Open player">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          ${isPlaying ? '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>' : '<path d="M8 5v14l11-7z"/>'}
        </svg>
      </button>
    </div>
  `;
  card.addEventListener('click', () => openArticle(article.id));
  return card;
}

function updateHomeHero(total) {
  const greeting = $('#home-greeting');
  const dateEl = $('#home-date');
  dateEl.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  if (total === 0) {
    greeting.innerHTML = 'Your reading<br>list, <em>spoken</em>.';
  } else if (state.currentId) {
    greeting.innerHTML = 'Good morning,<br>ready when <em>you are</em>.';
  } else {
    greeting.innerHTML = `${total} ${total === 1 ? 'article' : 'articles'}<br>in the <em>queue</em>.`;
  }
}

function renderQueueHeader() {
  const total = state.queue.length;
  $('#queue-count-big').textContent = `${total} ${total === 1 ? 'article' : 'articles'}`;
  const totalMinutes = state.queue.reduce((n, a) => n + (a.readingMinutes || 4), 0);
  $('#queue-count-meta').textContent = `· ${formatDuration(totalMinutes)} listen`;
}

function renderQueueItem(item) {
  const li = document.createElement('li');
  const isActive = item.id === state.currentId && state.playing && !state.paused;
  li.className = 'queue-item' + (isActive ? ' active' : '');
  li.style.setProperty('--cat-color', colorForCategory(item.category || 'Other'));

  const main = document.createElement('div');
  main.className = 'qi-main';

  const sourceRow = document.createElement('div');
  sourceRow.className = 'qi-source-row';
  const source = document.createElement('span');
  source.className = 'qi-source';
  source.textContent = (item.source || '').replace(/^www\./, '');
  sourceRow.appendChild(source);

  if (isActive) {
    const sep = document.createElement('span');
    sep.className = 'qi-dot'; sep.textContent = '·';
    const state_ = document.createElement('span');
    state_.className = 'qi-state';
    state_.innerHTML = `<span class="wave-bars animate"><span></span><span></span><span></span></span> Playing`;
    sourceRow.appendChild(sep);
    sourceRow.appendChild(state_);
  } else if (item.status === 'error') {
    const sep = document.createElement('span');
    sep.className = 'qi-dot'; sep.textContent = '·';
    const state_ = document.createElement('span');
    state_.className = 'qi-state error';
    state_.textContent = 'Error';
    sourceRow.appendChild(sep);
    sourceRow.appendChild(state_);
  }

  const title = document.createElement('div');
  title.className = 'qi-title';
  title.textContent = item.title || item.url;

  const meta = document.createElement('div');
  meta.className = 'qi-meta';
  meta.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
    <span>${item.readingMinutes ? item.readingMinutes + ' min' : '—'}</span>
    ${item.language ? `<span>·</span><span>${escapeHtml(item.language.slice(0, 2).toUpperCase())}</span>` : ''}
  `;

  main.appendChild(sourceRow);
  main.appendChild(title);
  main.appendChild(meta);
  main.addEventListener('click', () => openArticle(item.id));

  const rm = document.createElement('button');
  rm.className = 'qi-remove';
  rm.setAttribute('aria-label', 'Remove');
  rm.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
  rm.addEventListener('click', (e) => { e.stopPropagation(); removeArticle(item.id); });

  li.appendChild(main);
  li.appendChild(rm);
  return li;
}

function groupQueueByCategory() {
  const groups = new Map();
  for (const a of state.queue) {
    const cat = a.category || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(a);
  }
  // Stable ordering: follow CATEGORIES order, then "Other" last, then any unknowns.
  const order = [...CATEGORIES.map((c) => c.name), 'Other'];
  const sorted = new Map();
  for (const name of order) if (groups.has(name)) sorted.set(name, groups.get(name));
  for (const [name, items] of groups) if (!sorted.has(name)) sorted.set(name, items);
  return sorted;
}

function renderGroupedQueue(container) {
  container.innerHTML = '';
  const groups = groupQueueByCategory();
  const outerFrag = document.createDocumentFragment();

  for (const [cat, items] of groups) {
    const color = colorForCategory(cat);
    const section = document.createElement('div');
    section.className = 'queue-group';
    section.style.setProperty('--cat-color', color);

    // Chunky group header card — mark + serif name + count + Play group pill.
    const headerCard = document.createElement('div');
    headerCard.className = 'group-header-card';
    const totalMinutes = items.reduce((n, a) => n + (a.readingMinutes || 4), 0);
    headerCard.innerHTML = `
      <div class="group-mark">${categoryGlyphSvg(cat, 22)}</div>
      <div class="group-info">
        <div class="group-title">${escapeHtml(cat)}</div>
        <div class="group-count">${items.length} article${items.length === 1 ? '' : 's'} · ${formatDuration(totalMinutes)}</div>
      </div>
      <button class="group-play-btn" type="button">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Play group
      </button>
    `;
    headerCard.querySelector('.group-play-btn').addEventListener('click', () => playGroup(cat));
    section.appendChild(headerCard);

    const ul = document.createElement('ul');
    ul.className = 'queue-list';
    const visible = Math.min(state.groupVisible.get(cat) || GROUP_PAGE_SIZE, items.length);
    const innerFrag = document.createDocumentFragment();
    for (let i = 0; i < visible; i++) {
      innerFrag.appendChild(renderQueueItem(items[i]));
      // Insert a sponsored slot after every 5th real item (not at the end).
      if ((i + 1) % 5 === 0 && i < visible - 1) {
        innerFrag.appendChild(renderQueueAdItem(`${cat}-${i}-${new Date().toDateString()}`));
      }
    }
    ul.appendChild(innerFrag);
    section.appendChild(ul);

    if (items.length > visible) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'more-btn';
      moreBtn.textContent = `Show ${items.length - visible} more in ${cat}`;
      moreBtn.addEventListener('click', () => {
        state.groupVisible.set(cat, visible + GROUP_PAGE_SIZE);
        renderQueues();
      });
      section.appendChild(moreBtn);
    } else if (visible > GROUP_PAGE_SIZE) {
      const lessBtn = document.createElement('button');
      lessBtn.className = 'more-btn';
      lessBtn.textContent = 'Collapse';
      lessBtn.addEventListener('click', () => {
        state.groupVisible.delete(cat);
        renderQueues();
      });
      section.appendChild(lessBtn);
    }

    outerFrag.appendChild(section);
  }

  container.appendChild(outerFrag);
}

function formatDuration(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`;
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
async function openArticle(id, opts = {}) {
  const article = findArticle(id);
  if (!article) return;
  stopPlayback();
  if (!opts.autoPlay) state.playScope = null;
  state.currentId = id;
  localStorage.setItem(STORAGE_KEYS.lastId, id);
  showView('player');

  if (!article.article) {
    // Show a styled loading state before we render the "real" player.
    renderPlayerLoading(article);
    await processArticle(article);
  } else {
    renderPlayer(article);
    if (opts.autoPlay) {
      playArticle(article, { fromStart: true });
    } else if (article.resumeIndex > 0 && article.totalChunks > 0) {
      setStatus('paused', 'Paused — tap play to resume');
      setProgress((article.resumeIndex / article.totalChunks) * 100);
    } else {
      setStatus('idle', 'Ready');
      setProgress(0);
    }
  }
}

// Editorial "we're fetching" screen — uses the final player's layout but with
// an italic Fraunces headline, a skeleton subtitle, and a throbbing accent dot
// so it reads as intentional rather than "no data yet".
function renderPlayerLoading(article) {
  const view = $('#view-player');
  view.style.setProperty('--cat-color', 'var(--accent)');
  view.classList.add('is-loading');

  $('#player-cat-mark').innerHTML = '<div class="loading-pulse"></div>';
  const host = (article.source || hostnameOf(article.url) || '').replace(/^www\./, '');
  $('#player-cat-label').textContent = host ? `Fetching · ${host}` : 'Fetching article';
  $('#player-cat-sub').textContent = 'Reader\'s Radio, just a moment…';
  $('#article-title').innerHTML = 'Pulling the article<br><em>in from the wire</em>…';
  $('#article-text').textContent = '';
  $('#upnext-slot').hidden = true;
  // Don't flash stale ads/suggestions while we fetch.
  const adSlot = $('#player-ad-slot'); if (adSlot) adSlot.innerHTML = '';
  const sugSlot = $('#player-suggested-slot'); if (sugSlot) sugSlot.innerHTML = '';
}

function articlesInScope() {
  const s = state.playScope;
  if (!s) return null;
  if (s === 'all') return state.queue.slice();
  if (s.group) return state.queue.filter((a) => (a.category || 'Other') === s.group);
  return null;
}

function nextInScope(currentId) {
  const list = articlesInScope();
  if (!list) return null;
  const idx = list.findIndex((a) => a.id === currentId);
  return idx === -1 ? null : (list[idx + 1] || null);
}

function playAll() {
  if (!state.queue.length) return;
  state.playScope = 'all';
  openArticle(state.queue[0].id, { autoPlay: true });
}

function playGroup(category) {
  const items = state.queue.filter((a) => (a.category || 'Other') === category);
  if (!items.length) return;
  state.playScope = { group: category };
  openArticle(items[0].id, { autoPlay: true });
}

function renderPlayer(article) {
  const cat = article.category || 'Other';
  const color = colorForCategory(cat);
  const view = $('#view-player');
  view.style.setProperty('--cat-color', color);
  view.classList.remove('is-loading');

  $('#player-cat-mark').innerHTML = categoryGlyphSvg(cat, 19);
  const src = article.source ? article.source.replace(/^www\./, '') : '';
  $('#player-cat-label').textContent = src ? `${cat} · ${src}` : cat;
  $('#player-cat-sub').textContent = [
    article.readingMinutes ? `${article.readingMinutes} min read` : null,
    article.language ? languageName(article.language) : null
  ].filter(Boolean).join(' · ');

  // Editorial title with automatic italic accent on the last standout phrase.
  $('#article-title').innerHTML = formatEditorialTitle(article.title || article.url);
  $('#article-source').textContent = article.source || '';
  $('#article-reading-time').textContent = article.readingMinutes ? article.readingMinutes + ' min read' : '';
  $('#article-lang').textContent = article.language ? article.language.toUpperCase() : '';
  $('#article-text').textContent = article.article || '';

  renderUpnext(article);
  renderSponsoredCard($('#player-ad-slot'), 'player-' + new Date().toDateString());
  renderSuggestedReads($('#player-suggested-slot'));
}

// Auto-italicize a short stand-out phrase in the title (quoted text, or the
// final clause after an em-dash/colon). Falls back to plain text if no clear
// candidate — the effect is meant to feel editorial, not forced.
function formatEditorialTitle(title) {
  const esc = escapeHtml(title);
  const quoted = esc.match(/^(.*?)(&#39;[^&]+?&#39;|&quot;[^&]+?&quot;|‘[^’]+’|“[^”]+”)(.*)$/);
  if (quoted) {
    return `${quoted[1]}<em>${quoted[2]}</em>${quoted[3]}`;
  }
  const dashed = esc.match(/^(.{20,}?)\s*[—–:]\s+(.+)$/);
  if (dashed && dashed[2].length < 60) {
    return `${dashed[1]} — <em>${dashed[2]}</em>`;
  }
  return esc;
}

function languageName(code) {
  const map = { en: 'English', pt: 'Portuguese', es: 'Spanish', fr: 'French', it: 'Italian', de: 'German' };
  return map[code.slice(0, 2).toLowerCase()] || code.toUpperCase();
}

function renderUpnext(currentArticle) {
  const slot = $('#upnext-slot');
  let next = null;
  if (state.playScope) {
    next = nextInScope(currentArticle.id);
  } else {
    const idx = state.queue.findIndex((a) => a.id === currentArticle.id);
    next = idx >= 0 ? state.queue[idx + 1] : null;
  }
  if (!next) { slot.hidden = true; return; }
  slot.hidden = false;
  const nextCat = next.category || 'Other';
  slot.style.setProperty('--cat-color', colorForCategory(nextCat));
  $('#upnext-cat').textContent = nextCat;
  $('#upnext-title').textContent = next.title || next.url;
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
  // Re-categorize now that we have a real title — more signal than URL alone.
  article.category = categorize(article);

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
    const html = await tryProxy(CORS_PROXIES[i](url), i + 1, errors);
    if (html) return html;
  }

  // Live fetch failed everywhere — try the Wayback Machine snapshot instead.
  // Archived copies aren't protected by the origin's bot wall, so if the page
  // was ever indexed we usually get clean HTML.
  try {
    const archive = await findWaybackUrl(url);
    if (archive) {
      console.log('[ritm] falling back to Wayback Machine:', archive);
      for (let i = 0; i < CORS_PROXIES.length; i++) {
        const html = await tryProxy(CORS_PROXIES[i](archive), `wayback/${i + 1}`, errors);
        if (html) return html;
      }
    } else {
      errors.push('wayback: no snapshot available');
    }
  } catch (e) {
    errors.push('wayback: ' + (e.message || e.name));
  }

  throw new Error('All proxies failed. ' + errors.join('; '));
}

async function tryProxy(proxyUrl, label, errors) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const resp = await fetch(proxyUrl, { redirect: 'follow', signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) { errors.push(`proxy ${label}: HTTP ${resp.status}`); return null; }
    const text = await resp.text();
    if (!text || text.length < 500) {
      errors.push(`proxy ${label}: empty (${text.length} bytes)`);
      return null;
    }
    if (looksLikeBotWall(text)) {
      errors.push(`proxy ${label}: bot wall / access denied`);
      return null;
    }
    console.log(`[ritm] fetched via proxy ${label} (${text.length} bytes)`);
    return text;
  } catch (err) {
    errors.push(`proxy ${label}: ${err.message || err.name}`);
    return null;
  }
}

// Look up the most recent archived snapshot on the Wayback Machine. Returns
// the raw HTML URL (with the `if_` prefix that strips the Wayback toolbar) or
// null if no snapshot exists.
async function findWaybackUrl(url) {
  const lookup = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
  const resp = await fetch(lookup);
  if (!resp.ok) return null;
  const data = await resp.json();
  const snap = data && data.archived_snapshots && data.archived_snapshots.closest;
  if (!snap || !snap.available || !snap.url) return null;
  return snap.url.replace(/\/web\/(\d+)\//, '/web/$1if_/');
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
  moveArticleToTop(article.id);
  state.playing = true;
  state.paused = false;
  state.finished = false;
  setPlayIcon(true);
  setStatus('playing', 'Reading article');
  setMediaSession(article);
  requestWakeLock();
  speakNextChunk(article);
}

function moveArticleToTop(id) {
  const idx = state.queue.findIndex((a) => a.id === id);
  if (idx <= 0) return;
  const [a] = state.queue.splice(idx, 1);
  state.queue.unshift(a);
  saveQueue();
  renderQueues();
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
  releaseWakeLock();

  if (!article) return;

  // Resolve the next article *before* we remove the finished one, since
  // nextInScope needs to find the current item's position.
  const next = state.playScope ? nextInScope(article.id) : null;

  // Listened → discarded. Drop it from the queue.
  const idx = state.queue.findIndex((a) => a.id === article.id);
  if (idx !== -1) state.queue.splice(idx, 1);
  if (state.currentId === article.id) state.currentId = null;
  localStorage.removeItem(STORAGE_KEYS.lastId);
  saveQueue();
  renderQueues();

  if (next) {
    setTimeout(() => openArticle(next.id, { autoPlay: true }), 600);
  } else {
    state.playScope = null;
    // Leave the "Finished" state visible briefly, then go back.
    setTimeout(() => {
      if (state.view === 'player') showView(state.queue.length ? 'queue' : 'home');
    }, 1500);
  }
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

// Share the currently-playing article's URL via the Web Share API. Falls back
// to copying the URL to the clipboard when the browser doesn't support it.
async function sharePlayingArticle() {
  const article = findArticle(state.currentId);
  if (!article) { toast('Nothing playing to share'); return; }
  const data = {
    title: article.title || 'Article',
    text: article.source ? `From ${article.source.replace(/^www\./, '')}` : '',
    url: article.url
  };
  if (navigator.share) {
    try { await navigator.share(data); }
    catch (e) { if (e.name !== 'AbortError') console.warn(e); }
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try { await navigator.clipboard.writeText(article.url); toast('Link copied'); }
    catch { toast('Share not supported on this device'); }
    return;
  }
  toast('Share not supported on this device');
}

// ------------------------------------------------------------
// Clipboard
// ------------------------------------------------------------
async function tryPasteFromClipboard() {
  if (!navigator.clipboard || !navigator.clipboard.readText) return null;
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return null;
    const m = text.trim().match(/https?:\/\/\S+/);
    return m ? m[0].replace(/[)\].,;!?"'>]+$/, '') : null;
  } catch (e) {
    return null;
  }
}

// ------------------------------------------------------------
// URL extraction (for the Import view)
// ------------------------------------------------------------
function extractUrls(text) {
  if (!text) return [];
  const seen = new Set();
  const out = [];
  const re = /https?:\/\/[^\s<>"']+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const clean = m[0].replace(/[)\].,;!?"'>]+$/, '');
    try { new URL(clean); } catch { continue; }
    if (!seen.has(clean)) { seen.add(clean); out.push(clean); }
  }
  return out;
}

let importState = { urls: [] };

function updateImportPreview() {
  const box = $('#import-preview');
  const btn = $('#btn-import-commit');
  const urls = importState.urls;
  if (!urls.length) { box.hidden = true; btn.disabled = true; return; }

  // Count duplicates against existing queue
  const existing = new Set(state.queue.map((a) => a.url));
  const fresh = urls.filter((u) => !existing.has(u));
  const dupes = urls.length - fresh.length;

  // Preview categorization
  const cats = new Map();
  for (const u of fresh) {
    const c = categorize({ url: u, title: '', source: hostnameOf(u) });
    cats.set(c, (cats.get(c) || 0) + 1);
  }
  const tags = [...cats.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `<span class="tag" style="--tag-color: ${colorForCategory(c)}">${escapeHtml(c)} · ${n}</span>`)
    .join('');

  box.hidden = false;
  box.innerHTML = `
    <div>Found <strong>${urls.length}</strong> URL${urls.length === 1 ? '' : 's'}${dupes ? ` <span class="muted">(${dupes} already in queue)</span>` : ''}.</div>
    ${tags ? `<div class="tag-row">${tags}</div>` : ''}
  `;
  btn.disabled = fresh.length === 0;
}

function refreshImportFromTextarea() {
  importState.urls = extractUrls($('#import-text').value);
  updateImportPreview();
}

async function handleImportFile(file) {
  if (!file) return;
  const text = await file.text();
  const current = $('#import-text').value;
  $('#import-text').value = current ? (current + '\n' + text) : text;
  refreshImportFromTextarea();
}

async function commitImport() {
  const urls = importState.urls.slice();
  if (!urls.length) return;

  const btn = $('#btn-import-commit');
  const preview = $('#import-preview');
  btn.disabled = true;
  preview.innerHTML = `
    <div class="import-progress">
      <div class="import-progress-title">Importing <strong id="imp-done">0</strong> / ${urls.length}</div>
      <div class="import-progress-track"><div class="import-progress-fill" id="imp-fill" style="width: 0%"></div></div>
      <div class="muted" style="margin-top: 6px; font-size: 12px;">Processing in batches of 50 so the app stays responsive…</div>
    </div>
  `;
  preview.hidden = false;

  const added = await addArticlesBulk(urls, (done, total, addedCount) => {
    const pct = Math.round((done / total) * 100);
    const fill = document.getElementById('imp-fill');
    const doneEl = document.getElementById('imp-done');
    if (fill) fill.style.width = pct + '%';
    if (doneEl) doneEl.textContent = String(done);
  });

  toast(added.length
    ? `Added ${added.length} article${added.length === 1 ? '' : 's'}`
    : 'Nothing new — all URLs already in queue');
  $('#import-text').value = '';
  $('#import-file').value = '';
  importState.urls = [];
  updateImportPreview();
  btn.disabled = false;
  showView('queue');
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

  $('#btn-export-queue').addEventListener('click', exportQueueAsFile);
  $('#restore-file').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importQueueFromBackup(file).then(() => { e.target.value = ''; });
  });

  $('#btn-queue').addEventListener('click', () => { renderQueues(); showView('queue'); });
  $('#btn-queue-back').addEventListener('click', () => showView(state.currentId ? 'player' : 'home'));
  $('#btn-back').addEventListener('click', () => showView('home'));

  $('#btn-add-url').addEventListener('click', () => {
    const url = $('#url-input').value;
    const a = addArticle(url);
    if (a) {
      $('#url-input').value = '';
      state.playScope = null; // single-article intent
      openArticle(a.id);
    }
  });
  $('#url-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-add-url').click();
  });

  // Clipboard: explicit paste button + silent attempt when the input gains focus
  $('#btn-paste').addEventListener('click', async () => {
    const url = await tryPasteFromClipboard();
    if (url) { $('#url-input').value = url; $('#url-input').focus(); }
    else toast('Clipboard is empty or has no URL');
  });
  $('#url-input').addEventListener('focus', async () => {
    if ($('#url-input').value) return;
    const url = await tryPasteFromClipboard();
    if (url) $('#url-input').value = url;
  });

  // Bulk paste: if someone pastes text containing 2+ URLs into the single-URL
  // field, route them to the Import view with the content pre-populated.
  $('#url-input').addEventListener('paste', (e) => {
    const pasted = ((e.clipboardData || window.clipboardData) || {}).getData ?
      (e.clipboardData || window.clipboardData).getData('text') : '';
    if (!pasted) return;
    const urls = extractUrls(pasted);
    if (urls.length >= 2) {
      e.preventDefault();
      $('#import-text').value = pasted;
      refreshImportFromTextarea();
      showView('import');
      toast(`Found ${urls.length} URLs — review and import`);
    }
  });

  // File drop anywhere on the URL row → hand off to the Import view.
  const urlRow = document.querySelector('.url-row');
  if (urlRow) {
    ['dragenter', 'dragover'].forEach((evt) => {
      urlRow.addEventListener(evt, (e) => {
        if (!e.dataTransfer || ![...e.dataTransfer.items].some((i) => i.kind === 'file')) return;
        e.preventDefault();
        urlRow.classList.add('dropping');
      });
    });
    ['dragleave', 'dragend'].forEach((evt) => {
      urlRow.addEventListener(evt, () => urlRow.classList.remove('dropping'));
    });
    urlRow.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      e.preventDefault();
      urlRow.classList.remove('dropping');
      showView('import');
      handleImportFile(file);
      toast('Dropped into Import');
    });
  }

  // Defensive listener helper — skips attaching when the element is absent
  // so a single renamed id can't silently break the rest of wire().
  const on = (id, evt, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(evt, handler);
  };

  // Import view — three entry points (onboarding card #03, populated home, queue view header)
  on('btn-open-import-home', 'click', () => showView('import'));
  on('btn-open-import-queue', 'click', () => showView('import'));
  on('btn-import-back', 'click', () => showView(state.queue.length ? 'queue' : 'home'));
  on('import-text', 'input', refreshImportFromTextarea);
  on('import-file', 'change', (e) => handleImportFile(e.target.files[0]));
  on('btn-import-commit', 'click', commitImport);
  on('btn-import-clear', 'click', () => {
    $('#import-text').value = '';
    $('#import-file').value = '';
    importState.urls = [];
    updateImportPreview();
  });

  // Bulk playback
  on('btn-play-all', 'click', playAll);

  // Onboarding cards (empty-home only)
  document.querySelectorAll('.onboarding-card').forEach((card) => {
    card.addEventListener('click', () => {
      const action = card.dataset.action;
      if (action === 'focus-url') $('#url-input').focus();
      else if (action === 'open-import') showView('import');
      else if (action === 'share-help') {
        toast('Open any article in Chrome → Share → Read It To Me');
      }
    });
  });

  on('btn-see-all', 'click', () => showView('queue'));

  on('btn-toggle-text', 'click', () => {
    const el = $('#article-body-pullout');
    el.open = !el.open;
    if (el.open) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Player transport — single play/pause button toggles icons internally.
  on('btn-playpause', 'click', togglePlayPause);
  on('btn-stop', 'click', stopPlayback);
  on('btn-prev', 'click', playPrev);
  on('btn-next', 'click', playNext);
  on('btn-share', 'click', sharePlayingArticle);
  on('btn-replay-article', 'click', () => {
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
