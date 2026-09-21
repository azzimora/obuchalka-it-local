/* ═══════════════════════════════════════════
   обучалка local adaptation · общий скрипт
   прогресс · сохранение · темы · тосты
   статистика · активность · бэкап · hero · кнопка назад
   ═══════════════════════════════════════════ */

const STORAGE_KEY = "local-adaptation-v1";
const THEME_KEY = "local-adaptation-theme";
const ACTIVITY_KEY = "local-adaptation-activity";
const BACKUP_KEY = "local-adaptation-lastbackup";

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

/* ═══════════════════════════════════════════
   ТЕМЫ
   ═══════════════════════════════════════════ */

const THEME_COLORS = ["pink", "blue", "purple", "red", "cyan"];

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

  // на главной корня — кнопки нет
  const isRootIndex = file === "index.html" && !path.includes("/web/") && !path.includes("/ai/") && !path.includes("/python/") && !path.includes("/_shared/");
  if (isRootIndex) return;

  // определяем, куда вести
  let href = null;

  if (path.includes("/web/") || path.includes("/ai/") || path.includes("/python/")) {
    // мы внутри раздела
    const isIndex = file === "index.html";
    if (isIndex) {
      // оглавление раздела → на главную
      href = "../index.html";
    } else {
      // урок → в оглавление раздела
      href = "index.html";
    }
  } else if (path.includes("/_shared/")) {
    // кабинет → на главную
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

/* ── Инициализация ── */
function initApp() {
  initTheme();
  initHero();
  initBackButton();
  initHotkeys();
  createThemePanel();
}

document.addEventListener("DOMContentLoaded", initApp);

/* ── PWA: регистрация service worker ── */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
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