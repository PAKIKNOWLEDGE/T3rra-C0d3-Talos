import { planSlashSubmit } from './slash-prompt.js';

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
  mentionMenuOpen: false,
  mentionHighlight: 0,
  mentionResults: [],
  mentionTimer: undefined,
  pendingOperations: new Map(),
  questionnaireDraft: {},
  steerCompose: false,
  pendingConfirm: undefined,
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
  slashMenuEmpty: '命令列表同步中…',
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
  questionnaireTitle: '待回答问题',
  questionnaireDismiss: '暂不回答',
  mentionMenuEmpty: '输入文件名筛选…',
  mentionUnsupported: '当前引擎不支持工作区文件搜索',
  queueEnqueued: '已加入队列',
  steerSent: '已插话',
  runningSendHint: '运行中：默认排队；开启插话模式可中途加一句',
  rewindPreviewTitle: '回退预览',
  rewindConfirm: '确认回退',
  inspectionEmpty: '暂无技能或 MCP 数据',
  queueContinue: '处理队列',
  queueSteer: '提前执行',
  forkSession: '分叉',
  editResend: '编辑重发',
  forkConfirm: '将基于此会话创建一条新活。',
  goalDisabled: '目标功能未在引擎启用',
  goalEmpty: '无活动目标',
  queueEdit: '编辑',
  pathUnknown: '—',
  fileTag: '相关文件',
  approvalTitle: '需要你的确认',
  approvalBody: '请选择一项以继续或拒绝本次操作。',
  approvalOptions: '可用选项',
  errorTitle: '出现问题',
  historyLoadTitle: '记录未能加载',
  historyLoadRetry: '重试加载',
  historyRetrying: '正在重新加载记录…',
  eventLogTitle: '连接与状态记录',
  aboutBody:
    '<p>Talos 桌面控制台是当前工作区的工作室窗口：左侧是这个项目里的活，中间是记录，底部发指令。</p><p>须先在本机安装 Talos CLI；本窗口与终端 TUI 并存，不互相取代。</p><p>一次只能生成一条活。引擎广告的斜杠命令可在输入框用 <code>/命令</code> 发送。</p>',
  workspaceSwitching: '正在切换工作区…',
  workspaceSwitched: '工作区已切换',
  workspaceSwitchFailed: '无法切换工作区',
  modeSwitching: '正在切换模式…',
  modelSwitching: '正在切换模型…',
  thoughtSwitching: '正在更新思考设置…',
};

function thoughtCapsuleLabel(option) {
  const value = String(option.value ?? '').toLowerCase();
  const name = option.name ?? option.value ?? '';
  if (value === 'true' || value === 'on') return '开';
  if (value === 'false' || value === 'off') return '关';
  return name.length > 8 ? `${name.slice(0, 7)}…` : name;
}

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

function sendActionWithResult(action) {
  return new Promise((resolve, reject) => {
    state.pendingOperations.set(action.operationId, { resolve, reject });
    if (!sendAction(action)) {
      state.pendingOperations.delete(action.operationId);
      reject(new Error(ui.disconnected));
    }
  });
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
  const gitBranch = state.snapshot?.context?.gitBranch;
  $('branchLabel').textContent = connected ? gitBranch || '已连接' : '—';
  $('branchMeta').textContent = connected
    ? gitBranch
      ? state.snapshot?.context?.gitDetached
        ? 'detached'
        : 'git'
      : ui.connected
    : ui.disconnected;
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
  const thinkingButtonsHost = $('thinkingButtonsHost');
  if (thinkingButtonsHost && !thinkingButtonsHost.dataset.wired) {
    thinkingButtonsHost.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-thinking-value]');
      if (!button || button.disabled) return;
      const activeId = sessionId();
      const activeCtx = state.snapshot?.context ?? {};
      const value = button.dataset.thinkingValue;
      const configId = activeCtx.thinkingConfigId ?? 'thinkingEffort';
      if (!activeId || !value || value === activeCtx.currentThinkingValue) return;
      sendAction({
        type: 'set_config_option',
        operationId: nextOperationId('thinking'),
        sessionId: activeId,
        configId,
        value,
      });
      notice(ui.thoughtSwitching);
    });
    thinkingButtonsHost.dataset.wired = '1';
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

function mentionPrefixFromPrompt(value) {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(value);
  if (!match) return null;
  return match[1];
}

function closeMentionMenu() {
  const menu = $('mentionMenu');
  if (!menu) return;
  menu.hidden = true;
  state.mentionMenuOpen = false;
  state.mentionHighlight = 0;
  state.mentionResults = [];
}

function applyMentionPath(path) {
  const prompt = $('prompt');
  if (!prompt || !path) return;
  const value = prompt.value;
  const match = /(?:^|\s)@([^\s@]*)$/.exec(value);
  if (!match) return;
  const start = value.length - match[0].length + (match[0].startsWith(' ') ? 1 : 0);
  prompt.value = `${value.slice(0, start)}@${path} ${value.slice(value.length)}`;
  closeMentionMenu();
  prompt.focus();
}

