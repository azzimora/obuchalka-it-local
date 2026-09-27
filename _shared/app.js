/* ═══════════════════════════════════════════
   обучалка local adaptation · общий скрипт
   прогресс · сохранение · темы · тосты
   статистика · активность · бэкап · hero
   кнопка назад · плавающий помодоро
   ═══════════════════════════════════════════ */

const STORAGE_KEY = "local-adaptation-v1";
const THEME_KEY = "local-adaptation-theme";
const ACTIVITY_KEY = "local-adaptation-activity";
const BACKUP_KEY = "local-adaptation-lastbackup";
const POMO_STATE_KEY = "local-adaptation-pomo-state";
const POMO_CONFIG_KEY = "local-adaptation-pomo-config";

/* ── Загрузка / сохранение ── */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lessons: {}, notes: {} };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    toast("⚠ не удалось сохранить");
  }
}

let state = loadState();

/* ── Доступ к данным урока ── */
function getLesson(id) {
  if (!state.lessons[id]) {
    state.lessons[id] = {
      done: false,
      note: "",
      practice: "",
      result: "",
      link: "",
      modified: null
    };
  }
  return state.lessons[id];
}

/* ── Утилиты ── */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasContent(d) {
  return !!(d && (d.note || d.practice || d.result || d.link));
}

function getStatus(d) {
  if (d.done) return "done";
  if (hasContent(d)) return "progress";
  return "";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/* ── Активность ── */
function loadActivity() {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveActivity(a) {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(a));
  } catch {}
}

let activity = loadActivity();

function markActivity(field, amount) {
  const today = todayKey();
  if (!activity[today]) {
    activity[today] = { lessons: 0, pomos: 0, minutes: 0, edits: 0 };
  }
  if (amount !== undefined) {
    activity[today][field] = (activity[today][field] || 0) + amount;
  } else {
    activity[today][field] = (activity[today][field] || 0) + 1;
  }
  saveActivity(activity);
}

/* ── Бэкап ── */
function getLastBackup() {
  try { return localStorage.getItem(BACKUP_KEY) || null; } catch { return null; }
}

function setLastBackup() {
  try { localStorage.setItem(BACKUP_KEY, new Date().toISOString()); } catch {}
}

function daysSinceBackup() {
  const last = getLastBackup();
  if (!last) return Infinity;
  const diff = Date.now() - new Date(last).getTime();
  return Math.floor(diff / 86400000);
}

/* ═══════════════════════════════════════════
   ТЕМЫ
   ═══════════════════════════════════════════ */

const THEME_COLORS = ["pink", "blue", "purple", "red", "yellow", "green", "aero", "dream"];
const BUBBLES_KEY = "local-adaptation-bubbles";

function bubblesEnabled() {
  try {
    const v = localStorage.getItem(BUBBLES_KEY);
    return v === null ? true : v === "1"; // по умолчанию включено
  } catch { return true; }
}

function setBubblesEnabled(on) {
  try { localStorage.setItem(BUBBLES_KEY, on ? "1" : "0"); } catch {}
  const theme = getTheme();

  // aero
  const bubbleLayer = document.querySelector(".aero-bubbles");
  if (on && theme.startsWith("aero")) {
    if (!bubbleLayer) initAeroBubbles();
  } else if (bubbleLayer) {
    bubbleLayer.remove();
  }

  // dream
  if (on && theme.startsWith("dream")) {
    if (!document.querySelector(".dream-layer")) initDreamLayer();
  } else {
    removeDreamLayer();
  }
}

function getTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && saved.includes("-")) return saved;
  } catch {}
  const old = localStorage.getItem(THEME_KEY);
  if (old === "light") return "pink-light";
  return "pink-dark";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch {}

  // aero-пузыри
  const wantBubbles = theme.startsWith("aero") && bubblesEnabled();
  const bubbleLayer = document.querySelector(".aero-bubbles");
  if (wantBubbles) {
    if (!bubbleLayer) initAeroBubbles();
  } else if (bubbleLayer) {
    bubbleLayer.remove();
  }

  // dream-слой
  const wantDream = theme.startsWith("dream") && bubblesEnabled();
  if (wantDream) {
    if (!document.querySelector(".dream-layer")) initDreamLayer();
  } else {
    removeDreamLayer();
  }
  applyHeroImage();
  invalidateThemeColorCache(); // ← сброс кэша цветов для canvas-игр
}

function parseTheme(theme) {
  const [color, mode] = theme.split("-");
  return { color, mode };
}

function initTheme() {
  setTheme(getTheme());
}

function toggleColor(color) {
  const current = parseTheme(getTheme());
  setTheme(`${color}-${current.mode}`);
}

function toggleMode(mode) {
  const current = parseTheme(getTheme());
  setTheme(`${current.color}-${mode}`);
}

function createThemePanel() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  if (!btn.parentElement.classList.contains("theme-wrap")) {
    const wrap = document.createElement("div");
    wrap.className = "theme-wrap";
    wrap.style.position = "relative";
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);
  }

  const wrap = btn.parentElement;

  if (wrap.querySelector(".theme-panel")) return;

  const panel = document.createElement("div");
  panel.className = "theme-panel";
  panel.innerHTML = `
    <div class="theme-panel-title">цвет</div>
    <div class="theme-colors">
      ${THEME_COLORS.map(c => `<button class="theme-color" data-color="${c}" title="${c}"></button>`).join("")}
    </div>
    <div class="theme-panel-title">режим</div>
    <div class="theme-modes">
      <button class="theme-mode" data-mode="dark">тёмный</button>
      <button class="theme-mode" data-mode="light">светлый</button>
    </div>
    <div class="theme-panel-title" style="margin-top:14px; padding-top:12px; border-top:1px dashed var(--line);">эффекты</div>
    <button class="theme-toggle-bubbles" id="bubblesToggle" type="button">
      <span class="bubbles-dot"></span>
      <span class="bubbles-label">эффекты фона</span>
      <span class="bubbles-state">вкл</span>
    </button>
  `;
  wrap.appendChild(panel);

  const bubblesBtn = panel.querySelector("#bubblesToggle");
  function refreshBubbles() {
    const on = bubblesEnabled();
    bubblesBtn.classList.toggle("on", on);
    bubblesBtn.querySelector(".bubbles-state").textContent = on ? "вкл" : "выкл";
  }
  bubblesBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setBubblesEnabled(!bubblesEnabled());
    refreshBubbles();
  });
  refreshBubbles();

  function refreshActive() {
    const { color, mode } = parseTheme(getTheme());
    panel.querySelectorAll(".theme-color").forEach(el => {
      el.classList.toggle("active", el.dataset.color === color);
    });
    panel.querySelectorAll(".theme-mode").forEach(el => {
      el.classList.toggle("active", el.dataset.mode === mode);
    });
  }

  panel.querySelectorAll(".theme-color").forEach(el => {
    el.addEventListener("click", () => {
      toggleColor(el.dataset.color);
      refreshActive();
    });
  });

  panel.querySelectorAll(".theme-mode").forEach(el => {
    el.addEventListener("click", () => {
      toggleMode(el.dataset.mode);
      refreshActive();
    });
  });

  // ── FIX: один обработчик на кнопку, без вложенного addEventListener ──
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    refreshActive();
    refreshBubbles();
    panel.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) panel.classList.remove("open");
  });
}

/* ═══════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════ */

function initHero() {
  const path = window.location.pathname;
  const file = path.split("/").pop() || "index.html";

  const isHeroPage =
    file === "index.html" ||
    file === "profile.html" ||
    file === "";

  if (isHeroPage) {
    document.body.classList.add("page-hero");
  }
}

/* ═══════════════════════════════════════════
   КНОПКА «НАЗАД»
   ═══════════════════════════════════════════ */

function initBackButton() {
  const path = window.location.pathname;
  const file = path.split("/").pop() || "index.html";

  const isRootIndex = file === "index.html" && !path.includes("/web/") && !path.includes("/ai/") && !path.includes("/python/") && !path.includes("/_shared/");
  if (isRootIndex) return;

  let href = null;

  if (path.includes("/web/") || path.includes("/ai/") || path.includes("/python/")) {
    const isIndex = file === "index.html";
    if (isIndex) {
      href = "../index.html";
    } else {
      href = "index.html";
    }
  } else if (path.includes("/_shared/")) {
    href = "../index.html";
  }

  if (!href) return;

  const btn = document.createElement("a");
  btn.className = "back-btn";
  btn.href = href;
  btn.title = "назад";
  btn.setAttribute("aria-label", "назад");
  btn.innerHTML = "←";
  document.body.appendChild(btn);
}

