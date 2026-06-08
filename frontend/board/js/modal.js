/* 通用弹窗系统 */
let _alertResolve = null;
let _confirmResolve = null;

function showAlert(title, msg) {
  return new Promise(resolve => {
    _alertResolve = resolve;
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMsg').textContent = msg;
    document.getElementById('alertModal').classList.add('show');
  });
}
function resolveAlert() {
  document.getElementById('alertModal').classList.remove('show');
  if (_alertResolve) { _alertResolve(); _alertResolve = null; }
}

function showConfirm(title, msg) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    document.getElementById('confirmModal').classList.add('show');
  });
}
function resolveConfirm(result) {
  document.getElementById('confirmModal').classList.remove('show');
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}

// 点击遮罩关闭
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    if (document.getElementById('alertModal').classList.contains('show')) resolveAlert();
    if (document.getElementById('confirmModal').classList.contains('show')) resolveConfirm(false);
  }
});
