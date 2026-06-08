/* ==========================================
   信息板 — API 层
   负责与服务端通信，封装所有数据操作
   ========================================== */

/* 搜索高亮 */
function highlightText(text, query) {
  if (!query) return _escapeHtml(text);
  var escaped = _escapeHtml(text);
  var escQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp('(' + escQuery + ')', 'gi'), '<mark>$1</mark>');
}
function _escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const API = (() => {
  const BASE = '/api/notes';

  /** 获取所有笔记 */
  async function list() {
    const res = await fetch(BASE);
    if (!res.ok) throw new Error('获取笔记失败');
    return res.json();
  }

  /** 新建笔记 */
  async function create(data) {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('创建笔记失败');
    return res.json();
  }

  /** 更新笔记 */
  async function update(id, data) {
    const res = await fetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('更新笔记失败');
    return res.json();
  }

  /** 删除笔记 */
  async function remove(id) {
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除笔记失败');
  }

  /** 批量更新排序 */
  async function batchSort(items) {
    const res = await fetch(`${BASE}/batch-sort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error('排序更新失败');
    return res.json();
  }

  return { list, create, update, remove, batchSort };
})();
