/* ==========================================
   信息板 — 全屏编辑器模块
   负责原位展开 / 缩回动画、编辑、保存、删除
   ========================================== */

const Editor = (() => {
  let _activeItem = null;
  let _sourceRect = null;
  let _onSave = null;       // 保存回调(item, title, content, cat)
  let _onDelete = null;     // 删除回调
  let _onClose = null;      // 关闭回调（清理空 item 等）

  const shell = () => document.getElementById('editorShell');
  const titleInput = () => document.getElementById('editTitle');
  const contentInput = () => document.getElementById('editContent');
  const catSelect = () => document.getElementById('editCat');

  /** 用 cat-row 里的标签填充分类下拉 */
  function _populateCat(curCat) {
    const sel = catSelect();
    if (!sel) return;

    // 清空重建
    sel.innerHTML = '<option value="">无分类</option>';

    const cats = document.querySelectorAll('.cat[data-cat]');
    cats.forEach(c => {
      const name = c.dataset.cat;
      if (name === '全部') return;
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === curCat) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.value = curCat || '';
  }

  /** 打开编辑器，从 item 原位展开 */
  function open(item, opts = {}) {
    _activeItem = item;
    _onSave = opts.onSave || null;
    _onDelete = opts.onDelete || null;
    _onClose = opts.onClose || null;

    // 填充数据
    titleInput().value = item.dataset.title || '';
    contentInput().value = (item.dataset.content || '').replace(/\\n/g, '\n');
    _populateCat(item.dataset.cat || '');

    // 记录原始位置
    _sourceRect = item.getBoundingClientRect();
    const el = shell();

    // 定位到 item 位置
    el.style.top = _sourceRect.top + 'px';
    el.style.left = _sourceRect.left + 'px';
    el.style.width = _sourceRect.width + 'px';
    el.style.height = _sourceRect.height + 'px';
    el.style.borderRadius = '10px';
    el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
    el.classList.remove('expanded');
    el.style.display = 'flex';

    // 隐藏原始条目
    item.classList.add('dimmed');
    item.style.visibility = 'hidden';

    // 下一帧展开到全屏
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = '100vw';
        el.style.height = '100vh';
        el.style.borderRadius = '0';
        el.classList.add('expanded');
      });
    });
  }

  /** 关闭编辑器，缩回到原位 */
  function close() {
    const el = shell();
    if (!el.classList.contains('expanded')) return;

    // 返回前自动保存
    if (_activeItem && _onSave) {
      const newTitle = titleInput().value.trim();
      const newContent = contentInput().value.trim();
      const newCat = catSelect() ? catSelect().value : '';
      _onSave(_activeItem, newTitle, newContent, newCat);
    }

    el.classList.remove('expanded');

    if (_sourceRect) {
      el.style.top = _sourceRect.top + 'px';
      el.style.left = _sourceRect.left + 'px';
      el.style.width = _sourceRect.width + 'px';
      el.style.height = _sourceRect.height + 'px';
      el.style.borderRadius = '10px';
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
    }

    // 动画结束隐藏
    setTimeout(() => {
      if (!el.classList.contains('expanded')) {
        el.style.display = 'none';
      }
    }, 360);

    // 恢复列表
    if (_activeItem) {
      _activeItem.classList.remove('dimmed');
      _activeItem.style.visibility = '';
    }

    // 关闭回调（新建空 item 清理等）
    const item = _activeItem;
    const cb = _onClose;

    _activeItem = null;
    _sourceRect = null;
    _onSave = null;
    _onDelete = null;
    _onClose = null;

    if (cb) cb(item);
  }

  /** 保存当前编辑内容 */
  function save() {
    if (!_activeItem) return;
    // close() 内部已有自动保存，这里不需要再调 _onSave
    close();
  }

  /** 删除当前条目 */
  async function remove() {
    if (!_activeItem) return;
    if (!await showConfirm('删除确认', '确定删除这条记录？')) return;
    const item = _activeItem;
    if (_onDelete) _onDelete(item);
    close();
    // 删除动画
    item.style.transition = 'opacity 0.2s, transform 0.2s';
    item.style.opacity = '0';
    item.style.transform = 'scale(0.95)';
    setTimeout(() => item.remove(), 250);
  }

  /** 更新缩回位置（窗口 resize 时调用） */
  function refreshRect() {
    if (_activeItem && shell().classList.contains('expanded')) {
      _sourceRect = _activeItem.getBoundingClientRect();
    }
  }

  /** 是否处于展开状态 */
  function isOpen() {
    return shell().classList.contains('expanded');
  }

  return { open, close, save, remove, refreshRect, isOpen };
})();
