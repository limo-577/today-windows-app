const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let floatWindow = null;
let tray = null;
let isQuitting = false;
let lastFloatSnapshot = null;
let reminderSchedule = { tasksByDate: {}, countdowns: [], soundMode: 'default' };
let preCalendarBounds = null;
let lastReminderCheck = Date.now() - 60_000;
const remindedKeys = new Set();
let reminderTimer = null;
let prefsWriteTimer = null;
let pendingPrefsPatch = {};

if (process.platform === 'win32') app.setAppUserModelId('com.local.todayapp');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

const isDev = !app.isPackaged;

function userFile(name) {
  return path.join(app.getPath('userData'), name);
}

function stateFile() {
  return userFile('today-state.json');
}

function prefsFile() {
  return userFile('desktop-prefs.json');
}

function readJson(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function atomicWriteJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data), 'utf8');
    // 保留上一版备份；即使写入/替换时异常，也能恢复旧数据。
    try { if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`); } catch {}
    // Windows 上目标文件存在时 rename 偶尔会失败，先移除旧文件更稳妥。
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    fs.renameSync(temp, file);
    return true;
  } catch {
    try { fs.unlinkSync(`${file}.tmp`); } catch {}
    return false;
  }
}

function readState() {
  return readJson(stateFile()) || readJson(`${stateFile()}.bak`);
}

function writeState(data) {
  return atomicWriteJson(stateFile(), data);
}

function readPrefs() {
  return readJson(prefsFile()) || readJson(`${prefsFile()}.bak`) || {};
}

function writePrefs(patch) {
  const next = { ...readPrefs(), ...patch };
  return atomicWriteJson(prefsFile(), next);
}

function schedulePrefsWrite(patch) {
  pendingPrefsPatch = { ...pendingPrefsPatch, ...patch };
  if (prefsWriteTimer) clearTimeout(prefsWriteTimer);
  prefsWriteTimer = setTimeout(() => {
    const current = pendingPrefsPatch;
    pendingPrefsPatch = {};
    prefsWriteTimer = null;
    writePrefs(current);
  }, 350);
}

function clampBounds(bounds, fallback) {
  if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) return fallback;
  const displays = screen.getAllDisplays();
  const visible = displays.some((d) => {
    const a = d.workArea;
    const cx = bounds.x + Math.min(bounds.width, 80) / 2;
    const cy = bounds.y + Math.min(bounds.height, 80) / 2;
    return cx >= a.x && cx <= a.x + a.width && cy >= a.y && cy <= a.y + a.height;
  });
  return visible ? bounds : fallback;
}

function rendererTarget(windowType = 'main') {
  if (isDev) {
    return { url: `http://localhost:5173${windowType === 'float' ? '/?window=float' : ''}` };
  }
  return {
    file: path.join(__dirname, '..', 'dist', 'index.html'),
    options: windowType === 'float' ? { query: { window: 'float' } } : undefined,
  };
}

function loadRenderer(win, windowType) {
  const target = rendererTarget(windowType);
  if (target.url) return win.loadURL(target.url);
  return win.loadFile(target.file, target.options);
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  const prefs = readPrefs();
  const bounds = clampBounds(prefs.mainBounds, { width: 440, height: 740 });

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 430,
    minHeight: 720,
    backgroundColor: '#EDEEEA',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  loadRenderer(mainWindow, 'main');

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    schedulePrefsWrite({ mainBounds: mainWindow.getBounds() });
    mainWindow.hide();
    const prefs = readPrefs();
    if (!prefs.trayHintShown) {
      writePrefs({ trayHintShown: true });
      showNativeNotification('今日仍在后台运行', '提醒功能会继续工作。可双击系统托盘图标重新打开。');
    }
  });

  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) {
      schedulePrefsWrite({ mainBounds: mainWindow.getBounds() });
    }
  });
  mainWindow.on('move', () => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMinimized()) {
      schedulePrefsWrite({ mainBounds: mainWindow.getBounds() });
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow;
}

