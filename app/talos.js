'use strict';

const $ = (id) => document.getElementById(id);
const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const workspace = document.querySelector('.workspace');
const compact = window.matchMedia('(max-width: 980px)');
const state = {
  snapshot: null,
  view: 'record',
  events: [],
  socket: null,
  actionCounter: 0,
  toastTimer: undefined,
  modelMenuOpen: false,
  slashMenuOpen: false,
  slashHighlight: 0,
};

/** User-visible copy only — no protocol, transport, or dev-bridge wording. */
const ui = {
  connected: '已连接',
  disconnected: '未连接',
  preparing: '准备中',
  ready: '就绪',
  composerRunning: '当前回合运行中 · 可停止',
  composerReady: 'Enter 发送 · Shift + Enter 换行',
  composerSlashHint: '输入 / 浏览命令',
  slashMenuEmpty: '命令列表同步中…可直接输入 /help 发送',
  composerOffline: '未连接 · 请先启动 Talos',
  composerPreparing: '正在准备会话…',
  engineOnline: 'Talos · 在线',
  enginePreparing: 'Talos · 准备中',
  engineOffline: 'Talos · 离线',
  footnoteOnline: '已连接',
  footnotePreparing: '准备会话',
  footnoteOffline: '未连接',
  workspacePathPending: '等待工作区路径',
  workspacePathLabel: '工作区路径',
  sessionEmpty: '这个工作区还没有活。点「新建会话」开始第一条。',
  sessionWaiting: '等待会话恢复',
  sessionListFailed: '无法列出历史活',
  sessionSwitchBlocked: '当前这条活还在生成。请先停止，再切换或新建。',
  sessionLoading: '正在打开这条活…',
  sessionCreating: '正在新建…',
  sessionDeleting: '正在删除…',
  sessionDeleteConfirm: '确定删除这条活？删除后无法从列表恢复。',
  sessionDeleteBlocked: '生成中不能删除。请先停止。',
  sessionDeleteUnsupported: '当前 Talos 版本不支持删除。请升级到 0.1.3。',
  emptyTitle: '尚未开始会话',
  emptyBody: '连接后即可在此继续当前工作。',
  emptyAction: '重新连接',
  planEmpty: '暂无计划',
  planEmptyHint: '有步骤时会显示在这里',
  usageEmpty: '暂无用量数据',
  usageUnreported: '引擎未报告用量',
  pathUnknown: '—',
  fileTag: '相关文件',
  approvalTitle: '需要你的确认',
  approvalBody: '请选择一项以继续或拒绝本次操作。',
  approvalOptions: '可用选项',
  errorTitle: '出现问题',
  eventLogTitle: '连接与状态记录',
  aboutBody:
    '<p>Talos 桌面控制台是当前工作区的工作室窗口：左侧是这个项目里的活，中间是记录，底部发指令。</p><p>须先在本机安装 Talos CLI；本窗口与终端 TUI 并存，不互相取代。</p><p>一次只能生成一条活。引擎广告的斜杠命令可在输入框用 <code>/命令</code> 发送。</p>',
  workspaceSwitching: '正在切换工作区…',
  workspaceSwitched: '工作区已切换',
  workspaceSwitchFailed: '无法切换工作区',
  modeSwitching: '正在切换模式…',
  modelSwitching: '正在切换模型…',
};

function notice(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2800);
}

function recordEvent(kind, description) {
  state.events.push({ kind, description });
}

function eventLabel(kind) {
  const labels = {
    'service.connected': ui.connected,
    'service.disconnected': '连接已断开',
    'service.snapshot': '状态已更新',
    'user.prompt': '已发送指令',
  };
  return labels[kind] ?? '记录';
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
  if (snapshot.turn.status === 'running' || snapshot.turn.status === 'stopping') {
    return snapshot.turn.status === 'stopping' ? '正在停止' : '运行中';
  }
  if (snapshot.turn.status === 'cancelled') return '已中止';
  if (snapshot.turn.status === 'failed') return '错误';
  if (snapshot.turn.status === 'completed') return '已完成';
  return snapshot.session.status === 'ready' ? '就绪' : '连接中';
}

