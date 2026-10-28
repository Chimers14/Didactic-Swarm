"use strict";

/* =========================================================
   SOCIAL POST LINKS — EDIT ONLY THIS SECTION

   Add direct links to individual POSTS / REELS / VIDEOS.
   Put each URL inside quotes, followed by a comma.
   Every click on a social icon randomly chooses one link
   from that platform's list (just like the VIDEO button).
   Empty lists show "LINK COMING SOON" instead.
   Profile links are NOT required.
========================================================= */
const SOCIAL_POST_LINKS = {
    instagram: [
        // Add Instagram post URLs here
    ],

    twitter: [
        // Add X / Twitter post URLs here
    ],

    tiktok: [
        "https://www.tiktok.com/t/ZTfYw2MPv/",
        "https://www.tiktok.com/@avakado3180/video/7698151678582852877",
        "https://www.tiktok.com/@avakado3180/video/7698149030756453645",
    ],
};

/* =========================================================
   PLAYLIST

   Add your songs here. Put the audio files in a folder in
   your repo (for example /music) and list them below.
   Paths are relative to index.html.

   { title: "Song Name", artist: "Artist", src: "music/song.mp3" }
========================================================= */

const PLAYLIST = [
    { title: "back",      artist: "EDM",     src: "music/back.mp3" },
    { title: "biopsy",    artist: "JUNGLE",  src: "music/biopsy.mp3" },
    { title: "knock",     artist: "",        src: "music/knock.mp3" },
    { title: "movers",    artist: "EDM",     src: "music/movers.mp3" },
    { title: "prayers",   artist: "",        src: "music/prayers.mp3" },
    { title: "preface",   artist: "",        src: "music/preface.mp3" },
    { title: "quo",       artist: "BRKCORE", src: "music/quo.mp3" },
    { title: "tourniquet",artist: "EDM",     src: "music/tourniquet.mp3" },
    { title: "upkeep",    artist: "",        src: "music/upkeep.mp3" },
    { title: "verbatum",  artist: "EDM",     src: "music/verbatum.mp3" },
];

/* =========================================================
   ELEMENTS
========================================================= */

const app = document.getElementById("app");
const stage = document.getElementById("stage");

const title = document.getElementById("title");
const scrambleLine = document.getElementById("scrambleLine");
const bottomScramble = document.getElementById("bottomScramble");
const status = document.getElementById("status");

const settingsButton = document.getElementById("settingsButton");
const settingsOverlay = document.getElementById("settingsOverlay");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettingsButton = document.getElementById("closeSettings");

const darkModeButton = document.getElementById("darkModeButton");
const lightModeButton = document.getElementById("lightModeButton");

const rainbowToggle = document.getElementById("rainbowToggle");
const rainbowSpeed = document.getElementById("rainbowSpeed");
const rainbowSpeedValue = document.getElementById("rainbowSpeedValue");
const rainbowColors = [...document.querySelectorAll(".rainbow-color")];
const rainbowPreview = document.getElementById("rainbowPreview");

const settingsStatus = document.getElementById("settingsStatus");
const resetSettingsButton = document.getElementById("resetSettings");

const centerHoverZone = document.getElementById("centerHoverZone");
const buttons = [...document.querySelectorAll(".orbit-button")];
const musicButton = document.getElementById("musicButton");

const musicOverlay = document.getElementById("musicOverlay");
const musicPanel = document.getElementById("musicPanel");
const closeMusicButton = document.getElementById("closeMusic");
const musicNow = document.getElementById("musicNow");
const musicStatus = document.getElementById("musicStatus");
const audio = document.getElementById("audio");
const playToggle = document.getElementById("playToggle");
const prevTrackButton = document.getElementById("prevTrack");
const nextTrackButton = document.getElementById("nextTrack");
const seekBar = document.getElementById("seekBar");
const timeCurrent = document.getElementById("timeCurrent");
const timeTotal = document.getElementById("timeTotal");
const volumeBar = document.getElementById("volumeBar");
const volumeValue = document.getElementById("volumeValue");
const playlistElement = document.getElementById("playlist");
const addFileButton = document.getElementById("addFileButton");
const addFileInput = document.getElementById("addFileInput");

const canvas = document.getElementById("boidCanvas");
const ctx = canvas.getContext("2d");

const settingsCanvas = document.getElementById("settingsParticleCanvas");
const settingsCtx = settingsCanvas.getContext("2d");

const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);


/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const DEFAULTS = {
    theme: "dark",
    rainbowEnabled: true,
    rainbowSpeed: 7,
    colors: [
        "#a83232",
        "#c47a22",
        "#b8b52a",
        "#27a957",
        "#2187a8",
        "#5545a8",
        "#9a329d"
    ]
};

let settings = {
    theme: DEFAULTS.theme,
    rainbowEnabled: DEFAULTS.rainbowEnabled,
    rainbowSpeed: DEFAULTS.rainbowSpeed,
    colors: [...DEFAULTS.colors]
};

let settingsOpen = false;
let musicOpen = false;
let settingsTransitioning = false;
let transitionFrame = null;
let transitionParticles = [];

/* gather = the shared letter animation used by settings and music */
let gatherMode = null;        // "settings" | "music" | null
let gatherPhase = "idle";     // "opening" | "open" | "closing" | "idle"
let gatherStart = 0;
let gatherDuration = 0;

let pageFocused = document.hasFocus();
let centerHover = false;

const mouse = {
    x: -1000,
    y: -1000,
    active: false
};

const characters =
    "*$#@%&!?01<>[]{}+/\\|ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const flockSymbols = [
    "*", "$", "#", "%", "&", "?", "!", "+",
    "=", "/", "\\", "<", ">", "[", "]",
    "{", "}", "0", "1", "A", "X", "Z",
    "Ø", "∆", "∞"
];


/* =========================================================
   UTILITIES
========================================================= */

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function randomCharacter() {
    return characters[
        Math.floor(Math.random() * characters.length)
    ];
}

function randomSymbol() {
    return flockSymbols[
        Math.floor(Math.random() * flockSymbols.length)
    ];
}

function makeScramble(length) {
    let result = "";

    for (let i = 0; i < length; i++) {
        result += randomCharacter();
    }

    return result;
}

function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

function setStatus(message) {
    status.textContent = message;
}

function updateSettingsStatus(message) {
    settingsStatus.textContent = message;
}

function setMusicStatus(message) {
    musicStatus.textContent = message;
}

function canAnimate() {
    return !prefersReducedMotion.matches;
}

function panelOpen() {
    return settingsOpen || musicOpen || wordsOpen() || document.getElementById("sourcesOverlay")?.classList.contains("open") || document.getElementById("videoOverlay")?.classList.contains("open");
}

// words.js exposes wordOpen; it may not be loaded yet / at all
function wordsOpen() {
    return typeof wordOpen !== "undefined" && wordOpen === true;
}

// Full-page sections fade in while the menu letters swirl away
function isPageMode(mode) {
    return mode === "word" || mode === "sources" || mode === "video";
}