function createFloatWindow() {
  if (floatWindow && !floatWindow.isDestroyed()) {
    floatWindow.show();
    floatWindow.focus();
    if (lastFloatSnapshot) floatWindow.webContents.send('float:snapshot', lastFloatSnapshot);
    return floatWindow;
  }

  const prefs = readPrefs();
  const compactFloatBounds = prefs.floatBounds ? { ...prefs.floatBounds, width: Math.min(Number(prefs.floatBounds.width) || 235, 250), height: Math.min(Number(prefs.floatBounds.height) || 260, 300) } : null;
  const bounds = clampBounds(compactFloatBounds, { width: 235, height: 260 });
  const opacity = Math.max(0.3, Math.min(1, Number(prefs.floatOpacity) || 1));
  const pinned = prefs.floatPinned !== false;

  floatWindow = new BrowserWindow({
    ...bounds,
    minWidth: 205,
    minHeight: 160,
    maxWidth: 420,
    maxHeight: 720,
    frame: false,
    transparent: false,
    resizable: true,
    movable: true,
    alwaysOnTop: pinned,
    skipTaskbar: true,
    show: false,
    opacity,
    backgroundColor: '#FCFCFA',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (pinned) floatWindow.setAlwaysOnTop(true, 'floating');
  floatWindow.setVisibleOnAllWorkspaces(pinned, { visibleOnFullScreen: pinned });

  floatWindow.once('ready-to-show', () => {
    if (!floatWindow || floatWindow.isDestroyed()) return;
    floatWindow.show();
    floatWindow.webContents.send('window:appearance', { pinned, opacity });
    if (lastFloatSnapshot) floatWindow.webContents.send('float:snapshot', lastFloatSnapshot);
  });

  floatWindow.webContents.on('did-finish-load', () => {
    if (!floatWindow || floatWindow.isDestroyed()) return;
    floatWindow.webContents.send('window:appearance', { pinned, opacity });
    if (lastFloatSnapshot) floatWindow.webContents.send('float:snapshot', lastFloatSnapshot);
  });

  const saveFloatBounds = () => {
    if (floatWindow && !floatWindow.isDestroyed()) schedulePrefsWrite({ floatBounds: floatWindow.getBounds() });
  };
  floatWindow.on('resize', saveFloatBounds);
  floatWindow.on('move', saveFloatBounds);
  floatWindow.on('close', saveFloatBounds);
  floatWindow.on('closed', () => { floatWindow = null; });

  loadRenderer(floatWindow, 'float');
  return floatWindow;
}

function rebuildTrayMenu() {
  if (!tray) return;
  const startupEnabled = app.getLoginItemSettings().openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开今日', click: showMainWindow },
    { label: '打开悬浮窗', click: () => createFloatWindow() },
    { type: 'separator' },
    {
      label: '开机自动启动',
      type: 'checkbox',
      checked: startupEnabled,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked, path: process.execPath });
        rebuildTrayMenu();
      },
    },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } },
  ]));
}

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, 'tray.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) icon = nativeImage.createEmpty();
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('今日');
  rebuildTrayMenu();
  tray.on('double-click', showMainWindow);
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function dueTimestamp(dateKey, hm) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const [hh, mm] = String(hm).split(':').map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return NaN;
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

function showNativeNotification(title, body, payload, options = {}) {
  if (!Notification.isSupported()) return false;
  const notification = new Notification({ title: String(title || '今日'), body: String(body || ''), silent: Boolean(options.silent) });
  notification.on('click', () => {
    showMainWindow();
    if (payload && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('notification:clicked', payload);
    }
  });
  notification.show();
  return true;
}

function countdownMatchesDate(item, d) {
  if (!item || item.enabled === false) return false;
  if (item.repeat === 'daily') return true;
  if (item.repeat === 'weekly') return Array.isArray(item.weekdays) && item.weekdays.includes(d.getDay());
  if (item.repeat === 'monthly') return d.getDate() === Number(item.monthDay);
  return false;
}

function countdownTargetsInWindow(item, checkFrom, now, beforeMinutes) {
  if (!item || !item.time) return [];
  const [hh, mm] = String(item.time).split(':').map(Number);
  if (![hh, mm].every(Number.isFinite)) return [];
  const beforeMs = Math.max(0, Number(beforeMinutes) || 0) * 60000;
  const start = new Date(checkFrom);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now + beforeMs + 86400000);
  end.setHours(23, 59, 59, 999);
  const results = [];
  const d = new Date(start);
  let guard = 0;
  while (d.getTime() <= end.getTime() && guard < 400) {
    if (countdownMatchesDate(item, d)) {
      const target = new Date(d);
      target.setHours(hh, mm, 0, 0);
      results.push(target.getTime());
    }
    d.setDate(d.getDate() + 1);
    guard += 1;
  }
  return results;
}