function phaseState() {
  const snapshot = state.snapshot;
  if (!snapshot?.session?.sessionId) return 'empty';
  if (snapshot.approvals.some((a) => a.status === 'pending')) return 'halted';
  if (snapshot.turn.status === 'completed') return 'complete';
  if (snapshot.turn.status === 'running' || snapshot.turn.status === 'stopping') return 'running';
  return 'empty';
}

function sendAction(action) {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
    notice(ui.disconnected);
    return false;
  }
  state.socket.send(JSON.stringify(action));
  return true;
}

function basename(path) {
  if (!path) return '工作区';
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

function renderWorkspaceMeta() {
  const snapshot = state.snapshot;
  const cwd = snapshot?.session?.cwd;
  const connected = snapshot?.connection?.status === 'connected';
  const titleEl = $('workspaceTitle');
  const subtitle = $('workspaceSubtitle');
  const titleText = cwd ? basename(cwd) : '工作区';
  let titleName = titleEl.querySelector('.workspace-title-name');
  if (!titleName) {
    for (const node of [...titleEl.childNodes]) {
      if (node !== subtitle && node.nodeType === Node.TEXT_NODE) node.remove();
    }
    titleName = document.createElement('span');
    titleName.className = 'workspace-title-name';
    titleEl.insertBefore(titleName, subtitle);
  }
  titleName.textContent = titleText;
  $('workspaceSubtitle').textContent = cwd ? ui.workspacePathLabel : ui.workspacePathPending;
  const pathEl = $('workspacePath');
  pathEl.textContent = cwd || '—';
  pathEl.title = cwd || '';
  $('branchLabel').textContent = connected ? '已连接' : '—';
  $('branchMeta').textContent = connected ? ui.connected : ui.disconnected;
  $('statusDisconnected').dataset.active = connected ? 'false' : 'true';
  $('statusConnected').dataset.active = connected ? 'true' : 'false';
}

function compactModelLabel(name) {
  if (!name) return '—';
  const base = String(name).replace(/\s*·\s*thinking$/i, '').trim();
  return base.length > 28 ? `${base.slice(0, 26)}…` : base;
}

function wireSessionControlHandlers() {
  const modeButtonsHost = $('modeButtonsHost');
  if (modeButtonsHost && !modeButtonsHost.dataset.wired) {
    modeButtonsHost.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-mode-id]');
      if (!button || button.disabled) return;
      const activeId = sessionId();
      const activeCtx = state.snapshot?.context ?? {};
      const modeId = button.dataset.modeId;
      if (!activeId || !modeId || modeId === activeCtx.currentModeId) return;
      sendAction({
        type: 'set_mode',
        operationId: nextOperationId('mode'),
        sessionId: activeId,
        modeId,
      });
      notice(ui.modeSwitching);
    });
    modeButtonsHost.dataset.wired = '1';
  }
  const modelTrigger = $('modelTrigger');
  const modelMenu = $('modelMenu');
  if (modelTrigger && !modelTrigger.dataset.wired) {
    modelTrigger.addEventListener('click', (event) => {
      event.stopPropagation();
      if (modelTrigger.disabled) return;
      if (state.modelMenuOpen) closeModelMenu();
      else openModelMenu();
    });
    modelMenu?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-model-value]');
      if (!button) return;
      pickModel(button.dataset.modelValue);
    });
    document.addEventListener('click', () => {
      if (state.modelMenuOpen) closeModelMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.modelMenuOpen) closeModelMenu();
    });
    modelTrigger.dataset.wired = '1';
  }
}

function slashPrefixFromPrompt(value) {
  const trimmed = value.trimStart();
  if (!trimmed.startsWith('/')) return null;
  const body = trimmed.slice(1);
  if (!body.length) return '';
  if (/\s/.test(body)) return null;
  return body.toLowerCase();
}

function advertisedSlashCommands() {
  return state.snapshot?.context?.availableCommands ?? [];
}

function filteredSlashCommands(prefix) {
  const commands = advertisedSlashCommands();
  if (prefix === null) return [];
  if (prefix === '') return commands;
  return commands.filter((command) => command.name.toLowerCase().startsWith(prefix));
}

function closeSlashMenu() {
  const menu = $('slashMenu');
  if (!menu) return;
  menu.hidden = true;
  state.slashMenuOpen = false;
  state.slashHighlight = 0;
}

