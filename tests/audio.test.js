const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const {resolve} = require('node:path');
const vm = require('node:vm');

const root = resolve(__dirname, '..');
const source = readFileSync(resolve(root, 'book.js'), 'utf8');
const audioSource = source.slice(
  source.indexOf('/* ---------- audio:'),
  source.indexOf('/* ---------- listening bar:')
);

function fixture(pages = [{key: 'title'}, {key: 'ch1'}, {key: 'p1'}, {key: 'answers'}]) {
  let now = 0, timerId = 0, blobId = 0;
  const timers = new Map(), players = [], requests = [], revoked = [], errors = [];
  const node = () => ({
    textContent: '', innerHTML: '', attributes: {}, events: {},
    classList: {add() {}, remove() {}},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.events[name] = handler; },
    querySelector() { return this; },
    getBoundingClientRect() { return {top: 0, bottom: 10, height: 100}; },
    scrollTo() {}
  });
  const ids = Object.fromEntries(['playBtn', 'nowTitle', 'announce', 'spdBtn'].map(id => [id, node()]));
  const clips = [
    {id: 'a', page: 0, art: 'first', title: 'First', el: node(), artAt: {art: 'second', frac: 0.5}},
    {id: 'b', page: 0, art: 'second', title: 'Second', el: node()},
    {id: 'c', page: 2, art: 'third', title: 'Third', el: node()}
  ];
  class Audio {
    constructor() {
      this._src = ''; this.currentTime = 0; this.duration = 10; this.paused = true;
      this.ended = false; this.error = null; this.playCalls = 0; this.results = []; this.readyState = 0;
      players.push(this);
    }
    set src(value) { this._src = value; this.currentTime = 0; this.ended = false; this.readyState = 0; }
    get src() { return this._src; }
    getAttribute() { return this._src || null; }
    removeAttribute() { this._src = ''; }
    load() { this.currentTime = 0; }
    pause() { this.paused = true; }
    play() {
      this.playCalls++; this.paused = false;
      return this.results.shift() || Promise.resolve().then(() => {
        if (!this.readyState) { this.readyState = 1; this.onloadedmetadata?.(); }
        this.onplaying?.();
      });
    }
    end() { this.ended = true; this.paused = true; this.onended?.(); }
  }
  const context = vm.createContext({
    Audio, AbortController, SpeechSynthesisUtterance: class {},
    window: {speechSynthesis: null}, document: {getElementById: id => ids[id]},
    localStorage: {getItem() {}, setItem() {}},
    performance: {now: () => now},
    setTimeout(handler, delay) { const id = ++timerId; timers.set(id, {handler, due: now + delay}); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options) {
      requests.push({url, signal: options.signal});
      return Promise.resolve({ok: true, blob: () => Promise.resolve({})});
    },
    URL: {createObjectURL: () => `blob:${++blobId}`, revokeObjectURL: url => revoked.push(url)},
    console: {error: (...args) => errors.push(args), warn: (...args) => errors.push(args)},
    PAGES: pages,
    CLIPS: clips, AUDIO: {a: 'a.mp3', b: 'b.mp3', c: 'c.mp3'}, B: {AUDIO_END: {}},
    DUR: {}, waitStart: null, cur: 0, busy: false, activeTurn: null, reduce: true, lastSave: 0,
    spreads: Array.from({length: pages.length}, () => ({querySelector: () => node()})),
    loadArt() {}, updateBar() {}, clearHL() {}, savePosition() {},
    itemDur(c) { return Math.min(context.DUR[c.id] || 10, context.B.AUDIO_END[c.id] || Infinity); },
    art: [], showArt(spread, key) { context.art.push(key); },
    turnTo(to) { context.cur = to; return Promise.resolve(); }
  });
  vm.runInContext(audioSource, context, {filename: 'book.js'});
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const advance = async ms => {
    const end = now + ms;
    while (true) {
      const next = [...timers.entries()].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      const [id, timer] = next; timers.delete(id); now = timer.due; timer.handler(); await flush();
    }
    now = end; await flush();
  };
  return {context, ids, clips, players, requests, revoked, errors, flush, advance};
}