/* ── Тост ── */
let toastTimer;
function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ── Streak ── */
function getStreak() {
  const dates = Object.keys(activity).sort().reverse();
  if (!dates.length) return 0;

  const today = todayKey();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let count = 0;
  let checkDate = dates[0] === today ? today : yesterday;

  for (let i = 0; i < 365; i++) {
    if (activity[checkDate]) {
      count++;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  return count;
}

/* ── Прогресс ── */
function updateProgressOnToc(total, done) {
  const fill = document.querySelector(".progress-fill");
  const text = document.querySelector(".progress-text");
  if (fill) fill.style.width = Math.round((done / total) * 100) + "%";
  if (text) {
    text.innerHTML = `<strong>${done} / ${total}</strong> пройдено`;
  }
}

/* ── Горячие клавиши ── */
function initHotkeys() {
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveState();
      toast("◦ сохранено");
    }
    if (e.key === "Escape") {
      const panel = document.querySelector(".theme-panel.open");
      if (panel) panel.classList.remove("open");
    }
  });
}

/* ═══════════════════════════════════════════
   ОБЩЕЕ СОСТОЯНИЕ ПОМОДОРО
   ═══════════════════════════════════════════ */

function loadPomoConfig() {
  try {
    const raw = localStorage.getItem(POMO_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { work: 25, break: 5 };
}

function savePomoConfig(cfg) {
  try { localStorage.setItem(POMO_CONFIG_KEY, JSON.stringify(cfg)); } catch {}
}

function loadPomoState() {
  try {
    const raw = localStorage.getItem(POMO_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function savePomoState(s) {
  try {
    if (s) localStorage.setItem(POMO_STATE_KEY, JSON.stringify(s));
    else localStorage.removeItem(POMO_STATE_KEY);
  } catch {}
}

/* Рассчитать текущее состояние таймера */
function calcPomoNow() {
  const state = loadPomoState();
  const cfg = loadPomoConfig();

  if (!state) {
    return {
      mode: "work",
      running: false,
      timeLeft: cfg.work * 60,
      total: cfg.work * 60,
      config: cfg
    };
  }

  const total = (state.mode === "work" ? cfg.work : cfg.break) * 60;

  if (state.running && state.startedAt) {
    const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    const left = Math.max(0, state.timeLeftAtStart - elapsed);

    if (left <= 0) {
      // время вышло, переключаем режим
      const newMode = state.mode === "work" ? "break" : "work";
      const newTotal = (newMode === "work" ? cfg.work : cfg.break) * 60;

      // записать помидор — ОДНИМ вызовом, а не двумя
      if (state.mode === "work") {
        bumpActivityToday(cfg.work);
      }

      const newState = {
        mode: newMode,
        running: true,
        timeLeftAtStart: newTotal,
        startedAt: Date.now()
      };
      savePomoState(newState);

      return {
        mode: newMode,
        running: true,
        timeLeft: newTotal,
        total: newTotal,
        config: cfg,
        justFinished: true,
        finishedMode: state.mode
      };
    }

    return {
      mode: state.mode,
      running: true,
      timeLeft: left,
      total,
      config: cfg
    };
  }

  return {
    mode: state.mode,
    running: false,
    timeLeft: state.timeLeftAtStart,
    total,
    config: cfg
  };
}

/* ── FIX: один вызов вместо двух markActivity подряд ── */
function bumpActivityToday(minutes) {
  const today = todayKey();
  if (!activity[today]) {
    activity[today] = { lessons: 0, pomos: 0, minutes: 0, edits: 0 };
  }
  activity[today].pomos = (activity[today].pomos || 0) + 1;
  activity[today].minutes = (activity[today].minutes || 0) + minutes;
  saveActivity(activity);
}

function startPomo() {
  const now = calcPomoNow();
  savePomoState({
    mode: now.mode,
    running: true,
    timeLeftAtStart: now.timeLeft,
    startedAt: Date.now()
  });
}

function pausePomo() {
  const now = calcPomoNow();
  savePomoState({
    mode: now.mode,
    running: false,
    timeLeftAtStart: now.timeLeft,
    startedAt: null
  });
}

function resetPomo() {
  savePomoState(null);
}

function formatPomoTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

/* ═══════════════════════════════════════════
   ПЛАВАЮЩИЙ ВИДЖЕТ ПОМОДОРО
   ═══════════════════════════════════════════ */

function initPomodoroWidget() {
  const path = window.location.pathname;
  const file = path.split("/").pop() || "index.html";

  // не показываем в кабинете — там большой таймер
  if (file === "profile.html") return;

  // создаём обёртку
  const wrap = document.createElement("div");
  wrap.className = "pomo-widget";
  wrap.innerHTML = `
    <button class="pomo-widget-btn" id="pomoWidgetBtn" title="помодоро">
        <svg class="pomo-widget-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="14" r="7"/>
        <path d="M12 7 L12 4"/>
        <path d="M12 4 C 10 2, 8 3, 8 4"/>
        <path d="M12 4 C 14 2, 16 3, 16 4"/>
      </svg>
      <span class="pomo-widget-time" id="pomoWidgetTime"></span>
    </button>
    <div class="pomo-widget-panel" id="pomoWidgetPanel">
      <div class="pomo-widget-header">
        <span id="pomoWidgetMode">работа</span>
        <button class="pomo-widget-close" id="pomoWidgetClose" title="закрыть">×</button>
      </div>
      <div class="pomo-widget-big-time" id="pomoWidgetBigTime">25:00</div>
      <div class="pomo-widget-controls">
        <button class="pomo-widget-ctrl primary" id="pomoWidgetStart">старт</button>
        <button class="pomo-widget-ctrl" id="pomoWidgetPause">пауза</button>
        <button class="pomo-widget-ctrl" id="pomoWidgetReset">сброс</button>
      </div>
      <a class="pomo-widget-link" href="${
        path.includes("/web/") || path.includes("/ai/") || path.includes("/python/")
          ? "../_shared/profile.html"
          : path.includes("/_shared/")
          ? "profile.html"
          : "_shared/profile.html"
      }">настроить в кабинете →</a>
    </div>
  `;
  document.body.appendChild(wrap);

  const btn = document.getElementById("pomoWidgetBtn");
  const panel = document.getElementById("pomoWidgetPanel");
  const timeEl = document.getElementById("pomoWidgetTime");
  const bigTimeEl = document.getElementById("pomoWidgetBigTime");
  const modeEl = document.getElementById("pomoWidgetMode");

  // ── FIX: один интервал вместо двух ──
  function render() {
    const s = calcPomoNow();

    // если только что закончился — сигнал
    if (s.justFinished) {
      playBeep();
      toast(s.finishedMode === "work" ? "◦ работа окончена — перерыв!" : "◦ перерыв окончен — к работе!");
    }

    timeEl.textContent = s.running ? formatPomoTime(s.timeLeft) : "";
    bigTimeEl.textContent = formatPomoTime(s.timeLeft);
    modeEl.textContent = s.mode === "work" ? "работа" : "перерыв";

    wrap.classList.toggle("running", s.running);
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("open");
    render();
  });

  document.getElementById("pomoWidgetClose").addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.remove("open");
  });

  document.getElementById("pomoWidgetStart").addEventListener("click", () => {
    startPomo();
    render();
    toast("◦ таймер запущен");
  });

  document.getElementById("pomoWidgetPause").addEventListener("click", () => {
    pausePomo();
    render();
    toast("◦ пауза");
  });

  document.getElementById("pomoWidgetReset").addEventListener("click", () => {
    if (confirm("сбросить таймер?")) {
      resetPomo();
      render();
      toast("◦ сброшено");
    }
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) panel.classList.remove("open");
  });

  // начальный рендер + один общий тик каждую секунду
  render();
  setInterval(render, 1000);
}

/* ── короткий звук ── */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = ctx.currentTime + i * 0.3;
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
      osc.start(start);
      osc.stop(start + 0.7);
    });
  } catch {}
}

/* ═══════════════════════════════════════════
   КЭШ ЦВЕТОВ ТЕМЫ ДЛЯ CANVAS-ИГР
   ═══════════════════════════════════════════ */

let _themeColorCache = null;

function getThemeColors() {
  if (_themeColorCache) return _themeColorCache;
  const styles = getComputedStyle(document.documentElement);
  _themeColorCache = {
    pink:   styles.getPropertyValue("--pink").trim()    || "#ff8ec7",
    purple: styles.getPropertyValue("--purple").trim()  || "#c77dff",
    bgSoft: styles.getPropertyValue("--bg-soft").trim() || "#1a0f1e",
    line:   styles.getPropertyValue("--line").trim()    || "rgba(255,142,199,0.15)",
  };
  return _themeColorCache;
}