/* =========================================================
   RAINBOW SETTINGS
========================================================= */

function applyRainbowSettings() {
    const gradient = [
        ...settings.colors,
        settings.colors[0]
    ].join(", ");

    app.style.setProperty("--rainbow-gradient", gradient);

    // individual colors for the spiral (animated plain text color)
    settings.colors.forEach((color, index) => {
        app.style.setProperty(`--rainbow-c${index + 1}`, color);
    });

    app.style.setProperty(
        "--rainbow-speed",
        `${settings.rainbowSpeed}s`
    );

    app.classList.toggle(
        "rainbow-disabled",
        !settings.rainbowEnabled
    );

    rainbowToggle.checked = settings.rainbowEnabled;
    rainbowSpeed.value = String(settings.rainbowSpeed);
    rainbowSpeedValue.value = `${settings.rainbowSpeed}s`;
    rainbowSpeedValue.textContent = `${settings.rainbowSpeed}s`;

    rainbowColors.forEach((input, index) => {
        input.value = settings.colors[index];
    });

    updateSettingsStatus("CONFIGURATION UPDATED");
}

function updateRainbowColors() {
    settings.colors = rainbowColors.map(input => input.value);

    applyRainbowSettings();
}

rainbowToggle.addEventListener("change", () => {
    settings.rainbowEnabled = rainbowToggle.checked;
    applyRainbowSettings();
});

rainbowSpeed.addEventListener("input", () => {
    settings.rainbowSpeed = Number(rainbowSpeed.value);
    applyRainbowSettings();
});

rainbowColors.forEach(input => {
    input.addEventListener("input", updateRainbowColors);
});


/* =========================================================
   DARK / LIGHT MODE
========================================================= */

function setTheme(theme) {
    settings.theme = theme;

    app.dataset.theme = theme;

    darkModeButton.classList.toggle(
        "active",
        theme === "dark"
    );

    lightModeButton.classList.toggle(
        "active",
        theme === "light"
    );

    darkModeButton.setAttribute(
        "aria-pressed",
        String(theme === "dark")
    );

    lightModeButton.setAttribute(
        "aria-pressed",
        String(theme === "light")
    );

    document
        .querySelector('meta[name="theme-color"]')
        .setAttribute(
            "content",
            theme === "dark" ? "#000000" : "#f1f0ec"
        );

    updateSettingsStatus(
        theme === "dark"
            ? "DARK MODE ACTIVE"
            : "LIGHT MODE ACTIVE"
    );
}

darkModeButton.addEventListener("click", () => {
    setTheme("dark");
});

lightModeButton.addEventListener("click", () => {
    setTheme("light");
});


/* =========================================================
   RESET SETTINGS
========================================================= */

resetSettingsButton.addEventListener("click", () => {
    settings = {
        theme: DEFAULTS.theme,
        rainbowEnabled: DEFAULTS.rainbowEnabled,
        rainbowSpeed: DEFAULTS.rainbowSpeed,
        colors: [...DEFAULTS.colors]
    };

    setTheme(settings.theme);
    applyRainbowSettings();

    updateSettingsStatus("DEFAULT SETTINGS RESTORED");
});


/* =========================================================
   INITIALIZE SCRAMBLED BUTTON LABELS
========================================================= */

buttons.forEach(button => {
    const scrambled = button.querySelector(".scrambled");

    scrambled.textContent = makeScramble(
        3
    );
});


/* =========================================================
   AUDIO ANALYSIS

   Feeds the ribbon. If the browser cannot analyse the audio
   (for example the page was opened straight from disk with
   file://), the ribbon falls back to a gentle synthetic wave
   so it never looks dead.
========================================================= */

const LEVEL_COUNT = 48;
const levels = new Array(LEVEL_COUNT).fill(0);
let bass = 0;

let audioContext = null;
let analyser = null;
let frequencyData = null;

function ensureAudioGraph() {
    if (audioContext) return;

    // Keep the existing file:// fallback; analyse audio when served over http(s).
    if (location.protocol === "file:") return;

    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    try {
        audioContext = new AudioContextClass();

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.68;

        const source = audioContext.createMediaElementSource(audio);

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        frequencyData = new Uint8Array(analyser.frequencyBinCount);
    } catch (error) {
        audioContext = null;
        analyser = null;
        frequencyData = null;
    }
}

function updateAudioLevels(timestamp) {
    const playing = !audio.paused && !audio.ended;
    let real = false;

    if (analyser && playing) {
        analyser.getByteFrequencyData(frequencyData);
        real = frequencyData.some(value => value > 0);
    }

    const usable = frequencyData ? frequencyData.length : 0;

    for (let i = 0; i < LEVEL_COUNT; i++) {
        let target;

        if (real) {
            // Average a small logarithmic frequency band for each ribbon segment.
            // This reacts to changing bass, mids and treble instead of sampling
            // a single FFT bin that can miss nearby frequencies.
            const position = i / Math.max(LEVEL_COUNT - 1, 1);
            const start = Math.floor(Math.pow(position, 2.15) * usable * 0.82);
            const nextPosition = (i + 1) / LEVEL_COUNT;
            const end = Math.max(
                start + 1,
                Math.min(usable, Math.ceil(Math.pow(nextPosition, 2.15) * usable * 0.82))
            );

            let bandSum = 0;
            for (let bin = start; bin < end; bin++) {
                bandSum += frequencyData[bin];
            }

            const average = bandSum / Math.max(1, end - start);
            target = Math.min(1, Math.pow(average / 255, 0.78) * 1.65);
        } else if (playing) {
            target =
                0.18 +
                0.22 *
                Math.sin(timestamp * 0.004 + i * 0.45) *
                Math.sin(timestamp * 0.0013 + i * 0.2);
        } else {
            target = 0.025;
        }

        // Fast attack, smoother release: closer to a real-time audio visualizer.
        const response = target > levels[i] ? 0.78 : 0.19;
        levels[i] += (target - levels[i]) * response;
    }

    bass = (levels[0] + levels[1] + levels[2] + levels[3]) / 4;
}

/* =========================================================
   LETTER GATHER ANIMATION

   One animation used by both menus. Every letter starts
   where it really is (button letters, loose background
   letters), flies in with the same easing, delay and orbit
   wobble, then holds its place:

     settings -> corner brackets around the menu
     music    -> a twisting ribbon across the whole screen

   The ribbon fakes 3D with opacity and size: letters on the
   near side of the twist are bright and larger, letters on
   the far side are dim and smaller.

   These particles are an animation layer, not the menu
   itself. The real HTML controls stay functional regardless
   of particle count.
========================================================= */

let settingsWidth = 0;
let settingsHeight = 0;
let settingsDpr = 1;

function resizeSettingsCanvas() {
    settingsDpr = Math.min(window.devicePixelRatio || 1, 2);

    settingsWidth = window.innerWidth;
    settingsHeight = window.innerHeight;

    settingsCanvas.width = Math.floor(settingsWidth * settingsDpr);
    settingsCanvas.height = Math.floor(settingsHeight * settingsDpr);

    settingsCanvas.style.width = `${settingsWidth}px`;
    settingsCanvas.style.height = `${settingsHeight}px`;

    settingsCtx.setTransform(
        settingsDpr,
        0,
        0,
        settingsDpr,
        0,
        0
    );
}

