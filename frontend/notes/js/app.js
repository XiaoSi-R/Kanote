/* ==========================================
   信息板 — 主应用模块
   数据流：API ←→ DOM（DOM 是 API 数据的视图）
   依赖：api.js → editor.js → app.js
   ========================================== */

const App = (() => {
  let _currentCat = '全部';
  let _searchText = '';
  let _nextId = 0;

  /* ---- 渲染 ---- */

  /** 从 note 对象创建 DOM 条目 */
  function _renderItem(note) {
    const item = document.createElement('div');
    item.className = 'item';
    item.dataset.id = note.id;
    item.dataset.fullContent = note.content || '';
    item.dataset.title = note.title || '';
    item.dataset.content = note.content || '';
    item.dataset.cat = note.cat || '';
    item.dataset.pinned = note.pinned ? '1' : '0';
    item.dataset.sort = note.sort_order != null ? note.sort_order : 0;

    const title = note.title || '未命名';
    const content = note.content || '';
    const preview = content.split('\n')[0].slice(0, 50) || '空';
    const isPinned = note.pinned ? ' is-pinned' : '';

    item.innerHTML =
      '<span class="note-checkbox" onclick="event.stopPropagation(); toggleNoteSelect(' + note.id + ')"></span>' +
      '<div class="item-left">' +
        '<div class="item-title">' + title + '</div>' +
        '<span class="item-preview">' + preview + '</span>' +
      '</div>' +
      '<span class="item-tag">' + (note.cat || '') + '</span>' +
      '<button class="pin-item-btn' + isPinned + '" title="置顶"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-2.5c0-0.8-0.3-1.5-0.9-2L17 11V5h2V3H5v2h2v6l-1.1 1.5c-0.6 0.5-0.9 1.2-0.9 2V17z"/></svg></button>' +
      '<button class="expand-btn">▼ 展开</button>';

    if (note.pinned) item.classList.add('pinned');
    return item;
  }

  /** 从 API 加载并渲染全部笔记 */
  async function _loadNotes() {
    const list = document.getElementById('noteList');
    try {
      const notes = await API.list();
      // 清除列表（保留 empty-hint）
      list.querySelectorAll('.item').forEach(el => el.remove());
      const empty = list.querySelector('.empty-hint');
      if (empty) empty.remove();

      if (notes.length === 0) {
        const hint = document.createElement('div');
        hint.className = 'empty-hint';
        hint.style.cssText = 'padding:40px;text-align:center;color:#999;font-size:13px;';
        hint.textContent = '暂无记录，点击右下角 + 新建';
        list.appendChild(hint);
      } else {
        notes.forEach(note => {
          list.appendChild(_renderItem(note));
        });
      }
      _rebuildCategories(notes);
      refresh();
    } catch (e) {
      console.error('加载笔记失败:', e);
    }
  }

  /** 从已加载的笔记中重建分类标签 */
  function _rebuildCategories(notes) {
    const catRow = document.querySelector('.cat-row');
    // 移除旧标签（保留 cat-add）
    catRow.querySelectorAll('.cat').forEach(el => el.remove());
    catRow.querySelectorAll('.cat-input').forEach(el => el.remove());

    // 确保「全部」标签始终存在
    const allSpan = document.createElement('span');
    allSpan.className = 'cat' + (_currentCat === '全部' ? ' active' : '');
    allSpan.dataset.cat = '全部';
    allSpan.textContent = '全部';
    const addBtn = catRow.querySelector('.cat-add');
    catRow.insertBefore(allSpan, addBtn);

    const cats = new Set();
    notes.forEach(n => { if (n.cat) cats.add(n.cat); });

    cats.forEach(name => {
      const span = document.createElement('span');
      span.className = 'cat' + (_currentCat === name ? ' active' : '');
      span.dataset.cat = name;
      span.innerHTML = `${name}<span class="cat-x">×</span>`;
      catRow.insertBefore(span, addBtn);
    });
  }

  /** 对单个条目应用搜索高亮 */
  function _applyHighlight(item) {
    var titleEl = item.querySelector('.item-title');
    var previewEl = item.querySelector('.item-preview');
    var title = item.dataset.title || '未命名';
    var content = item.dataset.content || '';
    var firstLine = content.split('\n')[0].slice(0, 50) || '空';

    if (_searchText) {
      titleEl.innerHTML = highlightText(title, _searchText);
      previewEl.innerHTML = highlightText(firstLine, _searchText);
    } else {
      titleEl.textContent = title;
      previewEl.textContent = firstLine;
    }
    previewEl.dataset.origText = firstLine;
  }

  /** 过滤 + 搜索 */
  function refresh() {
    const list = document.getElementById('noteList');
    const all = list.querySelectorAll('.item');
    let visible = 0;

    all.forEach(item => {
      const cat = item.dataset.cat || '';
      const title = item.dataset.title || '';
      const content = (item.dataset.content || '').replace(/\n/g, ' ');

      const matchCat = _currentCat === '全部' || cat === _currentCat;
      const matchSearch = !_searchText
        || title.toLowerCase().includes(_searchText.toLowerCase())
        || content.toLowerCase().includes(_searchText.toLowerCase());

      item.style.display = (matchCat && matchSearch) ? '' : 'none';
      if (matchCat && matchSearch) { visible++; _applyHighlight(item); }
    });

    let empty = list.querySelector('.empty-hint');
    if (all.length === 0) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'empty-hint';
        empty.style.cssText = 'padding:40px;text-align:center;color:#999;font-size:13px;';
        empty.textContent = '暂无记录，点击右下角 + 新建';
        list.appendChild(empty);
      }
    } else if (visible === 0) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'empty-hint';
        empty.style.cssText = 'padding:40px;text-align:center;color:#999;font-size:13px;';
        empty.textContent = '没有匹配的记录';
        list.appendChild(empty);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  /* ---- 搜索 / 分类 ---- */

  function setSearch(text) { _searchText = text; refresh(); }

  function setCategory(cat) {
    _currentCat = cat;
    document.querySelectorAll('.cat').forEach(c => {
      c.classList.toggle('active', c.dataset.cat === cat);
    });
    refresh();
  }

  /* ---- 排序 ---- */

  function _sortItems() {
    const list = document.getElementById('noteList');
    const items = Array.from(list.querySelectorAll('.item'));
    if (!items.length) return;
    items.sort((a, b) => {
      const pa = parseInt(a.dataset.pinned) || 0;
      const pb = parseInt(b.dataset.pinned) || 0;
      if (pa !== pb) return pb - pa;
      return (parseFloat(b.dataset.sort) || 0) - (parseFloat(a.dataset.sort) || 0);
    });
    items.forEach(item => list.appendChild(item));
  }



  /* ---- 新建 / 保存 ---- */

  function _isNew(item) {
    return item.dataset.id && item.dataset.id.startsWith('new_');
  }

  function _updateItemDOM(item, title, content, cat) {
    if (title) {
      item.querySelector('.item-title').textContent = title;
      item.dataset.title = title;
    }
    item.dataset.content = content || '';
    item.dataset.fullContent = content || '';
    const preview = item.querySelector('.item-preview');
    const firstLine = (content || '').split('\n')[0];
    preview.textContent = firstLine ? (firstLine.length > 50 ? firstLine.slice(0, 50) + '…' : firstLine) : '空';
    item.dataset.cat = cat || '';
    const tag = item.querySelector('.item-tag');
    if (tag) tag.textContent = cat || '';
  }

  async function _saveItem(item, newTitle, newContent, newCat) {
    _updateItemDOM(item, newTitle, newContent, newCat);
    const data = {
      title: newTitle,
      content: newContent,
      cat: newCat || '',
      pinned: item.dataset.pinned === '1' ? 1 : 0,
      sort_order: parseFloat(item.dataset.sort) || 0
    };

    try {
      if (_isNew(item)) {
        const created = await API.create(data);
        item.dataset.id = created.id;
      } else {
        await API.update(parseInt(item.dataset.id), data);
      }
      // 更新排序权重，将当前笔记移到前面
      item.dataset.sort = Date.now();
      _sortItems();
      toast('已保存');
    } catch (e) {
      toast('保存失败: ' + e.message);
    }
  }

  function addNote() {
    const list = document.getElementById('noteList');
    const empty = list.querySelector('.empty-hint');
    if (empty) empty.remove();

    const cat = _currentCat === '全部' ? '' : _currentCat;
    const note = {
      id: 'new_' + (++_nextId),
      title: '',
      content: '',
      cat: cat,
      pinned: 0,
      sort_order: Date.now()
    };
    const item = _renderItem(note);
    list.appendChild(item);
    _sortItems();

    Editor.open(item, {
      onSave(item, newTitle, newContent, newCat) {
        _saveItem(item, newTitle, newContent, newCat);
      },
      onDelete(item) { /* 新建的空 item，不调 API */ },
      onClose(item) {
        if (!item.dataset.title || !item.dataset.title.trim()) {
          item.style.transition = 'opacity 0.15s';
          item.style.opacity = '0';
          setTimeout(() => { item.remove(); refresh(); }, 160);
        }
      }
    });
  }

  /* ---- 置顶 ---- */

  async function toggleNotePin(item) {
    const cur = item.dataset.pinned === '1';
    const next = cur ? 0 : 1;
    item.dataset.pinned = cur ? '0' : '1';
    item.classList.toggle('pinned', !cur);

    const pinBtn = item.querySelector('.pin-item-btn');
    if (pinBtn) pinBtn.classList.toggle('is-pinned', !cur);

    _sortItems();
    refresh();

    // 调 API
    if (!_isNew(item)) {
      try {
        await API.update(parseInt(item.dataset.id), {
          pinned: next,
          sort_order: parseFloat(item.dataset.sort) || 0
        });
      } catch (e) { console.error('置顶更新失败:', e); }
    }
  }

  /* ---- 删除 ---- */

  async function _deleteItem(item) {
    const id = item.dataset.id;
    if (!_isNew(item)) {
      try { await API.remove(parseInt(id)); } catch (e) { console.error('删除失败:', e); }
    }
  }

  /* ---- 标签管理 ---- */

  async function _deleteCategory(catEl) {
    const catName = catEl.dataset.cat;
    if (catName === '全部') return;
    const ok = await showConfirm('删除标签', `确定删除标签「${catName}」？\n该标签下所有记录将取消分类，不会被删除。`);
    if (!ok) return;
    catEl.remove();

    const escaped = catName.replace(/"/g, '\\"');
    document.querySelectorAll(`#noteList .item[data-cat="${escaped}"]`).forEach(item => {
      item.dataset.cat = '';
      const tag = item.querySelector('.item-tag');
      if (tag) tag.textContent = '';
    });
    if (_currentCat === catName) setCategory('全部');
  }

  function _showAddInput() {
    const addBtn = document.querySelector('.cat-add');
    if (!addBtn) return;

    const input = document.createElement('input');
    input.className = 'cat-input';
    input.placeholder = '新标签';
    addBtn.replaceWith(input);
    input.focus();

    const commit = () => {
      const name = input.value.trim();
      if (!name) { cancel(); return; }
      const escaped = name.replace(/"/g, '\\"');
      if (document.querySelector(`.cat[data-cat="${escaped}"]`)) {
        toast('标签已存在'); cancel(); return;
      }
      const span = document.createElement('span');
      span.className = 'cat';
      span.dataset.cat = name;
      span.innerHTML = `${name}<span class="cat-x">×</span>`;
      input.replaceWith(span);
      span.insertAdjacentHTML('afterend', '<span class="cat-add">+</span>');
    };

    const cancel = () => {
      const el = document.querySelector('.cat-input');
      if (el) {
        const btn = document.createElement('span');
        btn.className = 'cat-add';
        btn.textContent = '+';
        el.replaceWith(btn);
      }
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { cancel(); }
    });
    input.addEventListener('blur', () => {
      setTimeout(() => { if (document.querySelector('.cat-input')) cancel(); }, 200);
    });
  }

  function _showEditInput(catEl) {
    const oldName = catEl.dataset.cat;
    if (oldName === '全部') return;

    const input = document.createElement('input');
    input.className = 'cat-input';
    input.value = oldName;
    input.style.width = Math.max(oldName.length * 14 + 24, 80) + 'px';
    catEl.replaceWith(input);
    input.focus(); input.select();

    const commit = () => {
      const newName = input.value.trim();
      if (!newName || newName === oldName) { cancel(); return; }
      const escaped = newName.replace(/"/g, '\\"');
      if (document.querySelector(`.cat[data-cat="${escaped}"]`)) {
        toast('标签已存在'); cancel(); return;
      }
      const oldEscaped = oldName.replace(/"/g, '\\"');
      document.querySelectorAll(`#noteList .item[data-cat="${oldEscaped}"]`).forEach(item => {
        item.dataset.cat = newName;
        const tag = item.querySelector('.item-tag');
        if (tag) tag.textContent = newName;
      });
      if (_currentCat === oldName) _currentCat = newName;
      const span = document.createElement('span');
      span.className = 'cat' + (_currentCat === newName ? ' active' : '');
      span.dataset.cat = newName;
      span.innerHTML = `${newName}<span class="cat-x">×</span>`;
      input.replaceWith(span);
    };

    const cancel = () => {
      const span = document.createElement('span');
      span.className = 'cat' + (_currentCat === oldName ? ' active' : '');
      span.dataset.cat = oldName;
      span.innerHTML = `${oldName}<span class="cat-x">×</span>`;
      input.replaceWith(span);
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { cancel(); }
    });
    input.addEventListener('blur', () => {
      setTimeout(() => { if (document.querySelector('.cat-input')) cancel(); }, 200);
    });
  }

  /* ---- 复制 / Toast ---- */

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(99,102,241,0.92);color:#fff;padding:8px 20px;border-radius:20px;font-size:13px;z-index:200;box-shadow:0 4px 12px rgba(99,102,241,.3);';
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; }, 1200);
    setTimeout(() => t.remove(), 1600);
  }

  /* ---- 初始化 ---- */

  function init() {
    const listEl = document.getElementById('noteList');

    // 从 API 加载数据
    _loadNotes();

    // 列表点击 → 置顶 / 展开 / 打开编辑器
    listEl.addEventListener('click', e => {
      const pinBtn = e.target.closest('.pin-item-btn');
      if (pinBtn) {
        e.stopPropagation();
        const item = pinBtn.closest('.item');
        if (item) toggleNotePin(item);
        return;
      }
      const expandBtn = e.target.closest('.expand-btn');
      if (expandBtn) {
        e.stopPropagation();
        const item = expandBtn.closest('.item');
        if (item) {
          const isExpanded = item.classList.toggle('expanded');
          const preview = item.querySelector('.item-preview');
          if (isExpanded) {
            // 展开：显示全文（含高亮）
            preview.dataset.origText = preview.textContent;
            var full = item.dataset.fullContent || '';
            preview.innerHTML = _searchText ? highlightText(full, _searchText) : full;
          } else {
            // 收起：恢复预览（含高亮）
            var orig = preview.dataset.origText || '';
            preview.innerHTML = _searchText ? highlightText(orig, _searchText) : orig;
          }
          expandBtn.textContent = isExpanded ? '▲ 收起' : '▼ 展开';
        }
        return;
      }
      const item = e.target.closest('.item');
      if (item) {
        // 批量模式下不打开编辑器
        if (typeof notesBatchMode !== 'undefined' && notesBatchMode) return;
        Editor.open(item, {
          onSave(_item, newTitle, newContent, newCat) {
            _saveItem(_item, newTitle, newContent, newCat);
          },
          onDelete(_item) {
            _deleteItem(_item);
            toast('已删除');
          }
        });
      }
    });

    // 搜索
    const searchInput = document.getElementById('notesSearchInput');
    if (searchInput) searchInput.addEventListener('input', e => setSearch(e.target.value));

    // 分类：切换 / 删除 / 添加
    const catRow = document.querySelector('.cat-row');
    catRow.addEventListener('click', e => {
      const xBtn = e.target.closest('.cat-x');
      if (xBtn) { e.stopPropagation(); _deleteCategory(xBtn.parentElement); return; }
      if (e.target.classList.contains('cat-add')) { _showAddInput(); return; }
      const cat = e.target.closest('[data-cat]');
      if (cat && cat.dataset.cat) setCategory(cat.dataset.cat);
    });
    catRow.addEventListener('dblclick', e => {
      const cat = e.target.closest('[data-cat]');
      if (cat && cat.dataset.cat !== '全部') _showEditInput(cat);
    });

    // 键盘
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && Editor.isOpen()) { Editor.close(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const si = document.getElementById('notesSearchInput');
        if (si) si.focus();
      }
    });

    window.addEventListener('resize', () => Editor.refreshRect());
  }

  return { init, refresh, setSearch, setCategory, addNote, toggleNotePin, toast };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
