const root = document.documentElement;
const splash = document.getElementById('splash');
const prompt = document.getElementById('prompt');
const note = document.getElementById('composerNote');
const sessionList = document.getElementById('sessionList');
const sessionCount = document.getElementById('sessionCount');
const planCount = document.getElementById('planCount');
const usageValue = document.getElementById('usageValue');
const showEmpty = document.getElementById('showEmpty');
const showWork = document.getElementById('showWork');

const emptyList = `<p class="session-empty">这个工作区还没有活。<small>点「新建会话」或在下方下达第一条指令。</small></p>`;
const workList = `<button type="button" class="session" id="openSession"><span class="session-index">01</span><span><span class="session-name">评估项目并制定救援计划</span><span class="session-meta">刚刚 · 本机</span></span></button>`;

let splashTimer;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setLayer(layer) {
  root.dataset.layer = layer;
  showEmpty.setAttribute('aria-pressed', String(layer === 'empty'));
  showWork.setAttribute('aria-pressed', String(layer === 'work'));
  if (layer === 'empty') {
    sessionList.innerHTML = emptyList;
    sessionCount.textContent = '00';
    planCount.textContent = '—';
    usageValue.textContent = '—';
    note.textContent = '就绪 · 空任务层';
  } else {
    sessionList.innerHTML = workList;
    sessionCount.textContent = '01';
    planCount.textContent = '02';
    usageValue.innerHTML = '18<small>%</small>';
    note.textContent = '已完成 · 可继续发送';
    document.getElementById('openSession')?.addEventListener('click', () => setLayer('work'));
  }
}

function endSplash() {
  clearTimeout(splashTimer);
  if (root.dataset.phase === 'empty' || root.dataset.phase === 'work') return;
  root.dataset.phase = 'empty';
  setLayer('empty');
  window.setTimeout(() => prompt.focus(), 280);
}

function playSplash() {
  setLayer('empty');
  if (reducedMotion()) {
    root.dataset.phase = 'empty';
    return;
  }
  clearTimeout(splashTimer);
  root.dataset.phase = 'splash';
  splash.querySelectorAll('.splash-grid, .splash-plane, .splash-scan, .splash-emblem, .splash-emblem i, .splash-word span, .splash-word b, .splash-sub, .splash-skip').forEach((el) => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
  splashTimer = window.setTimeout(endSplash, 2200);
}

splash.addEventListener('click', endSplash);
document.addEventListener('keydown', (event) => {
  if (root.dataset.phase === 'splash' && (event.key === 'Enter' || event.key === 'Escape' || event.key === ' ')) {
    event.preventDefault();
    endSplash();
  }
});

document.getElementById('replaySplash').addEventListener('click', playSplash);
document.getElementById('newSession').addEventListener('click', () => {
  if (root.dataset.phase === 'splash') return;
  setLayer('empty');
  prompt.focus();
});
document.getElementById('composer').addEventListener('submit', (event) => {
  event.preventDefault();
  if (root.dataset.phase === 'splash') return;
  setLayer('work');
  prompt.value = '';
});
prompt.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    document.getElementById('composer').requestSubmit();
  }
});
showEmpty.addEventListener('click', () => {
  if (root.dataset.phase === 'splash') endSplash();
  setLayer('empty');
});
showWork.addEventListener('click', () => {
  if (root.dataset.phase === 'splash') endSplash();
  setLayer('work');
});
document.querySelectorAll('.mode-switch button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.mode-switch button').forEach((item) => {
      item.setAttribute('aria-pressed', String(item === button));
    });
  });
});

root.dataset.layer = 'empty';
if (reducedMotion()) endSplash();
else splashTimer = window.setTimeout(endSplash, 2200);