function checkReminders() {
  const now = Date.now();
  const todayKey = localDateKey(new Date(now));
  const taskSchedule = reminderSchedule && reminderSchedule.tasksByDate ? reminderSchedule.tasksByDate : reminderSchedule;
  const countdowns = Array.isArray(reminderSchedule?.countdowns) ? reminderSchedule.countdowns : [];
  const todayTasks = Array.isArray(taskSchedule?.[todayKey]) ? taskSchedule[todayKey] : [];
  const checkFrom = Math.min(lastReminderCheck, now);

  const useCustomSound = reminderSchedule?.soundMode === 'custom';
  for (const task of todayTasks) {
    if (!task || task.done || task.reminderEnabled === false) continue;
    const alarmTime = task.reminderTime || task.time;
    if (!alarmTime) continue;
    const due = dueTimestamp(todayKey, alarmTime);
    const reminderKey = `task:${todayKey}:${task.id}:${alarmTime}`;
    if (Number.isFinite(due) && due > checkFrom && due <= now && !remindedKeys.has(reminderKey)) {
      remindedKeys.add(reminderKey);
      showNativeNotification('任务提醒', `${alarmTime} · ${task.text}`, { type: 'task', dateKey: todayKey, taskId: task.id }, { silent: useCustomSound });
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('reminder:event', { type: 'task', dateKey: todayKey, taskId: task.id, text: task.text, time: alarmTime });
      }
    }
  }

  for (const item of countdowns) {
    if (!item || item.enabled === false || !item.time || !item.title) continue;
    const beforeMinutes = Math.max(0, Math.min(43200, Math.floor(Number(item.remindBefore) || 0)));
    const targets = countdownTargetsInWindow(item, checkFrom, now, beforeMinutes);
    for (const target of targets) {
      if (beforeMinutes > 0) {
        const trigger = target - beforeMinutes * 60000;
        const beforeKey = `countdown-before:${item.id}:${target}:${beforeMinutes}`;
        if (trigger > checkFrom && trigger <= now && !remindedKeys.has(beforeKey)) {
          remindedKeys.add(beforeKey);
          showNativeNotification('倒计时提醒', `距离${item.title}还有 ${beforeMinutes} 分钟`, { type: 'countdown-before', countdownId: item.id }, { silent: useCustomSound });
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('reminder:event', { type: 'countdown-before', countdownId: item.id, title: item.title, minutes: beforeMinutes });
        }
      }
      if (item.remindAtTime !== false) {
        const dueKey = `countdown-due:${item.id}:${target}`;
        if (target > checkFrom && target <= now && !remindedKeys.has(dueKey)) {
          remindedKeys.add(dueKey);
          showNativeNotification('倒计时到点', `${item.title}时间到了`, { type: 'countdown-due', countdownId: item.id }, { silent: useCustomSound });
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('reminder:event', { type: 'countdown-due', countdownId: item.id, title: item.title });
        }
      }
    }
  }

  const endOfDay = dueTimestamp(todayKey, '22:00');
  const eodKey = `eod:${todayKey}`;
  if (Number.isFinite(endOfDay) && endOfDay > checkFrom && endOfDay <= now && !remindedKeys.has(eodKey)) {
    const incomplete = todayTasks.filter((t) => t && !t.done);
    remindedKeys.add(eodKey);
    if (incomplete.length > 0) {
      showNativeNotification('今日待办提醒', `还有 ${incomplete.length} 项任务未完成，抓紧完成吧！`, { type: 'eod', dateKey: todayKey }, { silent: useCustomSound });
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('reminder:event', { type: 'eod', dateKey: todayKey, tasks: incomplete });
      }
    }
  }

  lastReminderCheck = now;
  // 防止集合无限增长。任务/晚间提醒只保留当天；倒计时键保留近期开过的有限集合。
  for (const key of Array.from(remindedKeys)) {
    if ((key.startsWith('task:') || key.startsWith('eod:')) && !key.includes(todayKey)) remindedKeys.delete(key);
  }
  if (remindedKeys.size > 3000) {
    const keep = Array.from(remindedKeys).slice(-1500);
    remindedKeys.clear();
    keep.forEach((key) => remindedKeys.add(key));
  }
}

function startReminderLoop() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(checkReminders, 15_000);
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  startReminderLoop();
  checkReminders();

  app.on('activate', showMainWindow);
});

app.on('second-instance', () => showMainWindow());
app.on('before-quit', () => {
  isQuitting = true;
  if (prefsWriteTimer) clearTimeout(prefsWriteTimer);
  if (Object.keys(pendingPrefsPatch).length) writePrefs(pendingPrefsPatch);
});
app.on('window-all-closed', () => {
  // Windows 下保留托盘后台运行，确保提醒不因关闭主窗口而失效。
  if (process.platform === 'darwin') app.quit();
});

ipcMain.handle('state:get', () => readState());
ipcMain.handle('state:set', (_event, data) => writeState(data));
ipcMain.handle('notification:show', (_event, title, body, payload) => showNativeNotification(title, body, payload));
ipcMain.handle('reminders:update', (_event, schedule) => {
  if (schedule && typeof schedule === 'object' && ('tasksByDate' in schedule || 'countdowns' in schedule)) {
    reminderSchedule = { tasksByDate: schedule.tasksByDate || {}, countdowns: Array.isArray(schedule.countdowns) ? schedule.countdowns : [], soundMode: schedule.soundMode === 'custom' ? 'custom' : 'default' };
  } else {
    reminderSchedule = { tasksByDate: schedule && typeof schedule === 'object' ? schedule : {}, countdowns: [], soundMode: 'default' };
  }
  checkReminders();
  return true;
});