test('initializing playback creates one reusable player, not one per recording', () => {
  const f = fixture();
  assert.equal(f.players.length, 1);
  assert.equal(f.requests.length, 0);
});

test('prefetching warms only one recording and uses it for the next clip', async () => {
  const f = fixture(), c = f.context;
  c.startFrom(0); await f.flush();
  assert.equal(c.currentItem.id, 'a');
  assert.deepEqual(f.requests.map(r => r.url), ['b.mp3']);
  f.players[0].end(); await f.flush();
  assert.equal(c.currentItem.id, 'b');
  assert.match(f.players[0].src, /^blob:/);
  assert.deepEqual(f.requests.map(r => r.url), ['b.mp3', 'c.mp3']);
  assert.equal(f.players.length, 1);
});

test('pause and resume preserve position, speed, and mid-recording artwork changes', async () => {
  const f = fixture(), c = f.context, audio = f.players[0];
  c.startFrom(0); await f.flush();
  audio.currentTime = 4; c.rate = 1.5; c.pausePlay(); c.resumePlay(); await f.flush();
  assert.equal(audio.currentTime, 4);
  assert.equal(audio.playbackRate, 1.5);
  audio.currentTime = 6; audio.ontimeupdate(); audio.ontimeupdate();
  assert.equal(c.art.filter(key => key === 'second').length, 1);
  assert.equal(audio.playCalls, 2);
});

test('saved narration begins at the saved clip and timestamp, not the first clip on its page', async () => {
  const f = fixture(), c = f.context, audio = f.players[0];
  c.resumeTarget = {id: 'b', time: 4.5};
  assert.equal(audio.playCalls, 0);
  c.startFrom(0); await f.flush();
  assert.equal(c.currentItem.id, 'b');
  assert.equal(audio.currentTime, 4.5);
  assert.equal(c.resumeTarget, null);
});

test('saved timestamps respect recording cutoffs and restore the matching artwork', async () => {
  const f = fixture(), c = f.context, audio = f.players[0];
  c.DUR.a = 10; c.B.AUDIO_END.a = 8;
  c.resumeTarget = {id: 'a', time: 1000};
  c.startFrom(0); await f.flush();
  assert.equal(audio.currentTime, 7.9);
  assert.equal(c.art[0], 'second');
});

test('pausing before saved audio loads still restores its timestamp after metadata is ready', async () => {
  const f = fixture(), c = f.context, audio = f.players[0];
  let complete;
  audio.results.push(new Promise(resolve => { complete = resolve; }));
  c.resumeTarget = {id: 'a', time: 6};
  c.startFrom(0); await f.flush(); c.pausePlay();
  audio.readyState = 1; audio.onloadedmetadata(); complete(); await f.flush();
  assert.equal(c.resumeTarget.time, 6);
  c.resumePlay(); await f.flush();
  assert.equal(audio.currentTime, 6);
  assert.equal(c.resumeTarget, null);
});

test('manual navigation clears a pending saved timestamp', async () => {
  const f = fixture(), c = f.context;
  c.resumeTarget = {id: 'a', time: 6};
  c.hop(2); await f.flush(); c.startFrom(2); await f.flush();
  assert.equal(c.resumeTarget, null);
  assert.equal(c.currentItem.id, 'c');
  assert.equal(f.players[0].currentTime, 0);
});