function applySlashCommand(name) {
  const prompt = $('prompt');
  if (!prompt || !name) return;
  prompt.value = `/${name} `;
  closeSlashMenu();
  prompt.focus();
}

function renderSlashMenu() {
  const menu = $('slashMenu');
  const prompt = $('prompt');
  if (!menu || !prompt) return;
  const prefix = slashPrefixFromPrompt(prompt.value);
  const matches = filteredSlashCommands(prefix);
  if (prefix === null || !sessionId()) {
    closeSlashMenu();
    return;
  }
  if (!matches.length) {
    menu.innerHTML = `<li><span class="slash-empty">${escapeHtml(ui.slashMenuEmpty)}</span></li>`;
    menu.hidden = false;
    state.slashMenuOpen = true;
    return;
  }
  if (state.slashHighlight >= matches.length) state.slashHighlight = 0;
  if (state.slashHighlight < 0) state.slashHighlight = matches.length - 1;
  menu.innerHTML = matches
    .map((command, index) => {
      const hint = command.inputHint ? ` · ${command.inputHint}` : '';
      const desc = `${command.description ?? ''}${hint}`.trim();
      return `<li><button type="button" data-slash-name="${escapeHtml(command.name)}" role="option" aria-selected="${index === state.slashHighlight ? 'true' : 'false'}"><span class="slash-name">/${escapeHtml(command.name)}</span><span class="slash-desc">${escapeHtml(desc)}</span></button></li>`;
    })
    .join('');
  menu.hidden = false;
  state.slashMenuOpen = true;
}

function wireSlashCommandHandlers() {
  const prompt = $('prompt');
  const menu = $('slashMenu');
  if (!prompt || prompt.dataset.slashWired) return;
  prompt.addEventListener('input', () => {
    state.slashHighlight = 0;
    renderSlashMenu();
  });
  menu?.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  menu?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-slash-name]');
    if (!button) return;
    applySlashCommand(button.dataset.slashName);
  });
  prompt.dataset.slashWired = '1';
}

function closeModelMenu() {
  const menu = $('modelMenu');
  const trigger = $('modelTrigger');
  if (!menu || !trigger) return;
  menu.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  state.modelMenuOpen = false;
}

function openModelMenu() {
  const menu = $('modelMenu');
  const trigger = $('modelTrigger');
  if (!menu || !trigger || menu.hidden && !menu.children.length) return;
  menu.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  state.modelMenuOpen = true;
}

function pickModel(value) {
  const activeId = sessionId();
  const activeCtx = state.snapshot?.context ?? {};
  if (!activeId || !value || value === activeCtx.currentModelValue) {
    closeModelMenu();
    return;
  }
  sendAction({
    type: 'set_config_option',
    operationId: nextOperationId('model'),
    sessionId: activeId,
    configId: activeCtx.modelConfigId ?? 'model',
    value,
  });
  notice(ui.modelSwitching);
  closeModelMenu();
}

