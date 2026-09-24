/**
 * 【日程管理】HTML互動看板 - 核心 Logic 模組
 * 包含：動態時鐘、時間軸網格、膠囊卡片拖曳 (Drag&Drop)、
 * 假日 API 擷取、GAS Web App 串接、備份/匯入/匯出與 iCal 檔案解析
 */

(function () {
  'use strict';

  // ==========================================
  // 1. 全局狀態管理 (State)
  // ==========================================
  const state = {
    currentView: 'week', // 'week' | 'month' | 'day' | 'year'
    currentDate: new Date(),
    categories: ['前端開發', '社群選題', '會議與企劃', '日常庶務'],
    tasks: [],
    holidays: {}, // e.g. { '2026-09-28': '教師節', '2026-10-10': '國慶日' }
    gasUrl: localStorage.getItem('schedule_board_gas_url') || '',
    draggedTaskId: null
  };

  // 預設示範資料
  const DEFAULT_TASKS = [
    {
      id: 'task-1',
      name: '完成日程管理看板樣式設計',
      category: '前端開發',
      color: 'PUMPKIN',
      date: formatDateStr(new Date()),
      priority: 'high',
      completed: false,
      desc: '使用 ASH EGGSHELL 與 SPECKLED SLATE 色系完成 HTML/CSS 刻板'
    },
    {
      id: 'task-2',
      name: '撰寫 2026 Q4 社群趨勢報告選題',
      category: '社群選題',
      color: 'YOLK',
      date: formatDateStr(addDays(new Date(), 1)),
      priority: 'medium',
      completed: false,
      desc: '規劃 AI 自動化排程專題與設計圖'
    },
    {
      id: 'task-3',
      name: '產品週會與 GAS 後端串接討論',
      category: '會議與企劃',
      color: 'CEFRADINE',
      date: formatDateStr(addDays(new Date(), 2)),
      priority: 'low',
      completed: true,
      desc: '準備測試環境與 Google Apps Script code'
    }
  ];

  // ==========================================
  // 2. DOM 元素快取 (DOM Elements)
  // ==========================================
  const DOM = {
    // Clock
    clockYear: document.getElementById('clock-year'),
    clockDate: document.getElementById('clock-date'),
    clockSub: document.getElementById('clock-sub'),
    mobileMiniDate: document.getElementById('mobile-mini-date'),

    // Sidebar & Navigation
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    hamburgerBtn: document.getElementById('hamburger-btn'),
    sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
    navBtns: document.querySelectorAll('.nav-btn'),

    // Main Header & Controls
    viewTitle: document.getElementById('current-view-title'),
    btnPrev: document.getElementById('btn-prev-period'),
    btnToday: document.getElementById('btn-today'),
    btnNext: document.getElementById('btn-next-period'),
    btnQuickAdd: document.getElementById('btn-quick-add-task'),
    syncBanner: document.getElementById('sync-banner'),
    syncBannerText: document.getElementById('sync-banner-text'),

    // Board Grid
    timelineBoard: document.getElementById('timeline-board'),

    // Sub Nav Buttons
    btnImport: document.getElementById('btn-import'),
    btnBackup: document.getElementById('btn-backup'),
    btnExport: document.getElementById('btn-export'),
    btnGasConfig: document.getElementById('btn-gas-config'),
    btnSettings: document.getElementById('btn-settings'),
    gasStatusDot: document.getElementById('gas-status-dot'),

    // Modals
    modalTask: document.getElementById('modal-task'),
    modalTaskTitle: document.getElementById('modal-task-title'),
    formTask: document.getElementById('form-task'),
    taskIdInput: document.getElementById('task-id'),
    taskNameInput: document.getElementById('task-name'),
    taskCategorySelect: document.getElementById('task-category'),
    taskColorSelect: document.getElementById('task-color'),
    taskDateInput: document.getElementById('task-date'),
    taskPrioritySelect: document.getElementById('task-priority'),
    taskDescInput: document.getElementById('task-desc'),
    taskCompletedCheck: document.getElementById('task-completed'),
    btnDeleteTask: document.getElementById('btn-delete-task'),

    modalCategory: document.getElementById('modal-category'),
    formCategory: document.getElementById('form-category'),
    categoryNameInput: document.getElementById('category-name'),

    modalGas: document.getElementById('modal-gas'),
    gasUrlInput: document.getElementById('gas-url'),
    btnTestGas: document.getElementById('btn-test-gas'),
    btnSaveGas: document.getElementById('btn-save-gas'),
    btnDisconnectGas: document.getElementById('btn-disconnect-gas'),
    btnCopyGasCode: document.getElementById('btn-copy-gas-code'),
    gasTestResult: document.getElementById('gas-test-result'),

    modalImport: document.getElementById('modal-import'),
    importTypeSelect: document.getElementById('import-type'),
    importFileInput: document.getElementById('import-file'),
    importPreview: document.getElementById('import-preview'),
    importSummary: document.getElementById('import-summary'),
    btnConfirmImport: document.getElementById('btn-confirm-import'),

    modalExport: document.getElementById('modal-export'),
    btnExportJson: document.getElementById('btn-export-json'),
    btnExportCsv: document.getElementById('btn-export-csv'),

    toastContainer: document.getElementById('toast-container')
  };

  // ==========================================
  // 3. 初始化與事件綁定 (Initialization)
  // ==========================================
  function init() {
    loadLocalData();
    startClock();
    bindEvents();
    fetchTaiwanHolidays(state.currentDate.getFullYear());
    updateGasStatusUI();

    if (state.gasUrl) {
      syncFromGAS();
    } else {
      renderBoard();
    }
  }

  // 資料載入 (LocalStorage)
  function loadLocalData() {
    const savedCategories = localStorage.getItem('schedule_board_categories');
    if (savedCategories) {
      try { state.categories = JSON.parse(savedCategories); } catch (e) {}
    }

    const savedTasks = localStorage.getItem('schedule_board_tasks');
    if (savedTasks) {
      try { state.tasks = JSON.parse(savedTasks); } catch (e) {}
    } else {
      state.tasks = DEFAULT_TASKS;
      saveLocalData();
    }
  }

  function saveLocalData() {
    localStorage.setItem('schedule_board_categories', JSON.stringify(state.categories));
    localStorage.setItem('schedule_board_tasks', JSON.stringify(state.tasks));
    if (state.gasUrl) {
      syncToGAS();
    }
  }

  // ==========================================
  // 4. 時鐘與日期工具函式 (Clock & Helpers)
  // ==========================================
  function startClock() {
    updateClockUI();
    setInterval(updateClockUI, 1000);
  }

  function updateClockUI() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[now.getDay()];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    DOM.clockYear.textContent = `${year} 年`;
    DOM.clockDate.textContent = `${month}/${date}`;
    DOM.clockSub.textContent = `${weekday} ${hours}:${minutes}:${seconds}`;
    DOM.mobileMiniDate.textContent = `${month}/${date}`;
  }

  function formatDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function getWeekRange(d) {
    const curr = new Date(d);
    const dayOfWeek = curr.getDay(); // 0 是週日, 1 是週一 ... 6 是週六
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - diffToMonday);
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(monday, i));
    }
    return days;
  }

  function getMonthDays(d) {
    const year = d.getFullYear();
    const month = d.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }

  // ==========================================
  // 5. 假日 API 擷取 (Taiwan Holidays)
  // ==========================================
  async function fetchTaiwanHolidays(year) {
    try {
      const res = await fetch(`https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`);
      if (res.ok) {
        const data = await res.json();
        data.forEach(item => {
          if (item.isHoliday) {
            // format date e.g. 20260928 -> 2026-09-28
            const formatted = `${item.date.slice(0, 4)}-${item.date.slice(4, 6)}-${item.date.slice(6, 8)}`;
            state.holidays[formatted] = item.description || '國定假日';
          }
        });
        renderBoard();
      }
    } catch (err) {
      console.log('無法載入國定假日 API，採用本地備援模式', err);
    }
  }

  // ==========================================
  // 6. 時間軸網格渲染邏輯 (Grid Rendering)
  // ==========================================
  function renderBoard() {
    const board = DOM.timelineBoard;
    board.innerHTML = '';

    // ===================================
    // A. 年度計畫：12 個月份呈現
    // ===================================
    if (state.currentView === 'year') {
      const currentYear = state.currentDate.getFullYear();
      DOM.viewTitle.textContent = `${currentYear} 年度計畫 (12 個月份)`;

      const months = [];
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        months.push({
          num: m,
          monthStr: `${currentYear}-${mStr}`,
          label: `${m} 月`
        });
      }

      // 180px Y 軸分類 + 12 欄月份
      board.style.gridTemplateColumns = `180px repeat(12, minmax(130px, 1fr))`;

      // 1. Top Left Header Cell
      const topLeftCell = document.createElement('div');
      topLeftCell.className = 'header-cell y-axis-header';
      topLeftCell.style.position = 'sticky';
      topLeftCell.style.left = '0';
      topLeftCell.style.zIndex = '20';
      topLeftCell.innerHTML = `<span>專案 / 任務分類</span>`;
      board.appendChild(topLeftCell);

      // 2. X-Axis Month Header Cells
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      months.forEach(m => {
        const isCurrentMonth = m.monthStr === currentMonthStr;
        const headerCell = document.createElement('div');
        headerCell.className = `header-cell ${isCurrentMonth ? 'is-today' : ''}`;
        headerCell.innerHTML = `
          <div class="day-name">${currentYear} 年</div>
          <div class="day-num" style="font-size:1.15rem; font-weight:800;">${m.label}</div>
        `;
        board.appendChild(headerCell);
      });

      // 3. Y-Axis Categories and Month Grid Content Cells
      state.categories.forEach(cat => {
        const catHeaderCell = document.createElement('div');
        catHeaderCell.className = 'y-axis-header';
        catHeaderCell.innerHTML = `
          <span class="cat-title">${escapeHTML(cat)}</span>
          <button class="icon-btn btn-delete-cat" data-cat="${escapeHTML(cat)}" title="刪除此分類">
            <i class="fa-solid fa-xmark" style="font-size:0.85rem; opacity:0.6;"></i>
          </button>
        `;
        board.appendChild(catHeaderCell);

        months.forEach(m => {
          const cell = document.createElement('div');
          cell.className = 'grid-cell';
          cell.dataset.month = m.monthStr;
          cell.dataset.category = cat;

          cell.addEventListener('dragover', handleDragOver);
          cell.addEventListener('dragleave', handleDragLeave);
          cell.addEventListener('drop', handleDrop);

          cell.addEventListener('click', (e) => {
            if (e.target === cell) {
              openTaskModal(null, cat, `${m.monthStr}-01`);
            }
          });

          // 篩選屬於該年度與月份的任務
          const matchingTasks = state.tasks.filter(t => t.category === cat && t.date && t.date.startsWith(m.monthStr));
          matchingTasks.forEach(task => {
            const taskCapsule = createTaskCapsule(task, true);
            cell.appendChild(taskCapsule);
          });

          board.appendChild(cell);
        });
      });

      // 4. Bottom Y-Axis Add Button Cell
      const addYCell = document.createElement('div');
      addYCell.className = 'y-axis-add-cell';
      addYCell.innerHTML = `<button class="btn-add-y-axis" id="btn-open-category-modal"><i class="fa-solid fa-plus"></i> 增加項目</button>`;
      board.appendChild(addYCell);

      for (let i = 0; i < 12; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'grid-cell';
        emptyCell.style.backgroundColor = 'var(--bg-sidebar)';
        emptyCell.style.opacity = '0.5';
        board.appendChild(emptyCell);
      }

      bindCategoryActionButtons();
      return;
    }

    // ===================================
    // B. 週 / 月 / 日 一般時間軸網格
    // ===================================
    let dates = [];
    if (state.currentView === 'week') {
      dates = getWeekRange(state.currentDate);
      DOM.viewTitle.textContent = `本週任務時間軸 (${formatDateStr(dates[0])} ~ ${formatDateStr(dates[6])})`;
    } else if (state.currentView === 'month') {
      dates = getMonthDays(state.currentDate);
      const mName = state.currentDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });
      DOM.viewTitle.textContent = `${mName} 計畫看板`;
    } else if (state.currentView === 'day') {
      dates = [state.currentDate];
      DOM.viewTitle.textContent = `本日任務 (${formatDateStr(state.currentDate)})`;
    }

    const numCols = dates.length;
    // CSS Grid Layout: First column for Y-axis (width: 180px), remaining for dates
    board.style.gridTemplateColumns = `180px repeat(${numCols}, minmax(90px, 1fr))`;

    // 1. Render Top Left Header Cell
    const topLeftCell = document.createElement('div');
    topLeftCell.className = 'header-cell y-axis-header';
    topLeftCell.style.position = 'sticky';
    topLeftCell.style.left = '0';
    topLeftCell.style.zIndex = '20';
    topLeftCell.innerHTML = `<span>專案 / 任務分類</span>`;
    board.appendChild(topLeftCell);

    // 2. Render X-Axis Date Header Cells
    const todayStr = formatDateStr(new Date());
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

    dates.forEach(d => {
      const dateStr = formatDateStr(d);
      const dayNum = d.getDate();
      const weekdayStr = weekdays[d.getDay()];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isToday = dateStr === todayStr;
      const holidayDesc = state.holidays[dateStr];

      const headerCell = document.createElement('div');
      headerCell.className = `header-cell ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''} ${holidayDesc ? 'is-holiday' : ''}`;
      
      let html = `<div class="day-name">週${weekdayStr}</div><div class="day-num">${d.getMonth() + 1}/${dayNum}</div>`;
      if (holidayDesc) {
        html += `<span class="holiday-tag">${holidayDesc}</span>`;
      }
      headerCell.innerHTML = html;
      board.appendChild(headerCell);
    });

    // 3. Render Y-Axis Categories and Grid Content Cells
    state.categories.forEach(cat => {
      // Y-axis Row Header
      const catHeaderCell = document.createElement('div');
      catHeaderCell.className = 'y-axis-header';
      catHeaderCell.innerHTML = `
        <span class="cat-title">${escapeHTML(cat)}</span>
        <button class="icon-btn btn-delete-cat" data-cat="${escapeHTML(cat)}" title="刪除此分類">
          <i class="fa-solid fa-xmark" style="font-size:0.85rem; opacity:0.6;"></i>
        </button>
      `;
      board.appendChild(catHeaderCell);

      // Grid Cells for each Date column
      dates.forEach(d => {
        const dateStr = formatDateStr(d);
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.date = dateStr;
        cell.dataset.category = cat;

        // Drag & Drop event listeners on Cell
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('dragleave', handleDragLeave);
        cell.addEventListener('drop', handleDrop);

        // Click on Cell to quick add task (especially for mobile)
        cell.addEventListener('click', (e) => {
          if (e.target === cell) {
            openTaskModal(null, cat, dateStr);
          }
        });

        // Filter tasks belonging to this Category & Date
        const matchingTasks = state.tasks.filter(t => t.category === cat && t.date === dateStr);
        matchingTasks.forEach(task => {
          const taskCapsule = createTaskCapsule(task, false);
          cell.appendChild(taskCapsule);
        });

        board.appendChild(cell);
      });
    });

    // 4. Render Bottom Y-Axis Add Button Cell
    const addYCell = document.createElement('div');
    addYCell.className = 'y-axis-add-cell';
    addYCell.innerHTML = `<button class="btn-add-y-axis" id="btn-open-category-modal"><i class="fa-solid fa-plus"></i> 增加項目</button>`;
    board.appendChild(addYCell);

    // Empty grid cells for the remaining columns in the bottom row
    for (let i = 0; i < numCols; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'grid-cell';
      emptyCell.style.backgroundColor = 'var(--bg-sidebar)';
      emptyCell.style.opacity = '0.5';
      board.appendChild(emptyCell);
    }

    bindCategoryActionButtons();
  }

  function bindCategoryActionButtons() {
    const addBtn = document.getElementById('btn-open-category-modal');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        DOM.modalCategory.classList.add('active');
      });
    }

    document.querySelectorAll('.btn-delete-cat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catToDelete = btn.dataset.cat;
        deleteCategory(catToDelete);
      });
    });
  }

  // ==========================================
  // 7. 圓角膠囊卡片 (Capsule Task Component)
  // ==========================================
  function createTaskCapsule(task, showDate = false) {
    const el = document.createElement('div');
    el.className = `capsule-task bg-${task.color} ${task.completed ? 'completed' : ''}`;
    el.draggable = true;
    el.dataset.id = task.id;

    const dateBadge = (showDate && task.date) ? `<span style="font-size:0.75rem; opacity:0.85; margin-right:4px;">[${task.date.slice(5)}]</span>` : '';

    el.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
      <span class="task-text" title="${escapeHTML(task.name)}">${dateBadge}${escapeHTML(task.name)}</span>
    `;

    // Checkbox toggle
    const checkbox = el.querySelector('.task-checkbox');
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      task.completed = checkbox.checked;
      if (task.completed) {
        el.classList.add('completed');
      } else {
        el.classList.remove('completed');
      }
      saveLocalData();
    });

    // Task Click -> Open Edit Modal
    el.addEventListener('click', (e) => {
      if (e.target !== checkbox) {
        openTaskModal(task);
      }
    });

    // Drag & Drop handlers
    el.addEventListener('dragstart', (e) => {
      state.draggedTaskId = task.id;
      el.classList.add('dragging');
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      state.draggedTaskId = null;
    });

    return el;
  }

  // ==========================================
  // 8. 拖曳與排期 (Drag & Drop Handlers)
  // ==========================================
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('cell-drag-over');
  }

  function handleDragLeave() {
    this.classList.remove('cell-drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('cell-drag-over');

    const taskId = e.dataTransfer.getData('text/plain') || state.draggedTaskId;
    if (!taskId) return;

    const task = state.tasks.find(t => t.id === taskId);
    const targetDate = this.dataset.date;
    const targetMonth = this.dataset.month;
    const targetCategory = this.dataset.category;

    if (task && targetCategory) {
      if (targetDate) {
        if (task.date !== targetDate || task.category !== targetCategory) {
          task.date = targetDate;
          task.category = targetCategory;
          saveLocalData();
          renderBoard();
          showToast(`已移動任務「${task.name}」至 ${targetDate}`);
        }
      } else if (targetMonth) {
        const originalDay = task.date ? task.date.slice(8, 10) : '01';
        const [y, m] = targetMonth.split('-').map(Number);
        const maxDays = new Date(y, m, 0).getDate();
        const safeDay = String(Math.min(Number(originalDay), maxDays)).padStart(2, '0');
        const newDate = `${targetMonth}-${safeDay}`;
        if (task.date !== newDate || task.category !== targetCategory) {
          task.date = newDate;
          task.category = targetCategory;
          saveLocalData();
          renderBoard();
          showToast(`已排程任務「${task.name}」至 ${targetMonth} 月 (${newDate})`);
        }
      }
    }
  }

  // ==========================================
  // 9. MODALS 邏輯 (Task & Category & Settings)
  // ==========================================
  function openTaskModal(task = null, defaultCat = null, defaultDate = null) {
    // Populate Category dropdown
    DOM.taskCategorySelect.innerHTML = state.categories.map(c => 
      `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`
    ).join('');

    if (task) {
      DOM.modalTaskTitle.textContent = '編輯任務細節';
      DOM.taskIdInput.value = task.id;
      DOM.taskNameInput.value = task.name;
      DOM.taskCategorySelect.value = task.category;
      DOM.taskColorSelect.value = task.color || 'YOLK';
      DOM.taskDateInput.value = task.date;
      DOM.taskPrioritySelect.value = task.priority || 'medium';
      DOM.taskDescInput.value = task.desc || '';
      DOM.taskCompletedCheck.checked = !!task.completed;
      DOM.btnDeleteTask.classList.remove('hidden');
    } else {
      DOM.modalTaskTitle.textContent = '新增任務細節';
      DOM.formTask.reset();
      DOM.taskIdInput.value = '';
      DOM.taskCategorySelect.value = defaultCat || state.categories[0] || '';
      DOM.taskColorSelect.value = 'YOLK';
      DOM.taskDateInput.value = defaultDate || formatDateStr(state.currentDate);
      DOM.taskPrioritySelect.value = 'medium';
      DOM.taskCompletedCheck.checked = false;
      DOM.btnDeleteTask.classList.add('hidden');
    }

    DOM.modalTask.classList.add('active');
  }

  function handleTaskFormSubmit(e) {
    e.preventDefault();
    const id = DOM.taskIdInput.value;
    const name = DOM.taskNameInput.value.trim();
    const category = DOM.taskCategorySelect.value;
    const color = DOM.taskColorSelect.value;
    const date = DOM.taskDateInput.value;
    const priority = DOM.taskPrioritySelect.value;
    const desc = DOM.taskDescInput.value.trim();
    const completed = DOM.taskCompletedCheck.checked;

    if (!name || !category || !date) return;

    if (id) {
      // Update existing
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        task.name = name;
        task.category = category;
        task.color = color;
        task.date = date;
        task.priority = priority;
        task.desc = desc;
        task.completed = completed;
      }
    } else {
      // Create new
      const newTask = {
        id: 'task-' + Date.now(),
        name,
        category,
        color,
        date,
        priority,
        desc,
        completed
      };
      state.tasks.push(newTask);
    }

    saveLocalData();
    renderBoard();
    closeAllModals();
    showToast('任務已成功儲存！');
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveLocalData();
    renderBoard();
    closeAllModals();
    showToast('任務已刪除');
  }

  function addCategory(name) {
    name = name.trim();
    if (!name || state.categories.includes(name)) return;
    state.categories.push(name);
    saveLocalData();
    renderBoard();
    closeAllModals();
    showToast(`已新增分類「${name}」`);
  }

  function deleteCategory(name) {
    if (confirm(`確定要刪除分類「${name}」嗎？包含的任務也會被移除。`)) {
      state.categories = state.categories.filter(c => c !== name);
      state.tasks = state.tasks.filter(t => t.category !== name);
      saveLocalData();
      renderBoard();
      showToast(`已刪除分類「${name}」`);
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  }

  // ==========================================
  // 10. GAS (Google Apps Script) 整合
  // ==========================================
  function updateGasStatusUI() {
    if (state.gasUrl) {
      DOM.gasStatusDot.className = 'status-dot connected';
      DOM.syncBanner.classList.remove('hidden');
    } else {
      DOM.gasStatusDot.className = 'status-dot disconnected';
      DOM.syncBanner.classList.add('hidden');
    }
  }

  async function syncFromGAS() {
    if (!state.gasUrl) return;
    DOM.syncBannerText.textContent = '同步中：正在從 Google Sheets 讀取資料...';
    try {
      const res = await fetch(`${state.gasUrl}?action=get`);
      const json = await res.json();
      if (json.status === 'success') {
        if (json.categories && Array.isArray(json.categories)) state.categories = json.categories;
        if (json.tasks && Array.isArray(json.tasks)) state.tasks = json.tasks;
        saveLocalData();
        renderBoard();
        DOM.syncBannerText.textContent = '同步狀態：已連線至 Google Sheets';
      }
    } catch (err) {
      console.error('GAS Sync Error:', err);
      DOM.syncBannerText.textContent = '連線失敗：使用 LocalStorage 本地儲存';
    }
  }

  async function syncToGAS() {
    if (!state.gasUrl) return;
    try {
      await fetch(state.gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          categories: state.categories,
          tasks: state.tasks
        })
      });
    } catch (err) {
      console.error('GAS Save Error:', err);
    }
  }

  // ==========================================
  // 11. 備份、匯入、導出與 iCal 檔案解析
  // ==========================================
  function exportDataJSON() {
    const data = {
      categories: state.categories,
      tasks: state.tasks,
      exportAt: new Date().toISOString()
    };
    downloadFile(JSON.stringify(data, null, 2), `Schedule_Board_Backup_${formatDateStr(new Date())}.json`, 'application/json');
    showToast('已完成 JSON 備份檔下載！');
  }

  function exportDataCSV() {
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'ID,任務名稱,分類,顏色,日期,優先級,完成狀態,說明\n';
    state.tasks.forEach(t => {
      const row = [
        t.id,
        `"${(t.name || '').replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.color,
        t.date,
        t.priority,
        t.completed ? '已完成' : '未完成',
        `"${(t.desc || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    });
    downloadFile(csv, `Schedule_Board_Tasks_${formatDateStr(new Date())}.csv`, 'text/csv;charset=utf-8;');
    showToast('已完成 CSV 匯出！');
  }

  function parseICSContent(icsText) {
    const tasks = [];
    const events = icsText.split('BEGIN:VEVENT');
    
    events.slice(1).forEach(ev => {
      const summaryMatch = ev.match(/SUMMARY:(.*)/);
      const dtStartMatch = ev.match(/DTSTART.*:(\d{8})/);
      const descMatch = ev.match(/DESCRIPTION:(.*)/);

      if (summaryMatch && dtStartMatch) {
        const name = summaryMatch[1].trim();
        const rawDate = dtStartMatch[1];
        const dateStr = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
        const desc = descMatch ? descMatch[1].trim() : '';

        tasks.push({
          id: 'ics-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          name: name,
          category: state.categories[0] || '第三方行事曆',
          color: 'CEFRADINE',
          date: dateStr,
          priority: 'medium',
          completed: false,
          desc: desc
        });
      }
    });

    return tasks;
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Toast 提示
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==========================================
  // 12. 事件總線 (Event Listeners)
  // ==========================================
  function bindEvents() {
    // 側邊欄切換與 Mobile Hamburger
    DOM.hamburgerBtn.addEventListener('click', () => {
      DOM.sidebar.classList.add('active');
      DOM.sidebarOverlay.classList.add('active');
    });

    const closeSidebar = () => {
      DOM.sidebar.classList.remove('active');
      DOM.sidebarOverlay.classList.remove('active');
    };

    DOM.sidebarCloseBtn.addEventListener('click', closeSidebar);
    DOM.sidebarOverlay.addEventListener('click', closeSidebar);

    // 視圖切換
    DOM.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled')) {
          showToast('此功能正在規劃中...');
          return;
        }
        DOM.navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentView = btn.dataset.view;
        renderBoard();
        closeSidebar();
      });
    });

    // Header Controls
    DOM.btnToday.addEventListener('click', () => {
      state.currentDate = new Date();
      renderBoard();
    });

    DOM.btnPrev.addEventListener('click', () => {
      if (state.currentView === 'year') {
        state.currentDate.setFullYear(state.currentDate.getFullYear() - 1);
        fetchTaiwanHolidays(state.currentDate.getFullYear());
      } else if (state.currentView === 'week') {
        state.currentDate = addDays(state.currentDate, -7);
      } else if (state.currentView === 'month') {
        state.currentDate.setMonth(state.currentDate.getMonth() - 1);
      } else if (state.currentView === 'day') {
        state.currentDate = addDays(state.currentDate, -1);
      }
      renderBoard();
    });

    DOM.btnNext.addEventListener('click', () => {
      if (state.currentView === 'year') {
        state.currentDate.setFullYear(state.currentDate.getFullYear() + 1);
        fetchTaiwanHolidays(state.currentDate.getFullYear());
      } else if (state.currentView === 'week') {
        state.currentDate = addDays(state.currentDate, 7);
      } else if (state.currentView === 'month') {
        state.currentDate.setMonth(state.currentDate.getMonth() + 1);
      } else if (state.currentView === 'day') {
        state.currentDate = addDays(state.currentDate, 1);
      }
      renderBoard();
    });

    DOM.btnQuickAdd.addEventListener('click', () => openTaskModal());

    // Modal Cancel / Close Buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', closeAllModals);
    });

    // Form Submissions
    DOM.formTask.addEventListener('submit', handleTaskFormSubmit);
    DOM.btnDeleteTask.addEventListener('click', () => {
      const id = DOM.taskIdInput.value;
      if (id && confirm('確定要刪除此任務嗎？')) {
        deleteTask(id);
      }
    });

    DOM.formCategory.addEventListener('submit', (e) => {
      e.preventDefault();
      addCategory(DOM.categoryNameInput.value);
      DOM.categoryNameInput.value = '';
    });

    // GAS Settings
    DOM.btnGasConfig.addEventListener('click', () => {
      DOM.gasUrlInput.value = state.gasUrl;
      DOM.gasTestResult.textContent = '';
      if (state.gasUrl) {
        DOM.btnDisconnectGas.classList.remove('hidden');
      } else {
        DOM.btnDisconnectGas.classList.add('hidden');
      }
      DOM.modalGas.classList.add('active');
    });

    if (DOM.btnCopyGasCode) {
      DOM.btnCopyGasCode.addEventListener('click', () => {
        const gasCode = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetTasks = getOrCreateSheet(ss, "Tasks");
  var sheetCategories = getOrCreateSheet(ss, "Categories");

  var tasks = readTasksFromSheet(sheetTasks);
  var categories = readCategoriesFromSheet(sheetCategories);

  var output = {
    status: "success",
    tasks: tasks,
    categories: categories
  };

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var sheetTasks = getOrCreateSheet(ss, "Tasks");
    var sheetCategories = getOrCreateSheet(ss, "Categories");

    if (data.categories && Array.isArray(data.categories)) {
      writeCategoriesToSheet(sheetCategories, data.categories);
    }

    if (data.tasks && Array.isArray(data.tasks)) {
      writeTasksToSheet(sheetTasks, data.tasks);
    }

    var result = { status: "success", message: "Data synced successfully" };
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errorResult = { status: "error", message: err.toString() };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === "Tasks") {
      sheet.appendRow(["ID", "Name", "Category", "Color", "Date", "Priority", "Completed", "Desc"]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold");
    } else if (sheetName === "Categories") {
      sheet.appendRow(["CategoryName"]);
      sheet.getRange(1, 1, 1, 1).setFontWeight("bold");
    }
  }
  return sheet;
}

function readTasksFromSheet(sheet) {
  var data = sheet.getDataRange().getValues();
  var tasks = [];
  if (data.length <= 1) return tasks;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0]) {
      tasks.push({
        id: String(row[0]),
        name: String(row[1] || ""),
        category: String(row[2] || ""),
        color: String(row[3] || "YOLK"),
        date: formatDateString(row[4]),
        priority: String(row[5] || "medium"),
        completed: row[6] === true || row[6] === "true",
        desc: String(row[7] || "")
      });
    }
  }
  return tasks;
}

function writeTasksToSheet(sheet, tasks) {
  sheet.clearContents();
  sheet.appendRow(["ID", "Name", "Category", "Color", "Date", "Priority", "Completed", "Desc"]);
  sheet.getRange(1, 1, 1, 8).setFontWeight("bold");

  var rows = [];
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    rows.push([
      t.id,
      t.name,
      t.category,
      t.color,
      t.date,
      t.priority,
      t.completed,
      t.desc || ""
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }
}

function readCategoriesFromSheet(sheet) {
  var data = sheet.getDataRange().getValues();
  var categories = [];
  if (data.length <= 1) return ["前端開發", "社群選題", "會議與企劃", "日常庶務"];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) categories.push(String(data[i][0]));
  }
  return categories;
}

function writeCategoriesToSheet(sheet, categories) {
  sheet.clearContents();
  sheet.appendRow(["CategoryName"]);
  sheet.getRange(1, 1, 1, 1).setFontWeight("bold");

  var rows = categories.map(function(c) { return [c]; });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 1).setValues(rows);
  }
}

function formatDateString(d) {
  if (!d) return "";
  if (d instanceof Date) {
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return y + "-" + m + "-" + day;
  }
  return String(d);
}`;

        navigator.clipboard.writeText(gasCode).then(() => {
          showToast('已複製通用 Code.gs 程式碼到剪貼簿！');
        }).catch(() => {
          showToast('無法自動複製，請手動複製 Code.gs 檔案');
        });
      });
    }

    if (DOM.btnDisconnectGas) {
      DOM.btnDisconnectGas.addEventListener('click', () => {
        if (confirm('確定要解除 Google 試算表連線嗎？之後將切換為純瀏覽器離線模式。')) {
          state.gasUrl = '';
          localStorage.removeItem('schedule_board_gas_url');
          DOM.gasUrlInput.value = '';
          updateGasStatusUI();
          closeAllModals();
          showToast('已解除連線，目前為本機離線模式');
        }
      });
    }

    DOM.btnTestGas.addEventListener('click', async () => {
      const url = DOM.gasUrlInput.value.trim();
      if (!url) {
        DOM.gasTestResult.textContent = '請先填入 GAS Web App URL';
        DOM.gasTestResult.style.color = '#c62828';
        return;
      }
      DOM.gasTestResult.textContent = '正在測試連線...';
      DOM.gasTestResult.style.color = 'var(--text-color)';
      try {
        const res = await fetch(`${url}?action=get`);
        const data = await res.json();
        if (data.status === 'success') {
          DOM.gasTestResult.textContent = '✓ 連線成功！Google Sheets 回傳正常。';
          DOM.gasTestResult.style.color = '#2e7d32';
        } else {
          DOM.gasTestResult.textContent = '✕ 連線成功但格式未符合規格';
          DOM.gasTestResult.style.color = '#c62828';
        }
      } catch (err) {
        DOM.gasTestResult.textContent = '✕ 連線失敗，請檢查 URL 及 Apps Script 發布權限 (需設為「任何人」)';
        DOM.gasTestResult.style.color = '#c62828';
      }
    });

    DOM.btnSaveGas.addEventListener('click', () => {
      state.gasUrl = DOM.gasUrlInput.value.trim();
      localStorage.setItem('schedule_board_gas_url', state.gasUrl);
      updateGasStatusUI();
      closeAllModals();
      showToast('GAS 設定已儲存');
      if (state.gasUrl) syncFromGAS();
    });

    // Backup / Export
    DOM.btnBackup.addEventListener('click', exportDataJSON);

    DOM.btnExport.addEventListener('click', () => {
      DOM.modalExport.classList.add('active');
    });
    DOM.btnExportJson.addEventListener('click', () => {
      exportDataJSON();
      closeAllModals();
    });
    DOM.btnExportCsv.addEventListener('click', () => {
      exportDataCSV();
      closeAllModals();
    });

    // Import
    DOM.btnImport.addEventListener('click', () => {
      DOM.importFileInput.value = '';
      DOM.importPreview.classList.add('hidden');
      DOM.modalImport.classList.add('active');
    });

    let importedTasksToCommit = [];
    DOM.importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      const type = DOM.importTypeSelect.value;

      reader.onload = (event) => {
        const content = event.target.result;
        try {
          if (type === 'json') {
            const data = JSON.parse(content);
            importedTasksToCommit = data.tasks || [];
          } else if (type === 'ical') {
            importedTasksToCommit = parseICSContent(content);
          } else if (type === 'csv') {
            // Basic CSV parser
            const lines = content.split('\n').filter(l => l.trim());
            importedTasksToCommit = [];
            lines.slice(1).forEach((line, idx) => {
              const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
              if (cols.length >= 2) {
                importedTasksToCommit.push({
                  id: 'csv-' + Date.now() + '-' + idx,
                  name: cols[1] || cols[0],
                  category: cols[2] || state.categories[0],
                  color: cols[3] || 'YOLK',
                  date: cols[4] || formatDateStr(new Date()),
                  priority: cols[5] || 'medium',
                  completed: cols[6] === '已完成',
                  desc: cols[7] || ''
                });
              }
            });
          }
          DOM.importSummary.textContent = `找到 ${importedTasksToCommit.length} 筆任務，點擊確認導入。`;
          DOM.importPreview.classList.remove('hidden');
        } catch (err) {
          alert('解析檔案失敗，請確認檔案格式是否正確。');
        }
      };

      reader.readAsText(file);
    });

    DOM.btnConfirmImport.addEventListener('click', () => {
      if (importedTasksToCommit.length > 0) {
        state.tasks = state.tasks.concat(importedTasksToCommit);
        saveLocalData();
        renderBoard();
        closeAllModals();
        showToast(`已成功導入 ${importedTasksToCommit.length} 筆任務！`);
        importedTasksToCommit = [];
      }
    });

    DOM.btnSettings.addEventListener('click', () => {
      if (confirm('是否要重置回預設範例資料？（目前的任務將會被覆蓋）')) {
        state.categories = ['前端開發', '社群選題', '會議與企劃', '日常庶務'];
        state.tasks = DEFAULT_TASKS;
        saveLocalData();
        renderBoard();
        showToast('已重置為預設資料');
      }
    });
  }

  // Kickstart App
  document.addEventListener('DOMContentLoaded', init);

})();
