# 任务计划

## 目标
单机版待办事项工具：免安装、原生桌面窗口、SQLite 数据库、系统托盘常驻。

## 阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| 1 | 基础待办：添加、完成、删除 | complete |
| 2 | Trello 看板布局 | complete |
| 3 | 数据持久化：localStorage → SQLite | complete |
| 4 | 导出：Excel | complete |
| 5 | 内嵌 Python + pywebview 原生窗口 | complete |
| 6 | 模块化拆分（db / api / 前端） | complete |
| 7 | 置顶、编辑、搜索、暗色模式、日历归档 | complete |
| 8 | 主题弹窗（替换原生 alert/confirm） | complete |
| 9 | 完成列美化（成就徽章、进度条） | complete |
| 10 | 系统托盘常驻 | complete |
| 11 | 键盘快捷键 | complete |
| 12 | 信息板（笔记模块）| complete |
| 13 | 记录编辑器、分类标签、搜索 | complete |
| 14 | 记录导出（JSON）| complete |
| 15 | 记录批量删除 | complete |
| 16 | 修改自动置前排序、置顶优先 | complete |
| 17 | 齿轮菜单上下文切换（看板/记录）| complete |
| 18 | FAB 按钮移至标签行 | complete |

## 技术方案
- 后端：Python 嵌入式 + Flask + SQLite
- 前端：HTML + CSS + JS（pywebview 原生窗口）
- 数据库：SQLite（data/todo.db + data/notes.db）
- 托盘：pystray（关窗不退出）
- 免安装，文件夹拷走即用

## 快捷键
| 快捷键 | 功能 |
|--------|------|
| Ctrl+N | 新建任务 |
| Ctrl+F | 搜索 |
| Ctrl+E | 导出 |
| Esc | 清空搜索 |
| Ctrl+K | 信息板搜索 |

## 错误记录
| 错误 | 原因 | 解决 |
|------|------|------|
| flaskwebgui SyntaxError | Python 3.10 不兼容 | 换 pywebview |
| WAL 模式数据不落盘 | 多连接未同步 | 改普通 journal 模式 |
| 导入丢失字段 | 未传递完整数据 | 新增 bulk API |
| 导出文件不知存哪 | pywebview 无下载对话框 | 改存本地 data/ 目录 |
