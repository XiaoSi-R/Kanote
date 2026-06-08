/* API 请求封装 */

/* 搜索高亮：转义HTML后包裹匹配文字 */
function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  var escaped = escapeHtml(text);
  var escQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp('(' + escQuery + ')', 'gi'), '<mark>$1</mark>');
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDate(d) {
  const today = todayStr();
  if (d === today) return '今天';
  const diff = (new Date(today) - new Date(d)) / 86400000;
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  const t = new Date(d);
  return `${t.getMonth()+1}/${t.getDate()}`;
}

async function api(url, opts) {
  try {
    const res = await fetch(url, opts);
    if (res.status === 204) return null;
    return await res.json();
  } catch(e) {
    console.error('API error:', e);
    return null;
  }
}

async function loadTasks() {
  const data = await api('/api/tasks');
  tasks = data || [];
}

async function apiAdd(text) {
  return await api('/api/tasks', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text, created_date: todayStr()})
  });
}

async function apiUpdate(id, data) {
  return await api(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
}

async function apiDelete(id) {
  await api(`/api/tasks/${id}`, {method: 'DELETE'});
}

async function apiClearDone(date) {
  await api('/api/tasks/clear', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({date})
  });
}
