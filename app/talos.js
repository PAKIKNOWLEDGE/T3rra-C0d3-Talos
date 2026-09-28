'use strict';

const $ = (id) => document.getElementById(id);
const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const workspace = document.querySelector('.workspace');
const compact = window.matchMedia('(max-width: 980px)');
const state = { snapshot: null, view: 'record', events: [], socket: null, actionCounter: 0, toastTimer: undefined };

function notice(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2800);
}

function recordEvent(kind, description) {
  state.events.push({ kind, description });
}

function nextOperationId(prefix) {
  state.actionCounter += 1;
  return `${prefix}-${Date.now()}-${state.actionCounter}`;
}

function sessionId() {
  return state.snapshot?.session?.sessionId;
}

function phase() {
  const snapshot = state.snapshot;
  if (!snapshot) return '未连接';
  if (snapshot.approvals.some((approval) => approval.status === 'pending')) return '待批准';
  if (snapshot.turn.status === 'running' || snapshot.turn.status === 'stopping') return snapshot.turn.status === 'stopping' ? '正在停止' : '运行中';
  if (snapshot.turn.status === 'cancelled') return '已中止';
  if (snapshot.turn.status === 'failed') return '错误';
  if (snapshot.turn.status === 'completed') return '已完成';
  return snapshot.session.status === 'ready' ? '就绪' : '连接中';
}

function sendAction(action) {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
    notice('本地服务未连接');
    return false;
  }
  state.socket.send(JSON.stringify(action));
  return true;
}

function renderSessions() {
  const snapshot = state.snapshot;
  const hasSession = Boolean(snapshot?.session?.sessionId);
  $('sessionCount').textContent = hasSession ? '01' : '00';
  $('sessionList').innerHTML = hasSession
    ? `<button class="session current" aria-current="true"><span class="session-index">01</span><span><span class="session-name">当前 MiniMax 会话</span><span class="session-meta">${escapeHtml(phase())}</span></span></button>`
    : '<div class="session-empty">等待服务恢复当前会话</div>';
}

function workRow(tool) {
  const title = tool.title || tool.toolCallId;
  const target = tool.locations?.[0] || '引擎未报告路径';
  const status = tool.status || '已收到';
  return `<button class="work-row" data-tool="${escapeHtml(tool.toolCallId)}" aria-label="查看工具：${escapeHtml(title)}"><span class="work-icon">${icon('code')}</span><span><span class="work-name">${escapeHtml(title)}</span><span class="work-target">${escapeHtml(target)}</span></span><span class="work-state">${escapeHtml(status)}</span><span class="work-arrow">↗</span></button>`;
}

function approvalCard(approval) {
  const options = approval.options.map((option) => `<button class="${option.kind === 'reject_once' ? 'neutral-button' : 'primary-button'}" data-approval="${escapeHtml(approval.requestId)}" data-option="${escapeHtml(option.optionId)}">${escapeHtml(option.name)} ↗</button>`).join('');
  return `<section class="approval" aria-labelledby="approvalTitle"><div class="approval-heading"><span>PERMISSION REQUEST</span><span><i></i>等待确认</span></div><div class="approval-body"><h2 id="approvalTitle">引擎请求权限</h2><p>请从引擎提供的选项中选择。此卡片只显示真实 ACP 选项。</p><code>${escapeHtml(approval.toolCallId)}</code></div><div class="approval-actions"><small>选项由引擎提供</small><div>${options}</div></div></section>`;
}

function renderContent() {
  const snapshot = state.snapshot;
  if (state.view === 'events') {
    $('stream').innerHTML = `<p class="event-note">当前服务事件 · 仅显示本页已收到的摘要</p>${state.events.map((event, index) => `<div class="event-row"><time>${String(index + 1).padStart(2, '0')}</time><b>${escapeHtml(event.kind)}</b><p>${escapeHtml(event.description)}</p></div>`).join('')}`;
    return;
  }
  if (!snapshot?.session?.sessionId) {
    $('stream').innerHTML = `<section class="empty"><span class="empty-number">TALOS / CURRENT SESSION</span><h2>等待本地服务。</h2><p>产品入口只观察当前 MiniMax 会话。请先启动本地服务，页面会自动重连并显示快照。</p><button class="suggestion" data-action="reconnect">重新连接服务 ↗</button></section>`;
    return;
  }
  const messages = snapshot.messages.map((message) => `<article class="message"><div class="message-label"><b>${message.role === 'user' ? '你' : 'MINIMAX'}</b><span>${message.role === 'user' ? '指令' : '回复'}</span></div><div class="${message.role === 'user' ? 'user-message' : 'assistant-message'}"><pre>${escapeHtml(message.text)}</pre></div></article>`).join('');
  const tools = snapshot.tools.length ? `<div class="workgroup"><div class="workgroup-head"><b>工具记录</b><span>${String(snapshot.tools.length).padStart(2, '0')} TOOL CALLS</span></div>${snapshot.tools.map(workRow).join('')}</div>` : '';
  const approvals = snapshot.approvals.filter((approval) => approval.status === 'pending').map(approvalCard).join('');
  const errors = snapshot.errors.length ? `<div class="completion halted">${icon('info')}<div><h2>服务错误</h2><p>${escapeHtml(snapshot.errors.at(-1))}</p></div></div>` : '';
  $('stream').innerHTML = `${messages || '<p class="event-note">当前会话尚无消息</p>'}${tools}${approvals}${errors}`;
}

