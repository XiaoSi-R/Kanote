"""数据库层：连接、初始化"""
import sqlite3
import os
import sys


def _data_dir():
    """数据目录：打包后用 AppData，开发时用项目目录"""
    if getattr(sys, 'frozen', False):
        # 打包后：%APPDATA%\Kanote\data（Windows 标准做法，不污染桌面）
        appdata = os.path.join(os.getenv('APPDATA', ''), 'Kanote', 'data')
        os.makedirs(appdata, exist_ok=True)
        return appdata
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')


DB_DIR = _data_dir()
DB_PATH = os.path.join(DB_DIR, 'todo.db')

# notes 数据库同目录
_NOTES_PATH = os.path.join(DB_DIR, 'notes.db')


def get_conn():
    """获取 tasks 数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_notes_conn():
    """获取 notes 数据库连接"""
    conn = sqlite3.connect(_NOTES_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """初始化数据库表"""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo',
        pinned INTEGER DEFAULT 0,
        created_date TEXT,
        done_date TEXT,
        time TEXT,
        sort_order REAL
    )''')
    conn.commit()
    conn.close()

    # notes 数据库
    conn2 = sqlite3.connect(_NOTES_PATH)
    conn2.execute('''CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        cat TEXT DEFAULT '',
        pinned INTEGER DEFAULT 0,
        sort_order REAL,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
    )''')
    conn2.commit()
    conn2.close()