resizeSettingsCanvas();

function captureTransitionParticles(mode) {
    transitionParticles = [];

    // Letters from every button
    buttons.forEach(button => {
        const element = button.querySelector(".scrambled");
        const rect = element.getBoundingClientRect();
        const text = element.textContent.trim();

        if (!text.length) return;

        const spacing = rect.width / text.length;

        for (let i = 0; i < text.length; i++) {
            const x = rect.left + spacing * (i + 0.5);
            const y = rect.top + rect.height / 2;
            const size = randomRange(10, 15);

            transitionParticles.push({
                boid: null,
                sourceX: x,
                sourceY: y,
                x,
                y,
                targetX: settingsWidth / 2,
                targetY: settingsHeight / 2,
                character: text[i],
                sourceCharacter: text[i],
                size,
                startSize: size,
                scale: 1,
                depth: 0,
                hold: 0.6,
                hueOffset: randomRange(-30, 30),
                delay: randomRange(0, 0.2),
                orbit: randomRange(4, 18),
                angle: Math.random() * Math.PI * 2
            });
        }
    });

    if (mode === "music" || isPageMode(mode)) {
        // Every loose letter floating in the background
        flock.forEach(boid => {
            const size = randomRange(10, 16);

            transitionParticles.push({
                boid,
                sourceX: boid.x,
                sourceY: boid.y,
                x: boid.x,
                y: boid.y,
                targetX: settingsWidth / 2,
                targetY: settingsHeight / 2,
                character: boid.symbol,
                sourceCharacter: boid.symbol,
                size,
                startSize: boid.size,
                scale: 1,
                depth: 0,
                hold: 0.6,
                hueOffset: randomRange(-30, 30),
                delay: randomRange(0, 0.2),
                orbit: randomRange(4, 18),
                angle: Math.random() * Math.PI * 2
            });
        });

        // More of the same symbols drifting in from off the page,
        // so the strand is dense enough to read as a ribbon
        const desired = settingsWidth < 600 ? 170 : 280;

        while (transitionParticles.length < desired) {
            const size = randomRange(10, 16);
            const x = Math.random() * settingsWidth;
            const y = Math.random() * settingsHeight;
            const symbol = randomSymbol();

            transitionParticles.push({
                boid: null,
                sourceX: x,
                sourceY: y,
                x,
                y,
                targetX: settingsWidth / 2,
                targetY: settingsHeight / 2,
                character: symbol,
                sourceCharacter: symbol,
                size,
                startSize: size * 2,
                scale: 1,
                depth: 0,
                hold: 0.6,
                hueOffset: randomRange(-30, 30),
                delay: randomRange(0, 0.2),
                orbit: randomRange(4, 18),
                angle: Math.random() * Math.PI * 2
            });
        }
    }

    // Spread the letters along the strand in random order
    const order = shuffle(transitionParticles.map((_, i) => i));

    transitionParticles.forEach((particle, i) => {
        particle.i = i;
        particle.u = (order[i] + 0.5) / transitionParticles.length;
        particle.v = randomRange(-1, 1);
    });
}

function updateGatherTargets(timestamp) {
    if (gatherMode === "settings") {
        const rect = settingsPanel.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rx = rect.width * 0.62 + 18;
        const ry = rect.height * 0.62 + 18;

        // Keep the transition organic: letters float around the menu,
        // never forming hard corner brackets or a box-like frame.
        transitionParticles.forEach((particle, index) => {
            const angle = index * 2.39996;
            const spread = 0.76 + ((index % 7) / 18);
            particle.targetX = cx + Math.cos(angle) * rx * spread;
            particle.targetY = cy + Math.sin(angle) * ry * spread;
            particle.scale = 1;
            particle.depth = 0;
            particle.hold = 0.7;
        });
        return;
    }

    if (isPageMode(gatherMode)) {
        // Letters spiral into the middle of the new page (for WORDS: into the
        // search box) and dissolve there while the page itself fades in.
        let cx = settingsWidth / 2;
        let cy = settingsHeight / 2;

        if (gatherMode === "word") {
            const box = document.getElementById("wordSearch");

            if (box) {
                const rect = box.getBoundingClientRect();

                if (rect.width) {
                    cx = rect.left + rect.width / 2;
                    cy = rect.top + rect.height / 2;
                }
            }
        }

        const spread = Math.min(settingsWidth, settingsHeight) *
            (gatherMode === "word" ? 0.12 : 0.17);
        const count = Math.max(transitionParticles.length, 1);

        transitionParticles.forEach((particle, index) => {
            const angle = index * 2.39996 + timestamp * 0.0007;
            const radius = spread * (0.12 + 0.88 * Math.sqrt((index + 1) / count));

            particle.targetX = cx + Math.cos(angle) * radius * 1.5;
            particle.targetY = cy + Math.sin(angle) * radius * 0.8;
            particle.scale = 1;
            particle.depth = 0;
            particle.hold = 0;      // letters fade out as they arrive
        });
        return;
    }

    if (gatherMode === "music") {
        const small = settingsWidth < 600;

        const centerY = settingsHeight * (small ? 0.33 : 0.4);
        const amplitude =
            settingsHeight * (small ? 0.12 : 0.17) * (0.7 + bass * 1.25);
        const halfWidth = small ? 48 : 82;
        const waves = small ? 2.2 : 3.2;

        transitionParticles.forEach(particle => {
            const u = particle.u;

            const level = levels[
                Math.min(LEVEL_COUNT - 1, Math.floor(u * LEVEL_COUNT))
            ];

            const wave = Math.sin(u * Math.PI * waves + timestamp * 0.0013);

            const spike =
                (level - 0.25) *
                settingsHeight *
                0.105 *
                Math.sin(u * 38 + timestamp * 0.004);

            // The band twists around its centerline
            const twist = u * Math.PI * 2.4 + timestamp * 0.0009;
            const cross = particle.v * halfWidth * (0.95 + level * 1.45);

            const depthNorm = (Math.sin(twist) * particle.v + 1) / 2;

            particle.targetX =
                -10 +
                u * (settingsWidth + 20) +
                Math.sin(timestamp * 0.002 + particle.angle) * 3;

            particle.targetY =
                centerY +
                wave * amplitude +
                spike +
                cross * Math.cos(twist);

            particle.depth = depthNorm;
            particle.scale = 0.8 + 0.55 * depthNorm;
            particle.hold = 0.18 + 0.72 * depthNorm;
        });
    }
}