function invalidateThemeColorCache() {
  _themeColorCache = null;
}

/* ═══════════════════════════════════════════
   AERO — пузыри на фоне
   ═══════════════════════════════════════════ */

function initAeroBubbles() {
  if (!bubblesEnabled()) return;
  const theme = getTheme();
  if (!theme.startsWith("aero")) return;

  // не плодим дубли
  if (document.querySelector(".aero-bubbles")) return;

  const layer = document.createElement("div");
  layer.className = "aero-bubbles";
  document.body.appendChild(layer);

  const COUNT = window.innerWidth < 700 ? 10 : 18;

  for (let i = 0; i < COUNT; i++) {
    const b = document.createElement("div");
    b.className = "aero-bubble";

    const size = 30 + Math.random() * 130;       // 30–160px
    const left = Math.random() * 100;             // позиция по горизонтали, %
    const duration = 14 + Math.random() * 22;     // 14–36s
    const delay = Math.random() * -30;            // отрицательная задержка — пузыри уже в пути
    const drift = (Math.random() * 60 - 30).toFixed(0); // снос вбок, px
    const opacity = (0.35 + Math.random() * 0.4).toFixed(2);

    b.style.width = size + "px";
    b.style.height = size + "px";
    b.style.left = left + "%";
    b.style.animationDuration = duration + "s";
    b.style.animationDelay = delay + "s";
    b.style.setProperty("--drift", drift + "px");
    b.style.setProperty("--bubble-opacity", opacity);

    // часть пузырей покачивается
    if (Math.random() > 0.5) {
      b.classList.add("sway");
      b.style.setProperty("animation-duration", duration + "s, " + (3 + Math.random() * 3) + "s");
    }

    layer.appendChild(b);
  }
}

/* ═══════════════════════════════════════════
   HERO-КАРТИНКА — своя или из темы
   ═══════════════════════════════════════════ */

const HERO_IMAGE_KEY = "local-adaptation-hero-image";

const THEME_HERO_URLS = {
  "aero-dark":  "../aero.jpg",
  "aero-light": "../aero.jpg",
  "dream-dark": "../dream.jpg",
  "dream-light":"../dream.jpg",
};

const DEFAULT_HERO_URL =
  "https://i.pinimg.com/736x/32/2e/b5/322eb508ae791efc1f0f4657773d19b9.jpg";

function loadCustomHero() {
  try { return localStorage.getItem(HERO_IMAGE_KEY) || ""; } catch { return ""; }
}

function saveCustomHero(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(HERO_IMAGE_KEY, dataUrl);
    else localStorage.removeItem(HERO_IMAGE_KEY);
  } catch {}
}

/* Применить hero к :root — это влияет на все страницы */
function applyHeroImage() {
  const custom = loadCustomHero();
  let url;

  if (custom) {
    url = `url('${custom}')`;
  } else {
    const theme = getTheme();
    if (theme.startsWith("aero")) {
      url = `url('${THEME_HERO_URLS["aero-dark"]}')`;
    } else if (theme.startsWith("dream")) {
      url = `url('${THEME_HERO_URLS["dream-dark"]}')`;
    } else {
      url = `url('${DEFAULT_HERO_URL}')`;
    }
  }

  document.documentElement.style.setProperty("--hero-image", url);
}

/* Проверка: доступна ли картинка темы (если файла нет — вернём false) */
function themeHeroAvailable() {
  return true; // не проверяем на лету, если файла нет — просто не отобразится
}

/* Всё для страницы кабинета */
function initHeroImageUI() {
  const preview   = document.getElementById("heroPreview");
  const uploadBtn = document.getElementById("heroUploadBtn");
  const resetBtn  = document.getElementById("heroResetBtn");
  const input     = document.getElementById("heroInput");
  const status    = document.getElementById("heroStatus");

  if (!preview || !uploadBtn || !resetBtn || !input || !status) return;

  function refresh() {
    const custom = loadCustomHero();
    const theme = getTheme();

    if (custom) {
      preview.style.backgroundImage = `url('${custom}')`;
      status.textContent = "используется своя картинка";
      status.classList.add("custom");
      resetBtn.disabled = false;
    } else {
      let url;
      if (theme.startsWith("aero"))       url = THEME_HERO_URLS["aero-dark"];
      else if (theme.startsWith("dream")) url = THEME_HERO_URLS["dream-dark"];
      else                                url = DEFAULT_HERO_URL;

      preview.style.backgroundImage = `url('${url}')`;
      status.textContent = "используется картинка темы";
      status.classList.remove("custom");
      resetBtn.disabled = true;
    }
  }

  uploadBtn.addEventListener("click", () => input.click());

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("◦ нужна картинка"); return; }

    compressImage(file, 1200, 0.82).then(dataUrl => {
      saveCustomHero(dataUrl);
      applyHeroImage();
      refresh();
      toast("◦ hero-картинка обновлена");
    }).catch(() => toast("◦ не получилось обработать файл"));
    e.target.value = "";
  });

  resetBtn.addEventListener("click", () => {
    saveCustomHero("");
    applyHeroImage();
    refresh();
    toast("◦ вернула картинку темы");
  });

  refresh();
}

/* ═══════════════════════════════════════════
   DREAMCORE — мухоморы, глаза, радуга, облака, надписи
   ═══════════════════════════════════════════ */

let _dreamEyesRAF = null; // ← FIX: храним id rAF-цикла

function initDreamLayer() {
  if (!bubblesEnabled()) return;
  if (document.querySelector(".dream-layer")) return;

  const layer = document.createElement("div");
  layer.className = "dream-layer";
  document.body.appendChild(layer);

  // ── радуга ──
  const rainbow = document.createElement("div");
  rainbow.className = "dream-rainbow";
  layer.appendChild(rainbow);

  // ── VHS-шум ──
  const noise = document.createElement("div");
  noise.className = "dream-noise";
  layer.appendChild(noise);

  const isMobile = window.innerWidth < 700;

  // ── мухоморы ──
  const mushroomCount = isMobile ? 3 : 5;
  for (let i = 0; i < mushroomCount; i++) {
    const m = document.createElement("div");
    m.className = "dream-mushroom";

    const size = 60 + Math.random() * 120;
    const left = Math.random() * 95;
    const duration = 18 + Math.random() * 26;
    const delay = Math.random() * -40;
    const drift = (Math.random() * 80 - 40).toFixed(0);
    const opacity = (0.35 + Math.random() * 0.45).toFixed(2);

    m.style.width = size + "px";
    m.style.height = size + "px";
    m.style.left = left + "%";
    m.style.animationDuration = duration + "s";
    m.style.animationDelay = delay + "s";
    m.style.setProperty("--drift", drift + "px");
    m.style.setProperty("--dream-op", opacity);

    if (Math.random() > 0.4) {
      m.classList.add("sway");
      m.style.setProperty(
        "animation-duration",
        duration + "s, " + (3 + Math.random() * 3) + "s"
      );
    }

    layer.appendChild(m);
  }

  // ── глаза (следят за курсором) ──
  const eyeCount = isMobile ? 2 : 5;
  const eyes = [];
  for (let i = 0; i < eyeCount; i++) {
    const e = document.createElement("div");
    e.className = "dream-eye";

    const size = 30 + Math.random() * 28;
    e.style.width = size + "px";
    e.style.height = size + "px";
    e.style.left = (8 + Math.random() * 84) + "%";
    e.style.top = (8 + Math.random() * 80) + "%";
    e.style.animationDelay = (Math.random() * 6) + "s";

    layer.appendChild(e);
    eyes.push(e);

    setTimeout(() => {
      // если слой уже удалили — не трогаем
      if (!document.querySelector(".dream-layer")) return;
      e.classList.add("visible");
    }, 800 + i * 500);
  }

  // зрачки следят за курсором
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // ── FIX: rAF-цикл с проверкой, что слой ещё существует ──
  function updateEyes() {
    if (!document.querySelector(".dream-layer")) {
      _dreamEyesRAF = null;
      return;
    }
    eyes.forEach(e => {
      const r = e.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = mouseX - cx;
      const dy = mouseY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const maxShift = r.width * 0.12;
      const shiftX = (dx / dist) * Math.min(maxShift, dist / 20);
      const shiftY = (dy / dist) * Math.min(maxShift, dist / 20);
      e.style.setProperty("--eye-x", shiftX + "px");
      e.style.setProperty("--eye-y", shiftY + "px");
    });
    _dreamEyesRAF = requestAnimationFrame(updateEyes);
  }
  _dreamEyesRAF = requestAnimationFrame(updateEyes);

  // ── дымка / мягкие облачка (CSS-градиенты) ──
  const cloudCount = isMobile ? 2 : 3;
  for (let i = 0; i < cloudCount; i++) {
    const c = document.createElement("div");
    c.className = "dream-cloud";

    const size = 200 + Math.random() * 400;
    const top = Math.random() * 90;
    const duration = 30 + Math.random() * 40;
    const delay = Math.random() * -50;
    const opacity = (0.3 + Math.random() * 0.4).toFixed(2);

    c.style.width = size + "px";
    c.style.height = (size * 0.4) + "px";
    c.style.top = top + "%";
    c.style.animationDuration = duration + "s";
    c.style.animationDelay = delay + "s";
    c.style.setProperty("--cloud-op", opacity);

    layer.appendChild(c);
  }

  // ── плавающие облака из cloud.png ☁️ ──
  const floatCloudCount = isMobile ? 1 : 2;
  for (let i = 0; i < floatCloudCount; i++) {
    const fc = document.createElement("div");
    fc.className = "dream-floatcloud";

    const size = 140 + Math.random() * 200;
    const top = Math.random() * 85;
    const duration = 35 + Math.random() * 35;
    const delay = Math.random() * -50;
    const alpha = (0.35 + Math.random() * 0.35).toFixed(2);

    fc.style.width = size + "px";
    fc.style.height = (size * 0.55) + "px";
    fc.style.top = top + "%";
    fc.style.animationDuration = duration + "s";
    fc.style.animationDelay = delay + "s";
    fc.style.setProperty("--cloud-alpha", alpha);

    if (Math.random() > 0.5) {
      fc.classList.add("sway");
      fc.style.setProperty(
        "animation-duration",
        duration + "s, " + (4 + Math.random() * 3) + "s"
      );
    }

    layer.appendChild(fc);
  }

  // ── всплывающие надписи 💬 ──
  initDreamWhispers(layer, isMobile);
}

