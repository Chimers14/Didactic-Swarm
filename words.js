"use strict";

/* =========================================================
   WORDS  (words.js)

   Loaded after script.js and game.js. Opened by the WORDS
   button (bottom-left, diagonal from VIDEO).

   - Type a word, press ENTER: it drops out from under the
     search box and falls with gravity to the bottom.
   - Words collide with the walls, the floor and each other,
     so they pile up like normal objects.
   - Press and hold (mouse or finger) on any word to drag it.
     While you hold it, it gets a glowing rainbow border and
     its etymology (origin, pronunciation, meaning) is shown
     underneath the search box.
   - Throw a word by letting go while moving.

   Etymology data comes straight from the browser to the
   Wiktionary API (no key, CORS enabled) with the Free
   Dictionary API as a fallback. Lookups are cached, and are
   started the moment you press ENTER so the info is already
   there when you grab the word.

   It reuses these globals from script.js: app, setStatus,
   panelOpen, settingsTransitioning, mouse, openPageTransition,
   closePageTransition. It exposes openWord / closeWord / wordOpen.
========================================================= */
(() => {

const $ = id => document.getElementById(id);

const overlay = $("wordOverlay");
const field = $("wordField");
const panel = $("wordPanel");
const search = $("wordSearch");
const input = $("wordInput");
const etyBox = $("wordEty");
const etyWord = $("wordEtyWord");
const etyMeta = $("wordEtyMeta");
const etyMeaning = $("wordEtyMeaning");
const etyLabel = $("wordEtyLabel");
const etyBody = $("wordEtyBody");
const etySource = $("wordEtySource");
const closeBtn = $("closeWord");
const clearBtn = $("wordClear");
const openBtn = document.querySelector('.orbit-button[data-label="WORDS"]');

/* ---------------- tuning ---------------- */

const GRAVITY = 2600;          // px / s^2
const FLOOR_BOUNCE = 0.34;     // how much of the impact speed is kept
const WALL_BOUNCE = 0.45;
const FLOOR_FRICTION = 0.80;   // per 1/60 s while touching something
const MAX_THROW = 2600;        // px / s
const MAX_WORDS = 100;
const PAD = 10;                // gap kept between words and the screen edge
const MAX_ETY_CHARS = 540;

/* ---------------- state ---------------- */

let isOpen = false;
let raf = 0;
let lastTime = 0;
let stopTimer = 0;
let hideTimer = 0;
let zCounter = 10;
let uid = 1;

const bodies = [];             // every word on screen
const rigid = window.createWordPhysics(field, "word-chip", MAX_WORDS);
rigid.setCallbacks(b => { drag = {body:b,pointerId:-1}; showEty(b.text); }, b => { drag=null; hideEty(1500); });
let drag = null;               // { body, pointerId, ox, oy, samples }
let etyToken = 0;              // guards against out-of-order lookups

const cache = new Map();
let activeDictionaryLanguage = "en";
document.getElementById("wordLanguage")?.addEventListener("change",e=>{activeDictionaryLanguage=e.target.value;cache.clear();});       // lower-case word -> Promise<info>

const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function bounds() {
  const w = field.clientWidth || window.innerWidth;
  const h = field.clientHeight || window.innerHeight;
  return { w, h };
}

/* =========================================================
   WORD OBJECTS
========================================================= */

function cleanWord(raw) {
  return String(raw || "")
    .replace(/[\u0000-\u001f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28);
}

function makeBody(text) {
  const el = document.createElement("div");
  el.className = "word-chip";

  const inner = document.createElement("div");
  inner.className = "word-chip-inner";

  const span = document.createElement("span");
  span.textContent = text;

  inner.appendChild(span);
  el.appendChild(inner);
  field.appendChild(el);

  // very long words shrink so they always fit on screen
  const { w: W } = bounds();
  let w = el.offsetWidth;
  if (w > W - PAD * 2) {
    const base = parseFloat(getComputedStyle(inner).fontSize) || 28;
    inner.style.fontSize = `${Math.max(12, base * (W - PAD * 2) / w)}px`;
    w = el.offsetWidth;
  }

  const body = {
    id: uid++,
    text,
    el,
    inner,
    w,
    h: el.offsetHeight,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    grounded: false,
    angle: rand(-.12,.12), spin:rand(-1.5,1.5),
    held: false,
    shownX: NaN,
    shownY: NaN
  };

  // Pointer handling belongs to the shared off-centre rigid-body joint.
  el.addEventListener("contextmenu", event => event.preventDefault());

  return body;
}

function spawnWord(text) {
  const body = makeBody(text);
  const { w: W } = bounds();
  const rect = search.getBoundingClientRect();

  // appears directly underneath the search box, then falls
  body.x = clamp(
    rect.left + rect.width / 2 - body.w / 2 + rand(-28, 28),
    PAD,
    Math.max(PAD, W - body.w - PAD)
  );
  body.y = rect.bottom + 8;
  body.vx = rand(-60, 60);
  body.vy = 0;

  body.inner.classList.add("spawned");
  rigid.add(body);
  body.vel.x = body.vx; body.vel.y = body.vy;

  bodies.push(body);

  // keep the screen from filling up forever
  while (bodies.length > MAX_WORDS) {
    removeBody(bodies[0], true);
  }

  // start the etymology lookup now so it is ready when you grab it
  lookup(text);

  startLoop();
}

function removeBody(body, fade) {
  const index = bodies.indexOf(body);
  if (index === -1) return;

  bodies.splice(index, 1);
  rigid.remove(body);

  if (drag && drag.body === body) {
    drag = null;
    hideEty(0);
  }

  if (fade) {
    body.el.classList.add("leaving");
    setTimeout(() => body.el.remove(), 320);
  } else {
    body.el.remove();
  }
}

function clearWords() {
  [...bodies].forEach(body => removeBody(body, true));
}

/* Both READ and WORDS use the same angular rigid-body simulation. */
function placeBody(body) { if (body.pos) { body.el.style.transform = `translate3d(${body.pos.x-body.w/2}px,${body.pos.y-body.h/2}px,0) rotate(${body.angle}rad)`; } }
function startLoop() { rigid.start(); }
function stopLoop() { rigid.stop(); }
function endDrag() { drag=null; }

/* =========================================================
   ETYMOLOGY
========================================================= */

const POS_NAMES = new Set([
  "Noun", "Proper noun", "Verb", "Adjective", "Adverb", "Pronoun",
  "Preposition", "Conjunction", "Interjection", "Determiner", "Numeral",
  "Particle", "Article", "Contraction", "Prefix", "Suffix", "Phrase",
  "Letter", "Symbol", "Abbreviation", "Initialism", "Acronym"
]);

function fetchJSON(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  return fetch(url, { signal: controller.signal })
    .then(response => {
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return response.json();
    })
    .finally(() => clearTimeout(timer));
}

function tidy(text) {
  return String(text || "")
    .replace(/\[[^\]]*\]/g, "")      // [1] style notes
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(text, limit) {
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit);
  const sentence = cut.lastIndexOf(". ");

  if (sentence > limit * 0.55) return cut.slice(0, sentence + 1);

  const space = cut.lastIndexOf(" ");

  return `${cut.slice(0, space > 0 ? space : limit).replace(/[,;:\s]+$/, "")}…`;
}

/* Wiktionary returns the entry as plain text with "== English ==" style headings.
   We walk the headings, stay inside the English section and collect the
   Etymology, Pronunciation and part-of-speech sections. */
function parseWiktionary(text) {
  const sections = [];
  let inEnglish = false;
  let current = null;

  for (const line of String(text || "").split("\n")) {
    const heading = /^(={2,6})\s*(.+?)\s*\1\s*$/.exec(line);

    if (heading) {
      const level = heading[1].length;
      const name = heading[2];

      if (level === 2) {
        inEnglish = name === "English";
        current = null;
        continue;
      }

      if (!inEnglish) continue;

      current = { name, lines: [] };
      sections.push(current);
      continue;
    }

    if (inEnglish && current) current.lines.push(line);
  }

  if (!sections.length) return null;

  const etymologies = sections
    .filter(section => /^Etymology/i.test(section.name))
    .map(section => tidy(section.lines.join(" ")))
    .filter(Boolean);

  let pron = "";
  for (const section of sections) {
    if (!/^Pronunciation/i.test(section.name)) continue;

    const body = section.lines.join(" ");
    const match = /IPA[^/\[]*([/\[][^/\]\[]{1,60}[/\]])/.exec(body);

    if (match) {
      pron = match[1];
      break;
    }
  }

  let pos = "";
  let meaning = "";
  for (const section of sections) {
    if (!POS_NAMES.has(section.name)) continue;

    const lines = section.lines.map(tidy).filter(Boolean);

    // first line is the headword line ("cat (plural cats)"), next is the first meaning
    const definition = lines.find((line, index) =>
      index > 0 && !/^(Synonyms|Antonyms|Derived|Related|Translations)/i.test(line)
    );

    pos = section.name.toLowerCase();
    meaning = definition || "";
    break;
  }

  return { etymologies, pron, pos, meaning };
}

async function fromWiktionary(candidate) {
  const url =
    `https://${activeDictionaryLanguage === "jam" ? "en" : activeDictionaryLanguage}.wiktionary.org/w/api.php?action=query&prop=extracts` +
    "&explaintext=1&exsectionformat=wiki&redirects=1&format=json&origin=*" +
    `&titles=${encodeURIComponent(candidate)}`;

  const data = await fetchJSON(url);
  const pages = data && data.query && data.query.pages;

  if (!pages) return null;

  const page = Object.values(pages)[0];

  if (!page || page.missing !== undefined || !page.extract) return null;

  const parsed = parseWiktionary(page.extract);

  if (!parsed) return null;

  return { title: page.title || candidate, ...parsed, source: "WIKTIONARY" };
}

async function fromFreeDictionary(word) {
  const data = await fetchJSON(
    `https://api.dictionaryapi.dev/api/v2/entries/${activeDictionaryLanguage === "jam" ? "en" : activeDictionaryLanguage}/${encodeURIComponent(word)}`
  );

  if (!Array.isArray(data) || !data.length) return null;

  const entry = data[0];
  const meaning = entry.meanings && entry.meanings[0];
  const definition = meaning && meaning.definitions && meaning.definitions[0];

  const origins = data
    .map(item => tidy(item.origin))
    .filter(Boolean);

  return {
    title: entry.word || word,
    etymologies: origins,
    pron: entry.phonetic || "",
    pos: meaning ? meaning.partOfSpeech : "",
    meaning: definition ? tidy(definition.definition) : "",
    source: "FREE DICTIONARY API"
  };
}

async function doLookup(word) {
  const lower = word.toLowerCase();
  const capital = lower.charAt(0).toUpperCase() + lower.slice(1);

  // try it as typed first, then lower case, then Capitalised (proper nouns)
  const candidates = [...new Set([word, lower, capital])];

  let best = null;
  let networkFailed = false;

  for (const candidate of candidates) {
    try {
      const info = await fromWiktionary(candidate);

      if (info) {
        best = info;
        if (info.etymologies.length) break;
      }
    } catch {
      networkFailed = true;
    }
  }

  // Wiktionary had no origin text: see whether the fallback dictionary does
  if (!best || !best.etymologies.length) {
    try {
      const backup = await fromFreeDictionary(lower);

      if (backup) {
        best = best
          ? {
              ...best,
              etymologies: backup.etymologies,
              pron: best.pron || backup.pron,
              meaning: best.meaning || backup.meaning,
              source: backup.etymologies.length ? backup.source : best.source
            }
          : backup;
      }
    } catch (error) {
      // a 404 from the fallback just means "no such word"
      if (!error.status) networkFailed = true;
    }
  }

  if (best) return { state: "ok", ...best };

  return { state: networkFailed ? "error" : "none" };
}

function lookup(word) {
  const key = word.toLowerCase();

  if (cache.has(key)) return cache.get(key);

  const promise = doLookup(word).catch(() => ({ state: "error" }));

  cache.set(key, promise);

  // never keep a network failure: let the next grab try again
  promise.then(info => {
    if (info.state === "error" && cache.get(key) === promise) cache.delete(key);
  });

  return promise;
}

/* ---------- showing it under the search box ---------- */

function paint(word, info) {
  etyWord.textContent = word;
  etyBox.classList.remove("loading", "empty");

  if (!info) {
    etyBox.classList.add("loading");
    etyMeta.textContent = "";
    etyMeaning.textContent = "";
    etyLabel.textContent = "TRACING ORIGIN";
    etyBody.textContent = "";
    etySource.textContent = "";
    return;
  }

  if (info.state === "none") {
    etyBox.classList.add("empty");
    etyMeta.textContent = "";
    etyMeaning.textContent = "";
    etyLabel.textContent = "NO ENTRY FOUND";
    etyBody.textContent = "That doesn't look like a dictionary word. Check the spelling?";
    etySource.textContent = "";
    return;
  }

  if (info.state === "error") {
    etyBox.classList.add("empty");
    etyMeta.textContent = "";
    etyMeaning.textContent = "";
    etyLabel.textContent = "SIGNAL LOST";
    etyBody.textContent = "Couldn't reach the dictionary. Check your connection and grab the word again.";
    etySource.textContent = "";
    return;
  }

  const meta = [info.pron, info.pos].filter(Boolean).join("  ·  ");

  etyMeta.textContent = meta;
  etyMeaning.textContent = info.meaning ? shorten(info.meaning, 150) : "";

  if (info.etymologies.length) {
    const extra = info.etymologies.length - 1;

    etyLabel.textContent = extra > 0 ? `ORIGIN  (1 OF ${info.etymologies.length})` : "ORIGIN";
    etyBody.textContent = shorten(info.etymologies[0], MAX_ETY_CHARS);
  } else {
    etyLabel.textContent = "ORIGIN";
    etyBody.textContent = "No origin has been recorded for this word yet.";
  }

  etySource.textContent = `SOURCE // ${info.source}`;
}

function showEty(word) {
  clearTimeout(hideTimer);

  const token = ++etyToken;

  paint(word, null);

  panel.classList.add("ety-on");
  etyBox.classList.add("show");

  lookup(word).then(info => {
    if (token === etyToken) paint(word, info);
  });
}

function hideEty(delay) {
  clearTimeout(hideTimer);

  const token = etyToken;

  const hide = () => {
    // don't hide it if you already grabbed another word
    if (token !== etyToken || drag) return;

    etyBox.classList.remove("show");
    panel.classList.remove("ety-on");
  };

  if (delay > 0) {
    hideTimer = setTimeout(hide, delay);
  } else {
    hide();
  }
}

/* =========================================================
   OPEN / CLOSE
========================================================= */

function openWord() {
  if (panelOpen() || settingsTransitioning || isOpen) return;

  isOpen = true;

  clearTimeout(stopTimer);

  overlay.classList.add("word-open");
  overlay.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";

  mouse.active = false;

  setStatus("* WORDS *");

  // the page fades in while the menu letters swirl into the search box
  if (window.openPageTransition) window.openPageTransition("word");

  startLoop();

  input.focus({ preventScroll: true });
}

function closeWord() {
  if (!isOpen) return;

  isOpen = false;

  if (drag) endDrag({ pointerId: drag.pointerId });

  overlay.classList.remove("word-open");
  overlay.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "";

  input.blur();
  hideEty(0);

  setStatus("* ONLINE *");

  // the page fades out while the letters fly back to their buttons
  if (window.closePageTransition) window.closePageTransition("word");

  // words stay where they are for next time; stop simulating once the fade is over
  clearTimeout(stopTimer);
  stopTimer = setTimeout(() => { if (!isOpen) stopLoop(); }, 900);

  if (openBtn) openBtn.focus({ preventScroll: true });
}

/* =========================================================
   WIRING
========================================================= */

input.addEventListener("keydown", event => {
  if (event.key !== "Enter" || event.isComposing) return;

  event.preventDefault();

  const text = cleanWord(input.value);

  if (!text) return;

  spawnWord(text);

  input.value = "";
  search.classList.remove("typing");
});

input.addEventListener("input", () => {
  search.classList.toggle("typing", input.value.length > 0);
});

closeBtn.addEventListener("click", closeWord);
clearBtn.addEventListener("click", () => {
  clearWords();
  input.focus({ preventScroll: true });
});

// tapping empty space just keeps the keyboard handy
field.addEventListener("pointerdown", event => {
  if (event.target === field && event.pointerType === "mouse") {
    input.focus({ preventScroll: true });
  }
});

// keep every word on screen when the window / phone changes size
function refit() { rigid.refit(); if (isOpen) rigid.start(); }

window.addEventListener("resize", refit);
window.addEventListener("orientationchange", () => setTimeout(refit, 250));

if (window.ResizeObserver) new ResizeObserver(refit).observe(field);

// the site's menu code looks these up by name
window.openWord = openWord;
window.closeWord = closeWord;
Object.defineProperty(window, "wordOpen", { get: () => isOpen, configurable: true });

})();
