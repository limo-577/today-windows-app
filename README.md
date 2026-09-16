# 今日 · Today Windows App

一款简洁、轻量、以本地数据为核心的 Windows 桌面任务与专注工具。

## v1.6.0

### ✨ 本版本

v1.6.0 在原有任务管理、专注计时和悬浮窗口功能的基础上，对主界面、任务管理以及悬浮窗口进行了进一步调整和优化。

### 主要功能

* 📋 本地任务管理
* ⏱️ 专注计时
* 🪟 桌面悬浮窗口
* 🔔 任务提醒
* ▶️ 支持暂停和继续专注任务
* 💾 本地保存任务及应用设置
* 🎨 支持浅色 / 深色界面
* 🖥️ Windows 桌面应用
* 🔒 不需要登录账号
* 🌐 不依赖在线服务使用核心功能

### 数据与隐私

本应用主要用于本地任务管理和个人专注。

应用数据及设置保存在本机 Electron 用户数据目录中。

本项目不要求用户注册账号，也不需要通过服务器保存个人任务数据。

## Windows 版本

v1.6.0 提供两种 Windows 版本：

### 安装版

适合正常安装到 Windows 系统中使用。

```text
Today-Setup-1.6.0-x64.exe
```

### Portable 便携版

无需传统安装流程，可以直接运行。

```text
Today-Portable-1.6.0-x64.exe
```

## 系统要求

* Windows 10 / Windows 11
* x64

## 技术栈

* Electron
* React
* Vite
* JavaScript
* electron-builder

## 项目结构

```text
today-windows-app/
├─ build/
├─ electron/
│  ├─ main.cjs
│  └─ preload.cjs
├─ src/
│  ├─ TodayApp.jsx
│  ├─ FloatWindow.jsx
│  ├─ main.jsx
│  └─ styles.css
├─ .github/
│  └─ workflows/
│     └─ release.yml
├─ package.json
├─ package-lock.json
└─ README.md
```

## 安全相关

Electron 主窗口使用：

```text
contextIsolation: true
nodeIntegration: false
sandbox: true
```

应用核心功能不需要远程服务器，也不需要用户提供账号密码。

## 开发

安装依赖：

```powershell
npm install
```

启动开发环境：

```powershell
npm run dev
```

## 构建

构建 Windows 安装版：

```powershell
npm run build
```

构建 Windows Portable：

```powershell
npm run build:portable
```

也可以直接使用 electron-builder：

```powershell
npx electron-builder --win
```

或者：

```powershell
npx electron-builder --win portable
```

## 版本

当前版本：

**v1.6.0**

---

本项目为本地 Windows 桌面任务与专注工具。
