"""最小化 Win32 托盘：左键单击恢复窗口，右键弹出菜单"""
import os
import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32
shell32 = ctypes.windll.shell32


def run_tray(window_ref, icon_path, title='Kanote'):
    """启动托盘（阻塞线程）"""
    WM_TRAY = 0x8001
    WM_LBUTTONUP = 0x0202
    WM_RBUTTONUP = 0x0205

    # == 最小化 NOTIFYICONDATA（仅 v1 的 7 个字段）==
    class NID(ctypes.Structure):
        _fields_ = [
            ('cbSize', wintypes.DWORD),
            ('hWnd', wintypes.HWND),
            ('uID', wintypes.UINT),
            ('uFlags', wintypes.UINT),
            ('uCallbackMessage', wintypes.UINT),
            ('hIcon', wintypes.HICON),
            ('szTip', wintypes.WCHAR * 128),
        ]

    def _show():
        w = window_ref[0]
        if w is None:
            return
        try:
            w.show()
        except Exception:
            pass
        hwnd = user32.FindWindowW(None, title)
        if hwnd:
            user32.ShowWindow(hwnd, 9)   # SW_RESTORE
            user32.SetForegroundWindow(hwnd)

    def _popup():
        hmenu = user32.CreatePopupMenu()
        user32.AppendMenuW(hmenu, 0x0000, 1, '显示窗口')  # MF_STRING
        user32.AppendMenuW(hmenu, 0x0800, 0, None)        # MF_SEPARATOR
        user32.AppendMenuW(hmenu, 0x0000, 2, '退出')
        pt = wintypes.POINT()
        user32.GetCursorPos(ctypes.byref(pt))
        user32.SetForegroundWindow(hwnd)
        cmd = user32.TrackPopupMenu(hmenu, 0x0100, pt.x, pt.y, 0, hwnd, None)
        user32.PostMessageW(hwnd, 0, 0, 0)
        user32.DestroyMenu(hmenu)
        if cmd == 1:
            _show()
        elif cmd == 2:
            _quit()

    def _quit():
        nid = NID()
        nid.cbSize = ctypes.sizeof(nid)
        nid.hWnd = hwnd
        nid.uID = 1
        shell32.Shell_NotifyIconW(2, ctypes.byref(nid))  # NIM_DELETE
        user32.DestroyWindow(hwnd)
        w = window_ref[0]
        if w:
            try: w.destroy()
            except: pass
        os._exit(0)

    # == 窗口过程 ==
    WNDPROC = ctypes.WINFUNCTYPE(
        wintypes.LRESULT, wintypes.HWND, wintypes.UINT,
        wintypes.WPARAM, wintypes.LPARAM)

    @WNDPROC
    def wndproc(hwnd, msg, wparam, lparam):
        if msg == WM_TRAY:
            if lparam == WM_LBUTTONUP:
                _show()
            elif lparam == WM_RBUTTONUP:
                _popup()
        elif msg == 2:  # WM_DESTROY
            user32.PostQuitMessage(0)
        return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

    # == 注册窗口 ==
    wc = wintypes.WNDCLASSW()
    wc.lpfnWndProc = wndproc
    wc.hInstance = ctypes.windll.kernel32.GetModuleHandleW(None)
    wc.lpszClassName = 'TrayWndClass'

    user32.RegisterClassW(ctypes.byref(wc))

    hwnd = user32.CreateWindowExW(0, 'TrayWndClass', '', 0, 0, 0, 0, 0,
                                    None, None, wc.hInstance, None)

    # == 加载图标 ==
    if os.path.exists(icon_path):
        hicon = user32.LoadImageW(0, icon_path, 1, 16, 16, 0x10)
    else:
        hicon = user32.LoadIconW(0, 32516)

    # == 添加托盘图标 ==
    nid = NID()
    nid.cbSize = ctypes.sizeof(nid)
    nid.hWnd = hwnd
    nid.uID = 1
    nid.uFlags = 7  # NIF_MESSAGE | NIF_ICON | NIF_TIP
    nid.uCallbackMessage = WM_TRAY
    nid.hIcon = hicon
    nid.szTip = title
    shell32.Shell_NotifyIconW(0, ctypes.byref(nid))  # NIM_ADD

    # == 消息循环 ==
    msg = wintypes.MSG()
    while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
        user32.TranslateMessage(ctypes.byref(msg))
        user32.DispatchMessageW(ctypes.byref(msg))
