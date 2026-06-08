/* 拖拽排序 — 事件委托模式 */
var dragSrcId = null;
var dragSrcStatus = null;

(function () {
  var board = document.getElementById('board');

  board.addEventListener('dragstart', function (e) {
    // 排除：编辑中、按钮、输入框、批量模式
    if (typeof batchMode !== 'undefined' && batchMode) return;
    var card = e.target.closest('.card');
    if (!card || card.draggable === false) return;
    if (e.target.closest('button, input, .card-checkbox, .card-actions')) {
      e.preventDefault();
      return;
    }

    dragSrcId = parseInt(card.dataset.id);
    var col = card.closest('.column');
    dragSrcStatus = col ? col.dataset.status : null;

    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragSrcId));
  });

  board.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // 高亮目标卡片
    document.querySelectorAll('.card.drag-over').forEach(function (c) { c.classList.remove('drag-over'); });
    var card = e.target.closest('.card');
    if (card) {
      var id = parseInt(card.dataset.id);
      if (id !== dragSrcId) card.classList.add('drag-over');
    }
  });

  board.addEventListener('dragleave', function (e) {
    var card = e.target.closest('.card');
    if (card) card.classList.remove('drag-over');
  });

  board.addEventListener('drop', function (e) {
    e.preventDefault();
    cleanup();

    if (!dragSrcId) return;

    var card = e.target.closest('.card');
    var list = e.target.closest('.card-list');
    if (!list) return;

    var targetStatus = list.dataset.status;
    var targetId = card ? parseInt(card.dataset.id) : null;

    if (dragSrcId === targetId) return;
    performDrag(dragSrcId, dragSrcStatus, targetStatus, targetId);
  });

  board.addEventListener('dragend', function (e) {
    cleanup();
  });

  function cleanup() {
    document.querySelectorAll('.card.dragging, .card.drag-over').forEach(function (c) {
      c.classList.remove('dragging', 'drag-over');
    });
  }
})();

async function performDrag(srcId, srcStatus, targetStatus, targetBelowId) {
  var srcTask = tasks.find(function (t) { return t.id === srcId; });
  if (!srcTask) return;

  // 跨列：更新状态
  if (srcStatus !== targetStatus) {
    srcTask.status = targetStatus;
    srcTask.done_date = targetStatus === 'done' ? todayStr() : '';
    if (targetStatus === 'todo') srcTask.pinned = 0;
  }

  // 从 tasks 中移除源卡片
  tasks = tasks.filter(function (t) { return t.id !== srcId; });

  // 目标列已有项目（按 sort_order 降序 = 视觉从上到下）
  var colItems = tasks
    .filter(function (t) { return t.status === targetStatus; })
    .sort(function (a, b) { return b.sort_order - a.sort_order; });

  // 插入到指定位置：targetBelowId 表示放在该卡片上方
  if (targetBelowId) {
    var idx = colItems.findIndex(function (t) { return t.id === targetBelowId; });
    if (idx >= 0) colItems.splice(idx, 0, srcTask);
    else colItems.push(srcTask);
  } else {
    colItems.push(srcTask);
  }

  // 重算 sort_order：最大值在顶部（配合 DESC 排序）
  var total = colItems.length;
  var updates = [];
  colItems.forEach(function (t, i) {
    var ord = total - i;
    t.sort_order = ord;
    updates.push({ id: t.id, sort_order: ord });
  });

  // 合并回 tasks：保留非目标列 + 目标列新顺序
  tasks = tasks.filter(function (t) { return t.status !== targetStatus; }).concat(colItems);

  renderAll();

  // 持久化到后端
  try {
    await fetch('/api/tasks/batch-sort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: updates })
    });
  } catch (e) {
    console.error('[drag] 排序保存失败:', e);
  }
}
