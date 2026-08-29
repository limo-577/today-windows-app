# Today Windows App v1.3.3

# 今日 v1.3 - Windows 本地任务与专注工具

基于原始 Today.jsx 改造成 Electron Windows 桌面应用。

## 主要能力
- 本地任务与日历
- 批量添加、重复任务模板
- 专注计时与 CSV 记录导出
- 真正独立的悬浮窗口
- Windows 原生到点通知
- 22:00 未完成任务提醒
- 系统托盘后台运行
- 可选开机自动启动
- 主窗口/悬浮窗位置与状态记忆
- 本机 JSON 持久化与备份恢复

## 运行
1. 安装 Node.js LTS。
2. 双击 `run-dev.bat` 进行开发运行。

## 打包
双击 `build-windows.bat`。
完成后在 `release` 文件夹获得：
- NSIS 安装版
- Portable 免安装版

需要稳定使用 Windows 系统通知时，更推荐 NSIS 安装版。

## 关闭行为
点击主窗口右上角关闭按钮后，程序会隐藏到 Windows 系统托盘，以便继续后台提醒。
真正退出：右键系统托盘中的“今日”图标 -> 退出。

## 数据位置
数据保存在 Electron 的 Windows userData 目录中：
- `today-state.json`：任务和记录
- `today-state.json.bak`：上一版数据备份
- `desktop-prefs.json`：窗口位置、悬浮窗设置等

所有业务数据均保存在本机，应用运行逻辑不需要联网。

详细改动见 `优化说明-v1.3.txt`。


## v1.3.3 Resumable task timers
- One task runs at a time.
- Starting another task automatically pauses the current task.
- Paused tasks remember their remaining countdown.
- Resume any paused task later from the same point.
- Per-task cumulative focus time is shown in both the main and floating windows.
- Each pause/switch is stored as a separate session record.
