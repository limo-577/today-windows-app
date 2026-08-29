import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Check, ChevronLeft, ChevronRight, Sun, Moon,
  Play, Pause, RotateCcw, PictureInPicture2, X,
  CalendarDays, List, ListPlus, ClipboardList, Repeat, AlarmClock,
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

/* ---------- 主题色板 ---------- */
const THEMES = {
  light: {
    bg: "#EDEEEA", window: "#FCFCFA", text: "#2B2B27", subtext: "#9A9A90",
    divider: "#EEEDE7", hover: "#F4F3EE", accent: "#6E8F6F", accentText: "#FFFFFF",
    doneText: "#B7B6AD", inputBg: "#F4F3EE", overdueBg: "#F3D9D4", overdueText: "#B14B3A",
  },
  dark: {
    bg: "#111110", window: "#1B1B19", text: "#EDEDE7", subtext: "#8B8B82",
    divider: "#2A2A26", hover: "#242422", accent: "#8FB398", accentText: "#15251B",
    doneText: "#5C5C55", inputBg: "#242422", overdueBg: "#3A2420", overdueText: "#E08A73",
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
function TaskRow({ task, c, compact, onToggle, onDelete, onAction, isActive, isRunning, overdue, focusSeconds = 0 }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center"
      style={{
        gap: compact ? 6 : 9, padding: compact ? "5px 4px" : "8px 4px",
        background: isActive ? c.hover : "transparent", borderRadius: 8,
      }}
    >
      <CheckCircle done={task.done} c={c} onClick={() => onToggle(task.id)} />
      {task.repeat && task.repeat !== "none" && (
        <span title={REPEAT_LABELS[task.repeat]} style={{ display: "flex", flexShrink: 0 }}>
          <Repeat size={compact ? 9 : 11} color={c.subtext} />
        </span>
      )}
      {task.time && (
        <span
          style={{
            fontSize: 10, flexShrink: 0, fontWeight: overdue ? 700 : 400,
            color: overdue ? c.overdueText : c.subtext,
            background: compact ? "transparent" : overdue ? c.overdueBg : c.hover,
            padding: compact ? 0 : "2px 6px", borderRadius: 999,
          }}
        >
          {task.time}
        </span>
      )}
      <span
        style={{
          flex: 1, fontSize: compact ? 12.5 : 14,
          color: task.done ? c.doneText : c.text,
          textDecoration: task.done ? "line-through" : "none",
          wordBreak: "break-word",
        }}
      >
        {task.text}
      </span>
      {focusSeconds > 0 && (
        <span title="累计专注时间" style={{ fontSize: compact ? 9 : 10, color: isActive ? c.accent : c.subtext, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {formatFocusTime(focusSeconds)}
        </span>
      )}
      {!compact && !task.done && onAction && (
        <button
          onClick={() => onAction(task.id)}
          style={{ opacity: hover || isActive ? 1 : 0, transition: "opacity .15s ease", color: isActive ? c.accent : c.subtext, flexShrink: 0 }}
          title={isActive && isRunning ? "暂停" : "开始计时"}
        >
          {isActive && isRunning ? <Pause size={13} /> : <Play size={13} />}
        </button>
      )}
      {!compact && onDelete && (
        <button
          onClick={() => onDelete(task.id)}
          style={{ opacity: hover ? 1 : 0, transition: "opacity .15s ease", color: c.subtext, flexShrink: 0 }}
          title="删除任务"
        >
          <X size={13} />
        </button>
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
function CalendarView({ monthDate, setMonthDate, selectedDate, today, tasksByDate, c, onSelectDate, onMoveTask, onClearDay, onClearMonth, onClearAll }) {
  const [dragOverKey, setDragOverKey] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const confirmTimerRef = useRef(null);
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
  const cells = buildMonthGrid(monthDate);
  return (
    <div style={{ padding: "6px 18px 8px" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <IconButton c={c} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} title="上个月">
          <ChevronLeft size={16} />
        </IconButton>
        <div style={{ fontSize: 15, fontWeight: 650, color: c.text }}>
          {monthDate.getFullYear()}年{monthDate.getMonth() + 1}月
        </div>
        <IconButton c={c} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} title="下个月">
          <ChevronRight size={16} />
        </IconButton>
      </div>
      <div style={{ fontSize: 10, color: c.subtext, textAlign: "center", marginBottom: 6 }}>拖动任务小方块可以改到别的日期</div>
      <div className="grid grid-cols-7" style={{ marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ fontSize: 10.5, color: c.subtext, textAlign: "center", padding: "2px 0" }}>{w.slice(2)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ gap: 3 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = dateKey(d);
          const list = tasksByDate[k] || [];
          const isToday = k === dateKey(today);
          const isSelected = k === dateKey(selectedDate);
          const isDragOver = dragOverKey === k;
          return (
            <div
              key={i}
              onDragOver={(e) => { e.preventDefault(); setDragOverKey(k); }}
              onDragLeave={() => setDragOverKey((dk) => (dk === k ? null : dk))}
              onDrop={(e) => {
                e.preventDefault();
                try {
                  const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                  onMoveTask(data.fromKey, k, data.taskId);
                } catch (err) {}
                setDragOverKey(null);
              }}
              className="flex flex-col items-center"
              style={{
                minHeight: 62, borderRadius: 10, padding: "3px 2px", gap: 2,
                background: isDragOver ? c.hover : isSelected ? c.accent : isToday ? c.hover : "transparent",
                outline: isDragOver ? `1.5px dashed ${c.accent}` : "none",
              }}
            >
              <button
                onClick={() => onSelectDate(d)}
                style={{ fontSize: 12, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? c.accentText : c.text, lineHeight: 1.4 }}
              >
                {d.getDate()}
              </button>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
                {list.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: t.id, fromKey: k }))}
                    title={t.text}
                    style={{
                      fontSize: 8, lineHeight: "11px", padding: "1px 3px", borderRadius: 4, cursor: "grab",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      textDecoration: t.done ? "line-through" : "none",
                      background: t.done ? "transparent" : isSelected ? "rgba(255,255,255,0.35)" : c.accent,
                      color: t.done ? c.subtext : isSelected ? c.accentText : c.accentText,
                      border: t.done ? `1px solid ${c.divider}` : "none",
                    }}
                  >
                    {t.text}
                  </div>
                ))}
                {list.length > 2 && (
                  <div style={{ fontSize: 7.5, textAlign: "center", color: isSelected ? c.accentText : c.subtext }}>+{list.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: `1px solid ${c.divider}`, marginTop: 10, paddingTop: 9, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, color: c.subtext }}>清理已安排的计划</div>
        <button
          onClick={() => armOrRun("day", () => onClearDay(dateKey(selectedDate)))}
          style={{
            fontSize: 11.5, padding: "7px 10px", borderRadius: 8, textAlign: "left",
            background: confirmAction === "day" ? c.overdueBg : c.hover,
            color: confirmAction === "day" ? c.overdueText : c.text,
          }}
        >
          {confirmAction === "day" ? "确定清空？" : `清空所选这天的计划 · ${displayDate(selectedDate)}`}
        </button>
        <button
          onClick={() => armOrRun("month", () => onClearMonth(monthDate.getFullYear(), monthDate.getMonth()))}
          style={{
            fontSize: 11.5, padding: "7px 10px", borderRadius: 8, textAlign: "left",
            background: confirmAction === "month" ? c.overdueBg : c.hover,
            color: confirmAction === "month" ? c.overdueText : c.text,
          }}
        >
          {confirmAction === "month" ? "确定清空？" : `清空本月计划 · ${monthDate.getMonth() + 1}月`}
        </button>
        <button
          onClick={() => armOrRun("all", onClearAll)}
          style={{
            fontSize: 12, padding: "8px 0", borderRadius: 8, fontWeight: 650,
            background: confirmAction === "all" ? c.overdueText : c.overdueBg,
            color: confirmAction === "all" ? "#FFFFFF" : c.overdueText,
          }}
        >
          {confirmAction === "all" ? "再点一次，清空全部计划" : "清空全部计划"}
        </button>
      </div>
    </div>
  );
}

/* ---------- 批量添加计划弹窗 ---------- */
function BatchAddModal({ c, onClose, onSubmit, initialDate, today }) {
  const [text, setText] = useState("");
  const [monthDate, setMonthDate] = useState(initialDate);
  const [selected, setSelected] = useState(new Set([dateKey(initialDate)]));
  const [repeat, setRepeat] = useState("none");

  const cells = buildMonthGrid(monthDate);
  const toggleDate = (d) => {
    const k = dateKey(d);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };
  const quickSelect = (mode) => {
    if (mode === "today") setSelected(new Set([dateKey(today)]));
    if (mode === "tomorrow") setSelected(new Set([dateKey(addDays(today, 1))]));
    if (mode === "week") setSelected(new Set(Array.from({ length: 7 }, (_, i) => dateKey(addDays(today, i)))));
    if (mode === "clear") setSelected(new Set());
  };
  const handleSubmit = () => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0 || selected.size === 0) return;
    onSubmit(Array.from(selected), lines.map((l) => ({ ...parseTaskLine(l), repeat })));
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
      <div style={{ width: 320, maxHeight: 580, background: c.window, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.35)", overflowY: "auto" }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 14.5, fontWeight: 650, color: c.text }}>批量添加计划</span>
          <button onClick={onClose} style={{ color: c.subtext }}><X size={16} /></button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"每行一个任务，可选加时间前缀\n例如：\n09:00 晨会\n阅读30分钟"}
          style={{
            width: "100%", height: 84, resize: "none", fontSize: 13, padding: 9,
            borderRadius: 10, background: c.inputBg, color: c.text, outline: "none",
            border: "none", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box",
          }}
        />

        <div className="flex items-center justify-between">
          <span style={{ fontSize: 11.5, color: c.subtext }}>标记为重复任务</span>
          <select value={repeat} onChange={(e) => setRepeat(e.target.value)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }}>
            <option value="none">不重复</option>
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="weekdays">工作日</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 11.5, color: c.subtext, marginBottom: 6 }}>应用到哪些天</div>
          <div className="flex items-center" style={{ gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {[["today", "今天"], ["tomorrow", "明天"], ["week", "未来7天"], ["clear", "清空"]].map(([k, label]) => (
              <button key={k} onClick={() => quickSelect(k)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, background: c.hover, color: c.subtext }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <IconButton c={c} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} title="上个月"><ChevronLeft size={14} /></IconButton>
            <span style={{ fontSize: 12, color: c.text, fontWeight: 600 }}>{monthDate.getFullYear()}年{monthDate.getMonth() + 1}月</span>
            <IconButton c={c} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} title="下个月"><ChevronRight size={14} /></IconButton>
          </div>
          <div className="grid grid-cols-7" style={{ gap: 3 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = dateKey(d);
              const isSel = selected.has(k);
              const isToday = k === dateKey(today);
              return (
                <button
                  key={i}
                  onClick={() => toggleDate(d)}
                  style={{
                    fontSize: 11, padding: "5px 0", borderRadius: 8,
                    background: isSel ? c.accent : isToday ? c.hover : "transparent",
                    color: isSel ? c.accentText : c.text, fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          style={{ marginTop: 4, padding: "10px 0", borderRadius: 10, background: c.accent, color: c.accentText, fontSize: 13, fontWeight: 650 }}
        >
          添加到 {selected.size} 天
        </button>
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
  const confirmTimerRef = useRef(null);
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
                  <div key={s.id} className="flex items-center justify-between" style={{ fontSize: 11.5, color: c.subtext, padding: "3px 0" }}>
                    <span style={{ color: c.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{s.taskText}</span>
                    <span style={{ flexShrink: 0 }}>{fmtTime(s.start)}–{fmtTime(s.end)} · {fmtDur(s.seconds)}</span>
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
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [repeatOption, setRepeatOption] = useState("none");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [countdowns, setCountdowns] = useState([]);
  const [showCountdownManager, setShowCountdownManager] = useState(false);
  const [showCustomTimer, setShowCustomTimer] = useState(false);

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

  /* ---- 载入已保存的数据（跨会话持久化） ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = window.desktopAPI?.state
          ? await window.desktopAPI.state.get()
          : JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (data && !cancelled) {
          if (data.tasksByDate) setTasksByDate(data.tasksByDate);
          if (Array.isArray(data.sessions)) setSessions(data.sessions);
          if (Array.isArray(data.countdowns)) setCountdowns(data.countdowns);
          if (data.taskTimerStates && typeof data.taskTimerStates === "object") setTaskTimerStates(data.taskTimerStates);
          if (typeof data.idCounter === "number") idRef.current = data.idCounter;
          if (data.theme) setTheme(data.theme);
          if (typeof data.totalSeconds === "number") { setTotalSeconds(data.totalSeconds); setRemaining(data.totalSeconds); }
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
      const payload = { tasksByDate, sessions, countdowns, taskTimerStates, idCounter: idRef.current, theme, totalSeconds };
      if (window.desktopAPI?.state) {
        window.desktopAPI.state.set(payload).catch(() => {});
      } else {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) {}
      }
    }, 600);
    return () => clearTimeout(t);
  }, [tasksByDate, sessions, countdowns, taskTimerStates, theme, totalSeconds, loaded]);

  const key = dateKey(selectedDate);
  const tasks = tasksByDate[key] || [];
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
    setSessions((s) => [...s, { id: nextId(), taskId: openSession.taskId, taskText: openSession.taskText, dateKey: openSession.dateKey, start: openSession.startTime, end: Date.now(), seconds }]);
    setOpenSession(null);
    sessionElapsedMsRef.current = 0;
  };

  const toggleTask = (id) => {
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    clearTaskRemaining(id);
    if (id === activeTaskId) {
      finalizeSession();
      setRunning(false);
      timerDeadlineRef.current = null;
      lastTimerTickRef.current = null;
      setActiveTaskId(null);
    }
  };
  const deleteTask = (id) => {
    if (id === activeTaskId) {
      finalizeSession();
      setRunning(false);
      timerDeadlineRef.current = null;
      lastTimerTickRef.current = null;
      clearTaskRemaining(id);
      setActiveTaskId(null);
    }
    clearTaskRemaining(id);
    setTasks((list) => list.filter((t) => t.id !== id));
  };
  const addTask = (raw, repeat = "none") => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const { time, text } = parseTaskLine(trimmed);
    if (repeat === "none") {
      setTasks((list) => [...list, { id: nextId(), text, time, done: false, repeat: "none" }]);
    } else {
      const dates = repeatDates(selectedDate, repeat);
      setTasksByDate((prev) => {
        const next = { ...prev };
        dates.forEach((d) => {
          const k2 = dateKey(d);
          const list = next[k2] ? [...next[k2]] : [];
          list.push({ id: nextId(), text, time, done: false, repeat });
          next[k2] = list;
        });
        return next;
      });
    }
  };
  const addFromTemplate = (tpl) => {
    setTasks((list) => [...list, { id: nextId(), text: tpl.text, time: tpl.time, done: false, repeat: tpl.repeat }]);
    setAdding(false);
  };
  const addBatch = (dateKeys, parsedLines) => {
    setTasksByDate((prev) => {
      const next = { ...prev };
      dateKeys.forEach((k2) => {
        const list = next[k2] ? [...next[k2]] : [];
        parsedLines.forEach((p) => list.push({ id: nextId(), text: p.text, time: p.time, done: false, repeat: p.repeat || "none" }));
        next[k2] = list;
      });
      return next;
    });
    setShowBatchModal(false);
  };
  const clearSessions = (keepPredicate) => setSessions((s) => s.filter(keepPredicate));
  const clearTasksForDate = (k) => setTasksByDate((prev) => { const next = { ...prev }; delete next[k]; return next; });
  const clearTasksForMonth = (year, month) => setTasksByDate((prev) => {
    const next = { ...prev };
    Object.keys(next).forEach((k) => { const d = dateFromKey(k); if (d.getFullYear() === year && d.getMonth() === month) delete next[k]; });
    return next;
  });
  const clearAllTasks = () => setTasksByDate({});
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


  /* 已标注为重复任务的模板，供快速添加时选用 */
  const templateMap = new Map();
  Object.values(tasksByDate).forEach((list) => list.forEach((t) => {
    if (t.repeat && t.repeat !== "none") {
      const tk = `${t.text}__${t.time || ""}__${t.repeat}`;
      if (!templateMap.has(tk)) templateMap.set(tk, { text: t.text, time: t.time, repeat: t.repeat });
    }
  }));
  const repeatTemplates = Array.from(templateMap.values());

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
    tasks: (tasksByDate[dateKey(today)] || []).map((task) => ({
      ...task,
      focusSeconds: focusSecondsByTask[task.id] || 0,
      pausedRemaining: taskTimerStates[task.id],
    })),
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
    window.desktopAPI.reminders.update({ tasksByDate, countdowns }).catch(() => {});
  }, [loaded, tasksByDate, countdowns]);

  useEffect(() => {
    if (!window.desktopAPI?.reminders?.onEvent) return undefined;
    return window.desktopAPI.reminders.onEvent((event) => {
      if (!event) return;
      if (event.type === "task") {
        pushToast(`到点了：${event.text}（应在 ${event.time} 前完成）`);
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
  }, []);

  useEffect(() => {
    if (!window.desktopAPI?.notifications?.onClick) return undefined;
    return window.desktopAPI.notifications.onClick((payload) => {
      if (payload?.type?.startsWith?.("countdown")) { setShowCountdownManager(true); return; }
      if (!payload?.dateKey) return;
      setSelectedDate(dateFromKey(payload.dateKey));
      setView("day");
    });
  }, []);

  const testReminder = () => {
    const todayKey = dateKey(today);
    const incomplete = (tasksByDate[todayKey] || []).filter((t) => !t.done);
    setReminderList(incomplete);
    setShowReminderModal(true);
    try {
      const body = incomplete.length > 0
        ? `还有 ${incomplete.length} 项任务未完成，抓紧完成吧！`
        : "今天的任务都完成啦，辛苦了！";
      if (window.desktopAPI?.notify) {
        window.desktopAPI.notify("今日待办提醒（测试）", body).catch(() => {});
      }
    } catch (e) {}
  };

  if (!loaded) {
    return (
      <div style={{ background: THEMES.light.bg, minHeight: 660 }} className="flex items-center justify-center p-6">
        <div style={{ width: 380, height: 660, background: THEMES.light.window, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.25)" }}>
          <span style={{ fontSize: 13, color: THEMES.light.subtext }}>正在载入…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ background: c.bg, minHeight: 660, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}
      className="flex items-center justify-center p-6 relative"
    >
      {/* ---------- 主窗口 ---------- */}
      <div
        style={{
          width: 380, height: 660, background: c.window, borderRadius: 20,
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
            <IconButton c={c} onClick={openFloatingWindow} title="打开独立悬浮窗"><PictureInPicture2 size={15} /></IconButton>
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

              {/* 任务列表 */}
              <div className="flex-1 overflow-y-auto" style={{ padding: "0 18px" }}>
                {tasks.length === 0 && !adding && (
                  <div style={{ color: c.subtext, fontSize: 13, padding: "24px 4px", textAlign: "center" }}>这一天还没有任务</div>
                )}
                {tasks.map((t) => {
                  const overdue = !!(t.time && !t.done && key === dateKey(today) && nowHM > t.time);
                  return (
                    <TaskRow
                      key={t.id} task={t} c={c}
                      onToggle={toggleTask} onDelete={deleteTask} onAction={handleRowAction}
                      isActive={t.id === activeTaskId} isRunning={running} overdue={overdue}
                      focusSeconds={focusSecondsByTask[t.id] || 0}
                    />
                  );
                })}

                {adding ? (
                  <div style={{ padding: "6px 4px 10px" }}>
                    {repeatTemplates.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => { const idx = e.target.value; if (idx !== "") addFromTemplate(repeatTemplates[Number(idx)]); }}
                        style={{ width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none", marginBottom: 8 }}
                      >
                        <option value="">从已有的重复任务中选择…</option>
                        {repeatTemplates.map((tpl, i) => (
                          <option key={i} value={i}>{tpl.time ? `${tpl.time} ` : ""}{tpl.text}（{REPEAT_LABELS[tpl.repeat]}）</option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center" style={{ gap: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "9999px", border: `2px dashed ${c.subtext}`, flexShrink: 0 }} />
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { addTask(draft, repeatOption); setDraft(""); setRepeatOption("none"); }
                          if (e.key === "Escape") { setAdding(false); setDraft(""); setRepeatOption("none"); }
                        }}
                        placeholder="输入任务，可加时间前缀，如 18:00 交报告"
                        style={{ flex: 1, fontSize: 14, background: "transparent", outline: "none", color: c.text, border: "none" }}
                      />
                    </div>
                    <div className="flex items-center justify-between" style={{ marginTop: 8, paddingLeft: 32 }}>
                      <select
                        value={repeatOption}
                        onChange={(e) => setRepeatOption(e.target.value)}
                        style={{ fontSize: 11, padding: "4px 8px", borderRadius: 8, background: c.inputBg, color: c.text, border: "none", outline: "none" }}
                      >
                        <option value="none">不重复</option>
                        <option value="daily">每天重复</option>
                        <option value="weekly">每周重复</option>
                        <option value="weekdays">工作日重复</option>
                      </select>
                      <button
                        onClick={() => { addTask(draft, repeatOption); setDraft(""); setRepeatOption("none"); setAdding(false); }}
                        style={{ fontSize: 11.5, color: c.accent, fontWeight: 650 }}
                      >
                        确定
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAdding(true)} className="flex items-center" style={{ gap: 8, padding: "10px 4px", color: c.subtext, fontSize: 13.5, width: "100%" }}>
                    <Plus size={15} /> 添加任务
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <CalendarView
                monthDate={calendarMonth} setMonthDate={setCalendarMonth}
                selectedDate={selectedDate} today={today} tasksByDate={tasksByDate} c={c}
                onSelectDate={(d) => { setSelectedDate(d); setView("day"); }}
                onMoveTask={moveTaskToDate}
                onClearDay={clearTasksForDate}
                onClearMonth={clearTasksForMonth}
                onClearAll={clearAllTasks}
              />
            </div>
          )}
        </div>

        {/* 专注计时器 */}
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

        {showCustomTimer && <CustomTimerModal c={c} currentMinutes={Math.floor(totalSeconds / 60)} onClose={() => setShowCustomTimer(false)} onApply={(minutes) => { applyPreset(minutes); setShowCustomTimer(false); }} />}
        {showCountdownManager && <CountdownManagerModal c={c} countdowns={countdowns} onChange={setCountdowns} onClose={() => setShowCountdownManager(false)} />}
        {showBatchModal && <BatchAddModal c={c} today={today} initialDate={selectedDate} onClose={() => setShowBatchModal(false)} onSubmit={addBatch} />}
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
