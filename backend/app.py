"""主入口：Flask + pywebview + 系统托盘"""
import sys
import os
import threading

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

# PyInstaller 打包后路径适配
if getattr(sys, 'frozen', False):
    _BASE_DIR = sys._MEIPASS                         # 前端文件在临时解压目录
    ROOT_DIR = os.path.dirname(sys.executable)        # 数据目录在 exe 同级
else:
    _BASE_DIR = os.path.dirname(PROJECT_DIR)
    ROOT_DIR = _BASE_DIR

if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

from flask import Flask, send_from_directory, jsonify, request
from db import init_db
from api_tasks import api as tasks_api
from api_notes import api as notes_api

app = Flask(__name__, static_folder=None)
app.register_blueprint(tasks_api)
app.register_blueprint(notes_api)

# 前端路径（开发时用项目目录，打包后用 MEIPASS）
_BOARD_DIR = os.path.join(_BASE_DIR, 'frontend', 'board')
_NOTES_DIR = os.path.join(_BASE_DIR, 'frontend', 'notes')


def _no_cache(resp):
    resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return resp


@app.route('/')
def index():
    resp = send_from_directory(_BOARD_DIR, 'index.html')
    return _no_cache(resp)


@app.route('/static/<path:path>')
def static_files(path):
    resp = send_from_directory(os.path.join(_BOARD_DIR), path)
    return _no_cache(resp)


# ===== 笔记应用前端 =====
@app.route('/notes')
def notes_index():
    resp = send_from_directory(_NOTES_DIR, 'index.html')
    return _no_cache(resp)


@app.route('/notes/<path:path>')
def notes_static(path):
    resp = send_from_directory(_NOTES_DIR, path)
    return _no_cache(resp)


# ===== 小窗模式：窗口缩放 =====
@app.route('/api/window/mini', methods=['POST'])
def toggle_mini():
    """小窗→右侧 440×680 / 全窗口→居中 1200×800"""
    import ctypes
    data = request.get_json()
    mode = data.get('mode', 'mini')

    hwnd = ctypes.windll.user32.FindWindowW(None, 'Kanote')
    if not hwnd:
        return jsonify({'ok': False, 'hwnd': 0})

    # 获取工作区（不含任务栏）
    class RECT(ctypes.Structure):
        _fields_ = [('left', ctypes.c_long), ('top', ctypes.c_long),
                    ('right', ctypes.c_long), ('bottom', ctypes.c_long)]
    work = RECT()
    ctypes.windll.user32.SystemParametersInfoW(0x30, 0, ctypes.byref(work), 0)
    ww = work.right - work.left
    wh = work.bottom - work.top

    if mode == 'mini':
        w, h = 440, 680
        x = work.left + ww - w - 20
        y = work.top + 40
    else:
        w, h = 1200, 800
        x = work.left + (ww - w) // 2
        y = work.top + (wh - h) // 2

    # ShowWindow 先恢复，再 SetWindowPos 调整大小位置
    ctypes.windll.user32.ShowWindow(hwnd, 9)  # SW_RESTORE
    ctypes.windll.user32.SetWindowPos(hwnd, 0, x, y, w, h, 0x0004)
    return jsonify({'ok': True})


# ========== 系统托盘 ==========
def create_tray_image():
    """托盘图标：从预生成的 PNG 加载 32px"""
    from PIL import Image
    png = os.path.join(_BASE_DIR, 'opendesign', 'kanote.png')
    if os.path.exists(png):
        img = Image.open(png)
        return img.resize((32, 32), Image.LANCZOS)
    return _draw_kanban_icon(32)


def _draw_kanban_icon(size):
    """托盘图标：用预渲染的 32px PNG"""
    from PIL import Image
    png = os.path.join(_BASE_DIR, 'opendesign', 'icons', f'icon_{size}.png')
    if os.path.exists(png):
        return Image.open(png)
    png = os.path.join(_BASE_DIR, 'opendesign', 'kanote.png')
    if os.path.exists(png):
        return Image.open(png).resize((size, size), Image.LANCZOS)
    # fallback
    from PIL import ImageDraw
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = max(1, size * 15 // 64)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(99, 102, 241, 255))
    return img


def set_taskbar_icon():
    """通过 Win32 API 设置任务栏图标（直接从 _MEIPASS 加载，不落盘）"""
    import ctypes
    import time
    time.sleep(0.5)  # 等窗口完全创建

    ico_path = os.path.join(_BASE_DIR, 'opendesign', 'kanote.ico')
    if not os.path.exists(ico_path):
        return

    hwnd = ctypes.windll.user32.FindWindowW(None, 'Kanote')
    if not hwnd:
        return

    # IMAGE_ICON=1, LR_LOADFROMFILE=0x10
    h_small = ctypes.windll.user32.LoadImageW(0, ico_path, 1, 16, 16, 0x10)
    h_large = ctypes.windll.user32.LoadImageW(0, ico_path, 1, 32, 32, 0x10)
    # WM_SETICON=0x80, ICON_SMALL=0, ICON_BIG=1
    if h_small:
        ctypes.windll.user32.SendMessageW(hwnd, 0x80, 0, h_small)
    if h_large:
        ctypes.windll.user32.SendMessageW(hwnd, 0x80, 1, h_large)


def setup_tray(window_ref):
    """系统托盘"""
    import pystray
    import ctypes

    def show_window(icon=None, item=None):
        w = window_ref[0]
        if w:
            w.show()
            hwnd = ctypes.windll.user32.FindWindowW(None, 'Kanote')
            if hwnd:
                ctypes.windll.user32.ShowWindow(hwnd, 9)
                ctypes.windll.user32.SetForegroundWindow(hwnd)

    def exit_app(icon, item):
        icon.stop()
        w = window_ref[0]
        if w:
            try: w.destroy()
            except: pass
        os._exit(0)

    menu = pystray.Menu(
        pystray.MenuItem('显示窗口', show_window, default=True),
        pystray.MenuItem('退出', exit_app),
    )
    icon = pystray.Icon('todo_app', create_tray_image(), 'Kanote', menu)
    icon.run()


if __name__ == '__main__':
    # ===== 单实例检测（仅 ctypes，无需 pywin32）=====
    import ctypes
    kernel32 = ctypes.windll.kernel32

    _mutex_name = 'Global\\Kanote_SingleInstance'
    _mutex = kernel32.CreateMutexW(None, False, _mutex_name)
    if kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
        hwnd = ctypes.windll.user32.FindWindowW(None, 'Kanote')
        if hwnd:
            ctypes.windll.user32.ShowWindow(hwnd, 9)          # SW_RESTORE
            ctypes.windll.user32.SetForegroundWindow(hwnd)
        sys.exit(0)

    init_db()
    import webview

    def start_flask():
        app.run(port=56789, debug=False, use_reloader=False)

    t = threading.Thread(target=start_flask, daemon=True)
    t.start()

    window = webview.create_window('Kanote', 'http://127.0.0.1:56789',
                                   width=1200, height=800, confirm_close=True)
    window_ref = [window]

    def on_closing():
        window.hide()
        return False

    def on_shown():
        threading.Thread(target=set_taskbar_icon, daemon=True).start()
        # 启动时创建托盘图标，确保最小化后也能通过托盘恢复
        threading.Thread(target=setup_tray, args=(window_ref,), daemon=True).start()

    window.events.closing += on_closing
    window.events.shown += on_shown
    webview.start()