function drawTransitionParticles(timestamp, progress, closing = false) {
    settingsCtx.clearRect(0, 0, settingsWidth, settingsHeight);

    const colors = settings.colors.length
        ? settings.colors
        : DEFAULTS.colors;

    // Far letters first so near letters sit on top
    const drawList = gatherMode === "music"
        ? [...transitionParticles].sort((a, b) => a.depth - b.depth)
        : transitionParticles;

    drawList.forEach(particle => {
        const index = particle.i;

        if (particle.boid) {
            particle.sourceX = particle.boid.x;
            particle.sourceY = particle.boid.y;
        }

        const delayedProgress = Math.max(
            0,
            Math.min(
                1,
                (progress - particle.delay) / (1 - particle.delay)
            )
        );

        const eased = easeInOutCubic(delayedProgress);

        const startX = closing ? particle.targetX : particle.sourceX;
        const startY = closing ? particle.targetY : particle.sourceY;
        const endX = closing ? particle.sourceX : particle.targetX;
        const endY = closing ? particle.sourceY : particle.targetY;

        let x = startX + (endX - startX) * eased;
        let y = startY + (endY - startY) * eased;

        const movement = Math.sin(eased * Math.PI);

        x += Math.cos(particle.angle + timestamp * 0.002) *
            particle.orbit * movement;

        y += Math.sin(particle.angle + timestamp * 0.002) *
            particle.orbit * movement;

        // how "arrived" the letter is
        const arrived = closing ? 1 - eased : eased;

        const size =
            particle.startSize +
            (particle.size * particle.scale - particle.startSize) * arrived;

        const color = colors[
            Math.floor(
                (
                    timestamp * 0.0005 +
                    particle.hueOffset / 40 +
                    index / Math.max(transitionParticles.length, 1)
                ) * colors.length * 8
            ) % colors.length
        ];

        settingsCtx.save();

        settingsCtx.globalAlpha = Math.min(
            1,
            0.9 * movement + particle.hold * arrived
        );

        settingsCtx.font =
            `${size}px "Fira Code", monospace`;

        settingsCtx.textAlign = "center";
        settingsCtx.textBaseline = "middle";
        settingsCtx.fillStyle = color;

        settingsCtx.fillText(
            particle.character,
            x,
            y
        );

        settingsCtx.restore();
    });
}

function gatherFrame(timestamp) {
    let progress = 1;
    let closing = false;

    if (gatherPhase === "opening") {
        progress = Math.max(
            0,
            Math.min(1, (timestamp - gatherStart) / gatherDuration)
        );

        if (progress >= 1) {
            gatherPhase = "open";

            if (gatherMode === "settings") {
                finishOpeningSettings();
            } else if (isPageMode(gatherMode)) {
                finishOpeningPage();
                return;
            }
        }
    } else if (gatherPhase === "closing") {
        closing = true;

        progress = Math.max(
            0,
            Math.min(1, (timestamp - gatherStart) / gatherDuration)
        );
    }

    if (gatherMode === "music") {
        updateAudioLevels(timestamp);
    }

    updateGatherTargets(timestamp);
    drawTransitionParticles(timestamp, progress, closing);

    if (closing && progress >= 1) {
        transitionFrame = null;
        gatherPhase = "idle";

        if (gatherMode === "music") {
            finishClosingMusic();
        } else if (isPageMode(gatherMode)) {
            finishClosingPage();
        } else {
            finishClosingSettings();
        }

        return;
    }

    transitionFrame = requestAnimationFrame(gatherFrame);
}

function startGather(mode, closing = false) {
    if (transitionFrame !== null) {
        cancelAnimationFrame(transitionFrame);
        transitionFrame = null;
    }

    gatherMode = mode;

    // Settings with reduced motion: no letters, menu just appears.
    if (!canAnimate() && mode === "settings") {
        if (closing) {
            finishClosingSettings();
        } else {
            finishOpeningSettings();
        }

        return;
    }

    // Pages with reduced motion: no letters, just the CSS fade.
    if (!canAnimate() && isPageMode(mode)) {
        if (closing) {
            finishClosingPage();
        } else {
            finishOpeningPage();
        }

        return;
    }

    gatherPhase = closing ? "closing" : "opening";

    gatherDuration = !canAnimate()
        ? 1
        : isPageMode(mode)
            ? (closing ? 760 : 1000)
            : closing
                ? 380
                : mode === "music"
                    ? 950
                    : 520;

    gatherStart = performance.now();

    transitionFrame = requestAnimationFrame(gatherFrame);
}

function stopGather() {
    if (transitionFrame !== null) {
        cancelAnimationFrame(transitionFrame);
        transitionFrame = null;
    }

    gatherPhase = "idle";
    gatherMode = null;

    settingsCtx.clearRect(0, 0, settingsWidth, settingsHeight);
}


/* =========================================================
   PAGE TRANSITIONS  (VIDEO + WORDS)

   Same letter swirl as music / settings. The letters of every
   button and every loose background letter fly into the middle
   of the new page and dissolve there while the page FADES IN
   (the fade itself is CSS, see .game-overlay / .word-overlay).
   Closing runs it backwards: the page fades out while the
   letters fly back out to their buttons.

   words.js and other sections call these after they show/hide their
   own overlay.
========================================================= */

function openPageTransition(mode) {
    settingsTransitioning = true;

    captureTransitionParticles(mode);

    app.classList.add("page-active", "page-transitioning", "spiral-menu-hidden");

    mouse.active = false;

    startGather(mode, false);
}

function closePageTransition(mode) {
    settingsTransitioning = true;

    captureTransitionParticles(mode);

    app.classList.add("page-transitioning");

    mouse.active = false;

    startGather(mode, true);
}

function finishOpeningPage() {
    settingsTransitioning = false;

    app.classList.remove("page-transitioning");

    stopGather();

    transitionParticles = [];
}

function finishClosingPage() {
    settingsTransitioning = false;

    app.classList.remove("page-active", "page-transitioning", "spiral-menu-hidden");

    stopGather();

    transitionParticles = [];

    mouse.active =
        pageFocused &&
        !centerHover &&
        !panelOpen();
}

window.openPageTransition = openPageTransition;
window.closePageTransition = closePageTransition;


/* =========================================================
   SETTINGS BUTTON MOTION
   Replays the same soft, elastic feel whenever a settings
   button is entered. Existing menu / particle animations stay
   untouched.
========================================================= */

function replaySettingsButtonMotion(button) {
    if (!canAnimate()) return;

    button.classList.remove("settings-button-wiggle");
    // Force a style flush so the animation can replay on each hover.
    void button.offsetWidth;
    button.classList.add("settings-button-wiggle");
}

document.querySelectorAll(
    ".settings-panel button:not(.close-settings), .close-settings"
).forEach(button => {
    button.addEventListener("pointerenter", () => {
        replaySettingsButtonMotion(button);
    });

    button.addEventListener("animationend", event => {
        if (event.animationName === "settingsButtonWiggle") {
            button.classList.remove("settings-button-wiggle");
        }
    });
});

/* =========================================================
   OPEN SETTINGS
========================================================= */