function renderSessionControls() {
  wireSessionControlHandlers();
  const snapshot = state.snapshot;
  const ctx = snapshot?.context ?? {};
  const sid = sessionId();
  const editable = Boolean(sid && snapshot?.connection?.status === 'connected');
  const running = snapshot?.turn?.status === 'running' || snapshot?.turn?.status === 'stopping';
  const modeButtonsHost = $('modeButtonsHost');
  const modeReadonly = $('modeValue');
  const modelTrigger = $('modelTrigger');
  const modelTriggerLabel = $('modelTriggerLabel');
  const modelMenu = $('modelMenu');
  const modelReadonly = $('modelValue');
  const modes = ctx.availableModes ?? [];
  const models = ctx.modelOptions ?? [];
  const currentMode = ctx.currentModeId ?? modes[0]?.id;
  const currentModel = ctx.currentModelValue ?? models[0]?.value;
  const showModeButtons = editable && !running && modes.length > 0;

  if (showModeButtons) {
    modeReadonly.hidden = true;
    const signature = `${modes.map((m) => m.id).join('|')}:${currentMode}:${running}`;
    if (modeButtonsHost.dataset.sig !== signature) {
      modeButtonsHost.dataset.sig = signature;
      modeButtonsHost.innerHTML = modes
        .map(
          (m) =>
            `<button type="button" data-mode-id="${escapeHtml(m.id)}" aria-pressed="${m.id === currentMode ? 'true' : 'false'}"${running ? ' disabled' : ''}>${escapeHtml(m.name)}</button>`,
        )
        .join('');
    } else {
      modeButtonsHost.querySelectorAll('button[data-mode-id]').forEach((button) => {
        button.setAttribute('aria-pressed', button.dataset.modeId === currentMode ? 'true' : 'false');
        button.disabled = running;
      });
    }
  } else {
    modeButtonsHost.dataset.sig = '';
    modeButtonsHost.innerHTML = '';
    modeReadonly.hidden = false;
    modeReadonly.textContent = ctx.modeLabel ?? '—';
  }

  const showModelPicker = editable && !running && models.length > 0 && ctx.modelConfigId;
  if (showModelPicker) {
    modelReadonly.hidden = true;
    modelTrigger.hidden = false;
    modelTrigger.disabled = running;
    const current = models.find((m) => m.value === currentModel);
    const fullLabel = current?.name ?? ctx.modelLabel ?? '—';
    modelTriggerLabel.textContent = compactModelLabel(fullLabel);
    modelTrigger.title = fullLabel;
    const optionSig = `${models.map((m) => m.value).join('|')}:${currentModel}`;
    if (modelMenu.dataset.sig !== optionSig) {
      modelMenu.dataset.sig = optionSig;
      modelMenu.innerHTML = models
        .map(
          (m) =>
            `<li role="presentation"><button type="button" role="option" data-model-value="${escapeHtml(m.value)}" aria-selected="${m.value === currentModel ? 'true' : 'false'}">${escapeHtml(m.name)}</button></li>`,
        )
        .join('');
      if (state.modelMenuOpen) closeModelMenu();
    }
  } else {
    closeModelMenu();
    modelTrigger.hidden = true;
    modelMenu.hidden = true;
    modelMenu.dataset.sig = '';
    modelReadonly.hidden = false;
    modelReadonly.textContent = compactModelLabel(ctx.modelLabel);
    modelReadonly.title = ctx.modelLabel ?? '';
  }
}

function sessionLabel(item) {
  if (item?.title) return item.title;
  const id = item?.sessionId || '';
  if (!id) return '未命名';
  return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

function formatSessionTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    date,
  );
}

function listedSessions() {
  return state.snapshot?.sessions ?? [];
}

function turnRunning() {
  const status = state.snapshot?.turn?.status;
  return status === 'running' || status === 'stopping';
}

function workspaceCwd() {
  return state.snapshot?.session?.cwd;
}

function currentSessionTitle() {
  const id = sessionId();
  if (!id) return '等待连接';
  const item = listedSessions().find((row) => row.sessionId === id);
  return item ? sessionLabel(item) : '当前 Talos 会话';
}

function currentSessionRecordNumber() {
  const id = sessionId();
  if (!id) return '/ —';
  const index = listedSessions().findIndex((row) => row.sessionId === id);
  return index >= 0 ? `/ ${String(index + 1).padStart(3, '0')}` : '/ 001';
}

function requestNewSession() {
  const cwd = workspaceCwd();
  if (!cwd) return notice(ui.workspacePathPending);
  if (state.snapshot?.connection?.status !== 'connected') return notice(ui.disconnected);
  if (turnRunning()) return notice(ui.sessionSwitchBlocked);
  if (!sendAction({ type: 'new_session', operationId: nextOperationId('new-session'), cwd })) return;
  notice(ui.sessionCreating);
}

function sessionDeleteEnabled() {
  return Boolean(state.snapshot?.agent?.sessionDelete);
}

function requestDeleteSession(targetId) {
  if (!targetId) return;
  if (!sessionDeleteEnabled()) return notice(ui.sessionDeleteUnsupported);
  const cwd = workspaceCwd();
  if (!cwd) return notice(ui.workspacePathPending);
  if (state.snapshot?.connection?.status !== 'connected') return notice(ui.disconnected);
  if (turnRunning()) return notice(ui.sessionDeleteBlocked);
  if (!window.confirm(ui.sessionDeleteConfirm)) return;
  if (
    !sendAction({
      type: 'delete_session',
      operationId: nextOperationId('delete-session'),
      sessionId: targetId,
      cwd,
    })
  ) {
    return;
  }
  notice(ui.sessionDeleting);
}

