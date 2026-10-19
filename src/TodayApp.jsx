import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Check, ChevronLeft, ChevronRight, Sun, Moon,
  Play, Pause, RotateCcw, PictureInPicture2, X,
  CalendarDays, List, ListPlus, ClipboardList, Repeat, AlarmClock, Pencil, Bell, BellOff, Volume2, ArrowRight, ChevronDown, ChevronUp, FileText, Lock, Download, Upload,
} from "lucide-react";

/* ---------- 日期工具 ---------- */
const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const pad = (n) => String(n).padStart(2, "0");
const startOfDay = (d) => { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; };
const addDays = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const dateKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const dateFromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const dateFromIso = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const toIsoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toIsoMonth = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const displayDate = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
const relativeLabel = (d, today) => {
  const diff = Math.round((startOfDay(d) - startOfDay(today)) / 86400000);
  if (diff === 0) return "今天";
  if (diff === -1) return "昨天";
  if (diff === 1) return "明天";
  return WEEKDAYS[d.getDay()];
};
const buildMonthGrid = (monthDate) => {
  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};
const parseTaskLine = (line) => {
  const m = line.match(/^([01]?\d|2[0-3]):([0-5]\d)\s+(.+)$/);
  if (m) return { time: `${m[1].padStart(2, "0")}:${m[2]}`, text: m[3] };
  return { time: null, text: line };
};
const repeatDates = (baseDate, type) => {
  const dates = [];
  if (type === "daily") { for (let i = 0; i < 30; i++) dates.push(addDays(baseDate, i)); }
  else if (type === "weekly") { for (let i = 0; i < 12; i++) dates.push(addDays(baseDate, i * 7)); }
  else if (type === "weekdays") {
    let d = new Date(baseDate), count = 0;
    while (count < 22) { if (d.getDay() !== 0 && d.getDay() !== 6) { dates.push(new Date(d)); count++; } d = addDays(d, 1); }
  }
  return dates;
};
const REPEAT_LABELS = { daily: "每天重复", weekly: "每周重复", weekdays: "工作日重复" };
const makeRepeatPlanId = () => `rp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const dateKeysInRange = (startKey, endKey, limit = 1000) => {
  if (!startKey || !endKey) return [];
  let start = dateFromKey(startKey), end = dateFromKey(endKey);
  if (start > end) [start, end] = [end, start];
  const out = [];
  let d = new Date(start), guard = 0;
  while (d <= end && guard < limit) { out.push(dateKey(d)); d = addDays(d, 1); guard += 1; }
  return out;
};
const repeatPlanDateKeys = (plan) => {
  if (!plan?.startKey || !plan?.endKey) return [];
  const all = dateKeysInRange(plan.startKey, plan.endKey);
  if (plan?.repeat === "weekdays") return all.filter((k) => { const day = dateFromKey(k).getDay(); return day !== 0 && day !== 6; });
  if (plan?.repeat === "weekly") {
    const weekdays = Array.isArray(plan.weekdays) && plan.weekdays.length ? plan.weekdays : [dateFromKey(plan.startKey).getDay()];
    return all.filter((k) => weekdays.includes(dateFromKey(k).getDay()));
  }
  return all;
};
const repeatPlanLabel = (plan) => {
  if (!plan) return "";
  if (plan.repeat === "daily") return "每天";
  if (plan.repeat === "weekdays") return "工作日";
  if (plan.repeat === "weekly") {
    const labels = ["日", "一", "二", "三", "四", "五", "六"];
    const days = Array.isArray(plan.weekdays) ? [...plan.weekdays].sort((a,b) => a-b) : [];
    return days.length ? `每周${days.map((d) => labels[d]).join("/")}` : "每周";
  }
  return "不重复";
};
const formatFocusTime = (sec) => {
  const total = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};
const formatTimerDisplay = (sec) => {
  const total = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};
const formatCountdownDisplay = (sec) => {
  const total = Math.max(0, Math.floor(sec || 0));
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return days > 0 ? `${days}天 ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
};
const countdownMatchesDate = (item, d) => {
  if (!item || item.enabled === false) return false;
  if (item.repeat === "daily") return true;
  if (item.repeat === "weekly") return Array.isArray(item.weekdays) && item.weekdays.includes(d.getDay());
  if (item.repeat === "monthly") return d.getDate() === Number(item.monthDay);
  return false;
};
const getNextCountdownOccurrence = (item, base = new Date()) => {
  if (!item?.time) return null;
  const [hh, mm] = String(item.time).split(":").map(Number);
  if (![hh, mm].every(Number.isFinite)) return null;
  for (let i = 0; i < 370; i += 1) {
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    if (!countdownMatchesDate(item, d)) continue;
    d.setHours(hh, mm, 0, 0);
    if (d.getTime() > base.getTime()) return d;
  }
  return null;
};

const taskReminderTime = (task) => {
  if (!task || task.reminderEnabled === false) return null;
  return task.reminderTime || task.time || null;
};
const mergeSessionRecord = (list, record) => {
  if (!record || !record.taskId || !record.dateKey) return list;
  const seconds = Math.max(0, Math.floor(Number(record.seconds) || 0));
  if (seconds <= 0 && !record.completedOnly) return list;
  const idx = list.findIndex((x) => x.taskId === record.taskId && x.dateKey === record.dateKey);
  if (idx < 0) return [...list, { ...record, seconds }];
  const next = [...list];
  const old = next[idx];
  next[idx] = {
    ...old,
    taskText: record.taskText || old.taskText,
    start: Math.min(Number(old.start) || Number(record.start), Number(record.start) || Number(old.start)),
    end: Math.max(Number(old.end) || 0, Number(record.end) || 0),
    seconds: Math.max(0, Number(old.seconds) || 0) + seconds,
    completedOnly: old.completedOnly && seconds <= 0 ? true : undefined,
  };
  return next;
};
const normalizeSessions = (sessions) => (Array.isArray(sessions) ? sessions : []).reduce((acc, item) => mergeSessionRecord(acc, item), []);
const migrateRepeatPlanData = (tasksByDate, savedPlans) => {
  const source = tasksByDate && typeof tasksByDate === "object" ? tasksByDate : {};
  const nextTasks = Object.fromEntries(Object.entries(source).map(([k, list]) => [k, Array.isArray(list) ? list.map((t) => ({ ...t })) : []]));
  const plans = Array.isArray(savedPlans) ? savedPlans.map((p) => ({ ...p, weekdays: Array.isArray(p.weekdays) ? [...p.weekdays] : [] })) : [];
  const groups = new Map();
  Object.entries(nextTasks).forEach(([dk, list]) => list.forEach((task) => {
    if (!task || task.repeatPlanId || !task.repeat || task.repeat === "none") return;
    const gk = `${task.text || ""}__${task.time || ""}__${task.repeat}`;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push({ dk, task });
  }));
  groups.forEach((rows) => {
    if (!rows.length) return;
    const first = rows[0].task;
    const keys = rows.map((r) => r.dk).sort((a,b) => dateFromKey(a) - dateFromKey(b));
    const id = makeRepeatPlanId();
    rows.forEach(({ task }) => { task.repeatPlanId = id; });
    const weekdaySet = new Set(keys.map((k) => dateFromKey(k).getDay()));
    plans.push({
      id, text: first.text || "", time: first.time || null, repeat: first.repeat,
      weekdays: first.repeat === "weekly" ? Array.from(weekdaySet).sort((a,b) => a-b) : [],
      startKey: keys[0], endKey: keys[keys.length - 1], enabled: true, createdAt: Date.now(), migrated: true,
    });
  });
  return { tasksByDate: nextTasks, repeatPlans: plans };
};

/* ---------- 主题色板 ---------- */
const THEMES = {
  light: {
    bg: "#EDEEEA", window: "#FCFCFA", text: "#2B2B27", subtext: "#9A9A90",
    divider: "#EEEDE7", hover: "#F4F3EE", accent: "#6E8F6F", accentText: "#FFFFFF",
    doneText: "#B7B6AD", inputBg: "#F4F3EE", overdueBg: "#F3D9D4", overdueText: "#B14B3A",
    activeTaskBg: "#DCE8D8",
  },
  dark: {
    bg: "#111110", window: "#1B1B19", text: "#EDEDE7", subtext: "#8B8B82",
    divider: "#2A2A26", hover: "#242422", accent: "#8FB398", accentText: "#15251B",
    doneText: "#5C5C55", inputBg: "#242422", overdueBg: "#3A2420", overdueText: "#E08A73",
    activeTaskBg: "#536457",
  },
};

const seedTasks = [
  { id: 1, text: "查看今天的日程安排", time: "09:00", done: false, repeat: "none" },
  { id: 2, text: "回复两封重要邮件", time: "18:00", done: false, repeat: "none" },
  { id: 3, text: "喝一杯水，伸展一下", time: null, done: true, repeat: "none" },
];

const STORAGE_KEY = "today-app-state-v1";

/* ---------- 圆形勾选按钮 ---------- */
function CheckCircle({ done, onClick, c }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 20, height: 20, borderRadius: "9999px",
        border: `2px solid ${done ? c.accent : c.subtext}`,
        background: done ? c.accent : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "all .18s ease", cursor: "pointer",
      }}
      aria-label={done ? "标记为未完成" : "标记为已完成"}
    >
      {done && <Check size={12} strokeWidth={3} color={c.accentText} />}
    </button>
  );
}