/* ── всплывающие фразы из сна ── */
const DREAM_WHISPERS = [
  "you are dreaming",
  "wake up",
  "it's ok",
  "everything is fine",
  "are you there?",
  "i can see you",
  "don't forget",
  "come back",
  "this isn't real",
  "you're safe here",
  "let go",
  "it was always you",
  "close your eyes",
  "still dreaming",
  "hello again",
];

let _dreamWhispersTimer = null; // ← FIX: храним id setInterval

function initDreamWhispers(layer, isMobile) {
  const interval = isMobile ? 4500 : 2800;

  function spawnWhisper() {
    if (!document.querySelector(".dream-layer")) return;

    const text = DREAM_WHISPERS[Math.floor(Math.random() * DREAM_WHISPERS.length)];

    const w = document.createElement("div");
    w.className = "dream-whisper";
    w.textContent = text;

    const left = 8 + Math.random() * 76;       // %
    const top = 15 + Math.random() * 70;       // %
    const size = 0.75 + Math.random() * 0.55;  // rem
    const duration = 5 + Math.random() * 4;    // 5–9s
    const rot = (Math.random() * 10 - 5).toFixed(1);

    w.style.left = left + "%";
    w.style.top = top + "%";
    w.style.fontSize = size + "rem";
    w.style.animationDuration = duration + "s";
    w.style.setProperty("--rot", rot + "deg");

    // случайный «тип» надписи — иногда чуть глитчевый
    if (Math.random() > 0.7) w.classList.add("glitch");

    layer.appendChild(w);

    // удаляем после анимации
    setTimeout(() => w.remove(), duration * 1000 + 200);
  }

  // первый сразу
  setTimeout(spawnWhisper, 1200);

  // и потом регулярно
  _dreamWhispersTimer = setInterval(() => {
    if (!document.querySelector(".dream-layer")) {
      clearInterval(_dreamWhispersTimer);
      _dreamWhispersTimer = null;
      return;
    }
    spawnWhisper();
  }, interval);
}

function removeDreamLayer() {
  const layer = document.querySelector(".dream-layer");
  if (layer) layer.remove();

  // ── FIX: гасим rAF и interval ──
  if (_dreamEyesRAF !== null) {
    cancelAnimationFrame(_dreamEyesRAF);
    _dreamEyesRAF = null;
  }
  if (_dreamWhispersTimer !== null) {
    clearInterval(_dreamWhispersTimer);
    _dreamWhispersTimer = null;
  }
}

/* ── Инициализация ── */
function initApp() {
  initTheme();
  initHero();
  initBackButton();
  initHotkeys();
  createThemePanel();
  initPomodoroWidget();

  const theme = getTheme();
  if (theme.startsWith("aero")) initAeroBubbles();
  if (theme.startsWith("dream")) initDreamLayer();
  initHeroImageUI();
  applyHeroImage();
  initGames();
}

document.addEventListener("DOMContentLoaded", initApp);

/* ── PWA ── */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (window.location.protocol === "file:") return;

    const inSubfolder =
      window.location.pathname.includes("/web/") ||
      window.location.pathname.includes("/ai/") ||
      window.location.pathname.includes("/python/") ||
      window.location.pathname.includes("/_shared/");

    const swPath = inSubfolder ? "../service-worker.js" : "./service-worker.js";

    navigator.serviceWorker.register(swPath)
      .then(() => console.log("PWA: service worker зарегистрирован"))
      .catch((err) => console.log("PWA: ошибка регистрации", err));
  });
}

/* ═══════════════════════════════════════════
   МИНИ-ИГРЫ — сапёр и змейка
   ═══════════════════════════════════════════ */

function initGames() {
  const tabs = document.querySelectorAll(".game-tab");
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".game-panel").forEach(p => p.classList.remove("active"));
      const id = "panel" + tab.dataset.game.charAt(0).toUpperCase() + tab.dataset.game.slice(1);
      const panel = document.getElementById(id);
      if (panel) panel.classList.add("active");

      // останавливаем то, что не на экране
      if (tab.dataset.game !== "snake")   stopSnake();
      if (tab.dataset.game !== "tetris")  stopTetris();

      // возобновляем то, что стало активным
      if (tab.dataset.game === "snake")   startSnakeLoopIfNeeded();
      if (tab.dataset.game === "tetris")  drawTetris();
      if (tab.dataset.game === "g2048")   updateG2048Score();
      if (tab.dataset.game === "g15")     updateG15Stats();
    });
  });

  initMines();
  initSnake();
  initG2048();
  initTetris();
  initG15();
}

/* ───────────────────────────────────────────
   САПЁР
   ─────────────────────────────────────────── */

const MINES_KEY = "local-adaptation-mines-best";

const MINES_PRESETS = {
  easy:   { size: 9,  mines: 10 },
  medium: { size: 12, mines: 24 },
  hard:   { size: 15, mines: 45 },
};

let minesState = null;
let minesTimerId = null;

function initMines() {
  const board = document.getElementById("minesBoard");
  if (!board) return;

  document.getElementById("minesRestart").addEventListener("click", startMines);
  document.getElementById("minesDiff").addEventListener("change", startMines);

  startMines();
}

function loadMinesBest() {
  try {
    const raw = localStorage.getItem(MINES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveMinesBest(best) {
  try { localStorage.setItem(MINES_KEY, JSON.stringify(best)); } catch {}
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function startMines() {
  const diff = document.getElementById("minesDiff").value;
  const { size, mines } = MINES_PRESETS[diff] || MINES_PRESETS.medium;

  // ── FIX: гарантированно гасим старый таймер ──
  stopMinesTimer();

  minesState = {
    size,
    mines,
    flags: 0,
    opened: 0,
    grid: [],
    revealed: [],   // 2D: 0 = hidden, 1 = opened, 2 = flag
    started: false,
    dead: false,
    won: false,
    seconds: 0,
  };

  // пустая сетка
  for (let r = 0; r < size; r++) {
    minesState.grid.push(new Array(size).fill(0));
    minesState.revealed.push(new Array(size).fill(0));
  }

  renderMinesBoard();
  updateMinesStats();
  updateMinesBest();
}

function placeMines(safeR, safeC) {
  const { size, mines } = minesState;
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    // не ставим на первую клетку и вокруг неё
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    if (minesState.grid[r][c] === -1) continue;
    minesState.grid[r][c] = -1;
    placed++;
  }
  // считаем числа
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (minesState.grid[r][c] === -1) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nc >= 0 && nr < size && nc < size && minesState.grid[nr][nc] === -1) n++;
        }
      }
      minesState.grid[r][c] = n;
    }
  }
}