test('entering written responses stops narration and does not suggest playing missing audio', async () => {
  const f = fixture([{key: 'title'}, {key: 'ch1'}, {key: 'p1'}, {key: 'all1', allPage: true}]), c = f.context;
  c.startFrom(0); await f.flush(); c.hop(3); await f.flush();
  assert.equal(c.playing, false);
  assert.equal(f.ids.nowTitle.textContent, '');
  const plays = f.players[0].playCalls;
  c.startFrom(3); await f.flush();
  assert.equal(f.players[0].playCalls, plays);
  assert.equal(f.ids.nowTitle.textContent, '');
});

test('audio cutoffs still advance correctly after pause and resume', async () => {
  const f = fixture(), c = f.context, audio = f.players[0];
  c.B.AUDIO_END.a = 4;
  c.startFrom(0); await f.flush(); audio.currentTime = 2;
  c.pausePlay(); c.resumePlay(); await f.flush();
  audio.currentTime = 4; audio.ontimeupdate(); await f.flush();
  assert.equal(c.currentItem.id, 'b');
});

test('a stale play rejection cannot stop newly selected narration', async () => {
  const f = fixture(), c = f.context;
  let reject;
  f.players[0].results.push(new Promise((resolve, failure) => { reject = failure; }));
  c.startFrom(0); await f.flush(); c.startFrom(2); await f.flush();
  reject(new Error('Old request interrupted')); await f.flush();
  assert.equal(c.playing, true);
  assert.equal(c.currentItem.id, 'c');
  assert.equal(f.errors.length, 0);
});

test('blocked audio gives an explicit retry message rather than silently stopping', async () => {
  const f = fixture(), c = f.context;
  f.players[0].results.push(Promise.reject(Object.assign(new Error('Blocked'), {name: 'NotAllowedError'})));
  c.startFrom(0); await f.flush();
  assert.equal(c.playing, false);
  assert.match(f.ids.nowTitle.textContent, /blocked.*Press Play/);
  assert.equal(f.ids.announce.textContent, '');
  assert.equal(f.errors.length, 1);
});

test('late media errors are surfaced and buffering clears when audio starts', async () => {
  const f = fixture(), c = f.context, audio = f.players[0];
  c.startFrom(0); await f.flush();
  audio.onwaiting(); assert.equal(f.ids.nowTitle.textContent, 'Buffering audio...');
  audio.onplaying(); assert.equal(f.ids.nowTitle.textContent, 'First');
  audio.error = new Error('Network failed'); audio.onerror();
  assert.equal(c.playing, false);
  assert.match(f.ids.nowTitle.textContent, /could not load.*retry/);
});

test('pausing during a pending page turn does not start delayed audio', async () => {
  const f = fixture(), c = f.context;
  let complete;
  c.turnTo = to => new Promise(resolve => { complete = () => { c.cur = to; resolve(); }; });
  c.startFrom(2); c.pausePlay(); complete(); await f.flush();
  assert.equal(f.players[0].playCalls, 0);
  assert.equal(c.paused, true);
  c.resumePlay(); await f.flush();
  assert.equal(c.currentItem.id, 'c');
  assert.equal(f.players[0].playCalls, 1);
});

test('chapter opener pauses preserve the remaining hold instead of restarting it', async () => {
  const f = fixture(), c = f.context;
  c.startFrom(1); await f.flush(); await f.advance(500);
  c.pausePlay(); await f.advance(10000); c.resumePlay(); await f.flush();
  await f.advance(1499); assert.equal(f.players[0].playCalls, 0);
  await f.advance(1); assert.equal(c.currentItem.id, 'c');
});

test('chapter openers continue to narration after exactly two seconds', async () => {
  const f = fixture(), c = f.context;
  c.startFrom(1); await f.flush();
  await f.advance(1999); assert.equal(f.players[0].playCalls, 0);
  await f.advance(1); assert.equal(c.currentItem.id, 'c');
  assert.equal(f.players[0].playCalls, 1);
});

