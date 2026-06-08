"""任务 API"""
import sys, os
if __name__ != '__main__':
    p = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if p not in sys.path: sys.path.insert(0, p)

from datetime import datetime
from flask import Blueprint, request, jsonify
from db import get_conn

api = Blueprint('tasks', __name__)


def today_str():
    return datetime.now().strftime('%Y-%m-%d')


def now_time():
    return datetime.now().strftime('%m/%d %H:%M').lstrip('0').replace('/0', '/')


@api.route('/api/tasks')
def get_tasks():
    conn = get_conn()
    rows = conn.execute(
        'SELECT * FROM tasks ORDER BY pinned DESC, sort_order DESC, id DESC'
    ).fetchall()
    tasks = [dict(r) for r in rows]
    conn.close()
    return jsonify(tasks)


@api.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.get_json()
    conn = get_conn()
    cur = conn.execute(
        'INSERT INTO tasks (text, status, pinned, created_date, done_date, time, sort_order)'
        ' VALUES (?, "todo", 0, ?, "", ?, ?)',
        (data['text'],
         data.get('created_date', today_str()),
         data.get('time', now_time()),
         data.get('sort_order', datetime.now().timestamp()))
    )
    conn.commit()
    row = conn.execute('SELECT * FROM tasks WHERE id = ?', (cur.lastrowid,)).fetchone()
    result = dict(row)
    conn.close()
    return jsonify(result), 201


@api.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json()
    conn = get_conn()
    task = conn.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    if not task:
        conn.close()
        return jsonify({'error': 'not found'}), 404

    allowed = ['text', 'status', 'pinned', 'done_date', 'time']
    updates = {k: data[k] for k in allowed if k in data}
    if updates:
        sets = ', '.join(f'{k} = ?' for k in updates)
        conn.execute(f'UPDATE tasks SET {sets} WHERE id = ?',
                     list(updates.values()) + [task_id])
        conn.commit()

    row = conn.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    result = dict(row)
    conn.close()
    return jsonify(result)


@api.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    conn = get_conn()
    conn.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    conn.commit()
    conn.close()
    return '', 204


@api.route('/api/tasks/clear', methods=['POST'])
def clear_done():
    data = request.get_json()
    date = data.get('date', today_str())
    conn = get_conn()
    conn.execute("DELETE FROM tasks WHERE status='done' AND done_date=?", (date,))
    conn.commit()
    conn.close()
    return '', 204


@api.route('/api/tasks/bulk', methods=['POST'])
def bulk_import():
    """批量导入（覆盖模式：先清空再插入）"""
    data = request.get_json()
    tasks = data.get('tasks', [])
    mode = data.get('mode', 'merge')  # 'replace' or 'merge'
    conn = get_conn()

    if mode == 'replace':
        conn.execute('DELETE FROM tasks')

    inserted = 0
    existing_ids = set()
    if mode == 'merge':
        rows = conn.execute('SELECT id FROM tasks').fetchall()
        existing_ids = {r['id'] for r in rows}

    for t in tasks:
        if mode == 'merge' and t.get('id') in existing_ids:
            continue
        conn.execute(
            'INSERT INTO tasks (id, text, status, pinned, created_date, done_date, time, sort_order)'
            ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (t.get('id'), t['text'], t.get('status', 'todo'),
             t.get('pinned', 0), t.get('created_date', ''),
             t.get('done_date', ''), t.get('time', ''),
             t.get('sort_order', 0))
        )
        inserted += 1

    conn.commit()
    rows = conn.execute('SELECT * FROM tasks ORDER BY pinned DESC, sort_order DESC, id DESC').fetchall()
    result = {'inserted': inserted, 'total': len(rows), 'tasks': [dict(r) for r in rows]}
    conn.close()
    return jsonify(result)


def _cell_to_str(v):
    """把 Excel 单元格转成字符串，处理日期类型"""
    from datetime import datetime, date
    if isinstance(v, (datetime, date)):
        return v.strftime('%Y-%m-%d')
    return str(v).strip() if v else ''


