import type { ServiceSnapshot } from '../core/types.js';

/** Display-only startup state; engine connection facts remain authoritative. */
export function desktopStartup(snapshot: ServiceSnapshot | null, desktop: boolean, serviceError?: string, switching = false) {
  if (!desktop || snapshot?.session.sessionId) return null;
  if (switching && !serviceError) return { status: '建立会话', title: '正在建立会话', body: '正在载入工作区与会话档案。', action: '', label: '' };
  const error = serviceError || snapshot?.errors.at(-1);
  if (error) return { status: '连接失败', title: '无法建立会话', body: error, action: serviceError ? 'reconnect' : 'pick-workspace', label: serviceError ? '重新连接' : '重新选择工作区' };
  if (snapshot?.session.cwd || snapshot?.connection.status === 'connected') {
    return { status: '建立会话', title: '正在建立会话', body: '正在载入工作区与会话档案。', action: '', label: '' };
  }
  if (!snapshot) return { status: '启动中', title: '正在启动 TALOS', body: '正在准备本地服务。', action: '', label: '' };
  return { status: '等待工作区', title: '选择工作区', body: '选择一个项目文件夹，TALOS 将连接引擎并载入会话档案。', action: 'pick-workspace', label: '选择工作区' };
}