function requestLoadSession(targetId) {
  if (!targetId || targetId === sessionId()) return;
  const cwd = workspaceCwd();
  if (!cwd) return notice(ui.workspacePathPending);
  if (state.snapshot?.connection?.status !== 'connected') return notice(ui.disconnected);
  if (turnRunning()) return notice(ui.sessionSwitchBlocked);
  if (
    !sendAction({
      type: 'load_session',
      operationId: nextOperationId('load-session'),
      sessionId: targetId,
      cwd,
    })
  ) {
    return;
  }
  notice(ui.sessionLoading);
}

function renderSessions() {
  const snapshot = state.snapshot;
  const currentId = snapshot?.session?.sessionId;
  const list = listedSessions();
  const running = turnRunning();
  const connected = snapshot?.connection?.status === 'connected';
  const newButton = $('newSession');
  if (newButton) {
    newButton.disabled = !snapshot?.session?.cwd || !connected || running;
  }
  $('sessionCount').textContent = String(list.length).padStart(2, '0');
  const listEl = $('sessionList');
  if (!connected) {
    listEl.innerHTML = `<div class="session-empty">${ui.sessionWaiting}</div>`;
    return;
  }
  const parts = [];
  if (snapshot?.sessionListError) {
    parts.push(
      `<div class="session-empty session-list-error">${escapeHtml(ui.sessionListFailed)}<small>${escapeHtml(snapshot.sessionListError)}</small></div>`,
    );
  }
  if (!list.length) {
    if (!snapshot?.sessionListError) {
      parts.push(`<div class="session-empty">${ui.sessionEmpty}</div>`);
    }
  } else {
    parts.push(
      list
        .map((item, index) => {
          const active = item.sessionId === currentId;
          const meta =
            active && running
              ? '运行中'
              : formatSessionTime(item.updatedAt) || (active ? phase() : '历史');
          const deleteControl =
            sessionDeleteEnabled() && !running
              ? `<button type="button" class="session-delete" data-session-delete="${escapeHtml(item.sessionId)}" aria-label="删除这条活"><svg class="icon"><use href="#i-close"/></svg></button>`
              : '';
          return `<div class="session-row"><button type="button" class="session${active ? ' current' : ''}" data-session-id="${escapeHtml(item.sessionId)}" ${active ? 'aria-current="true"' : ''} ${running && !active ? 'disabled' : ''}><span class="session-index">${String(index + 1).padStart(2, '0')}</span><span><span class="session-name">${escapeHtml(sessionLabel(item))}</span><span class="session-meta">${escapeHtml(meta)}</span></span></button>${deleteControl}</div>`;
        })
        .join(''),
    );
  }
  listEl.innerHTML = parts.join('');
}

function workRow(tool) {
  const title = tool.title || tool.toolCallId;
  const target = tool.locations?.[0] || ui.pathUnknown;
  const status = tool.status || '已收到';
  return `<button type="button" class="work-row" data-tool="${escapeHtml(tool.toolCallId)}" aria-label="查看工具：${escapeHtml(title)}"><span class="work-icon">${icon('code')}</span><span><span class="work-name">${escapeHtml(title)}</span><span class="work-target">${escapeHtml(target)}</span></span><span class="work-state">${escapeHtml(status)}</span><span class="work-arrow">↗</span></button>`;
}

function approvalCard(approval) {
  const options = approval.options
    .map(
      (option) =>
        `<button type="button" class="${option.kind === 'reject_once' ? 'neutral-button' : 'primary-button'}" data-approval="${escapeHtml(approval.requestId)}" data-option="${escapeHtml(option.optionId)}">${escapeHtml(option.name)} ↗</button>`,
    )
    .join('');
  return `<section class="approval" aria-labelledby="approvalTitle"><div class="approval-heading"><span>PERMISSION REQUEST</span><span><i></i>等待确认</span></div><div class="approval-body"><h2 id="approvalTitle">${ui.approvalTitle}</h2><p>${ui.approvalBody}</p><code>${escapeHtml(approval.toolCallId)}</code></div><div class="approval-actions"><small>${ui.approvalOptions}</small><div>${options}</div></div></section>`;
}

