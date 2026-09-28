'use strict';

// 独立视觉样张：所有内容均为本地演示数据，不连接引擎、不访问项目文件。
const $ = (id) => document.getElementById(id);
const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const sessions = [
  { id: 3, title: '抽取主题令牌', meta: '今天 · 等待批准', scene: 'approval', prompt: '把 dashboard 里的颜色抽成主题令牌。先处理工作台，legacy 目录暂时不要动。' },
  { id: 2, title: '梳理工作区结构', meta: '今天 · 已完成', scene: 'complete', prompt: '只读检查当前目录，说明页面入口、组件和样式分别放在哪里。' },
  { id: 1, title: '整理项目说明', meta: '昨天 · 已完成', scene: 'complete', prompt: '整理 README，补上启动方式与目录说明。' },
];
const workOrders = [
  { id: 1, title: '查找硬编码颜色', icon: 'search', target: 'src/dashboard/**/*.css', result: '23 处匹配 · 6 个文件', output: 'src/dashboard/shell.css:8    #202321\nsrc/dashboard/panels.css:14  #292c29\nsrc/dashboard/actions.css:3 #f4eb16\n\n共 23 处匹配；此列表是视觉演示数据。' },
  { id: 2, title: '整理主题令牌', icon: 'file', target: 'src/theme/tokens.css', result: '已完成 · 新增 12 行', output: ':root {\n  --surface-base: #202321;\n  --surface-panel: #292c29;\n  --action-primary: #f4eb16;\n  --text-primary: #e9e9e3;\n  --text-secondary: #9c9d98;\n}\n\n[demo] 样例输出，不会写入实际文件。' },
  { id: 3, title: '替换工作台引用', icon: 'code', target: 'src/dashboard/{shell,panels}.css', result: '已完成 · 修改 2 个文件', output: '- background: #202321;\n+ background: var(--surface-base);\n\n- color: #e9e9e3;\n+ color: var(--text-primary);\n\n[demo] 差异仅用于展示。' },
  { id: 4, title: '验证样式引用', icon: 'terminal', target: 'npm run lint:css', result: '检查通过', output: '> atlas@0.1.0 lint:css\n\nsrc/theme/tokens.css       PASS\nsrc/dashboard/shell.css    PASS\nsrc/dashboard/panels.css   PASS\n\n[demo] 以上为预设结果，未执行命令。' },
];
let activeId = 3;
let view = 'record';
let runTimer;
let toastTimer;
let eventLog = [];
const workspace = document.querySelector('.workspace');
const compact = window.matchMedia('(max-width: 980px)');

