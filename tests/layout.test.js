const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const vm = require('node:vm');

const source = readFileSync(resolve(__dirname, '../book.js'), 'utf8');
const sizing = source.slice(source.indexOf('/* ---------- sizing'), source.indexOf('/* ---------- living art'));

function fixture(width, height, wide) {
  const properties = {};
  const removed = [];
  const inner = {style: {fontSize: '.48em'}, querySelector: () => ({classList: {remove: value => removed.push(value)}})};
  const nodes = {
    '.bar': {offsetHeight: 8},
    '.nav': {offsetHeight: width <= 640 ? 108 : 64, metrics: {marginTop: width <= 859 ? '14.4px' : '28.8px'}},
    '.stage': {metrics: {paddingTop: '4px', paddingBottom: '8px', paddingLeft: '12px', paddingRight: '12px'}},
    '.cover': {metrics: {paddingTop: '10px', paddingBottom: '10px', paddingLeft: '10px', paddingRight: '10px'}}
  };
  let resizeCallback, observed, particleResizes = 0;
  const frames = [];
  class ResizeObserver {
    constructor(callback) { resizeCallback = callback; }
    observe(node) { observed = node; }
  }
  const context = vm.createContext({
    window: {innerWidth: width, innerHeight: height, addEventListener() {}, ResizeObserver},
    ResizeObserver, getComputedStyle: node => node.metrics || {},
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    document: {
      querySelector: selector => nodes[selector],
      documentElement: {setAttribute() {}, style: {setProperty() {}}}
    },
    wide: {matches: wide}, activeTurn: null, positionMenu() {},
    spreadsEl: {style: {setProperty: (name, value) => properties[name] = value}},
    spreads: [{querySelectorAll: () => [inner]}],
    fx: {resize: () => particleResizes++}
  });
  vm.runInContext(sizing, context);
  return {context, nodes, properties, inner, removed, observed, resize: () => resizeCallback(),
    frame: () => frames.splice(0).forEach(callback => callback()), particleResizes: () => particleResizes};
}

test('phone sizing includes cover and stage padding without horizontal overflow', () => {
  const f = fixture(320, 568, false);
  assert.equal(f.properties['--bw'], '276px');
  assert.equal(parseFloat(f.properties['--bw']) + 20 + 24, 320);
  assert.ok(parseFloat(f.properties['--bh']) + 108 + 54.4 <= 569);
});

test('short landscape layouts fit readable side-by-side pages above the controls', () => {
  const f = fixture(568, 320, true);
  assert.ok(parseFloat(f.properties['--bw']) + 44 <= 568);
  assert.ok(parseFloat(f.properties['--bh']) + 108 + 54.4 <= 321);
  assert.equal(f.context.spreadsEl.style.fontSize, '1.000rem');
});

test('long pages retain their base font size and scroll instead of shrinking', () => {
  const f = fixture(320, 568, false);
  assert.equal(f.inner.style.fontSize, '');
  assert.equal(f.context.spreadsEl.style.fontSize, '1.000rem');
  assert.deepEqual(f.removed, ['cols2']);
});

test('desktop text respects the user font scale through rem units', () => {
  const f = fixture(1920, 1080, true);
  assert.match(f.context.spreadsEl.style.fontSize, /rem$/);
  assert.ok(parseFloat(f.context.spreadsEl.style.fontSize) * 16 >= 16);
  assert.ok(parseFloat(f.context.spreadsEl.style.fontSize) * 16 < 25.1);
});

test('wrapping playback messages updates the available book height', () => {
  const f = fixture(390, 844, false);
  assert.equal(f.observed, f.nodes['.nav']);
  const height = parseFloat(f.properties['--bh']);
  f.nodes['.nav'].offsetHeight += 40;
  f.resize();
  assert.equal(parseFloat(f.properties['--bh']), height);
  f.frame();
  assert.equal(parseFloat(f.properties['--bh']), height - 40);
  assert.equal(f.particleResizes(), 1);
  f.resize();
  f.frame();
  assert.equal(f.particleResizes(), 1);
});

test('playback status resizing waits for a page flip instead of cancelling it', () => {
  const f = fixture(390, 844, false);
  const height = parseFloat(f.properties['--bh']);
  let complete;
  f.context.activeTurn = {promise: {then: callback => complete = callback}};
  f.nodes['.nav'].offsetHeight += 40;
  f.resize(); f.frame();
  assert.equal(parseFloat(f.properties['--bh']), height);
  assert.equal(f.particleResizes(), 0);
  f.context.activeTurn = null;
  complete(); f.frame();
  assert.equal(parseFloat(f.properties['--bh']), height - 40);
  assert.equal(f.particleResizes(), 1);
});

test('chapter menus remain inside short screens and safe-area insets', () => {
  const menuSource = source.slice(source.indexOf('function positionMenu(){'), source.indexOf('/* progress ='));
  for (const [top, height, viewport, paddingTop, expected] of [
    [-8, 198, 320, '0px', 'translateY(20px)'],
    [480, 180, 568, '0px', 'translateY(-104px)'],
    [-8, 198, 320, '47px', 'translateY(55px)'],
    [100, 198, 568, '0px', '']
  ]) {
    const menu = {hidden: false, style: {}, getBoundingClientRect: () => ({top, height})};
    const context = vm.createContext({
      chMenu: menu, window: {innerHeight: viewport}, document: {documentElement: {}},
      getComputedStyle: () => ({paddingTop, paddingBottom: '0px'})
    });
    vm.runInContext(menuSource, context);
    context.positionMenu();
    assert.equal(menu.style.transform, expected);
  }
});