function formatMessageText(text) {
  const open = '<think>';
  const close = '</think>';
  let out = String(text);
  for (;;) {
    const start = out.indexOf(open);
    if (start < 0) break;
    const end = out.indexOf(close, start);
    if (end < 0) break;
    out = out.slice(0, start) + out.slice(end + close.length);
  }
  return out.trim();
}

function scrollLogToEnd() {
  const log = $('log');
  if (log) log.scrollTop = log.scrollHeight;
}

function applyInlineMarkdown(escaped) {
  let out = escaped.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  return out;
}

function renderTextBlock(text) {
  const lines = text.split('\n');
  const parts = [];
  let listItems = [];
  const flushList = () => {
    if (!listItems.length) return;
    parts.push(`<ul>${listItems.map((item) => `<li>${applyInlineMarkdown(escapeHtml(item))}</li>`).join('')}</ul>`);
    listItems = [];
  };
  for (const line of lines) {
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      listItems.push(bullet[1]);
      continue;
    }
    flushList();
    if (!line.trim()) continue;
    parts.push(`<p>${applyInlineMarkdown(escapeHtml(line))}</p>`);
  }
  flushList();
  return parts.join('');
}

function renderAssistantMessageHtml(text) {
  const segments = [];
  const pattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push(renderTextBlock(text.slice(lastIndex, match.index)));
    segments.push(`<pre><code>${escapeHtml(match[2].replace(/\n$/, ''))}</code></pre>`);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) segments.push(renderTextBlock(text.slice(lastIndex)));
  return segments.join('') || '<p></p>';
}