ipcMain.handle('window:set-calendar-mode', (_event, enabled) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (enabled) {
    if (!preCalendarBounds) preCalendarBounds = mainWindow.getBounds();
    const current = mainWindow.getBounds();
    const work = screen.getDisplayMatching(current).workArea;
    const width = Math.min(900, work.width);
    const height = Math.min(820, work.height);
    mainWindow.setMinimumSize(Math.min(760, work.width), Math.min(650, work.height));
    const x = Math.max(work.x, Math.min(current.x, work.x + work.width - width));
    const y = Math.max(work.y, Math.min(current.y, work.y + work.height - height));
    mainWindow.setBounds({ x, y, width, height }, true);
  } else {
    mainWindow.setMinimumSize(430, 720);
    if (preCalendarBounds) {
      const target = clampBounds(preCalendarBounds, { width: 440, height: 740 });
      preCalendarBounds = null;
      mainWindow.setBounds(target, true);
    }
  }
  return true;
});

function customSoundPrefs() {
  const prefs = readPrefs();
  const file = prefs.customSoundFile ? userFile(prefs.customSoundFile) : null;
  return { prefs, file };
}

ipcMain.handle('sound:choose', async () => {
  const result = await dialog.showOpenDialog(mainWindow || undefined, {
    title: '选择提醒铃声', properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'ogg'] }],
  });
  if (result.canceled || !result.filePaths?.[0]) return { ok: false };
  const src = result.filePaths[0];
  const stat = fs.statSync(src);
  if (stat.size > 20 * 1024 * 1024) return { ok: false, error: '铃声文件不能超过20MB' };
  const ext = path.extname(src).toLowerCase();
  if (!['.mp3', '.wav', '.m4a', '.ogg'].includes(ext)) return { ok: false, error: '不支持的音频格式' };
  const old = customSoundPrefs();
  if (old.file) { try { fs.unlinkSync(old.file); } catch {} }
  const fileName = `custom-reminder-sound${ext}`;
  const dest = userFile(fileName);
  fs.copyFileSync(src, dest);
  const name = path.basename(src);
  writePrefs({ customSoundFile: fileName, customSoundName: name });
  return { ok: true, name };
});

ipcMain.handle('sound:get-data-url', () => {
  try {
    const { prefs, file } = customSoundPrefs();
    if (!file || !fs.existsSync(file)) return { ok: false };
    const ext = path.extname(file).toLowerCase();
    const mime = ext === '.mp3' ? 'audio/mpeg' : ext === '.wav' ? 'audio/wav' : ext === '.m4a' ? 'audio/mp4' : 'audio/ogg';
    const buf = fs.readFileSync(file);
    return { ok: true, name: prefs.customSoundName || path.basename(file), dataUrl: `data:${mime};base64,${buf.toString('base64')}` };
  } catch { return { ok: false }; }
});

ipcMain.handle('sound:clear', () => {
  const { file } = customSoundPrefs();
  if (file) { try { fs.unlinkSync(file); } catch {} }
  writePrefs({ customSoundFile: null, customSoundName: null });
  return true;
});

ipcMain.handle('window:set-always-on-top', (event, value) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return false;
  const pinned = Boolean(value);
  win.setAlwaysOnTop(pinned, 'floating');
  if (win === floatWindow) {
    win.setVisibleOnAllWorkspaces(pinned, { visibleOnFullScreen: pinned });
    writePrefs({ floatPinned: pinned });
  }
  return true;
});

ipcMain.handle('window:set-opacity', (event, value) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return false;
  const opacity = Math.max(0.3, Math.min(1, Number(value) || 1));
  win.setOpacity(opacity);
  if (win === floatWindow) writePrefs({ floatOpacity: opacity });
  return true;
});

ipcMain.handle('float:open', (_event, snapshot) => {
  lastFloatSnapshot = snapshot || lastFloatSnapshot;
  createFloatWindow();
  return true;
});

ipcMain.handle('float:update', (_event, snapshot) => {
  lastFloatSnapshot = snapshot;
  if (floatWindow && !floatWindow.isDestroyed() && !floatWindow.webContents.isDestroyed()) {
    floatWindow.webContents.send('float:snapshot', snapshot);
  }
  return true;
});

ipcMain.handle('float:close', () => {
  if (floatWindow && !floatWindow.isDestroyed()) floatWindow.close();
  return true;
});

ipcMain.on('float:action', (_event, action) => {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send('float:action', action);
  }
});