function scheduleMentionSearch(query) {
  if (state.mentionTimer) clearTimeout(state.mentionTimer);
  const cwd = workspaceCwd();
  if (!cwd || !sessionId()) {
    closeMentionMenu();
    return;
  }
  state.mentionTimer = setTimeout(() => {
    state.mentionTimer = undefined;
    void (async () => {
      try {
        const result = query
          ? await sendActionWithResult({
              type: 'search_workspace_files',
              operationId: nextOperationId('mention'),
              cwd,
              query,
            })
          : await sendActionWithResult({
              type: 'list_workspace_files',
              operationId: nextOperationId('mention-list'),
              cwd,
            });
        state.mentionResults = Array.isArray(result.paths) ? result.paths : [];
        renderMentionMenu(query);
      } catch (error) {
        state.mentionResults = [];
        renderMentionMenu(query, error instanceof Error ? error.message : ui.mentionUnsupported);
      }
    })();
  }, 220);
}

function renderMentionMenu(query, errorMessage) {
  const menu = $('mentionMenu');
  const prompt = $('prompt');
  if (!menu || !prompt) return;
  if (mentionPrefixFromPrompt(prompt.value) === null || !sessionId()) {
    closeMentionMenu();
    return;
  }
  closeSlashMenu();
  const paths = state.mentionResults;
  if (errorMessage) {
    menu.innerHTML = `<li><span class="slash-empty">${escapeHtml(errorMessage)}</span></li>`;
    menu.hidden = false;
    state.mentionMenuOpen = true;
    return;
  }
  if (!paths.length) {
    menu.innerHTML = `<li><span class="slash-empty">${escapeHtml(query ? '无匹配文件' : ui.mentionMenuEmpty)}</span></li>`;
    menu.hidden = false;
    state.mentionMenuOpen = true;
    return;
  }
  if (state.mentionHighlight >= paths.length) state.mentionHighlight = 0;
  if (state.mentionHighlight < 0) state.mentionHighlight = paths.length - 1;
  menu.innerHTML = paths
    .map(
      (path, index) =>
        `<li><button type="button" data-mention-path="${escapeHtml(path)}" role="option" aria-selected="${index === state.mentionHighlight ? 'true' : 'false'}"><span class="slash-name">@${escapeHtml(path)}</span></button></li>`,
    )
    .join('');
  menu.hidden = false;
  state.mentionMenuOpen = true;
}