function renderMinesBoard() {
  const board = document.getElementById("minesBoard");
  const { size, revealed } = minesState;
  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${size}, max-content)`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const btn = document.createElement("button");
      btn.className = "mines-cell";
      btn.dataset.r = r;
      btn.dataset.c = c;
      if (revealed[r][c] === 1) btn.classList.add("opened");
      if (revealed[r][c] === 2) { btn.classList.add("flag"); btn.textContent = "🚩"; }
      btn.addEventListener("click", () => onMinesLeftClick(r, c));
      btn.addEventListener("contextmenu", (e) => { e.preventDefault(); onMinesRightClick(r, c); });
      // для мобилок — долгое нажатие = флаг
      let holdTimer = null;
      btn.addEventListener("touchstart", () => {
        holdTimer = setTimeout(() => {
          holdTimer = null;
          onMinesRightClick(r, c);
        }, 400);
      }, { passive: true });
      btn.addEventListener("touchend", () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      });
      board.appendChild(btn);
    }
  }
}

function cellAt(r, c) {
  const board = document.getElementById("minesBoard");
  return board.querySelector(`.mines-cell[data-r="${r}"][data-c="${c}"]`);
}

function onMinesLeftClick(r, c) {
  if (minesState.dead || minesState.won) return;
  if (minesState.revealed[r][c] !== 0) return;

  if (!minesState.started) {
    minesState.started = true;
    placeMines(r, c);
    startMinesTimer();
  }

  if (minesState.grid[r][c] === -1) {
    // взрыв
    minesState.dead = true;
    revealAllMines();
    stopMinesTimer();
    toast("◦ 💥 бум!");
    return;
  }

  floodReveal(r, c);
  updateMinesStats();

  if (minesState.opened === minesState.size * minesState.size - minesState.mines) {
    minesState.won = true;
    stopMinesTimer();
    saveMinesRecord(minesState.seconds);
    updateMinesBest();
    toast(`◦ 🏆 победа за ${fmtTime(minesState.seconds)}!`);
  }
}

function onMinesRightClick(r, c) {
  if (minesState.dead || minesState.won) return;
  if (minesState.revealed[r][c] === 1) return;

  const el = cellAt(r, c);
  if (minesState.revealed[r][c] === 0) {
    minesState.revealed[r][c] = 2;
    minesState.flags++;
    el.classList.add("flag");
    el.textContent = "🚩";
  } else if (minesState.revealed[r][c] === 2) {
    minesState.revealed[r][c] = 0;
    minesState.flags--;
    el.classList.remove("flag");
    el.textContent = "";
  }
  updateMinesStats();
}

function floodReveal(r, c) {
  const stack = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    if (cr < 0 || cc < 0 || cr >= minesState.size || cc >= minesState.size) continue;
    if (minesState.revealed[cr][cc] !== 0) continue;

    minesState.revealed[cr][cc] = 1;
    minesState.opened++;

    const el = cellAt(cr, cc);
    el.classList.add("opened");
    const v = minesState.grid[cr][cc];
    if (v > 0) {
      el.textContent = v;
      el.classList.add("n" + v);
    } else {
      // пустая — раскрываем соседей
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          stack.push([cr + dr, cc + dc]);
        }
      }
    }
  }
}

function revealAllMines() {
  for (let r = 0; r < minesState.size; r++) {
    for (let c = 0; c < minesState.size; c++) {
      const el = cellAt(r, c);
      if (minesState.grid[r][c] === -1 && minesState.revealed[r][c] === 0) {
        el.classList.add("opened", "mine");
        el.textContent = "💣";
      } else if (minesState.grid[r][c] !== -1 && minesState.revealed[r][c] === 2) {
        el.classList.add("wrong-flag");
        el.textContent = "❌";
      }
    }
  }
}

function startMinesTimer() {
  stopMinesTimer(); // ← FIX: не копим таймеры
  minesState.seconds = 0;
  updateMinesStats();
  minesTimerId = setInterval(() => {
    if (!minesState || minesState.dead || minesState.won) return;
    minesState.seconds++;
    updateMinesStats();
  }, 1000);
}

function stopMinesTimer() {
  clearInterval(minesTimerId);
  minesTimerId = null;
}

function updateMinesStats() {
  document.getElementById("minesLeft").textContent = minesState.mines - minesState.flags;
  document.getElementById("minesTime").textContent = fmtTime(minesState.seconds);
}

function saveMinesRecord(sec) {
  const diff = document.getElementById("minesDiff").value;
  const best = loadMinesBest();
  if (!best[diff] || sec < best[diff]) {
    best[diff] = sec;
    saveMinesBest(best);
  }
}

function updateMinesBest() {
  const diff = document.getElementById("minesDiff").value;
  const best = loadMinesBest();
  document.getElementById("minesBest").textContent = best[diff] ? fmtTime(best[diff]) : "—";
}

/* ───────────────────────────────────────────
   ЗМЕЙКА
   ─────────────────────────────────────────── */

const SNAKE_KEY = "local-adaptation-snake-best";

let snakeState = null;
let snakeTimerId = null;

function loadSnakeBest() {
  try { return Number(localStorage.getItem(SNAKE_KEY)) || 0; } catch { return 0; }
}

function saveSnakeBest(score) {
  try { localStorage.setItem(SNAKE_KEY, String(score)); } catch {}
}

function initSnake() {
  const canvas = document.getElementById("snakeCanvas");
  if (!canvas) return;

  document.getElementById("snakeRestart").addEventListener("click", startSnake);
  document.getElementById("snakeSpeed").addEventListener("change", () => {
    if (snakeState && snakeState.running) startSnake();
  });

  // стрелки + WASD + пробел
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("panelSnake").classList.contains("active")) return;

    const k = e.key.toLowerCase();
    if (["arrowup","arrowdown","arrowleft","arrowright"," ","w","a","s","d"].includes(k)) {
      // не даём скроллить страницу стрелками, когда игра активна
      if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
    }

    if (k === " ") { toggleSnakePause(); return; }
    if (k === "arrowup"    || k === "w") setSnakeDir("up");
    if (k === "arrowdown"  || k === "s") setSnakeDir("down");
    if (k === "arrowleft"  || k === "a") setSnakeDir("left");
    if (k === "arrowright" || k === "d") setSnakeDir("right");
  });

  // dpad
  document.querySelectorAll(".snake-dpad button").forEach(btn => {
    btn.addEventListener("click", () => setSnakeDir(btn.dataset.dir));
  });

  // свайпы
  const board = canvas;
  let touchStart = null;
  board.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  board.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      setSnakeDir(dx > 0 ? "right" : "left");
    } else {
      setSnakeDir(dy > 0 ? "down" : "up");
    }
    touchStart = null;
  }, { passive: true });

  startSnake();
}

function startSnake() {
  const canvas = document.getElementById("snakeCanvas");
  if (!canvas) return;

  stopSnake();

  const CELL = 18;
  const COLS = Math.floor(canvas.width / CELL);
  const ROWS = Math.floor(canvas.height / CELL);

  snakeState = {
    canvas,
    ctx: canvas.getContext("2d"),
    cell: CELL,
    cols: COLS,
    rows: ROWS,
    snake: [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: null,
    score: 0,
    running: false,
    dead: false,
    paused: true,
  };

  spawnFood();
  updateSnakeScore();
  updateSnakeBest();
  drawSnake();
  showSnakeOverlay(true, "пауза", "жми пробел / стрелку или кнопку старт");
}

function startSnakeLoopIfNeeded() {
  if (!snakeState) return;
  drawSnake();
}

function toggleSnakePause() {
  if (!snakeState) return;
  if (snakeState.dead) { startSnake(); return; }
  if (snakeState.running) {
    stopSnake();
    showSnakeOverlay(true, "пауза", "жми пробел чтобы продолжить");
  } else {
    resumeSnake();
  }
}

function resumeSnake() {
  if (!snakeState || snakeState.dead) return;
  snakeState.running = true;
  snakeState.paused = false;
  showSnakeOverlay(false);
  clearInterval(snakeTimerId);
  const speed = Number(document.getElementById("snakeSpeed").value) || 120;
  snakeTimerId = setInterval(snakeStep, speed);
}

function stopSnake() {
  if (snakeState) snakeState.running = false;
  clearInterval(snakeTimerId);
  snakeTimerId = null;
}

function setSnakeDir(dir) {
  if (!snakeState || snakeState.dead) return;
  const map = {
    up:    { x: 0,  y: -1 },
    down:  { x: 0,  y: 1  },
    left:  { x: -1, y: 0  },
    right: { x: 1,  y: 0  },
  };
  const nd = map[dir];
  if (!nd) return;
  // нельзя развернуться на 180
  if (nd.x === -snakeState.dir.x && nd.y === -snakeState.dir.y) return;
  snakeState.nextDir = nd;

  if (!snakeState.running) resumeSnake();
}

function spawnFood() {
  const { cols, rows, snake } = snakeState;
  let tries = 0;
  while (tries++ < 500) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    if (!snake.some(s => s.x === x && s.y === y)) {
      snakeState.food = { x, y };
      return;
    }
  }
}

function snakeStep() {
  if (!snakeState || !snakeState.running) return;

  snakeState.dir = snakeState.nextDir;
  const head = {
    x: snakeState.snake[0].x + snakeState.dir.x,
    y: snakeState.snake[0].y + snakeState.dir.y,
  };

  // столкновение со стеной
  if (head.x < 0 || head.y < 0 || head.x >= snakeState.cols || head.y >= snakeState.rows) {
    return snakeDie();
  }

  // столкновение с собой
  if (snakeState.snake.some(s => s.x === head.x && s.y === head.y)) {
    return snakeDie();
  }

  snakeState.snake.unshift(head);

  if (snakeState.food && head.x === snakeState.food.x && head.y === snakeState.food.y) {
    snakeState.score++;
    updateSnakeScore();
    spawnFood();
  } else {
    snakeState.snake.pop();
  }

  drawSnake();
}

function snakeDie() {
  stopSnake();
  snakeState.dead = true;
  if (snakeState.score > loadSnakeBest()) {
    saveSnakeBest(snakeState.score);
    updateSnakeBest();
    showSnakeOverlay(true, "💀 конец", `новый рекорд: ${snakeState.score}! жми старт`);
  } else {
    showSnakeOverlay(true, "💀 конец", `счёт: ${snakeState.score}. жми пробел / старт`);
  }
  toast("◦ 💀 игра окончена");
}

function drawSnake() {
  if (!snakeState) return;
  const { ctx, canvas, cell, snake, food } = snakeState;

  // ── FIX: цвета из кэша, а не getComputedStyle на каждом кадре ──
  const colors = getThemeColors();
  const pink   = colors.pink;
  const purple = colors.purple;
  const bgSoft = colors.bgSoft;
  const line   = colors.line;

  // фон
  ctx.fillStyle = bgSoft;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // сетка
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= canvas.width; x += cell) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += cell) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // еда — яблочко как глянцевая точка
  if (food) {
    const fx = food.x * cell + cell / 2;
    const fy = food.y * cell + cell / 2;
    const grd = ctx.createRadialGradient(fx - cell * 0.15, fy - cell * 0.15, 1, fx, fy, cell * 0.6);
    grd.addColorStop(0, "#ffffff");
    grd.addColorStop(0.3, pink);
    grd.addColorStop(1, purple);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fx, fy, cell * 0.38, 0, Math.PI * 2);
    ctx.fill();
    // блик
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(fx - cell * 0.12, fy - cell * 0.12, cell * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // змейка — тело с градиентом от головы к хвосту
  const total = snake.length;
  snake.forEach((s, i) => {
    const t = 1 - i / Math.max(1, total - 1);
    const x = s.x * cell + 1.5;
    const y = s.y * cell + 1.5;
    const w = cell - 3;
    const r = w * 0.32;

    // голова ярче
    if (i === 0) {
      ctx.fillStyle = pink;
      ctx.shadowColor = pink;
      ctx.shadowBlur = 10;
    } else {
      // интерполяция от pink к purple
      ctx.fillStyle = mixColor(pink, purple, 1 - t);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    roundRect(ctx, x, y, w, w, r);
    ctx.fill();

    // глянцевый блик
    if (i === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(x + w * 0.35, y + w * 0.32, w * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // глазки на голове
    if (i === 0) {
      ctx.fillStyle = "#1a0f1d";
      ctx.beginPath();
      ctx.arc(x + w * 0.32, y + w * 0.42, w * 0.09, 0, Math.PI * 2);
      ctx.arc(x + w * 0.68, y + w * 0.42, w * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.shadowBlur = 0;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

/* интерполяция hex-цветов (для градиента тела) */
function mixColor(a, b, t) {
  const pa = hexToRgb(a), pb = hexToRgb(b);
  if (!pa || !pb) return a;
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex) {
  hex = hex.trim();
  if (hex.startsWith("rgb")) return null;
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  if (hex.length !== 6) return null;
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function updateSnakeScore() {
  const el = document.getElementById("snakeScore");
  if (el) el.textContent = snakeState ? snakeState.score : 0;
}

function updateSnakeBest() {
  const el = document.getElementById("snakeBest");
  if (el) el.textContent = loadSnakeBest();
}

function showSnakeOverlay(show, title, subtitle) {
  const ov = document.getElementById("snakeOverlay");
  if (!ov) return;
  if (show) {
    ov.innerHTML = `<div><b>${title || ""}</b>${subtitle || ""}</div>`;
    ov.classList.add("show");
  } else {
    ov.classList.remove("show");
  }
}

/* ═══════════════════════════════════════════
   2048
   ═══════════════════════════════════════════ */

const G2048_KEY = "local-adaptation-2048-best";
let g2048State = null;

function initG2048() {
  const board = document.getElementById("g2048Board");
  if (!board) return;

  document.getElementById("g2048Restart").addEventListener("click", startG2048);

  // управление — стрелки/WASD (только когда вкладка активна)
  document.addEventListener("keydown", (e) => {
    const panel = document.getElementById("panelG2048");
    if (!panel || !panel.classList.contains("active")) return;
    const k = e.key.toLowerCase();
    let dir = null;
    if (k === "arrowup"    || k === "w") dir = "up";
    if (k === "arrowdown"  || k === "s") dir = "down";
    if (k === "arrowleft"  || k === "a") dir = "left";
    if (k === "arrowright" || k === "d") dir = "right";
    if (!dir) return;
    e.preventDefault();
    moveG2048(dir);
  });

  // свайпы
  let ts = null;
  board.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    ts = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  board.addEventListener("touchend", (e) => {
    if (!ts) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - ts.x;
    const dy = t.clientY - ts.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) { ts = null; return; }
    if (Math.abs(dx) > Math.abs(dy)) {
      moveG2048(dx > 0 ? "right" : "left");
    } else {
      moveG2048(dy > 0 ? "down" : "up");
    }
    ts = null;
  }, { passive: true });

  startG2048();
}

function loadG2048Best() {
  try { return Number(localStorage.getItem(G2048_KEY)) || 0; } catch { return 0; }
}
function saveG2048Best(s) {
  try { localStorage.setItem(G2048_KEY, String(s)); } catch {}
}

function startG2048() {
  g2048State = {
    grid: Array.from({ length: 4 }, () => new Array(4).fill(0)),
    score: 0,
    dead: false,
  };
  addRandomTile();
  addRandomTile();
  renderG2048();
  updateG2048Score();
  updateG2048Best();
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (g2048State.grid[r][c] === 0) empty.push([r, c]);
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  g2048State.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function renderG2048(popSet) {
  const board = document.getElementById("g2048Board");
  board.innerHTML = "";
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = g2048State.grid[r][c];
      const cell = document.createElement("div");
      cell.className = "g2048-cell";
      if (v > 0) {
        cell.textContent = v;
        if (v <= 2048) cell.classList.add("v" + v);
        else cell.classList.add("vbig");
        if (popSet && popSet.has(`${r},${c}`)) cell.classList.add("pop");
      }
      board.appendChild(cell);
    }
  }
}

function moveG2048(dir) {
  if (!g2048State || g2048State.dead) return;

  const g = g2048State.grid;
  let moved = false;
  let gained = 0;

  // helper: пройти одну линию
  function slideLine(line) {
    const filtered = line.filter(v => v !== 0);
    const merged = [];
    for (let i = 0; i < filtered.length; i++) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const v = filtered[i] * 2;
        merged.push(v);
        gained += v;
        i++;
      } else {
        merged.push(filtered[i]);
      }
    }
    while (merged.length < 4) merged.push(0);
    return merged;
  }

  function lineEq(a, b) {
    return a.every((v, i) => v === b[i]);
  }

  // функция для получения/установки линии
  function getLine(kind, idx) {
    const arr = [];
    if (kind === "row") {
      for (let c = 0; c < 4; c++) arr.push(g[idx][c]);
    } else {
      for (let r = 0; r < 4; r++) arr.push(g[r][idx]);
    }
    return arr;
  }

  function setLine(kind, idx, arr) {
    if (kind === "row") {
      for (let c = 0; c < 4; c++) g[idx][c] = arr[c];
    } else {
      for (let r = 0; r < 4; r++) g[r][idx] = arr[r];
    }
  }

  for (let i = 0; i < 4; i++) {
    let line = getLine(dir === "left" || dir === "right" ? "row" : "col", i);
    if (dir === "right" || dir === "down") line.reverse();
    const merged = slideLine(line);
    if (dir === "right" || dir === "down") merged.reverse();
    if (!lineEq(getLine(dir === "left" || dir === "right" ? "row" : "col", i), merged)) {
      moved = true;
      setLine(dir === "left" || dir === "right" ? "row" : "col", i, merged);
    }
  }

  if (!moved) return;

  g2048State.score += gained;
  addRandomTile();
  renderG2048();
  updateG2048Score();

  if (g2048State.score > loadG2048Best()) {
    saveG2048Best(g2048State.score);
    updateG2048Best();
  }

  // проверка конца
  if (isG2048Dead()) {
    g2048State.dead = true;
    toast(`◦ 🎯 ${g2048State.score}. ходов нет`);
  }
}

function isG2048Dead() {
  const g = g2048State.grid;
  // есть пустая?
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (g[r][c] === 0) return false;
  // есть рядом одинаковые?
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (c < 3 && g[r][c] === g[r][c + 1]) return false;
      if (r < 3 && g[r][c] === g[r + 1][c]) return false;
    }
  return true;
}

function updateG2048Score() {
  document.getElementById("g2048Score").textContent = g2048State ? g2048State.score : 0;
}

function updateG2048Best() {
  document.getElementById("g2048Best").textContent = loadG2048Best();
}

/* ═══════════════════════════════════════════
   ТЕТРИС
   ═══════════════════════════════════════════ */

const TETRIS_KEY = "local-adaptation-tetris-best";

const TETROMINOES = {
  I: { shape: [[1,1,1,1]], color: "#6fd6ff" },
  O: { shape: [[1,1],[1,1]], color: "#ffd166" },
  T: { shape: [[0,1,0],[1,1,1]], color: "#b47cff" },
  S: { shape: [[0,1,1],[1,1,0]], color: "#7ee5a0" },
  Z: { shape: [[1,1,0],[0,1,1]], color: "#ff7a8a" },
  J: { shape: [[1,0,0],[1,1,1]], color: "#7c9eff" },
  L: { shape: [[0,0,1],[1,1,1]], color: "#ff8ec7" },
};

const TETRIS_COLS = 10;
const TETRIS_ROWS = 20;

let tetrisState = null;
let tetrisTimerId = null;

function initTetris() {
  const canvas = document.getElementById("tetrisCanvas");
  if (!canvas) return;

  document.getElementById("tetrisRestart").addEventListener("click", startTetris);
  document.getElementById("tetrisSpeed").addEventListener("change", () => {
    if (tetrisState && tetrisState.running) {
      clearInterval(tetrisTimerId);
      startTetrisLoop();
    }
  });

  document.addEventListener("keydown", (e) => {
    const panel = document.getElementById("panelTetris");
    if (!panel || !panel.classList.contains("active")) return;

    const k = e.key.toLowerCase();
    if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();

    if (k === " ") { toggleTetrisPause(); return; }
    if (k === "arrowleft"  || k === "a") tetrisMove(-1);
    if (k === "arrowright" || k === "d") tetrisMove(1);
    if (k === "arrowdown"  || k === "s") tetrisSoftDrop();
    if (k === "arrowup"    || k === "x" || k === "w") tetrisRotate();
  });

  document.querySelectorAll(".tetris-dpad button").forEach(btn => {
    btn.addEventListener("click", () => {
      const a = btn.dataset.action;
      if (a === "left")   tetrisMove(-1);
      if (a === "right")  tetrisMove(1);
      if (a === "down")   tetrisSoftDrop();
      if (a === "rotate") tetrisRotate();
    });
  });

  // свайпы по игровому полю
  const wrap = canvas.parentElement;
  let ts = null;
  wrap.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    ts = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, { passive: true });
  wrap.addEventListener("touchend", (e) => {
    if (!ts) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - ts.x;
    const dy = t.clientY - ts.y;
    const dt = Date.now() - ts.time;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20 && dt < 250) {
      tetrisRotate();
    } else if (Math.abs(dx) > Math.abs(dy)) {
      tetrisMove(dx > 0 ? 1 : -1);
    } else if (dy > 40) {
      tetrisSoftDrop();
    }
    ts = null;
  }, { passive: true });

  startTetris();
}

function loadTetrisBest() {
  try { return Number(localStorage.getItem(TETRIS_KEY)) || 0; } catch { return 0; }
}
function saveTetrisBest(s) {
  try { localStorage.setItem(TETRIS_KEY, String(s)); } catch {}
}

function startTetris() {
  stopTetris();

  tetrisState = {
    grid: Array.from({ length: TETRIS_ROWS }, () => new Array(TETRIS_COLS).fill(null)),
    piece: null,
    nextType: randomTetrominoType(),
    score: 0,
    lines: 0,
    running: false,
    dead: false,
  };

  spawnTetrisPiece();
  updateTetrisStats();
  updateTetrisBest();
  drawTetris();
  drawTetrisNext();
  showTetrisOverlay(true, "пауза", "жми пробел / стрелку");
}

function randomTetrominoType() {
  const keys = Object.keys(TETROMINOES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function spawnTetrisPiece() {
  const type = tetrisState.nextType;
  tetrisState.nextType = randomTetrominoType();

  const def = TETROMINOES[type];
  const shape = def.shape.map(row => row.slice());

  tetrisState.piece = {
    type,
    shape,
    color: def.color,
    x: Math.floor((TETRIS_COLS - shape[0].length) / 2),
    y: 0,
  };

  if (tetrisCollides(tetrisState.piece, 0, 0)) {
    tetrisDie();
  }
  drawTetrisNext();
}

function tetrisCollides(piece, dx, dy, shape) {
  const s = shape || piece.shape;
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= TETRIS_COLS || ny >= TETRIS_ROWS) return true;
      if (ny < 0) continue;
      if (tetrisState.grid[ny][nx]) return true;
    }
  }
  return false;
}

function startTetrisLoop() {
  if (!tetrisState || tetrisState.dead) return;
  tetrisState.running = true;
  clearInterval(tetrisTimerId);
  const speed = Number(document.getElementById("tetrisSpeed").value) || 600;
  tetrisTimerId = setInterval(() => {
    if (!tetrisState.running) return;
    tetrisTick();
  }, speed);
}

function stopTetris() {
  if (tetrisState) tetrisState.running = false;
  clearInterval(tetrisTimerId);
  tetrisTimerId = null;
}

function toggleTetrisPause() {
  if (!tetrisState) return;
  if (tetrisState.dead) { startTetris(); return; }
  if (tetrisState.running) {
    stopTetris();
    showTetrisOverlay(true, "пауза", "жми пробел чтобы продолжить");
  } else {
    startTetrisLoop();
    showTetrisOverlay(false);
  }
}

function tetrisMove(dx) {
  if (!tetrisState || tetrisState.dead || !tetrisState.running) return;
  if (!tetrisCollides(tetrisState.piece, dx, 0)) {
    tetrisState.piece.x += dx;
    drawTetris();
  }
}

function tetrisRotate() {
  if (!tetrisState || tetrisState.dead || !tetrisState.running) return;
  const s = tetrisState.piece.shape;
  const rotated = s[0].map((_, i) => s.map(row => row[i]).reverse());
  if (!tetrisCollides(tetrisState.piece, 0, 0, rotated)) {
    tetrisState.piece.shape = rotated;
    drawTetris();
  }
}

function tetrisSoftDrop() {
  if (!tetrisState || tetrisState.dead || !tetrisState.running) return;
  if (!tetrisCollides(tetrisState.piece, 0, 1)) {
    tetrisState.piece.y += 1;
    drawTetris();
  }
}

function tetrisTick() {
  if (!tetrisState || !tetrisState.running) return;
  if (!tetrisCollides(tetrisState.piece, 0, 1)) {
    tetrisState.piece.y += 1;
  } else {
    tetrisLock();
  }
  drawTetris();
}

function tetrisLock() {
  const p = tetrisState.piece;
  for (let r = 0; r < p.shape.length; r++) {
    for (let c = 0; c < p.shape[r].length; c++) {
      if (!p.shape[r][c]) continue;
      const ny = p.y + r;
      const nx = p.x + c;
      if (ny >= 0 && ny < TETRIS_ROWS && nx >= 0 && nx < TETRIS_COLS) {
        tetrisState.grid[ny][nx] = p.color;
      }
    }
  }

  // счёт линий
  let cleared = 0;
  for (let r = TETRIS_ROWS - 1; r >= 0; r--) {
    if (tetrisState.grid[r].every(v => v)) {
      tetrisState.grid.splice(r, 1);
      tetrisState.grid.unshift(new Array(TETRIS_COLS).fill(null));
      cleared++;
      r++;
    }
  }

  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800][cleared] || 0;
    tetrisState.score += points;
    tetrisState.lines += cleared;
    updateTetrisStats();

    if (tetrisState.score > loadTetrisBest()) {
      saveTetrisBest(tetrisState.score);
      updateTetrisBest();
    }
  }

  spawnTetrisPiece();
  drawTetrisNext();
}

function tetrisDie() {
  stopTetris();
  tetrisState.dead = true;
  showTetrisOverlay(true, "💀 конец", `счёт: ${tetrisState.score}. жми старт`);
  toast("◦ 💀 игра окончена");
}

function drawTetris() {
  const canvas = document.getElementById("tetrisCanvas");
  if (!canvas || !tetrisState) return;
  const ctx = canvas.getContext("2d");

  // ── FIX: цвета из кэша ──
  const colors = getThemeColors();
  const bgSoft = colors.bgSoft;
  const line   = colors.line;

  const cell = Math.floor(canvas.width / TETRIS_COLS);

  ctx.fillStyle = bgSoft;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // сетка
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= canvas.width; x += cell) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += cell) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // поле
  for (let r = 0; r < TETRIS_ROWS; r++) {
    for (let c = 0; c < TETRIS_COLS; c++) {
      const color = tetrisState.grid[r][c];
      if (color) drawBlock(ctx, c * cell, r * cell, cell, color, 1);
    }
  }

  // фигура
  if (tetrisState.piece) {
    const p = tetrisState.piece;
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (!p.shape[r][c]) continue;
        drawBlock(ctx, (p.x + c) * cell, (p.y + r) * cell, cell, p.color, 1);
      }
    }
  }
}

function drawBlock(ctx, x, y, size, color, alpha) {
  const pad = 1.5;
  const r = size * 0.18;
  // основа
  ctx.globalAlpha = alpha || 1;
  ctx.fillStyle = color;
  roundRect(ctx, x + pad, y + pad, size - pad*2, size - pad*2, r);
  ctx.fill();
  // глянцевый блик сверху
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  roundRect(ctx, x + pad + 2, y + pad + 2, size - pad*2 - 4, (size - pad*2) * 0.4, r * 0.7);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTetrisNext() {
  const canvas = document.getElementById("tetrisNext");
  if (!canvas || !tetrisState) return;
  const ctx = canvas.getContext("2d");

  // ── FIX: цвета из кэша ──
  const colors = getThemeColors();
  const bgSoft = colors.bgSoft;

  ctx.fillStyle = bgSoft;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const def = TETROMINOES[tetrisState.nextType];
  if (!def) return;

  const shape = def.shape;
  const cell = Math.floor(Math.min(canvas.width, canvas.height) / 5);
  const offX = (canvas.width - shape[0].length * cell) / 2;
  const offY = (canvas.height - shape.length * cell) / 2;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      drawBlock(ctx, offX + c * cell, offY + r * cell, cell, def.color, 1);
    }
  }
}

function showTetrisOverlay(show, title, subtitle) {
  const ov = document.getElementById("tetrisOverlay");
  if (!ov) return;
  if (show) {
    ov.innerHTML = `<div><b>${title || ""}</b>${subtitle || ""}</div>`;
    ov.classList.add("show");
  } else {
    ov.classList.remove("show");
  }
}

function updateTetrisStats() {
  if (!tetrisState) return;
  document.getElementById("tetrisScore").textContent = tetrisState.score;
  document.getElementById("tetrisLines").textContent = tetrisState.lines;
}

function updateTetrisBest() {
  document.getElementById("tetrisBest").textContent = loadTetrisBest();
}

/* ═══════════════════════════════════════════
   ПЯТНАШКИ
   ═══════════════════════════════════════════ */

const G15_KEY = "local-adaptation-15-best";

let g15State = null;
let g15TimerId = null;

function initG15() {
  const board = document.getElementById("g15Board");
  if (!board) return;

  document.getElementById("g15Restart").addEventListener("click", startG15);

  startG15();
}

function loadG15Best() {
  try {
    const raw = localStorage.getItem(G15_KEY);
    return raw ? JSON.parse(raw) : { moves: null, time: null };
  } catch { return { moves: null, time: null }; }
}
function saveG15Best(b) {
  try { localStorage.setItem(G15_KEY, JSON.stringify(b)); } catch {}
}

function startG15() {
  // ── FIX: гасим оба возможных таймера ──
  clearInterval(g15TimerId);
  g15TimerId = null;
  if (g15State && g15State.timer) {
    clearInterval(g15State.timer);
    g15State.timer = null;
  }

  // решаемое состояние: перемешать из выигрышного, делая только валидные ходы
  const tiles = Array.from({ length: 15 }, (_, i) => i + 1).concat([0]);
  let empty = 15;

  // делаем 200 случайных валидных ходов от решённого
  for (let i = 0; i < 200; i++) {
    const r = Math.floor(empty / 4);
    const c = empty % 4;
    const neighbors = [];
    if (r > 0) neighbors.push(empty - 4);
    if (r < 3) neighbors.push(empty + 4);
    if (c > 0) neighbors.push(empty - 1);
    if (c < 3) neighbors.push(empty + 1);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    tiles[empty] = tiles[pick];
    tiles[pick] = 0;
    empty = pick;
  }

  g15State = {
    tiles,               // 1..15 и 0
    empty,               // индекс пустой клетки
    moves: 0,
    seconds: 0,
    started: false,
    won: false,
    timer: null,
  };

  renderG15();
  updateG15Stats();
  updateG15Best();
}

function startG15Timer() {
  clearInterval(g15TimerId);
  g15TimerId = setInterval(() => {
    if (!g15State || g15State.won) return;
    g15State.seconds++;
    updateG15Stats();
  }, 1000);
}

function renderG15() {
  const board = document.getElementById("g15Board");
  if (!board) return;
  board.innerHTML = "";

  for (let i = 0; i < 16; i++) {
    const v = g15State.tiles[i];
    const tile = document.createElement("div");
    tile.className = "g15-tile";

    if (v === 0) {
      tile.classList.add("empty");
    } else {
      tile.textContent = v;
      // подсветка «правильно стоящих»
      if (v === i + 1) tile.classList.add("solved");
      tile.addEventListener("click", () => tryG15Move(i));
    }

    board.appendChild(tile);
  }
}

function tryG15Move(idx) {
  if (!g15State || g15State.won) return;

  const empty = g15State.empty;
  const r1 = Math.floor(idx / 4), c1 = idx % 4;
  const r2 = Math.floor(empty / 4), c2 = empty % 4;

  // можно двигать только соседнюю с пустой
  const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
  if (dist !== 1) return;

  if (!g15State.started) {
    g15State.started = true;
    startG15Timer();
  }

  // swap
  g15State.tiles[empty] = g15State.tiles[idx];
  g15State.tiles[idx] = 0;
  g15State.empty = idx;
  g15State.moves++;

  renderG15();
  updateG15Stats();

  if (isG15Solved()) {
    g15State.won = true;
    // ── FIX: гасим оба таймера ──
    clearInterval(g15State.timer);
    g15State.timer = null;
    clearInterval(g15TimerId);
    g15TimerId = null;
    saveG15Record(g15State.moves, g15State.seconds);
    updateG15Best();
    toast(`◦ 🎉 пятнашки собраны за ${g15State.moves} ходов!`);
  }
}

function isG15Solved() {
  for (let i = 0; i < 15; i++) {
    if (g15State.tiles[i] !== i + 1) return false;
  }
  return g15State.tiles[15] === 0;
}

function saveG15Record(moves, sec) {
  const best = loadG15Best();
  let updated = false;
  if (best.moves === null || moves < best.moves) { best.moves = moves; updated = true; }
  if (best.time === null || sec < best.time) { best.time = sec; updated = true; }
  if (updated) saveG15Best(best);
}

function updateG15Stats() {
  if (!g15State) return;
  document.getElementById("g15Moves").textContent = g15State.moves;
  document.getElementById("g15Time").textContent = fmtTime(g15State.seconds);
}

function updateG15Best() {
  const el = document.getElementById("g15Best");
  if (!el) return;
  const b = loadG15Best();
  if (b.moves === null) {
    el.textContent = "—";
  } else {
    el.textContent = `${b.moves} ходов · ${fmtTime(b.time || 0)}`;
  }
}