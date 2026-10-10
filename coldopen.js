/* Cold open: pen writes the title on his paper, signs it in his real strokes, then the closed book opens. */
window.ColdOpen = (function(){
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function(id){ return document.getElementById(id); };
  var run = 0, anims = [], timers = [], done = false;
  var SIG = { from:197, to:205, vb:[172,276,182,56] };

  /* ---------- pen-scratch sound: assets/audio/pen-scratch.mp3, or a soft synthesized scratch until it's added ---------- */
  var snd = { file:null, fileOK:false, ctx:null, g:null, jit:0 };
  function soundPrep(){
    try {
      snd.file = new Audio("assets/audio/pen-scratch.mp3"); snd.file.loop = true; snd.file.volume = .6; snd.file.preload = "auto";
      snd.file.addEventListener("canplaythrough", function(){ snd.fileOK = true; }, { once:true });
      snd.file.addEventListener("error", function(){ snd.fileOK = false; snd.file = null; }, { once:true });
      snd.file.load();
    } catch(e){}
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
      var ctx = snd.ctx = new AC(), n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for(var i=0;i<n;i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3400; bp.Q.value = 1.1;
      var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1200;
      snd.g = ctx.createGain(); snd.g.gain.value = 0;
      src.connect(bp); bp.connect(hp); hp.connect(snd.g); snd.g.connect(ctx.destination); src.start();
    } catch(e){}
  }
  function soundOn(){
    if(reduce) return;
    if(snd.file && snd.fileOK){ var D = snd.file.duration || 0; if(D > 1 && snd.file.paused) snd.file.currentTime = Math.random() * (D - .8); snd.file.play().catch(function(){}); return; }
    if(!snd.g) return;
    if(snd.ctx.state === "suspended") snd.ctx.resume();
    clearInterval(snd.jit);
    snd.jit = setInterval(function(){
      var t = Math.random() < .16 ? 0 : .035 + Math.random() * .11;
      snd.g.gain.setTargetAtTime(t, snd.ctx.currentTime, .012);
    }, 48);
  }
  function soundOff(){
    if(snd.file && snd.fileOK) snd.file.pause();
    clearInterval(snd.jit); if(snd.g) snd.g.gain.setTargetAtTime(0, snd.ctx.currentTime, .02);
  }

  /* ---------- helpers ---------- */
  function wait(ms, my){ return new Promise(function(res, rej){ timers.push(setTimeout(function(){ my === run ? res() : rej("x"); }, ms)); }); }
  function anim(el, kf, o, my){ var a = el.animate(kf, o); anims.push(a); return a.finished.then(function(){ if(my !== run) throw "x"; }); }
  function rel(el, box){ var r = el.getBoundingClientRect(); return { x:r.left - box.left, y:r.top - box.top, w:r.width, h:r.height }; }

  function buildSig(){
    var host = $("coSig");
    return fetch("assets/hand/copper-note.json").then(function(r){ return r.json(); }).then(function(note){
      var v = SIG.vb, ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", v.join(" ")); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Signed in his own hand: Lewis M. Etcoff");
      svg.style.cssText = "display:block;width:100%;height:auto;overflow:visible";
      note.paths.slice(SIG.from, SIG.to + 1).forEach(function(p){
        var el = document.createElementNS(ns, "path"); el.setAttribute("d", p.d); el.setAttribute("fill", "var(--pen)");
        el.dataset.b = JSON.stringify(p.b); el.style.clipPath = reduce ? "none" : "inset(0 100% 0 0)"; svg.appendChild(el);
      });
      host.appendChild(svg);
    });
  }

  /* ---------- the sequence ---------- */
  function writeLine(el, sheet, nib, my){
    var box = sheet.getBoundingClientRect(), p = rel(el, box), dur = Math.max(700, p.w * 3.1);
    var y = p.y + p.h * .66, kf = [];
    for(var i=0;i<=10;i++) kf.push({ transform:"translate(" + (p.x + p.w * i / 10) + "px," + (y - Math.sin(i * 2.1) * p.h * .14) + "px)", opacity:1 });
    soundOn();
    anim(nib, kf, { duration:dur, easing:"linear" }, my).catch(function(){});
    return anim(el, [{ clipPath:"inset(-30% 100% -50% -4%)" }, { clipPath:"inset(-30% -4% -50% -4%)" }], { duration:dur, easing:"linear", fill:"forwards" }, my)
      .then(function(){ soundOff(); });
  }
  function writeSig(sheet, nib, my){
    var svg = $("coSig").querySelector("svg"); if(!svg) return Promise.resolve();
    var box = sheet.getBoundingClientRect(), sr = svg.getBoundingClientRect(), k = sr.width / SIG.vb[2];
    var chain = Promise.resolve();
    Array.prototype.forEach.call(svg.querySelectorAll("path"), function(path){
      chain = chain.then(function(){
        var b = JSON.parse(path.dataset.b), w = b[2] - b[0], dur = Math.max(90, w * 13);
        var x0 = sr.left - box.left + (b[0] - SIG.vb[0]) * k, x1 = sr.left - box.left + (b[2] - SIG.vb[0]) * k, y = sr.top - box.top + ((b[1] + b[3]) / 2 - SIG.vb[1]) * k;
        soundOn();
        anim(nib, [{ transform:"translate(" + x0 + "px," + y + "px)", opacity:1 }, { transform:"translate(" + x1 + "px," + (y - 2) + "px)", opacity:1 }], { duration:dur, easing:"cubic-bezier(.3,.1,.6,1)" }, my).catch(function(){});
        return anim(path, [{ clipPath:"inset(-4px 100% -4px -4px)" }, { clipPath:"inset(-4px -4px -4px -4px)" }], { duration:dur, easing:"cubic-bezier(.3,.1,.6,1)", fill:"forwards" }, my)
          .then(function(){ soundOff(); return wait(w < 8 ? 60 : 120, my); });
      });
    });
    return chain;
  }
  function showAllInk(){
    Array.prototype.forEach.call(document.querySelectorAll("#coTitle .co-l"), function(l){ l.style.clipPath = "none"; });
    $("coBy").style.opacity = 1;
    Array.prototype.forEach.call(document.querySelectorAll("#coSig path"), function(p){ p.style.clipPath = "none"; });
  }
  function begin(){
    var my = ++run, sheet = $("coSheet"), nib = $("coNib");
    $("coBegin").style.display = "none";
    soundPrep();
    if(reduce){ showAllInk(); wait(1800, my).then(function(){ exit(my); }).catch(function(){}); return; }
    var lines = document.querySelectorAll("#coTitle .co-l");
    wait(500, my)
      .then(function(){ return writeLine(lines[0], sheet, nib, my); })
      .then(function(){ return wait(260, my); })
      .then(function(){ return writeLine(lines[1], sheet, nib, my); })
      .then(function(){ return wait(380, my); })
      .then(function(){ return anim($("coBy"), [{ opacity:0, transform:"translateY(4px)" }, { opacity:1, transform:"none" }], { duration:700, easing:"ease-out", fill:"forwards" }, my); })
      .then(function(){ return wait(300, my); })
      .then(function(){ return writeSig(sheet, nib, my); })
      .then(function(){ nib.style.opacity = 0; return wait(1400, my); })
      .then(function(){ exit(my); })
      .catch(function(){});
  }
  function exit(my){
    var co = $("coldOpen");
    anim(co, [{ opacity:1, transform:"none" }, { opacity:0, transform:"scale(1.05)" }], { duration:reduce ? 300 : 1100, easing:"cubic-bezier(.4,0,.2,1)", fill:"forwards" }, my)
      .then(function(){ atRest(); })
      .catch(function(){});
  }
  function openCover(my){
    var cv = $("closedCover"), cover = document.querySelector(".cover");
    var narrow = !window.matchMedia("(min-width: 860px)").matches;
    if(reduce || narrow || !cv.animate) return anim(cv, [{ opacity:1 }, { opacity:0 }], { duration:reduce ? 1 : 500, fill:"forwards" }, my);
    var P = "perspective(2600px) ";
    return anim(cv, [{ transform:P + "rotateY(0deg)" }, { transform:P + "rotateY(-90deg)" }], { duration:780, easing:"cubic-bezier(.5,0,.9,.55)", fill:"forwards" }, my)
      .then(function(){ cover.style.clipPath = "none"; return anim(cv, [{ transform:P + "rotateY(-90deg)" }, { transform:P + "rotateY(-180deg)" }], { duration:820, easing:"cubic-bezier(.1,.45,.5,1)", fill:"forwards" }, my); })
      .then(function(){ return anim(cv, [{ opacity:1 }, { opacity:0 }], { duration:380, fill:"forwards" }, my); });
  }
  function atRest(){
    var co = $("coldOpen"), cv = $("closedCover"), btn = $("coRead");
    co.hidden = true; co.removeAttribute("aria-modal"); soundOff();
    document.removeEventListener("keydown", onKey);
    if(!cv || atRest.did){ return; } atRest.did = true;
    if(!window.matchMedia("(min-width: 860px)").matches){ cv.style.left = "0"; cv.style.width = "100%"; document.querySelector(".cover").style.clipPath = "none"; }
    cv.removeAttribute("aria-hidden");
    btn.style.visibility = "visible";
    if(btn.animate && !reduce) btn.animate([{ opacity:0, transform:"translateY(6px)" }, { opacity:1, transform:"none" }], { duration:600, delay:500, easing:"ease-out", fill:"backwards" });
    btn.focus({ preventScroll:true });
    btn.addEventListener("click", function(){
      var my = ++run; btn.style.visibility = "hidden"; cv.setAttribute("aria-hidden", "true");
      openCover(my).then(function(){ finish(); if(window.LewBook && window.LewBook.playIntro) window.LewBook.playIntro(); }).catch(function(){});
    }, { once:true });
  }
  function finish(){
    if(done) return; done = true; soundOff();
    var co = $("coldOpen"), cv = $("closedCover"), cover = document.querySelector(".cover");
    co.hidden = true; co.removeAttribute("aria-modal");
    if(cv) cv.remove();
    cover.style.clipPath = "none";
    document.querySelector(".nav").style.visibility = "";
    document.removeEventListener("keydown", onKey);
    var h = document.querySelector("#spreads .spread:not([hidden]) .h");
    if(h){ h.style.outline = "none"; h.focus({ preventScroll:true }); h.addEventListener("blur", function(){ h.style.outline = ""; }, { once:true }); }
    if(window.LewBook && window.LewBook.relayout) window.LewBook.relayout();
  }
  function skip(){ run++; anims.forEach(function(a){ try{ a.cancel(); }catch(e){} }); timers.forEach(clearTimeout); atRest(); }
  function onKey(e){ if(e.key === "Escape"){ e.preventDefault(); skip(); } }

  return {
    dismiss: function(){ run++; anims.forEach(function(a){ try{ a.cancel(); }catch(e){} }); timers.forEach(clearTimeout); finish(); },
    init: function(opts){
      if(this.ready) return; this.ready = true;
      if(opts && opts.enabled === false){ finish(); return; }
      document.querySelector(".nav").style.visibility = "hidden";
      $("coBegin").addEventListener("click", begin);
      document.addEventListener("keydown", onKey);
      buildSig().catch(function(){});
      $("coBegin").focus({ preventScroll:true });
    }
  };
})();
