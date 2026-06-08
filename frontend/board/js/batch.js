/* 批量操作模块 */
var batchMode = false;
var selectedIds = new Set();

function toggleBatchMode() {
  batchMode = !batchMode;
  selectedIds.clear();
  document.body.classList.toggle('batch-mode', batchMode);
  document.getElementById('batchBar').classList.toggle('show', batchMode);
  document.querySelectorAll('.card.selected').forEach(function (c) { c.classList.remove('selected'); });
  updateBatchCount();
}

function toggleSelectAll() {
  if (!batchMode) return;
  var cards = document.querySelectorAll('#boardSection .card');
  var allSelected = cards.length > 0 && selectedIds.size === cards.length;

  if (allSelected) {
    selectedIds.clear();
    cards.forEach(function (c) { c.classList.remove('selected'); });
  } else {
    cards.forEach(function (c) {
      var id = parseInt(c.dataset.id);
      if (!isNaN(id)) { selectedIds.add(id); }
      c.classList.add('selected');
    });
  }
  updateBatchCount();
}

function toggleCardSelect(id) {
  if (!batchMode) return;
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
  var card = document.querySelector('.card[data-id="' + id + '"]');
  if (card) card.classList.toggle('selected', selectedIds.has(id));
  updateBatchCount();
}

function updateBatchCount() {
  var bar = document.getElementById('batchBar');
  if (!bar) return;
  bar.querySelector('.batch-count').textContent = '已选 ' + selectedIds.size + ' 项';
  bar.querySelector('.batch-del-btn').disabled = selectedIds.size === 0;
  var total = document.querySelectorAll('#boardSection .card').length;
  bar.querySelector('.batch-select-all-btn').textContent =
    total > 0 && selectedIds.size === total ? '取消全选' : '全选';
}

async function batchDelete() {
  if (selectedIds.size === 0) return;
  var ok = await showConfirm('批量删除', '确定删除选中的 ' + selectedIds.size + ' 条记录？');
  if (!ok) return;

  selectedIds.forEach(function (id) {
    var card = document.querySelector('.card[data-id="' + id + '"]');
    if (card) card.classList.add('animate-out');
  });
  await sleep(250);

  var ids = Array.from(selectedIds);
  try {
    var res = await fetch('/api/tasks/batch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ids })
    });
    var data = await res.json();
    if (data.ok) {
      selectedIds.clear();
      toggleBatchMode();
      await loadTasks();
      renderAll();
      showAlert('批量删除', '已删除 ' + data.deleted + ' 条记录');
    }
  } catch (e) {
    showAlert('删除失败', e.message);
  }
}

// 批量模式下点击卡片选中
document.addEventListener('click', function (e) {
  if (!batchMode) return;
  var card = e.target.closest('.card');
  if (!card) return;
  var id = parseInt(card.dataset.id);
  if (isNaN(id)) return;
  if (e.target.closest('button, input, .card-actions')) return;
  e.preventDefault();
  toggleCardSelect(id);
});
