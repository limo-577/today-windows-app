# 今日 · Today Windows App

一款简洁、轻量、以本地数据为核心的 Windows 桌面任务与专注工具。

## v1.7.0

### ✨ 本版本

v1.7.0 在原有任务管理、专注计时和悬浮窗口功能的基础上，新增应用密码锁和完整数据备份与恢复功能，进一步加强应用的数据保护能力和数据迁移便利性。

### 主要功能

* 📋 本地任务管理
* ⏱️ 专注计时
* 🪟 桌面悬浮窗口
* 🔔 任务提醒
* ▶️ 支持暂停和继续专注任务
* 🔒 应用密码锁，支持设置、修改和移除密码
* 🔐 支持手动锁定及 Windows 锁屏、睡眠等场景下的自动锁定
* 📦 支持导出完整数据备份，并从备份文件恢复
* 💾 本地保存任务及应用设置
* 🎨 支持浅色 / 深色界面
* 🖥️ Windows 桌面应用
* 🔑 不需要登录账号
* 🌐 不依赖在线服务使用核心功能

### 数据与隐私

本应用主要用于本地任务管理和个人专注。

应用数据及设置保存在本机 Electron 用户数据目录中。

本项目不要求用户注册账号，也不需要通过服务器保存个人任务数据。

启用密码锁后，应用会要求验证密码才能进入受保护的使用状态。密码通过加盐哈希方式处理，不直接保存明文密码。

应用支持将数据导出为 `.todaybackup` 备份文件，并在需要时导入恢复。

**注意：导入备份会覆盖当前数据。恢复前请先备份现有数据，避免丢失重要内容。**

## Windows 版本

v1.7.0 提供两种 Windows 版本：

### 安装版

适合正常安装到 Windows 系统中使用。

```text
Today-Setup-1.7.0-x64.exe
```

### Portable 便携版

无需传统安装流程，可以直接运行。

```text
Today-Portable-1.7.0-x64.exe
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

应用核心功能不需要远程服务器，也不需要用户提供在线账号密码。

应用密码锁用于限制对应用数据的访问；它不等同于对整个备份文件进行加密。请妥善保管导出的备份文件。

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

**v1.7.0**

---

本项目为本地 Windows 桌面任务与专注工具。