/* ---------- 任务行 ---------- */
function TaskRow({ task, c, compact, onToggle, onDelete, onAction, onEdit, onReminder, isActive, isRunning, overdue, focusSeconds = 0 }) {
  const reminderTime = taskReminderTime(task);
  const [noteOpen, setNoteOpen] = useState(false);
  const note = typeof task.note === "string" ? task.note.trim() : "";
  return (
    <div style={{
      padding: compact ? "0" : "2px 0",
      background: isActive ? c.activeTaskBg : "transparent", borderRadius: 8,
    }}>
    <div className="flex items-center" style={{
      gap: compact ? 6 : 8, padding: compact ? "5px 4px" : "8px 4px",
    }}>
      <CheckCircle done={task.done} c={c} onClick={() => onToggle(task.id)} />
      {task.repeat && task.repeat !== "none" && (
        <span title={REPEAT_LABELS[task.repeat]} style={{ display: "flex", flexShrink: 0 }}>
          <Repeat size={compact ? 9 : 11} color={c.subtext} />
        </span>
      )}
      {task.time && (
        <span style={{
          fontSize: 10, flexShrink: 0, fontWeight: overdue ? 700 : 400,
          color: overdue ? c.overdueText : c.subtext,
          background: compact ? "transparent" : overdue ? c.overdueBg : c.hover,
          padding: compact ? 0 : "2px 6px", borderRadius: 999,
        }}>{task.time}</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: compact ? 12.5 : 14, color: task.done ? c.doneText : c.text,
          textDecoration: task.done ? "line-through" : "none", wordBreak: "break-word",
        }}>{task.text}</div>
        {!compact && reminderTime && (
          <div style={{ fontSize: 9.5, color: c.subtext, marginTop: 1 }}>提醒 {reminderTime}</div>
        )}
        {!compact && note && (
          <button onClick={() => setNoteOpen((v) => !v)} title={noteOpen ? "收起备注" : "展开备注"}
            className="flex items-center" style={{ gap: 3, marginTop: 3, fontSize: 9.5, color: c.subtext }}>
            <FileText size={10} /> 备注 {noteOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        )}
      </div>
      {focusSeconds > 0 && (
        <span title="累计专注时间" style={{ fontSize: compact ? 9 : 10, color: isActive ? c.accent : c.subtext, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {formatFocusTime(focusSeconds)}
        </span>
      )}
      {!compact && onReminder && (
        <button onClick={() => onReminder(task.id)} title={reminderTime ? `提醒 ${reminderTime}` : "设置提醒"}
          style={{ color: reminderTime ? c.accent : c.subtext, flexShrink: 0, display: "flex", padding: 2 }}>
          {reminderTime ? <Bell size={13} /> : <BellOff size={13} />}
        </button>
      )}
      {!compact && onEdit && (
        <button onClick={() => onEdit(task.id)} title="编辑任务" style={{ color: c.subtext, flexShrink: 0, display: "flex", padding: 2 }}>
          <Pencil size={13} />
        </button>
      )}
      {!compact && !task.done && onAction && (
        <button onClick={() => onAction(task.id)} style={{ color: isActive ? c.accent : c.subtext, flexShrink: 0, display: "flex", padding: 2 }} title={isActive && isRunning ? "暂停" : "开始计时"}>
          {isActive && isRunning ? <Pause size={13} /> : <Play size={13} />}
        </button>
      )}
      {!compact && onDelete && (
        <button onClick={() => onDelete(task.id)} style={{ color: c.subtext, flexShrink: 0, display: "flex", padding: 2 }} title="删除任务">
          <X size={13} />
        </button>
      )}
    </div>
    {!compact && note && noteOpen && (
      <div style={{ margin: "0 8px 7px 32px", padding: "7px 9px", borderRadius: 8, background: c.inputBg, color: c.text, fontSize: 11.5, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {note}
      </div>
    )}
    </div>
  );
}

function IconButton({ children, onClick, title, c, active }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 27, height: 27, borderRadius: 8, display: "flex",
        alignItems: "center", justifyContent: "center",
        color: active ? c.accent : c.subtext, background: hover ? c.hover : "transparent",
        transition: "background .15s ease", flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

/* ---------- 月历视图（支持任务拖拽改期） ---------- */
function CalendarView({ monthDate, setMonthDate, selectedDate, today, tasksByDate, c, onSelectDate, onOpenDay, onMoveTask, onDeleteTask, onClearDay, onClearDates, onClearMonth, onClearAll }) {
  const [dragOverKey, setDragOverKey] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [cleanupMode, setCleanupMode] = useState(false);
  const [cleanupDates, setCleanupDates] = useState(new Set());
  const [cleanupTasks, setCleanupTasks] = useState(new Set());
  const confirmTimerRef = useRef(null);
  const armOrRun = (key, action) => {
    if (confirmAction === key) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmAction(null); action();
    } else {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmAction(key);
      confirmTimerRef.current = setTimeout(() => setConfirmAction(null), 4000);
    }
  };
  const cells = buildMonthGrid(monthDate);
  const selectedKey = dateKey(selectedDate);
  const todayKey = dateKey(today);
  const selectedTasks = tasksByDate[selectedKey] || [];
  const selectedIsPast = startOfDay(selectedDate) < startOfDay(today);
  const incompleteSelected = selectedTasks.filter((t) => !t.done);
  const cleanupTaskRows = Array.from(cleanupDates)
    .sort((a, b) => dateFromKey(a) - dateFromKey(b))
    .flatMap((dk) => (tasksByDate[dk] || []).map((task) => ({ dk, task })));

  const toggleCleanupDate = (k) => {
    setCleanupDates((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };
  const toggleCleanupTask = (id) => setCleanupTasks((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const exitCleanupMode = () => { setCleanupMode(false); setCleanupDates(new Set()); setCleanupTasks(new Set()); setConfirmAction(null); };

  return (
    <div style={{ padding: "8px 14px 12px", height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 315px", gap: 14, height: "100%" }}>
        <div style={{ minWidth: 0, overflowY: "auto", paddingRight: 2 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <IconButton c={c} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} title="上个月"><ChevronLeft size={16} /></IconButton>
            <div style={{ fontSize: 16, fontWeight: 650, color: c.text }}>{monthDate.getFullYear()}年{monthDate.getMonth() + 1}月</div>
            <IconButton c={c} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} title="下个月"><ChevronRight size={16} /></IconButton>
          </div>
          <div className="flex items-center justify-between" style={{ marginBottom: 7, gap: 8 }}>
            <div style={{ fontSize: 10.5, color: c.subtext }}>可拖动任务改期；清理模式可跨多天选择任务</div>
            <button onClick={() => cleanupMode ? exitCleanupMode() : setCleanupMode(true)}
              style={{ flexShrink: 0, fontSize: 10.5, padding: "5px 8px", borderRadius: 8, background: cleanupMode ? c.accent : c.hover, color: cleanupMode ? c.accentText : c.text }}>
              {cleanupMode ? "退出清理" : "多天清理"}
            </button>
          </div>
          <div className="grid grid-cols-7" style={{ marginBottom: 4 }}>
            {WEEKDAYS.map((w) => <div key={w} style={{ fontSize: 10.5, color: c.subtext, textAlign: "center", padding: "2px 0" }}>{w.slice(2)}</div>)}
          </div>
          <div className="grid grid-cols-7" style={{ gap: 4 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = dateKey(d); const list = tasksByDate[k] || [];
              const isToday = k === todayKey; const isSelected = k === selectedKey; const isDragOver = dragOverKey === k; const isCleanupSelected = cleanupDates.has(k);
              return (
                <div key={i} onDragOver={(e) => { if (!cleanupMode) { e.preventDefault(); setDragOverKey(k); } }} onDragLeave={() => setDragOverKey((dk) => dk === k ? null : dk)}
                  onDrop={(e) => { if (cleanupMode) return; e.preventDefault(); try { const data = JSON.parse(e.dataTransfer.getData("text/plain")); onMoveTask(data.fromKey, k, data.taskId); } catch {} setDragOverKey(null); }}
                  style={{ minHeight: 84, borderRadius: 10, padding: "4px 3px", background: isCleanupSelected ? c.overdueBg : isDragOver ? c.hover : isSelected ? c.accent : isToday ? c.hover : "transparent", outline: isCleanupSelected ? `1.5px solid ${c.overdueText}` : isDragOver ? `1.5px dashed ${c.accent}` : "none" }}>
                  <button onClick={() => cleanupMode ? toggleCleanupDate(k) : onSelectDate(d)} style={{ width: "100%", fontSize: 12, fontWeight: isToday || isSelected || isCleanupSelected ? 700 : 400, color: isCleanupSelected ? c.overdueText : isSelected ? c.accentText : c.text, lineHeight: 1.4 }}>
                    {cleanupMode ? `${isCleanupSelected ? "✓ " : ""}${d.getDate()}` : d.getDate()}
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                    {list.slice(0, 4).map((t) => (
                      <div key={t.id} draggable={!cleanupMode} onDragStart={(e) => { if (!cleanupMode) e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: t.id, fromKey: k })); }} title={t.text}
                        style={{ fontSize: 8.5, lineHeight: "12px", padding: "1px 3px", borderRadius: 4, cursor: cleanupMode ? "default" : "grab", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: t.done ? "line-through" : "none", background: t.done ? "transparent" : isSelected ? "rgba(255,255,255,0.35)" : c.accent, color: t.done ? c.subtext : c.accentText, border: t.done ? `1px solid ${c.divider}` : "none" }}>
                        {t.text}
                      </div>
                    ))}
                    {list.length > 4 && <div style={{ fontSize: 8, textAlign: "center", color: isSelected ? c.accentText : c.subtext }}>+{list.length - 4}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ borderLeft: `1px solid ${c.divider}`, paddingLeft: 14, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {cleanupMode ? (
            <>
              <div className="flex items-center justify-between" style={{ marginBottom: 7 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 650, color: c.text }}>多天清理</div>
                  <div style={{ fontSize: 10.5, color: c.subtext }}>已选 {cleanupDates.size} 天 · {cleanupTasks.size} 项任务</div>
                </div>
                <button onClick={() => { setCleanupDates(new Set()); setCleanupTasks(new Set()); }} style={{ fontSize: 10.5, color: c.subtext }}>清除选择</button>
              </div>
              <div style={{ fontSize: 10.5, color: c.subtext, marginBottom: 7 }}>先在左侧点选需要处理的日期，再在下面勾选只想删除的任务。</div>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                {cleanupDates.size === 0 && <div style={{ fontSize: 12, color: c.subtext, padding: "22px 4px", textAlign: "center" }}>请先选择日期</div>}
                {cleanupDates.size > 0 && cleanupTaskRows.length === 0 && <div style={{ fontSize: 12, color: c.subtext, padding: "22px 4px", textAlign: "center" }}>所选日期没有任务</div>}
                {cleanupTaskRows.map(({ dk, task }) => (
                  <label key={`${dk}-${task.id}`} className="flex items-start" style={{ gap: 7, padding: "7px 6px", borderBottom: `1px solid ${c.divider}`, cursor: "pointer" }}>
                    <input type="checkbox" checked={cleanupTasks.has(task.id)} onChange={() => toggleCleanupTask(task.id)} style={{ marginTop: 2, accentColor: c.accent }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11.5, color: task.done ? c.doneText : c.text, textDecoration: task.done ? "line-through" : "none", wordBreak: "break-word" }}>{task.text}</div>
                      <div style={{ fontSize: 9.5, color: c.subtext, marginTop: 2 }}>{displayDate(dateFromKey(dk))}{task.time ? ` · ${task.time}` : ""}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${c.divider}`, paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <button disabled={cleanupTasks.size === 0} onClick={() => armOrRun("selectedTasks", () => { cleanupTasks.forEach((id) => onDeleteTask(id)); setCleanupTasks(new Set()); })}
                  style={{ fontSize: 10.5, padding: "7px 8px", borderRadius: 7, background: confirmAction === "selectedTasks" ? c.overdueText : c.overdueBg, color: confirmAction === "selectedTasks" ? "#fff" : c.overdueText, opacity: cleanupTasks.size ? 1 : .45 }}>
                  {confirmAction === "selectedTasks" ? "再点一次删除选中任务" : `删除选中任务（${cleanupTasks.size}）`}
                </button>
                <button disabled={cleanupDates.size === 0} onClick={() => armOrRun("selectedDates", () => { onClearDates(Array.from(cleanupDates)); exitCleanupMode(); })}
                  style={{ fontSize: 10.5, padding: "7px 8px", borderRadius: 7, background: confirmAction === "selectedDates" ? c.overdueText : c.hover, color: confirmAction === "selectedDates" ? "#fff" : c.overdueText, opacity: cleanupDates.size ? 1 : .45 }}>
                  {confirmAction === "selectedDates" ? "再点一次清空这些日期" : `清空所选 ${cleanupDates.size} 天全部任务`}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 650, color: c.text }}>{displayDate(selectedDate)}</div>
                  <div style={{ fontSize: 10.5, color: c.subtext }}>{WEEKDAYS[selectedDate.getDay()]} · {selectedTasks.length} 项</div>
                </div>
                <button onClick={() => onOpenDay(selectedDate)} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 8, background: c.hover, color: c.text }}>打开当天</button>
              </div>

              {selectedIsPast && incompleteSelected.length > 0 && (
                <button onClick={() => incompleteSelected.forEach((t) => onMoveTask(selectedKey, todayKey, t.id))}
                  style={{ marginBottom: 8, padding: "7px 8px", borderRadius: 8, background: c.accent, color: c.accentText, fontSize: 11.5, fontWeight: 600 }}>
                  全部未完成移到今天（{incompleteSelected.length}）
                </button>
              )}

              <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                {selectedTasks.length === 0 && <div style={{ fontSize: 12, color: c.subtext, padding: "20px 4px", textAlign: "center" }}>这一天没有任务</div>}
                {selectedTasks.map((task) => (
                  <div key={task.id} style={{ padding: "7px 7px", borderRadius: 8, background: task.done ? "transparent" : c.hover, marginBottom: 5, border: task.done ? `1px solid ${c.divider}` : "none" }}>
                    <div className="flex items-start" style={{ gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: task.done ? c.doneText : c.text, textDecoration: task.done ? "line-through" : "none", wordBreak: "break-word", lineHeight: 1.35 }}>{task.text}</div>
                      <button onClick={() => onDeleteTask(task.id)} title="删除这项任务" style={{ color: c.overdueText, flexShrink: 0, display: "flex", padding: 2 }}><X size={12} /></button>
                    </div>
                    <div className="flex items-center justify-between" style={{ marginTop: 4, gap: 6 }}>
                      <span style={{ fontSize: 9.5, color: c.subtext }}>{task.time ? `计划 ${task.time}` : "无计划时间"}</span>
                      {selectedIsPast && !task.done && (
                        <button onClick={() => onMoveTask(selectedKey, todayKey, task.id)} className="flex items-center" style={{ gap: 3, fontSize: 10.5, color: c.accent, fontWeight: 600 }}>
                          移到今天 <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${c.divider}`, marginTop: 8, paddingTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                <button onClick={() => armOrRun("day", () => onClearDay(selectedKey))} style={{ fontSize: 10.5, padding: "6px 8px", borderRadius: 7, background: confirmAction === "day" ? c.overdueBg : c.hover, color: confirmAction === "day" ? c.overdueText : c.subtext }}>{confirmAction === "day" ? "确定清空？" : "清空所选日期"}</button>
                <button onClick={() => armOrRun("month", () => onClearMonth(monthDate.getFullYear(), monthDate.getMonth()))} style={{ fontSize: 10.5, padding: "6px 8px", borderRadius: 7, background: confirmAction === "month" ? c.overdueBg : c.hover, color: confirmAction === "month" ? c.overdueText : c.subtext }}>{confirmAction === "month" ? "确定清空？" : "清空本月计划"}</button>
                <button onClick={() => armOrRun("all", onClearAll)} style={{ fontSize: 10.5, padding: "6px 8px", borderRadius: 7, background: confirmAction === "all" ? c.overdueText : c.overdueBg, color: confirmAction === "all" ? "#fff" : c.overdueText }}>{confirmAction === "all" ? "再点一次清空全部" : "清空全部计划"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 批量添加计划弹窗 ---------- */
function BatchAddModal({ c, onClose, onSubmit, initialDate, today, repeatPlans = [], onUpdatePlan, onTogglePlan, onDeletePlan }) {
  const [text, setText] = useState("");
  const [monthDate, setMonthDate] = useState(initialDate);
  const [selected, setSelected] = useState(new Set([dateKey(initialDate)]));
  const [repeat, setRepeat] = useState("none");
  const [weekdays, setWeekdays] = useState(new Set([initialDate.getDay()]));
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState(toIsoDate(initialDate));
  const [rangeEnd, setRangeEnd] = useState(toIsoDate(initialDate));
  const [manageOpen, setManageOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletePlanId, setDeletePlanId] = useState(null);
  const [rangeError, setRangeError] = useState("");

  const cells = buildMonthGrid(monthDate);
  const setRangeSelection = (start, end) => {
    const startD = startOfDay(start), endD = startOfDay(end);
    if (startD > endD) { setRangeError("结束日期不能早于开始日期"); return; }
    const diff = Math.round((endD - startD) / 86400000) + 1;
    if (diff > 1000) { setRangeError("一次最多安排1000天"); return; }
    setRangeError("");
    const keys = Array.from({ length: diff }, (_, i) => dateKey(addDays(startD, i)));
    setSelected(new Set(keys));
    setRangeStart(toIsoDate(startD)); setRangeEnd(toIsoDate(endD));
    setMonthDate(new Date(startD.getFullYear(), startD.getMonth(), 1));
  };
  const toggleDate = (d) => {
    const k = dateKey(d);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };
  const quickSelect = (mode) => {
    setCustomRangeOpen(false); setRangeError("");
    if (mode === "today") setRangeSelection(today, today);
    if (mode === "tomorrow") { const d = addDays(today, 1); setRangeSelection(d, d); }
    if (mode === "week") setRangeSelection(today, addDays(today, 6));
    if (mode === "month") setRangeSelection(today, addDays(today, 29));
    if (mode === "custom") { setCustomRangeOpen(true); }
  };
  const applyCustomRange = () => {
    if (!rangeStart || !rangeEnd) { setRangeError("请选择开始和结束日期"); return; }
    setRangeSelection(dateFromIso(rangeStart), dateFromIso(rangeEnd));
  };
  const toggleWeekday = (day) => setWeekdays((prev) => {
    const next = new Set(prev);
    next.has(day) ? next.delete(day) : next.add(day);
    return next;
  });

  const selectedSorted = Array.from(selected).sort((a,b) => dateFromKey(a) - dateFromKey(b));
  const effectiveKeys = (() => {
    if (!selectedSorted.length) return [];
    if (repeat === "none") return selectedSorted;
    const all = dateKeysInRange(selectedSorted[0], selectedSorted[selectedSorted.length - 1]);
    if (repeat === "weekdays") return all.filter((k) => { const d = dateFromKey(k).getDay(); return d !== 0 && d !== 6; });
    if (repeat === "weekly") return all.filter((k) => weekdays.has(dateFromKey(k).getDay()));
    return all;
  })();

  const handleSubmit = () => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0 || effectiveKeys.length === 0) return;
    const startKey = selectedSorted[0];
    const endKey = selectedSorted[selectedSorted.length - 1];
    onSubmit(effectiveKeys, lines.map((l) => parseTaskLine(l)), {
      repeat,
      weekdays: repeat === "weekly" ? Array.from(weekdays).sort((a,b) => a-b) : [],
      startKey, endKey,
    });
  };

  const beginEditPlan = (plan) => {
    setDeletePlanId(null);
    setEditingPlan({ ...plan, weekdays: Array.isArray(plan.weekdays) ? [...plan.weekdays] : [] });
  };
  const editToggleWeekday = (day) => setEditingPlan((prev) => prev ? ({ ...prev, weekdays: prev.weekdays.includes(day) ? prev.weekdays.filter((d) => d !== day) : [...prev.weekdays, day].sort((a,b) => a-b) }) : prev);
  const saveEditedPlan = () => {
    if (!editingPlan) return;
    const textValue = String(editingPlan.text || "").trim();
    if (!textValue || !editingPlan.startKey || !editingPlan.endKey) return;
    if (dateFromKey(editingPlan.startKey) > dateFromKey(editingPlan.endKey)) { setRangeError("重复计划的结束日期不能早于开始日期"); return; }
    const planDays = Math.round((startOfDay(dateFromKey(editingPlan.endKey)) - startOfDay(dateFromKey(editingPlan.startKey))) / 86400000) + 1;
    if (planDays > 1000) { setRangeError("一个重复计划最多安排1000天"); return; }
    if (editingPlan.repeat === "weekly" && (!editingPlan.weekdays || editingPlan.weekdays.length === 0)) { setRangeError("每周重复至少选择一个星期"); return; }
    onUpdatePlan?.(editingPlan.id, { ...editingPlan, text: textValue, time: editingPlan.time || null });
    setEditingPlan(null); setRangeError("");
  };
  const weekLabels = [[1,"一"],[2,"二"],[3,"三"],[4,"四"],[5,"五"],[6,"六"],[0,"日"]];

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
      <div style={{ width: 350, maxHeight: 620, background: c.window, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.35)", overflowY: "auto" }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 14.5, fontWeight: 650, color: c.text }}>批量添加计划</span>
          <button onClick={onClose} style={{ color: c.subtext }}><X size={16} /></button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"每行一个任务，可选加时间前缀\n例如：\n09:00 晨会\n阅读30分钟"}
          style={{ width: "100%", height: 84, resize: "none", fontSize: 13, padding: 9, borderRadius: 10, background: c.inputBg, color: c.text, outline: "none", border: "none", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
        />

        <div className="flex items-center justify-between">
          <span style={{ fontSize: 11.5, color: c.subtext }}>安排方式</span>
          <select value={repeat} onChange={(e) => setRepeat(e.target.value)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }}>
            <option value="none">按所选日期 / 不重复</option>
            <option value="daily">每天</option>
            <option value="weekly">每周指定星期</option>
            <option value="weekdays">工作日</option>
          </select>
        </div>
        {repeat === "weekly" && (
          <div className="flex items-center" style={{ gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, color: c.subtext, marginRight: 2 }}>星期</span>
            {weekLabels.map(([day,label]) => <button key={day} onClick={() => toggleWeekday(day)} style={{ width: 27, height: 27, borderRadius: 999, fontSize: 10.5, background: weekdays.has(day) ? c.accent : c.hover, color: weekdays.has(day) ? c.accentText : c.subtext }}>{label}</button>)}
          </div>
        )}

        <div>
          <div style={{ fontSize: 11.5, color: c.subtext, marginBottom: 6 }}>应用日期</div>
          <div className="flex items-center" style={{ gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
            {[["today", "今天"], ["tomorrow", "明天"], ["week", "未来7天"], ["month", "未来30天"], ["custom", "自定义范围"]].map(([k, label]) => (
              <button key={k} onClick={() => quickSelect(k)} style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 999, background: k === "custom" && customRangeOpen ? c.accent : c.hover, color: k === "custom" && customRangeOpen ? c.accentText : c.subtext }}>{label}</button>
            ))}
          </div>
          {customRangeOpen && (
            <div className="flex items-center" style={{ gap: 5, marginBottom: 8 }}>
              <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} style={{ flex: 1, minWidth: 0, fontSize: 10.5, padding: "5px 5px", borderRadius: 7, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
              <span style={{ fontSize: 10, color: c.subtext }}>至</span>
              <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} style={{ flex: 1, minWidth: 0, fontSize: 10.5, padding: "5px 5px", borderRadius: 7, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
              <button onClick={applyCustomRange} style={{ fontSize: 10.5, padding: "5px 7px", borderRadius: 7, background: c.accent, color: c.accentText, flexShrink: 0 }}>应用</button>
            </div>
          )}
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <IconButton c={c} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} title="上个月"><ChevronLeft size={14} /></IconButton>
            <span style={{ fontSize: 12, color: c.text, fontWeight: 600 }}>{monthDate.getFullYear()}年{monthDate.getMonth() + 1}月</span>
            <IconButton c={c} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} title="下个月"><ChevronRight size={14} /></IconButton>
          </div>
          <div className="grid grid-cols-7" style={{ gap: 3 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = dateKey(d), isSel = selected.has(k), isToday = k === dateKey(today);
              return <button key={i} onClick={() => toggleDate(d)} style={{ fontSize: 11, padding: "5px 0", borderRadius: 8, background: isSel ? c.accent : isToday ? c.hover : "transparent", color: isSel ? c.accentText : c.text, fontWeight: isToday ? 700 : 400 }}>{d.getDate()}</button>;
            })}
          </div>
        </div>

        {rangeError && <div style={{ fontSize: 10.5, color: c.overdueText }}>{rangeError}</div>}
        <button onClick={handleSubmit} disabled={!text.trim() || effectiveKeys.length === 0} style={{ padding: "10px 0", borderRadius: 10, background: c.accent, color: c.accentText, fontSize: 13, fontWeight: 650, opacity: !text.trim() || effectiveKeys.length === 0 ? .45 : 1 }}>
          添加到 {effectiveKeys.length} 天
        </button>

        <div style={{ borderTop: `1px solid ${c.divider}`, paddingTop: 8 }}>
          <button onClick={() => { setManageOpen((v) => !v); setEditingPlan(null); setDeletePlanId(null); }} className="flex items-center justify-between" style={{ width: "100%", color: c.text, fontSize: 11.5, fontWeight: 600 }}>
            <span>已保存的重复计划（{repeatPlans.length}）</span>{manageOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {manageOpen && (
            <div style={{ marginTop: 7, display: "flex", flexDirection: "column", gap: 5 }}>
              {repeatPlans.length === 0 && <div style={{ fontSize: 10.5, color: c.subtext, textAlign: "center", padding: "8px 0" }}>还没有重复计划</div>}
              {repeatPlans.map((plan) => (
                <div key={plan.id} style={{ padding: "7px 8px", borderRadius: 9, background: c.hover }}>
                  <div className="flex items-center" style={{ gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, color: plan.enabled === false ? c.subtext : c.text, textDecoration: plan.enabled === false ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{plan.time ? `${plan.time} ` : ""}{plan.text}</div>
                      <div style={{ fontSize: 9.5, color: c.subtext, marginTop: 2 }}>{repeatPlanLabel(plan)} · {plan.startKey} 至 {plan.endKey}{plan.enabled === false ? " · 已暂停" : ""}</div>
                    </div>
                    <button onClick={() => beginEditPlan(plan)} title="编辑" style={{ color: c.subtext, display: "flex" }}><Pencil size={12} /></button>
                    <button onClick={() => onTogglePlan?.(plan.id)} style={{ fontSize: 9.5, padding: "3px 6px", borderRadius: 999, background: plan.enabled === false ? c.accent : c.inputBg, color: plan.enabled === false ? c.accentText : c.subtext }}>{plan.enabled === false ? "恢复" : "暂停"}</button>
                    <button onClick={() => setDeletePlanId(deletePlanId === plan.id ? null : plan.id)} title="删除" style={{ color: c.overdueText, display: "flex" }}><X size={12} /></button>
                  </div>
                  {deletePlanId === plan.id && (
                    <div className="flex items-center" style={{ gap: 5, marginTop: 6 }}>
                      <button onClick={() => { onDeletePlan?.(plan.id, false); setDeletePlanId(null); }} style={{ flex: 1, fontSize: 9.5, padding: "5px 4px", borderRadius: 7, background: c.inputBg, color: c.text }}>仅删除重复计划</button>
                      <button onClick={() => { onDeletePlan?.(plan.id, true); setDeletePlanId(null); }} style={{ flex: 1, fontSize: 9.5, padding: "5px 4px", borderRadius: 7, background: c.overdueBg, color: c.overdueText }}>并删未执行任务</button>
                    </div>
                  )}
                </div>
              ))}

              {editingPlan && (
                <div style={{ marginTop: 4, padding: 9, borderRadius: 9, border: `1px solid ${c.divider}` }}>
                  <div style={{ fontSize: 10.5, color: c.subtext, marginBottom: 6 }}>编辑重复计划</div>
                  <input value={editingPlan.text} onChange={(e) => setEditingPlan({ ...editingPlan, text: e.target.value })} placeholder="任务名称" style={{ width: "100%", boxSizing: "border-box", fontSize: 11.5, padding: "6px 7px", borderRadius: 7, background: c.inputBg, color: c.text, border: "none", outline: "none", marginBottom: 5 }} />
                  <div className="flex items-center" style={{ gap: 5, marginBottom: 5 }}>
                    <input type="time" value={editingPlan.time || ""} onChange={(e) => setEditingPlan({ ...editingPlan, time: e.target.value || null })} style={{ width: 94, fontSize: 10.5, padding: "5px 6px", borderRadius: 7, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
                    <select value={editingPlan.repeat} onChange={(e) => setEditingPlan({ ...editingPlan, repeat: e.target.value })} style={{ flex: 1, fontSize: 10.5, padding: "5px 6px", borderRadius: 7, background: c.inputBg, color: c.text, border: "none", outline: "none" }}>
                      <option value="daily">每天</option><option value="weekly">每周指定星期</option><option value="weekdays">工作日</option>
                    </select>
                  </div>
                  {editingPlan.repeat === "weekly" && <div className="flex items-center" style={{ gap: 4, marginBottom: 5 }}>{weekLabels.map(([day,label]) => <button key={day} onClick={() => editToggleWeekday(day)} style={{ width: 24, height: 24, borderRadius: 999, fontSize: 9.5, background: editingPlan.weekdays.includes(day) ? c.accent : c.inputBg, color: editingPlan.weekdays.includes(day) ? c.accentText : c.subtext }}>{label}</button>)}</div>}
                  <div className="flex items-center" style={{ gap: 5 }}>
                    <input type="date" value={toIsoDate(dateFromKey(editingPlan.startKey))} onChange={(e) => setEditingPlan({ ...editingPlan, startKey: dateKey(dateFromIso(e.target.value)) })} style={{ flex: 1, minWidth: 0, fontSize: 9.5, padding: "5px 4px", borderRadius: 7, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
                    <span style={{ fontSize: 9, color: c.subtext }}>至</span>
                    <input type="date" value={toIsoDate(dateFromKey(editingPlan.endKey))} onChange={(e) => setEditingPlan({ ...editingPlan, endKey: dateKey(dateFromIso(e.target.value)) })} style={{ flex: 1, minWidth: 0, fontSize: 9.5, padding: "5px 4px", borderRadius: 7, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
                  </div>
                  <div style={{ fontSize: 9, color: c.subtext, marginTop: 5 }}>修改只重排未完成且未开始的任务；已完成或已有专注记录的历史任务会保留。</div>
                  <div className="flex items-center" style={{ gap: 5, marginTop: 7 }}>
                    <button onClick={() => setEditingPlan(null)} style={{ flex: 1, padding: "6px 0", borderRadius: 7, background: c.inputBg, color: c.subtext, fontSize: 10.5 }}>取消</button>
                    <button onClick={saveEditedPlan} style={{ flex: 1, padding: "6px 0", borderRadius: 7, background: c.accent, color: c.accentText, fontSize: 10.5, fontWeight: 600 }}>保存修改</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 夜间提醒弹窗 ---------- */
function ReminderModal({ c, list, onClose, onGoToday }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 41 }}>
      <div style={{ width: 300, background: c.window, borderRadius: 16, padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.35)" }}>
        <div style={{ fontSize: 14.5, fontWeight: 650, color: c.text, marginBottom: 6 }}>晚上好，该收尾了</div>
        {list.length > 0 ? (
          <>
            <div style={{ fontSize: 12.5, color: c.subtext, marginBottom: 10 }}>今天还有 {list.length} 项任务没完成，抓紧完成吧：</div>
            <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 14 }}>
              {list.map((t) => (
                <div key={t.id} style={{ fontSize: 13, color: c.text, padding: "4px 0" }}>· {t.text}</div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: c.subtext, marginBottom: 14 }}>今天的任务都完成啦，辛苦了！</div>
        )}
        <div className="flex items-center" style={{ gap: 8 }}>
          <button onClick={onGoToday} style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: c.accent, color: c.accentText, fontSize: 12.5, fontWeight: 600 }}>去完成</button>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: c.hover, color: c.text, fontSize: 12.5 }}>知道了</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 任务记录弹窗（支持按日期范围导出） ---------- */
function RecordsModal({ c, sessions, onClose, onClear }) {
  const [filter, setFilter] = useState("all");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [cleanDate, setCleanDate] = useState("");
  const [cleanMonth, setCleanMonth] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmRecordId, setConfirmRecordId] = useState(null);
  const confirmTimerRef = useRef(null);
  const confirmRecordTimerRef = useRef(null);
  const fmtTime = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtDur = (sec) => { const m = Math.floor(sec / 60), s = sec % 60; return m > 0 ? `${m}分${pad(s)}秒` : `${s}秒`; };

  const armOrRun = (key, action) => {
    if (confirmAction === key) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmAction(null);
      action();
    } else {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmAction(key);
      confirmTimerRef.current = setTimeout(() => setConfirmAction(null), 4000);
    }
  };
  const clearByDay = () => { if (!cleanDate) return; onClear((s) => toIsoDate(dateFromKey(s.dateKey)) !== cleanDate); };
  const clearByMonth = () => { if (!cleanMonth) return; onClear((s) => toIsoMonth(dateFromKey(s.dateKey)) !== cleanMonth); };
  const clearAll = () => onClear(() => false);
  const deleteSingleRecord = (id) => {
    if (confirmRecordId === id) {
      if (confirmRecordTimerRef.current) clearTimeout(confirmRecordTimerRef.current);
      setConfirmRecordId(null);
      onClear((s) => s.id !== id);
      return;
    }
    if (confirmRecordTimerRef.current) clearTimeout(confirmRecordTimerRef.current);
    setConfirmRecordId(id);
    confirmRecordTimerRef.current = setTimeout(() => setConfirmRecordId(null), 4000);
  };

  const dateKeys = Array.from(new Set(sessions.map((s) => s.dateKey))).sort((a, b) => dateFromKey(b) - dateFromKey(a));

  let filtered, filenameLabel;
  if (rangeFrom && rangeTo) {
    const fromD = dateFromIso(rangeFrom), toD = dateFromIso(rangeTo);
    filtered = sessions.filter((s) => { const d = dateFromKey(s.dateKey); return d >= fromD && d <= toD; });
    filenameLabel = `${rangeFrom}_至_${rangeTo}`;
  } else {
    filtered = filter === "all" ? sessions : sessions.filter((s) => s.dateKey === filter);
    filenameLabel = filter === "all" ? "全部" : filter;
  }

  const grouped = {};
  filtered.forEach((s) => { (grouped[s.dateKey] = grouped[s.dateKey] || []).push(s); });
  const groupKeys = Object.keys(grouped).sort((a, b) => dateFromKey(b) - dateFromKey(a));
  const grandTotal = filtered.reduce((a, s) => a + s.seconds, 0);

  const exportCsv = () => {
    const rows = [["日期", "任务", "开始时间", "结束时间", "花费时间(秒)"]];
    filtered.forEach((s) => rows.push([s.dateKey, s.taskText, fmtTime(s.start), fmtTime(s.end), s.seconds]));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `任务记录_${filenameLabel}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 42 }}>
      <div style={{ width: 330, maxHeight: 580, background: c.window, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 9, boxShadow: "0 20px 50px rgba(0,0,0,0.35)" }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 14.5, fontWeight: 650, color: c.text }}>任务记录</span>
          <button onClick={onClose} style={{ color: c.subtext }}><X size={16} /></button>
        </div>

        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setRangeFrom(""); setRangeTo(""); }}
          style={{ fontSize: 12, padding: "6px 8px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }}
        >
          <option value="all">全部日期</option>
          {dateKeys.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>

        <div style={{ fontSize: 10.5, color: c.subtext, textAlign: "center" }}>或按日期范围筛选 / 导出</div>
        <div className="flex items-center" style={{ gap: 6 }}>
          <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)}
            style={{ flex: 1, fontSize: 11, padding: "5px 6px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
          <span style={{ fontSize: 11, color: c.subtext }}>至</span>
          <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)}
            style={{ flex: 1, fontSize: 11, padding: "5px 6px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
          {(rangeFrom || rangeTo) && (
            <button onClick={() => { setRangeFrom(""); setRangeTo(""); }} style={{ color: c.subtext, flexShrink: 0 }} title="清除范围"><X size={13} /></button>
          )}
        </div>

        <div className="flex items-center justify-between" style={{ marginTop: 2 }}>
          <span style={{ fontSize: 11, color: c.subtext }}>共 {filtered.length} 条 · {fmtDur(grandTotal)}</span>
          <button onClick={exportCsv} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, background: c.accent, color: c.accentText, fontWeight: 600 }}>导出 CSV</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 90, maxHeight: 190 }}>
          {groupKeys.length === 0 && (
            <div style={{ fontSize: 12.5, color: c.subtext, textAlign: "center", padding: "24px 0" }}>没有符合条件的任务记录</div>
          )}
          {groupKeys.map((dk) => {
            const list = grouped[dk];
            const total = list.reduce((a, s) => a + s.seconds, 0);
            return (
              <div key={dk} style={{ marginBottom: 12 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 650, color: c.text }}>{dk}</span>
                  <span style={{ fontSize: 10.5, color: c.subtext }}>共 {fmtDur(total)}</span>
                </div>
                {list.map((s) => (
                  <div key={s.id} className="flex items-center justify-between" style={{ fontSize: 11.5, color: c.subtext, padding: "3px 0", gap: 6 }}>
                    <span style={{ color: c.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 2 }}>{s.taskText}</span>
                    <span style={{ flexShrink: 0 }}>{fmtTime(s.start)}–{fmtTime(s.end)} · {fmtDur(s.seconds)}</span>
                    <button
                      onClick={() => deleteSingleRecord(s.id)}
                      title={confirmRecordId === s.id ? "再点一次确认删除" : "删除这条记录"}
                      style={{
                        flexShrink: 0, minWidth: confirmRecordId === s.id ? 42 : 22, height: 22, padding: confirmRecordId === s.id ? "0 6px" : 0,
                        borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                        background: confirmRecordId === s.id ? c.overdueBg : "transparent",
                        color: confirmRecordId === s.id ? c.overdueText : c.subtext,
                        fontSize: 10.5, transition: "all .15s ease",
                      }}
                    >
                      {confirmRecordId === s.id ? "确定？" : <X size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: `1px solid ${c.divider}`, paddingTop: 9, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: c.subtext }}>清理记录</div>
          <div className="flex items-center" style={{ gap: 6 }}>
            <input
              type="date" value={cleanDate}
              onChange={(e) => { setCleanDate(e.target.value); setConfirmAction(null); }}
              style={{ flex: 1, fontSize: 11, padding: "5px 6px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }}
            />
            <button
              onClick={() => cleanDate && armOrRun("day", clearByDay)}
              disabled={!cleanDate}
              style={{
                fontSize: 11, padding: "6px 10px", borderRadius: 8, whiteSpace: "nowrap", flexShrink: 0,
                background: confirmAction === "day" ? c.overdueBg : c.hover,
                color: confirmAction === "day" ? c.overdueText : c.subtext,
                opacity: cleanDate ? 1 : 0.5,
              }}
            >
              {confirmAction === "day" ? "确定清空？" : "清空该日"}
            </button>
          </div>
          <div className="flex items-center" style={{ gap: 6 }}>
            <input
              type="month" value={cleanMonth}
              onChange={(e) => { setCleanMonth(e.target.value); setConfirmAction(null); }}
              style={{ flex: 1, fontSize: 11, padding: "5px 6px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }}
            />
            <button
              onClick={() => cleanMonth && armOrRun("month", clearByMonth)}
              disabled={!cleanMonth}
              style={{
                fontSize: 11, padding: "6px 10px", borderRadius: 8, whiteSpace: "nowrap", flexShrink: 0,
                background: confirmAction === "month" ? c.overdueBg : c.hover,
                color: confirmAction === "month" ? c.overdueText : c.subtext,
                opacity: cleanMonth ? 1 : 0.5,
              }}
            >
              {confirmAction === "month" ? "确定清空？" : "清空该月"}
            </button>
          </div>
          <button
            onClick={() => armOrRun("all", clearAll)}
            style={{
              fontSize: 12, padding: "8px 0", borderRadius: 8, fontWeight: 650,
              background: confirmAction === "all" ? c.overdueText : c.overdueBg,
              color: confirmAction === "all" ? "#FFFFFF" : c.overdueText,
            }}
          >
            {confirmAction === "all" ? "再点一次，清空全部记录" : "清空全部记录"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 自定义专注时间弹窗 ---------- */
function CustomTimerModal({ c, currentMinutes, onClose, onApply }) {
  const [value, setValue] = useState(String(currentMinutes || 90));
  const submit = () => {
    const minutes = Math.floor(Number(value));
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) return;
    onApply(minutes);
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 44 }}>
      <div style={{ width: 280, background: c.window, borderRadius: 16, padding: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.35)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 14.5, fontWeight: 650, color: c.text }}>自定义专注时间</span>
          <button onClick={onClose} style={{ color: c.subtext }}><X size={16} /></button>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <input autoFocus type="number" min="1" max="1440" value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
            style={{ flex: 1, minWidth: 0, fontSize: 15, padding: "9px 10px", borderRadius: 9, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
          <span style={{ fontSize: 12, color: c.subtext }}>分钟</span>
        </div>
        <div style={{ marginTop: 7, fontSize: 10.5, color: c.subtext }}>可输入 1–1440 分钟，例如 120、360。</div>
        <button onClick={submit} style={{ width: "100%", marginTop: 14, padding: "9px 0", borderRadius: 10, background: c.accent, color: c.accentText, fontSize: 12.5, fontWeight: 650 }}>确定</button>
      </div>
    </div>
  );
}

/* ---------- 目标倒计时管理弹窗 ---------- */
function CountdownManagerModal({ c, countdowns, onChange, onClose }) {
  const blank = { title: "", time: "18:00", repeat: "daily", weekdays: [1,2,3,4,5], monthDay: 1, remindBefore: 30, remindAtTime: true, enabled: true };
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank);
  const beginNew = () => { setEditingId(null); setDraft({ ...blank }); };
  const edit = (item) => { setEditingId(item.id); setDraft({ ...blank, ...item, weekdays: Array.isArray(item.weekdays) ? [...item.weekdays] : [] }); };
  const toggleWeekday = (day) => setDraft((prev) => ({ ...prev, weekdays: prev.weekdays.includes(day) ? prev.weekdays.filter((d) => d !== day) : [...prev.weekdays, day].sort((a,b) => a-b) }));
  const save = () => {
    const title = draft.title.trim();
    const before = Math.max(0, Math.min(43200, Math.floor(Number(draft.remindBefore) || 0)));
    const monthDay = Math.max(1, Math.min(31, Math.floor(Number(draft.monthDay) || 1)));
    if (!title || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) return;
    if (draft.repeat === "weekly" && draft.weekdays.length === 0) return;
    const item = { ...draft, title, remindBefore: before, monthDay };
    if (editingId == null) onChange([...countdowns, { ...item, id: Date.now() + Math.floor(Math.random() * 10000) }]);
    else onChange(countdowns.map((x) => x.id === editingId ? { ...item, id: editingId } : x));
    beginNew();
  };
  const remove = (id) => { onChange(countdowns.filter((x) => x.id !== id)); if (editingId === id) beginNew(); };
  const weekdayLabels = [[1,"一"],[2,"二"],[3,"三"],[4,"四"],[5,"五"],[6,"六"],[0,"日"]];
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 45 }}>
      <div style={{ width: 336, maxHeight: 610, background: c.window, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.35)", overflowY: "auto" }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 14.5, fontWeight: 650, color: c.text }}>目标倒计时</span>
          <button onClick={onClose} style={{ color: c.subtext }}><X size={16} /></button>
        </div>
        {countdowns.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {countdowns.map((item) => (
              <div key={item.id} className="flex items-center" style={{ gap: 7, padding: "6px 8px", borderRadius: 9, background: editingId === item.id ? c.hover : "transparent" }}>
                <button onClick={() => edit(item)} style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: c.subtext }}>{item.time} · {item.repeat === "daily" ? "每天" : item.repeat === "weekly" ? "每周" : `每月${item.monthDay}日`}</div>
                </button>
                <button onClick={() => onChange(countdowns.map((x) => x.id === item.id ? { ...x, enabled: x.enabled === false } : x))}
                  style={{ fontSize: 10.5, padding: "3px 7px", borderRadius: 999, background: item.enabled === false ? c.hover : c.accent, color: item.enabled === false ? c.subtext : c.accentText }}>
                  {item.enabled === false ? "关闭" : "启用"}
                </button>
                <button onClick={() => remove(item.id)} title="删除" style={{ color: c.subtext, display: "flex" }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}
        <div style={{ borderTop: `1px solid ${c.divider}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="名称，例如：下班、买菜"
            style={{ width: "100%", fontSize: 12.5, padding: "8px 9px", borderRadius: 9, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
          <div className="flex items-center" style={{ gap: 7 }}>
            <span style={{ fontSize: 11, color: c.subtext, width: 58 }}>目标时间</span>
            <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              style={{ flex: 1, fontSize: 12, padding: "6px 8px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
          </div>
          <div className="flex items-center" style={{ gap: 7 }}>
            <span style={{ fontSize: 11, color: c.subtext, width: 58 }}>重复</span>
            <select value={draft.repeat} onChange={(e) => setDraft({ ...draft, repeat: e.target.value })}
              style={{ flex: 1, fontSize: 12, padding: "6px 8px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }}>
              <option value="daily">每天</option>
              <option value="weekly">每周 / 指定星期</option>
              <option value="monthly">每月</option>
            </select>
          </div>
          {draft.repeat === "weekly" && (
            <div className="flex items-center" style={{ gap: 5, paddingLeft: 65 }}>
              {weekdayLabels.map(([day,label]) => <button key={day} onClick={() => toggleWeekday(day)} style={{ width: 28, height: 28, borderRadius: 999, fontSize: 11, background: draft.weekdays.includes(day) ? c.accent : c.hover, color: draft.weekdays.includes(day) ? c.accentText : c.subtext }}>{label}</button>)}
            </div>
          )}
          {draft.repeat === "monthly" && (
            <div className="flex items-center" style={{ gap: 7 }}>
              <span style={{ fontSize: 11, color: c.subtext, width: 58 }}>每月日期</span>
              <input type="number" min="1" max="31" value={draft.monthDay} onChange={(e) => setDraft({ ...draft, monthDay: e.target.value })}
                style={{ width: 76, fontSize: 12, padding: "6px 8px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
              <span style={{ fontSize: 11, color: c.subtext }}>日</span>
            </div>
          )}
          <div className="flex items-center" style={{ gap: 7 }}>
            <span style={{ fontSize: 11, color: c.subtext, width: 58 }}>提前提醒</span>
            <input type="number" min="0" max="43200" value={draft.remindBefore} onChange={(e) => setDraft({ ...draft, remindBefore: e.target.value })}
              style={{ width: 86, fontSize: 12, padding: "6px 8px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }} />
            <span style={{ fontSize: 11, color: c.subtext }}>分钟</span>
          </div>
          <label className="flex items-center" style={{ gap: 7, fontSize: 11.5, color: c.text, cursor: "pointer" }}>
            <input type="checkbox" checked={draft.remindAtTime} onChange={(e) => setDraft({ ...draft, remindAtTime: e.target.checked })} /> 到点提醒
          </label>
          <div className="flex items-center" style={{ gap: 7 }}>
            <button onClick={save} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: c.accent, color: c.accentText, fontSize: 12, fontWeight: 650 }}>{editingId == null ? "添加倒计时" : "保存修改"}</button>
            {editingId != null && <button onClick={beginNew} style={{ padding: "8px 11px", borderRadius: 9, background: c.hover, color: c.subtext, fontSize: 12 }}>取消编辑</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 编辑任务 ---------- */
function TaskEditModal({ c, task, onClose, onSave }) {
  const [text, setText] = useState(task?.text || "");
  const [time, setTime] = useState(task?.time || "");
  const [note, setNote] = useState(task?.note || "");
  const save = () => { const trimmed = text.trim(); if (trimmed) onSave({ text: trimmed, time: time || null, note: note.trim() }); };
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 48 }}>
      <div style={{ width: 300, background: c.window, borderRadius: 15, padding: 16, boxShadow: "0 20px 50px rgba(0,0,0,.35)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}><span style={{ fontSize: 14, fontWeight: 650, color: c.text }}>编辑任务</span><button onClick={onClose} style={{ color: c.subtext }}><X size={15} /></button></div>
        <div style={{ fontSize: 11, color: c.subtext, marginBottom: 4 }}>任务内容</div>
        <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: "8px 9px", borderRadius: 9, border: "none", outline: "none", background: c.inputBg, color: c.text, marginBottom: 10 }} />
        <div style={{ fontSize: 11, color: c.subtext, marginBottom: 4 }}>计划时间（可留空）</div>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontSize: 12, padding: "7px 9px", borderRadius: 9, border: "none", outline: "none", background: c.inputBg, color: c.text }} />
        <div style={{ fontSize: 11, color: c.subtext, marginTop: 10, marginBottom: 4 }}>备注 / 任务细节（可留空）</div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：需要准备的资料、步骤、联系人、注意事项……"
          style={{ width: "100%", height: 86, boxSizing: "border-box", resize: "vertical", fontSize: 12, lineHeight: 1.5, padding: "8px 9px", borderRadius: 9, border: "none", outline: "none", background: c.inputBg, color: c.text, fontFamily: "inherit" }} />
        <div className="flex items-center" style={{ gap: 8, marginTop: 14 }}><button onClick={onClose} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: c.hover, color: c.text, fontSize: 12 }}>取消</button><button onClick={save} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: c.accent, color: c.accentText, fontSize: 12, fontWeight: 600 }}>保存</button></div>
      </div>
    </div>
  );
}

/* ---------- 单项任务提醒 ---------- */
function TaskReminderModal({ c, task, onClose, onSave }) {
  const legacy = taskReminderTime(task) || "09:00";
  const [enabled, setEnabled] = useState(task?.reminderEnabled !== false && !!taskReminderTime(task));
  const [time, setTime] = useState(legacy);
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 49 }}>
      <div style={{ width: 300, background: c.window, borderRadius: 15, padding: 16, boxShadow: "0 20px 50px rgba(0,0,0,.35)" }}>
        <div className="flex items-center justify-between"><span style={{ fontSize: 14, fontWeight: 650, color: c.text }}>任务闹钟</span><button onClick={onClose} style={{ color: c.subtext }}><X size={15} /></button></div>
        <div style={{ fontSize: 12, color: c.text, marginTop: 10, marginBottom: 12, wordBreak: "break-word" }}>{task?.text}</div>
        <label className="flex items-center" style={{ gap: 7, fontSize: 12, color: c.text, marginBottom: 10 }}><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> 开启这项任务的提醒</label>
        <div style={{ fontSize: 11, color: c.subtext, marginBottom: 4 }}>几点提醒</div>
        <input type="time" disabled={!enabled} value={time} onChange={(e) => setTime(e.target.value)} style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: "8px 9px", borderRadius: 9, border: "none", outline: "none", background: c.inputBg, color: c.text, opacity: enabled ? 1 : .55 }} />
        <div style={{ fontSize: 10.5, color: c.subtext, marginTop: 7 }}>到设定时间会弹出 Windows 系统通知。</div>
        <div className="flex items-center" style={{ gap: 8, marginTop: 14 }}><button onClick={onClose} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: c.hover, color: c.text, fontSize: 12 }}>取消</button><button onClick={() => onSave({ reminderEnabled: enabled, reminderTime: enabled ? time : null })} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: c.accent, color: c.accentText, fontSize: 12, fontWeight: 600 }}>保存</button></div>
      </div>
    </div>
  );
}

/* ---------- 提醒铃声 ---------- */
function SoundSettingsModal({ c, settings, onChange, onClose, onTest }) {
  const choose = async () => {
    const result = await window.desktopAPI?.sound?.choose?.();
    if (result?.ok) onChange({ mode: "custom", name: result.name || "自定义铃声" });
  };
  const useDefault = () => onChange({ mode: "default", name: "" });
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ width: 315, background: c.window, borderRadius: 15, padding: 16, boxShadow: "0 20px 50px rgba(0,0,0,.35)" }}>
        <div className="flex items-center justify-between"><span style={{ fontSize: 14, fontWeight: 650, color: c.text }}>提醒铃声</span><button onClick={onClose} style={{ color: c.subtext }}><X size={15} /></button></div>
        <button onClick={useDefault} style={{ width: "100%", textAlign: "left", marginTop: 12, padding: "9px 10px", borderRadius: 9, background: settings.mode === "default" ? c.accent : c.hover, color: settings.mode === "default" ? c.accentText : c.text, fontSize: 12 }}>Windows 默认提示音</button>
        <button onClick={choose} style={{ width: "100%", textAlign: "left", marginTop: 7, padding: "9px 10px", borderRadius: 9, background: settings.mode === "custom" ? c.accent : c.hover, color: settings.mode === "custom" ? c.accentText : c.text, fontSize: 12 }}>
          {settings.mode === "custom" ? `自定义：${settings.name || "已选择"}` : "选择自定义铃声…"}
        </button>
        <div style={{ fontSize: 10.5, color: c.subtext, marginTop: 8, lineHeight: 1.45 }}>支持 MP3、WAV、M4A、OGG。选择后会复制到软件自己的数据目录，原文件移动后也不受影响。</div>
        {settings.mode === "custom" && <button onClick={onTest} style={{ width: "100%", marginTop: 10, padding: "7px 0", borderRadius: 8, background: c.hover, color: c.text, fontSize: 11.5 }}>试听铃声</button>}
      </div>
    </div>
  );
}

/* ---------- 应用密码与自动锁 ---------- */
function SecurityModal({ c, status, onClose, onStatusChange }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const savePassword = async () => {
    setMessage("");
    if (newPassword.length < 4) { setMessage("密码至少需要4个字符"); return; }
    if (newPassword !== confirmPassword) { setMessage("两次输入的新密码不一致"); return; }
    setBusy(true);
    try {
      const result = await window.desktopAPI?.security?.setPassword?.(status.enabled ? currentPassword : "", newPassword);
      if (result?.ok) {
        onStatusChange({ enabled: true, locked: false });
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        setMessage(status.enabled ? "密码已修改" : "密码已设置。以后启动软件、电脑锁屏或睡眠后都需要解锁。 ");
      } else setMessage(result?.error || "保存密码失败");
    } catch { setMessage("保存密码失败"); }
    setBusy(false);
  };

  const removePassword = async () => {
    if (!removeConfirm) { setRemoveConfirm(true); setMessage("再点一次即可移除密码保护"); return; }
    setBusy(true); setMessage("");
    try {
      const result = await window.desktopAPI?.security?.removePassword?.(currentPassword);
      if (result?.ok) {
        onStatusChange({ enabled: false, locked: false });
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setRemoveConfirm(false);
        setMessage("密码保护已关闭");
      } else setMessage(result?.error || "移除密码失败");
    } catch { setMessage("移除密码失败"); }
    setBusy(false);
  };

  const lockNow = async () => {
    setMessage("");
    try {
      const result = await window.desktopAPI?.security?.lock?.();
      if (result?.locked) onStatusChange({ enabled: true, locked: true });
      else setMessage(result?.error || "无法锁定");
    } catch { setMessage("无法锁定"); }
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div style={{ width: 325, maxHeight: 600, overflowY: "auto", background: c.window, borderRadius: 16, padding: 16, boxShadow: "0 20px 50px rgba(0,0,0,.35)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: 7 }}><Lock size={15} color={status.enabled ? c.accent : c.subtext} /><span style={{ fontSize: 14.5, fontWeight: 650, color: c.text }}>密码与自动锁</span></div>
          <button onClick={onClose} style={{ color: c.subtext }}><X size={15} /></button>
        </div>

        <div style={{ marginTop: 11, padding: "8px 10px", borderRadius: 9, background: c.hover, fontSize: 11.5, color: c.subtext, lineHeight: 1.55 }}>
          {status.enabled ? "密码保护已开启。电脑锁屏、睡眠或重新启动“今日”后，软件会自动锁定。" : "设置密码后，电脑锁屏、睡眠或重新启动“今日”时会自动锁定软件。"}
        </div>

        {status.enabled && (
          <>
            <div style={{ fontSize: 11, color: c.subtext, marginTop: 12, marginBottom: 4 }}>当前密码</div>
            <input type="password" value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); setRemoveConfirm(false); }} placeholder="修改或关闭密码时需要"
              style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: "8px 9px", borderRadius: 9, border: "none", outline: "none", background: c.inputBg, color: c.text }} />
          </>
        )}

        <div style={{ fontSize: 11, color: c.subtext, marginTop: 10, marginBottom: 4 }}>{status.enabled ? "新密码" : "设置密码"}</div>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="至少4个字符"
          style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: "8px 9px", borderRadius: 9, border: "none", outline: "none", background: c.inputBg, color: c.text }} />
        <div style={{ fontSize: 11, color: c.subtext, marginTop: 8, marginBottom: 4 }}>确认新密码</div>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePassword()} placeholder="再次输入"
          style={{ width: "100%", boxSizing: "border-box", fontSize: 13, padding: "8px 9px", borderRadius: 9, border: "none", outline: "none", background: c.inputBg, color: c.text }} />

        {message && <div style={{ fontSize: 10.5, color: message.includes("失败") || message.includes("不正确") || message.includes("不一致") ? c.overdueText : c.subtext, marginTop: 8, lineHeight: 1.45 }}>{message}</div>}

        <button disabled={busy} onClick={savePassword} style={{ width: "100%", marginTop: 12, padding: "9px 0", borderRadius: 9, background: c.accent, color: c.accentText, fontSize: 12.5, fontWeight: 650, opacity: busy ? .6 : 1 }}>
          {status.enabled ? "保存新密码" : "开启密码保护"}
        </button>

        {status.enabled && (
          <div style={{ borderTop: `1px solid ${c.divider}`, marginTop: 11, paddingTop: 10, display: "flex", gap: 7 }}>
            <button disabled={busy} onClick={lockNow} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: c.hover, color: c.text, fontSize: 11.5 }}>立即锁定</button>
            <button disabled={busy} onClick={removePassword} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: removeConfirm ? c.overdueBg : c.hover, color: removeConfirm ? c.overdueText : c.subtext, fontSize: 11.5 }}>{removeConfirm ? "确认关闭密码" : "关闭密码保护"}</button>
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 10, color: c.subtext, lineHeight: 1.5 }}>密码只保存为不可逆的加密哈希，不保存明文。请牢记密码；软件没有找回密码功能。</div>
      </div>
    </div>
  );
}

function AppLockScreen({ c, onUnlocked }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const unlock = async () => {
    if (!password) return;
    setBusy(true); setMessage("");
    try {
      const result = await window.desktopAPI?.security?.verify?.(password);
      if (result?.ok) { setPassword(""); onUnlocked({ enabled: true, locked: false }); }
      else { setMessage(result?.error || "密码不正确"); setPassword(""); }
    } catch { setMessage("解锁失败，请重试"); }
    setBusy(false);
  };
  return (
    <div style={{ background: c.bg, minHeight: 660, padding: 12, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }} className="flex items-center justify-center">
      <div style={{ width: 380, height: 660, background: c.window, borderRadius: 20, boxShadow: "0 24px 60px -20px rgba(0,0,0,0.25)", border: `1px solid ${c.divider}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 30, boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: 270, textAlign: "center" }}>
          <div style={{ width: 50, height: 50, margin: "0 auto 14px", borderRadius: 999, background: c.hover, display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={22} color={c.accent} /></div>
          <div style={{ fontSize: 20, fontWeight: 650, color: c.text }}>今日已锁定</div>
          <div style={{ fontSize: 11.5, color: c.subtext, marginTop: 6, lineHeight: 1.5 }}>输入你设置的软件密码继续使用</div>
          <input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()} placeholder="输入密码"
            style={{ width: "100%", boxSizing: "border-box", marginTop: 18, fontSize: 14, padding: "10px 11px", borderRadius: 10, border: "none", outline: "none", background: c.inputBg, color: c.text, textAlign: "center" }} />
          {message && <div style={{ marginTop: 8, fontSize: 11, color: c.overdueText }}>{message}</div>}
          <button disabled={busy || !password} onClick={unlock} style={{ width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 10, background: c.accent, color: c.accentText, fontSize: 13, fontWeight: 650, opacity: busy || !password ? .55 : 1 }}>解锁</button>
          <div style={{ marginTop: 14, fontSize: 9.5, color: c.subtext }}>电脑解锁后，“今日”仍会保持锁定，直到密码验证成功。</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 配置备份与恢复 ---------- */
function BackupModal({ c, onClose, onBeforeExport }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);

  const exportBackup = async () => {
    setBusy(true); setMessage(""); setConfirmImport(false);
    try {
      await onBeforeExport?.();
      const result = await window.desktopAPI?.backup?.export?.();
      if (result?.ok) setMessage(`备份已导出：${result.fileName || "备份文件"}`);
      else if (!result?.canceled) setMessage(result?.error || "导出失败");
    } catch { setMessage("导出失败"); }
    setBusy(false);
  };

  const importBackup = async () => {
    if (!confirmImport) { setConfirmImport(true); setMessage("导入会覆盖当前数据。请再点一次“选择备份并恢复”。"); return; }
    setBusy(true); setMessage("请选择备份文件…");
    try {
      const result = await window.desktopAPI?.backup?.import?.();
      if (result?.ok) setMessage("恢复成功，软件正在自动重启…");
      else if (result?.canceled) { setMessage(""); setConfirmImport(false); }
      else setMessage(result?.error || "恢复失败");
    } catch { setMessage("恢复失败"); }
    setBusy(false);
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 61 }}>
      <div style={{ width: 325, background: c.window, borderRadius: 16, padding: 16, boxShadow: "0 20px 50px rgba(0,0,0,.35)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: 7 }}><Download size={15} color={c.accent} /><span style={{ fontSize: 14.5, fontWeight: 650, color: c.text }}>备份与恢复</span></div>
          <button onClick={onClose} style={{ color: c.subtext }}><X size={15} /></button>
        </div>
        <div style={{ marginTop: 10, fontSize: 11.5, color: c.subtext, lineHeight: 1.55 }}>导出的单个 <b>.todaybackup</b> 文件会保存任务、完成状态、专注记录、倒计时、列表设置、主题、密码保护设置和自定义提醒铃声。换电脑后安装“今日”，再导入这个文件即可恢复。</div>

        <button disabled={busy} onClick={exportBackup} className="flex items-center justify-center" style={{ width: "100%", gap: 7, marginTop: 14, padding: "10px 0", borderRadius: 10, background: c.accent, color: c.accentText, fontSize: 12.5, fontWeight: 650, opacity: busy ? .6 : 1 }}><Download size={14} /> 导出全部配置与数据</button>

        <div style={{ borderTop: `1px solid ${c.divider}`, marginTop: 12, paddingTop: 12 }}>
          <button disabled={busy} onClick={importBackup} className="flex items-center justify-center" style={{ width: "100%", gap: 7, padding: "10px 0", borderRadius: 10, background: confirmImport ? c.overdueBg : c.hover, color: confirmImport ? c.overdueText : c.text, fontSize: 12.5, fontWeight: 600, opacity: busy ? .6 : 1 }}><Upload size={14} /> {confirmImport ? "选择备份并恢复" : "导入备份"}</button>
          <div style={{ fontSize: 10, color: c.subtext, marginTop: 7, lineHeight: 1.5 }}>导入会覆盖这台电脑当前的“今日”数据，并在恢复后自动重启软件。建议导入前先导出一次当前数据。</div>
        </div>

        {message && <div style={{ marginTop: 10, padding: "7px 9px", borderRadius: 8, background: c.inputBg, fontSize: 10.5, color: message.includes("失败") ? c.overdueText : c.subtext, lineHeight: 1.45, wordBreak: "break-word" }}>{message}</div>}
      </div>
    </div>
  );
}

/* ---------- 主组件 ---------- */
export default function TodayApp() {
  const today = startOfDay(new Date());
  const [now, setNow] = useState(new Date());
  const [theme, setTheme] = useState("light");
  const c = THEMES[theme];

  const [loaded, setLoaded] = useState(false);

  const [view, setView] = useState("day");
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [tasksByDate, setTasksByDate] = useState({ [dateKey(today)]: seedTasks });
  const [repeatPlans, setRepeatPlans] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [repeatOption, setRepeatOption] = useState("none");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [countdowns, setCountdowns] = useState([]);
  const [showCountdownManager, setShowCountdownManager] = useState(false);
  const [showCustomTimer, setShowCustomTimer] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [reminderTaskId, setReminderTaskId] = useState(null);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showBackupSettings, setShowBackupSettings] = useState(false);
  const [securityStatus, setSecurityStatus] = useState({ enabled: false, locked: false });
  const [securityReady, setSecurityReady] = useState(!window.desktopAPI?.security);
  const [soundSettings, setSoundSettings] = useState({ mode: "default", name: "" });
  const [taskListPrefs, setTaskListPrefs] = useState({ incompleteFirst: true, completedLast: true, onlyIncomplete: false });
  const [runtimeCheckpoint, setRuntimeCheckpoint] = useState(0);

  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [openSession, setOpenSession] = useState(null);
  const [taskTimerStates, setTaskTimerStates] = useState({}); // 每个任务暂停时保留自己的剩余倒计时
  const sessionElapsedMsRef = useRef(0);
  const timerDeadlineRef = useRef(null);
  const lastTimerTickRef = useRef(null);
  const activeTaskIdRef = useRef(null);
  useEffect(() => { activeTaskIdRef.current = activeTaskId; }, [activeTaskId]);

  const [sessions, setSessions] = useState([]);

  const [toasts, setToasts] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderList, setReminderList] = useState([]);
  const idRef = useRef(1000);
  const nextId = () => { idRef.current += 1; return idRef.current; };

  /* ---- 应用密码状态：主进程负责校验与 Windows 锁屏事件 ---- */
  useEffect(() => {
    let cancelled = false;
    const api = window.desktopAPI?.security;
    if (!api) { setSecurityReady(true); return undefined; }
    (async () => {
      try {
        const status = await api.status();
        if (!cancelled && status) setSecurityStatus({ enabled: !!status.enabled, locked: !!status.locked });
      } catch {}
      if (!cancelled) setSecurityReady(true);
    })();
    const off = api.onState?.((status) => {
      if (!status || cancelled) return;
      setSecurityStatus({ enabled: !!status.enabled, locked: !!status.locked });
      setSecurityReady(true);
      if (status.locked) { setShowSecuritySettings(false); setShowBackupSettings(false); }
    });
    return () => { cancelled = true; off?.(); };
  }, []);

  /* ---- 载入已保存的数据（跨会话持久化） ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = window.desktopAPI?.state
          ? await window.desktopAPI.state.get()
          : JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (data && !cancelled) {
          if (typeof data.idCounter === "number") idRef.current = Math.max(idRef.current, data.idCounter);
          let savedTasks = data.tasksByDate && typeof data.tasksByDate === "object" ? data.tasksByDate : null;
          if (savedTasks) {
            const migrated = migrateRepeatPlanData(savedTasks, data.repeatPlans);
            savedTasks = migrated.tasksByDate;
            setTasksByDate(savedTasks);
            setRepeatPlans(migrated.repeatPlans);
          } else if (Array.isArray(data.repeatPlans)) setRepeatPlans(data.repeatPlans);
          let restoredSessions = normalizeSessions(data.sessions);
          const runtime = data.timerRuntime;
          if (runtime?.openSession?.taskId && Number(runtime.openSession.elapsedMs) > 0) {
            restoredSessions = mergeSessionRecord(restoredSessions, {
              id: nextId(), taskId: runtime.openSession.taskId, taskText: runtime.openSession.taskText || "",
              dateKey: runtime.openSession.dateKey, start: runtime.openSession.startTime || runtime.savedAt || Date.now(),
              end: runtime.savedAt || Date.now(), seconds: Math.max(1, Math.round(Number(runtime.openSession.elapsedMs) / 1000)),
            });
          }
          setSessions(restoredSessions);
          if (Array.isArray(data.countdowns)) setCountdowns(data.countdowns);
          const restoredTimerStates = data.taskTimerStates && typeof data.taskTimerStates === "object" ? { ...data.taskTimerStates } : {};
          if (runtime?.activeTaskId && savedTasks) {
            let exists = false;
            for (const list of Object.values(savedTasks)) if (Array.isArray(list) && list.some((t) => t.id === runtime.activeTaskId && !t.done)) { exists = true; break; }
            if (exists) {
              const rr = Math.max(0, Math.floor(Number(runtime.remaining) || 0));
              restoredTimerStates[runtime.activeTaskId] = rr;
              setActiveTaskId(runtime.activeTaskId);
              setRemaining(rr);
              setRunning(false);
            }
          }
          setTaskTimerStates(restoredTimerStates);
          if (data.taskListPrefs && typeof data.taskListPrefs === "object") setTaskListPrefs((p) => ({ ...p, ...data.taskListPrefs }));
          if (data.soundSettings && typeof data.soundSettings === "object") setSoundSettings({ mode: data.soundSettings.mode === "custom" ? "custom" : "default", name: data.soundSettings.name || "" });
          if (data.theme) setTheme(data.theme);
          if (typeof data.totalSeconds === "number") { setTotalSeconds(data.totalSeconds); if (!runtime?.activeTaskId) setRemaining(data.totalSeconds); }
        }
      } catch (e) {
        // 还没有历史数据，使用初始种子数据
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---- 数据变化后自动保存（防抖） ---- */
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      const timerRuntime = activeTaskId ? {
        activeTaskId, running, remaining: currentRemainingSeconds(), savedAt: Date.now(),
        openSession: openSession ? { ...openSession, elapsedMs: sessionElapsedMsRef.current } : null,
      } : null;
      const payload = { tasksByDate, repeatPlans, sessions, countdowns, taskTimerStates, taskListPrefs, soundSettings, timerRuntime, idCounter: idRef.current, theme, totalSeconds };
      if (window.desktopAPI?.state) window.desktopAPI.state.set(payload).catch(() => {});
      else { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {} }
    }, 600);
    return () => clearTimeout(t);
  }, [tasksByDate, repeatPlans, sessions, countdowns, taskTimerStates, taskListPrefs, soundSettings, theme, totalSeconds, loaded, activeTaskId, running, openSession, runtimeCheckpoint]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setRuntimeCheckpoint((x) => x + 1), 5000);
    return () => clearInterval(id);
  }, [running]);

  const key = dateKey(selectedDate);
  const tasks = tasksByDate[key] || [];
  const displayTasks = [...tasks]
    .filter((t) => !taskListPrefs.onlyIncomplete || !t.done)
    .sort((a, b) => {
      if (a.id === activeTaskId && b.id !== activeTaskId) return -1;
      if (b.id === activeTaskId && a.id !== activeTaskId) return 1;
      if ((taskListPrefs.incompleteFirst || taskListPrefs.completedLast) && a.done !== b.done) return a.done ? 1 : -1;
      const at = a.time || "99:99", bt = b.time || "99:99";
      return at.localeCompare(bt);
    });
  const todayKeyForHistory = dateKey(today);
  const pastIncomplete = Object.entries(tasksByDate).flatMap(([dk, list]) => {
    if (startOfDay(dateFromKey(dk)) >= today) return [];
    return (list || []).filter((t) => !t.done).map((task) => ({ task, dateKey: dk }));
  });
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const activeCountdowns = countdowns
    .filter((item) => item && item.enabled !== false)
    .map((item) => ({ ...item, nextTime: getNextCountdownOccurrence(item, now) }))
    .filter((item) => item.nextTime)
    .sort((a, b) => a.nextTime.getTime() - b.nextTime.getTime());
  const nearestCountdown = activeCountdowns[0] || null;
  const nearestCountdownSeconds = nearestCountdown ? Math.max(0, Math.ceil((nearestCountdown.nextTime.getTime() - now.getTime()) / 1000)) : 0;

  const setTasks = (updater) => setTasksByDate((prev) => ({ ...prev, [key]: updater(prev[key] || []) }));
  const findTaskEntry = (id) => {
    for (const k in tasksByDate) {
      const found = tasksByDate[k].find((t) => t.id === id);
      if (found) return { task: found, dateKey: k };
    }
    return null;
  };
  const findTaskById = (id) => findTaskEntry(id)?.task || null;

  const focusSecondsByTask = {};
  sessions.forEach((session) => {
    focusSecondsByTask[session.taskId] = (focusSecondsByTask[session.taskId] || 0) + (session.seconds || 0);
  });
  if (openSession && activeTaskId === openSession.taskId) {
    focusSecondsByTask[openSession.taskId] = (focusSecondsByTask[openSession.taskId] || 0) + Math.floor(sessionElapsedMsRef.current / 1000);
  }

  const currentRemainingSeconds = () => {
    if (running && timerDeadlineRef.current) return Math.max(0, Math.ceil((timerDeadlineRef.current - Date.now()) / 1000));
    return remaining;
  };

  const rememberTaskRemaining = (id, value) => {
    if (!id) return;
    const safe = Math.max(0, Math.min(totalSeconds, Math.floor(value)));
    setTaskTimerStates((prev) => ({ ...prev, [id]: safe }));
  };

  const clearTaskRemaining = (id) => {
    if (!id) return;
    setTaskTimerStates((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const finalizeSession = () => {
    if (!openSession) return;
    const seconds = Math.max(1, Math.round(sessionElapsedMsRef.current / 1000));
    const record = { id: nextId(), taskId: openSession.taskId, taskText: openSession.taskText, dateKey: openSession.dateKey, start: openSession.startTime, end: Date.now(), seconds };
    setSessions((list) => mergeSessionRecord(list, record));
    setOpenSession(null);
    sessionElapsedMsRef.current = 0;
  };

  const updateTaskById = (id, patch) => {
    setTasksByDate((prev) => {
      const next = { ...prev };
      for (const dk of Object.keys(next)) {
        const idx = (next[dk] || []).findIndex((t) => t.id === id);
        if (idx >= 0) {
          const list = [...next[dk]];
          list[idx] = { ...list[idx], ...patch };
          next[dk] = list;
          break;
        }
      }
      return next;
    });
    if (patch.text) {
      setSessions((list) => list.map((x) => x.taskId === id ? { ...x, taskText: patch.text } : x));
      setOpenSession((session) => session?.taskId === id ? { ...session, taskText: patch.text } : session);
    }
  };

  const openEditTask = (id) => setEditingTaskId(id);
  const openTaskReminder = (id) => setReminderTaskId(id);

  const toggleTask = (id) => {
    const entry = findTaskEntry(id);
    if (!entry) return;
    const wasDone = !!entry.task.done;
    const completedAt = Date.now();
    if (!wasDone && id === activeTaskId) {
      finalizeSession();
      setRunning(false);
      timerDeadlineRef.current = null;
      lastTimerTickRef.current = null;
      setActiveTaskId(null);
    }
    setTasksByDate((prev) => {
      const next = { ...prev };
      const list = [...(next[entry.dateKey] || [])];
      const idx = list.findIndex((t) => t.id === id);
      if (idx >= 0) list[idx] = { ...list[idx], done: !wasDone };
      next[entry.dateKey] = list;
      return next;
    });
    clearTaskRemaining(id);
    if (!wasDone) {
      setSessions((list) => {
        if (list.some((session) => session.taskId === id && session.dateKey === entry.dateKey)) return list;
        return mergeSessionRecord(list, {
          id: nextId(), taskId: id, taskText: entry.task.text, dateKey: entry.dateKey,
          start: completedAt, end: completedAt, seconds: 0, completedOnly: true,
        });
      });
    }
  };
  const deleteTask = (id) => {
    if (id === activeTaskId) {
      finalizeSession();
      setRunning(false);
      timerDeadlineRef.current = null;
      lastTimerTickRef.current = null;
      setActiveTaskId(null);
    }
    clearTaskRemaining(id);
    setTasksByDate((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((dk) => {
        const filtered = (next[dk] || []).filter((t) => t.id !== id);
        if (filtered.length) next[dk] = filtered; else delete next[dk];
      });
      return next;
    });
    setSessions((list) => list.filter((session) => session.taskId !== id));
  };
  const addTask = (raw, repeat = "none") => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const { time, text } = parseTaskLine(trimmed);
    if (repeat === "none") {
      setTasks((list) => [...list, { id: nextId(), text, time, note: "", reminderTime: time, reminderEnabled: !!time, done: false, repeat: "none" }]);
    } else {
      const dates = repeatDates(selectedDate, repeat);
      const planId = makeRepeatPlanId();
      const plan = {
        id: planId, text, time, repeat,
        weekdays: repeat === "weekly" ? [selectedDate.getDay()] : [],
        startKey: dateKey(dates[0] || selectedDate),
        endKey: dateKey(dates[dates.length - 1] || selectedDate),
        enabled: true, createdAt: Date.now(),
      };
      setRepeatPlans((prev) => [...prev, plan]);
      setTasksByDate((prev) => {
        const next = { ...prev };
        dates.forEach((d) => {
          const k2 = dateKey(d), list = next[k2] ? [...next[k2]] : [];
          list.push({ id: nextId(), text, time, note: "", reminderTime: time, reminderEnabled: !!time, done: false, repeat, repeatPlanId: planId });
          next[k2] = list;
        });
        return next;
      });
    }
  };
  const addFromTemplate = (tpl) => {
    setTasks((list) => [...list, { id: nextId(), text: tpl.text, time: tpl.time, note: "", reminderTime: tpl.time || null, reminderEnabled: !!tpl.time, done: false, repeat: "none" }]);
    setAdding(false);
  };
  const addBatch = (dateKeys, parsedLines, meta = {}) => {
    const repeat = meta.repeat || "none";
    if (repeat === "none") {
      setTasksByDate((prev) => {
        const next = { ...prev };
        dateKeys.forEach((k2) => {
          const list = next[k2] ? [...next[k2]] : [];
          parsedLines.forEach((p) => list.push({ id: nextId(), text: p.text, time: p.time, note: "", reminderTime: p.time || null, reminderEnabled: !!p.time, done: false, repeat: "none" }));
          next[k2] = list;
        });
        return next;
      });
    } else {
      const createdPlans = parsedLines.map((p) => ({
        id: makeRepeatPlanId(), text: p.text, time: p.time || null, repeat,
        weekdays: repeat === "weekly" ? (Array.isArray(meta.weekdays) ? [...meta.weekdays] : []) : [],
        startKey: meta.startKey || dateKeys[0], endKey: meta.endKey || dateKeys[dateKeys.length - 1],
        enabled: true, createdAt: Date.now(),
      }));
      setRepeatPlans((prev) => [...prev, ...createdPlans]);
      setTasksByDate((prev) => {
        const next = { ...prev };
        dateKeys.forEach((k2) => {
          const list = next[k2] ? [...next[k2]] : [];
          createdPlans.forEach((plan) => list.push({ id: nextId(), text: plan.text, time: plan.time, note: "", reminderTime: plan.time || null, reminderEnabled: !!plan.time, done: false, repeat: plan.repeat, repeatPlanId: plan.id }));
          next[k2] = list;
        });
        return next;
      });
    }
    setShowBatchModal(false);
  };

  const rebuildFutureTasksForPlan = (plan) => {
    if (!plan) return;
    const protectedTaskIds = new Set(sessions.map((s) => s.taskId));
    if (activeTaskId) protectedTaskIds.add(activeTaskId);
    if (openSession?.taskId) protectedTaskIds.add(openSession.taskId);
    const todayStart = startOfDay(today);
    const targetKeys = plan.enabled === false ? [] : repeatPlanDateKeys(plan).filter((k) => startOfDay(dateFromKey(k)) >= todayStart);
    setTasksByDate((prev) => {
      const next = {};
      Object.entries(prev).forEach(([dk, list]) => {
        const isFuture = startOfDay(dateFromKey(dk)) >= todayStart;
        const filtered = (list || []).filter((task) => {
          if (task.repeatPlanId !== plan.id) return true;
          if (!isFuture || task.done || protectedTaskIds.has(task.id)) return true;
          return false;
        });
        if (filtered.length) next[dk] = filtered;
      });
      if (plan.enabled !== false) {
        targetKeys.forEach((dk) => {
          const list = next[dk] ? [...next[dk]] : [];
          if (!list.some((task) => task.repeatPlanId === plan.id)) {
            list.push({ id: nextId(), text: plan.text, time: plan.time || null, note: "", reminderTime: plan.time || null, reminderEnabled: !!plan.time, done: false, repeat: plan.repeat, repeatPlanId: plan.id });
          }
          next[dk] = list;
        });
      }
      return next;
    });
  };
  const updateRepeatPlan = (id, patch) => {
    const old = repeatPlans.find((p) => p.id === id);
    if (!old) return;
    const nextPlan = { ...old, ...patch, id, weekdays: Array.isArray(patch.weekdays) ? [...patch.weekdays] : (Array.isArray(old.weekdays) ? [...old.weekdays] : []) };
    setRepeatPlans((prev) => prev.map((p) => p.id === id ? nextPlan : p));
    rebuildFutureTasksForPlan(nextPlan);
  };
  const toggleRepeatPlan = (id) => {
    const old = repeatPlans.find((p) => p.id === id);
    if (!old) return;
    const nextPlan = { ...old, enabled: old.enabled === false };
    setRepeatPlans((prev) => prev.map((p) => p.id === id ? nextPlan : p));
    rebuildFutureTasksForPlan(nextPlan);
  };
  const deleteRepeatPlan = (id, removeUnexecuted = false) => {
    const protectedTaskIds = new Set(sessions.map((s) => s.taskId));
    if (activeTaskId) protectedTaskIds.add(activeTaskId);
    if (openSession?.taskId) protectedTaskIds.add(openSession.taskId);
    setRepeatPlans((prev) => prev.filter((p) => p.id !== id));
    setTasksByDate((prev) => {
      const next = {};
      Object.entries(prev).forEach(([dk, list]) => {
        const mapped = [];
        (list || []).forEach((task) => {
          if (task.repeatPlanId !== id) { mapped.push(task); return; }
          const protectedHistory = task.done || protectedTaskIds.has(task.id);
          if (removeUnexecuted && !protectedHistory) return;
          const clean = { ...task, repeat: "none" };
          delete clean.repeatPlanId;
          mapped.push(clean);
        });
        if (mapped.length) next[dk] = mapped;
      });
      return next;
    });
  };
  const clearSessions = (keepPredicate) => setSessions((s) => s.filter(keepPredicate));
  const clearTaskDates = (dateKeys) => {
    const keys = new Set(dateKeys);
    const ids = new Set(Object.entries(tasksByDate).flatMap(([dk, list]) => keys.has(dk) ? (list || []).map((t) => t.id) : []));
    if (activeTaskId && ids.has(activeTaskId)) {
      finalizeSession(); setRunning(false); timerDeadlineRef.current = null; lastTimerTickRef.current = null; setActiveTaskId(null);
    }
    ids.forEach((id) => clearTaskRemaining(id));
    setTasksByDate((prev) => { const next = { ...prev }; keys.forEach((dk) => delete next[dk]); return next; });
    setSessions((list) => list.filter((session) => !ids.has(session.taskId)));
  };
  const clearTasksForDate = (k) => clearTaskDates([k]);
  const clearTasksForMonth = (year, month) => {
    const keys = Object.keys(tasksByDate).filter((k) => { const d = dateFromKey(k); return d.getFullYear() === year && d.getMonth() === month; });
    clearTaskDates(keys);
  };
  const clearAllTasks = () => clearTaskDates(Object.keys(tasksByDate));
  const moveTaskToDate = (fromKey, toKey, taskId) => {
    if (fromKey === toKey) return;
    setTasksByDate((prev) => {
      const fromList = prev[fromKey] || [];
      const task = fromList.find((t) => t.id === taskId);
      if (!task) return prev;
      const next = { ...prev };
      next[fromKey] = fromList.filter((t) => t.id !== taskId);
      next[toKey] = [...(next[toKey] || []), task];
      return next;
    });
  };

  const activeTask = activeTaskId ? findTaskById(activeTaskId) : null;

  /* 安全网：如果当前专注的任务被清理或删除了，自动停止计时，避免挂在一个不存在的任务上 */
  useEffect(() => {
    if (activeTaskId && !findTaskById(activeTaskId)) {
      finalizeSession();
      setRunning(false);
      setActiveTaskId(null);
      timerDeadlineRef.current = null;
      lastTimerTickRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksByDate]);


  /* 已保存的重复计划可作为快速添加模板 */
  const repeatTemplates = repeatPlans
    .filter((plan) => plan && plan.enabled !== false)
    .map((plan) => ({ id: plan.id, text: plan.text, time: plan.time, repeat: plan.repeat }));

  /* 计时器主循环：用绝对截止时间计算，避免窗口隐藏/系统繁忙造成 setInterval 漂移 */
  useEffect(() => {
    if (!running) return undefined;
    if (!timerDeadlineRef.current) timerDeadlineRef.current = Date.now() + remaining * 1000;
    lastTimerTickRef.current = Date.now();
    const id = setInterval(() => {
      const tickNow = Date.now();
      const lastTick = lastTimerTickRef.current || tickNow;
      if (activeTaskIdRef.current) sessionElapsedMsRef.current += Math.max(0, tickNow - lastTick);
      lastTimerTickRef.current = tickNow;

      const nextRemaining = Math.max(0, Math.ceil((timerDeadlineRef.current - tickNow) / 1000));
      setRemaining(nextRemaining);
      if (nextRemaining <= 0) {
        clearInterval(id);
        timerDeadlineRef.current = null;
        lastTimerTickRef.current = null;
        setRunning(false);
        finalizeSession();
        clearTaskRemaining(activeTaskIdRef.current);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const timerDisplay = formatTimerDisplay(remaining);

  const pauseActiveTask = ({ keepActive = true } = {}) => {
    if (!activeTaskId) {
      setRunning(false);
      timerDeadlineRef.current = null;
      lastTimerTickRef.current = null;
      return;
    }
    const pauseNow = Date.now();
    const savedRemaining = currentRemainingSeconds();
    if (running && lastTimerTickRef.current) {
      sessionElapsedMsRef.current += Math.max(0, pauseNow - lastTimerTickRef.current);
      lastTimerTickRef.current = pauseNow;
    }
    rememberTaskRemaining(activeTaskId, savedRemaining);
    finalizeSession();
    setRemaining(savedRemaining);
    setRunning(false);
    timerDeadlineRef.current = null;
    lastTimerTickRef.current = null;
    if (!keepActive) setActiveTaskId(null);
  };

  const resumeTask = (id) => {
    const entry = findTaskEntry(id);
    if (!entry || entry.task.done) return;
    const saved = taskTimerStates[id];
    const startRemaining = typeof saved === "number" && saved > 0 ? saved : totalSeconds;
    setActiveTaskId(id);
    setRemaining(startRemaining);
    sessionElapsedMsRef.current = 0;
    setOpenSession({ taskId: id, taskText: entry.task.text, dateKey: entry.dateKey, startTime: Date.now() });
    timerDeadlineRef.current = Date.now() + startRemaining * 1000;
    lastTimerTickRef.current = Date.now();
    setRunning(true);
  };

  const handlePlayPause = () => {
    if (running) {
      pauseActiveTask({ keepActive: true });
      return;
    }
    if (activeTaskId) {
      resumeTask(activeTaskId);
      return;
    }
    const startRemaining = remaining === 0 ? totalSeconds : remaining;
    if (remaining === 0) setRemaining(totalSeconds);
    timerDeadlineRef.current = Date.now() + startRemaining * 1000;
    lastTimerTickRef.current = Date.now();
    setRunning(true);
  };

  const stopActiveTimer = () => {
    if (activeTaskId) clearTaskRemaining(activeTaskId);
    finalizeSession();
    setRunning(false);
    timerDeadlineRef.current = null;
    lastTimerTickRef.current = null;
    setActiveTaskId(null);
  };
  const handleReset = () => {
    stopActiveTimer();
    setRemaining(totalSeconds);
  };
  const applyPreset = (min) => {
    if (openSession) finalizeSession();
    setRunning(false);
    setActiveTaskId(null);
    setTaskTimerStates({});
    timerDeadlineRef.current = null;
    lastTimerTickRef.current = null;
    setTotalSeconds(min * 60);
    setRemaining(min * 60);
  };
  const startTaskTimer = (id) => {
    if (id === activeTaskId) {
      if (running) pauseActiveTask({ keepActive: true });
      else resumeTask(id);
      return;
    }
    if (activeTaskId) pauseActiveTask({ keepActive: false });
    resumeTask(id);
  };
  const handleRowAction = (id) => startTaskTimer(id);

  /* 真正的 Electron 独立悬浮窗口：主窗口负责状态，悬浮窗只负责展示和发回操作 */
  const buildFloatSnapshot = () => ({
    now: now.getTime(),
    theme,
    tasks: [...(tasksByDate[dateKey(today)] || [])]
      .filter((task) => !task.done)
      .sort((a, b) => {
        if (a.id === activeTaskId && b.id !== activeTaskId) return -1;
        if (b.id === activeTaskId && a.id !== activeTaskId) return 1;
        if ((taskListPrefs.incompleteFirst || taskListPrefs.completedLast) && a.done !== b.done) return a.done ? 1 : -1;
        return 0;
      })
      .map((task) => ({ ...task, focusSeconds: focusSecondsByTask[task.id] || 0, pausedRemaining: taskTimerStates[task.id] })),
    remaining,
    running,
    activeTaskId,
    activeTaskText: activeTask ? activeTask.text : "",
    totalSeconds,
    nearestCountdown: nearestCountdown ? {
      id: nearestCountdown.id, title: nearestCountdown.title, time: nearestCountdown.time,
      nextTime: nearestCountdown.nextTime.getTime(), remainingSeconds: nearestCountdownSeconds,
    } : null,
  });

  const openFloatingWindow = () => {
    if (window.desktopAPI?.float?.open) {
      window.desktopAPI.float.open(buildFloatSnapshot()).catch(() => {});
    }
  };

  useEffect(() => {
    if (!loaded || !window.desktopAPI?.float?.update) return;
    window.desktopAPI.float.update(buildFloatSnapshot()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, now, theme, tasksByDate, sessions, countdowns, taskTimerStates, openSession, remaining, running, activeTaskId, totalSeconds]);

  useEffect(() => {
    if (!window.desktopAPI?.float?.onAction) return undefined;
    return window.desktopAPI.float.onAction((action) => {
      if (!action || typeof action !== "object") return;
      if (action.type === "play-pause") {
        handlePlayPause();
        return;
      }
      if (action.type === "task-timer") {
        const entry = findTaskEntry(action.id);
        if (!entry || entry.task.done) return;
        handleRowAction(action.id);
        return;
      }
      if (action.type === "toggle-task") {
        const todayKey = dateKey(today);
        const id = action.id;
        clearTaskRemaining(id);
        setTasksByDate((prev) => ({
          ...prev,
          [todayKey]: (prev[todayKey] || []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        }));
        if (id === activeTaskId) {
          finalizeSession();
          setRunning(false);
          timerDeadlineRef.current = null;
          lastTimerTickRef.current = null;
          setActiveTaskId(null);
        }
      }
    });
    // Re-subscribe so the callback always uses the latest timer/session state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTaskId, running, openSession, remaining, totalSeconds, tasksByDate, selectedDate]);

  const playReminderSound = async () => {
    if (soundSettings.mode !== "custom") return;
    try {
      const result = await window.desktopAPI?.sound?.getDataUrl?.();
      if (!result?.dataUrl) return;
      const audio = new Audio(result.dataUrl);
      audio.volume = 1;
      await audio.play();
    } catch {}
  };

  const pushToast = (text) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, text }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 6000);
  };

  /* 主时钟只负责界面；真正的到点检查放在 Electron 主进程，窗口隐藏/休眠唤醒后也不容易漏 */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loaded || !window.desktopAPI?.reminders?.update) return;
    window.desktopAPI.reminders.update({ tasksByDate, countdowns, soundMode: soundSettings.mode }).catch(() => {});
  }, [loaded, tasksByDate, countdowns, soundSettings.mode]);

  useEffect(() => {
    if (!window.desktopAPI?.reminders?.onEvent) return undefined;
    return window.desktopAPI.reminders.onEvent((event) => {
      if (!event) return;
      playReminderSound();
      if (event.type === "task") {
        pushToast(`任务提醒：${event.text}（${event.time}）`);
      } else if (event.type === "countdown-before") {
        pushToast(`距离${event.title}还有 ${event.minutes} 分钟`);
      } else if (event.type === "countdown-due") {
        pushToast(`${event.title}时间到了`);
      } else if (event.type === "eod") {
        const list = Array.isArray(event.tasks) ? event.tasks : [];
        setReminderList(list);
        setShowReminderModal(list.length > 0);
      }
    });
  }, [soundSettings.mode]);

  useEffect(() => {
    if (!window.desktopAPI?.notifications?.onClick) return undefined;
    return window.desktopAPI.notifications.onClick((payload) => {
      if (payload?.type?.startsWith?.("countdown")) { setShowCountdownManager(true); return; }
      if (!payload?.dateKey) return;
      setSelectedDate(dateFromKey(payload.dateKey));
      setView("day");
    });
  }, []);

  useEffect(() => {
    const result = window.desktopAPI?.windowMode?.setCalendar?.(view === "calendar");
    result?.catch?.(() => {});
  }, [view]);

  const testReminder = () => {
    const todayKey = dateKey(today);
    const incomplete = (tasksByDate[todayKey] || []).filter((t) => !t.done);
    setReminderList(incomplete);
    setShowReminderModal(true);
    try {
      const body = incomplete.length > 0
        ? `还有 ${incomplete.length} 项任务未完成，抓紧完成吧！`
        : "今天的任务都完成啦，辛苦了！";
      if (soundSettings.mode === "custom") playReminderSound();
      if (window.desktopAPI?.notify) window.desktopAPI.notify("今日待办提醒（测试）", body).catch(() => {});
    } catch (e) {}
  };

  const persistStateNow = async () => {
    const timerRuntime = activeTaskId ? {
      activeTaskId, running, remaining: currentRemainingSeconds(), savedAt: Date.now(),
      openSession: openSession ? { ...openSession, elapsedMs: sessionElapsedMsRef.current } : null,
    } : null;
    const payload = { tasksByDate, repeatPlans, sessions, countdowns, taskTimerStates, taskListPrefs, soundSettings, timerRuntime, idCounter: idRef.current, theme, totalSeconds };
    if (window.desktopAPI?.state) return window.desktopAPI.state.set(payload);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); return true; } catch { return false; }
  };

  if (!loaded || !securityReady) {
    return (
      <div style={{ background: THEMES.light.bg, minHeight: 660 }} className="flex items-center justify-center p-6">
        <div style={{ width: 380, height: 660, background: THEMES.light.window, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.25)" }}>
          <span style={{ fontSize: 13, color: THEMES.light.subtext }}>正在载入…</span>
        </div>
      </div>
    );
  }

  if (securityStatus.locked) {
    return <AppLockScreen c={c} onUnlocked={setSecurityStatus} />;
  }

  return (
    <div
      style={{ background: c.bg, minHeight: view === "calendar" ? 760 : 660, padding: 12, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}
      className="flex items-center justify-center relative"
    >
      {/* ---------- 主窗口 ---------- */}
      <div
        style={{
          width: view === "calendar" ? "min(820px, calc(100vw - 24px))" : 380, height: view === "calendar" ? "min(730px, calc(100vh - 24px))" : 660, background: c.window, borderRadius: 20,
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          border: `1px solid ${theme === "light" ? "#ffffff" : c.divider}`,
          position: "relative",
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between" style={{ padding: "13px 16px", borderBottom: `1px solid ${c.divider}` }}>
          <span className="flex items-center" style={{ fontSize: 13, fontWeight: 600, color: c.subtext, letterSpacing: 1 }}>
            今日
            <span style={{ width: 5, height: 5, borderRadius: "9999px", background: c.accent, marginLeft: 6, opacity: 0.8 }} title="数据已自动保存" />
          </span>
          <div className="flex items-center" style={{ gap: 3 }}>
            <IconButton c={c} onClick={() => setShowBatchModal(true)} title="批量添加计划"><ListPlus size={15} /></IconButton>
            <IconButton c={c} onClick={() => setView(view === "day" ? "calendar" : "day")} title={view === "day" ? "日历视图" : "返回列表"}>
              {view === "day" ? <CalendarDays size={15} /> : <List size={15} />}
            </IconButton>
            <IconButton c={c} onClick={() => setShowRecords(true)} title="任务记录"><ClipboardList size={15} /></IconButton>
            <IconButton c={c} onClick={() => setShowSecuritySettings(true)} title={securityStatus.enabled ? "密码与自动锁（已开启）" : "设置密码与自动锁"} active={securityStatus.enabled}><Lock size={15} /></IconButton>
            <IconButton c={c} onClick={() => setShowBackupSettings(true)} title="备份与恢复"><Download size={15} /></IconButton>
            <IconButton c={c} onClick={openFloatingWindow} title="打开独立悬浮窗"><PictureInPicture2 size={15} /></IconButton>
            <IconButton c={c} onClick={() => setShowSoundSettings(true)} title="提醒铃声" active={soundSettings.mode === "custom"}><Volume2 size={15} /></IconButton>
            <IconButton c={c} onClick={() => setTheme(theme === "light" ? "dark" : "light")} title="切换主题">
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </IconButton>
          </div>
        </div>

        <div style={{ padding: nearestCountdown ? "9px 18px 0" : "7px 18px 0", flexShrink: 0 }}>
          {nearestCountdown ? (
            <button onClick={() => setShowCountdownManager(true)} style={{ width: "100%", padding: "8px 10px", borderRadius: 11, background: c.hover, textAlign: "left" }}>
              <div className="flex items-center justify-between" style={{ gap: 8 }}>
                <span className="flex items-center" style={{ gap: 6, fontSize: 11.5, fontWeight: 650, color: c.text, minWidth: 0 }}>
                  <AlarmClock size={13} color={c.accent} />
                  <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{nearestCountdown.title}</span>
                </span>
                <span style={{ fontSize: 10, color: c.subtext, flexShrink: 0 }}>{activeCountdowns.length > 1 ? `+${activeCountdowns.length - 1}` : nearestCountdown.time}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 650, color: c.text, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>还有 {formatCountdownDisplay(nearestCountdownSeconds)}</div>
            </button>
          ) : (
            <button onClick={() => setShowCountdownManager(true)} className="flex items-center justify-center" style={{ width: "100%", gap: 5, fontSize: 10.5, color: c.subtext, padding: "4px 0" }}>
              <AlarmClock size={12} /> 添加目标倒计时
            </button>
          )}
        </div>

        <div className="flex-1" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {view === "day" ? (
            <>
              {/* 日期导航 */}
              <div className="flex items-center justify-between" style={{ padding: "18px 18px 14px" }}>
                <IconButton c={c} onClick={() => setSelectedDate((d) => addDays(d, -1))} title="前一天"><ChevronLeft size={18} /></IconButton>
                <div className="text-center">
                  <div style={{ fontSize: 22, fontWeight: 650, color: c.text, letterSpacing: -0.3 }}>{relativeLabel(selectedDate, today)}</div>
                  <div style={{ fontSize: 12.5, color: c.subtext, marginTop: 2 }}>{displayDate(selectedDate)} · {WEEKDAYS[selectedDate.getDay()]}</div>
                </div>
                <IconButton c={c} onClick={() => setSelectedDate((d) => addDays(d, 1))} title="后一天"><ChevronRight size={18} /></IconButton>
              </div>

              {/* 任务列表：添加入口固定在顶部，支持自动排序与仅看未完成 */}
              <div className="flex-1" style={{ padding: "0 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flexShrink: 0, paddingBottom: 7, borderBottom: `1px solid ${c.divider}` }}>
                  <div className="flex items-center" style={{ gap: 5, flexWrap: "wrap" }}>
                    <button onClick={() => setAdding((v) => !v)} className="flex items-center" style={{ gap: 5, padding: "6px 9px", borderRadius: 8, background: c.accent, color: c.accentText, fontSize: 11.5, fontWeight: 600 }}><Plus size={13} /> 添加任务</button>
                    <button onClick={() => setTaskListPrefs((p) => ({ ...p, incompleteFirst: !p.incompleteFirst }))} style={{ padding: "6px 7px", borderRadius: 8, background: taskListPrefs.incompleteFirst ? c.hover : "transparent", color: taskListPrefs.incompleteFirst ? c.text : c.subtext, fontSize: 10.5 }}>未完成置顶</button>
                    <button onClick={() => setTaskListPrefs((p) => ({ ...p, completedLast: !p.completedLast }))} style={{ padding: "6px 7px", borderRadius: 8, background: taskListPrefs.completedLast ? c.hover : "transparent", color: taskListPrefs.completedLast ? c.text : c.subtext, fontSize: 10.5 }}>已完成置底</button>
                    <button onClick={() => setTaskListPrefs((p) => ({ ...p, onlyIncomplete: !p.onlyIncomplete }))} style={{ padding: "6px 7px", borderRadius: 8, background: taskListPrefs.onlyIncomplete ? c.accent : c.hover, color: taskListPrefs.onlyIncomplete ? c.accentText : c.subtext, fontSize: 10.5 }}>仅未完成</button>
                  </div>
                  {key === todayKeyForHistory && pastIncomplete.length > 0 && (
                    <button onClick={() => { const latest = [...pastIncomplete].sort((a,b) => dateFromKey(b.dateKey) - dateFromKey(a.dateKey))[0]; if (latest) { setSelectedDate(dateFromKey(latest.dateKey)); setCalendarMonth(dateFromKey(latest.dateKey)); setView("calendar"); } }}
                      style={{ marginTop: 6, width: "100%", padding: "6px 8px", borderRadius: 8, background: c.overdueBg, color: c.overdueText, fontSize: 10.5, textAlign: "left" }}>
                      还有 {pastIncomplete.length} 项历史未完成任务 · 点此处理
                    </button>
                  )}

                  {adding && (
                    <div style={{ padding: "8px 2px 2px" }}>
                      {repeatTemplates.length > 0 && (
                        <select value="" onChange={(e) => { const idx = e.target.value; if (idx !== "") addFromTemplate(repeatTemplates[Number(idx)]); }} style={{ width: "100%", fontSize: 11.5, padding: "6px 8px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none", marginBottom: 7 }}>
                          <option value="">从已有重复任务中选择…</option>
                          {repeatTemplates.map((tpl, i) => <option key={i} value={i}>{tpl.time ? `${tpl.time} ` : ""}{tpl.text}（{REPEAT_LABELS[tpl.repeat]}）</option>)}
                        </select>
                      )}
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { addTask(draft, repeatOption); setDraft(""); setRepeatOption("none"); } if (e.key === "Escape") { setAdding(false); setDraft(""); setRepeatOption("none"); } }} placeholder="输入任务，可加时间，如 18:00 交报告" style={{ flex: 1, minWidth: 0, fontSize: 13, padding: "7px 8px", borderRadius: 8, background: c.inputBg, outline: "none", color: c.text, border: "none" }} />
                        <button onClick={() => { addTask(draft, repeatOption); setDraft(""); setRepeatOption("none"); }} style={{ padding: "7px 9px", borderRadius: 8, background: c.accent, color: c.accentText, fontSize: 11.5 }}>添加</button>
                      </div>
                      <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                        <select value={repeatOption} onChange={(e) => setRepeatOption(e.target.value)} style={{ fontSize: 10.5, padding: "4px 7px", borderRadius: 7, background: c.inputBg, color: c.text, border: "none", outline: "none" }}><option value="none">不重复</option><option value="daily">每天重复</option><option value="weekly">每周重复</option><option value="weekdays">工作日重复</option></select>
                        <button onClick={() => { setAdding(false); setDraft(""); setRepeatOption("none"); }} style={{ fontSize: 10.5, color: c.subtext }}>收起</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto" style={{ paddingTop: 6 }}>
                  {displayTasks.length === 0 && !adding && (
                    <div style={{ color: c.subtext, fontSize: 13, padding: "24px 4px", textAlign: "center" }}>{taskListPrefs.onlyIncomplete && tasks.some((t) => t.done) ? "没有未完成任务" : "这一天还没有任务"}</div>
                  )}
                  {displayTasks.map((t) => {
                    const overdue = !!(t.time && !t.done && key === dateKey(today) && nowHM > t.time);
                    return <TaskRow key={t.id} task={t} c={c} onToggle={toggleTask} onDelete={deleteTask} onAction={handleRowAction} onEdit={openEditTask} onReminder={openTaskReminder} isActive={t.id === activeTaskId} isRunning={running} overdue={overdue} focusSeconds={focusSecondsByTask[t.id] || 0} />;
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <CalendarView
                monthDate={calendarMonth} setMonthDate={setCalendarMonth}
                selectedDate={selectedDate} today={today} tasksByDate={tasksByDate} c={c}
                onSelectDate={(d) => setSelectedDate(d)}
                onOpenDay={(d) => { setSelectedDate(d); setView("day"); }}
                onMoveTask={moveTaskToDate}
                onDeleteTask={deleteTask}
                onClearDay={clearTasksForDate}
                onClearDates={clearTaskDates}
                onClearMonth={clearTasksForMonth}
                onClearAll={clearAllTasks}
              />
            </div>
          )}
        </div>

        {view === "day" && (
          <div>
        <div style={{ borderTop: `1px solid ${c.divider}`, padding: "12px 18px 16px" }}>
          {activeTask && (
            <div className="flex items-center justify-center" style={{ gap: 6, marginBottom: 8, fontSize: 11, color: c.subtext }}>
              <span>专注中 · {activeTask.text}</span>
              <button onClick={stopActiveTimer} style={{ color: c.subtext }} title="结束当前专注"><X size={11} /></button>
            </div>
          )}
          <div className="flex items-center justify-center" style={{ gap: 10, marginBottom: 12 }}>
            {[25, 60].map((m) => (
              <button key={m} onClick={() => applyPreset(m)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: totalSeconds === m * 60 ? c.hover : "transparent", color: totalSeconds === m * 60 ? c.text : c.subtext }}>
                {m} 分钟
              </button>
            ))}
            <button onClick={() => setShowCustomTimer(true)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: totalSeconds !== 25 * 60 && totalSeconds !== 60 * 60 ? c.hover : "transparent", color: totalSeconds !== 25 * 60 && totalSeconds !== 60 * 60 ? c.text : c.subtext }}>
              自定义
            </button>
          </div>
          <div className="flex items-center justify-center" style={{ gap: 18 }}>
            <IconButton c={c} onClick={handleReset} title="重置"><RotateCcw size={15} /></IconButton>
            <div style={{ fontSize: 30, fontWeight: 600, color: c.text, letterSpacing: 1, fontVariantNumeric: "tabular-nums", minWidth: 92, textAlign: "center" }}>
              {timerDisplay}
            </div>
            <button
              onClick={handlePlayPause}
              style={{ width: 34, height: 34, borderRadius: "9999px", background: c.accent, color: c.accentText, display: "flex", alignItems: "center", justifyContent: "center" }}
              title={running ? "暂停" : "开始"}
            >
              {running ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 1 }} />}
            </button>
          </div>
          <div className="flex items-center justify-center" style={{ marginTop: 10 }}>
            <button onClick={testReminder} style={{ fontSize: 10.5, color: c.subtext, opacity: 0.75 }}>测试晚间提醒（模拟22:00）</button>
          </div>
        </div>

          </div>
        )}

        {/* 提醒 toast */}
        {toasts.length > 0 && (
          <div style={{ position: "absolute", left: 14, right: 14, bottom: 178, display: "flex", flexDirection: "column", gap: 6, zIndex: 35 }}>
            {toasts.map((t) => (
              <div key={t.id} style={{ background: c.hover, color: c.text, fontSize: 12, padding: "8px 12px", borderRadius: 10, boxShadow: "0 6px 16px rgba(0,0,0,0.15)" }}>
                🔔 {t.text}
              </div>
            ))}
          </div>
        )}

        {editingTaskId && <TaskEditModal c={c} task={findTaskById(editingTaskId)} onClose={() => setEditingTaskId(null)} onSave={(patch) => { updateTaskById(editingTaskId, patch); setEditingTaskId(null); }} />}
        {reminderTaskId && <TaskReminderModal c={c} task={findTaskById(reminderTaskId)} onClose={() => setReminderTaskId(null)} onSave={(patch) => { updateTaskById(reminderTaskId, patch); setReminderTaskId(null); }} />}
        {showSoundSettings && <SoundSettingsModal c={c} settings={soundSettings} onChange={setSoundSettings} onClose={() => setShowSoundSettings(false)} onTest={playReminderSound} />}
        {showSecuritySettings && <SecurityModal c={c} status={securityStatus} onClose={() => setShowSecuritySettings(false)} onStatusChange={setSecurityStatus} />}
        {showBackupSettings && <BackupModal c={c} onClose={() => setShowBackupSettings(false)} onBeforeExport={persistStateNow} />}
        {showCustomTimer && <CustomTimerModal c={c} currentMinutes={Math.floor(totalSeconds / 60)} onClose={() => setShowCustomTimer(false)} onApply={(minutes) => { applyPreset(minutes); setShowCustomTimer(false); }} />}
        {showCountdownManager && <CountdownManagerModal c={c} countdowns={countdowns} onChange={setCountdowns} onClose={() => setShowCountdownManager(false)} />}
        {showBatchModal && <BatchAddModal c={c} today={today} initialDate={selectedDate} repeatPlans={repeatPlans} onClose={() => setShowBatchModal(false)} onSubmit={addBatch} onUpdatePlan={updateRepeatPlan} onTogglePlan={toggleRepeatPlan} onDeletePlan={deleteRepeatPlan} />}
        {showRecords && <RecordsModal c={c} sessions={sessions} onClose={() => setShowRecords(false)} onClear={clearSessions} />}
        {showReminderModal && (
          <ReminderModal
            c={c} list={reminderList}
            onClose={() => setShowReminderModal(false)}
            onGoToday={() => { setSelectedDate(today); setView("day"); setShowReminderModal(false); }}
          />
        )}
      </div>

    </div>
  );
}
