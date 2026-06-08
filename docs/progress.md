# 进度日志

## 2026-06-01
- 创建项目，HTML 单文件待办
- 迭代为 Trello 看板（待开始 / 今天完成）
- 加入置顶、编辑、搜索、暗色模式、日历归档
- localStorage → SQLite 迁移
- 内嵌 Python + pywebview 原生桌面窗口
- 模块化拆分（db.py / api_tasks.py / app.py）
- Excel 导出 + 批量导入
- 主题弹窗替换原生 alert/confirm
- 完成列美化（成就徽章、进度条、绿色卡片）
- 系统托盘常驻（pystray）
- 键盘快捷键（Ctrl+N/F/E、Esc）

## 2026-06-02
- **前端模块化拆分**
  - 待办看板.html（865 行）→ 拆为 7 个独立文件
  - CSS → static/css/style.css（~380 行）
  - JS → static/js/（6 模块：api.js / modal.js / app.js / drag.js / calendar.js / batch.js）
  - HTML → index.html（100 行，纯骨架）
  - 改 app.py 指向 index.html
- **Apple 风格动画**
  - 卡片入场：fadeInUp + stagger 延迟（45ms 间隔）
  - 卡片退场：fadeOutDown（标记完成/删除/清除时）
  - 弹窗：opacity + scale spring 过渡
  - 按钮：:active scale(0.96) 点击反馈
  - 拖拽增强：旋转+放大+阴影
- **批量删除模块**（新建 batch.js）
  - 顶部 ☑ 批量按钮切换批量模式
  - 卡片左侧圆形复选框，点击卡片勾选
  - 底部浮动栏显示已选数量 + 删除选中按钮
- **系统托盘图标** → 双栏看板（左橙右绿，PIL 绘制）
- **任务栏窗口图标** → 与托盘一致（生成 icon.ico + Win32 API 注入）

## 2026-06-07
- **信息板（笔记模块）** 整合到主应用
  - Tab 切换：看板 ↔ 记录，共用同一窗口
  - 笔记 CRUD（标题、内容、分类标签）
  - 分类标签：新建、重命名、删除、筛选
  - 搜索：Ctrl+K 聚焦，支持标题+内容模糊搜索
  - 置顶、展开/收起预览
- **编辑器 Notepad 风格**
  - 字体 Consolas 15px，纯黑 #000，纯白背景 #fff
  - border-radius: 0，紧凑间距，line-height: 1.5
- **系统托盘优化**
  - 托盘在 on_shown 创建（启动即有）
  - pystray 右键菜单：显示窗口 / 退出
  - 关闭窗口隐藏到托盘
- **记录导出**：JSON 格式，存 data/ 目录，弹窗提示路径
- **记录批量删除**：独立批量模式（notesBatchMode），不影响看板
  - 齿轮菜单 → 批量删除 → 勾选条目 → 确认删除
  - 批量栏：全选 / 取消 / 删除选中
- **排序规则**：每次修改自动置前，置顶始终最前
- **齿轮菜单上下文切换**：看板 tab → 看板功能，记录 tab → 记录功能
  - 看板：导出待办 / 导入待办 / 批量删除 / 清空今天完成
  - 记录：导出记录 / 批量删除
- **FAB 新建按钮**：移至 cat-row 右侧，保留蓝底白字圆形醒目风格

## 当前状态
- 所有功能完成并测试通过
- 项目路径：D:\桌面文件\todo-appv2\
- 启动方式：python backend\app.py
- 数据库：data/todo.db + data/notes.db
- 前端模块：board 6 个 JS + notes 3 个 JS
