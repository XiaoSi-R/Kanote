# Kanote — 项目参考文档

## 目录结构

```
todo-app/
├── 启动.bat                     # 启动入口（最外层）
├── backend/                     # 后端（Flask 蓝图 + 数据库层）
│   ├── app.py                   # 主入口：Flask + pywebview + 托盘
│   ├── db.py                    # 数据库初始化 & 连接管理
│   ├── api_tasks.py             # 看板 API 蓝图（/api/...）
│   └── api_notes.py             # 记录 API 蓝图（/api/notes/...）
├── frontend/                    # 前端（分模块）
│   ├── board/                   # 看板模块
│   │   ├── index.html           # 集成页面（看板 + 记录 Tab）
│   │   ├── css/style.css        # 看板样式
│   │   └── js/
│   │       ├── api.js           # API 请求封装
│   │       ├── app.js           # 看板主逻辑
│   │       ├── modal.js         # 弹窗组件
│   │       ├── batch.js         # 批量操作
│   │       ├── calendar.js      # 日期选择器
│   │       └── drag.js          # 拖拽（已禁用）
│   └── notes/                   # 记录模块
│       ├── index.html           # 独立页面
│       ├── css/notes.css        # 记录样式
│       └── js/
│           ├── api.js           # API 请求封装
│           ├── app.js           # 记录主逻辑（App IIFE）
│           └── editor.js        # 全屏编辑器（Editor IIFE）
├── data/                        # 数据库文件
│   ├── todo.db                  # 看板数据（tasks 表）
│   └── notes.db                 # 记录数据（notes 表）
├── docs/                        # 项目文档
│   ├── project-ref.md           # 本文档
│   ├── task_plan.md             # 任务规划
│   ├── progress.md              # 进度记录
│   └── findings.md              # 代码审查发现
├── assets/                      # 静态资源
│   ├── icon.ico                 # 应用图标
│   ├── icon_512.png             # 图标源文件
│   └── ...
└── python/                      # 嵌入式 Python 运行时
```

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面容器 | pywebview（WebView2 引擎） |
| 后端框架 | Flask + Blueprint |
| 数据库 | SQLite（两个独立 .db 文件） |
| 前端 | 原生 JS（IIFE 模块模式）+ CSS 变量 |
| 托盘 | pystray + PIL |
| 打包 | 嵌入式 Python + bat 启动 |

## Flask 路由

| 路由 | 用途 | 指向 |
|------|------|------|
| `/` | 看板主页 | `frontend/board/index.html` |
| `/static/<path>` | 看板静态资源 | `frontend/board/` |
| `/notes` | 记录独立页 | `frontend/notes/index.html` |
| `/notes/<path>` | 记录静态资源 | `frontend/notes/` |
| `/api/...` | 看板 API | `api_tasks.py` 蓝图 |
| `/api/notes/...` | 记录 API | `api_notes.py` 蓝图 |

## API 端点

### 看板（/api）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tasks | 获取全部任务 |
| POST | /api/tasks | 新增任务 |
| PUT | /api/tasks/<id> | 更新任务 |
| DELETE | /api/tasks/<id> | 删除单条 |
| DELETE | /api/tasks/done/<date> | 清空当天完成 |
| GET | /api/export/xlsx | 导出 Excel |
| POST | /api/import/xlsx | 导入 Excel |

### 记录（/api/notes）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/notes | 获取全部笔记 |
| POST | /api/notes | 新增笔记 |
| PUT | /api/notes/<id> | 更新笔记 |
| DELETE | /api/notes/<id> | 删除笔记 |

## 前端模块说明

### 看板看板（board）

- **api.js** — `apiAdd()`, `apiUpdate()`, `apiDelete()`, `apiClearDone()` 等全局函数
- **app.js** — `init()`, `renderAll()`, `quickAdd()`, 日期导航、主题切换等核心逻辑
- **modal.js** — `showAlert()`, `showConfirm()` Promise 弹窗
- **batch.js** — `batchMode`, `toggleBatchMode()`, `toggleSelectAll()`, `batchDelete()`
- **calendar.js** — 日期弹出选择器

模块间依赖：全局函数调用，无模块化导入。JS 加载顺序决定依赖关系。

### 记录模块（notes）

采用 IIFE 模块模式：
- **App** — `App.addNote()`, `App.renderList()` 等，数据与 DOM 双向同步
- **Editor** — `Editor.open()`, `Editor.save()`, `Editor.close()` 等全屏编辑流程
- **API** — `API.list()`, `API.save()`, `API.update()`, `API.remove()` 封装 fetch

加载顺序：api.js → editor.js → app.js

## 数据库表结构

```sql
-- tasks（看板）
tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  status TEXT DEFAULT 'todo',    -- 'todo' | 'done'
  pinned INTEGER DEFAULT 0,
  created_date TEXT,
  done_date TEXT,
  time TEXT,
  sort_order REAL
)

-- notes（记录）
notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  cat TEXT DEFAULT '',           -- 分类标签
  pinned INTEGER DEFAULT 0,
  sort_order REAL,
  created_at TEXT,
  updated_at TEXT
)
```

## 端口

| 服务 | 端口 |
|------|------|
| Flask | 56789 |
| pywebview | HTTP 127.0.0.1:56789 |

## 主题

通过 `body.dark` 类 + CSS 变量实现暗色切换，状态持久化到 `localStorage.kanban_theme`。