function renderSummary() {
  const snapshot = state.snapshot;
  const tools = snapshot?.tools ?? [];
  $('planCount').textContent = '暂未接入';
  $('plan').innerHTML = '<li><span class="node">—</span><span>计划视图暂未接入<small>仅显示真实会话与工具事实</small></span></li>';
  $('usageValue').textContent = '—';
  $('usageBar').style.width = '0';
  const locations = [...new Set(tools.flatMap((tool) => tool.locations ?? []))];
  $('fileCount').textContent = String(locations.length).padStart(2, '0');
  $('files').innerHTML = locations.length ? locations.map((file) => `${icon('file')}<span>${escapeHtml(file)}</span><b>工具涉及路径</b>`).map((item) => `<li>${item}</li>`).join('') : '<li><span></span><span>未报告路径</span></li>';
}

function render() {
  const snapshot = state.snapshot;
  $('sessionTitle').textContent = snapshot?.session?.sessionId ? '当前 MiniMax 会话' : '等待本地服务';
  $('recordNumber').textContent = snapshot?.session?.sessionId ? '/ 001' : '/ —';
  $('phase').textContent = phase();
  $('phase').dataset.state = snapshot?.turn?.status || 'empty';
  const running = snapshot?.turn?.status === 'running' || snapshot?.turn?.status === 'stopping';
  $('sendButton').hidden = running;
  $('stopButton').hidden = !running;
  $('composerNote').textContent = running ? '当前回合运行中 · 可停止' : snapshot?.connection?.status === 'connected' ? '已连接当前会话 · 输入会发送给 MiniMax' : '等待本地服务连接';
  const engineStatus = document.querySelector('.engine span:last-child');
  if (engineStatus) engineStatus.textContent = snapshot?.connection?.status === 'connected' ? '当前会话 · 已连接' : '当前会话 · 未连接';
  renderSessions();
  renderContent();
  renderSummary();
}

function connect() {
  if (state.socket && state.socket.readyState <= WebSocket.OPEN) return;
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const host = location.host || '127.0.0.1:5193';
  state.socket = new WebSocket(`${protocol}://${host}/ws`);
  state.socket.addEventListener('open', () => { recordEvent('service.connected', '已连接本地观察服务'); notice('已连接本地服务'); });
  state.socket.addEventListener('close', () => { recordEvent('service.disconnected', '本地观察服务断开'); notice('本地服务已断开'); render(); });
  state.socket.addEventListener('error', () => notice('无法连接本地服务'));
  state.socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'snapshot') {
      state.snapshot = message.snapshot;
      recordEvent('service.snapshot', `收到 revision ${message.snapshot.revision}`);
      render();
    }
  });
}

function toggleOverview() {
  if (compact.matches) workspace.classList.toggle('mobile-inspector');
  else workspace.classList.toggle('hide-inspector');
  const visible = compact.matches ? workspace.classList.contains('mobile-inspector') : !workspace.classList.contains('hide-inspector');
  $('overviewToggle').textContent = visible ? '收起概况' : '本轮概况';
  $('overviewToggle').setAttribute('aria-expanded', String(visible));
}

function openDetail(title, label, content) {
  $('detailTitle').textContent = title;
  $('detailLabel').textContent = label;
  $('detailContent').innerHTML = content;
  $('detailDialog').showModal();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.tool) {
    const tool = state.snapshot?.tools.find((item) => item.toolCallId === button.dataset.tool);
    if (tool) openDetail(tool.title || tool.toolCallId, 'TOOL DETAIL', `<dl><dt>状态</dt><dd>${escapeHtml(tool.status || '未报告')}</dd><dt>路径</dt><dd>${escapeHtml((tool.locations || []).join('\n') || '未报告')}</dd></dl><pre>${escapeHtml(JSON.stringify({ input: tool.rawInput, output: tool.rawOutput }, null, 2))}</pre>`);
  }
  if (button.dataset.approval) {
    const id = sessionId();
    if (!id) return;
    sendAction({ type: 'reply_approval', operationId: nextOperationId('approval'), sessionId: id, requestId: button.dataset.approval, optionId: button.dataset.option });
    notice('已提交引擎选项，等待权威结果');
  }
  if (button.dataset.action === 'reconnect') { connect(); notice('正在重新连接本地服务'); }
});

$('recordTab').addEventListener('click', () => { state.view = 'record'; render(); });
$('eventsTab').addEventListener('click', () => { state.view = 'events'; render(); });
$('stopButton').addEventListener('click', () => {
  const id = sessionId();
  if (!id) return notice('当前没有可停止的会话');
  sendAction({ type: 'cancel', operationId: nextOperationId('cancel'), sessionId: id });
  notice('正在停止当前回合');
});
$('overviewToggle').addEventListener('click', toggleOverview);
compact.addEventListener('change', toggleOverview);
$('aboutButton').addEventListener('click', () => openDetail('Talos / 当前产品入口', 'ABOUT THIS PRODUCT', '<p>沿用已验收视觉范本，当前页面只显示真实 MiniMax 单会话事实。</p><p>计划、usage 和文件改动清单暂未接入；路径只标为工具涉及路径，不代表文件已修改。</p>'));
$('closeDetail').addEventListener('click', () => $('detailDialog').close());
$('doneDetail').addEventListener('click', () => $('detailDialog').close());
$('composer').addEventListener('submit', (event) => {
  event.preventDefault();
  const prompt = $('prompt').value.trim();
  const id = sessionId();
  if (!prompt) return notice('先输入一条指令');
  if (!id) return notice('当前没有可发送的会话');
  if (state.snapshot?.turn?.status === 'running' || state.snapshot?.turn?.status === 'stopping') return notice('当前回合仍在运行');
  sendAction({ type: 'send_prompt', operationId: nextOperationId('prompt'), sessionId: id, prompt });
  recordEvent('user.prompt', prompt);
  $('prompt').value = '';
});
$('prompt').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('composer').requestSubmit(); }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('detailDialog').open && (state.snapshot?.turn?.status === 'running')) $('stopButton').click();
});

render();
connect();
