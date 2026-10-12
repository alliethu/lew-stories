const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const vm = require('node:vm');

const root = resolve(__dirname, '..');
const source = readFileSync(resolve(root, 'book.js'), 'utf8');
const progressSource = source.slice(source.indexOf('/* ---------- saved reading:'), source.indexOf('/* ---------- page turning'));
const readerAPI = source.slice(source.indexOf('LewBook.jump ='), source.indexOf('window.addEventListener("hashchange"'));
const shareSource = source.slice(source.indexOf('/* ---------- share the current chapter'), source.indexOf('function closeMenu'));
const bookmark = (changes = {}) => ({
  version: 1, page: 'p1', scroll: [{top: 140, anchor: 'clip:b', fraction: .4}],
  audio: {id: 'b', time: 6}, answer: null, ...changes
});

function progressFixture(saved, {denyRead = false} = {}) {
  const stored = new Map(saved === undefined ? [] : [['lewReading', typeof saved === 'string' ? saved : JSON.stringify(saved)]]);
  const warnings = [], events = {}, focused = [], warmed = [], shown = [];
  const pages = [{key: 'title'}, {key: 'ch1'}, {key: 'p1'}, {key: 'all1', allPage: true}];
  const clips = [{id: 'a', page: 0, art: 'first'}, {id: 'b', page: 2, art: 'second'}];
  const rdQ = {textContent: ''};
  const rd = {open: false, scrollTop: 0, querySelector: () => rdQ, close() { this.open = false; }};
  const inners = [], spreads = pages.map((page, i) => {
    const inner = {scrollTop: 0, getBoundingClientRect: () => ({top: 0, bottom: 200, height: 200})};
    const anchors = i === 3 ? Array.from({length: 50}, (_, k) => ({
      dataset: {answer: String(k)}, offset: k * 100, question: `Question ${k}`, height: 100
    })) : [{dataset: {clip: i === 2 ? 'b' : 'a'}, offset: 100, height: 100}];
    for (const anchor of anchors) {
      anchor.getBoundingClientRect = () => ({top: anchor.offset - inner.scrollTop, bottom: anchor.offset - inner.scrollTop + anchor.height, height: anchor.height});
      anchor.matches = selector => selector === 'details' && anchor.dataset.answer !== undefined;
      anchor.closest = () => inner;
      anchor.querySelector = selector => selector === '.q' ? {textContent: anchor.question} : {focus: () => focused.push(anchor.question)};
    }
    inner.querySelectorAll = () => anchors;
    inners.push(inner);
    const heading = {focus: () => focused.push(page.key)};
    return {
      querySelectorAll: selector => selector === '.inner' ? [inner] : anchors.filter(a => a.question),
      querySelector: selector => selector === '.h' ? heading : anchors.find(a => a.dataset.answer === /data-answer="(\d+)"/.exec(selector)?.[1])
    };
  });
  const context = vm.createContext({
    PAGES: pages, CLIPS: clips, AUDIO: {a: 'a.mp3', b: 'b.mp3'}, spreads, rd,
    B: {}, cur: 0, resumeTarget: null, currentItem: null, introDone: false,
    audio: {currentTime: 4, getAttribute: () => 'b.mp3'},
    announce: {textContent: ''}, nowTitle: {textContent: ''}, LewBook: {}, queue: [],
    performance: {now: () => 1000}, setTimeout, clearTimeout,
    window: {addEventListener: (event, handler) => { events[event] = handler; }},
    document: {hidden: false, addEventListener: (event, handler) => { events[event] = handler; }},
    spreadsEl: {addEventListener: (event, handler) => { events[`spreads:${event}`] = handler; }},
    localStorage: {
      getItem(key) { if (denyRead) throw new Error('Storage denied'); return stored.get(key) || null; },
      setItem: (key, value) => stored.set(key, value)
    },
    console: {warn: (...args) => warnings.push(args)},
    finish() { context.currentItem = null; rd.close(); },
    cancelTurn() {}, lb: {open: false},
    settle(i) { context.cur = i; inners[i].scrollTop = 0; context.savePosition(); },
    setBtn() {}, pageName: i => pages[i].key, currentChapter: () => ({name: 'Chapter'}),
    artworkAt: clip => clip.art, showArt: (spread, art) => shown.push(art),
    preloadClip: clip => warmed.push(clip.id),
    openAnswer(answer) { rd.open = true; rdQ.textContent = answer.question; rd.scrollTop = 0; context.savePosition(); }
  });
  vm.runInContext(progressSource + readerAPI, context, {filename: 'book.js'});
  return {context, stored, warnings, events, focused, warmed, shown, inners, rd,
    position: () => JSON.parse(stored.get('lewReading'))};
}

