const root = document.documentElement;
const progress = document.querySelector("#scroll-progress");
const themeToggle = document.querySelector("[data-theme-toggle]");
const cursorRibbon = document.querySelector(".cursor-ribbon");
const year = document.querySelector("[data-year]");
const navLinks = [...document.querySelectorAll(".nav-links a, .section-rail a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function applyTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("portfolio-theme", theme);
}

const storedTheme = localStorage.getItem("portfolio-theme");
applyTheme(storedTheme || "dark");

let themeFadeTimer = 0;

themeToggle.addEventListener("click", () => {
  // Briefly opt the whole page into color transitions so the theme swap
  // cross-fades instead of snapping (see html.theme-fade in styles.css).
  root.classList.add("theme-fade");
  applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
  window.clearTimeout(themeFadeTimer);
  themeFadeTimer = window.setTimeout(() => root.classList.remove("theme-fade"), 320);
});

const supportsCursorRibbon =
  cursorRibbon &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (supportsCursorRibbon) {
  const context = cursorRibbon.getContext("2d");
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const config = {
    friction: 0.5,
    trails: 20,
    size: 50,
    dampening: 0.25,
    tension: 0.98,
  };
  const trails = [];
  let animationId = 0;
  let initialized = false;

  function resizeRibbon() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    cursorRibbon.width = Math.floor(window.innerWidth * pixelRatio);
    cursorRibbon.height = Math.floor(window.innerHeight * pixelRatio);
    cursorRibbon.style.width = `${window.innerWidth}px`;
    cursorRibbon.style.height = `${window.innerHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  class Node {
    constructor() {
      this.x = pointer.x;
      this.y = pointer.y;
      this.vx = 0;
      this.vy = 0;
    }
  }

  class Trail {
    constructor(index) {
      this.spring = 0.4 + (index / config.trails) * 0.025 + Math.random() * 0.1 - 0.02;
      this.friction = config.friction + Math.random() * 0.01 - 0.002;
      this.nodes = Array.from({ length: config.size }, () => new Node());
    }

    update() {
      let spring = this.spring;
      let node = this.nodes[0];

      node.vx += (pointer.x - node.x) * spring;
      node.vy += (pointer.y - node.y) * spring;

      for (let index = 0; index < this.nodes.length; index += 1) {
        node = this.nodes[index];

        if (index > 0) {
          const previous = this.nodes[index - 1];
          node.vx += (previous.x - node.x) * spring;
          node.vy += (previous.y - node.y) * spring;
          node.vx += previous.vx * config.dampening;
          node.vy += previous.vy * config.dampening;
        }

        node.vx *= this.friction;
        node.vy *= this.friction;
        node.x += node.vx;
        node.y += node.vy;
        spring *= config.tension;
      }
    }

    draw() {
      let x = this.nodes[0].x;
      let y = this.nodes[0].y;

      context.beginPath();
      context.moveTo(x, y);

      for (let index = 1; index < this.nodes.length - 2; index += 1) {
        const current = this.nodes[index];
        const next = this.nodes[index + 1];
        x = (current.x + next.x) * 0.5;
        y = (current.y + next.y) * 0.5;
        context.quadraticCurveTo(current.x, current.y, x, y);
      }

      const current = this.nodes[this.nodes.length - 2];
      const next = this.nodes[this.nodes.length - 1];
      context.quadraticCurveTo(current.x, current.y, next.x, next.y);
      context.stroke();
    }
  }

  function buildTrails() {
    trails.length = 0;

    for (let index = 0; index < config.trails; index += 1) {
      trails.push(new Trail(index));
    }
  }

  function drawRibbon() {
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    context.globalCompositeOperation = "lighter";
    context.strokeStyle =
      root.dataset.theme === "light" ? "rgba(22, 112, 95, 0.28)" : "rgba(168, 240, 210, 0.28)";
    context.lineWidth = 1;
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const trail of trails) {
      trail.update();
      trail.draw();
    }

    animationId = window.requestAnimationFrame(drawRibbon);
  }

  function startRibbon(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    if (!initialized) {
      initialized = true;
      buildTrails();
      animationId = window.requestAnimationFrame(drawRibbon);
    }
  }

  function moveRibbon(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    startRibbon(event);
  }

  resizeRibbon();
  window.addEventListener("resize", resizeRibbon, { passive: true });
  document.addEventListener("mousemove", moveRibbon, { passive: true });
  window.addEventListener("blur", () => {
    window.cancelAnimationFrame(animationId);
    animationId = 0;
  });
  window.addEventListener("focus", () => {
    if (initialized && !animationId) {
      animationId = window.requestAnimationFrame(drawRibbon);
    }
  });
}

year.textContent = new Date().getFullYear();

function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const amount = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progress.style.width = `${Math.min(100, Math.max(0, amount))}%`;
}

window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  },
  {
    rootMargin: "-18% 0px -62% 0px",
    threshold: [0.2, 0.45, 0.7],
  },
);

sections.forEach((section) => observer.observe(section));

// Scroll reveals: below-the-fold content eases in as it enters the viewport,
// staggered per sibling. The hero has its own entrance animation, and
// reduced-motion users never get elements hidden in the first place.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  const revealTargets = [
    ...document.querySelectorAll(
      ".section-block:not(.hero) .section-heading, .section-block:not(.hero) .entry, .contact-block .contact-copy, .contact-block .email-button, .contact-block .contact-methods",
    ),
  ];
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("reveal-pending");
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );

  revealTargets.forEach((element) => {
    const revealSiblings = [...element.parentElement.children].filter((child) =>
      revealTargets.includes(child),
    );
    const stagger = Math.min(Math.max(revealSiblings.indexOf(element), 0), 5) * 90;
    element.style.setProperty("--reveal-delay", `${stagger}ms`);
    // Hide instantly BEFORE arming the transition (reveal-ready), with a
    // forced reflow between the two: adding both in one style update would
    // animate the hide itself, flashing near-fold content on load.
    element.classList.add("reveal-pending");
    void element.offsetWidth;
    element.classList.add("reveal-ready");
    revealObserver.observe(element);
  });
}

window.addEventListener("load", () => {
  if (!window.location.hash) return;

  const target = document.querySelector(window.location.hash);
  if (target) {
    window.setTimeout(() => target.scrollIntoView({ block: "start" }), 80);
  }
});

const rubiksWidget = document.querySelector("[data-rubiks-widget]");

if (rubiksWidget) {
  const toggleButton = rubiksWidget.querySelector("[data-rubiks-toggle]");
  const closeButton = rubiksWidget.querySelector("[data-rubiks-close]");
  const popover = rubiksWidget.querySelector("#rubiks-popover");
  const panel = rubiksWidget.querySelector("[data-rubiks-panel]");
  const loading = rubiksWidget.querySelector("[data-rubiks-loading]");
  const cubeElements = [...rubiksWidget.querySelectorAll("[data-rubiks-cube]")];
  const cubeColors = {
    white: "#f7f7f4",
    yellow: "#f3c969",
    green: "#42d875",
    blue: "#4f91ff",
    red: "#e95656",
    orange: "#ff9336",
  };
  const cubeSides = ["front", "back", "right", "left", "top", "bottom"];
  const sideVectors = {
    front: { x: 0, y: 0, z: 1 },
    back: { x: 0, y: 0, z: -1 },
    right: { x: 1, y: 0, z: 0 },
    left: { x: -1, y: 0, z: 0 },
    top: { x: 0, y: 1, z: 0 },
    bottom: { x: 0, y: -1, z: 0 },
  };
  const sideByVector = new Map(
    Object.entries(sideVectors).map(([side, vector]) => [`${vector.x},${vector.y},${vector.z}`, side]),
  );
  const oppositeColors = {
    [cubeColors.white]: cubeColors.yellow,
    [cubeColors.yellow]: cubeColors.white,
    [cubeColors.green]: cubeColors.blue,
    [cubeColors.blue]: cubeColors.green,
    [cubeColors.red]: cubeColors.orange,
    [cubeColors.orange]: cubeColors.red,
  };
  const solvedOrientations = [
    { top: cubeColors.white, front: cubeColors.green, left: cubeColors.orange, right: cubeColors.red },
    { top: cubeColors.white, front: cubeColors.red, left: cubeColors.green, right: cubeColors.blue },
    { top: cubeColors.white, front: cubeColors.blue, left: cubeColors.red, right: cubeColors.orange },
    { top: cubeColors.white, front: cubeColors.orange, left: cubeColors.blue, right: cubeColors.green },
    { top: cubeColors.yellow, front: cubeColors.green, left: cubeColors.red, right: cubeColors.orange },
    { top: cubeColors.yellow, front: cubeColors.orange, left: cubeColors.green, right: cubeColors.blue },
    { top: cubeColors.yellow, front: cubeColors.blue, left: cubeColors.orange, right: cubeColors.red },
    { top: cubeColors.yellow, front: cubeColors.red, left: cubeColors.blue, right: cubeColors.green },
  ];
  const movePool = [
    { axis: "z", layer: 1, direction: 1 },
    { axis: "z", layer: 1, direction: -1 },
    { axis: "y", layer: 1, direction: 1 },
    { axis: "y", layer: 1, direction: -1 },
    { axis: "x", layer: 1, direction: 1 },
    { axis: "x", layer: 1, direction: -1 },
    { axis: "x", layer: -1, direction: 1 },
    { axis: "x", layer: -1, direction: -1 },
  ];
  const turnDuration = 280;
  const turnPause = 25;
  const cubes = cubeElements.map(createCubeState);
  let scrambleMoves = [];
  let isAnimating = false;
  // Bumped whenever the popover opens or closes. In-flight twist loops
  // compare their captured value against this and abort at the next
  // checkpoint, so a round abandoned mid-animation can't keep mutating a
  // cube that was just reset for a fresh round.
  let twistEpoch = 0;
  let pendingCubeRender = 0;
  let delayedCubeRender = 0;
  let questionQueue = [];
  const questionHistory = [];
  const questions = [
    {
      prompt: "Which company is Arnav currently a Quality Engineer Co-op at?",
      options: ["CIBC", "RBC", "Shopify", "TD"],
      answer: "CIBC",
    },
    {
      prompt: "Which university does Arnav attend?",
      options: ["Western University", "Waterloo", "University of Toronto", "McMaster"],
      answer: "Western University",
    },
    {
      prompt: "Where is Arnav based?",
      options: ["Greater Toronto Area", "Vancouver", "New York City", "Calgary"],
      answer: "Greater Toronto Area",
    },
    {
      prompt: "What is Arnav studying at Western?",
      options: ["Engineering", "Computer Science", "Economics", "Health Sciences"],
      answer: "Engineering",
    },
    {
      prompt: "Which business certificate is Arnav pursuing?",
      options: ["Ivey Business leadership certificate", "CPA certificate", "Google UX certificate", "AWS Cloud certificate"],
      answer: "Ivey Business leadership certificate",
    },
    {
      prompt: "Which area is listed in Arnav's current CIBC role?",
      options: ["Global Technology, Data and AI", "Retail Banking", "Capital Markets Sales", "Wealth Advisory"],
      answer: "Global Technology, Data and AI",
    },
    {
      prompt: "What is Arnav currently exploring?",
      options: ["AI and engineering systems", "Film production", "Real estate law", "Digital illustration"],
      answer: "AI and engineering systems",
    },
    {
      prompt: "Which project is NBA-focused?",
      options: ["ClutchCast AI", "Delation", "SHAD", "FBL Canada"],
      answer: "ClutchCast AI",
    },
    {
      prompt: "What kind of platform is ClutchCast AI?",
      options: ["NBA win-probability platform", "Music discovery app", "Resume parser", "Transit scheduler"],
      answer: "NBA win-probability platform",
    },
    {
      prompt: "What kind of data does ClutchCast AI use?",
      options: ["Play-by-play data", "Weather radar", "Stock prices", "Course reviews"],
      answer: "Play-by-play data",
    },
    {
      prompt: "Which dashboard tool is listed for ClutchCast AI?",
      options: ["Streamlit", "Tableau", "Power BI", "Looker"],
      answer: "Streamlit",
    },
    {
      prompt: "Which hackathon is Delation connected to?",
      options: ["NVIDIA Spark Hackathon", "Hack the North", "DeltaHacks", "Ignite"],
      answer: "NVIDIA Spark Hackathon",
    },
    {
      prompt: "Which city is Delation built around?",
      options: ["Toronto", "Montreal", "Vancouver", "Chicago"],
      answer: "Toronto",
    },
    {
      prompt: "What kind of intelligence concept is Delation?",
      options: ["Urban risk intelligence", "Fantasy sports ranking", "Personal finance planner", "Class scheduler"],
      answer: "Urban risk intelligence",
    },
    {
      prompt: "Which API framework is listed in Delation's stack?",
      options: ["FastAPI", "Express", "Rails", "Spring Boot"],
      answer: "FastAPI",
    },
    {
      prompt: "Which speech model/tool is listed in Delation's stack?",
      options: ["Faster-Whisper", "WhisperText", "DeepSpeechJS", "AudioCraft"],
      answer: "Faster-Whisper",
    },
    {
      prompt: "What was Arnav's role focus on Delation?",
      options: ["FastAPI API gateway", "Logo design", "Finance modeling", "Legal research"],
      answer: "FastAPI API gateway",
    },
    {
      prompt: "Which city organization did Arnav work for as a swim instructor?",
      options: ["City of Brampton", "City of Toronto", "City of Mississauga", "City of London"],
      answer: "City of Brampton",
    },
    {
      prompt: "About how many students did Arnav teach per swim session cycle?",
      options: ["80+", "15", "25", "200+"],
      answer: "80+",
    },
    {
      prompt: "Which organization did Arnav support as a training coordinator?",
      options: ["FBL Canada", "DECA Ontario", "SHAD Canada", "Western Engineering"],
      answer: "FBL Canada",
    },
    {
      prompt: "How many members did Arnav help prepare at FBL Canada?",
      options: ["60+", "10", "25", "150+"],
      answer: "60+",
    },
    {
      prompt: "Which program was Arnav a fellow in?",
      options: ["SHAD", "YC Startup School", "FIRST Robotics", "Junior Achievement"],
      answer: "SHAD",
    },
    {
      prompt: "What focus is listed for SHAD?",
      options: ["STEAM and entrepreneurship", "Accounting and tax", "Marine biology", "Film editing"],
      answer: "STEAM and entrepreneurship",
    },
    {
      prompt: "What is the best way to reach Arnav?",
      options: ["Email", "Fax", "Discord only", "Mailing address"],
      answer: "Email",
    },
    {
      prompt: "What opportunities is Arnav open to?",
      options: ["Software, AI, and engineering internships/co-ops", "Only full-time law roles", "Only finance analyst roles", "Only design contracts"],
      answer: "Software, AI, and engineering internships/co-ops",
    },
  ];
  let activeQuestion = questions[0];

  function shuffleArray(items) {
    return [...items].sort(() => Math.random() - 0.5);
  }

  function createCubeState(element) {
    const state = {
      element,
      cubies: [],
      triggerSvg: null,
      solvedOrientation: null,
    };

    element.innerHTML = "";
    element.style.setProperty("--turn-duration", `${turnDuration}ms`);

    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          const cubie = document.createElement("span");
          cubie.className = "rubiks-cubie";
          cubie.setAttribute("aria-hidden", "true");

          const cubieState = {
            element: cubie,
            position: { x, y, z },
            stickers: {},
          };

          cubeSides.forEach((side) => {
            const face = document.createElement("span");
            const sticker = document.createElement("span");
            face.className = `cubie-face cubie-face-${side}`;
            face.dataset.side = side;
            sticker.className = "cubie-sticker";
            face.append(sticker);
            cubie.append(face);
          });

          state.cubies.push(cubieState);
          element.append(cubie);
        }
      }
    }

    if (element.closest(".cube-trigger")) {
      state.triggerSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      state.triggerSvg.classList.add("rubiks-trigger-svg");
      state.triggerSvg.setAttribute("viewBox", "0 0 100 88");
      state.triggerSvg.setAttribute("aria-hidden", "true");
      state.triggerSvg.setAttribute("focusable", "false");
      element.append(state.triggerSvg);
    }

    return state;
  }

  function buildOrientation() {
    const orientation = solvedOrientations[Math.floor(Math.random() * solvedOrientations.length)];

    return {
      ...orientation,
      bottom: oppositeColors[orientation.top],
      back: oppositeColors[orientation.front],
    };
  }

  function getCubeSpacing(cube) {
    const styles = window.getComputedStyle(cube.element);
    return Number.parseFloat(styles.getPropertyValue("--cubie-spacing")) || 16;
  }

  function renderCubiePosition(cube, cubie, spacing = getCubeSpacing(cube)) {
    // Model space is right-handed with +y = top, but CSS y grows downward,
    // so positions render through a y-mirror (model +y -> CSS -y). The
    // mirror keeps the model's top layer up-screen, where the stickered
    // cubie-face-top faces point (styles.css); without it the cube renders
    // upside down and the visually-top faces are the unstickered inner
    // faces (a black top). The mirror flips the apparent spin of x/z
    // rotations, which turnTransform compensates for.
    cubie.element.style.setProperty("--tx", `${cubie.position.x * spacing}px`);
    cubie.element.style.setProperty("--ty", `${cubie.position.y * -spacing}px`);
    cubie.element.style.setProperty("--tz", `${cubie.position.z * spacing}px`);
  }

  function renderCubieStickers(cubie) {
    cubie.element.querySelectorAll(".cubie-face").forEach((face) => {
      const sticker = face.querySelector(".cubie-sticker");
      const color = cubie.stickers[face.dataset.side];
      sticker.style.setProperty("--sticker-color", color || "transparent");
      sticker.style.setProperty("--sticker-opacity", color ? "1" : "0");
    });
  }

  function renderCube(cube) {
    const spacing = getCubeSpacing(cube);

    cube.cubies.forEach((cubie) => {
      renderCubiePosition(cube, cubie, spacing);
      renderCubieStickers(cubie);
    });

    renderTriggerCube(cube);
  }

  function findCubie(cube, position) {
    return cube.cubies.find(
      (cubie) =>
        cubie.position.x === position.x &&
        cubie.position.y === position.y &&
        cubie.position.z === position.z,
    );
  }

  function getFaceColor(cube, side, position) {
    return findCubie(cube, position)?.stickers[side] || "#0b1011";
  }

  function mixPoint(start, end, amount) {
    return {
      x: start.x + (end.x - start.x) * amount,
      y: start.y + (end.y - start.y) * amount,
    };
  }

  function quadPoint(quad, u, v) {
    const top = mixPoint(quad[0], quad[1], u);
    const bottom = mixPoint(quad[3], quad[2], u);
    return mixPoint(top, bottom, v);
  }

  function drawTriggerPolygon(svg, points, fill, className = "rubiks-trigger-tile") {
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.classList.add(className);
    polygon.setAttribute("fill", fill);
    polygon.setAttribute("points", points.map((point) => `${point.x},${point.y}`).join(" "));
    svg.append(polygon);
  }

  function drawTriggerFace(svg, cube, face) {
    drawTriggerPolygon(svg, face.quad, "#050a0b", "rubiks-trigger-face");

    const gap = 0.02;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        const u0 = column / 3 + gap;
        const u1 = (column + 1) / 3 - gap;
        const v0 = row / 3 + gap;
        const v1 = (row + 1) / 3 - gap;
        const points = [
          quadPoint(face.quad, u0, v0),
          quadPoint(face.quad, u1, v0),
          quadPoint(face.quad, u1, v1),
          quadPoint(face.quad, u0, v1),
        ];

        drawTriggerPolygon(svg, points, face.colorAt(cube, row, column));
      }
    }
  }

  function renderTriggerCube(cube) {
    if (!cube.triggerSvg) return;

    const svg = cube.triggerSvg;
    svg.replaceChildren();

    [
      {
        quad: [
          { x: 18, y: 21 },
          { x: 50, y: 9 },
          { x: 82, y: 21 },
          { x: 50, y: 34 },
        ],
        colorAt: (currentCube, row, column) =>
          getFaceColor(currentCube, "top", { x: column - 1, y: 1, z: 1 - row }),
      },
      {
        quad: [
          { x: 50, y: 34 },
          { x: 82, y: 21 },
          { x: 82, y: 59 },
          { x: 50, y: 73 },
        ],
        colorAt: (currentCube, row, column) =>
          getFaceColor(currentCube, "right", { x: 1, y: 1 - row, z: 1 - column }),
      },
      {
        quad: [
          { x: 18, y: 21 },
          { x: 50, y: 34 },
          { x: 50, y: 73 },
          { x: 18, y: 59 },
        ],
        colorAt: (currentCube, row, column) =>
          getFaceColor(currentCube, "front", { x: column - 1, y: 1 - row, z: 1 }),
      },
    ].forEach((face) => drawTriggerFace(svg, cube, face));
  }

  function queueCubeRender() {
    if (pendingCubeRender) {
      window.cancelAnimationFrame(pendingCubeRender);
    }

    if (delayedCubeRender) {
      window.clearTimeout(delayedCubeRender);
      delayedCubeRender = 0;
    }

    pendingCubeRender = window.requestAnimationFrame(() => {
      pendingCubeRender = 0;

      if (isAnimating) {
        delayedCubeRender = window.setTimeout(() => {
          delayedCubeRender = 0;
          queueCubeRender();
        }, turnDuration + turnPause);
        return;
      }

      cubes.forEach(renderCube);
    });
  }

  function getTriggerCube() {
    return cubes.find((cube) => cube.element.closest(".cube-trigger"));
  }

  function getModalCube() {
    return cubes.find((cube) => !cube.element.closest(".cube-trigger"));
  }

  function copyCubeState(targetCube, sourceCube) {
    if (!targetCube || !sourceCube) return;

    targetCube.solvedOrientation = sourceCube.solvedOrientation
      ? { ...sourceCube.solvedOrientation }
      : null;

    targetCube.cubies.forEach((targetCubie, index) => {
      const sourceCubie = sourceCube.cubies[index];
      targetCubie.element.classList.remove("is-turning");
      targetCubie.element.style.removeProperty("--turn-rotate");
      targetCubie.position = { ...sourceCubie.position };
      targetCubie.stickers = { ...sourceCubie.stickers };
    });

    renderCube(targetCube);
  }

  function syncModalCubeToTrigger() {
    copyCubeState(getModalCube(), getTriggerCube());
  }

  function setAllCubesSolved(randomize = false) {
    const orientation = randomize ? buildOrientation() : cubes[0]?.solvedOrientation || buildOrientation();

    cubes.forEach((cube) => {
      cube.solvedOrientation = { ...orientation };
      setCubeSolved(cube);
    });
  }

  function setCubeSolved(cube, randomize = false) {
    if (randomize || !cube.solvedOrientation) {
      cube.solvedOrientation = buildOrientation();
    }

    cube.cubies.forEach((cubie) => {
      const { x, y, z } = cubie.position;
      cubie.element.classList.remove("is-turning");
      cubie.element.style.removeProperty("--turn-rotate");
      cubie.stickers = {};

      if (x === 1) cubie.stickers.right = cube.solvedOrientation.right;
      if (x === -1) cubie.stickers.left = cube.solvedOrientation.left;
      if (y === 1) cubie.stickers.top = cube.solvedOrientation.top;
      if (y === -1) cubie.stickers.bottom = cube.solvedOrientation.bottom;
      if (z === 1) cubie.stickers.front = cube.solvedOrientation.front;
      if (z === -1) cubie.stickers.back = cube.solvedOrientation.back;
    });

    renderCube(cube);
  }

  function rotateVector(vector, axis, direction) {
    const { x, y, z } = vector;

    if (axis === "x") {
      return direction > 0 ? { x, y: -z, z: y } : { x, y: z, z: -y };
    }

    if (axis === "y") {
      return direction > 0 ? { x: z, y, z: -x } : { x: -z, y, z: x };
    }

    return direction > 0 ? { x: -y, y: x, z } : { x: y, y: -x, z };
  }

  function rotateStickers(stickers, axis, direction) {
    return Object.entries(stickers).reduce((nextStickers, [side, color]) => {
      const nextVector = rotateVector(sideVectors[side], axis, direction);
      const nextSide = sideByVector.get(`${nextVector.x},${nextVector.y},${nextVector.z}`);
      nextStickers[nextSide] = color;
      return nextStickers;
    }, {});
  }

  function turnTransform(move) {
    // Because positions render through the y-mirror (see
    // renderCubiePosition), CSS rotateY spins the same way as the model's
    // y rotation, while CSS rotateX/rotateZ spin the opposite way (both
    // rotate through the mirrored y axis). Flip the sign for x/z so the
    // animated spin lands exactly on the state that rotateVector and
    // rotateStickers compute -- otherwise stickers jump to different faces
    // the moment the turn ends.
    const sign = move.axis === "y" ? 1 : -1;
    const degrees = move.direction * 90 * sign;
    const axisName = move.axis.toUpperCase();
    return `rotate${axisName}(${degrees}deg)`;
  }

  function applyMove(cube, move) {
    cube.cubies.forEach((cubie) => {
      if (cubie.position[move.axis] !== move.layer) return;

      cubie.position = rotateVector(cubie.position, move.axis, move.direction);
      cubie.stickers = rotateStickers(cubie.stickers, move.axis, move.direction);
      cubie.element.classList.remove("is-turning");
      cubie.element.style.removeProperty("--turn-rotate");
      renderCubiePosition(cube, cubie);
      renderCubieStickers(cubie);
    });
  }

  function animateMove(cubeList, move, epoch) {
    const layerCubies = cubeList.flatMap((cube) =>
      cube.cubies
        .filter((cubie) => cubie.position[move.axis] === move.layer)
        .map((cubie) => ({ cube, cubie })),
    );

    layerCubies.forEach(({ cubie }) => {
      cubie.element.classList.remove("is-turning");
      cubie.element.style.setProperty("--turn-rotate", turnTransform(move));
      void cubie.element.offsetWidth;
      cubie.element.classList.add("is-turning");
    });

    return new Promise((resolve) => {
      window.setTimeout(() => {
        // If the popover opened/closed while this turn was animating, the
        // cube state was already reset for a new round: applying the move
        // now would corrupt it.
        if (epoch === twistEpoch) {
          cubeList.forEach((cube) => applyMove(cube, move));
        }
        resolve();
      }, turnDuration);
    });
  }

  function createMoveSequence(count = 6) {
    const moves = [];

    while (moves.length < count) {
      const move = movePool[Math.floor(Math.random() * movePool.length)];
      const previous = moves[moves.length - 1];

      if (previous && previous.axis === move.axis && previous.layer === move.layer) {
        continue;
      }

      moves.push({ ...move });
    }

    return moves;
  }

  function invertMove(move) {
    return { ...move, direction: move.direction * -1 };
  }

  function getActiveCubes() {
    if (!rubiksWidget.classList.contains("is-open")) {
      return cubes;
    }

    return cubes.filter((cube) => !cube.element.closest(".cube-trigger"));
  }

  function setBusy(isBusy) {
    rubiksWidget.classList.toggle("is-solving", isBusy);
    loading?.classList.toggle("is-active", isBusy);
    panel.querySelectorAll("button").forEach((button) => {
      button.disabled = isBusy;
    });
  }

  function shakePanel() {
    popover.classList.remove("is-feedback");
    void popover.offsetWidth;
    popover.classList.add("is-feedback");
    window.setTimeout(() => popover.classList.remove("is-feedback"), 390);
  }

  const feedbackIcons = {
    correct:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polyline points="5 12.5 10 17.5 19 6.5" /></svg>',
    wrong:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg>',
  };

  function showFeedback(isCorrect) {
    const resultIcon = rubiksWidget.querySelector("[data-rubiks-loading-result]");
    resultIcon.innerHTML = isCorrect ? feedbackIcons.correct : feedbackIcons.wrong;
    resultIcon.classList.remove("is-correct", "is-wrong", "is-visible");
    resultIcon.classList.add(isCorrect ? "is-correct" : "is-wrong");
    void resultIcon.offsetWidth;
    resultIcon.classList.add("is-visible");
    loading?.classList.add("is-result");
    shakePanel();
    window.setTimeout(() => {
      loading?.classList.remove("is-result");
      resultIcon.classList.remove("is-visible");
    }, 520);
  }

  async function twistCube(finalState, onComplete = () => {}) {
    if (isAnimating) return;

    isAnimating = true;
    setBusy(true);
    const epoch = twistEpoch;
    const activeCubes = getActiveCubes();
    const moves =
      finalState === "solved"
        ? scrambleMoves.slice().reverse().map(invertMove)
        : createMoveSequence(6);

    for (const move of moves) {
      await animateMove(activeCubes, move, epoch);
      if (epoch !== twistEpoch) {
        // Round was abandoned (popover opened/closed) mid-animation; the
        // cube was reset elsewhere, so stop without touching state or
        // calling onComplete.
        isAnimating = false;
        setBusy(false);
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, turnPause));
    }

    if (finalState === "solved") {
      // Replaying the full scramble history inverted has physically walked
      // the cube back to its solved arrangement, so re-render the SAME
      // orientation (never randomize here) -- this is drift-proofing, not a
      // visible change. Randomizing recolored the whole cube the instant
      // the solve animation finished.
      setAllCubesSolved(false);
      scrambleMoves = [];
    } else {
      // Wrong answers scramble again without solving in between, so
      // accumulate: a later solve must unwind every move made since the
      // last solved state, not just the most recent six.
      scrambleMoves = scrambleMoves.concat(moves);
    }

    isAnimating = false;
    setBusy(false);
    onComplete();
  }

  function buildQuestionQueue() {
    const recentQuestions = new Set(questionHistory.slice(-5));
    const freshQuestions = shuffleArray(questions.filter((question) => !recentQuestions.has(question)));
    const delayedQuestions = shuffleArray(questions.filter((question) => recentQuestions.has(question)));

    questionQueue = [...freshQuestions, ...delayedQuestions];
  }

  function chooseQuestion() {
    if (questionQueue.length === 0) {
      buildQuestionQueue();
    }

    activeQuestion = questionQueue.shift();
    questionHistory.push(activeQuestion);
  }

  function startRound(shouldChooseQuestion) {
    if (shouldChooseQuestion) {
      chooseQuestion();
    }

    twistCube("shuffled", renderQuestion);
  }

  function renderIntro() {
    panel.innerHTML = `
      <p class="rubiks-intro">Fun Fact: Arnav can solve a Rubik's Cube! Think you can solve this one?</p>
      <button class="rubiks-action" type="button" data-rubiks-begin>Begin</button>
    `;
    panel.querySelector("[data-rubiks-begin]").addEventListener("click", () => {
      startRound(true);
    });
  }

  function renderQuestion() {
    panel.innerHTML = `
      <p class="rubiks-question">${activeQuestion.prompt}</p>
      <div class="rubiks-options" data-rubiks-options></div>
    `;

    const options = panel.querySelector("[data-rubiks-options]");
    shuffleArray(activeQuestion.options).forEach((option) => {
      const button = document.createElement("button");
      button.className = "rubiks-option";
      button.type = "button";
      button.textContent = option;
      button.addEventListener("click", () => handleAnswer(option));
      options.append(button);
    });
  }

  function renderResult(isCorrect) {
    panel.innerHTML = isCorrect
      ? `
        <p class="rubiks-status">Correct. Cube solved.</p>
        <button class="rubiks-action" type="button" data-rubiks-play-again>Play again</button>
      `
      : `
        <p class="rubiks-status">Wrong. Want to try again?</p>
        <button class="rubiks-action" type="button" data-rubiks-retry>Try again</button>
      `;

    const playAgain = panel.querySelector("[data-rubiks-play-again]");
    const retry = panel.querySelector("[data-rubiks-retry]");

    if (playAgain) {
      playAgain.addEventListener("click", () => {
        startRound(true);
      });
    }

    if (retry) {
      retry.addEventListener("click", () => {
        startRound(false);
      });
    }

    if (!playAgain && !retry) {
      if (isCorrect) {
        renderIntro();
        return;
      }

      renderQuestion();
    }
  }

  function handleAnswer(option) {
    if (isAnimating) return;

    const isCorrect = option === activeQuestion.answer;
    twistCube(isCorrect ? "solved" : "shuffled", () => {
      showFeedback(isCorrect);
      window.setTimeout(() => renderResult(isCorrect), 520);
    });
  }

  function setQuizOpen(isOpen) {
    if (popover.hidden === !isOpen) return;

    // Invalidate any twist loop still running from the previous open/closed
    // state; it aborts at its next checkpoint instead of mutating the cube
    // we are about to reset.
    twistEpoch += 1;

    popover.hidden = !isOpen;
    rubiksWidget.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("rubiks-active", isOpen);
    toggleButton.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      syncModalCubeToTrigger();
      // The modal cube was just reset to the trigger's solved state, so the
      // scramble history and any half-finished question no longer describe
      // it. Restart the round from the intro so the puzzle is always
      // solvable: a stale question over an already-solved cube left nothing
      // to solve.
      scrambleMoves = [];
      renderIntro();
    }

    if (!isOpen) {
      popover.classList.remove("is-feedback");
      loading?.classList.remove("is-active", "is-result");
      rubiksWidget
        .querySelector("[data-rubiks-loading-result]")
        ?.classList.remove("is-visible");
    }
  }

  toggleButton.addEventListener("click", () => {
    const isOpen = !popover.hidden;
    setQuizOpen(!isOpen);
  });

  closeButton.addEventListener("click", () => {
    setQuizOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (popover.hidden || rubiksWidget.contains(event.target)) return;
    setQuizOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setQuizOpen(false);
    }
  });

  window.addEventListener(
    "resize",
    queueCubeRender,
    { passive: true },
  );
  window.addEventListener(
    "orientationchange",
    () => {
      window.setTimeout(queueCubeRender, 220);
    },
    { passive: true },
  );

  setAllCubesSolved(true);
  renderIntro();
}