function openSettings() {
    if (panelOpen() || settingsTransitioning) return;

    settingsOpen = true;
    settingsTransitioning = true;

    captureTransitionParticles("settings");

    app.classList.add("settings-transitioning");

    settingsOverlay.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    mouse.active = false;

    setStatus("* SETTINGS *");

    /*
       Open the actual HTML menu immediately.
       The particle animation is decorative and cannot
       prevent interaction with the settings.
    */

    app.classList.add("settings-open");

    settingsTransitioning = false;

    startGather("settings", false);

    closeSettingsButton.focus({
        preventScroll: true
    });
}

function finishOpeningSettings() {
    settingsTransitioning = false;
    app.classList.remove("settings-transitioning");
}


/* =========================================================
   CLOSE SETTINGS
========================================================= */

function closeSettings() {
    if (!settingsOpen || settingsTransitioning) return;

    settingsOpen = false;
    settingsTransitioning = true;

    app.classList.remove("settings-open");
    app.classList.add("settings-transitioning");

    settingsOverlay.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";

    mouse.active = false;

    setStatus("* ONLINE *");

    startGather("settings", true);

    settingsButton.focus({
        preventScroll: true
    });
}

function finishClosingSettings() {
    settingsTransitioning = false;

    app.classList.remove("settings-transitioning");

    stopGather();

    transitionParticles = [];

    mouse.active =
        pageFocused &&
        !centerHover &&
        !panelOpen();
}

settingsButton.addEventListener("click", openSettings);
closeSettingsButton.addEventListener("click", closeSettings);

settingsOverlay.addEventListener("click", event => {
    if (event.target === settingsOverlay) {
        closeSettings();
    }
});

settingsPanel.addEventListener("click", event => {
    event.stopPropagation();
});


/* =========================================================
   MUSIC PLAYER
========================================================= */

let tracks = PLAYLIST.map(track => ({ ...track }));
let trackIndex = -1;
let seeking = false;

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);

    return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function renderPlaylist() {
    playlistElement.textContent = "";

    if (!tracks.length) {
        const empty = document.createElement("li");

        empty.className = "playlist-empty";
        empty.textContent = "NO TRACKS // ADD A FILE BELOW";

        playlistElement.appendChild(empty);

        return;
    }

    tracks.forEach((track, index) => {
        const item = document.createElement("li");
        const row = document.createElement("button");

        row.type = "button";

        row.className =
            "playlist-item" +
            (index === trackIndex ? " active rainbow-text" : "");

        row.textContent =
            `${String(index + 1).padStart(2, "0")}  ${track.title}` +
            (track.artist ? ` // ${track.artist}` : "");

        row.addEventListener("click", () => {
            loadTrack(index, true);
        });

        item.appendChild(row);
        playlistElement.appendChild(item);
    });
}

function updatePlayButton() {
    const playing = !audio.paused;

    playToggle.textContent = playing ? "❚❚" : "▶";
    playToggle.setAttribute("aria-label", playing ? "Pause" : "Play");
}

function playAudio() {
    ensureAudioGraph();

    if (audioContext && audioContext.state === "suspended") {
        audioContext.resume();
    }

    const attempt = audio.play();

    if (attempt && attempt.catch) {
        attempt.catch(() => {
            setMusicStatus("PRESS PLAY TO START");
            updatePlayButton();
        });
    }
}

function loadTrack(index, autoplay = false) {
    if (!tracks.length) return;

    trackIndex = (index + tracks.length) % tracks.length;

    const track = tracks[trackIndex];

    audio.src = track.src;
    audio.load();

    musicNow.textContent = track.title;

    seekBar.value = "0";
    timeCurrent.textContent = "0:00";
    timeTotal.textContent = "0:00";

    setMusicStatus(track.artist ? track.artist : "TRACK LOADED");

    renderPlaylist();

    if (autoplay) {
        playAudio();
    }
}

function togglePlay() {
    if (!tracks.length) {
        setMusicStatus("ADD A FILE FIRST");
        return;
    }

    if (trackIndex < 0) {
        loadTrack(0, true);
        return;
    }

    if (audio.paused) {
        playAudio();
    } else {
        audio.pause();
    }
}

function addFiles(fileList) {
    const files = [...fileList].filter(file =>
        file.type.startsWith("audio/") ||
        /\.(mp3|wav|ogg|m4a|aac|flac|webm|opus)$/i.test(file.name)
    );

    if (!files.length) {
        setMusicStatus("NO AUDIO FILES FOUND");
        return;
    }

    const firstNew = tracks.length;

    files.forEach(file => {
        tracks.push({
            title: file.name.replace(/\.[^.]+$/, ""),
            artist: "LOCAL FILE",
            src: URL.createObjectURL(file)
        });
    });

    loadTrack(firstNew, true);
}

playToggle.addEventListener("click", togglePlay);

prevTrackButton.addEventListener("click", () => {
    if (!tracks.length) return;

    // Restart the song first, like a normal player
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
    } else {
        loadTrack(trackIndex - 1, !audio.paused);
    }
});

nextTrackButton.addEventListener("click", () => {
    if (!tracks.length) return;

    loadTrack(trackIndex + 1, !audio.paused);
});

audio.addEventListener("play", updatePlayButton);
audio.addEventListener("pause", updatePlayButton);

audio.addEventListener("loadedmetadata", () => {
    timeTotal.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    timeCurrent.textContent = formatTime(audio.currentTime);

    if (!seeking && Number.isFinite(audio.duration) && audio.duration > 0) {
        seekBar.value = String(
            Math.round((audio.currentTime / audio.duration) * 1000)
        );
    }
});

audio.addEventListener("ended", () => {
    if (tracks.length > 1) {
        loadTrack(trackIndex + 1, true);
    } else {
        updatePlayButton();
    }
});

audio.addEventListener("error", () => {
    if (audio.getAttribute("src")) {
        setMusicStatus("FILE NOT FOUND // CHECK PATH");
    }
});

seekBar.addEventListener("pointerdown", () => {
    seeking = true;
});

seekBar.addEventListener("pointerup", () => {
    seeking = false;
});

seekBar.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(seekBar.value) / 1000) * audio.duration;
    }
});

volumeBar.addEventListener("input", () => {
    audio.volume = Number(volumeBar.value) / 100;
    volumeValue.textContent = volumeBar.value;
});

addFileButton.addEventListener("click", () => {
    addFileInput.click();
});

addFileInput.addEventListener("change", () => {
    addFiles(addFileInput.files);
    addFileInput.value = "";
});

// Drop audio files anywhere while the music view is open
document.addEventListener("dragover", event => {
    if (musicOpen) {
        event.preventDefault();
    }
});

document.addEventListener("drop", event => {
    if (!musicOpen) return;

    event.preventDefault();

    if (event.dataTransfer && event.dataTransfer.files.length) {
        addFiles(event.dataTransfer.files);
    }
});


/* =========================================================
   OPEN / CLOSE MUSIC
========================================================= */

