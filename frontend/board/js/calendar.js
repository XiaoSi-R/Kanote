/* 日历弹窗 */
let calYear, calMonth;

function toggleCalendar(e) {
  e.stopPropagation();
  const popup = document.getElementById('calendarPopup');
  if (popup.classList.contains('show')) { popup.classList.remove('show'); return; }
  const d = new Date(viewingDate || todayStr());
  calYear = d.getFullYear(); calMonth = d.getMonth();
  renderCalendar(); popup.classList.add('show');
}

function renderCalendar() {
  const popup = document.getElementById('calendarPopup');
  const today = todayStr();
  const viewDate = viewingDate || today;
  const doneDates = new Set(tasks.filter(t => t.status === 'done').map(t => t.done_date));
  const weekDays = ['日','一','二','三','四','五','六'];
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  let html = `<div class="calendar-header">
    <button onclick="event.stopPropagation(); calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar()">◀</button>
    <span>${calYear}年${calMonth+1}月</span>
    <button onclick="event.stopPropagation(); calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar()">▶</button>
  </div>`;
  html += '<div class="calendar-weekdays">' + weekDays.map(d => `<span>${d}</span>`).join('') + '</div>';
  html += '<div class="calendar-days">';
  for (let i = 0; i < firstDay; i++) html += '<span></span>';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = dateStr === today;
    const isSelected = dateStr === viewDate;
    const isFuture = dateStr > today;
    const hasDone = doneDates.has(dateStr);
    let cls = '';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    html += `<button class="${cls}${hasDone ? ' has-done' : ''}"
      onclick="event.stopPropagation(); pickDate('${dateStr}')"
      ${isFuture ? 'disabled' : ''}>${day}</button>`;
  }
  html += '</div>';
  popup.innerHTML = html;
}

function pickDate(dateStr) {
  viewingDate = dateStr;
  document.getElementById('calendarPopup').classList.remove('show');
  renderAll();
}

// 点击其他地方关闭日历
document.addEventListener('click', function(e) {
  if (!e.target.closest('.calendar-popup') && !e.target.closest('.date-label')) {
    document.getElementById('calendarPopup').classList.remove('show');
  }
});
