/* 主应用逻辑 */
let tasks = [];
let dragCard = null;
let viewingDate = '';
let theme = 'light';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let _prevCardIds = new Set();

async function init() {
  loadTheme();
  showDate();
  viewingDate = todayStr();
  await loadTasks();
  renderAll();
  // 列容器拖放：支持拖到空列/卡片间隙

  setInterval(async () => { showDate(); await loadTasks(); renderAll(); }, 60000);
  setupShortcuts();
}

function setupShortcuts() {
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); document.getElementById('globalInput').focus(); }
    if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.getElementById('searchInput').focus(); }
    if (e.ctrlKey && e.key === 'e') { e.preventDefault(); exportData(); }
    if (e.key === 'Escape') {
      const s = document.getElementById('searchInput');
      if (s.value) { s.value = ''; renderAll(); }
    }
  });
}

function showDate() {
  const weekDays = ['日','一','二','三','四','五','六'];
  const now = new Date();
  document.getElementById('currentDate').textContent =
    `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} 周${weekDays[now.getDay()]}`;
}

function loadTheme() {
  theme = localStorage.getItem('kanban_theme') || 'light';
  if (theme === 'dark') document.body.classList.add('dark');
}
function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('kanban_theme', theme);
  if (theme === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
}

/* 操作 */
async function quickAdd() {
  const input = document.getElementById('globalInput');
  const text = input.value.trim();
  if (!text) return;
  await apiAdd(text);
  input.value = ''; input.focus();
  await loadTasks(); renderAll();
}

async function togglePin(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  await apiUpdate(id, {pinned: task.pinned ? 0 : 1});
  await loadTasks(); renderAll();
}

async function markDone(id) {
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (card) card.classList.add('animate-out');
  await sleep(250);
  await apiUpdate(id, {status: 'done', done_date: todayStr()});
  await loadTasks(); renderAll();
}

async function undoDone(id) {
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (card) card.classList.add('animate-out');
  await sleep(250);
  await apiUpdate(id, {status: 'todo', done_date: '', pinned: 0});
  await loadTasks(); renderAll();
}

function startEdit(id) {
  const card = document.querySelector(`.card[data-id="${id}"]`);
  const textSpan = card.querySelector('.card-text span');
  if (!textSpan || card.querySelector('.edit-input')) return;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  card.draggable = false;
  card.style.cursor = 'default';

  const input = document.createElement('input');
  input.className = 'edit-input'; input.value = task.text;
  input.onkeydown = function(e) {
    if (e.key === 'Enter') finishEdit(id, input.value.trim());
    if (e.key === 'Escape') { finishEdit(id, task.text); }
  };
  input.onblur = function() { finishEdit(id, input.value.trim()); };
  input.onmousedown = function(e) { e.stopPropagation(); };

  textSpan.replaceWith(input); input.focus();
  setTimeout(() => { try { input.setSelectionRange(0, input.value.length); } catch(e) {} }, 60);
}

async function finishEdit(id, newText) {
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (card) { card.draggable = true; card.style.cursor = ''; }

  if (!newText) { renderAll(); return; }
  await apiUpdate(id, {text: newText});
  await loadTasks(); renderAll();
}

async function deleteCard(id) {
  const ok = await showConfirm('删除确认', '确定删除此卡片？');
  if (!ok) return;
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (card) card.classList.add('animate-out');
  await sleep(250);
  await apiDelete(id);
  await loadTasks(); renderAll();
}

async function clearDoneToday() {
  const today = todayStr();
  const items = tasks.filter(t => t.status === 'done' && t.done_date === today);
  if (items.length === 0) return;
  const ok = await showConfirm('清空确认', `清空今天完成的 ${items.length} 条事项？`);
  if (!ok) return;
  items.forEach(t => {
    const card = document.querySelector(`.card[data-id="${t.id}"]`);
    if (card) card.classList.add('animate-out');
  });
  await sleep(250);
  await apiClearDone(today);
  await loadTasks(); renderAll();
}

