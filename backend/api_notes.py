"""笔记 API"""
import sys, os
if __name__ != '__main__':
    p = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if p not in sys.path: sys.path.insert(0, p)

from datetime import datetime
from flask import Blueprint, request, jsonify
from db import get_notes_conn

api = Blueprint('notes', __name__)


def _ts():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def _order():
    return datetime.now().timestamp()


@api.route('/api/notes')
def list_notes():
    conn = get_notes_conn()
    rows = conn.execute(
        'SELECT * FROM notes ORDER BY pinned DESC, sort_order DESC, id DESC'
    ).fetchall()
    notes = [dict(r) for r in rows]
    conn.close()
    return jsonify(notes)


@api.route('/api/notes', methods=['POST'])
def create_note():
    data = request.get_json()
    conn = get_notes_conn()
    cur = conn.execute(
        'INSERT INTO notes (title, content, cat, pinned, sort_order, created_at, updated_at)'
        ' VALUES (?, ?, ?, ?, ?, ?, ?)',
        (data.get('title', ''),
         data.get('content', ''),
         data.get('cat', ''),
         data.get('pinned', 0),
         data.get('sort_order', _order()),
         _ts(), _ts())
    )
    conn.commit()
    row = conn.execute('SELECT * FROM notes WHERE id = ?', (cur.lastrowid,)).fetchone()
    result = dict(row)
    conn.close()
    return jsonify(result), 201


@api.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    data = request.get_json()
    conn = get_notes_conn()
    note = conn.execute('SELECT * FROM notes WHERE id = ?', (note_id,)).fetchone()
    if not note:
        conn.close()
        return jsonify({'error': 'not found'}), 404

    allowed = ['title', 'content', 'cat', 'pinned']
    updates = {k: data[k] for k in allowed if k in data}
    if updates:
        updates['sort_order'] = _order()
        updates['updated_at'] = _ts()
        sets = ', '.join(f'{k} = ?' for k in updates)
        conn.execute(f'UPDATE notes SET {sets} WHERE id = ?',
                     list(updates.values()) + [note_id])
        conn.commit()

    row = conn.execute('SELECT * FROM notes WHERE id = ?', (note_id,)).fetchone()
    result = dict(row)
    conn.close()
    return jsonify(result)


@api.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    conn = get_notes_conn()
    conn.execute('DELETE FROM notes WHERE id = ?', (note_id,))
    conn.commit()
    conn.close()
    return '', 204


@api.route('/api/notes/batch', methods=['DELETE'])
def batch_delete():
    """批量删除笔记"""
    data = request.get_json()
    ids = data.get('ids', [])
    if not ids:
        return jsonify({'error': 'no ids'}), 400
    conn = get_notes_conn()
    placeholders = ','.join('?' * len(ids))
    conn.execute(f'DELETE FROM notes WHERE id IN ({placeholders})', ids)
    conn.commit()
    conn.close()
    return jsonify({'ok': True, 'deleted': len(ids)})


@api.route('/api/notes/export')
def export_notes():
    """导出全部笔记为 JSON 文件"""
    import json
    from datetime import datetime
    from db import DB_DIR

    conn = get_notes_conn()
    rows = conn.execute(
        'SELECT * FROM notes ORDER BY pinned DESC, sort_order DESC, id DESC'
    ).fetchall()
    notes = [dict(r) for r in rows]
    conn.close()

    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'notes-{ts}.json'
    path = os.path.join(DB_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(notes, f, ensure_ascii=False, indent=2)

    return jsonify({'ok': True, 'path': path, 'count': len(notes)})


@api.route('/api/notes/batch-sort', methods=['POST'])
def batch_sort():
    """批量更新排序（拖拽后提交）"""
    data = request.get_json()
    items = data.get('items', [])
    conn = get_notes_conn()
    for item in items:
        conn.execute('UPDATE notes SET sort_order = ?, updated_at = ? WHERE id = ?',
                     (item['sort_order'], _ts(), item['id']))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})


# ========== 备份/恢复 ==========
@api.route('/api/notes/backup', methods=['POST'])
def backup_notes():
    """导出全部笔记 JSON 到 backup 目录"""
    import json as _json
    conn = get_notes_conn()
    rows = conn.execute('SELECT * FROM notes ORDER BY id').fetchall()
    conn.close()
    data = {
        'version': 1, 'type': 'kanote-notes',
        'exported_at': _ts(),
        'count': len(rows), 'notes': [dict(r) for r in rows]
    }
    if getattr(sys, 'frozen', False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backup_dir = os.path.join(base, 'backup')
    os.makedirs(backup_dir, exist_ok=True)
    name = f'kanote-记录-{_ts()[:10]}.json'
    path = os.path.join(backup_dir, name)
    with open(path, 'w', encoding='utf-8') as f:
        _json.dump(data, f, ensure_ascii=False, indent=2)
    return jsonify({'ok': True, 'path': path, 'count': len(rows)})


@api.route('/api/notes/restore', methods=['POST'])
def restore_notes():
    """从 JSON 恢复笔记（替换模式）"""
    data = request.get_json()
    if data.get('type') != 'kanote-notes':
        return jsonify({'ok': False, 'error': '格式不正确'})
    notes = data.get('notes', [])
    if not notes:
        return jsonify({'ok': False, 'error': '无数据'})
    conn = get_notes_conn()
    conn.execute('DELETE FROM notes')
    for n in notes:
        conn.execute(
            'INSERT INTO notes (id, title, content, cat, pinned, sort_order, created_at, updated_at)'
            ' VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (n.get('id'), n.get('title', ''), n.get('content', ''),
             n.get('cat', ''), n.get('pinned', 0), n.get('sort_order', 0),
             n.get('created_at', _ts()), n.get('updated_at', _ts()))
        )
    conn.commit()
    count = conn.execute('SELECT COUNT(*) as n FROM notes').fetchone()['n']
    conn.close()
    return jsonify({'ok': True, 'count': count})
