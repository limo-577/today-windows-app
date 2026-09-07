import React, { useEffect, useMemo, useState } from 'react';
import { Check, GripHorizontal, Pause, Pin, Play, X } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');
const formatFocusTime = (sec) => { const total = Math.max(0, Math.floor(sec || 0)); const h = Math.floor(total / 3600); const m = Math.floor((total % 3600) / 60); const s = total % 60; return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`; };
const THEMES = {
  light: { window: '#FCFCFA', text: '#2B2B27', subtext: '#9A9A90', divider: '#EEEDE7', hover: '#F4F3EE', accent: '#6E8F6F', accentText: '#FFFFFF', overdueBg: '#F3D9D4', overdueText: '#B14B3A' },
  dark: { window: '#1B1B19', text: '#EDEDE7', subtext: '#8B8B82', divider: '#2A2A26', hover: '#242422', accent: '#8FB398', accentText: '#15251B', overdueBg: '#3A2420', overdueText: '#E08A73' },
};

function MiniCheck({ c, onClick }) {
  return <button className="no-drag" onClick={onClick} title="标记为已完成" style={{ width: 17, height: 17, borderRadius: 999, flexShrink: 0, border: `2px solid ${c.subtext}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={9} color="transparent" /></button>;
}

export default function FloatWindow() {
  const [snapshot, setSnapshot] = useState(null);
  const [pinned, setPinned] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    document.documentElement.classList.add('float-document'); document.body.classList.add('float-document');
    const offSnapshot = window.desktopAPI?.float?.onSnapshot?.((next) => setSnapshot(next));
    const offAppearance = window.desktopAPI?.onWindowAppearance?.((state) => { if (typeof state?.pinned === 'boolean') setPinned(state.pinned); if (typeof state?.opacity === 'number') setOpacity(state.opacity); });
    return () => { offSnapshot?.(); offAppearance?.(); };
  }, []);

  const c = THEMES[snapshot?.theme === 'dark' ? 'dark' : 'light'];
  const now = useMemo(() => new Date(snapshot?.now || Date.now()), [snapshot?.now]);
  const tasks = (snapshot?.tasks || []).filter((task) => !task.done);
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const togglePinned = async () => { const next = !pinned; setPinned(next); await window.desktopAPI?.setAlwaysOnTop?.(next); };
  const changeOpacity = async (value) => { const next = Number(value); setOpacity(next); await window.desktopAPI?.setWindowOpacity?.(next); };

  return (
    <div style={{ width: '100vw', height: '100vh', background: c.window, color: c.text, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", border: `1px solid ${c.divider}` }}>
      <div className="native-drag flex items-center justify-between" style={{ height: 30, padding: '4px 6px', borderBottom: `1px solid ${c.divider}`, flexShrink: 0 }}>
        <button className="no-drag" onClick={togglePinned} title={pinned ? '取消置顶' : '置顶'} style={{ color: pinned ? c.accent : c.subtext, display: 'flex' }}><Pin size={12} /></button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }} title="拖动悬浮窗"><GripHorizontal size={13} color={c.subtext} /></div>
        <input className="no-drag" type="range" min="0.3" max="1" step="0.05" value={opacity} onChange={(e) => changeOpacity(e.target.value)} title="透明度" style={{ width: 56, accentColor: c.accent }} />
        <button className="no-drag" onClick={() => window.desktopAPI?.float?.close?.()} style={{ color: c.subtext, display: 'flex' }} title="关闭悬浮窗"><X size={12} /></button>
      </div>

      <div style={{ padding: '6px 8px 4px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 650, fontVariantNumeric: 'tabular-nums', letterSpacing: .4 }}>{pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '2px 7px 6px', overflowY: 'auto' }}>
        {tasks.length === 0 && <div style={{ fontSize: 11, color: c.subtext, textAlign: 'center', padding: 12 }}>没有未完成任务</div>}
        {tasks.map((task) => {
          const overdue = !!(task.time && nowHM > task.time);
          return (
            <div key={task.id} className="flex items-center" style={{ gap: 6, padding: '5px 2px', borderRadius: 7, background: task.id === snapshot?.activeTaskId ? c.hover : 'transparent' }}>
              <MiniCheck c={c} onClick={() => window.desktopAPI?.float?.sendAction?.({ type: 'toggle-task', id: task.id })} />
              {task.time && <span style={{ fontSize: 9, flexShrink: 0, color: overdue ? c.overdueText : c.subtext, background: overdue ? c.overdueBg : 'transparent', borderRadius: 999, padding: overdue ? '1px 4px' : 0 }}>{task.time}</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.text}</div>
                {task.focusSeconds > 0 && <div style={{ marginTop: 1, fontSize: 9, color: c.subtext, fontVariantNumeric: 'tabular-nums' }}>累计 {formatFocusTime(task.focusSeconds)}</div>}
              </div>
              <button className="no-drag" onClick={() => window.desktopAPI?.float?.sendAction?.({ type: 'task-timer', id: task.id })}
                title={task.id === snapshot?.activeTaskId && snapshot?.running ? '暂停此任务' : task.id === snapshot?.activeTaskId ? '继续此任务' : '开始此任务'}
                style={{ width: 22, height: 22, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: task.id === snapshot?.activeTaskId ? c.accent : c.hover, color: task.id === snapshot?.activeTaskId ? c.accentText : c.subtext }}>
                {task.id === snapshot?.activeTaskId && snapshot?.running ? <Pause size={10} /> : <Play size={10} style={{ marginLeft: 1 }} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
