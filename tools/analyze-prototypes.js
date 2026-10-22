const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.html?$/i.test(entry.name) && entry.name.toLowerCase() !== 'clonbrow-api-generator.html') files.push(full);
  }
}
walk(root);
files.sort((a, b) => path.relative(root, a).localeCompare(path.relative(root, b), 'en'));

const patterns = [
  ['lab', /\blab\b|laboratory/i], ['simulation', /simulat|simulator|virtual lab/i],
  ['game', /\bgame\b|arcade|puzzle|tictactoe|treasure hunt/i], ['quiz', /\bquiz\b|\btest\b|assessment/i],
  ['math', /math|algebra|geometry|trigon|calculus|fraction|equation|graph/i],
  ['biology', /bio|cell|gene|dna|blood|anatom|physiol|medical|health|organ|neuro|brain/i],
  ['chemistry', /chem|molecule|atom|reaction|acid|base|ph|titration/i],
  ['physics', /physics|force|motion|energy|wave|optics|electric|magnet|circuit/i],
  ['flashcards', /flash.?cards?/i], ['notes', /\bnotes?\b|notepad|journal/i],
  ['calculator', /calculat|converter|unit conversion/i], ['visualization', /diagram|visuali[sz]|3d|chart|graph|model/i],
  ['dashboard', /dashboard|hub/i], ['tool', /tool|editor|formatter|generator|simulator/i]
];

const inventory = files.map((full, index) => {
  const rel = path.relative(root, full).replace(/\\/g, '/');
  const html = fs.readFileSync(full, 'utf8');
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const isRuntimeFile = rel.startsWith('Clonbrow-win32-x64/');
  const tags = isRuntimeFile ? ['runtime-package'] : patterns.filter(([, re]) => re.test(rel) || re.test(title || '')).map(([tag]) => tag);
  const id = rel.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || `prototype-${index + 1}`;
  const external = Array.from(new Set((html.match(/https?:\/\/[^\s"'<>)}]+/gi) || []).map(x => x.replace(/[.,;]+$/, ''))));
  const externalApiEndpoints = [];
  for (const re of [/fetch\s*\(\s*["'`]([^"'`]+)["'`]/gi, /axios\.(?:get|post|put|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi, /\.open\s*\(\s*["'`][A-Z]+["'`]\s*,\s*["'`](https?:\/\/[^"'`]+)["'`]/gi, /new\s+WebSocket\s*\(\s*["'`](wss?:\/\/[^"'`]+)["'`]/gi]) {
    for (const match of html.matchAll(re)) if (/^(https?:|wss?:)/i.test(match[1])) externalApiEndpoints.push(match[1]);
  }
  if (!isRuntimeFile && externalApiEndpoints.length) tags.push('external-api');
  const isToolPage = /<input|<textarea|<button|<canvas|<form|addEventListener|onclick=|oninput=/i.test(html);
  const localReferences = Array.from(new Set([
    ...Array.from(html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi), m => m[1]),
    ...Array.from(html.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi), m => m[1])
  ].map(x => x.split(/[?#]/)[0].replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '').trim())
    .filter(x => x && !/^(?:https?:|data:|mailto:|javascript:|#)/i.test(x) && !x.split('/').includes('..'))));
  const apiType = isRuntimeFile ? 'package-support'
    : tags.some(t => ['lab','simulation','game','visualization'].includes(t))
    ? 'embeddable-page'
    : (isToolPage ? 'interactive-page' : 'content-page');
  const routes = rel.split('/');
  return {
    id, path: rel, title: (title || path.basename(rel, path.extname(rel))).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    tags: tags.length ? tags : ['prototype'], apiType,
    bytes: Buffer.byteLength(html), controls: {
      inputs: (html.match(/<input\b/gi) || []).length,
      textareas: (html.match(/<textarea\b/gi) || []).length,
      buttons: (html.match(/<button\b/gi) || []).length,
      canvases: (html.match(/<canvas\b/gi) || []).length,
      iframes: (html.match(/<iframe\b/gi) || []).length
    }, externalOrigins: external.map(x => { try { return new URL(x).origin; } catch (_) { return ''; } }).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, 12),
    externalApiEndpoints: Array.from(new Set(externalApiEndpoints)).slice(0, 12),
    hasLocalReferences: /(?:src|href)\s*=\s*["'](?!https?:|#|data:|mailto:|javascript:)[^"']+/i.test(html),
    localReferences: localReferences.slice(0, 40),
    resourceId: `p${String(index + 1).padStart(3, '0')}`,
    categoryPath: routes.length > 1 ? routes.slice(0, -1).join('/') : ''
  };
});

fs.writeFileSync(path.join(root, 'clonbrow-api-inventory.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: inventory.length, inventory }, null, 2));
const summary = {};
for (const item of inventory) {
  summary[item.apiType] = (summary[item.apiType] || 0) + 1;
  for (const tag of item.tags) summary['tag:' + tag] = (summary['tag:' + tag] || 0) + 1;
}
console.log(JSON.stringify({ count: inventory.length, totalBytes: inventory.reduce((sum, item) => sum + item.bytes, 0), summary }, null, 2));