test('all nine chapter openers show their number and title, retain artwork, and have two-second holds', () => {
  const context = vm.createContext({window: {}});
  vm.runInContext(readFileSync(resolve(root, 'book-data.js'), 'utf8'), context);
  const book = context.window.BOOK, c = fixture(book.PAGES).context;
  const artwork = ['house', '2-00', '3-00', '4-00', '5-00', '6-op', '7-op', '8-op', '9-01'];
  for (let n = 1; n <= 9; n++) {
    const index = book.PAGES.findIndex(page => page.key === `ch${n}`), page = book.PAGES[index];
    assert.ok(page, `Missing chapter ${n}`);
    const opener = page.html.match(/^<div class="opener"><p class="label">Chapter (\d+)<\/p><h2 class="h" tabindex="-1">[^<]+<\/h2><\/div>$/);
    assert.ok(opener, `Chapter ${n} should contain only its number and title`);
    assert.equal(Number(opener[1]), n);
    assert.equal(page.art, artwork[n - 1]);
    assert.ok(book.ART[page.art], `Missing chapter ${n} artwork`);
    assert.equal(c.SEQ.find(item => item.page === index).wait, 2000);
  }
  const closingIndex = book.PAGES.findIndex(page => page.key === 'ch10');
  assert.match(book.PAGES[closingIndex].html, /Happy 75th/);
  assert.match(book.PAGES[closingIndex].html, /With love, from all of us/);
  assert.match(book.PAGES[closingIndex].html, /There\u2019s more to explore\. Keep reading for more of his original written responses\./);
  assert.match(book.PAGES[closingIndex].html, /<a href="#all1">Read his responses \u2192<\/a>/);
  assert.equal(c.SEQ.find(item => item.page === closingIndex).wait, 5500);
});

test('stopping while a manual page turn is pending cannot restart narration', async () => {
  const f = fixture(), c = f.context;
  c.startFrom(0); await f.flush();
  let complete;
  c.turnTo = to => new Promise(resolve => { complete = () => { c.cur = to; resolve(); }; });
  c.hop(2); c.finish(); complete(); await f.flush();
  assert.equal(c.playing, false);
  assert.equal(f.players[0].playCalls, 1);
});

test('unnarrated answer pages do not jump back to the beginning', async () => {
  const f = fixture(), c = f.context;
  c.cur = 3; c.startFrom(3); await f.flush();
  assert.equal(c.cur, 3);
  assert.equal(c.playing, false);
  assert.equal(f.players[0].playCalls, 0);
  assert.match(f.ids.nowTitle.textContent, /no narration/);
});

test('closing a picture or answer dialog resumes the same recording', async () => {
  const f = fixture(), c = f.context, audio = f.players[0];
  c.startFrom(0); await f.flush(); audio.currentTime = 3;
  c.autoPause('Reading'); assert.equal(c.paused, true);
  c.autoResume(); await f.flush();
  assert.equal(c.paused, false);
  assert.equal(audio.currentTime, 3);
});

test('finishing releases prefetched media and its blob URL', async () => {
  const f = fixture(), c = f.context;
  c.startFrom(0); await f.flush(); c.finish();
  assert.equal(c.preload, null);
  assert.equal(f.requests[0].signal.aborted, true);
  assert.equal(f.revoked.length, 1);
});

test('every mapped recording exists and has saved duration metadata', () => {
  const context = vm.createContext({window: {}});
  vm.runInContext(readFileSync(resolve(root, 'book-data.js'), 'utf8'), context);
  const book = context.window.BOOK;
  for (const [id, path] of Object.entries(book.AUDIO)) {
    assert.ok(existsSync(resolve(root, path)), `Missing recording ${id}`);
    assert.ok(book.AUDIO_DURATIONS[id] > 0, `Missing duration ${id}`);
  }
  for (const page of book.PAGES) for (const clip of page.clips || []) {
    assert.ok(book.AUDIO[clip.id], `Missing narration for ${clip.id}`);
    assert.ok(book.ART[clip.art], `Missing artwork for ${clip.id}`);
  }
});