function wireMentionHandlers() {
  const prompt = $('prompt');
  const menu = $('mentionMenu');
  if (!prompt || prompt.dataset.mentionWired) return;
  prompt.addEventListener('input', () => {
    const prefix = mentionPrefixFromPrompt(prompt.value);
    if (prefix === null) {
      closeMentionMenu();
      return;
    }
    state.mentionHighlight = 0;
    scheduleMentionSearch(prefix);
  });
  menu?.addEventListener('mousedown', (event) => event.preventDefault());
  menu?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-mention-path]');
    if (!button) return;
    applyMentionPath(button.dataset.mentionPath);
  });
  prompt.dataset.mentionWired = '1';
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
  closeMentionMenu();
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
  const thinkingButtonsHost = $('thinkingButtonsHost');
  const thinkingReadonly = $('thinkingValue');
  const modes = ctx.availableModes ?? [];
  const models = ctx.modelOptions ?? [];
  const thinkingOptions = ctx.thinkingOptions ?? [];
  const pendingMode = ctx.modePendingNextTurn ? ctx.pendingModeId : undefined;
  const currentMode = ctx.currentModeId ?? modes[0]?.id;
  const pressedModeId = pendingMode ?? currentMode;
  const currentModel = ctx.currentModelValue ?? models[0]?.value;
  const showModeButtons = editable && !running && modes.length > 0;

  if (showModeButtons) {
    modeReadonly.hidden = true;
    const signature = `${modes.map((m) => m.id).join('|')}:${pressedModeId}:${pendingMode ?? ''}:${running}`;
    if (modeButtonsHost.dataset.sig !== signature) {
      modeButtonsHost.dataset.sig = signature;
      modeButtonsHost.innerHTML = modes
        .map(
          (m) =>
            `<button type="button" data-mode-id="${escapeHtml(m.id)}" aria-pressed="${m.id === pressedModeId ? 'true' : 'false'}" title="${m.id === pendingMode ? '下回合生效' : ''}"${running ? ' disabled' : ''}>${escapeHtml(m.name)}${m.id === pendingMode ? ' *' : ''}</button>`,
        )
        .join('');
    } else {
      modeButtonsHost.querySelectorAll('button[data-mode-id]').forEach((button) => {
        button.setAttribute('aria-pressed', button.dataset.modeId === pressedModeId ? 'true' : 'false');
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

  const currentThinking = ctx.currentThinkingValue ?? thinkingOptions[0]?.value;
  const showThinkingButtons =
    editable && !running && thinkingOptions.length > 0 && (ctx.thinkingConfigId || thinkingOptions.length);
  if (showThinkingButtons) {
    thinkingReadonly.hidden = true;
    const thinkingSig = `${thinkingOptions.map((t) => t.value).join('|')}:${currentThinking}:${running}`;
    if (thinkingButtonsHost.dataset.sig !== thinkingSig) {
      thinkingButtonsHost.dataset.sig = thinkingSig;
      thinkingButtonsHost.innerHTML = thinkingOptions
        .map((t) => {
          const short = thoughtCapsuleLabel(t);
          const full = t.name ?? t.value;
          return `<button type="button" data-thinking-value="${escapeHtml(t.value)}" aria-pressed="${t.value === currentThinking ? 'true' : 'false'}" title="${escapeHtml(full)}"${running ? ' disabled' : ''}>${escapeHtml(short)}</button>`;
        })
        .join('');
    } else {
      thinkingButtonsHost.querySelectorAll('button[data-thinking-value]').forEach((button) => {
        button.setAttribute('aria-pressed', button.dataset.thinkingValue === currentThinking ? 'true' : 'false');
        button.disabled = running;
      });
    }
  } else {
    thinkingButtonsHost.dataset.sig = '';
    thinkingButtonsHost.innerHTML = '';
    thinkingReadonly.hidden = false;
    thinkingReadonly.textContent = ctx.thinkingLabel ?? '—';
  }
}

function sessionLabel(item) {
  const base = item?.title
    ? item.title
    : (() => {
        const id = item?.sessionId || '';
        if (!id) return '未命名';
        return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
      })();
  return item?.archived ? `归档 · ${base}` : base;
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

function openRenameSession(targetId) {
  const item = listedSessions().find((row) => row.sessionId === targetId);
  if (!item) return;
  if (turnRunning()) return notice(ui.sessionSwitchBlocked);
  const cwd = workspaceCwd();
  if (!cwd) return notice(ui.workspacePathPending);
  const currentTitle = item.title || '';
  openDetail(
    '重命名会话',
    'RENAME',
    `<form class="rename-form" id="renameSessionForm"><label for="renameSessionInput">标题</label><input id="renameSessionInput" name="title" value="${escapeHtml(currentTitle)}" maxlength="120" required /><button type="submit" class="primary-button">保存</button></form>`,
  );
  const form = $('renameSessionForm');
  form?.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      const title = $('renameSessionInput')?.value?.trim();
      if (!title) return notice('标题不能为空');
      if (
        !sendAction({
          type: 'rename_session',
          operationId: nextOperationId('rename-session'),
          sessionId: targetId,
          cwd,
          title,
        })
      ) {
        return;
      }
      $('detailDialog').close();
      notice('已重命名');
    },
    { once: true },
  );
}

function requestArchiveSession(targetId, archived) {
  const cwd = workspaceCwd();
  if (!cwd) return notice(ui.workspacePathPending);
  if (turnRunning()) return notice(ui.sessionSwitchBlocked);
  if (
    !sendAction({
      type: 'archive_session',
      operationId: nextOperationId('archive-session'),
      sessionId: targetId,
      cwd,
      archived,
    })
  ) {
    return;
  }
  notice(archived ? '已归档' : '已取消归档');
}

function requestDeleteSession(targetId) {
  if (!targetId) return;
  if (!sessionDeleteEnabled()) return notice(ui.sessionDeleteUnsupported);
  const cwd = workspaceCwd();
  if (!cwd) return notice(ui.workspacePathPending);
  if (state.snapshot?.connection?.status !== 'connected') return notice(ui.disconnected);
  if (turnRunning()) return notice(ui.sessionDeleteBlocked);
  openConfirmDialog('删除会话', `<p>${escapeHtml(ui.sessionDeleteConfirm)}</p>`, () => {
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
    notice('已删除会话');
  });
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
          const foreignRunning = Boolean(item.running) && !active;
          const meta =
            (active && running) || foreignRunning
              ? '运行中'
              : formatSessionTime(item.updatedAt) || (active ? phase() : '历史');
          const blockSwitch = (running && !active) || foreignRunning;
          const sideActions =
            !running && !foreignRunning
              ? `<button type="button" class="session-fork" data-session-fork="${escapeHtml(item.sessionId)}" aria-label="分叉" title="分叉">⎇</button><button type="button" class="session-rename" data-session-rename="${escapeHtml(item.sessionId)}" aria-label="重命名">✎</button><button type="button" class="session-archive" data-session-archive="${escapeHtml(item.sessionId)}" data-archived="${item.archived ? '1' : '0'}" aria-label="${item.archived ? '取消归档' : '归档'}">${item.archived ? '↩' : '⊟'}</button>${
                  sessionDeleteEnabled()
                    ? `<button type="button" class="session-delete" data-session-delete="${escapeHtml(item.sessionId)}" aria-label="删除这条活"><svg class="icon"><use href="#i-close"/></svg></button>`
                    : ''
                }`
              : '';
          return `<div class="session-row${foreignRunning ? ' session-row-running' : ''}"><button type="button" class="session${active ? ' current' : ''}" data-session-id="${escapeHtml(item.sessionId)}" ${active ? 'aria-current="true"' : ''} ${blockSwitch ? 'disabled' : ''}><span class="session-index">${String(index + 1).padStart(2, '0')}</span><span><span class="session-name">${escapeHtml(sessionLabel(item))}</span><span class="session-meta">${escapeHtml(meta)}</span></span></button>${sideActions ? `<div class="session-row-actions">${sideActions}</div>` : ''}</div>`;
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

function questionnaireCard(questionnaire) {
  const draft = state.questionnaireDraft[questionnaire.requestId] ?? {};
  const steps = questionnaire.steps
    .map((step) => {
      const picked = draft[step.id];
      const options = step.options
        .map(
          (option) =>
            `<button type="button" class="${picked?.includes(option.id) ? 'primary-button' : 'neutral-button'}" data-q-reply="${escapeHtml(questionnaire.requestId)}" data-q-step="${escapeHtml(step.id)}" data-q-option="${escapeHtml(option.id)}">${escapeHtml(option.label)}</button>`,
        )
        .join('');
      return `<div class="q-step"><h3>${escapeHtml(step.question)}</h3>${step.description ? `<p>${escapeHtml(step.description)}</p>` : ''}<div class="q-options">${options}</div></div>`;
    })
    .join('');
  const dismiss = `<button type="button" class="neutral-button" data-q-dismiss="${escapeHtml(questionnaire.requestId)}">${ui.questionnaireDismiss}</button>`;
  const title = questionnaire.title || (questionnaire.isPlanMode ? '计划审查' : ui.questionnaireTitle);
  return `<section class="approval questionnaire" aria-labelledby="questionnaireTitle"><div class="approval-heading"><span>QUESTIONNAIRE</span><span><i></i>等待回答</span></div><div class="approval-body"><h2 id="questionnaireTitle">${escapeHtml(title)}</h2>${steps}</div><div class="approval-actions"><div>${dismiss}</div></div></section>`;
}

function planLinesFromMarkdown(markdown) {
  return markdown
    .split('\n')
    .map((line) => line.replace(/^[\s\-*•\d.)]+/, '').trim())
    .filter(Boolean);
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

function parseTableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return null;
  let inner = trimmed;
  if (inner.startsWith('|')) inner = inner.slice(1);
  if (inner.endsWith('|')) inner = inner.slice(0, -1);
  const cells = inner.split('|').map((cell) => cell.trim());
  return cells.length ? cells : null;
}

function isTableSeparatorLine(line) {
  const cells = parseTableCells(line);
  if (!cells?.length) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderMarkdownTable(headerCells, bodyRows) {
  const cellHtml = (text) => applyInlineMarkdown(escapeHtml(text));
  const header = headerCells.map((cell) => `<th>${cellHtml(cell)}</th>`).join('');
  const body = bodyRows
    .map((row) => `<tr>${row.map((cell) => `<td>${cellHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  return `<table class="md-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
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
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      listItems.push(bullet[1]);
      index += 1;
      continue;
    }
    flushList();
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const headerCells = parseTableCells(line);
    if (headerCells && index + 1 < lines.length && isTableSeparatorLine(lines[index + 1])) {
      const bodyRows = [];
      index += 2;
      while (index < lines.length) {
        const rowLine = lines[index];
        if (!rowLine.trim()) break;
        if (isTableSeparatorLine(rowLine)) {
          index += 1;
          continue;
        }
        const rowCells = parseTableCells(rowLine);
        if (!rowCells) break;
        bodyRows.push(rowCells);
        index += 1;
      }
      parts.push(renderMarkdownTable(headerCells, bodyRows));
      continue;
    }
    parts.push(`<p>${applyInlineMarkdown(escapeHtml(line))}</p>`);
    index += 1;
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

function renderThoughtBlockHtml(text) {
  const body = renderTextBlock(formatMessageText(text));
  if (!body.trim()) return '';
  return `<details class="thought-block"><summary><b>思考</b><span class="thought-hint">点击展开</span></summary><div class="thought-body">${body}</div></details>`;
}

function renderTimelineItem(item, snapshot) {
  if (item.kind === 'tool') {
    const tool = snapshot?.tools?.find((row) => row.toolCallId === item.toolCallId);
    if (!tool) return '';
    return `<div class="timeline-tool">${workRow(tool)}</div>`;
  }
  if (item.kind === 'notice') {
    return `<article class="message message-notice"><div class="message-label"><b>事件</b><span>ENGINE</span></div><p>${escapeHtml(item.text)}</p></article>`;
  }
  if (item.kind === 'thought') {
    const body = renderThoughtBlockHtml(item.text);
    if (!body) return '';
    return `<article class="message message-thought">${body}</article>`;
  }
  const role = item.kind === 'user' ? 'user' : 'assistant';
  const label = role === 'user' ? '你' : 'TALOS';
  const sub = role === 'user' ? '指令' : '回复';
  const text = formatMessageText(item.text);
  const html = role === 'user' ? renderUserMessageHtml(text) : renderAssistantMessageHtml(text);
  const idle = !turnRunning();
  const actions = [];
  if (role === 'user' && item.messageId && idle) {
    actions.push(
      `<button type="button" class="light-button" data-rewind-user="${escapeHtml(item.messageId)}">回退到此</button>`,
    );
    actions.push(
      `<button type="button" class="light-button" data-edit-user="${escapeHtml(item.messageId)}">编辑重发</button>`,
    );
  }
  if (role === 'assistant' && item.messageId && idle) {
    actions.push(
      `<button type="button" class="light-button" data-fork-assistant="${escapeHtml(item.messageId)}">${ui.forkSession}</button>`,
    );
  }
  const rewind = actions.length
    ? `<div class="message-actions">${actions.join('')}</div>`
    : '';
  return `<article class="message" ${item.messageId ? `data-message-id="${escapeHtml(item.messageId)}"` : ''}><div class="message-label"><b>${label}</b><span>${sub}</span></div><div class="${role === 'user' ? 'user-message' : 'assistant-message'}">${html}</div>${rewind}</article>`;
}

function timelineItems(snapshot) {
  if (snapshot.timeline?.length) return snapshot.timeline;
  return snapshot.messages.map((message) =>
    message.role === 'user'
      ? { kind: 'user', messageId: message.messageId, text: message.text }
      : { kind: 'assistant', messageId: message.messageId, text: message.text },
  );
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
  const historyError = snapshot.session.historyLoadError;
  const historyBlock = historyError
    ? `<div class="completion halted">${icon('info')}<div><h2>${ui.historyLoadTitle}</h2><p>${escapeHtml(historyError)}</p><button type="button" class="suggestion" data-action="retry-history">${ui.historyLoadRetry}</button></div></div>`
    : '';
  const messages = timelineItems(snapshot).map((item) => renderTimelineItem(item, snapshot)).join('');
  const approvals = snapshot.approvals.filter((approval) => approval.status === 'pending').map(approvalCard).join('');
  const questionnaire = snapshot.interactions?.questionnaire;
  const questionnaireBlock = questionnaire ? questionnaireCard(questionnaire) : '';
  const errors = snapshot.errors.length
    ? `<div class="completion halted">${icon('info')}<div><h2>${ui.errorTitle}</h2><p>${escapeHtml(snapshot.errors.at(-1))}</p></div></div>`
    : '';
  $('stream').innerHTML = `${historyBlock}${messages || (historyError ? '' : '<p class="event-note">当前会话尚无消息</p>')}${questionnaireBlock}${approvals}${errors}`;
  scrollLogToEnd();
}

function renderSummary() {
  const snapshot = state.snapshot;
  const tools = snapshot?.tools ?? [];
  const ctx = snapshot?.context ?? {};
  const planReview = snapshot?.interactions?.planReview;
  const planLines = planReview?.markdown ? planLinesFromMarkdown(planReview.markdown) : [];
  $('planCount').textContent = planLines.length ? String(planLines.length).padStart(2, '0') : '—';
  $('plan').innerHTML = planLines.length
    ? planLines
        .map(
          (line, index) =>
            `<li><span class="node">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(line)}</span></li>`,
        )
        .join('')
    : `<li><span class="node">—</span><span>${ui.planEmpty}<small>${ui.planEmptyHint}</small></span></li>`;
  const hasUsageNumber = ctx.usageUsed != null && ctx.usageUsed > 0;
  const hasUsageBar = hasUsageNumber && ctx.usageSize != null && ctx.usageSize > 0;
  const usage = ctx.usageLabel;
  $('usageValue').innerHTML = hasUsageNumber && usage ? escapeHtml(usage) : '—';
  const contextLabel = snapshot?.inspection?.contextSnapshotLabel;
  $('usageCap').textContent = contextLabel
    ? contextLabel
    : hasUsageNumber
      ? (ctx.usageCapLabel ?? '')
      : '';
  $('usageBar').style.width = hasUsageBar ? usageBarWidth(ctx) : '0';
  $('usageBar').closest('.usage-track')?.classList.toggle('is-empty', !hasUsageBar);
  const locations = [...new Set(tools.flatMap((tool) => tool.locations ?? []))];
  $('fileCount').textContent = String(locations.length).padStart(2, '0');
  $('files').innerHTML = locations.length
    ? locations
        .map((file) => `<li>${icon('file')}<span>${escapeHtml(file)}</span><b>${ui.fileTag}</b></li>`)
        .join('')
    : `<li><span></span><span>${ui.pathUnknown}</span></li>`;
  const inspection = snapshot?.inspection ?? { skillNames: [], mcpServerNames: [] };
  const skillCount = inspection.skillNames?.length ?? 0;
  const mcpCount = inspection.mcpServerNames?.length ?? 0;
  const inspectionTotal = skillCount + mcpCount;
  $('inspectionCount').textContent = inspectionTotal ? String(inspectionTotal).padStart(2, '0') : '—';
  const instrCount = inspection.instructionSourceLabels?.length ?? 0;
  const taskCount = inspection.backgroundTasks?.length ?? 0;
  const pluginCount = inspection.installedPlugins?.length ?? 0;
  const goalLine =
    inspection.goal?.available === true
      ? inspection.goal.objective
        ? `目标：${inspection.goal.objective}`
        : ui.goalEmpty
      : '';
  $('inspectionBlurb').textContent =
    inspectionTotal ||
    instrCount ||
    inspection.projectMcpSummary ||
    taskCount ||
    pluginCount ||
    goalLine ||
    inspection.delegationSummary
      ? [
          inspectionTotal ? `${skillCount} 技能 · ${mcpCount} MCP` : '',
          instrCount ? `${instrCount} 指令源` : '',
          taskCount ? `${taskCount} 后台任务` : '',
          pluginCount ? `${pluginCount} 插件` : '',
          goalLine,
          inspection.delegationSummary ?? '',
          inspection.projectMcpSummary ?? '',
          inspection.diagnosticsSummary ?? '',
        ]
          .filter(Boolean)
          .join(' · ')
      : ui.inspectionEmpty;
  const inspectionBtn = $('inspectionDetailBtn');
  if (inspectionBtn) {
    inspectionBtn.hidden = !(
      inspectionTotal ||
      instrCount ||
      inspection.projectMcpSummary ||
      taskCount ||
      pluginCount ||
      goalLine ||
      inspection.delegationSummary
    );
  }
  renderQueueStrip();
}

function renderQueueStrip() {
  const strip = $('queueStrip');
  if (!strip) return;
  const items = state.snapshot?.queue ?? [];
  if (!items.length) {
    strip.hidden = true;
    strip.innerHTML = '';
    return;
  }
  strip.hidden = false;
  const continueBtn =
    !turnRunning() && items.length
      ? `<button type="button" class="primary-button" data-queue-continue="1">${ui.queueContinue}</button>`
      : '';
  strip.innerHTML = `<div class="queue-head"><span class="eyebrow">QUEUE</span>${continueBtn}</div><ul>${items
    .map(
      (item) =>
        `<li><span>${escapeHtml(item.content || item.itemId)} <small>(${escapeHtml(item.status)})</small></span><span class="queue-actions"><button type="button" class="neutral-button" data-queue-edit="${escapeHtml(item.itemId)}" data-queue-text="${escapeHtml(item.content || '')}">${ui.queueEdit}</button><button type="button" class="neutral-button" data-queue-steer="${escapeHtml(item.itemId)}">${ui.queueSteer}</button><button type="button" class="neutral-button" data-queue-delete="${escapeHtml(item.itemId)}">移除</button></span></li>`,
    )
    .join('')}</ul>`;
}

function render() {
  const snapshot = state.snapshot;
  const connected = snapshot?.connection?.status === 'connected';
  $('sessionTitle').textContent = currentSessionTitle();
  $('recordNumber').textContent = currentSessionRecordNumber();
  $('phase').textContent = phase();
  $('phase').dataset.state = phaseState();
  const running = snapshot?.turn?.status === 'running' || snapshot?.turn?.status === 'stopping';
  if (!running) state.steerCompose = false;
  $('sendButton').hidden = false;
  $('stopButton').hidden = !running;
  const steerBtn = $('steerButton');
  if (steerBtn) {
    steerBtn.hidden = !running;
    steerBtn.setAttribute('aria-pressed', state.steerCompose ? 'true' : 'false');
  }
  const sendLabel = $('sendButton')?.querySelector('span');
  if (sendLabel) {
    sendLabel.textContent = running ? (state.steerCompose ? '插话' : '加入队列') : '发送指令';
  }
  const hasSession = Boolean(snapshot?.session?.sessionId);
  const composerStatus = running
    ? ui.composerRunning
    : connected && hasSession
      ? ui.ready
      : connected
        ? ui.composerPreparing
        : ui.composerOffline;
  const slashReady = running
    ? ui.runningSendHint
    : hasSession && (state.snapshot?.context?.availableCommands?.length ?? 0) > 0
      ? ui.composerSlashHint
      : ui.composerReady;
  $('composerNote').innerHTML = `<span>${composerStatus}</span><span>${slashReady}</span>`;
  renderSessionControls();
  wireSlashCommandHandlers();
  if (state.slashMenuOpen) renderSlashMenu();
  if (state.mentionMenuOpen) renderMentionMenu(mentionPrefixFromPrompt($('prompt')?.value ?? '') ?? '');
  $('engineTitle').textContent = 'TALOS';
  const accountLabel = snapshot?.context?.accountStatusLabel;
  $('engineSubtitle').textContent = connected && hasSession
    ? accountLabel ? `${ui.engineOnline} · ${accountLabel}` : ui.engineOnline
    : connected
      ? accountLabel ? `${ui.enginePreparing} · ${accountLabel}` : ui.enginePreparing
      : ui.engineOffline;
  const footnote = $('statusFootnote');
  if (footnote) {
    footnote.textContent = connected && hasSession
      ? accountLabel ? `${ui.footnoteOnline} · ${accountLabel}` : ui.footnoteOnline
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
      const pending = state.pendingOperations.get(message.operationId);
      if (pending) {
        state.pendingOperations.delete(message.operationId);
        pending.reject(new Error(message.message || '操作失败'));
      }
      notice(message.message || ui.workspaceSwitchFailed);
      const submit = $('workspaceSwitchForm')?.querySelector('button[type="submit"]');
      if (submit) submit.disabled = false;
      return;
    }
    if (message.type === 'action_result') {
      const pending = state.pendingOperations.get(message.operationId);
      if (pending) {
        state.pendingOperations.delete(message.operationId);
        pending.resolve(message.result);
        return;
      }
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
  $('detailActions').hidden = true;
  state.pendingConfirm = undefined;
  $('detailTitle').textContent = title;
  $('detailLabel').textContent = label;
  $('detailContent').innerHTML = content;
  $('detailDialog').showModal();
}

function openConfirmDialog(title, contentHtml, onConfirm) {
  state.pendingConfirm = onConfirm;
  $('detailActions').hidden = false;
  $('detailTitle').textContent = title;
  $('detailLabel').textContent = 'CONFIRM';
  $('detailContent').innerHTML = contentHtml;
  $('detailDialog').showModal();
}

async function requestForkSession(assistantMessageId) {
  const id = sessionId();
  const cwd = workspaceCwd();
  if (!id || !cwd) return notice(ui.workspacePathPending);
  if (turnRunning()) return notice('请先停止当前回合');
  try {
    const result = await sendActionWithResult({
      type: 'preview_fork',
      operationId: nextOperationId('fork-preview'),
      sessionId: id,
      ...(assistantMessageId ? { assistantMessageId } : {}),
    });
    const options = result.options ?? {};
    if (!options.canFork) {
      notice(options.unavailableReason || '当前无法分叉');
      return;
    }
    const title = options.suggestedTitle ? `<p>建议标题：${escapeHtml(options.suggestedTitle)}</p>` : '';
    openConfirmDialog('分叉会话', `<p>${escapeHtml(ui.forkConfirm)}</p>${title}`, () => {
      sendAction({
        type: 'fork_session',
        operationId: nextOperationId('fork'),
        sessionId: id,
        cwd,
        ...(assistantMessageId ? { assistantMessageId } : {}),
      });
      notice('正在分叉…');
    });
  } catch (error) {
    notice(error instanceof Error ? error.message : '无法查询分叉选项');
  }
}

function openEditMessageDialog(userMessageId, text) {
  const id = sessionId();
  if (!id || !userMessageId) return;
  if (turnRunning()) return notice('请先停止当前回合');
  openConfirmDialog(
    '编辑并重跑',
    `<label class="sr-only" for="editMessageInput">新内容</label><textarea id="editMessageInput" rows="8" class="edit-message-input">${escapeHtml(text)}</textarea>`,
    () => {
      const content = $('editMessageInput')?.value.trim();
      if (!content) return notice('内容不能为空');
      sendAction({
        type: 'edit_session_message',
        operationId: nextOperationId('edit-message'),
        sessionId: id,
        userMessageId,
        content,
      });
      notice('已提交编辑');
    },
  );
}

async function requestRewindToUserMessage(userMessageId) {
  const id = sessionId();
  if (!id || !userMessageId) return;
  if (turnRunning()) return notice('请先停止当前回合');
  try {
    const result = await sendActionWithResult({
      type: 'preview_rewind',
      operationId: nextOperationId('rewind-preview'),
      sessionId: id,
      userMessageId,
    });
    const preview = typeof result.preview === 'string' ? result.preview : '无预览';
    openConfirmDialog(ui.rewindPreviewTitle, `<pre>${escapeHtml(preview)}</pre>`, () => {
      sendAction({
        type: 'rewind_session',
        operationId: nextOperationId('rewind'),
        sessionId: id,
        userMessageId,
      });
      notice('正在回退…');
    });
  } catch (error) {
    notice(error instanceof Error ? error.message : '无法预览回退');
  }
}

function scrollToMessage(messageId) {
  const target = document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.anchorMessage) {
    scrollToMessage(button.dataset.anchorMessage);
    return;
  }
  if (button.dataset.rewindUser) {
    requestRewindToUserMessage(button.dataset.rewindUser);
    return;
  }
  if (button.dataset.editUser) {
    const item = state.snapshot?.timeline?.find(
      (row) => row.kind === 'user' && row.messageId === button.dataset.editUser,
    );
    openEditMessageDialog(button.dataset.editUser, item?.text ?? '');
    return;
  }
  if (button.dataset.forkAssistant) {
    requestForkSession(button.dataset.forkAssistant);
    return;
  }
  if (button.dataset.sessionFork) {
    if (button.dataset.sessionFork !== sessionId()) {
      notice('请先切换到该会话再分叉');
      return;
    }
    requestForkSession();
    return;
  }
  if (button.dataset.queueEdit) {
    const id = sessionId();
    if (!id) return;
    const itemId = button.dataset.queueEdit;
    const initial = button.dataset.queueText ?? '';
    openConfirmDialog(
      '编辑队列项',
      `<textarea id="queueEditInput" rows="4" class="edit-message-input">${escapeHtml(initial)}</textarea>`,
      () => {
        const text = $('queueEditInput')?.value.trim();
        if (!text) return notice('内容不能为空');
        sendAction({
          type: 'update_queue_item',
          operationId: nextOperationId('queue-update'),
          sessionId: id,
          itemId,
          text,
        });
        notice('已更新队列');
      },
    );
    return;
  }
  if (button.dataset.queueSteer) {
    const id = sessionId();
    if (!id) return;
    sendAction({
      type: 'steer_queue_item',
      operationId: nextOperationId('queue-steer'),
      sessionId: id,
      itemId: button.dataset.queueSteer,
    });
    notice('已请求提前执行');
    return;
  }
  if (button.dataset.queueContinue) {
    const id = sessionId();
    if (!id) return;
    sendAction({
      type: 'continue_queue',
      operationId: nextOperationId('queue-continue'),
      sessionId: id,
    });
    notice('正在处理队列…');
    return;
  }
  if (button.dataset.queueDelete) {
    const id = sessionId();
    if (!id) return;
    sendAction({
      type: 'delete_queue_item',
      operationId: nextOperationId('queue-delete'),
      sessionId: id,
      itemId: button.dataset.queueDelete,
    });
    return;
  }
  if (button.id === 'inspectionDetailBtn') {
    const inspection = state.snapshot?.inspection;
    if (!inspection) return;
    openDetail(
      '技能与 MCP',
      'INSPECTION',
      `<h3>技能</h3><ul>${(inspection.skillNames ?? [])
        .map((name) => `<li>${escapeHtml(name)}</li>`)
        .join('') || `<li>${ui.inspectionEmpty}</li>`}</ul><h3>MCP</h3><ul>${(inspection.mcpServerNames ?? [])
        .map((name) => `<li>${escapeHtml(name)}</li>`)
        .join('') || `<li>${ui.inspectionEmpty}</li>`}</ul><h3>指令源</h3><ul>${(inspection.instructionSourceLabels ?? [])
        .map((name) => `<li>${escapeHtml(name)}</li>`)
        .join('') || `<li>—</li>`}</ul><h3>项目 MCP</h3><p>${escapeHtml(inspection.projectMcpSummary || '—')}</p><h3>已装插件</h3><ul>${(inspection.installedPlugins ?? [])
        .map((name) => `<li>${escapeHtml(name)}</li>`)
        .join('') || '<li>—</li>'}</ul><h3>后台任务</h3><ul>${(inspection.backgroundTasks ?? [])
        .map(
          (task) =>
            `<li>${escapeHtml(task.description || task.taskId)} <small>${escapeHtml(task.status)}</small></li>`,
        )
        .join('') || '<li>—</li>'}</ul><h3>委派</h3><p>${escapeHtml(inspection.delegationSummary || '—')}</p><h3>目标</h3><p>${escapeHtml(
        inspection.goal?.available
          ? inspection.goal.objective || ui.goalEmpty
          : ui.goalDisabled,
      )}</p>`,
    );
    return;
  }
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
  if (button.dataset.qDismiss) {
    const id = sessionId();
    if (!id) return;
    sendAction({
      type: 'dismiss_questionnaire',
      operationId: nextOperationId('q-dismiss'),
      sessionId: id,
      requestId: button.dataset.qDismiss,
    });
    delete state.questionnaireDraft[button.dataset.qDismiss];
    notice('已关闭问卷');
    return;
  }
  if (button.dataset.qReply) {
    const id = sessionId();
    if (!id) return;
    const requestId = button.dataset.qReply;
    const stepId = button.dataset.qStep;
    const optionId = button.dataset.qOption;
    const questionnaire = state.snapshot?.interactions?.questionnaire;
    if (!questionnaire || questionnaire.requestId !== requestId) return;
    const draft = state.questionnaireDraft[requestId] ?? {};
    draft[stepId] = [optionId];
    state.questionnaireDraft[requestId] = draft;
    const answers = questionnaire.steps.map((step) => ({
      stepId: step.id,
      selectedOptionIds: draft[step.id] ?? [],
    }));
    const complete = questionnaire.steps.every((step) => (draft[step.id]?.length ?? 0) > 0);
    if (!complete) {
      render();
      return;
    }
    sendAction({
      type: 'reply_questionnaire',
      operationId: nextOperationId('q-reply'),
      sessionId: id,
      requestId,
      answers,
    });
    delete state.questionnaireDraft[requestId];
    notice('已提交回答');
    return;
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
  if (button.dataset.action === 'retry-history') {
    const id = sessionId();
    const cwd = state.snapshot?.session?.cwd;
    if (!id || !cwd) return notice(ui.disconnected);
    if (
      !sendAction({
        type: 'retry_session_history',
        operationId: nextOperationId('retry-history'),
        sessionId: id,
        cwd,
      })
    ) {
      return;
    }
    notice(ui.historyRetrying);
    return;
  }
  if (button.id === 'newSession') {
    requestNewSession();
    return;
  }
  if (button.dataset.sessionRename) {
    openRenameSession(button.dataset.sessionRename);
    return;
  }
  if (button.dataset.sessionArchive) {
    requestArchiveSession(button.dataset.sessionArchive, button.dataset.archived !== '1');
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
$('detailCancel')?.addEventListener('click', () => {
  state.pendingConfirm = undefined;
  $('detailDialog').close();
});
$('detailConfirm')?.addEventListener('click', () => {
  const action = state.pendingConfirm;
  state.pendingConfirm = undefined;
  $('detailDialog').close();
  if (action) action();
});
$('steerButton')?.addEventListener('click', () => {
  state.steerCompose = !state.steerCompose;
  render();
});
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
function submitComposerPrompt() {
  const prompt = $('prompt').value.trim();
  const id = sessionId();
  if (!prompt) return notice('先输入一条指令');
  if (!id) return notice('当前没有可继续的会话');
  const running = turnRunning();
  const plan = planSlashSubmit({
    prompt,
    advertised: advertisedSlashCommands(),
  });
  if (plan.kind === 'reject') {
    notice(plan.message);
    return;
  }
  if (plan.kind === 'host_new_session') {
    $('prompt').value = '';
    closeSlashMenu();
    requestNewSession();
    return;
  }
  if (plan.kind === 'host_slash') {
    sendAction({
      type: 'execute_slash',
      operationId: nextOperationId('slash'),
      sessionId: id,
      name: plan.name,
      input: plan.input,
    });
    recordEvent('user.slash', `/${plan.name}`);
    $('prompt').value = '';
    closeSlashMenu();
    return;
  }

  if (running) {
    if (state.steerCompose) {
      sendAction({
        type: 'steer_turn',
        operationId: nextOperationId('steer'),
        sessionId: id,
        text: plan.prompt,
      });
      recordEvent('user.steer', plan.prompt);
      notice(ui.steerSent);
    } else {
      sendAction({
        type: 'enqueue_message',
        operationId: nextOperationId('enqueue'),
        sessionId: id,
        text: plan.prompt,
      });
      recordEvent('user.queue', plan.prompt);
      notice(ui.queueEnqueued);
    }
    $('prompt').value = '';
    closeSlashMenu();
    closeMentionMenu();
    return;
  }

  sendAction({
    type: 'send_prompt',
    operationId: nextOperationId('prompt'),
    sessionId: id,
    prompt: plan.prompt,
  });
  recordEvent('user.prompt', plan.prompt);
  $('prompt').value = '';
  closeSlashMenu();
  closeMentionMenu();
}

$('composer').addEventListener('submit', (event) => {
  event.preventDefault();
  submitComposerPrompt();
});
$('prompt').addEventListener('keydown', (event) => {
  if (state.mentionMenuOpen) {
    const query = mentionPrefixFromPrompt($('prompt').value) ?? '';
    const paths = state.mentionResults;
    if (paths.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        state.mentionHighlight += 1;
        renderMentionMenu(query);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        state.mentionHighlight -= 1;
        renderMentionMenu(query);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMentionMenu();
        return;
      }
      if ((event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        const pick = paths[state.mentionHighlight] ?? paths[0];
        applyMentionPath(pick);
        return;
      }
    }
  }
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
wireMentionHandlers();
render();
if (location.protocol.startsWith('http')) connect();