@api.route('/api/import/xlsx', methods=['POST'])
def import_xlsx():
    """从 Excel 文件导入任务（仅合并模式）"""
    from datetime import datetime
    from openpyxl import load_workbook

    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'no file'}), 400

    wb = load_workbook(file, read_only=True)
    ws = wb.active

    new_tasks = []
    status_map = {'待开始': 'todo', '已完成': 'done', 'todo': 'todo', 'done': 'done'}

    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
        if not row or not row[1]:
            continue
        text = str(row[1]).strip()
        if not text:
            continue

        raw_status = str(row[2]).strip() if len(row) > 2 and row[2] else '待开始'
        status = status_map.get(raw_status, 'todo')
        pinned = 1 if len(row) > 3 and row[3] and str(row[3]).strip() in ('是', '1', 'True', 'true') else 0
        created_date = _cell_to_str(row[4]) if len(row) > 4 else ''
        done_date = _cell_to_str(row[5]) if len(row) > 5 else ''
        time_str = _cell_to_str(row[6]) if len(row) > 6 else ''

        new_tasks.append({
            'text': text, 'status': status, 'pinned': pinned,
            'created_date': created_date, 'done_date': done_date,
            'time': time_str, 'sort_order': datetime.now().timestamp()
        })

    wb.close()

    conn = get_conn()
    inserted = 0
    for t in new_tasks:
        conn.execute(
            'INSERT INTO tasks (text, status, pinned, created_date, done_date, time, sort_order)'
            ' VALUES (?, ?, ?, ?, ?, ?, ?)',
            (t['text'], t['status'], t['pinned'], t['created_date'],
             t['done_date'], t['time'], t['sort_order']))
        inserted += 1
    conn.commit()

    rows = conn.execute('SELECT * FROM tasks ORDER BY pinned DESC, sort_order DESC, id DESC').fetchall()
    result = {'inserted': inserted, 'total': len(rows), 'tasks': [dict(r) for r in rows]}
    conn.close()
    return jsonify(result)


# ========== 批量删除 ==========
@api.route('/api/tasks/batch', methods=['DELETE'])
def batch_delete():
    """批量删除任务"""
    data = request.get_json()
    ids = data.get('ids', [])
    if not ids:
        return jsonify({'error': 'no ids'}), 400
    conn = get_conn()
    placeholders = ','.join('?' * len(ids))
    conn.execute(f'DELETE FROM tasks WHERE id IN ({placeholders})', ids)
    conn.commit()
    conn.close()
    return jsonify({'ok': True, 'deleted': len(ids)})


# ========== 拖拽排序 ==========
@api.route('/api/tasks/batch-sort', methods=['POST'])
def batch_sort():
    """批量更新 sort_order（拖拽后提交）"""
    data = request.get_json()
    items = data.get('items', [])
    conn = get_conn()
    for item in items:
        conn.execute('UPDATE tasks SET sort_order = ? WHERE id = ?',
                     (item['sort_order'], item['id']))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})


