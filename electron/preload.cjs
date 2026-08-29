const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('desktopAPI', {
  state: {
    get: () => ipcRenderer.invoke('state:get'),
    set: (data) => ipcRenderer.invoke('state:set', data),
  },
  notify: (title, body, payload) => ipcRenderer.invoke('notification:show', title, body, payload),
  reminders: {
    update: (schedule) => ipcRenderer.invoke('reminders:update', schedule),
    onEvent: (callback) => subscribe('reminder:event', callback),
  },
  notifications: {
    onClick: (callback) => subscribe('notification:clicked', callback),
  },
  setAlwaysOnTop: (value) => ipcRenderer.invoke('window:set-always-on-top', value),
  setWindowOpacity: (value) => ipcRenderer.invoke('window:set-opacity', value),
  onWindowAppearance: (callback) => subscribe('window:appearance', callback),
  float: {
    open: (snapshot) => ipcRenderer.invoke('float:open', snapshot),
    update: (snapshot) => ipcRenderer.invoke('float:update', snapshot),
    close: () => ipcRenderer.invoke('float:close'),
    sendAction: (action) => ipcRenderer.send('float:action', action),
    onSnapshot: (callback) => subscribe('float:snapshot', callback),
    onAction: (callback) => subscribe('float:action', callback),
  },
  isElectron: true,
});