test('visiting the opening does not overwrite a saved reading position', () => {
  const f = progressFixture(bookmark()), c = f.context;
  c.savePosition();
  assert.deepEqual(f.position(), bookmark());
  assert.equal(c.LewBook.getSavedReading().name, 'p1');
});

test('Continue restores the page, scroll anchor, and recording without starting audio', () => {
  const f = progressFixture(bookmark()), c = f.context;
  assert.equal(c.LewBook.resumeReading(), true);
  assert.equal(c.cur, 2);
  assert.equal(f.inners[2].scrollTop, 140);
  assert.equal(c.resumeTarget.id, 'b');
  assert.equal(c.resumeTarget.time, 6);
  assert.deepEqual(f.focused, ['p1']);
  assert.deepEqual(f.warmed, ['b']);
  assert.deepEqual(f.shown, ['second']);
  assert.deepEqual(f.position(), bookmark());
  assert.match(c.nowTitle.textContent, /Paused/);
});

test('reading anchors adapt to changed line heights rather than restoring only a pixel offset', () => {
  const f = progressFixture(bookmark()), c = f.context;
  const anchor = f.inners[2].querySelectorAll('[data-clip]')[0];
  anchor.height = 200; anchor.offset = 160;
  c.LewBook.resumeReading();
  assert.equal(f.inners[2].scrollTop, 240);
});

test('Continue restores an open written answer and its scrolling position', () => {
  const saved = bookmark({
    page: 'all1', audio: null, scroll: [{top: 1100, anchor: 'answer:11', fraction: 0}],
    answer: {question: 'Question 11', top: 240}
  });
  const f = progressFixture(saved), c = f.context;
  c.LewBook.resumeReading();
  assert.equal(c.cur, 3);
  assert.equal(f.inners[3].scrollTop, 1100);
  assert.equal(f.rd.open, true);
  assert.equal(f.rd.scrollTop, 240);
  assert.deepEqual(f.position(), saved);
});

test('Restart clears saved narration and answers and returns to the first page', () => {
  const f = progressFixture(bookmark()), c = f.context;
  c.LewBook.resumeReading(); c.LewBook.restartReading();
  assert.equal(c.cur, 0);
  assert.equal(c.introDone, false);
  assert.equal(f.position().page, 'title');
  assert.equal(f.position().audio, null);
  assert.equal(f.position().answer, null);
  assert.equal(c.LewBook.getSavedReading(), null);
});

test('explicit navigation takes priority over a pending saved recording', () => {
  const f = progressFixture(bookmark()), c = f.context;
  c.LewBook.resumeReading(); c.LewBook.jump('ch1');
  assert.equal(c.resumeTarget, null);
  assert.equal(f.position().page, 'ch1');
  assert.equal(f.position().audio, null);
});

test('explicit navigation focuses the destination heading rather than a hidden previous page', () => {
  const f = progressFixture(bookmark());
  assert.equal(f.context.LewBook.jump('all1'), true);
  assert.deepEqual(f.focused, ['all1']);
  f.context.LewBook.jump('ch1', false);
  assert.deepEqual(f.focused, ['all1']);
});

test('legacy response links focus their target question without resetting its scroll position', () => {
  for (const [key, question] of [['all2', 11], ['all3', 25], ['all4', 39]]) {
    const f = progressFixture(bookmark());
    assert.equal(f.context.LewBook.jump(key), true);
    assert.deepEqual(f.focused, [`Question ${question}`]);
    assert.equal(f.inners[3].scrollTop, question * 100);
  }
});

