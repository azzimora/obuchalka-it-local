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

const THEME_COLORS = ["pink", "blue", "purple", "red", "yellow", "green"];

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
  `;
  wrap.appendChild(panel);

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

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    refreshActive();
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

      // записать помидор
      if (state.mode === "work") {
        markActivity("pomos", 1);
        markActivity("minutes", cfg.work);
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

  let tickInterval = null;
  let lastMode = null;

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

    if (s.running && !tickInterval) {
      tickInterval = setInterval(render, 1000);
    } else if (!s.running && tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
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

  // начальный рендер
  render();
  // тик каждую секунду, даже если таймер стоит — чтобы поймать «время вышло»
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


/* ── Инициализация ── */
function initApp() {
  initTheme();
  initHero();
  initBackButton();
  initHotkeys();
  createThemePanel();
  initPomodoroWidget();
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