function renderUserMessageHtml(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return '<p></p>';
  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function messageBodyHtml(message) {
  const text = formatMessageText(message.text);
  return message.role === 'user' ? renderUserMessageHtml(text) : renderAssistantMessageHtml(text);
}

function usageBarWidth(context) {
  const used = context?.usageUsed;
  const size = context?.usageSize;
  if (used == null || size == null || size <= 0) return '0';
  const pct = Math.min(100, Math.max(0, (used / size) * 100));
  return `${pct}%`;
}

function renderContent() {
  const snapshot = state.snapshot;
  if (state.view === 'events') {
    $('stream').innerHTML = `<p class="event-note">${ui.eventLogTitle}</p>${state.events
      .map(
        (event, index) =>
          `<div class="event-row"><time>${String(index + 1).padStart(2, '0')}</time><b>${escapeHtml(eventLabel(event.kind))}</b><p>${escapeHtml(event.description)}</p></div>`,
      )
      .join('')}`;
    return;
  }
  if (!snapshot?.session?.sessionId) {
    $('stream').innerHTML =
      `<section class="empty"><span class="empty-number">TALOS / CURRENT SESSION</span><h2>${ui.emptyTitle}</h2><p>${ui.emptyBody}</p><button type="button" class="suggestion" data-action="reconnect">${ui.emptyAction} ↗</button></section>`;
    return;
  }
  const messages = snapshot.messages
    .map(
      (message) =>
        `<article class="message"><div class="message-label"><b>${message.role === 'user' ? '你' : 'TALOS'}</b><span>${message.role === 'user' ? '指令' : '回复'}</span></div><div class="${message.role === 'user' ? 'user-message' : 'assistant-message'}">${messageBodyHtml(message)}</div></article>`,
    )
    .join('');
  const tools = snapshot.tools.length
    ? `<div class="workgroup"><div class="workgroup-head"><b>工具记录</b><span>${String(snapshot.tools.length).padStart(2, '0')} TOOL CALLS</span></div>${snapshot.tools.map(workRow).join('')}</div>`
    : '';
  const approvals = snapshot.approvals.filter((approval) => approval.status === 'pending').map(approvalCard).join('');
  const errors = snapshot.errors.length
    ? `<div class="completion halted">${icon('info')}<div><h2>${ui.errorTitle}</h2><p>${escapeHtml(snapshot.errors.at(-1))}</p></div></div>`
    : '';
  $('stream').innerHTML = `${messages || '<p class="event-note">当前会话尚无消息</p>'}${tools}${approvals}${errors}`;
  scrollLogToEnd();
}

function renderSummary() {
  const snapshot = state.snapshot;
  const tools = snapshot?.tools ?? [];
  const ctx = snapshot?.context ?? {};
  $('planCount').textContent = '—';
  $('plan').innerHTML =
    `<li><span class="node">—</span><span>${ui.planEmpty}<small>${ui.planEmptyHint}</small></span></li>`;
  const hasUsage = ctx.usageUsed != null && ctx.usageSize != null && ctx.usageSize > 0;
  const usage = ctx.usageLabel;
  $('usageValue').innerHTML = hasUsage && usage ? escapeHtml(usage) : '—';
  if (hasUsage) {
    $('usageCap').textContent = ctx.usageCapLabel ?? '';
  } else if (snapshot?.session?.sessionId) {
    $('usageCap').textContent = ui.usageUnreported;
  } else {
    $('usageCap').textContent = ui.usageEmpty;
  }
  $('usageBar').style.width = usageBarWidth(ctx);
  const locations = [...new Set(tools.flatMap((tool) => tool.locations ?? []))];
  $('fileCount').textContent = String(locations.length).padStart(2, '0');
  $('files').innerHTML = locations.length
    ? locations
        .map((file) => `<li>${icon('file')}<span>${escapeHtml(file)}</span><b>${ui.fileTag}</b></li>`)
        .join('')
    : `<li><span></span><span>${ui.pathUnknown}</span></li>`;
}

function render() {
  const snapshot = state.snapshot;
  const connected = snapshot?.connection?.status === 'connected';
  $('sessionTitle').textContent = currentSessionTitle();
  $('recordNumber').textContent = currentSessionRecordNumber();
  $('phase').textContent = phase();
  $('phase').dataset.state = phaseState();
  const running = snapshot?.turn?.status === 'running' || snapshot?.turn?.status === 'stopping';
  $('sendButton').hidden = running;
  $('stopButton').hidden = !running;
  const hasSession = Boolean(snapshot?.session?.sessionId);
  const composerStatus = running
    ? ui.composerRunning
    : connected && hasSession
      ? ui.ready
      : connected
        ? ui.composerPreparing
        : ui.composerOffline;
  const slashReady =
    hasSession && (state.snapshot?.context?.availableCommands?.length ?? 0) > 0
      ? ui.composerSlashHint
      : ui.composerReady;
  $('composerNote').innerHTML = `<span>${composerStatus}</span><span>${slashReady}</span>`;
  renderSessionControls();
  wireSlashCommandHandlers();
  if (state.slashMenuOpen) renderSlashMenu();
  $('engineTitle').textContent = 'TALOS';
  $('engineSubtitle').textContent = connected && hasSession
    ? ui.engineOnline
    : connected
      ? ui.enginePreparing
      : ui.engineOffline;
  const footnote = $('statusFootnote');
  if (footnote) {
    footnote.textContent = connected && hasSession
      ? ui.footnoteOnline
      : connected
        ? ui.footnotePreparing
        : ui.footnoteOffline;
  }
  $('recordDate').textContent = new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());
  renderWorkspaceMeta();
  renderSessions();
  renderContent();
  renderSummary();
}

function connect() {
  if (state.socket && state.socket.readyState <= WebSocket.OPEN) return;
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const host = location.host || '127.0.0.1:5193';
  state.socket = new WebSocket(`${protocol}://${host}/ws`);
  state.socket.addEventListener('open', () => {
    recordEvent('service.connected', ui.connected);
    notice(ui.connected);
  });
  state.socket.addEventListener('close', () => {
    recordEvent('service.disconnected', '连接已断开');
    notice('连接已断开');
    state.snapshot = null;
    render();
  });
  state.socket.addEventListener('error', () => notice('连接失败'));
  state.socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'snapshot') {
      state.snapshot = message.snapshot;
      recordEvent('service.snapshot', '状态已更新');
      render();
      return;
    }
    if (message.type === 'action_error') {
      notice(message.message || ui.workspaceSwitchFailed);
      const submit = $('workspaceSwitchForm')?.querySelector('button[type="submit"]');
      if (submit) submit.disabled = false;
      return;
    }
    if (message.type === 'action_result' && message.result?.accepted) {
      const op = message.operationId || '';
      if (op.startsWith('workspace-')) {
        notice(ui.workspaceSwitched);
        const submit = $('workspaceSwitchForm')?.querySelector('button[type="submit"]');
        if (submit) submit.disabled = false;
        $('workspaceInput').value = '';
      }
    }
  });
}