const current = () => sessions.find((session) => session.id === activeId);
function notice(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2800);
}
function recordEvent(kind, description) {
  eventLog.push({ kind, description });
}
function animateStream() {
  const stream = $('stream');
  stream.classList.remove('switch-in');
  void stream.offsetWidth;
  stream.classList.add('switch-in');
}
function renderSessions() {
  $('sessionCount').textContent = String(sessions.length).padStart(2, '0');
  $('sessionList').innerHTML = sessions.map((session) => `<button class="session ${session.id === activeId ? 'current' : ''}" data-session="${session.id}" ${session.id === activeId ? 'aria-current="true"' : ''}><span class="session-index">${String(session.id).padStart(2, '0')}</span><span><span class="session-name">${escapeHtml(session.title)}</span><span class="session-meta">${escapeHtml(session.meta)}</span></span></button>`).join('');
}
function workRow(order, running = false) {
  return `<button class="work-row ${running ? 'running' : ''}" data-work="${order.id}" aria-label="查看工单：${escapeHtml(order.title)}"><span class="work-icon">${icon(order.icon)}</span><span><span class="work-name">${escapeHtml(order.title)}</span><span class="work-target">${escapeHtml(order.target)}</span></span><span class="work-state">${running ? '运行中' : '已完成'}</span><span class="work-arrow">↗</span></button>`;
}
function approvalCard() {
  return `<section class="approval" aria-labelledby="approvalTitle"><div class="approval-heading"><span>PERMISSION REQUEST / 004</span><span><i></i>等待确认</span></div><div class="approval-body"><h2 id="approvalTitle">扩展到 legacy 目录？</h2><p>工作台仍引用这里的 4 处颜色。继续替换需要超出你最初允许的范围，请确认是否继续。</p><code>src/legacy/_colors.css</code></div><div class="approval-actions"><small>仅允许本次操作</small><div><button class="neutral-button" data-action="reject">拒绝</button><button class="primary-button" data-action="approve">批准并继续 ↗</button></div></div></section>`;
}
function renderContent() {
  const session = current();
  if (view === 'events') {
    $('stream').innerHTML = `<p class="event-note">当前样张的交互记录 · 非引擎协议报文</p>` + eventLog.map((event, index) => `<div class="event-row"><time>${String(index + 1).padStart(2, '0')}</time><b>${escapeHtml(event.kind)}</b><p>${escapeHtml(event.description)}</p></div>`).join('');
    return;
  }
  if (session.scene === 'empty') {
    $('stream').innerHTML = `<section class="empty"><span class="empty-number">TALOS / SESSION ${String(session.id).padStart(3, '0')}</span><h2>从一条指令开始。</h2><p>选好工作区，然后告诉代理要完成什么。你可以随时查看过程、补充说明，或停止当前任务。</p><button class="suggestion" data-action="suggest">试一试：梳理当前项目结构 ↗</button></section>`;
    return;
  }
  const themeTask = session.id === 3;
  const orders = themeTask ? workOrders.slice(0, 3) : [workOrders[0]];
  const extra = session.extraPrompt ? `<article class="message"><div class="message-label"><b>你</b><span>补充指令</span></div><div class="user-message">${escapeHtml(session.extraPrompt)}</div></article>` : '';
  const intro = themeTask ? '已整理工作台中的 <strong>23 处颜色引用</strong>。主题令牌按背景、文字和操作色分组，接下来检查旧目录的依赖。' : session.id === 2 ? '项目按页面入口、业务组件和主题样式组织。已完成目录检查，以下为演示记录。' : session.id === 1 ? '项目说明已整理为简介、启动步骤和目录索引。以下为演示记录。' : '收到。在真实产品中，这里会展示代理的执行过程。当前用一段本地样例演示运行与完成状态。';
  let ending = '';
  if (session.scene === 'approval') ending = approvalCard();
  if (session.scene === 'running') ending = `<div class="workgroup"><div class="workgroup-head"><b>当前工单</b><span>IN PROGRESS</span></div>${workRow(workOrders[3], true)}</div>`;
  if (session.scene === 'complete') ending = `<div class="completion">${icon('check')}<div><h2>本轮已完成</h2><p>${themeTask ? '主题令牌已整理，样式检查通过。' : '演示流程结束，可以继续输入指令。'}</p></div></div>`;
  if (session.scene === 'halted') ending = `<div class="completion halted">${icon('info')}<div><h2>${session.rejected ? '本次请求已拒绝' : '本轮已中止'}</h2><p>${session.rejected ? '保留已完成的工作，legacy 目录保持不变。' : '演示计时已停止，你可以继续输入指令。'}</p></div></div>`;
  $('stream').innerHTML = `<article class="message"><div class="message-label"><b>你</b><span>指令 / 01</span><time>14:02</time></div><div class="user-message">${escapeHtml(session.prompt)}</div></article><article class="message"><div class="message-label"><b>MINIMAX</b><span>回复</span><time>14:03</time></div><div class="assistant-message"><p>${intro}</p></div></article><div class="workgroup"><div class="workgroup-head"><b>工单记录</b><span>${String(orders.length).padStart(2, '0')} WORK ORDERS</span></div>${orders.map((order) => workRow(order)).join('')}</div>${extra}${ending}`;
}
function renderSummary() {
  const session = current();
  const empty = session.scene === 'empty';
  const complete = session.scene === 'complete';
  $('planCount').textContent = empty ? '00 / 00' : complete ? '03 / 03' : '02 / 03';
  const steps = session.id === 3 ? ['定位颜色引用', '抽取并替换令牌', '验证依赖与样式'] : ['了解任务范围', '整理执行结果', '核对与交付'];
  $('plan').innerHTML = empty ? '<li><span class="node">—</span><span>等待第一条指令<small>开始后展示本轮步骤</small></span></li>' : steps.map((step, i) => `<li class="${i === 2 && !complete ? 'now' : ''}"><span class="node">${i < 2 || complete ? icon('check') : '03'}</span><span>${step}<small>${i < 2 || complete ? '已完成' : session.scene === 'approval' ? '等待你的批准' : session.scene === 'halted' ? '未继续执行' : '正在检查'}</small></span></li>`).join('');
  $('usageValue').innerHTML = empty ? '—' : '24.8<small>K</small>';
  $('usageBar').style.width = empty ? '0' : '12.4%';
  const files = session.id === 3 ? ['theme/tokens.css', 'dashboard/shell.css', 'dashboard/panels.css'] : session.id === 1 ? ['README.md'] : [];
  $('fileCount').textContent = String(empty ? 0 : files.length).padStart(2, '0');
  $('files').innerHTML = empty || !files.length ? '<li><span></span><span>暂无文件改动</span></li>' : files.map((file) => `<li>${icon('file')}<span>${file}</span><b>${file.includes('tokens') ? '新增' : '修改'}</b></li>`).join('');
}
function render() {
  const session = current();
  const labels = { approval: '待批准', running: '运行中', complete: '已完成', empty: '就绪', halted: session.rejected ? '已拒绝' : '已中止' };
  $('sessionTitle').textContent = session.title;
  $('recordNumber').textContent = `/ ${String(session.id).padStart(3, '0')}`;
  $('phase').textContent = labels[session.scene];
  $('phase').dataset.state = session.scene;
  $('sendButton').hidden = session.scene === 'running';
  $('stopButton').hidden = session.scene !== 'running';
  $('composerNote').textContent = session.scene === 'approval' ? '等待你的批准 · 可先补充指令' : session.scene === 'running' ? '运行演示中 · 约 6 秒后完成' : '本地视觉样张 · 输入不会发送给模型';
  document.querySelectorAll('[data-scene]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.scene === session.scene)));
  renderSessions(); renderContent(); renderSummary();
}
function changeScene(scene) {
  clearTimeout(runTimer);
  current().scene = scene;
  current().rejected = false;
  current().meta = `今天 · ${{ approval: '等待批准', running: '运行中', complete: '已完成', empty: '未开始', halted: '已中止' }[scene]}`;
  recordEvent('demo.state', `切换到${current().meta.split(' · ')[1]}`);
  render(); animateStream();
  if (scene === 'running') {
    const runId = activeId;
    runTimer = setTimeout(() => { if (activeId === runId) changeScene('complete'); }, 6000);
  }
}
function selectSession(id) {
  clearTimeout(runTimer);
  if (current().scene === 'running') { current().scene = 'halted'; current().meta = '今天 · 演示已停止'; }
  activeId = id;
  view = 'record';
  $('prompt').value = '';
  eventLog = [{ kind: 'demo.session', description: '打开本地样例会话' }];
  setView('record');
  render(); animateStream(); $('log').scrollTop = 0;
}
function newSession() {
  const id = Math.max(...sessions.map((session) => session.id)) + 1;
  sessions.unshift({ id, title: '新的会话', meta: '今天 · 未开始', scene: 'empty', prompt: '' });
  selectSession(id); $('prompt').focus();
}
function setView(next) {
  view = next;
  for (const [id, name] of [['recordTab', 'record'], ['eventsTab', 'events']]) {
    $(id).classList.toggle('active', next === name);
    $(id).setAttribute('aria-pressed', String(next === name));
  }
  renderContent(); animateStream();
}
function openDetail(title, label, content) {
  $('detailTitle').textContent = title;
  $('detailLabel').textContent = label;
  $('detailContent').innerHTML = content;
  $('detailDialog').showModal();
}
function toggleOverview() {
  if (compact.matches) workspace.classList.toggle('mobile-inspector');
  else workspace.classList.toggle('hide-inspector');
  syncOverview();
}
function syncOverview() {
  const visible = compact.matches ? workspace.classList.contains('mobile-inspector') : !workspace.classList.contains('hide-inspector');
  $('overviewToggle').textContent = visible ? '收起概况' : '本轮概况';
  $('overviewToggle').setAttribute('aria-expanded', String(visible));
}
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.session) selectSession(Number(button.dataset.session));
  if (button.dataset.scene) {
    if (button.dataset.scene !== 'empty' && activeId !== 3) selectSession(3);
    setView('record'); changeScene(button.dataset.scene); $('log').scrollTop = 0;
  }
  if (button.dataset.work) {
    const order = workOrders.find((item) => item.id === Number(button.dataset.work));
    const running = order.id === 4 && current().scene === 'running';
    openDetail(order.title, `WORK ORDER / ${String(order.id).padStart(3, '0')}`, `<dl><dt>目标</dt><dd>${escapeHtml(order.target)}</dd><dt>状态</dt><dd>${running ? '运行演示中' : escapeHtml(order.result)}</dd></dl><p>以下内容来自本地样例，不是实际引擎输出。</p><pre>${escapeHtml(running ? '> npm run lint:css\n[demo] 正在检查样式引用…' : order.output)}</pre>`);
  }
  if (button.dataset.mode) {
    document.querySelectorAll('[data-mode]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    notice(`已切换到${button.dataset.mode}模式（仅样张）`);
  }
  if (button.dataset.action === 'approve') { changeScene('running'); notice('已批准本次操作，开始演示验证过程'); }
  if (button.dataset.action === 'reject') {
    changeScene('halted'); current().rejected = true; current().meta = '今天 · 已拒绝'; recordEvent('demo.permission', '拒绝扩展到 legacy 目录'); render(); notice('已拒绝，保留现有工作');
  }
  if (button.dataset.action === 'suggest') { $('prompt').value = '只读梳理当前项目结构，说明入口、组件与样式的位置。'; $('prompt').focus(); }
});
$('newSession').addEventListener('click', newSession);
$('recordTab').addEventListener('click', () => setView('record'));
$('eventsTab').addEventListener('click', () => setView('events'));
$('stopButton').addEventListener('click', () => changeScene('halted'));
$('overviewToggle').addEventListener('click', toggleOverview);
compact.addEventListener('change', syncOverview);
$('model').addEventListener('change', () => notice('演示模型选项已切换，尚未连接后端'));
$('aboutButton').addEventListener('click', () => openDetail('Talos / 视觉样张 01', 'ABOUT THIS SPECIMEN', '<p>以终末地装配站与任务列表为主要参考：浅色结构面、深色阅读区、黄色操作块。</p><p>会话、工单、计划、文件与模型均为本地演示数据。可以切换状态、查看工单、批准或拒绝请求。运行演示约 6 秒后完成；切换会话会停止旧演示。</p><p>此页不连接 MiniMax、不执行命令，也不读写你的项目文件。完整后端能力将在视觉验收后单独确定。</p>'));
$('closeDetail').addEventListener('click', () => $('detailDialog').close());
$('doneDetail').addEventListener('click', () => $('detailDialog').close());
$('detailDialog').addEventListener('click', (event) => {
  if (event.target !== $('detailDialog')) return;
  const rect = $('detailDialog').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('detailDialog').close();
});
$('composer').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('prompt').value.trim();
  if (!text) { notice('先输入一条指令'); $('prompt').focus(); return; }
  if (current().scene === 'running') { notice('请等待这段演示完成，或先中止'); return; }
  if (current().scene === 'approval') { current().extraPrompt = text; notice('补充指令已展示；待批准请求仍由你决定'); }
  else {
    current().prompt = text; current().extraPrompt = '';
    if (current().scene === 'empty') current().title = text.slice(0, 18);
    changeScene('running');
  }
  $('prompt').value = ''; recordEvent('demo.prompt', text); setView('record'); render();
  $('log').scrollTop = $('log').scrollHeight;
});
$('prompt').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('composer').requestSubmit(); }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('detailDialog').open) {
    if (workspace.classList.contains('mobile-inspector')) { workspace.classList.remove('mobile-inspector'); syncOverview(); }
    else if (current().scene === 'running') changeScene('halted');
  }
});
recordEvent('demo.session', '打开主题令牌样例');
recordEvent('demo.permission', '等待批准 legacy 目录操作');
render(); syncOverview();