/* 日期导航 */
function prevDate() {
  const d = new Date(viewingDate || todayStr());
  d.setDate(d.getDate() - 1);
  viewingDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  renderAll();
}
function nextDate() {
  const d = new Date(viewingDate || todayStr());
  d.setDate(d.getDate() + 1);
  const next = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if (next > todayStr()) return;
  viewingDate = next; renderAll();
}
function goToday() { viewingDate = todayStr(); renderAll(); }

/* 渲染 */
function renderAll() {
  const today = todayStr();
  const viewDate = viewingDate || today;
  const searchText = (document.getElementById('searchInput').value || '').trim().toLowerCase();

  let todoItems = tasks.filter(t => t.status === 'todo');
  let doneItems = tasks.filter(t => t.status === 'done' && t.done_date === viewDate);
  if (searchText) {
    todoItems = todoItems.filter(t => t.text.toLowerCase().includes(searchText));
    doneItems = doneItems.filter(t => t.text.toLowerCase().includes(searchText));
  }
  renderColumn('todo', todoItems, searchText);
  renderColumn('done', doneItems, searchText);

  document.getElementById('viewDateLabel').textContent = fmtDate(viewDate);
  document.getElementById('doneTitle').textContent = viewDate === today ? '今天完成' : '历史完成';

  // 成就感统计条
  const statsBar = document.getElementById('doneStatsBar');
  if (viewDate === today) {
    const todoCount = tasks.filter(t => t.status === 'todo').length;
    const todayCreated = tasks.filter(t => t.created_date === today).length;
    const pct = todayCreated > 0 ? Math.round(doneItems.length / todayCreated * 100) : 0;

    let trophy = '☆', msg = '';
    if (doneItems.length === 0) {
      msg = '今天还没有完成事项，加油！';
    } else if (doneItems.length < 3) { trophy = '★'; msg = `已完成 <b>${doneItems.length}</b> 项`; }
    else if (doneItems.length < 7) { trophy = '◆'; msg = `高效！已完成 <b>${doneItems.length}</b> 项`; }
    else { trophy = '◆'; msg = `太强了！已完成 <b>${doneItems.length}</b> 项`; }

    if (todoCount === 0 && doneItems.length > 0) { trophy = '★'; msg += ' 全部任务完成，今天完美收官！'; }

    let barHtml = '';
    if (todayCreated > 0) {
      barHtml = `<div class="progress-ring">
        <span>${pct}%</span>
        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }

    document.getElementById('doneTrophy').textContent = trophy;
    document.getElementById('doneStatsText').innerHTML = msg + barHtml;
    statsBar.classList.add('show');
  } else {
    statsBar.classList.remove('show');
  }
  _prevCardIds = new Set(tasks.map(t => t.id));
}

function renderColumn(status, items, searchText) {
  const list = document.getElementById('list-' + status);
  document.getElementById(status + 'Count').textContent = items.length;

  if (items.length === 0) {
    const hint = status === 'todo' ? '暂无待办' : '该日期无完成记录';
    list.innerHTML = `<div class="empty-hint">${hint}</div>`;
    return;
  }
  const pinned = items.filter(t => t.pinned);
  const unpinned = items.filter(t => !t.pinned);
  const sorted = [...pinned, ...unpinned];

  list.innerHTML = sorted.map(t => {
    const pinBtn = t.status === 'todo'
      ? `<button class="pin-btn ${t.pinned ? 'active' : ''}" onclick="event.stopPropagation(); togglePin(${t.id})" title="${t.pinned ? '取消置顶' : '置顶'}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-2.5c0-0.8-0.3-1.5-0.9-2L17 11V5h2V3H5v2h2v6l-1.1 1.5c-0.6 0.5-0.9 1.2-0.9 2V17z"/></svg></button>`
      : '';
    const doneBtn = t.status === 'todo'
      ? `<button class="card-done-btn" onclick="event.stopPropagation(); markDone(${t.id})" title="标记完成"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>`
      : '';
    const undoBtn = t.status === 'done'
      ? `<button class="undo-btn" onclick="event.stopPropagation(); undoDone(${t.id})" title="撤回到待开始"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.5 17.5A9 9 0 1 0 2.1 11"/></svg></button>`
      : '';
    const hasActions = pinBtn || doneBtn || undoBtn;
    return `
      <div class="card ${t.pinned ? 'pinned' : ''}"
           draggable="true" data-id="${t.id}">
        <div class="card-text">
          <span ondblclick="startEdit(${t.id})" title="双击编辑">${t.pinned ? '<b>置顶</b> ' : ''}${highlightText(t.text, searchText)}</span>
          ${hasActions ? `<div class="card-actions">${pinBtn}${doneBtn}${undoBtn}</div>` : ''}
        </div>
        <div class="card-meta">
          <span class="card-time">${t.time}</span>
          <button class="card-del" onclick="event.stopPropagation(); deleteCard(${t.id})" title="删除">×</button>
        </div>
      </div>
    `;
  }).join('');

  requestAnimationFrame(() => {
    sorted.forEach((t, i) => {
      if (_prevCardIds.has(t.id)) return;
      const card = list.querySelector(`.card[data-id="${t.id}"]`);
      if (!card) return;
      card.classList.add('animate-in');
      card.style.animationDelay = `${i * 0.045}s`;
      card.addEventListener('animationend', () => {
        card.classList.remove('animate-in');
        card.style.animationDelay = '';
      }, { once: true });
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* 导出导入 */
function showDateRangePicker() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3>导出 Excel</h3>
        <p style="margin-bottom:12px;font-size:13px;color:var(--text3)">选择日期范围（留空导出全部）</p>
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div><label style="font-size:12px;color:var(--text3)">从</label><br>
            <input type="date" id="exportDateFrom"
             style="margin-top:4px;padding:6px 10px;border:1px solid var(--border2);border-radius:6px;background:var(--input-bg);color:var(--text);font-size:13px"></div>
          <div><label style="font-size:12px;color:var(--text3)">到</label><br>
            <input type="date" id="exportDateTo"
             style="margin-top:4px;padding:6px 10px;border:1px solid var(--border2);border-radius:6px;background:var(--input-bg);color:var(--text);font-size:13px"></div>
        </div>
        <div class="modal-btns">
          <button class="modal-btn-cancel" id="exportCancelBtn">取消</button>
          <button class="modal-btn-primary" id="exportOkBtn">导出</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    let _closed = false;
    const close = (result) => {
      if (_closed) return;
      _closed = true;
      overlay.classList.remove('show');
      setTimeout(() => { if (overlay.parentNode) document.body.removeChild(overlay); }, 150);
      resolve(result);
    };

    document.getElementById('exportCancelBtn').onclick = () => close(null);
    document.getElementById('exportOkBtn').onclick = () => {
      const from = document.getElementById('exportDateFrom').value;
      const to = document.getElementById('exportDateTo').value;
      close(from || to ? {from, to} : {});
    };
    overlay.onclick = (e) => { if (e.target === overlay) close(null); };
  });
}

async function exportData() {
  const range = await showDateRangePicker();
  if (!range) return;
  try {
    let url = '/api/export/xlsx';
    if (range.from || range.to) {
      const p = new URLSearchParams();
      if (range.from) p.set('date_from', range.from);
      if (range.to) p.set('date_to', range.to);
      url += '?' + p.toString();
    }
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok) {
      await showAlert('导出成功', '文件已保存到：\n' + data.path);
    } else {
      await showAlert('导出失败', '请重试');
    }
  } catch(e) {
    await showAlert('导出失败', e.message);
  }
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.endsWith('.xlsx')) {
    await showAlert('格式错误', '请选择 Excel 文件（.xlsx）');
    event.target.value = '';
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/import/xlsx', { method: 'POST', body: formData }).then(r => r.json());

    if (res) {
      tasks = res.tasks;
      renderAll();
      await showAlert('导入成功', `成功导入 ${res.inserted} 条记录`);
    }
  } catch(e) {
    await showAlert('导入失败', '文件格式不正确，请选择 Excel 文件');
  }
  event.target.value = '';
}

document.addEventListener('DOMContentLoaded', init);
