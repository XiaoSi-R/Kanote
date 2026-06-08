# 研究发现

## 架构
- embedded Python ~40MB，不依赖系统 Python
- pywebview 在 Win11 内置 WebView2，Win10 需额外装
- SQLite 单文件 0 配置，适合单机应用
- pystray 实现系统托盘，关窗不退出

## API 设计
- 所有操作走 REST API，前端纯 JS 调用
- 批量导入用 /api/tasks/bulk，覆盖/合并两种模式
- 导出生成为文件存 data/ 目录，弹窗提示路径

## 模块拆分
- db.py：数据库连接、初始化（tasks + notes 双库）
- api_tasks.py：任务 CRUD + 导出导入 + 批量操作
- api_notes.py：笔记 CRUD + 导出 + 批量删除
- app.py：主入口（Flask + pywebview + 托盘）
- tray.py：Win32 托盘实验（未采用，保留参考）

### 前端（board/）
- index.html：主页面骨架 + Tab 切换 + 齿轮菜单
- static/css/style.css：看板样式 + 暗色模式
- static/js/api.js / modal.js / app.js / drag.js / calendar.js / batch.js

### 前端（notes/）
- index.html：独立信息板页面
- css/notes.css：笔记编辑器样式
- js/api.js / editor.js / app.js

## 已知限制
- pywebview 不支持原生文件下载对话框，改为本地存储
- pystray 需要 Pillow 生成图标
- pystray 在 Windows 上不支持左键单击事件（默认弹菜单）
- Win10 需安装 WebView2 Runtime