function toggleOverview() {
  if (compact.matches) workspace.classList.toggle('mobile-inspector');
  else workspace.classList.toggle('hide-inspector');
  const visible = compact.matches
    ? workspace.classList.contains('mobile-inspector')
    : !workspace.classList.contains('hide-inspector');
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
    if (tool) {
      openDetail(
        tool.title || tool.toolCallId,
        'TOOL DETAIL',
        `<dl><dt>状态</dt><dd>${escapeHtml(tool.status || ui.pathUnknown)}</dd><dt>路径</dt><dd>${escapeHtml((tool.locations || []).join('\n') || ui.pathUnknown)}</dd></dl><pre>${escapeHtml(JSON.stringify({ input: tool.rawInput, output: tool.rawOutput }, null, 2))}</pre>`,
      );
    }
  }
  if (button.dataset.approval) {
    const id = sessionId();
    if (!id) return;
    sendAction({
      type: 'reply_approval',
      operationId: nextOperationId('approval'),
      sessionId: id,
      requestId: button.dataset.approval,
      optionId: button.dataset.option,
    });
    notice('已提交选择');
  }
  if (button.dataset.action === 'reconnect') {
    connect();
    notice('正在连接…');
  }
  if (button.id === 'newSession') {
    requestNewSession();
    return;
  }
  if (button.dataset.sessionDelete) {
    requestDeleteSession(button.dataset.sessionDelete);
    return;
  }
  if (button.dataset.sessionId) {
    requestLoadSession(button.dataset.sessionId);
  }
});

$('recordTab').addEventListener('click', () => {
  state.view = 'record';
  render();
});
$('eventsTab').addEventListener('click', () => {
  state.view = 'events';
  render();
});
$('stopButton').addEventListener('click', () => {
  const id = sessionId();
  if (!id) return notice('当前没有可停止的会话');
  sendAction({ type: 'cancel', operationId: nextOperationId('cancel'), sessionId: id });
  notice('正在停止当前回合');
});
$('overviewToggle').addEventListener('click', toggleOverview);
compact.addEventListener('change', toggleOverview);
$('aboutButton').addEventListener('click', () =>
  openDetail(
    'Talos 桌面控制台',
    'ABOUT',
    ui.aboutBody,
  ),
);
$('closeDetail').addEventListener('click', () => $('detailDialog').close());
$('doneDetail').addEventListener('click', () => $('detailDialog').close());
$('workspaceSwitchForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const cwd = $('workspaceInput').value.trim();
  if (!cwd) return notice('请输入工作区绝对路径');
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) return notice(ui.disconnected);
  const submit = event.target.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  notice(ui.workspaceSwitching);
  sendAction({ type: 'switch_workspace', operationId: nextOperationId('workspace'), cwd });
});
$('composer').addEventListener('submit', (event) => {
  event.preventDefault();
  const prompt = $('prompt').value.trim();
  const id = sessionId();
  if (!prompt) return notice('先输入一条指令');
  if (!id) return notice('当前没有可继续的会话');
  if (state.snapshot?.turn?.status === 'running' || state.snapshot?.turn?.status === 'stopping') {
    return notice('当前回合仍在运行');
  }
  sendAction({ type: 'send_prompt', operationId: nextOperationId('prompt'), sessionId: id, prompt });
  recordEvent('user.prompt', prompt);
  $('prompt').value = '';
  closeSlashMenu();
});
$('prompt').addEventListener('keydown', (event) => {
  if (state.slashMenuOpen) {
    const matches = filteredSlashCommands(slashPrefixFromPrompt($('prompt').value));
    if (matches.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        state.slashHighlight += 1;
        renderSlashMenu();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        state.slashHighlight -= 1;
        renderSlashMenu();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSlashMenu();
        return;
      }
      if ((event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        const pick = matches[state.slashHighlight] ?? matches[0];
        applySlashCommand(pick.name);
        return;
      }
    }
  }
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    closeSlashMenu();
    $('composer').requestSubmit();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('detailDialog').open && state.snapshot?.turn?.status === 'running') {
    $('stopButton').click();
  }
});

if (globalThis.TalosTextScale) TalosTextScale.init();
wireSessionControlHandlers();
render();
if (location.protocol.startsWith('http')) connect();
