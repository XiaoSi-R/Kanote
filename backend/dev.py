"""开发模式：仅启动 Flask（无 pywebview），支持热重载"""
import sys
import os
import webbrowser

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(PROJECT_DIR)
sys.path.insert(0, PROJECT_DIR)

from flask import Flask, send_from_directory
from db import init_db
from api_tasks import api as tasks_api
from api_notes import api as notes_api

app = Flask(__name__, static_folder=None)
app.register_blueprint(tasks_api)
app.register_blueprint(notes_api)

_BOARD_DIR = os.path.join(ROOT_DIR, 'frontend', 'board')
_NOTES_DIR = os.path.join(ROOT_DIR, 'frontend', 'notes')

@app.route('/')
def index():
    return send_from_directory(_BOARD_DIR, 'index.html')

@app.route('/static/<path:path>')
def static_files(path):
    return send_from_directory(_BOARD_DIR, path)

@app.route('/notes')
def notes_index():
    return send_from_directory(_NOTES_DIR, 'index.html')

@app.route('/notes/<path:path>')
def notes_static(path):
    return send_from_directory(_NOTES_DIR, path)


# ===== 小窗模式（dev 模式无 pywebview，仅返回 ok，CSS 切换仍生效） =====
@app.route('/api/window/mini', methods=['POST'])
def toggle_mini():
    from flask import jsonify
    return jsonify({'ok': True, 'hwnd': 0})

if __name__ == '__main__':
    init_db()
    url = 'http://127.0.0.1:56789'
    print(f'\n  浏览器打开: {url}\n')
    webbrowser.open(url)
    app.run(port=56789, debug=True)