function openMusic() {
    if (panelOpen() || settingsTransitioning) return;

    musicOpen = true;
    settingsTransitioning = true;

    captureTransitionParticles("music");

    app.classList.remove("music-closing");
    app.classList.add("music-open");

    musicOverlay.setAttribute("aria-hidden", "false");
    app.classList.add("spiral-menu-hidden");

    mouse.active = false;

    setStatus("* MUSIC *");

    settingsTransitioning = false;

    startGather("music", false);

    closeMusicButton.focus({
        preventScroll: true
    });
}

function closeMusic() {
    if (!musicOpen || settingsTransitioning) return;

    musicOpen = false;
    settingsTransitioning = true;

    app.classList.remove("music-open");
    app.classList.add("music-closing");

    musicOverlay.setAttribute("aria-hidden", "true");

    mouse.active = false;

    setStatus("* ONLINE *");

    startGather("music", true);

    musicButton.focus({
        preventScroll: true
    });
}

function finishClosingMusic() {
    settingsTransitioning = false;

    app.classList.remove("music-closing", "spiral-menu-hidden");

    stopGather();

    transitionParticles = [];

    mouse.active =
        pageFocused &&
        !centerHover &&
        !panelOpen();
}

musicButton.addEventListener("click", openMusic);
closeMusicButton.addEventListener("click", closeMusic);


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (wordsOpen()) {
            closeWord();
        } else if (settingsOpen) {
            closeSettings();
        } else if (musicOpen) {
            closeMusic();
        }
    }

    if (
        musicOpen &&
        event.code === "Space" &&
        !event.target.closest("button, input")
    ) {
        event.preventDefault();
        togglePlay();
    }

    if (event.key === "Tab" && panelOpen()) {
        const container = settingsOpen
            ? settingsPanel
            : wordsOpen()
                ? document.getElementById("wordOverlay")
                : musicOverlay;

        const focusable = [
            ...container.querySelectorAll(
                'button:not(:disabled), input:not(:disabled):not([hidden]), [tabindex="0"]'
            )
        ].filter(element => element.getClientRects().length > 0);

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});


/* =========================================================
   BUTTON HOVER AND SCRAMBLING
========================================================= */

const SCRAMBLE_LABELS = {
    MUSIC: "MUS",
    SETTINGS: "CFG",
    CONTACT: "CNT",
    WRITING: "TXT",
    ABOUT: "INFO",
    VIDEO: "VID",
    WORDS: "WRD",
    ART: "ART",
    SOURCES: "SRC"
};

buttons.forEach(button => {
    const label = button.dataset.label;
    button.querySelector(".scrambled")?.replaceChildren();
    button.addEventListener("click", () => {
        if (button === settingsButton || button === musicButton || label === "SOCIAL") return;
        if (label === "VIDEO") { window.openRandomVideo?.(); return; }
        if (label === "SOURCES") { window.openSources?.(); return; }
        if (label === "WORDS") { openWord(); return; }
        setStatus(`${label} // SELECTED`);
    });
});

/* ================w=========================================
   SOCIAL MENU

   Press SOCIAL: every other button retracts into it, then the
   social icons disperse out of the same spot. Press it again
   (it becomes a close button), press Escape, or click empty
   space to bring the buttons back.

   Post links live in SOCIAL_POST_LINKS at the TOP of this file.
   Each click opens one randomly chosen post for that network.
========================================================= */

(() => {
    const socialButton = document.getElementById("socialButton");
    const socialLinks = document.getElementById("socialLinks");
    const centerClose = document.getElementById("socialCenterClose");

    if (!socialButton || !socialLinks) return;

    const label = socialButton.querySelector(".real-label");
    const closedText = label.textContent;
    const others = buttons.filter(button => button !== socialButton);
    const icons = [...socialLinks.querySelectorAll(".social-icon")];

    let open = false;
    let timer = null;

    // Works out how far every button has to travel to reach SOCIAL,
    // and where the icons start from. Transitions are switched off
    // while measuring so it is also safe to call mid-animation.
    function measure() {
        others.forEach(button => {
            button.style.transition = "none";
            button.style.translate = "none";
        });

const hub = stage.getBoundingClientRect();
        const hubX = hub.left + hub.width / 2;
        const hubY = hub.top + hub.height / 2;

        others.forEach((button, index) => {
            const rect = button.getBoundingClientRect();

            button.style.setProperty("--social-dx", `${hubX - (rect.left + rect.width / 2)}px`);
            button.style.setProperty("--social-dy", `${hubY - (rect.top + rect.height / 2)}px`);
            button.style.setProperty("--social-i", index);
        });

        const box = stage.getBoundingClientRect();

        socialLinks.style.setProperty("--hub-x", `${hubX - (box.left + box.width / 2)}px`);
        socialLinks.style.setProperty("--hub-y", `${hubY - (box.top + box.height / 2)}px`);

        others.forEach(button => {
            button.style.translate = "";
        });

        void stage.offsetWidth;   // apply the new values before transitions come back

        others.forEach(button => {
            button.style.transition = "";
        });
    }

    function setOpen(next) {
        if (next === open) return;

        open = next;
        clearTimeout(timer);

        socialButton.setAttribute("aria-expanded", String(open));
        socialButton.setAttribute("aria-label", open ? "Close social links" : "Social links");
label.textContent = closedText;
centerClose.setAttribute("aria-hidden", String(!open));
centerClose.tabIndex = open ? 0 : -1;

        const gap = canAnimate() ? 380 : 0;

        if (open) {
            measure();
            app.classList.add("social-open");                    // 1. buttons retract
            timer = setTimeout(() => app.classList.add("social-icons"), gap);   // 2. icons disperse
            setStatus("* SOCIAL *");
        } else {
            app.classList.remove("social-icons");                // 1. icons retract
            timer = setTimeout(() => app.classList.remove("social-open"), gap); // 2. buttons return
            setStatus("* ONLINE *");
        }
    }
centerClose.addEventListener("click", () => setOpen(false));
    socialButton.addEventListener("click", () => {
        if (!open && (panelOpen() || settingsTransitioning)) return;

        setOpen(!open);
    });

    
    // Shuffle each platform's posts without repeating
    const socialQueues = {};
    const lastSocialPost = {};

    function nextSocialPost(network) {
        const links = [...new Set(
            (SOCIAL_POST_LINKS[network] || [])
                .map(url => url.trim())
                .filter(url => /^https?:\/\//i.test(url))
        )];

        if (!links.length) return null;

        if (!socialQueues[network] || !socialQueues[network].length) {
            const queue = [...links];

            // Fisher-Yates shuffle
            for (let i = queue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queue[i], queue[j]] = [queue[j], queue[i]];
            }

            // Prevent the last post from immediately repeating
            if (
                queue.length > 1 &&
                queue[queue.length - 1] === lastSocialPost[network]
            ) {
                [queue[0], queue[queue.length - 1]] =
                    [queue[queue.length - 1], queue[0]];
            }

            socialQueues[network] = queue;
        }

        const href = socialQueues[network].pop();
        lastSocialPost[network] = href;

        return href;
    }

    icons.forEach(icon => {
        icon.addEventListener("click", event => {
            event.preventDefault();

            const network = (icon.dataset.network || "").toLowerCase();
            const href = nextSocialPost(network);

            if (!href) {
                setStatus(`${icon.dataset.network} // LINK COMING SOON`);
                return;
            }

            window.open(href, "_blank", "noopener,noreferrer");
        });
    });


    document.addEventListener("pointerdown", event => {
      if (open && !event.target.closest("#socialButton, #socialCenterClose, .social-icon")) {
            setOpen(false);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && open && !panelOpen()) {
            setOpen(false);
            socialButton.focus({ preventScroll: true });
        }
    });

    window.addEventListener("resize", () => {
        if (open) measure();
    });
})();