# ========== 备份/恢复 ==========
@api.route('/api/tasks/backup', methods=['POST'])
def backup_tasks():
    """导出全部任务 JSON 到 backup 目录"""
    import json as _json
    from datetime import datetime
    conn = get_conn()
    rows = conn.execute('SELECT * FROM tasks ORDER BY id').fetchall()
    conn.close()
    data = {
        'version': 1, 'type': 'kanote-board',
        'exported_at': datetime.now().isoformat(),
        'count': len(rows), 'tasks': [dict(r) for r in rows]
    }
    # 存到 exe/项目同级 backup 目录
    if getattr(sys, 'frozen', False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backup_dir = os.path.join(base, 'backup')
    os.makedirs(backup_dir, exist_ok=True)
    name = f'kanote-看板-{today_str()}.json'
    path = os.path.join(backup_dir, name)
    with open(path, 'w', encoding='utf-8') as f:
        _json.dump(data, f, ensure_ascii=False, indent=2)
    return jsonify({'ok': True, 'path': path, 'count': len(rows)})


@api.route('/api/tasks/restore', methods=['POST'])
def restore_tasks():
    """从 JSON 恢复任务（替换模式）"""
    data = request.get_json()
    if data.get('type') != 'kanote-board':
        return jsonify({'ok': False, 'error': '格式不正确'})
    tasks = data.get('tasks', [])
    if not tasks:
        return jsonify({'ok': False, 'error': '无数据'})
    conn = get_conn()
    conn.execute('DELETE FROM tasks')
    for t in tasks:
        conn.execute(
            'INSERT INTO tasks (id, text, status, pinned, created_date, done_date, time, sort_order)'
            ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (t.get('id'), t.get('text', ''), t.get('status', 'todo'),
             t.get('pinned', 0), t.get('created_date', ''),
             t.get('done_date', ''), t.get('time', ''),
             t.get('sort_order', 0))
        )
    conn.commit()
    count = conn.execute('SELECT COUNT(*) as n FROM tasks').fetchone()['n']
    conn.close()
    return jsonify({'ok': True, 'count': count})


# ========== 导出 ==========
EXPORT_COLS = [
    ('id', '序号'), ('text', '内容'), ('status', '状态'),
    ('pinned', '置顶'), ('created_date', '创建日期'),
    ('done_date', '完成日期'), ('time', '时间')
]


@api.route('/api/export/<fmt>')
def export_data(fmt):
    from datetime import datetime
    from db import DB_DIR

    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    conn = get_conn()
    sql = 'SELECT * FROM tasks'
    params = []
    if date_from and date_to:
        sql += " WHERE (created_date BETWEEN ? AND ?) OR (done_date BETWEEN ? AND ?)"
        params = [date_from, date_to, date_from, date_to]
    elif date_from:
        sql += " WHERE created_date >= ? OR done_date >= ?"
        params = [date_from, date_from]
    elif date_to:
        sql += " WHERE created_date <= ? OR done_date <= ?"
        params = [date_to, date_to]
    sql += ' ORDER BY pinned DESC, id DESC'

    rows = conn.execute(sql, params).fetchall()
    tasks = [dict(r) for r in rows]
    conn.close()

    status_map = {'todo': '待开始', 'done': '已完成'}
    for i, t in enumerate(tasks, 1):
        t['_seq'] = i
        t['_status'] = status_map.get(t['status'], t['status'])
        t['_pinned'] = '是' if t['pinned'] else ''

    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    path = _save_xlsx(tasks, DB_DIR, ts)
    return jsonify({'ok': True, 'path': path})


def _save_xlsx(tasks, dir_path, ts):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = '待办事项'

    header_font = Font(bold=True, color='FFFFFF', size=11)
    header_fill = PatternFill(start_color='4F6EF7', end_color='4F6EF7', fill_type='solid')
    header_align = Alignment(horizontal='center', vertical='center')
    thin = Border(left=Side('thin', 'D0D5DD'), right=Side('thin', 'D0D5DD'),
                  top=Side('thin', 'D0D5DD'), bottom=Side('thin', 'D0D5DD'))

    for col, h in enumerate([c[1] for c in EXPORT_COLS], 1):
        c = ws.cell(row=1, column=col, value=h)
        c.font = header_font; c.fill = header_fill; c.alignment = header_align; c.border = thin

    done_fill = PatternFill(start_color='F0FFF0', end_color='F0FFF0', fill_type='solid')
    pinned_fill = PatternFill(start_color='FFFDF5', end_color='FFFDF5', fill_type='solid')
    key_map = {'id': '_seq', 'status': '_status', 'pinned': '_pinned'}

    for ri, t in enumerate(tasks, 2):
        for ci, (k, _) in enumerate(EXPORT_COLS, 1):
            v = t.get(key_map.get(k, k), '')
            c = ws.cell(row=ri, column=ci, value=v if v is not None else '')
            c.border = thin; c.alignment = Alignment(vertical='center')
            if t['pinned']: c.fill = pinned_fill
            elif t['status'] == 'done': c.fill = done_fill

    for i, w in enumerate([6, 40, 8, 6, 12, 12, 12], 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w
    ws.auto_filter.ref = ws.dimensions

    filename = f'todo-{ts}.xlsx'
    path = os.path.join(dir_path, filename)
    wb.save(path)
    return path
