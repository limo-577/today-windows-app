import React, { useEffect, useMemo, useState } from 'react';
import { Check, GripHorizontal, Pause, Pin, Play, X } from 'lucide-react';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const pad = (n) => String(n).padStart(2, '0');
const formatFocusTime = (sec) => { const total = Math.max(0, Math.floor(sec || 0)); const h = Math.floor(total / 3600); const m = Math.floor((total % 3600) / 60); const s = total % 60; return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`; };

const THEMES = {
  light: {
    window: '#FCFCFA', text: '#2B2B27', subtext: '#9A9A90', divider: '#EEEDE7',
    hover: '#F4F3EE', accent: '#6E8F6F', accentText: '#FFFFFF', doneText: '#B7B6AD',
    overdueBg: '#F3D9D4', overdueText: '#B14B3A',
  },
  dark: {
    window: '#1B1B19', text: '#EDEDE7', subtext: '#8B8B82', divider: '#2A2A26',
    hover: '#242422', accent: '#8FB398', accentText: '#15251B', doneText: '#5C5C55',
    overdueBg: '#3A2420', overdueText: '#E08A73',
  },
};

function MiniCheck({ done, c, onClick }) {
  return (
    <button className="no-drag" onClick={onClick} title={done ? '标记为未完成' : '标记为已完成'}
      style={{
        width: 18, height: 18, borderRadius: 999, flexShrink: 0,
        border: `2px solid ${done ? c.accent : c.subtext}`,
        background: done ? c.accent : 'transparent', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
      {done && <Check size={10} strokeWidth={3} color={c.accentText} />}
    </button>
  );
}

export default function FloatWindow() {
  const [snapshot, setSnapshot] = useState(null);
  const [pinned, setPinned] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    document.documentElement.classList.add('float-document');
    document.body.classList.add('float-document');
    const offSnapshot = window.desktopAPI?.float?.onSnapshot?.((next) => setSnapshot(next));
    const offAppearance = window.desktopAPI?.onWindowAppearance?.((state) => {
      if (typeof state?.pinned === 'boolean') setPinned(state.pinned);
      if (typeof state?.opacity === 'number') setOpacity(state.opacity);
    });
    return () => {
      offSnapshot?.();
      offAppearance?.();
    };
  }, []);

  const c = THEMES[snapshot?.theme === 'dark' ? 'dark' : 'light'];
  const now = useMemo(() => new Date(snapshot?.now || Date.now()), [snapshot?.now]);
  const tasks = snapshot?.tasks || [];
  const remaining = snapshot?.remaining ?? 25 * 60;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const togglePinned = async () => {
    const next = !pinned;
    setPinned(next);
    await window.desktopAPI?.setAlwaysOnTop?.(next);
  };

  const changeOpacity = async (value) => {
    const next = Number(value);
    setOpacity(next);
    await window.desktopAPI?.setWindowOpacity?.(next);
  };

  return (
    <div style={{
      width: '100vw', height: '100vh', background: c.window, color: c.text,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      border: `1px solid ${c.divider}`,
    }}>
      <div className="native-drag flex items-center justify-between"
        style={{ height: 36, padding: '6px 8px', borderBottom: `1px solid ${c.divider}`, flexShrink: 0 }}>
        <button className="no-drag" onClick={togglePinned} title={pinned ? '取消置顶' : '置顶'}
          style={{ color: pinned ? c.accent : c.subtext, display: 'flex' }}>
          <Pin size={13} />
        </button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }} title="拖动悬浮窗">
          <GripHorizontal size={14} color={c.subtext} />
        </div>
        <input className="no-drag" type="range" min="0.3" max="1" step="0.05" value={opacity}
          onChange={(e) => changeOpacity(e.target.value)} title="透明度"
          style={{ width: 58, accentColor: c.accent }} />
        <button className="no-drag" onClick={() => window.desktopAPI?.float?.close?.()}
          style={{ color: c.subtext, marginLeft: 7, display: 'flex' }} title="关闭悬浮窗">
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: '10px 12px 5px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 10.5, color: c.subtext }}>
          {now.getMonth() + 1}月{now.getDate()}日 · {WEEKDAYS[now.getDay()]}
        </div>
        <div style={{ fontSize: 23, fontWeight: 650, fontVariantNumeric: 'tabular-nums', letterSpacing: .5 }}>
          {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
        </div>
        {snapshot?.activeTaskText && (
          <div title={snapshot.activeTaskText} style={{
            marginTop: 4, fontSize: 10.5, color: c.subtext, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 8px',
          }}>
            {snapshot?.running ? '专注中' : '已暂停'} · {snapshot.activeTaskText}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '4px 10px', overflowY: 'auto' }}>
        {tasks.length === 0 && <div style={{ fontSize: 11.5, color: c.subtext, textAlign: 'center', padding: 12 }}>今天没有任务</div>}
        {tasks.map((task) => {
          const overdue = !!(task.time && !task.done && nowHM > task.time);
          return (
            <div key={task.id} className="flex items-center" style={{ gap: 7, padding: '6px 3px', borderRadius: 8 }}>
              <MiniCheck done={task.done} c={c}
                onClick={() => window.desktopAPI?.float?.sendAction?.({ type: 'toggle-task', id: task.id })} />
              {task.time && (
                <span style={{ fontSize: 9.5, flexShrink: 0, color: overdue ? c.overdueText : c.subtext,
                  background: overdue ? c.overdueBg : 'transparent', borderRadius: 999, padding: overdue ? '1px 4px' : 0 }}>
                  {task.time}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, color: task.done ? c.doneText : c.text,
                  textDecoration: task.done ? 'line-through' : 'none', wordBreak: 'break-word',
                }}>{task.text}</div>
                {(task.focusSeconds > 0 || typeof task.pausedRemaining === 'number') && (
                  <div style={{ marginTop: 1, fontSize: 9.5, color: c.subtext, fontVariantNumeric: 'tabular-nums' }}>
                    {task.focusSeconds > 0 ? `累计 ${formatFocusTime(task.focusSeconds)}` : ''}
                    {task.focusSeconds > 0 && typeof task.pausedRemaining === 'number' ? ' · ' : ''}
                    {typeof task.pausedRemaining === 'number' && task.id !== snapshot?.activeTaskId ? `余 ${formatFocusTime(task.pausedRemaining)}` : ''}
                    {typeof task.pausedRemaining === 'number' && task.id === snapshot?.activeTaskId && !snapshot?.running ? `余 ${formatFocusTime(task.pausedRemaining)}` : ''}
                  </div>
                )}
              </div>
              {!task.done && (
                <button
                  className="no-drag"
                  onClick={() => window.desktopAPI?.float?.sendAction?.({ type: 'task-timer', id: task.id })}
                  title={task.id === snapshot?.activeTaskId && snapshot?.running ? '暂停此任务' : task.id === snapshot?.activeTaskId ? '继续此任务' : '开始此任务'}
                  style={{
                    width: 24, height: 24, borderRadius: 999, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: task.id === snapshot?.activeTaskId ? c.accent : c.hover,
                    color: task.id === snapshot?.activeTaskId ? c.accentText : c.subtext,
                  }}
                >
                  {task.id === snapshot?.activeTaskId && snapshot?.running
                    ? <Pause size={11} />
                    : <Play size={11} style={{ marginLeft: 1 }} />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center" style={{ gap: 12, padding: '9px 10px 10px', borderTop: `1px solid ${c.divider}`, flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 52, textAlign: 'center' }}>{mm}:{ss}</div>
        <button className="no-drag" onClick={() => window.desktopAPI?.float?.sendAction?.({ type: 'play-pause' })}
          style={{ width: 25, height: 25, borderRadius: 999, background: c.accent, color: c.accentText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={snapshot?.running ? '暂停' : '开始'}>
          {snapshot?.running ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: 1 }} />}
        </button>
      </div>
    </div>
  );
}