/* =========================================================
   POINTER AND CENTER
========================================================= */

let touchReleaseTimer = null;

function updatePointer(x, y, parallax = true) {
    mouse.x = x;
    mouse.y = y;

    mouse.active =
        pageFocused &&
        !centerHover &&
        !panelOpen();

    if (parallax && !panelOpen()) {
        const xOffset = (x / window.innerWidth - 0.5) * 8;
        const yOffset = (y / window.innerHeight - 0.5) * 8;

        stage.style.marginLeft = `${xOffset}px`;
        stage.style.marginTop = `${yOffset}px`;
    }
}

window.addEventListener("mousemove", event => {
    updatePointer(event.clientX, event.clientY);
});

function handleTouch(event) {
    if (event.touches.length) {
        clearTimeout(touchReleaseTimer);

        updatePointer(
            event.touches[0].clientX,
            event.touches[0].clientY,
            false
        );
    }
}

window.addEventListener("touchstart", handleTouch, { passive: true });
window.addEventListener("touchmove", handleTouch, { passive: true });

window.addEventListener("touchend", () => {
    // let the letters settle once the finger lifts
    touchReleaseTimer = setTimeout(() => {
        mouse.active = false;
    }, 700);
}, { passive: true });

window.addEventListener("focus", () => {
    pageFocused = true;

    mouse.active =
        !centerHover &&
        !panelOpen();
});

window.addEventListener("blur", () => {
    pageFocused = false;
    mouse.active = false;
});

centerHoverZone.addEventListener("mouseenter", () => {
    if (panelOpen()) return;

    centerHover = true;
    mouse.active = false;
});

centerHoverZone.addEventListener("mouseleave", () => {
    centerHover = false;

    if (!panelOpen()) {
        mouse.active = pageFocused;
        scrambleLine.textContent = makeScramble(12);
    }
});


/* =========================================================
   MAIN TEXT SCRAMBLING
========================================================= */

if (canAnimate()) {
    setInterval(() => {
        if (!panelOpen()) {
            title.textContent = makeScramble(3);
        }
    }, 110);

    setInterval(() => {
        if (!panelOpen()) {
            scrambleLine.textContent = makeScramble(12);
        }
    }, 130);

    setInterval(() => {
        if (!panelOpen()) {
            bottomScramble.textContent = makeScramble(22);
        }
    }, 140);

    const statuses = [
        "* ONLINE *",
        "* SIGNAL *",
        "* ACTIVE *",
        "* 001 *",
        "* * *"
    ];

    setInterval(() => {
        if (!panelOpen()) {
            setStatus(
                statuses[Math.floor(Math.random() * statuses.length)]
            );
        }
    }, 2500);
}


/* =========================================================
   BACKGROUND BOIDS
========================================================= */

let width = 0;
let height = 0;
let dpr = 1;

let flock = [];

const NEIGHBOR_RADIUS = 75;
const SEPARATION_RADIUS = 22;
const MAX_SPEED = 1.25;

function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    resizeSettingsCanvas();

    const desiredCount = width < 600 ? 55 : 100;

    while (flock.length < desiredCount) {
        flock.push(new Boid());
    }

    if (flock.length > desiredCount) {
        flock.length = desiredCount;
    }
}

class Boid {
    constructor() {
        this.x = Math.random() * Math.max(width, 1);
        this.y = Math.random() * Math.max(height, 1);

        const angle = Math.random() * Math.PI * 2;
        const speed = randomRange(0.2, MAX_SPEED);

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.ax = 0;
        this.ay = 0;

        this.size = randomRange(27, 38);
        this.symbol = randomSymbol();
        this.opacity = randomRange(0.18, 0.55);
        this.changeTimer = randomRange(100, 500);
    }

    applyForce(fx, fy) {
        this.ax += fx;
        this.ay += fy;
    }

    update(boids) {
        let alignmentX = 0;
        let alignmentY = 0;

        let cohesionX = 0;
        let cohesionY = 0;

        let separationX = 0;
        let separationY = 0;

        let total = 0;
        let separationTotal = 0;

        for (const other of boids) {
            if (other === this) continue;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distance = Math.hypot(dx, dy);

            if (distance < NEIGHBOR_RADIUS) {
                alignmentX += other.vx;
                alignmentY += other.vy;

                cohesionX += other.x;
                cohesionY += other.y;

                total++;
            }

            if (distance < SEPARATION_RADIUS && distance > 0) {
                separationX -= dx / distance;
                separationY -= dy / distance;

                separationTotal++;
            }
        }

        if (total > 0) {
            alignmentX = alignmentX / total - this.vx;
            alignmentY = alignmentY / total - this.vy;

            this.applyForce(alignmentX * 0.012, alignmentY * 0.012);

            cohesionX /= total;
            cohesionY /= total;

            this.applyForce(
                (cohesionX - this.x) * 0.0008,
                (cohesionY - this.y) * 0.0008
            );
        }

        if (separationTotal > 0) {
            this.applyForce(
                separationX * 0.045,
                separationY * 0.045
            );
        }

        if (mouse.active) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.hypot(dx, dy);

            if (distance < 260) {
                const strength = (1 - distance / 260) * 0.012;

                this.applyForce(
                    dx * strength,
                    dy * strength
                );
            }
        }

        const centerDX = this.x - width / 2;
        const centerDY = this.y - height / 2;
        const centerDistance = Math.hypot(centerDX, centerDY);
        const centerRadius = Math.min(width, height) * 0.27;

        if (
            centerDistance < centerRadius &&
            centerDistance > 0
        ) {
            const normalized = 1 - centerDistance / centerRadius;
            const push = normalized * normalized * 0.09;

            this.applyForce(
                (centerDX / centerDistance) * push,
                (centerDY / centerDistance) * push
            );
        }

        this.vx += this.ax;
        this.vy += this.ay;

        const speed = Math.hypot(this.vx, this.vy);

        if (speed > MAX_SPEED) {
            this.vx = (this.vx / speed) * MAX_SPEED;
            this.vy = (this.vy / speed) * MAX_SPEED;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.ax = 0;
        this.ay = 0;

        const margin = 30;

        if (this.x < -margin) this.x = width + margin;
        if (this.x > width + margin) this.x = -margin;
        if (this.y < -margin) this.y = height + margin;
        if (this.y > height + margin) this.y = -margin;

        this.changeTimer--;

        if (this.changeTimer <= 0) {
            this.symbol = randomSymbol();
            this.changeTimer = randomRange(100, 500);
        }
    }

