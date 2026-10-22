/* ClonBrow local API. Node 18+; no npm dependencies. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3789);
const ROOT = path.resolve(process.env.CLONBROW_ROOT || path.join(__dirname, '..'));
const INVENTORY_FILE = path.join(__dirname, 'catalog.json');
const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_DIR = path.join(__dirname, 'projects');
const CARDS_FILE = path.join(DATA_DIR, 'flashcards.json');
const inventory = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8')).inventory;
const items = inventory.filter(x => x.apiType !== 'package-support');
const byId = new Map(items.map(x => [x.id, x]));
const allowedFiles = new Set();
for (const item of items) {
  allowedFiles.add(item.path.replace(/\\/g, '/').toLowerCase());
  for (const ref of item.localReferences || []) {
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(item.path), ref));
    if (resolved && resolved !== '..' && !resolved.startsWith('../')) allowedFiles.add(resolved.toLowerCase());
  }
}
const tools = [
  ['bionic-reader', 'Bionic reader', 'Transform text for a reading aid.'],
  ['readability', 'Readability metrics', 'Word counts, grade estimate, and reading time.'],
  ['tone', 'Tone scanner', 'Count simple tone-word signals.'],
  ['ai-likeness', 'AI-likeness heuristic', 'Phrase and sentence-shape heuristic from main.html.'],
  ['vocabulary', 'Vocabulary upgrader', 'Replace weak phrases with suggested alternatives.'],
  ['regex', 'Regex tester', 'Run a regular expression against text.'],
  ['json', 'JSON studio', 'Validate and pretty-print JSON.'],
  ['markdown', 'Markdown sandbox', 'Return escaped Markdown source for safe preview.'],
  ['sql', 'SQL formatter', 'Apply the lightweight formatter from main.html.'],
  ['password', 'Password auditor', 'Estimate character-set entropy; never send real passwords to remote hosts.'],
  ['ascii-banner', 'ASCII banner', 'Create a simple text banner.'],
  ['typing-test', 'Typing test', 'Interactive page only; timing belongs in a browser client.'],
  ['serp-preview', 'SERP preview', 'Interactive page only; preview content is client supplied.'],
  ['calculator', 'Calculator', 'Interactive page only in this starter API.'],
  ['pomodoro', 'Pomodoro', 'Interactive timer; use the prototype page route.'],
  ['color-studio', 'Color studio', 'Interactive page; use the prototype page route.']
].map(([id, name, description]) => ({ id, name, description, api: ['bionic-reader','readability','tone','ai-likeness','vocabulary','regex','json','markdown','sql','password','ascii-banner'].includes(id) }));

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': data.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(data);
}
function jsonError(res, status, error, detail) { send(res, status, { error, detail }); }
function cors(req, res) {
  const origin = req.headers.origin || '';
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}
function cardStore() {
  try { return JSON.parse(fs.readFileSync(CARDS_FILE, 'utf8')); }
  catch (_) { return { cards: [] }; }
}
function saveCards(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = CARDS_FILE + '.new';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, CARDS_FILE);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { size += Buffer.byteLength(chunk); if (size > 1024 * 1024) { reject(new Error('Request body exceeds 1 MB.')); req.destroy(); } else body += chunk; });
    req.on('end', () => { if (!body) return resolve({}); try { resolve(JSON.parse(body)); } catch (_) { reject(new Error('Body must be valid JSON.')); } });
    req.on('error', reject);
  });
}
function pageMeta(item) {
  return Object.assign({}, item, { pageUrl: '/prototypes/' + item.path.split('/').map(encodeURIComponent).join('/') });
}
function catalog(url) {
  let out = items;
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const tag = url.searchParams.get('tag');
  const type = url.searchParams.get('type');
  if (q) out = out.filter(x => (x.title + ' ' + x.path + ' ' + x.tags.join(' ')).toLowerCase().includes(q));
  if (tag) out = out.filter(x => x.tags.includes(tag));
  if (type) out = out.filter(x => x.apiType === type);
  const limit = Math.min(262, Math.max(1, Number(url.searchParams.get('limit') || 262)));
  return { count: out.length, items: out.slice(0, limit).map(pageMeta) };
}
function openApi() {
  const paths = {
    '/api/v1/health': { get: { summary: 'Service health', responses: { '200': { description: 'API is running' } } } },
    '/api/v1/catalog': { get: { summary: 'Search all discovered HTML prototypes', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'tag', in: 'query', schema: { type: 'string' } }, { name: 'type', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Prototype catalog' } } } },
    '/api/v1/labs': { get: { summary: 'List lab pages', responses: { '200': { description: 'Lab catalog' } } } },
    '/api/v1/pages/{id}': { get: { summary: 'Get prototype metadata', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Prototype metadata' }, '404': { description: 'Unknown prototype' } } } },
    '/api/v1/pages/{id}/content': { get: { summary: 'Get prototype HTML source', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'HTML source' } } } },
    '/api/v1/tools': { get: { summary: 'List tools and direct API readiness', responses: { '200': { description: 'Tool catalog' } } } },
    '/api/v1/tools/{toolId}/run': { post: { summary: 'Run a supported text utility', parameters: [{ name: 'toolId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, pattern: { type: 'string' } } } } } }, responses: { '200': { description: 'Tool result' }, '400': { description: 'Invalid input' } } } },
    '/api/v1/decks': { get: { summary: 'List flashcard decks', responses: { '200': { description: 'Decks' } } } },
    '/api/v1/flashcards': { get: { summary: 'List flashcards' }, post: { summary: 'Create a flashcard', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['question','answer'], properties: { deck: { type: 'string' }, question: { type: 'string' }, answer: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } } } } } }, responses: { '201': { description: 'Created card' } } } },
    '/api/v1/flashcards/{id}': { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], get: { summary: 'Get a card' }, put: { summary: 'Update a card' }, delete: { summary: 'Delete a card' } },
    '/api/v1/flashcards/{id}/review': { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], post: { summary: 'Record a card review' } }
  };
  return { openapi: '3.0.3', info: { title: 'ClonBrow API', version: '1.0.0', description: 'Local API for ClonBrow prototypes, study tools, and flashcards.' }, servers: [{ url: 'http://127.0.0.1:' + PORT }], paths };
}
function wordTokens(text) { return (text.match(/[A-Za-z][A-Za-z']*/g) || []); }
function syllables(word) { const hits = word.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g); return Math.max(1, hits ? hits.length : 1); }
function runTool(id, input) {
  const text = String(input.text || '');
  if (id === 'readability') {
    const words = wordTokens(text), sentences = text.split(/[.!?]+/).filter(x => x.trim());
    const count = words.length, sentenceCount = Math.max(1, sentences.length), syllableCount = words.reduce((n, w) => n + syllables(w), 0);
    const grade = Math.max(1, Math.min(18, 0.39 * count / sentenceCount + 11.8 * syllableCount / Math.max(1, count) - 15.59));
    return { words: count, sentences: sentenceCount, averageSentenceWords: +(count / sentenceCount).toFixed(1), gradeLevel: +grade.toFixed(1), readingSeconds: Math.round(count / 238 * 60) };
  }
  if (id === 'bionic-reader') return { html: text.split(/(\s+)/).map(x => /^\w/.test(x) ? '<b>' + escapeHtml(x.slice(0, Math.ceil(x.length / 2))) + '</b>' + escapeHtml(x.slice(Math.ceil(x.length / 2))) : escapeHtml(x)).join('') };
  if (id === 'vocabulary') {
    const pairs = [['very good','excellent'],['very bad','terrible'],['very big','massive'],['very small','minimal'],['very important','critical'],['really good','outstanding'],['really bad','dreadful'],['really fast','rapid'],['a lot of','numerous'],['kind of','somewhat'],['sort of','somewhat'],['in order to','to'],['due to the fact that','because'],['at this point in time','now'],['in the event that','if'],['for the purpose of','for'],['utilize','use'],['utilizing','using'],['facilitate','help'],['commence','begin'],['terminate','end'],['endeavor','try'],['leverage','use'],['in conclusion','finally']];
    let upgraded = text; const changes = [];
    for (const [from, to] of pairs) { const re = new RegExp('\\b' + from.split(' ').join('\\s+') + '\\b', 'gi'); upgraded = upgraded.replace(re, m => { changes.push({ from: m, to }); return to; }); }
    return { text: upgraded, changes };
  }
  if (id === 'json') { try { const value = JSON.parse(text); return { valid: true, value, formatted: JSON.stringify(value, null, 2) }; } catch (e) { return { valid: false, error: e.message }; } }
  if (id === 'regex') { const pattern = String(input.pattern || ''); if (pattern.length > 256 || text.length > 10000 || /\([^)]*[+*][^)]*\)[+*{]/.test(pattern) || /\([^)]*\|[^)]*\)[+*{]/.test(pattern)) throw new Error('Pattern or text is too large, or the pattern uses a nested/repeated group the local API blocks for safety.'); try { const re = new RegExp(pattern, String(input.flags || '')); const matches = []; let m; if (re.global) { while ((m = re.exec(text)) && matches.length < 100) { matches.push({ match: m[0], index: m.index }); if (!m[0]) re.lastIndex++; } } else { m = re.exec(text); if (m) matches.push({ match: m[0], index: m.index }); } return { matches }; } catch (e) { return { error: e.message }; } }
  if (id === 'tone') {
    const groups = { confident: 'will must definitely certainly clearly ensure deliver lead achieve proven expert always', urgent: 'now immediately asap deadline today hurry critical urgent fast quick emergency', polite: 'please thank thanks would could appreciate kindly regards sorry may welcome', positive: 'good great love excellent happy glad wonderful amazing strong success win perfect', negative: 'bad poor hate terrible awful fail problem issue angry sad unfortunately wrong', hedging: 'just maybe perhaps might kinda sorta think guess hopefully' };
    const tokens = (text.toLowerCase().match(/[a-z']+/g) || []), result = {};
    for (const [name, words] of Object.entries(groups)) { const set = new Set(words.split(' ')); result[name] = { count: tokens.filter(w => set.has(w)).length, percent: +(tokens.filter(w => set.has(w)).length / Math.max(1, tokens.length) * 100).toFixed(1) }; }
    return { signals: result };
  }
  if (id === 'ai-likeness') {
    const phrases = ['delve','tapestry','furthermore','moreover','in conclusion','it is important to note','navigate the','landscape','testament to','ever-evolving','seamless','leverage','robust','underscore','pivotal','realm','harness','foster','multifaceted'];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).map(s => s.trim().split(/\s+/).length), avg = sentences.reduce((a,b) => a+b, 0) / Math.max(1, sentences.length);
    const sd = Math.sqrt(sentences.reduce((a,b) => a + Math.pow(b-avg, 2), 0) / Math.max(1, sentences.length));
    const words = (text.toLowerCase().match(/[a-z']+/g) || []), unique = new Set(words).size / Math.max(1, words.length), hits = phrases.filter(p => text.toLowerCase().includes(p));
    let score = 22; if (sd < 4) score += 18; if (avg > 21) score += 12; if (unique < .48) score += 15; score += Math.min(30, hits.length * 5); score = Math.max(5, Math.min(95, score));
    return { heuristicEstimate: score, averageSentenceWords: +avg.toFixed(1), sentenceLengthDeviation: +sd.toFixed(1), uniqueWordRatio: +unique.toFixed(2), matchedPhrases: hits, note: 'A simple text heuristic; not evidence of AI authorship.' };
  }
  if (id === 'password') {
    const password = String(input.password || ''), sets = [];
    let charset = 0; if (/[a-z]/.test(password)) { charset += 26; sets.push('lower'); } if (/[A-Z]/.test(password)) { charset += 26; sets.push('upper'); } if (/[0-9]/.test(password)) { charset += 10; sets.push('digits'); } if (/[^a-zA-Z0-9]/.test(password)) { charset += 33; sets.push('symbols'); }
    const entropyBits = password.length * Math.log2(charset || 1), tips = [];
    if (password.length < 12) tips.push('Use a longer password.'); if (sets.length < 3) tips.push('Consider mixing character types.'); if (/^[0-9]+$/.test(password)) tips.push('Digits alone are easy to guess.'); if (/(.)\1\1/.test(password)) tips.push('Avoid three repeated characters in a row.');
    return { length: password.length, characterSetSize: charset, entropyBits: +entropyBits.toFixed(1), strength: entropyBits < 28 ? 'weak' : entropyBits < 40 ? 'fair' : entropyBits < 60 ? 'strong' : 'excellent', tips, note: 'Estimate only. Passwords are processed locally by this server.' };
  }
  if (id === 'sql') { let sql = text.replace(/\s+/g, ' ').trim(); for (const kw of ['SELECT','FROM','WHERE','GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','INSERT INTO','VALUES','UPDATE','SET','DELETE FROM','LEFT JOIN','RIGHT JOIN','INNER JOIN','CROSS JOIN','JOIN','UNION ALL','UNION']) sql = sql.replace(new RegExp('\\b' + kw + '\\b', 'gi'), kw); for (const kw of ['SELECT','FROM','WHERE','GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','INSERT INTO','VALUES','UPDATE','SET','DELETE FROM','LEFT JOIN','RIGHT JOIN','INNER JOIN','CROSS JOIN','JOIN','UNION ALL','UNION']) sql = sql.replace(new RegExp('\\b' + kw + '\\b', 'g'), '\n' + kw); sql = sql.replace(/\b(AND|OR)\b/g, '\n    $1'); return { formatted: sql, parenthesesBalanced: (text.match(/\(/g) || []).length === (text.match(/\)/g) || []).length }; }
  if (id === 'markdown') return { source: text, html: '<pre>' + escapeHtml(text) + '</pre>', note: 'Escaped source is returned; use a trusted Markdown renderer for rich output.' };
  if (id === 'ascii-banner') { const line = String(input.text || '').trim().toUpperCase(); return { banner: line ? line + '\n' + '='.repeat(Math.min(80, line.length)) : '' }; }
  throw Object.assign(new Error('This tool is currently page-only or unknown.'), { status: 404 });
}
function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function mime(file) { return ({ '.html':'text/html; charset=utf-8','.htm':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.otf':'font/otf' })[path.extname(file).toLowerCase()] || 'application/octet-stream'; }

async function handle(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = decodeURIComponent(url.pathname);
  if (req.method === 'GET' && p === '/') return send(res, 200, { name: 'ClonBrow API', version: '1.0.0', docs: '/api/v1', openapi: '/api/v1/openapi.json', catalog: '/api/v1/catalog', labs: '/api/v1/labs', prototypes: items.length, loopbackOnly: true });
  if (req.method === 'GET' && p === '/api/v1') return send(res, 200, { endpoints: ['GET /api/v1/health','GET /api/v1/catalog','GET /api/v1/labs','GET /api/v1/tools','POST /api/v1/tools/{toolId}/run','GET/POST /api/v1/flashcards','POST /api/v1/flashcards/{id}/review','GET /api/v1/openapi.json'] });
  if (req.method === 'GET' && p === '/api/v1/openapi.json') return send(res, 200, openApi());
  if (req.method === 'GET' && p === '/api/v1/health') return send(res, 200, { ok: true, service: 'ClonBrow API', version: '1.0.0', prototypes: items.length, time: new Date().toISOString() });
  if (req.method === 'GET' && p === '/api/v1/catalog') return send(res, 200, catalog(url));
  if (req.method === 'GET' && p === '/api/v1/labs') { const found = items.filter(x => x.tags.includes('lab')).map(pageMeta); return send(res, 200, { count: found.length, items: found }); }
  if (req.method === 'GET' && p === '/api/v1/tools') return send(res, 200, { count: tools.length, tools });
  let m = p.match(/^\/api\/v1\/pages\/([^/]+)(\/content)?$/);
  if (req.method === 'GET' && m) {
    const item = byId.get(m[1]); if (!item) return jsonError(res, 404, 'not_found', 'Unknown prototype id.');
    const file = path.resolve(ROOT, item.path); if (!file.startsWith(ROOT + path.sep)) return jsonError(res, 400, 'invalid_path', 'Invalid prototype path.');
    if (m[2]) { try { return send(res, 200, fs.readFileSync(file), 'text/html; charset=utf-8'); } catch (_) { return jsonError(res, 404, 'content_missing', 'The HTML file is not available beside the API project.'); } }
    return send(res, 200, pageMeta(item));
  }
  if (req.method === 'POST' && (m = p.match(/^\/api\/v1\/tools\/([^/]+)\/run$/))) {
    try { const input = await readBody(req); return send(res, 200, { tool: m[1], result: runTool(m[1], input) }); }
    catch (e) { return jsonError(res, e.status || 400, e.status === 404 ? 'unsupported_tool' : 'invalid_input', e.message); }
  }
  if (req.method === 'GET' && p === '/api/v1/decks') {
    const cards = cardStore().cards, decks = new Map(); for (const c of cards) decks.set(c.deck, (decks.get(c.deck) || 0) + 1);
    return send(res, 200, { items: Array.from(decks, ([name, count]) => ({ name, count })) });
  }
  if (p === '/api/v1/flashcards' && req.method === 'GET') { const deck = url.searchParams.get('deck'); const cards = cardStore().cards.filter(c => !deck || c.deck === deck); return send(res, 200, { count: cards.length, items: cards }); }
  if (p === '/api/v1/flashcards' && req.method === 'POST') {
    try { const b = await readBody(req); if (!String(b.question || '').trim() || !String(b.answer || '').trim()) return jsonError(res, 400, 'validation_error', 'question and answer are required.');
      const data = cardStore(), card = { id: crypto.randomUUID(), deck: String(b.deck || 'default'), question: String(b.question), answer: String(b.answer), tags: Array.isArray(b.tags) ? b.tags.map(String) : [], createdAt: new Date().toISOString(), reviewCount: 0, lastReviewedAt: null };
      data.cards.push(card); saveCards(data); return send(res, 201, card);
    } catch (e) { return jsonError(res, 400, 'invalid_input', e.message); }
  }
  if ((m = p.match(/^\/api\/v1\/flashcards\/([^/]+)(\/review)?$/))) {
    const data = cardStore(), index = data.cards.findIndex(c => c.id === m[1]); if (index < 0) return jsonError(res, 404, 'not_found', 'Flashcard not found.');
    if (m[2] && req.method === 'POST') { data.cards[index].reviewCount++; data.cards[index].lastReviewedAt = new Date().toISOString(); saveCards(data); return send(res, 200, data.cards[index]); }
    if (m[2]) return jsonError(res, 405, 'method_not_allowed', 'Use POST to record a review.');
    if (req.method === 'GET') return send(res, 200, data.cards[index]);
    if (req.method === 'PUT') { try { const b = await readBody(req); for (const key of ['deck','question','answer','tags']) if (b[key] !== undefined) data.cards[index][key] = b[key]; saveCards(data); return send(res, 200, data.cards[index]); } catch (e) { return jsonError(res, 400, 'invalid_input', e.message); } }
    if (req.method === 'DELETE') { data.cards.splice(index, 1); saveCards(data); res.writeHead(204); return res.end(); }
  }
  if (req.method === 'GET' && p.startsWith('/prototypes/')) {
    let rel = p.slice('/prototypes/'.length).replace(/\\/g, '/');
    if (!rel || rel.includes('\0')) return jsonError(res, 400, 'invalid_path', 'Invalid prototype path.');
    const normalizedRel = path.posix.normalize(rel).replace(/^\.\//, '');
    const file = path.resolve(ROOT, normalizedRel); if (!file.startsWith(ROOT + path.sep)) return jsonError(res, 403, 'forbidden', 'Path is outside the prototype directory.');
    if (!allowedFiles.has(normalizedRel.toLowerCase())) return jsonError(res, 403, 'forbidden', 'Only inventoried prototypes and their referenced local assets are served.');
    try { if (!fs.statSync(file).isFile()) return jsonError(res, 404, 'not_found', 'File not found.'); return send(res, 200, fs.readFileSync(file), mime(file)); }
    catch (_) { return jsonError(res, 404, 'not_found', 'Prototype asset not found.'); }
  }
  if (req.method === 'GET' && p.startsWith('/projects/')) {
    const rel = p.slice('/projects/'.length).replace(/\\/g, '/');
    const file = path.resolve(PROJECTS_DIR, rel);
    if (!rel || !file.startsWith(PROJECTS_DIR + path.sep)) return jsonError(res, 403, 'forbidden', 'Project path is outside the projects folder.');
    if (!['.html','.htm','.js','.css','.json','.svg','.png','.jpg','.jpeg','.webp','.woff','.woff2','.otf'].includes(path.extname(file).toLowerCase())) return jsonError(res, 403, 'forbidden', 'Project file type is not served.');
    try { if (!fs.statSync(file).isFile()) return jsonError(res, 404, 'not_found', 'Project file not found.'); return send(res, 200, fs.readFileSync(file), mime(file)); }
    catch (_) { return jsonError(res, 404, 'not_found', 'Project file not found. Put your generated project in clonbrow-api/projects/.'); }
  }
  return jsonError(res, 404, 'not_found', 'No matching ClonBrow API route.');
}

const server = http.createServer((req, res) => { handle(req, res).catch(e => { if (!res.headersSent) jsonError(res, 500, 'server_error', e.message); else res.destroy(); }); });
server.listen(PORT, '127.0.0.1', () => console.log('ClonBrow API ready at http://127.0.0.1:' + PORT + ' (loopback only)'));
server.on('error', e => { console.error('Could not start ClonBrow API:', e.message); process.exitCode = 1; });
