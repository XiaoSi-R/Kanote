# Kanote 看板笔记

本地优先的轻量效率工具，看板 + 笔记，数据完全由你掌控。

## 功能

- **看板管理** — 待开始 / 已完成，拖拽排序，批量导入导出
- **笔记记录** — 分类管理，Markdown 编辑
- **小窗模式** — 双击标题栏缩为右侧 440×680 小窗，双击「待开始」恢复
- **系统托盘** — 关闭即最小化，托盘右键恢复/退出
- **备份恢复** — 看板和笔记独立 JSON 备份，一键导出导入
- **单实例** — 重复启动自动唤醒已有窗口

## 技术栈

Python + Flask + pywebview + SQLite

## 快速开始

```bash
pip install -r requirements.txt
python backend/dev.py
```

## 打包

```bash
pyinstaller Kanote.spec
```

## 数据存储

- 数据库：`%APPDATA%\Kanote\data\`
- 备份：exe 同级 `backup/` 目录

## 协议

MIT License