    draw(timestamp) {
        ctx.save();

        ctx.font = `${this.size}px "Fira Code", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const speed = Math.hypot(this.vx, this.vy);
        const brightness = Math.min(0.55, this.opacity + speed * 0.08);

        const hue = (
            timestamp * 0.025 +
            this.x * 0.08 +
            this.y * 0.04
        ) % 360;

        if (settings.theme === "light") {
            ctx.fillStyle = `hsla(${hue}, 65%, 32%, ${brightness})`;
        } else {
            ctx.fillStyle = `hsla(${hue}, 75%, 48%, ${brightness})`;
        }

        ctx.fillText(this.symbol, this.x, this.y);

        ctx.restore();
    }
}

function initializeFlock() {
    flock = [];

    const count = width < 600 ? 55 : 100;

    for (let i = 0; i < count; i++) {
        flock.push(new Boid());
    }
}

let animationFrame = null;

function animateBackground(timestamp) {
    ctx.clearRect(0, 0, width, height);

    for (const boid of flock) {
        boid.update(flock);
    }

    for (const boid of flock) {
        boid.draw(timestamp);
    }

    animationFrame = requestAnimationFrame(animateBackground);
}

function startBackgroundAnimation() {
    if (animationFrame !== null) return;

    animationFrame = requestAnimationFrame(animateBackground);
}

function stopBackgroundAnimation() {
    if (animationFrame === null) return;

    cancelAnimationFrame(animationFrame);
    animationFrame = null;

    ctx.clearRect(0, 0, width, height);
}

resizeCanvas();
initializeFlock();

if (canAnimate()) {
    startBackgroundAnimation();
}

window.addEventListener("resize", () => {
    resizeCanvas();

    // targets are recalculated every frame while a menu is open
    transitionParticles.forEach(particle => {
        particle.targetX = width / 2;
        particle.targetY = height / 2;
    });
});


/* =========================================================
   REDUCED MOTION CHANGES
========================================================= */

prefersReducedMotion.addEventListener?.("change", event => {
    if (event.matches) {
        stopBackgroundAnimation();

        if (!panelOpen()) {
            settingsCtx.clearRect(0, 0, settingsWidth, settingsHeight);
        }
    } else {
        startBackgroundAnimation();
    }
});


/* =========================================================
   INITIAL STATE
========================================================= */

function initializeMusic() {
    audio.volume = Number(volumeBar.value) / 100;

    renderPlaylist();

    if (tracks.length) {
        loadTrack(0, false);
    }

    updatePlayButton();
}

function initializeSettings() {
    app.dataset.theme = DEFAULTS.theme;

    title.textContent = "ARCHIVE";
    scrambleLine.textContent = "EXPLORE THE COLLECTION";
    bottomScramble.textContent = makeScramble(22);

    setTheme(DEFAULTS.theme);
    applyRainbowSettings();

    setStatus("* ONLINE *");
}

initializeSettings();
initializeMusic();

/* V5: One-time intro; preserve the original 3-character title and 12-character line. */
(() => {
  const gate = document.getElementById('entryGate');
  if (!gate) return;
  let entered = false;
  const begin = () => {
    if (entered) return;
    entered = true;
    app.classList.remove('awaiting-entry');
    app.classList.add('entering');
    window.setTimeout(() => { app.classList.remove('entering'); app.classList.add('entered'); }, 1950);
    title.textContent = "ARCHIVE";
    scrambleLine.textContent = "EXPLORE THE COLLECTION";
    gate.setAttribute('aria-hidden', 'true');
    gate.tabIndex = -1;
  };
  gate.addEventListener('click', begin);
  gate.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); begin(); }
  });
})();


/* Decorative concrete-poetry spiral. These are not navigation labels. */
(() => {
  const field = document.getElementById('poetryField');
  if (!field) return;
  // Deliberately short concrete-poetry fragments: embedded words, roots, and sounds.
  // Source themes: vernacular, quota, compassion, moratorium, people,
  // ex tempore, waking life, production, machines, factory.
  // Not every fragment is a standalone etymological root.
  const vocab = ['ver','vern','v','nac','ac','a','lar','quo','qu','ota','o','com','co','p','pas','ion','i','mor','mora','or','rat','tor','t','pop','po','pul','pe','ex','temp','tem','em','ore','re','wake','wak','w','life','li','if','pro','prod','duct','duc','act','mach','mac','ma','in','ine','fact','fac','f','ory','ry','er','on','us','um','de','dia','dem','demo','voc','vox','mer','merc','hum','man','hand','lab','bor','eng','gin','quo','dre','craft','cra'];
  let seed = 12731;
  const random = () => {seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for (let ringIndex=0;ringIndex<3;ringIndex++) {
    const ring=document.createElement('div');
    ring.className='poetry-ring'+(ringIndex===1?' reverse':'');
    ring.style.setProperty('--duration',[95,73,128][ringIndex]+'s');
    const count=[27,22,17][ringIndex];
    for(let i=0;i<count;i++) {
      const span=document.createElement('span');
      span.className='poetry-fragment';
      const words=1+(random()>.79?1:0);
      span.textContent=Array.from({length:words},()=>vocab[Math.floor(random()*vocab.length)]).join(' ');
      const t=(i+random()*.6)/count;
      const angle=t*360+ringIndex*31;
      const radius=(ringIndex===0?8:ringIndex===1?18:30)+t*(ringIndex===0?15:ringIndex===1?13:11);
      span.style.setProperty('--angle',angle+'deg');
      span.style.setProperty('--radius',`calc(${radius} * var(--poetry-unit))`);
      // Depth fade: outer fragments are faint, getting more opaque toward the middle.
      // (random() is still called exactly once here so the seeded layout is unchanged.)
      const jitter=random();
      const depth=Math.max(0,Math.min(1,(radius-8)/(41-8)));   // 0 = center, 1 = outermost
      const alpha=.95-depth*.8+(jitter-.5)*.08;                  // ~.95 inside -> ~.15 outside
      span.style.setProperty('--alpha',alpha.toFixed(3));
      // Offsets each fragment's place in the gradient cycle so colors vary across the spiral.
      span.style.setProperty('--hue',((t+ringIndex*.33+jitter*.2)%1).toFixed(3));
      ring.append(span);
    }
    field.append(ring);
  }
})();



/* BOTH EMPTY BUTTON POSITIONS — LIVING GLITCH HUSKS */

(() => {
    const buttons = document.querySelectorAll(
        ".stage .orbit-button.glitch-only .scrambled"
    );

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&?!";

    buttons.forEach(button => {
        function glitch() {
            const length = Math.floor(Math.random() * 4) + 1;

            let text = "";

            for (let i = 0; i < length; i++) {
                text += chars[Math.floor(Math.random() * chars.length)];
            }

            button.textContent =
                Math.random() < 0.15 ? "" : text;

            setTimeout(glitch, 90 + Math.random() * 250);
        }

        glitch();
    });
})();