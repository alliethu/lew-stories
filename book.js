/* Book engine: builds spreads from window.BOOK, page turns, living watercolor, audio, lightbox. */
window.LewBook = { init: function(){
if(this.inited && document.getElementById("spreads").children.length) return;
this.inited = true;
var LewBook = this, B = window.BOOK, AUDIO = B.AUDIO, ART = B.ART, PAGES = B.PAGES, CHAPTERS = B.CHAPTERS;
if(window.BOOK_ALL && !PAGES.some(function(p){ return p.key === "all1"; })){
  var ALL = window.BOOK_ALL, per = 7, first = 4, chunks = [], at = 0;
  var allEsc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };
  chunks.push(ALL.slice(0, first)); at = first;
  while(at < ALL.length){ chunks.push(ALL.slice(at, at + per)); at += per; }
  if(chunks.length % 2) chunks.push([]);
  var item = function(a){ return '<details class="full"><summary><span class="q">'+allEsc(a.q)+'</span> <span class="more">Read'+(a.short ? ' (shortened)' : '')+' \u2192</span></summary><div class="body">'+a.body+'</div></details>'; };
  var head = '<h2 class="h" tabindex="-1">All his answers</h2><p class="all-note">Every question Storyworth asked him, in his own words. A few that appear in the book are shortened here too; four private answers are left out.</p>';
  for(var c = 0; c < chunks.length; c += 2){
    PAGES.push({key:"all" + (c/2 + 1), run:"All his answers", allPage:true,
      leftHtml:(c === 0 ? head : '<p class="running">All his answers</p>') + chunks[c].map(item).join(""),
      html:chunks[c+1].map(item).join("")});
  }
}

var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var wide = window.matchMedia("(min-width: 860px), (min-width: 540px) and (max-height: 500px)");
var spreadsEl = document.getElementById("spreads");
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

function picHTML(a, label){
  if(a.src && a.type === "video") return '<video class="pic" src="'+a.src+'" muted loop playsinline preload="metadata"'+(a.poster?' poster="'+a.poster+'"':'')+'></video><span class="live">Live</span>';
  if(a.src) return '<img class="pic" src="'+a.src+'" alt="" loading="lazy" decoding="async">';
  var p = a.pal || ["#e6d6b6","#cfd9c4","#e2cfc9","#f1e8d6"];
  return '<div class="pic wash" style="--c1:'+p[0]+';--c2:'+p[1]+';--c3:'+p[2]+';--c0:'+p[3]+'"></div><span class="chip">Add: '+esc(label)+'</span>';
}
function layerHTML(key){
  var a = ART[key];
  var inner;
  if(a.type === "album"){
    inner = '<div class="album'+(a.duo?' duo n'+a.items.length:'')+(a.pile?' pile':'')+'">' + a.items.map(function(it, i){
      var p = ["#e9d2ad","#d8c3a2","#cdb79a","#efe2c8"];
      var ph = it.src ? '<img class="pic" src="'+it.src+'" alt="'+esc(it.alt||"")+'" loading="lazy" decoding="async">' : '<div class="pic wash" style="--c1:'+p[0]+';--c2:'+p[1]+';--c3:'+p[2]+';--c0:'+p[3]+'"></div><span class="chip">'+esc(it.label)+'</span>';
      return '<div class="snap'+(it.cls?' '+it.cls:'')+'" style="--r:'+it.r+';--d:'+(0.25+i*0.35)+'s'+(it.ar?';--ar:'+it.ar:'')+'"><div class="ph">'+ph+'</div><span class="cap">'+esc(it.cap)+'</span></div>';
    }).join("") + '</div>';
  } else {
    var photo = a.src && /\.jpe?g/i.test(a.src) && !/^watercolor/i.test(a.alt||"");
    inner = '<div class="frame"'+(photo ? ' data-photo' : '')+(a.ratio ? ' data-ratio' : '')+(a.nomask ? ' data-nomask' : '')+((a.pad || a.ratio) ? ' data-pad' : '')+' style="--o:'+(a.o||"50% 50%")+';--op:'+(a.op||"50% 50%")+(a.ratio ? ';--ar:'+a.ratio : '')+'">'+picHTML(a, a.label)+'</div>';
  }
  return '<div class="layer" data-art="'+key+'"'+(a.pile?' role="group"':' role="img"')+' aria-label="'+esc(a.alt)+'">'+inner+'</div>';
}

function contentsHTML(){
  return '<h2 class="h" tabindex="-1">The questions</h2><ol class="qlist">' + CHAPTERS.map(function(c, i){
    var head = '<span class="n">'+(i+1)+'</span>';
    if(c[2] !== undefined && i === 0) return '<li>'+head+'<button type="button" data-go="'+c[2]+'"><span class="t">'+esc(c[0])+'</span></button><span class="q">'+esc(c[1])+'</span></li>';
    return '<li>'+head+'<span class="t">'+esc(c[0])+'</span><span class="q">'+esc(c[1])+'</span><span class="soon">Still being written</span></li>';
  }).join("") + '</ol>';
}

var CLIPS = [];
PAGES.forEach(function(pg, i){
  var arts = [];
  if(pg.art) arts.push(pg.art);
  (pg.clips || []).forEach(function(c){ if(arts.indexOf(c.art) < 0) arts.push(c.art); if(c.artAt && arts.indexOf(c.artAt.art) < 0) arts.push(c.artAt.art); });
  var right;
  if(pg.clips){
    right = '<p class="running">'+esc(pg.ch || "Chapter 1: Isabell Circle")+'</p><h3 class="h" tabindex="-1">'+esc(pg.title)+'</h3>' +
      pg.clips.map(function(c, k){ var q = (B.ASKED || {})[c.id], prev = k ? (B.ASKED || {})[pg.clips[k-1].id] : null;
        return (q && q !== prev ? '<p class="asked-q"><span class="k">Asked:</span> '+esc(q)+'</p>' : '') + '<p class="clip" data-clip="'+c.id+'">'+esc(c.text)+'</p>'; }).join("") +
      '' + (pg.after || "");
  } else {
    var h = pg.leftHtml ? pg.html : pg.html.replace("__CONTENTS__", contentsHTML()).replace("__FULLANS__", pg.full ? B["FULL_" + pg.full] : B.FULL_ANSWERS);
    right = (pg.run ? '<p class="running">'+esc(pg.run)+'</p>' : '') + h;
  }
  var s = document.createElement("section");
  s.className = "spread"; s.dataset.i = i; s.hidden = true;
  s.setAttribute("aria-label", "Page " + (i+1) + " of " + PAGES.length);
  s.innerHTML = pg.leftHtml ?
    '<div class="page left"><div class="inner all-list">'+pg.leftHtml+'</div><span class="folio" aria-hidden="true">'+(i*2+1)+'</span></div>' +
    '<div class="page right"><div class="inner all-list">'+(pg.run ? '<p class="running">'+esc(pg.run)+'</p>' : '')+pg.html+'</div><span class="folio" aria-hidden="true">'+(i*2+2)+'</span></div>' :
    '<div class="page left"><div class="art">'+arts.map(layerHTML).join("")+'<canvas class="fx" aria-hidden="true"></canvas><button class="enlarge" type="button" aria-label="View this picture larger"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><p class="caption" aria-hidden="true"></p><span class="folio" aria-hidden="true">'+(i*2+1)+'</span></div>' +
    '<div class="page right"><div class="inner">'+right+'</div><span class="folio" aria-hidden="true">'+(i*2+2)+'</span></div>';
  Array.prototype.forEach.call(s.querySelectorAll(".inner"), function(inner, side){
    inner.tabIndex = 0;
    inner.setAttribute("role", "region");
    inner.setAttribute("aria-label", pg.leftHtml ? (side ? "Questions, right page" : "Questions, left page") : "Story text");
  });
  spreadsEl.appendChild(s);
  if(!pg.clips) Array.prototype.forEach.call(s.querySelectorAll("[data-clip]"), function(el){ CLIPS.push({id:el.dataset.clip, page:i, art:pg.art, push:false, el:el, title:"Introduction"}); });
  (pg.clips || []).forEach(function(c){ CLIPS.push({id:c.id, page:i, art:c.art, push:!!c.push, artAt:c.artAt, el:s.querySelector('[data-clip="'+c.id+'"]'), title:pg.title}); });
});
var spreads = Array.prototype.slice.call(spreadsEl.children);
Array.prototype.forEach.call(spreadsEl.querySelectorAll(".frame[data-photo] img.pic"), function(im){
  function fit(){ if(!im.naturalWidth) return; var f = im.parentNode; f.style.setProperty("--ar", (im.naturalWidth/im.naturalHeight).toFixed(4)); f.setAttribute("data-ratio", ""); }
  if(im.complete) fit(); else im.addEventListener("load", fit);
});


/* ---------- watercolor generators ---------- */
function svgURL(s){ return 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")'; }
function washSVG(cols, seed, alpha){
  var e = cols.map(function(c, i){
    var cx = [130,260,200,90][i%4], cy = [120,170,90,200][i%4], rx = [120,110,90,80][i%4], ry = [80,70,60,55][i%4];
    return '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'" fill="'+c+'" opacity="'+(alpha||.75)+'"/>';
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="none"><defs><filter id="f" x="-30%" y="-30%" width="160%" height="160%">'+
    '<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="'+seed+'" result="n"/>'+
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="70" xChannelSelector="R" yChannelSelector="G" result="d"/>'+
    '<feGaussianBlur in="d" stdDeviation="7" result="b"/>'+
    '<feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="'+seed+'" result="g"/>'+
    '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.9 1.15" result="ga"/>'+
    '<feComposite in="b" in2="ga" operator="in"/></filter></defs><g filter="url(#f)">'+e+'</g></svg>';
}
function maskSVG(seed, m){ m = m || 4; var sc = m < 4 ? 7 : 10;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><filter id="m" x="-10%" y="-10%" width="120%" height="120%">'+
    '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="'+seed+'"/>'+
    '<feDisplacementMap in="SourceGraphic" scale="'+sc+'" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="0.7"/></filter>'+
    '<rect x="'+m+'" y="'+(m+1)+'" width="'+(100-2*m)+'" height="'+(98-2*m)+'" fill="#fff" filter="url(#m)"/></svg>';
}
var GRAIN = svgURL('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .55 0 0 0 0 .45 0 0 0 0 .3 0 0 0 .35 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>');
document.documentElement.style.setProperty("--grain", GRAIN);
document.body.style.setProperty("--deskwash", svgURL(washSVG(["#c7d6c0","#ead7b0","#c9d6e8","#e7cdc8"], 11, .45)));
var MASKS = [3,17,29,41,53].map(function(s){ return svgURL(maskSVG(s)); });
var MASKS_T = [3,17,29,41,53].map(function(s){ return svgURL(maskSVG(s, 2.2)); });
var PAL = {
  title:["#bcd0e8","#e9d6a8"], contents:["#e6c9a6","#bfd2e2"], ch1:["#b8cba6","#e6cf9a"], p1:["#ead2ad","#d9c6dc"], p2:["#a9c39a","#d9c88f"],
  p3:["#c7d2a2","#bcd0e4"], p4:["#efcf8f","#c4d1b1"], p5:["#8fa3c9","#e8c873"], p6:["#a8c08f","#d1ad7a"], p7:["#c9d6e8","#e6d4b4"],
  answers:["#e3d3b5","#c3d3ea"], ch2:["#e6d3a8","#c9d3c0"], q1:["#efe2c4","#c9d3c0"], q2:["#d9b98a","#a9b8d4"], q3:["#c7d2a2","#e6cf9a"], next:["#d9b98a","#a9b8d4"]
};
function decorate(){
  spreads.forEach(function(s, i){
    var pal = PAL[PAGES[i].key] || ["#d8cfb8","#c9d6e8"];
    var l = document.createElement("div"); l.className = "splash"; l.setAttribute("aria-hidden","true");
    l.style.backgroundImage = svgURL(washSVG([pal[0], pal[1], pal[0]], 7 + i*5));
    var r = document.createElement("div"); r.className = "splash"; r.setAttribute("aria-hidden","true");
    r.style.backgroundImage = svgURL(washSVG([pal[1], pal[0]], 19 + i*7, .6));
    s.querySelector(".page.left").insertBefore(l, s.querySelector(".page.left").firstChild);
    s.querySelector(".page.right").insertBefore(r, s.querySelector(".page.right").firstChild);
    Array.prototype.forEach.call(s.querySelectorAll(".frame"), function(f, k){ f.style.setProperty("--m", MASKS[(i + k) % MASKS.length]); f.style.setProperty("--mt", MASKS_T[(i + k) % MASKS.length]); });
    var c = s.querySelector(".clip"); if(c) c.classList.add("first");
  });
}
decorate();
function stacks(i){
  var t = PAGES.length - 1, f = t ? i / t : 0;
  spreadsEl.style.setProperty("--ls", Math.round(2 + f * 8) + "px");
  spreadsEl.style.setProperty("--rs", Math.round(2 + (1 - f) * 8) + "px");
}

/* ---------- sizing ---------- */
var navHeight = 0;
function size(){
  var vw = window.innerWidth, vh = window.innerHeight;
  var nav = document.querySelector(".nav"), stageStyle = getComputedStyle(document.querySelector(".stage"));
  var coverStyle = getComputedStyle(document.querySelector(".cover")), navStyle = getComputedStyle(nav);
  var rootStyle = getComputedStyle(document.documentElement);
  function pixels(style, name){ return parseFloat(style[name]) || 0; }
  var horizontalSpace = pixels(stageStyle, "paddingLeft") + pixels(stageStyle, "paddingRight") +
    pixels(coverStyle, "paddingLeft") + pixels(coverStyle, "paddingRight");
  navHeight = nav.offsetHeight;
  var availH = vh - document.querySelector(".bar").offsetHeight - navHeight -
    pixels(stageStyle, "paddingTop") - pixels(stageStyle, "paddingBottom") -
    pixels(coverStyle, "paddingTop") - pixels(coverStyle, "paddingBottom") -
    pixels(navStyle, "marginTop") - pixels(navStyle, "marginBottom") -
    pixels(rootStyle, "paddingTop") - pixels(rootStyle, "paddingBottom");
  var w, h;
  if(wide.matches){
    w = Math.min(2200, vw - (vw >= 860 ? 128 : horizontalSpace));
    h = Math.max(144, Math.min(availH, w / 2 * 1.12));
    w = Math.min(w, h * 2 / 0.62);
  } else {
    w = vw - horizontalSpace; h = Math.max(availH, 220);
  }
  var pa = wide.matches ? (w / 2) / h : w / (h * 0.45);
  document.documentElement.setAttribute("data-fit", pa >= 1.25 ? "cover" : "contain");
  spreadsEl.style.setProperty("--bw", Math.round(w) + "px");
  spreadsEl.style.setProperty("--bh", Math.round(h) + "px");
  document.documentElement.style.setProperty("--bw", Math.round(w) + "px");
  spreadsEl.style.fontSize = (Math.max(16, Math.min(25, h / 37)) / 16).toFixed(3) + "rem";
  fitAll();
}
function fitAll(){
  spreads.forEach(function(s){
    Array.prototype.forEach.call(s.querySelectorAll(".inner"), function(inner){
      inner.style.fontSize = "";
      var ql = inner.querySelector(".qlist"); if(ql) ql.classList.remove("cols2");
    });
  });
}
if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ relayout(); });
function relayout(){
  if(activeTurn){ var to = activeTurn.to; cancelTurn(); settle(to, false); }
  size(); fx.resize(); positionMenu();
}
size(); window.addEventListener("resize", relayout);
if(window.ResizeObserver){
  var resizeFrame = 0;
  function resizeForNav(){
    if(resizeFrame) return;
    resizeFrame = requestAnimationFrame(function(){
      resizeFrame = 0;
      if(activeTurn){ activeTurn.promise.then(resizeForNav); return; }
      size(); fx.resize(); positionMenu();
    });
  }
  new ResizeObserver(function(){
    if(document.querySelector(".nav").offsetHeight !== navHeight) resizeForNav();
  }).observe(document.querySelector(".nav"));
}

/* ---------- living art (particles) ---------- */
var fx = (function(){
  var canvas = null, ctx = null, kind = "none", parts = [], raf = 0, t0 = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  function rand(a, b){ return a + Math.random() * (b - a); }
  function seed(){
    parts = []; var W = canvas.width, H = canvas.height, n;
    if(kind === "motes"){ n = 26; for(var i=0;i<n;i++) parts.push({x:rand(0,W),y:rand(0,H),r:rand(1,2.6)*dpr,vy:rand(-.12,-.35)*dpr,vx:rand(-.08,.08)*dpr,ph:rand(0,6.28)}); }
    if(kind === "fireflies"){ n = 14; for(var j=0;j<n;j++) parts.push({x:rand(0,W),y:rand(H*.3,H),r:rand(1.6,2.8)*dpr,a:rand(0,6.28),sp:rand(.15,.4)*dpr,ph:rand(0,6.28)}); }
    if(kind === "leaves"){ n = 9; for(var k=0;k<n;k++) parts.push({x:rand(0,W),y:rand(-H,0),s:rand(4,7)*dpr,vy:rand(.25,.55)*dpr,rot:rand(0,6.28),vr:rand(-.02,.02),sw:rand(0,6.28),c:["#a7b878","#c9a35a","#b6884f"][k%3]}); }
    if(kind === "ripples"){ parts = []; }
  }
  function frame(t){
    raf = requestAnimationFrame(frame);
    if(!ctx) return;
    var W = canvas.width, H = canvas.height, s = (t - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    if(kind === "motes"){
      parts.forEach(function(p){ p.x += p.vx + Math.sin(s*.6+p.ph)*.06*dpr; p.y += p.vy; if(p.y < -5) { p.y = H + 5; p.x = rand(0,W); }
        var a = .25 + .3 * (0.5 + 0.5*Math.sin(s*1.3 + p.ph));
        ctx.beginPath(); ctx.fillStyle = "rgba(255,246,214," + a + ")"; ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); });
    } else if(kind === "fireflies"){
      parts.forEach(function(p){ p.a += rand(-.08,.08); p.x += Math.cos(p.a)*p.sp; p.y += Math.sin(p.a)*p.sp*.6;
        if(p.x<0||p.x>W) p.a = Math.PI - p.a; if(p.y<H*.25||p.y>H) p.a = -p.a;
        var a = Math.max(0, Math.sin(s*1.7 + p.ph)); var g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*5);
        g.addColorStop(0,"rgba(240,236,140,"+(.9*a)+")"); g.addColorStop(1,"rgba(240,236,140,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*5,0,6.28); ctx.fill(); });
    } else if(kind === "leaves"){
      parts.forEach(function(p){ p.y += p.vy; p.x += Math.sin(s*.9 + p.sw) * .5 * dpr; p.rot += p.vr; if(p.y > H + 10){ p.y = -10; p.x = rand(0,W); }
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot + Math.sin(s+p.sw)*.4); ctx.fillStyle = p.c; ctx.globalAlpha = .75;
        ctx.beginPath(); ctx.ellipse(0,0,p.s,p.s*.45,0,0,6.28); ctx.fill(); ctx.restore(); });
    } else if(kind === "ripples"){
      if(Math.random() < .045) parts.push({x:rand(W*.05,W*.95), y:rand(H*.45,H*.95), r:0, max:rand(14,30)*dpr});
      parts = parts.filter(function(p){ return p.r < p.max; });
      parts.forEach(function(p){ p.r += .32*dpr; var a = 1 - p.r/p.max;
        ctx.strokeStyle = "rgba(255,255,255," + (.55*a) + ")"; ctx.lineWidth = 1.2*dpr;
        ctx.beginPath(); ctx.ellipse(p.x,p.y,p.r,p.r*.38,0,0,6.28); ctx.stroke(); });
    }
  }
  return {
    set: function(c, k){
      canvas = c; kind = reduce ? "none" : (k || "none");
      ctx = canvas ? canvas.getContext("2d") : null; this.resize(); t0 = performance.now();
      if(ctx) ctx.clearRect(0,0,canvas.width,canvas.height);
      seed(); if(!raf && kind !== "none") raf = requestAnimationFrame(frame);
      if(kind === "none" && raf){ cancelAnimationFrame(raf); raf = 0; }
    },
    resize: function(){ if(!canvas) return; var r = canvas.getBoundingClientRect(); canvas.width = Math.max(1, r.width*dpr); canvas.height = Math.max(1, r.height*dpr); seed(); }
  };
})();

/* ---------- art switching ---------- */
function loadArt(spread, key){
  Array.prototype.forEach.call(spread.querySelectorAll(".layer"), function(layer){
    if(layer.dataset.art === key) Array.prototype.forEach.call(layer.querySelectorAll("img"), function(img){ img.loading = "eager"; });
  });
}
function showArt(spread, key, push){
  var a = ART[key]; if(!a) return;
  loadArt(spread, key);
  Array.prototype.forEach.call(spread.querySelectorAll(".layer"), function(l){
    var on = l.dataset.art === key;
    if(on && !l.classList.contains("show")){
      l.classList.add("show");
      Array.prototype.forEach.call(l.querySelectorAll(".snap"), function(sn){ sn.classList.remove("settled"); setTimeout(function(){ sn.classList.add("settled"); }, 1600); });
    }
    if(!on) l.classList.remove("show");
    l.classList.toggle("push", on && !!push);
    var v = l.querySelector("video");
    if(v){ if(on && !reduce) v.play().catch(function(){}); else v.pause(); }
  });
  spread.querySelector(".caption").textContent = a.caption || "";
  fx.set(spread.querySelector(".fx"), a.fx);
}
function firstArt(i){
  var pg = PAGES[i];
  return pg.clips ? {key:pg.clips[0].art, push:false} : {key:pg.art, push:false};
}

/* ---------- page turning ---------- */
var cur = 0, busy = false, activeTurn = null;
var countEl = document.getElementById("count"), announce = document.getElementById("announce");
var prevBtn = document.getElementById("prevBtn"), nextBtn = document.getElementById("nextBtn");
function pageName(i){
  var pg = PAGES[i];
  if(pg.title) return pg.title;
  var h = spreads[i].querySelector(".h"); return h ? h.textContent : "";
}
function settle(i, focus){
  spreads.forEach(function(s, k){ s.hidden = k !== i; s.style.visibility = ""; });
  cur = i;
  var f = firstArt(i); showArt(spreads[i], f.key, f.push);
  stacks(i);
  prevBtn.disabled = i === 0; nextBtn.disabled = i === PAGES.length - 1;
  countEl.textContent = "Page " + (i+1) + " of " + PAGES.length;
  updateBar(i);
  announce.textContent = "Page " + (i+1) + " of " + PAGES.length + ": " + pageName(i);
  var inner = spreads[i].querySelector(".inner"); if(inner) inner.scrollTop = 0;
  if(focus){ var h = spreads[i].querySelector(".h"); if(h) h.focus({preventScroll:true}); }
  if(spreads[i+1]) loadArt(spreads[i+1], firstArt(i+1).key);
  if(!playing) warmPage(i);
}
function cloneFor(el){
  var c = el.cloneNode(true);
  c.removeAttribute("id");
  Array.prototype.forEach.call(c.querySelectorAll("[id]"), function(n){ n.removeAttribute("id"); });
  Array.prototype.forEach.call(c.querySelectorAll("video"), function(v){ v.removeAttribute("autoplay"); });
  Array.prototype.forEach.call(c.querySelectorAll(".layer:not(.show)"), function(l){ l.remove(); });
  return c;
}
function cancelTurn(){
  if(!activeTurn) return;
  var turn = activeTurn; activeTurn = null; busy = false;
  turn.cancelled = true;
  turn.animations.forEach(function(a){ a.cancel(); });
  turn.stage.remove();
}
function animate(el, frames, ms){
  var a = el.animate(frames, {duration:ms, easing:"cubic-bezier(.45,.05,.3,1)", fill:"forwards"});
  activeTurn.animations.push(a);
  return a.finished;
}
function turnTo(to, opts){
  opts = opts || {};
  if(busy) return activeTurn.promise;
  if(to === cur || to < 0 || to >= PAGES.length) return Promise.resolve();
  var from = cur, fwd = to > from;
  var A = spreads[from], B = spreads[to];
  if(reduce || !A.animate){
    settle(to, !opts.auto); return Promise.resolve();
  }
  busy = true;
  // prepare destination art so clones show it
  B.hidden = false; B.style.visibility = "hidden";
  var f = firstArt(to); showArt(B, f.key, false);
  // Finish entrance effects before copying the destination, not after the turn.
  if(B.getAnimations) B.getAnimations({subtree:true}).forEach(function(a){
    if(a.effect.getTiming().iterations !== Infinity) a.finish();
  });
  var stage = document.createElement("div"); stage.className = "flip"; stage.setAttribute("aria-hidden", "true");
  stage.inert = true;
  var turn = activeTurn = {stage:stage, animations:[], cancelled:false, to:to};
  var ms = 600, jobs = [], scrolls = [];
  function copy(page){
    var c = cloneFor(page), source = page.querySelectorAll(".inner"), target = c.querySelectorAll(".inner");
    Array.prototype.forEach.call(source, function(inner, i){ scrolls.push({el:target[i], top:inner.scrollTop}); });
    return c;
  }
  function freezeCopy(root){
    Array.prototype.forEach.call(root.querySelectorAll(".page"), function(page){
      if(!page.getAnimations) return;
      page.getAnimations({subtree:true}).forEach(function(a){
        if(a.effect.getTiming().iterations === Infinity) a.pause(); else a.finish();
      });
    });
  }
  function mount(){
    A.style.visibility = "hidden"; spreadsEl.appendChild(stage);
    scrolls.forEach(function(s){ s.el.scrollTop = s.top; });
    freezeCopy(stage);
  }
  function rotate(leaf, front, back, start, end, duration){
    var mid = (start + end) / 2;
    front.hidden = start !== 0; back.hidden = start === 0;
    return animate(leaf, [{transform:"rotateY("+start+"deg)"}, {transform:"rotateY("+mid+"deg)"}], duration / 2).then(function(){
      if(turn.cancelled) return;
      // Hide the outgoing face explicitly; nested transforms can defeat backface culling.
      front.hidden = end !== 0; back.hidden = end === 0;
      freezeCopy(end === 0 ? front : back);
      return animate(leaf, [{transform:"rotateY("+mid+"deg)"}, {transform:"rotateY("+end+"deg)"}], duration / 2);
    });
  }
  function half(cls, page){ var d = document.createElement("div"); d.className = "half " + cls; d.appendChild(copy(page)); var sh = document.createElement("div"); sh.className = "shadow"; d.appendChild(sh); stage.appendChild(d); return d; }
  function face(leaf, cls, page){ var d = document.createElement("div"); d.className = "face " + cls; if(page) d.appendChild(copy(page)); else { var p = document.createElement("div"); p.className = "page"; d.appendChild(p); } var sh = document.createElement("div"); sh.className = "shade"; d.appendChild(sh); leaf.appendChild(d); return d; }
  if(wide.matches){
    var Lsrc = fwd ? A : B, Rsrc = fwd ? B : A;
    var uL = half("under-l", Lsrc.querySelector(".page.left"));
    var uR = half("under-r", Rsrc.querySelector(".page.right"));
    var leaf = document.createElement("div"); leaf.className = "leaf " + (fwd ? "fwd" : "back");
    var front = face(leaf, "recto", fwd ? A.querySelector(".page.right") : A.querySelector(".page.left"));
    var back = face(leaf, "verso", fwd ? B.querySelector(".page.left") : B.querySelector(".page.right"));
    stage.appendChild(leaf);
    mount();
    var dirDeg = fwd ? -180 : 180;
    var fs = front.querySelector(".shade"), bs = back.querySelector(".shade");
    fs.style.background = fwd ? "linear-gradient(to left, rgba(40,30,10,.35), rgba(40,30,10,0) 70%)" : "linear-gradient(to right, rgba(40,30,10,.35), rgba(40,30,10,0) 70%)";
    bs.style.background = fwd ? "linear-gradient(to left, rgba(40,30,10,0) 30%, rgba(40,30,10,.3))" : "linear-gradient(to right, rgba(40,30,10,0) 30%, rgba(40,30,10,.3))";
    var cast = (fwd ? uR : uL).querySelector(".shadow");
    cast.style.background = fwd ? "linear-gradient(to right, rgba(30,22,8,.45), rgba(30,22,8,0) 60%)" : "linear-gradient(to left, rgba(30,22,8,.45), rgba(30,22,8,0) 60%)";
    var land = (fwd ? uL : uR).querySelector(".shadow");
    land.style.background = fwd ? "linear-gradient(to left, rgba(30,22,8,.35), rgba(30,22,8,0) 55%)" : "linear-gradient(to right, rgba(30,22,8,.35), rgba(30,22,8,0) 55%)";
    jobs.push(rotate(leaf, front, back, 0, dirDeg, ms));
    jobs.push(animate(fs, [{opacity:0},{opacity:1}], ms*0.5));
    jobs.push(animate(bs, [{opacity:1},{opacity:1, offset:.5},{opacity:0}], ms));
    jobs.push(animate(cast, [{opacity:1},{opacity:.6, offset:.4},{opacity:0}], ms));
    jobs.push(animate(land, [{opacity:0},{opacity:0, offset:.5},{opacity:1, offset:.8},{opacity:0}], ms));
  } else {
    var under = document.createElement("div"); under.className = "half solo"; stage.appendChild(under);
    var leaf2 = document.createElement("div"); leaf2.className = "leaf fwd solo"; leaf2.style.left = "0"; leaf2.style.transformOrigin = "left center";
    var topSpread = fwd ? A : B, bottomSpread = fwd ? B : A;
    var u = copy(bottomSpread); u.hidden = false; u.style.visibility = ""; under.appendChild(u);
    var fr = document.createElement("div"); fr.className = "face recto"; var t = copy(topSpread); t.hidden = false; t.style.visibility = ""; fr.appendChild(t);
    var sh2 = document.createElement("div"); sh2.className = "shade"; sh2.style.background = "linear-gradient(to left, rgba(40,30,10,.4), rgba(40,30,10,0) 70%)"; fr.appendChild(sh2); leaf2.appendChild(fr);
    var bk = face(leaf2, "verso", null);
    stage.appendChild(leaf2);
    mount();
    var k0 = fwd ? 0 : -180, k1 = fwd ? -180 : 0;
    jobs.push(rotate(leaf2, fr, bk, k0, k1, ms));
    jobs.push(animate(sh2, fwd ? [{opacity:0},{opacity:1}] : [{opacity:1},{opacity:0}], ms*0.9));
  }
  turn.promise = Promise.all(jobs).then(function(){
    if(turn.cancelled) return;
    cancelTurn(); settle(to, !opts.auto);
  }, function(error){
    if(turn.cancelled) return;
    console.error("Page turn animation failed", error);
    cancelTurn(); settle(to, !opts.auto);
  });
  return turn.promise;
}
prevBtn.addEventListener("click", function(){ hop(cur - 1); });
nextBtn.addEventListener("click", function(){ hop(cur + 1); });
document.addEventListener("keydown", function(e){
  var t = e.target; if(e.defaultPrevented || (t && t.closest && t.closest("input,select,textarea,summary,details,dialog"))) return;
  if(e.key === "ArrowRight") { hop(cur + 1); }
  if(e.key === "ArrowLeft") { hop(cur - 1); }
});
var tx = null, ty = null;
spreadsEl.addEventListener("touchstart", function(e){ tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, {passive:true});
spreadsEl.addEventListener("touchend", function(e){
  if(tx === null) return; var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null;
  if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5){ hop(cur + (dx < 0 ? 1 : -1)); }
}, {passive:true});
spreadsEl.addEventListener("click", function(e){
  var go = e.target.closest("[data-go]"); if(go){ hop(parseInt(go.dataset.go, 10)); return; }
});
// hovering a paragraph brings up its picture
spreadsEl.addEventListener("mouseover", function(e){
  var c = e.target.closest(".clip"); if(!c || playing) return;
  var info = CLIPS.filter(function(x){ return x.el === c; })[0];
  if(info && info.page === cur) showArt(spreads[cur], info.art, info.push);
});

/* ---------- audio: one Play / Pause button ---------- */
var playBtn = document.getElementById("playBtn"), nowTitle = document.getElementById("nowTitle"), announce = document.getElementById("announce");
var synth = window.speechSynthesis || null;
var SEQ = [];
PAGES.forEach(function(pg, i){
  var cl = CLIPS.filter(function(c){ return c.page === i; });
  if(cl.length) SEQ = SEQ.concat(cl);
  else if(/^ch\d/.test(pg.key)) SEQ.push({ page:i, wait:5500, title:(spreads[i].querySelector(".h") || {}).textContent || "" });
});
var waitT = 0;
var introDone = false, queue = [], pos = 0, playing = false, paused = false, audio = new Audio(), token = 0;
var preload = null, currentURL = null, currentItem = null, artSwitched = false, waitElapsed = 0;
audio.preload = "auto";
var ICON_PLAY = '<path d="M4 2.5v11l9-5.5z" fill="currentColor"/>', ICON_PAUSE = '<path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/>';
var RATES = [0.75, 1, 1.25, 1.5], rate = 1;
try { var sr = parseFloat(localStorage.getItem("lewRate")); if(RATES.indexOf(sr) >= 0) rate = sr; } catch(e){}
var spdBtn = document.getElementById("spdBtn");
function showRate(){ if(!spdBtn) return; spdBtn.textContent = (rate === 1 ? "1" : String(rate)) + "\u00d7"; spdBtn.setAttribute("aria-label", "Reading speed " + rate + " times. Change speed"); }
if(spdBtn){ showRate(); spdBtn.addEventListener("click", function(){ rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; try { localStorage.setItem("lewRate", String(rate)); } catch(e){} if(audio) audio.playbackRate = rate; showRate(); announce.textContent = "Speed " + rate + " times"; }); }
function setBtn(isPlaying){
  playBtn.querySelector("svg").innerHTML = isPlaying ? ICON_PAUSE : ICON_PLAY;
  playBtn.querySelector("span").textContent = isPlaying ? "Pause" : (paused ? "Resume" : "Play");
  playBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
}
function clearHL(){ CLIPS.forEach(function(c){ c.el.classList.remove("speaking"); }); }
function discardPreload(){
  if(!preload) return;
  preload.controller.abort();
  if(preload.url) URL.revokeObjectURL(preload.url);
  preload = null;
}
function preloadClip(c){
  if(!c || !AUDIO[c.id]){ discardPreload(); return; }
  if(preload && preload.id === c.id) return;
  discardPreload();
  var entry = preload = {id:c.id, controller:new AbortController(), url:null};
  fetch(AUDIO[c.id], {signal:entry.controller.signal}).then(function(response){
    if(!response.ok) throw new Error("HTTP " + response.status + " for " + AUDIO[c.id]);
    return response.blob();
  }).then(function(blob){
    if(preload === entry) entry.url = URL.createObjectURL(blob);
  }).catch(function(error){
    if(error.name === "AbortError") return;
    if(preload === entry) preload = null;
    console.warn("Could not preload narration", c.id, error);
  });
}
function warmPage(i){
  preloadClip(SEQ.filter(function(c){ return c.page >= i && c.id && !(introDone && c.id === "0-00"); })[0]);
}
function warmNext(){
  var c = queue.slice(pos+1).filter(function(item){ return item.id; })[0];
  preloadClip(c);
  if(c) loadArt(spreads[c.page], c.art);
}
function stopSound(){
  token++;
  audio.onended = audio.ontimeupdate = audio.onplaying = audio.onwaiting = audio.onstalled = audio.onerror = audio.onloadedmetadata = null;
  audio.pause(); audio.removeAttribute("src"); audio.load();
  if(currentURL){ URL.revokeObjectURL(currentURL); currentURL = null; }
  if(synth) synth.cancel();
  currentItem = null; waitElapsed = 0; waitStart = null;
}
function finish(){ clearTimeout(waitT); stopSound(); discardPreload(); playing = false; paused = false; autoPaused = false; clearHL(); setBtn(false); nowTitle.textContent = ""; }
function audioFailure(error){
  console.error("Narration playback failed", error);
  finish();
  var message = error.name === "NotAllowedError" ? "Audio was blocked. Press Play to start." : "Audio could not load. Press Play to retry.";
  nowTitle.textContent = message;
}
function playAudio(c, done, resume){
  var my = ++token;
  if(!resume){
    audio.pause();
    if(currentURL){ URL.revokeObjectURL(currentURL); currentURL = null; }
    var src = AUDIO[c.id];
    if(preload && preload.id === c.id){
      if(preload.url){ currentURL = preload.url; src = currentURL; preload = null; }
      else discardPreload();
    }
    audio.src = src; currentItem = c; artSwitched = false;
  }
  audio.playbackRate = rate; audio.preservesPitch = true;
  function live(){ return my === token && playing && !paused; }
  audio.onended = function(){ if(live() && audio.ended) done(); };
  audio.onloadedmetadata = function(){
    if(my !== token) return;
    if(isFinite(audio.duration)) DUR[c.id] = audio.duration;
    updateBar(cur);
  };
  audio.onplaying = function(){
    if(!live()) return;
    nowTitle.textContent = c.title; c.el.classList.add("speaking"); warmNext();
  };
  audio.onwaiting = audio.onstalled = function(){ if(live()) nowTitle.textContent = "Buffering audio..."; };
  audio.onerror = function(){ if(live() && audio.error) audioFailure(audio.error); };
  audio.ontimeupdate = function(){
    if(!live()) return;
    if(c.artAt && !artSwitched && audio.duration && audio.currentTime / audio.duration >= c.artAt.frac){
      artSwitched = true; showArt(spreads[c.page], c.artAt.art, true);
    }
    var end = (B.AUDIO_END || {})[c.id];
    if(end && audio.currentTime >= end){ audio.ontimeupdate = null; audio.pause(); done(); }
  };
  nowTitle.textContent = "Loading audio...";
  audio.play().catch(function(error){ if(live()) audioFailure(error); });
}
function speak(c, done){
  if(AUDIO[c.id]){
    playAudio(c, done, false);
  } else if(synth){
    var my = ++token;
    var u = new SpeechSynthesisUtterance(c.el.textContent); u.rate = 0.92 * rate; u.lang = "en-US";
    u.onstart = function(){ if(my === token) c.el.classList.add("speaking"); };
    u.onend = function(){ if(my === token && playing && !paused) done(); };
    u.onerror = function(error){ if(my === token && playing && !paused) audioFailure(error); };
    synth.cancel(); synth.speak(u);
  } else { audioFailure(new Error("Narration and speech synthesis are unavailable")); }
}
function playCurrent(){
  if(!playing || paused) return;
  if(pos >= queue.length){ finish(); return; }
  var c = queue[pos], my = ++token;
  var go = c.page !== cur || busy ? turnTo(c.page, {auto:true}) : Promise.resolve();
  go.then(function(){
    if(my !== token || !playing || paused || queue[pos] !== c) return;
    if(c.page !== cur){ playCurrent(); return; }
    clearHL();
    if(currentItem !== c){ currentItem = c; waitElapsed = 0; }
    if(c.wait){
      nowTitle.textContent = c.title; waitStart = performance.now(); warmNext();
      clearTimeout(waitT); waitT = setTimeout(function(){
        if(my === token && playing && !paused){ waitStart = null; waitElapsed = 0; pos++; playCurrent(); }
      }, Math.max(0, c.wait - waitElapsed));
      return;
    }
    showArt(spreads[c.page], c.art, c.push);
    nowTitle.textContent = c.title;
    var inner = spreads[c.page].querySelector(".inner"), r = c.el.getBoundingClientRect(), ir = inner.getBoundingClientRect();
    if(r.top < ir.top || r.bottom > ir.bottom) inner.scrollTo({top: inner.scrollTop + (r.top - ir.top) - (ir.height - r.height)/2, behavior: reduce ? "auto" : "smooth"});
    speak(c, function(){ pos++; playCurrent(); });
  });
}
function startFrom(i, includeIntro){
  clearTimeout(waitT); stopSound();
  queue = SEQ.filter(function(c){ return c.page >= i && (includeIntro || !(introDone && c.id === "0-00")); });
  if(!queue.length){ finish(); nowTitle.textContent = "There is no narration on this page."; return; }
  pos = 0; playing = true; paused = false; setBtn(true);
  playCurrent();
}
function pausePlay(msg){
  paused = true; token++; clearTimeout(waitT);
  if(waitStart !== null) waitElapsed += performance.now() - waitStart;
  waitStart = null; audio.pause(); if(synth) synth.cancel(); setBtn(false);
  nowTitle.textContent = msg || "Paused"; announce.textContent = "Paused";
}
function resumePlay(){
  paused = false; setBtn(true); if(queue[pos]) nowTitle.textContent = queue[pos].title || "";
  if(queue[pos] && currentItem === queue[pos] && AUDIO[queue[pos].id] && audio.getAttribute("src") && !audio.ended){
    playAudio(queue[pos], function(){ pos++; playCurrent(); }, true);
  } else playCurrent();
}
function hop(to){
  if(busy || to < 0 || to >= PAGES.length) return;
  var live = playing && !paused;
  if(playing){ clearTimeout(waitT); stopSound(); clearHL(); playing = false; paused = false; setBtn(false); nowTitle.textContent = ""; }
  var my = ++token; warmPage(to);
  turnTo(to).then(function(){ if(live && my === token) startFrom(cur); });
}
var autoPaused = false;
function autoPause(msg){ if(playing && !paused){ pausePlay(msg); autoPaused = true; } }
function autoResume(){ if(autoPaused){ autoPaused = false; if(playing && paused) resumePlay(); } }
playBtn.addEventListener("click", function(){
  autoPaused = false;
  if(playing && !paused){ pausePlay(); return; }
  if(playing && paused){ resumePlay(); return; }
  startFrom(activeTurn ? activeTurn.to : cur);
});

/* ---------- listening bar: chapter progress + chapter list ---------- */
var CHS = [];
PAGES.forEach(function(pg, i){
  var m = /^ch(\d+)$/.exec(pg.key || "");
  if(i === 0) CHS.push({i:0, n:0, name:"Title page"});
  else if(m){ var n = +m[1], hh = spreads[i].querySelector(".h"); CHS.push({i:i, n:n, name: n > 9 ? "Closing" : (hh ? hh.textContent : "Chapter " + n)}); }
  else if(pg.key === "all1") CHS.push({i:i, n:-1, name:"All his answers"});
});
var chSegs = document.getElementById("chSegs"), chName = document.getElementById("chName"), chNum = document.getElementById("chNum"), chBtn = document.getElementById("chBtn"), chMenu = document.getElementById("chMenu");
var CORE = CHS.filter(function(c){ return c.n >= 1 && c.n <= 9; });
if(chSegs){
  chSegs.style.setProperty("--n", CORE.length);
  CORE.forEach(function(c){ var b = document.createElement("button"); b.type = "button"; b.className = "lb-seg"; b.setAttribute("aria-label", "Chapter " + c.n + ": " + c.name); b.title = c.n + ". " + c.name; b.addEventListener("click", function(){ hop(c.i); }); c.seg = b; chSegs.appendChild(b); });
}
if(chMenu){
  chMenu.innerHTML = '<h2>Jump to a chapter</h2>' + CHS.map(function(c, k){ return '<button type="button" data-k="'+k+'"><span class="n">'+(c.n >= 1 && c.n <= 9 ? c.n : "")+'</span><span class="t">'+esc(c.name)+'</span></button>'; }).join("");
  closeMenu();
  chMenu.addEventListener("click", function(e){ var b = e.target.closest("button[data-k]"); if(!b) return; closeMenu(); hop(CHS[+b.dataset.k].i); });
  chBtn.addEventListener("click", function(){ if(chMenu.hidden){ chMenu.hidden = false; chBtn.setAttribute("aria-expanded","true"); var a = chMenu.querySelector('[aria-current="true"]') || chMenu.querySelector("button"); if(a) a.focus(); positionMenu(); } else closeMenu(); });
  document.addEventListener("click", function(e){ if(!chMenu.hidden && !e.target.closest("#chMenu,#chBtn")) closeMenu(); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape" && !chMenu.hidden){ closeMenu(); chBtn.focus(); } });
}
function closeMenu(){ if(!chMenu) return; chMenu.hidden = true; chBtn.setAttribute("aria-expanded","false"); }
function positionMenu(){
  if(!chMenu || chMenu.hidden) return;
  chMenu.style.transform = "";
  var rect = chMenu.getBoundingClientRect(), root = getComputedStyle(document.documentElement);
  var topInset = Math.max(12, parseFloat(root.paddingTop) || 0), bottomInset = Math.max(12, parseFloat(root.paddingBottom) || 0);
  var top = Math.max(topInset, Math.min(rect.top, window.innerHeight - bottomInset - rect.height));
  if(top !== rect.top) chMenu.style.transform = "translateY(" + (top - rect.top) + "px)";
}
/* progress = share of the chapter's listening time already heard (real audio durations; openers count their hold) */
var DUR = Object.assign({}, B.AUDIO_DURATIONS || {}), waitStart = null;
function itemDur(c){
  if(c.wait) return c.wait / 1000;
  var d = DUR[c.id] || 0, end = (B.AUDIO_END || {})[c.id];
  if(end && d) d = Math.min(d, end);
  return d || Math.max(3, (c.el ? c.el.textContent.length : 120) / 15);
}
function chapFrac(a, b, i){
  var items = SEQ.filter(function(c){ return c.page >= a && c.page < b; }); if(!items.length) return 0;
  var live = playing && queue[pos] && queue[pos].page >= a && queue[pos].page < b ? queue[pos] : null, ci = live ? SEQ.indexOf(live) : -1;
  var tot = 0, done = 0;
  items.forEach(function(c){
    var d = itemDur(c), k = SEQ.indexOf(c); tot += d;
    if(live){
      if(k < ci) done += d;
      else if(k === ci) done += c.wait ? Math.min(d, (waitElapsed + (waitStart !== null ? performance.now() - waitStart : 0)) / 1000) : Math.min(d, audio.currentTime || 0);
    } else if(c.page < i) done += d;
  });
  return tot ? Math.min(100, done / tot * 100) : 0;
}
setInterval(function(){ if(playing && !paused) updateBar(cur); }, 300);
function updateBar(i){
  if(!CHS.length || !chName) return;
  var k = 0; CHS.forEach(function(c, x){ if(c.i <= i) k = x; });
  var c = CHS[k];
  chName.textContent = c.n === 0 ? "Not a Storyteller, As a Rule" : c.name;
  chNum.textContent = c.n >= 1 && c.n <= 9 ? "CH " + c.n : "";
  CORE.forEach(function(s, x){
    var nxt = CHS[CHS.indexOf(s) + 1], end = nxt ? nxt.i : PAGES.length, f;
    f = i >= end ? 100 : i < s.i ? 0 : chapFrac(s.i, end, i).toFixed(1);
    s.seg.style.setProperty("--f", f + "%");
    if(s === c) s.seg.setAttribute("aria-current", "step"); else s.seg.removeAttribute("aria-current");
  });
  Array.prototype.forEach.call(chMenu ? chMenu.querySelectorAll("button") : [], function(b){ if(+b.dataset.k === k) b.setAttribute("aria-current","true"); else b.removeAttribute("aria-current"); });
}

/* ---------- full-answer reader ---------- */
var rd = document.createElement("dialog"); rd.className = "reader"; rd.setAttribute("aria-labelledby", "rdQ");
rd.innerHTML = '<div class="rd-in"><button class="btn rd-close" type="button">Close</button><p class="rd-k">His full answer</p><h3 id="rdQ"></h3><div class="rd-body"></div></div>';
document.body.appendChild(rd);
rd.querySelector(".rd-close").addEventListener("click", function(){ rd.close(); });
rd.addEventListener("close", autoResume);
rd.addEventListener("click", function(e){ if(e.target === rd) rd.close(); });
spreadsEl.addEventListener("click", function(e){
  var sm = e.target.closest && e.target.closest("details.full > summary"); if(!sm) return;
  e.preventDefault();
  var dt = sm.parentNode;
  rd.querySelector("#rdQ").textContent = sm.querySelector(".q").textContent;
  rd.querySelector(".rd-k").textContent = /shortened/.test(sm.textContent) ? "His answer, shortened" : "His full answer";
  rd.querySelector(".rd-body").innerHTML = dt.querySelector(".body").innerHTML;
  autoPause("Paused \u00b7 reading his full answer");
  if(rd.showModal) rd.showModal(); else rd.setAttribute("open", "");
  rd.querySelector(".rd-body").scrollTop = 0;
});

/* ---------- view larger ---------- */
var lb = document.getElementById("lightbox"), lbStage = document.getElementById("lbStage"), lbCap = document.getElementById("lbCap");
function openLarge(spread){
  var layer = spread.querySelector(".layer.show"); if(!layer) return;
  var a = ART[layer.dataset.art]; if(!a) return;
  autoPause("Paused \u00b7 looking at a picture");
  lbStage.innerHTML = "";
  if(a.type === "album"){
    var g = document.createElement("div"); g.className = "lb-album";
    a.items.forEach(function(it){
      var f = document.createElement("figure");
      f.innerHTML = (it.src ? '<img src="'+it.src+'" alt="'+esc(it.alt || "")+'">' : '<div class="wash" style="--c1:#e9d2ad;--c2:#d8c3a2;--c3:#cdb79a;--c0:#efe2c8"></div>') + '<figcaption>'+esc(it.cap)+'</figcaption>';
      g.appendChild(f);
    });
    lbStage.appendChild(g);
  } else if(a.src){
    var im = document.createElement("img"); im.src = a.src; im.alt = a.alt; im.className = "lb-img"; lbStage.appendChild(im);
  } else {
    var d = document.createElement("div"); d.className = "lb-img wash"; d.style.cssText = "--c1:"+a.pal[0]+";--c2:"+a.pal[1]+";--c3:"+a.pal[2]+";--c0:"+a.pal[3]+";aspect-ratio:16/9;width:min(90vw,1400px)"; lbStage.appendChild(d);
  }
  lbCap.textContent = a.caption || "";
  lb.setAttribute("aria-label", a.alt);
  if(lb.showModal) lb.showModal(); else lb.setAttribute("open", "");
}
spreadsEl.addEventListener("click", function(e){
  var en = e.target.closest(".enlarge") || e.target.closest(".art .layer"); if(en){ openLarge(en.closest(".spread")); }
});
document.getElementById("lbClose").addEventListener("click", function(){ lb.close(); });
lb.addEventListener("close", autoResume);
lb.addEventListener("click", function(e){ if(e.target === lb || e.target === lbStage) lb.close(); });

settle(0, false);
LewBook.playIntro = function(){
  if(!SEQ.length) return false;
  introDone = true; startFrom(0, true); return true;
};
LewBook.relayout = relayout;
LewBook.jump = function(key){
  var i = PAGES.map(function(p){ return p.key; }).indexOf(key === "end" ? "ch10" : key);
  if(i < 0) return false;
  finish(); queue = [];
  if(rd.open) rd.close();
  if(lb.open) lb.close();
  cancelTurn(); settle(i, false); return true;
};
window.addEventListener("hashchange", function(){
  if(LewBook.jump(location.hash.slice(1)) && window.ColdOpen) window.ColdOpen.dismiss();
});

} };