test('returning choices handle every Tab direction without relying on browser button-tab preferences', () => {
  const opening = readFileSync(resolve(root, 'coldopen.js'), 'utf8');
  const start = opening.indexOf('function onKey');
  const keyboard = opening.slice(start, opening.indexOf('  return {', start));
  for (const from of ['coContinue', 'coRestart']) {
    for (const shiftKey of [false, true]) {
      const document = {activeElement: null};
      const buttons = Object.fromEntries(['coContinue', 'coRestart'].map(id => [id, {
        id, focus() { document.activeElement = this; }
      }]));
      document.activeElement = buttons[from];
      let prevented = false;
      const context = vm.createContext({document, returning: true, $: id => buttons[id]});
      vm.runInContext(keyboard, context, {filename: 'coldopen.js'});
      context.onKey({key: 'Tab', shiftKey, preventDefault() { prevented = true; }});
      assert.equal(prevented, true);
      assert.equal(document.activeElement.id, from === 'coContinue' ? 'coRestart' : 'coContinue');
    }
  }
});

test('legacy response links open their original question in the continuous list', () => {
  const f = progressFixture(), c = f.context;
  c.LewBook.startRemembering();
  for (const [key, index] of [['all2', 11], ['all3', 25], ['all4', 39]]) {
    assert.equal(c.LewBook.isPageKey(key), true);
    assert.equal(c.LewBook.jump(key), true);
    assert.equal(c.cur, 3);
    assert.equal(f.inners[3].scrollTop, index * 100);
    assert.equal(f.position().page, 'all1');
  }
  assert.equal(c.LewBook.isPageKey('all99'), false);
  assert.equal(c.LewBook.jump('unknown'), false);
});

test('pagehide captures the latest narration timestamp and open answer position', () => {
  const f = progressFixture(), c = f.context;
  c.LewBook.jump('p1'); c.LewBook.startRemembering();
  c.currentItem = c.CLIPS[1]; c.audio.currentTime = 8.25;
  f.events.pagehide();
  assert.deepEqual(f.position().audio, {id: 'b', time: 8.25});
  c.LewBook.jump('all1');
  c.openAnswer(c.spreads[3].querySelectorAll('details.full')[4]); f.rd.scrollTop = 92;
  c.document.hidden = true; f.events.visibilitychange();
  assert.deepEqual(f.position().answer, {question: 'Question 4', top: 92});
});

test('outdated, corrupt, and nonfinite progress is rejected with explicit warnings', () => {
  for (const invalid of [
    '{broken', {version: 2}, bookmark({page: 'missing'}),
    bookmark({scroll: [{top: -1, anchor: null, fraction: 0}]}),
    bookmark({scroll: [{top: 1, anchor: null, fraction: null}]})
  ]) {
    const f = progressFixture(invalid);
    assert.equal(f.context.LewBook.getSavedReading(), null);
    assert.equal(f.warnings.length, 1);
    f.context.LewBook.startRemembering();
    assert.equal(f.position().version, 1);
  }
});

test('invalid saved narration is discarded without losing valid reading progress', () => {
  for (const audio of [{id: 'missing', time: 4}, {id: 'b', time: -1}, {id: 'a', time: 4}]) {
    const f = progressFixture(bookmark({audio})), c = f.context;
    c.LewBook.resumeReading();
    assert.equal(c.cur, 2);
    assert.equal(c.resumeTarget, null);
    assert.equal(f.position().audio, null);
    assert.equal(f.warnings.length, 1);
  }
});

test('unavailable or full storage reports the limitation without breaking reading', () => {
  const denied = progressFixture(undefined, {denyRead: true});
  denied.context.LewBook.startRemembering();
  assert.match(denied.context.announce.textContent, /cannot be saved/);
  assert.equal(denied.warnings.length, 1);
  const full = progressFixture();
  full.context.localStorage.setItem = () => { throw new Error('Storage full'); };
  full.context.LewBook.startRemembering(); full.context.savePosition();
  assert.match(full.context.announce.textContent, /cannot be saved/);
  assert.equal(full.warnings.length, 1);
});

test('the response index contains every original question exactly once, in order', () => {
  const context = vm.createContext({window: {}, PAGES: []});
  vm.runInContext(readFileSync(resolve(root, 'book-all.js'), 'utf8'), context);
  const appendix = source.slice(source.indexOf('if(window.BOOK_ALL'), source.indexOf('\nvar reduce'));
  vm.runInContext(appendix, context);
  assert.equal(context.PAGES.length, 1);
  const page = context.PAGES[0], answers = context.window.BOOK_ALL;
  assert.equal(page.key, 'all1');
  assert.equal(page.allPage, true);
  assert.equal(page.leftHtml, undefined);
  assert.equal([...page.html.matchAll(/data-answer="/g)].length, answers.length);
  assert.equal([...page.html.matchAll(/Read \(shortened\)/g)].length, answers.filter(a => a.short).length);
  answers.forEach((answer, index) => {
    assert.ok(page.html.includes(`data-answer="${index}"`));
    assert.ok(page.html.includes(answer.body));
  });
});

test('the single reading page does not require facing-page artwork decoration', () => {
  const decorate = source.slice(source.indexOf('function decorate(){'), source.indexOf('\ndecorate();'));
  const context = vm.createContext({
    PAGES: [{allPage: true}], spreads: [{querySelector() { throw new Error('No facing pages'); }}]
  });
  vm.runInContext(decorate, context);
  assert.doesNotThrow(() => context.decorate());
});

function shareFixture(navigator = {}, {canonical = true, hidden = false} = {}) {
  const warnings = [], fields = Object.fromEntries(['shareChapterBtn', 'shareStatus', 'shareLinkLabel', 'shareLink'].map(id => [id, {
    textContent: '', hidden: true, disabled: false, focused: false, selected: false,
    attributes: {},
    getAttribute(name) { return this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener() {}, focus() { this.focused = true; }, select() { this.selected = true; }
  }]));
  let placements = 0;
  const context = vm.createContext({
    navigator, URL, location: {href: 'http://localhost:8000/?debug=yes#p1'}, cur: 2,
    PAGES: [{key: 'title'}, {key: 'ch1'}, {key: 'p1'}, {key: 'ch10'}, {key: 'all1'}],
    CHS: [{i: 0, n: 0, name: 'Title page'}, {i: 1, n: 1, name: 'Isabell Circle'}, {i: 3, n: 10, name: 'Closing'}, {i: 4, n: -1, name: 'All his answers'}],
    document: {getElementById: id => fields[id], querySelector: () => canonical ? {href: 'https://alliethu.com/lew-stories/'} : null},
    chMenu: {hidden}, announce: {textContent: ''},
    positionMenu: () => placements++, console: {warn: (...args) => warnings.push(args)}
  });
  vm.runInContext(shareSource, context, {filename: 'book.js'});
  return {context, fields, warnings, placements: () => placements};
}

test('chapter sharing uses the public canonical URL and the current chapter opener', () => {
  const f = shareFixture(), c = f.context;
  assert.equal(c.sharingData().url, 'https://alliethu.com/lew-stories/#ch1');
  assert.match(c.sharingData().title, /Isabell Circle/);
  for (const [index, hash] of [[0, 'title'], [3, 'ch10'], [4, 'all1']]) {
    c.cur = index;
    assert.equal(c.sharingData().url, `https://alliethu.com/lew-stories/#${hash}`);
  }
  assert.equal(shareFixture({}, {canonical: false}).context.sharingData().url, 'http://localhost:8000/#ch1');
});

test('native sharing preserves focus and guards repeat activation without copying', async () => {
  let resolveShare, copied = 0, payload, calls = 0;
  const f = shareFixture({
    share(data) { calls++; payload = data; return new Promise(resolve => { resolveShare = resolve; }); },
    clipboard: {writeText() { copied++; }}
  });
  f.fields.shareChapterBtn.focus();
  const pending = f.context.shareChapter();
  assert.equal(f.fields.shareChapterBtn.getAttribute('aria-disabled'), 'true');
  assert.equal(f.fields.shareChapterBtn.disabled, false);
  assert.equal(f.fields.shareChapterBtn.focused, true);
  await f.context.shareChapter();
  assert.equal(calls, 1);
  assert.equal(payload.url, 'https://alliethu.com/lew-stories/#ch1');
  resolveShare(); await pending;
  assert.equal(f.fields.shareChapterBtn.getAttribute('aria-disabled'), null);
  assert.equal(f.fields.shareStatus.textContent, 'Shared.');
  assert.equal(copied, 0);
});

test('clipboard sharing guards repeat activation and permits retry after completion', async () => {
  let resolveCopy, calls = 0;
  const f = shareFixture({clipboard: {
    writeText() { calls++; return new Promise(resolve => { resolveCopy = resolve; }); }
  }});
  const pending = f.context.shareChapter();
  await f.context.shareChapter();
  assert.equal(calls, 1);
  assert.equal(f.fields.shareChapterBtn.getAttribute('aria-disabled'), 'true');
  resolveCopy(); await pending;
  assert.equal(f.fields.shareChapterBtn.getAttribute('aria-disabled'), null);
  f.context.navigator.clipboard.writeText = async () => { calls++; };
  await f.context.shareChapter();
  assert.equal(calls, 2);
});

test('canceling the native share sheet does not copy a link or report an error', async () => {
  let copied = 0;
  const f = shareFixture({
    share: () => Promise.reject(Object.assign(new Error('Canceled'), {name: 'AbortError'})),
    clipboard: {writeText() { copied++; }}
  });
  await f.context.shareChapter();
  assert.equal(copied, 0);
  assert.equal(f.warnings.length, 0);
  assert.equal(f.fields.shareStatus.textContent, 'Sharing canceled.');
  assert.equal(f.fields.shareChapterBtn.getAttribute('aria-disabled'), null);
});

test('clipboard fallback copies the chapter link and announces it even if the menu closes', async () => {
  let copied;
  const f = shareFixture({clipboard: {writeText: async text => { copied = text; }}}, {hidden: true});
  await f.context.shareChapter();
  assert.equal(copied, 'https://alliethu.com/lew-stories/#ch1');
  assert.equal(f.context.announce.textContent, 'Link copied.');
  assert.equal(f.fields.shareLinkLabel.hidden, true);
});

test('a failed native share uses clipboard fallback with an explicit diagnostic', async () => {
  let copied;
  const f = shareFixture({
    share: () => Promise.reject(new Error('Share service unavailable')),
    clipboard: {writeText: async text => { copied = text; }}
  });
  await f.context.shareChapter();
  assert.equal(copied, 'https://alliethu.com/lew-stories/#ch1');
  assert.equal(f.warnings.length, 1);
  assert.equal(f.fields.shareStatus.textContent, 'Link copied.');
});

test('clipboard failure provides a focused, selectable manual link instead of false success', async () => {
  for (const navigator of [{}, {clipboard: {writeText: () => Promise.reject(new Error('Clipboard denied'))}}]) {
    const f = shareFixture(navigator);
    await f.context.shareChapter();
    assert.equal(f.fields.shareLinkLabel.hidden, false);
    assert.equal(f.fields.shareLink.value, 'https://alliethu.com/lew-stories/#ch1');
    assert.equal(f.fields.shareLink.focused, true);
    assert.equal(f.fields.shareLink.selected, true);
    assert.match(f.fields.shareStatus.textContent, /Copy the link below/);
    assert.equal(f.fields.shareChapterBtn.getAttribute('aria-disabled'), null);
    assert.equal(f.warnings.length, 1);
    assert.equal(f.placements(), 1);
  }
});

test('a late clipboard failure does not focus a hidden field or show a stale chapter link', async () => {
  for (const change of [context => { context.chMenu.hidden = true; }, context => { context.cur = 4; }]) {
    let rejectCopy;
    const f = shareFixture({clipboard: {writeText: () => new Promise((resolve, reject) => { rejectCopy = reject; })}});
    const pending = f.context.shareChapter();
    change(f.context); rejectCopy(new Error('Clipboard denied')); await pending;
    assert.equal(f.fields.shareLinkLabel.hidden, true);
    assert.equal(f.fields.shareLink.focused, false);
    assert.match(f.context.chMenu.hidden ? f.context.announce.textContent : f.fields.shareStatus.textContent, /try sharing again/);
  }
});
