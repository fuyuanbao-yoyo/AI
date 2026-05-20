// ==================== 核心数据管理 ====================
const STORAGE_KEY = 'checkin_app_data';

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ==================== 默认数据 ====================
function getDefaultChildData(name, avatar) {
  return {
    id: 'child_' + Date.now(),
    name: name || '一年级宝贝',
    avatar: avatar || '👶',
    tasks: [
      { id: 1, name: '语文朗读', icon: '📖', default: true },
      { id: 2, name: '数学口算', icon: '🧮', default: true },
      { id: 3, name: '生字书写', icon: '✏️', default: true },
      { id: 4, name: '古诗背诵', icon: '📜', default: true },
      { id: 5, name: '课外阅读', icon: '📚', default: true }
    ],
    todayCheckin: { date: '', completed: [] },
    cycleStarEarned: false,
    stars: 0,
    totalStarsEarned: 0,
    starHistory: [],
    wishes: [
      { id: 101, name: '看10分钟动画片', icon: '📺', cost: 5, default: true },
      { id: 102, name: '吃一个小蛋糕', icon: '🍰', cost: 5, default: true },
      { id: 103, name: '周末去公园玩', icon: '🎡', cost: 5, default: true },
      { id: 104, name: '买一本绘本', icon: '📕', cost: 8, default: true }
    ],
    customWishes: [],
    exchangedWishes: [],
    medals: [],
    checkinRecords: {},
    settings: { reminderTime: '19:00', reminderEnabled: false }
  };
}

function getDefaultAppData() {
  const child = getDefaultChildData();
  return {
    currentChildId: child.id,
    children: [child]
  };
}

// ==================== 老数据迁移 ====================
function migrateOldData(raw) {
  if (raw && raw.childName && !raw.children) {
    const child = {
      id: 'child_default',
      name: raw.childName,
      avatar: raw.childAvatar || '👶',
      tasks: raw.tasks || [],
      todayCheckin: raw.todayCheckin || { date: '', completed: [] },
      cycleStarEarned: raw.cycleStarEarned || false,
      stars: raw.stars || 0,
      totalStarsEarned: raw.stars || 0,
      starHistory: raw.starHistory || [],
      wishes: raw.wishes || [],
      customWishes: raw.customWishes || [],
      exchangedWishes: raw.exchangedWishes || [],
      medals: raw.medals || [],
      checkinRecords: raw.checkinRecords || {},
      settings: raw.settings || { reminderTime: '19:00', reminderEnabled: false }
    };
    return { currentChildId: child.id, children: [child] };
  }
  // 确保每个孩子都有 totalStarsEarned
  if (raw && raw.children) {
    raw.children.forEach(c => {
      if (typeof c.totalStarsEarned === 'undefined') {
        c.totalStarsEarned = c.stars || 0;
      }
    });
  }
  return raw;
}

// ==================== 数据加载/保存 ====================
function loadData() {
  const params = new URLSearchParams(location.search);
  const shared = params.get('data');
  if (shared) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(shared)))));
      const migrated = migrateOldData(decoded);
      saveDataRaw(migrated);
      history.replaceState({}, '', location.pathname);
      return migrated;
    } catch (e) { console.error('分享数据解析失败', e); }
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return getDefaultAppData();
  try {
    const parsed = JSON.parse(raw);
    const migrated = migrateOldData(parsed);
    if (migrated !== parsed) saveDataRaw(migrated);
    return migrated;
  } catch (e) { return getDefaultAppData(); }
}

function saveDataRaw(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let _appData = loadData();

function saveData() { saveDataRaw(_appData); }

function getAppData() { return _appData; }

// ==================== 多孩子管理 ====================
function getCurrentChild() {
  return _appData.children.find(c => c.id === _appData.currentChildId) || _appData.children[0];
}

function getData() { return getCurrentChild(); }

function switchChild(id) {
  const child = _appData.children.find(c => c.id === id);
  if (child) {
    _appData.currentChildId = id;
    saveData();
  }
}

function addChild(name, avatar) {
  const child = getDefaultChildData(name, avatar);
  _appData.children.push(child);
  _appData.currentChildId = child.id;
  saveData();
  return child;
}

function removeChild(id) {
  if (_appData.children.length <= 1) return false;
  _appData.children = _appData.children.filter(c => c.id !== id);
  if (_appData.currentChildId === id) {
    _appData.currentChildId = _appData.children[0].id;
  }
  saveData();
  return true;
}

function updateChildInfo(id, name, avatar) {
  const child = _appData.children.find(c => c.id === id);
  if (child) {
    if (name) child.name = name;
    if (avatar) child.avatar = avatar;
    saveData();
  }
}

function getChildren() { return _appData.children; }

// ==================== 卡通弹窗 ====================
function showModal({ title, message, icon, btnText, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-stars">⭐⭐⭐</div>
      ${icon ? `<div class="modal-icon">${icon}</div>` : ''}
      ${title ? `<div class="modal-title">${title}</div>` : ''}
      <div class="modal-msg">${message}</div>
      <button class="modal-btn ok">${btnText || '知道了'}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-btn').addEventListener('click', () => {
    overlay.remove();
    if (onClose) onClose();
  });
}

function showConfirm({ title, message, icon, onConfirm, onCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-stars">⭐⭐⭐</div>
      ${icon ? `<div class="modal-icon">${icon}</div>` : ''}
      ${title ? `<div class="modal-title">${title}</div>` : ''}
      <div class="modal-msg">${message}</div>
      <div class="modal-btns">
        <button class="modal-btn cancel">取消</button>
        <button class="modal-btn ok">确定</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-btn.cancel').addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });
  overlay.querySelector('.modal-btn.ok').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
}

// ==================== Bottom Sheet 组件 ====================
function showBottomSheet({ title, content, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `
    <div class="sheet-backdrop"></div>
    <div class="sheet-container">
      <div class="sheet-handle"></div>
      ${title ? `<div class="sheet-title">${title}</div>` : ''}
      <div class="sheet-content">${content}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('sheet-open'));
  const close = () => {
    overlay.classList.remove('sheet-open');
    setTimeout(() => { overlay.remove(); if (onClose) onClose(); }, 300);
  };
  overlay.querySelector('.sheet-backdrop').addEventListener('click', close);
  overlay._close = close;
  return overlay;
}

// ==================== 孩子切换器 ====================
function showChildSwitcher() {
  const children = getChildren();
  const currentId = _appData.currentChildId;
  let html = '';
  children.forEach(child => {
    const isCurrent = child.id === currentId;
    const streak = getConsecutiveDaysFor(child);
    const subtitle = streak > 0 ? `连续打卡 ${streak} 天 · ⭐${child.totalStarsEarned}` : `⭐${child.totalStarsEarned}`;
    html += `
      <div class="switch-card ${isCurrent ? 'active' : ''}" data-id="${child.id}">
        <div class="switch-card-avatar">${child.avatar}</div>
        <div class="switch-card-info">
          <div class="switch-card-name">${child.name}</div>
          <div class="switch-card-sub">${subtitle}</div>
        </div>
        ${isCurrent ? '<div class="switch-card-check">✓</div>' : ''}
      </div>
    `;
  });
  html += `<div class="switch-card add-card" id="add-child-btn"><span class="add-icon">＋</span><span>添加宝贝</span></div>`;

  const sheet = showBottomSheet({ title: '切换宝贝', content: html });
  // 绑定切换事件
  sheet.querySelectorAll('.switch-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      if (id !== currentId) {
        switchChild(id);
        location.reload();
      } else {
        sheet._close();
      }
    });
  });
  // 添加宝贝
  sheet.querySelector('#add-child-btn').addEventListener('click', () => {
    sheet._close();
    showAddChildModal();
  });
}

function showAddChildModal() {
  const emojis = ['👶','👧','🧒','👦','👸','🤴','🎀','🌸','🦄','🐰','🐻','🌈'];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box add-child-modal">
      <div class="modal-close" id="close-add-child">✕</div>
      <div class="modal-title">添加宝贝</div>
      <div class="emoji-picker">
        ${emojis.map(e => `<div class="emoji-option" data-emoji="${e}">${e}</div>`).join('')}
      </div>
      <div class="selected-avatar" id="selected-avatar">👶</div>
      <input type="text" class="child-name-input" id="new-child-name" placeholder="请输入宝贝的名字" maxlength="10">
      <button class="modal-btn ok full-width" id="confirm-add-child">确认添加</button>
    </div>
  `;
  document.body.appendChild(overlay);

  let selectedEmoji = '👶';
  overlay.querySelectorAll('.emoji-option').forEach(el => {
    el.addEventListener('click', () => {
      selectedEmoji = el.dataset.emoji;
      document.getElementById('selected-avatar').textContent = selectedEmoji;
      overlay.querySelectorAll('.emoji-option').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  overlay.querySelector('#close-add-child').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#confirm-add-child').addEventListener('click', () => {
    const name = document.getElementById('new-child-name').value.trim();
    if (!name) { document.getElementById('new-child-name').focus(); return; }
    addChild(name, selectedEmoji);
    overlay.remove();
    location.reload();
  });
}

// ==================== 周期检查 ====================
function checkNewDay() {
  // 打卡周期不再自动按天重置
}

// ==================== 作业管理 ====================
function getTasks() { return getCurrentChild().tasks; }

function addTask(name, icon) {
  const child = getCurrentChild();
  const id = Date.now();
  child.tasks.push({ id, name, icon: icon || '✨', default: false });
  saveData();
  return id;
}

function removeTask(id) {
  const child = getCurrentChild();
  child.tasks = child.tasks.filter(t => t.id !== id);
  child.todayCheckin.completed = child.todayCheckin.completed.filter(cid => cid !== id);
  saveData();
}

function updateTask(id, name, icon) {
  const t = getCurrentChild().tasks.find(t => t.id === id);
  if (t) { t.name = name; if (icon) t.icon = icon; saveData(); }
}

// ==================== 打卡逻辑 ====================
function getTodayCompleted() {
  return getCurrentChild().todayCheckin.completed;
}

function isTaskCompleted(taskId) {
  return getCurrentChild().todayCheckin.completed.includes(taskId);
}

function toggleTaskCheckin(taskId) {
  const child = getCurrentChild();
  const idx = child.todayCheckin.completed.indexOf(taskId);
  if (idx > -1) {
    child.todayCheckin.completed.splice(idx, 1);
    saveData();
    return false;
  } else {
    child.todayCheckin.completed.push(taskId);
    saveData();
    checkAllCompleted();
    return true;
  }
}

function checkAllCompleted() {
  const child = getCurrentChild();
  const total = child.tasks.length;
  const done = child.todayCheckin.completed.length;
  if (done >= total && !child.cycleStarEarned) {
    child.cycleStarEarned = true;
    child.stars++;
    child.totalStarsEarned++;
    child.starHistory.push({
      date: getTodayStr(),
      taskId: -1,
      note: '完成全部作业获得星星'
    });
    saveData();
    playSuccess();
    setTimeout(() => showModal({ title: '太棒啦！', message: '全部作业打卡完成！<br>获得 1 颗星星 ⭐', icon: '🌟', btnText: '好耶！' }), 200);
    checkConsecutive();
  }
}

// 开始新打卡周期
function resetCheckinCycle() {
  const child = getCurrentChild();
  if (child.todayCheckin.completed.length === 0) {
    playAlert();
    showModal({ title: '提示', message: '当前周期没有已打卡的作业哦！', icon: '😊' });
    return;
  }
  showConfirm({
    title: '开始新周期？',
    message: '已打卡记录将清空，<br>星星和愿望记录会保留。',
    icon: '🔄',
    onConfirm: doResetCycle
  });
}

function doResetCycle() {
  const child = getCurrentChild();
  const today = getTodayStr();
  child.checkinRecords[today] = [...child.todayCheckin.completed];
  child.todayCheckin = { date: today, completed: [] };
  child.cycleStarEarned = false;
  saveData();
  playSuccess();
  showModal({ title: '新周期开始！', message: '继续加油赚星星吧！⭐', icon: '🎉', btnText: '好的', onClose: () => location.reload() });
}

// ==================== 连续打卡 ====================
function getConsecutiveDaysFor(child) {
  const dates = Object.keys(child.checkinRecords).concat(
    child.todayCheckin.completed.length > 0 ? [child.todayCheckin.date || getTodayStr()] : []
  ).filter(Boolean).sort();
  if (dates.length === 0) return 0;
  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    const d1 = new Date(dates[i]), d0 = new Date(dates[i-1]);
    const diff = (d1 - d0) / (1000*60*60*24);
    if (diff === 1) streak++; else break;
  }
  const today = getTodayStr();
  if (!child.checkinRecords[today] && child.todayCheckin.completed.length === 0) {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    const ystr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    if (!dates.includes(ystr)) return 0;
  }
  return streak;
}

function getConsecutiveDays() {
  return getConsecutiveDaysFor(getCurrentChild());
}

function checkConsecutive() {
  const child = getCurrentChild();
  const streak = getConsecutiveDays();
  const has3 = child.medals.find(m => m.id === '3day');
  const has7 = child.medals.find(m => m.id === '7day');
  if (streak >= 3 && !has3) {
    child.medals.push({ id: '3day', name: '打卡小能手', icon: '🥉', date: getTodayStr() });
    child.stars++;
    child.totalStarsEarned++;
    child.starHistory.push({ date: getTodayStr(), taskId: -1, note: '连续打卡3天奖励' });
    saveData();
    playSuccess();
    setTimeout(() => showModal({ title: '太棒啦！', message: '你连续打卡3天！<br>获得「打卡小能手」勋章<br>+ 1颗奖励星星', icon: '🥉', btnText: '好耶！' }), 300);
  }
  if (streak >= 7 && !has7) {
    child.medals.push({ id: '7day', name: '坚持小达人', icon: '🥇', date: getTodayStr() });
    child.stars += 2;
    child.totalStarsEarned += 2;
    child.starHistory.push({ date: getTodayStr(), taskId: -1, note: '连续打卡7天奖励' });
    saveData();
    playSuccess();
    setTimeout(() => showModal({ title: '太厉害了！', message: '你连续打卡7天！<br>获得「坚持小达人」勋章<br>+ 2颗奖励星星', icon: '🥇', btnText: '好耶！' }), 300);
  }
}

// ==================== 星星与愿望 ====================
function getStars() { return getCurrentChild().stars; }

function getStarHistory() { return getCurrentChild().starHistory.slice().reverse(); }

function getWishes() { return getCurrentChild().wishes; }

function addCustomWish(name, cost) {
  const child = getCurrentChild();
  const id = Date.now();
  child.customWishes.push({ id, name, cost: cost || 5, icon: '🎁' });
  saveData();
}

function approveCustomWish(id, cost) {
  const child = getCurrentChild();
  const idx = child.customWishes.findIndex(w => w.id === id);
  if (idx > -1) {
    const w = child.customWishes[idx];
    w.cost = cost || w.cost;
    child.wishes.push(w);
    child.customWishes.splice(idx, 1);
    saveData();
  }
}

function removeWish(id) {
  const child = getCurrentChild();
  child.wishes = child.wishes.filter(w => w.id !== id);
  child.customWishes = child.customWishes.filter(w => w.id !== id);
  saveData();
}

function exchangeWish(wishId) {
  const child = getCurrentChild();
  const wish = child.wishes.find(w => w.id === wishId);
  if (!wish) return { success: false, msg: '愿望不存在' };
  if (child.stars < wish.cost) return { success: false, msg: `再攒 ${wish.cost - child.stars} 颗星星就可以兑换啦！` };
  child.stars -= wish.cost;
  child.exchangedWishes.push({
    wishId: wish.id,
    name: wish.name,
    icon: wish.icon || '🎁',
    date: getTodayStr()
  });
  saveData();
  setTimeout(() => {
    showConfirm({
      title: '兑换成功！',
      message: '是否开始新的打卡周期？<br>（会清空当前打卡状态，保留星星记录）',
      icon: '🎉',
      onConfirm: resetCheckinCycle
    });
  }, 100);
  return { success: true, msg: `恭喜宝贝！兑换「${wish.name}」成功啦！和爸爸妈妈一起实现吧！` };
}

function getExchangedWishes() {
  return getCurrentChild().exchangedWishes.slice().reverse();
}

// ==================== 统计 ====================
function getStats() {
  const child = getCurrentChild();
  const records = child.checkinRecords;
  const dates = Object.keys(records).sort();
  const last7 = dates.slice(-7).map(d => ({
    date: d.slice(5),
    count: records[d] ? records[d].length : 0
  }));
  const today = getTodayStr();
  if (child.todayCheckin.completed.length > 0) {
    const existing = last7.find(x => x.date === today.slice(5));
    if (existing) existing.count = child.todayCheckin.completed.length;
    else last7.push({ date: today.slice(5), count: child.todayCheckin.completed.length });
  }
  const totalDays = dates.length + (child.todayCheckin.completed.length > 0 ? 1 : 0);
  const totalTasks = Object.values(records).reduce((a,b)=>a+(b?b.length:0), 0) + child.todayCheckin.completed.length;
  return { last7, totalDays, totalTasks, consecutive: getConsecutiveDays(), medals: child.medals };
}

// ==================== 排行榜 ====================
function getRankData(type) {
  const children = getChildren();
  let ranked = children.map(c => ({
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    value: 0
  }));

  if (type === 'stars') {
    ranked.forEach((r, i) => { r.value = children[i].totalStarsEarned; });
  } else if (type === 'streak') {
    ranked.forEach((r, i) => { r.value = getConsecutiveDaysFor(children[i]); });
  } else if (type === 'week') {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth()+1).padStart(2,'0')}-${String(weekStart.getDate()).padStart(2,'0')}`;
    ranked.forEach((r, i) => {
      const child = children[i];
      let count = 0;
      Object.keys(child.checkinRecords).forEach(d => {
        if (d >= weekStartStr) count += (child.checkinRecords[d] ? child.checkinRecords[d].length : 0);
      });
      if (child.todayCheckin.completed.length > 0) count += child.todayCheckin.completed.length;
      r.value = count;
    });
  }
  return ranked.sort((a, b) => b.value - a.value);
}

function getFamilyStats() {
  const children = getChildren();
  let totalStars = 0, totalCheckins = 0, totalMedals = 0;
  children.forEach(c => {
    totalStars += c.totalStarsEarned;
    totalCheckins += Object.values(c.checkinRecords).reduce((a,b) => a + (b ? b.length : 0), 0) + c.todayCheckin.completed.length;
    totalMedals += c.medals.length;
  });
  return { totalStars, totalCheckins, totalMedals };
}

// ==================== 数据备份 ====================
function exportData() {
  const json = JSON.stringify(_appData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `打卡数据_${getTodayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  playSuccess();
  showModal({ title: '导出成功', message: '数据文件已下载到本地', icon: '✅', btnText: '好的' });
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const migrated = migrateOldData(parsed);
      if (!migrated.children || !Array.isArray(migrated.children)) {
        throw new Error('无效数据格式');
      }
      showConfirm({
        title: '确认导入',
        message: '导入将覆盖当前所有数据，确定吗？',
        icon: '⚠️',
        onConfirm: () => {
          _appData = migrated;
          saveData();
          playSuccess();
          showModal({ title: '导入成功', message: '数据已恢复', icon: '✅', btnText: '好的', onClose: () => location.reload() });
        }
      });
    } catch (err) {
      playAlert();
      showModal({ title: '导入失败', message: '文件格式不正确', icon: '❌' });
    }
  };
  reader.readAsText(file);
}

// ==================== 设置 ====================
function updateSettings(obj) {
  Object.assign(getCurrentChild().settings, obj);
  saveData();
}

function updateChild(name, avatar) {
  const child = getCurrentChild();
  if (name) child.name = name;
  if (avatar) child.avatar = avatar;
  saveData();
}

// ==================== 分享功能 ====================
function generateShareUrl() {
  const json = JSON.stringify(getCurrentChild());
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
  const base = location.origin + location.pathname.replace(/pages\/.*$/, '');
  return `${base}?data=${encoded}`;
}

function copyShareLink() {
  const url = generateShareUrl();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => { playSuccess(); showModal({ title: '已复制！', message: '快发给家人或微信扫码打开吧~', icon: '🔗', btnText: '好的' }); });
  } else {
    playAlert();
    prompt('复制以下链接分享给对方:', url);
  }
}

// ==================== 重置 ====================
function resetAll() {
  showConfirm({
    title: '注意！',
    message: '确定要清空所有数据吗？<br>此操作不可恢复！',
    icon: '⚠️',
    onConfirm: () => {
      _appData = getDefaultAppData();
      saveData();
      playAlert();
      showModal({ title: '已重置', message: '所有数据已清空', icon: '🔄', btnText: '确定', onClose: () => location.reload() });
    }
  });
}

// ==================== 音效 ====================
function playDing() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

function playSuccess() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
      osc.start(ctx.currentTime + i * 0.12); osc.stop(ctx.currentTime + i * 0.12 + 0.25);
    });
  } catch (e) {}
}

function playAlert() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

// ==================== 页面初始化辅助 ====================
function initPageCommon() {
  // 渲染切换器按钮
  const switcher = document.getElementById('child-switcher');
  if (switcher) {
    const child = getCurrentChild();
    switcher.innerHTML = `<span class="switcher-avatar">${child.avatar}</span><span class="switcher-name">${child.name}</span><span class="switcher-arrow">▾</span>`;
    switcher.addEventListener('click', showChildSwitcher);
  }
}

// ==================== 首页 ====================
function initHomePage() {
  initPageCommon();
  const child = getCurrentChild();
  const totalEl = document.getElementById('total');
  if (totalEl) totalEl.innerText = child.stars;
  const done = child.todayCheckin.completed.length;
  const total = child.tasks.length;
  const progEl = document.getElementById('today-progress');
  if (progEl) progEl.innerText = `${done}/${total}`;
  // 勋章
  const medalShow = document.getElementById('medal-show');
  if (child.medals.length > 0 && medalShow) {
    medalShow.innerHTML = child.medals.map(m => `<span class="medal-badge">${m.icon} ${m.name}</span>`).join('');
  }
}

// ==================== 打卡页 ====================
function initCheckinPage() {
  initPageCommon();
  renderTaskList();
  const cycleBtn = document.getElementById('new-cycle-btn');
  if (cycleBtn) cycleBtn.addEventListener('click', resetCheckinCycle);
}

function renderTaskList() {
  const list = document.querySelector('.task-list');
  if (!list) return;
  list.innerHTML = '';
  getCurrentChild().tasks.forEach(task => {
    const done = isTaskCompleted(task.id);
    const div = document.createElement('div');
    div.className = 'task-item';
    div.dataset.id = task.id;
    div.innerHTML = `
      <div class="task-info">
        <div class="task-icon">${task.icon}</div>
        <div class="task-name">${task.name}</div>
        <div class="task-status">${done ? '已打卡' : '未打卡'}</div>
      </div>
      <button class="star-btn ${done ? 'done check-pop' : ''}" title="点击打卡">${done ? '✅' : '⭐'}</button>
    `;
    const btn = div.querySelector('.star-btn');
    btn.addEventListener('click', () => {
      btn.classList.add('btn-bounce');
      setTimeout(() => btn.classList.remove('btn-bounce'), 300);
      toggleTaskCheckin(task.id);
      playDing();
      renderTaskList();
      const totalEl = document.getElementById('total');
      if(totalEl) totalEl.innerText = getStars();
    });
    list.appendChild(div);
  });
}

// ==================== 星星罐页 ====================
function initStarsPage() {
  initPageCommon();
  updateJarDisplay();
  renderWishList();
  renderExchangedList();
}

function updateJarDisplay() {
  const child = getCurrentChild();
  const currentEl = document.getElementById('current');
  if (currentEl) currentEl.innerText = child.stars;
  const jarEl = document.getElementById('jar-stars');
  if (jarEl) {
    const maxShow = Math.min(child.stars, 20);
    jarEl.innerHTML = '⭐'.repeat(maxShow) + (child.stars > 20 ? '...' : '');
  }
}

function renderWishList() {
  const list = document.querySelector('.wish-list');
  if (!list) return;
  list.innerHTML = '';
  getCurrentChild().wishes.forEach(wish => {
    const div = document.createElement('div');
    div.className = 'wish-item';
    div.innerHTML = `
      <div class="wish-info">
        <div class="wish-icon">${wish.icon || '🎁'}</div>
        <div>
          <div class="wish-name">${wish.name}</div>
          <div class="wish-cost">${wish.cost}颗星星</div>
        </div>
      </div>
      <button class="exchange">兑换</button>
    `;
    div.querySelector('.exchange').addEventListener('click', () => {
      const res = exchangeWish(wish.id);
      if (res.success) {
        playSuccess();
        showModal({ title: '兑换成功！', message: res.msg + ' 🎉', icon: '🎁', btnText: '太棒啦！' });
      } else {
        playAlert();
        showModal({ title: '再攒一攒', message: res.msg, icon: '⭐', btnText: '好的' });
      }
      updateJarDisplay();
      renderWishList();
      renderExchangedList();
    });
    list.appendChild(div);
  });
}

function renderExchangedList() {
  const box = document.getElementById('exchanged-box');
  if (!box) return;
  const list = getExchangedWishes();
  if (list.length === 0) { box.innerHTML = ''; return; }
  let html = '<div class="exchanged-title">已兑换愿望</div>';
  list.slice(0, 5).forEach(item => {
    html += `<div class="exchanged-item">${item.icon || '🎁'} ${item.name} <span>${item.date}</span></div>`;
  });
  box.innerHTML = html;
}

// ==================== 我的页 ====================
function initMinePage() {
  initPageCommon();
  const child = getCurrentChild();
  const nameEl = document.getElementById('child-name');
  const avatarEl = document.getElementById('child-avatar');
  if (nameEl) nameEl.innerText = child.name;
  if (avatarEl) avatarEl.innerText = child.avatar;

  // 编辑孩子信息
  const editBtn = document.getElementById('edit-child');
  if (editBtn) {
    editBtn.addEventListener('click', () => showEditChildModal());
  }
  // 作业管理
  const taskManage = document.getElementById('task-manage');
  if (taskManage) taskManage.addEventListener('click', showTaskManage);
  // 愿望管理
  const wishManage = document.getElementById('wish-manage');
  if (wishManage) wishManage.addEventListener('click', showWishManage);
  // 打卡统计
  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) statsBtn.addEventListener('click', showStats);
  // 导出
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  // 导入
  const importBtn = document.getElementById('import-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
  }
  const importFile = document.getElementById('import-file');
  if (importFile) {
    importFile.addEventListener('change', (e) => {
      if (e.target.files[0]) importData(e.target.files[0]);
    });
  }
  // 分享
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) shareBtn.addEventListener('click', copyShareLink);
  // 重置
  const resetBtn = document.getElementById('reset');
  if (resetBtn) resetBtn.addEventListener('click', resetAll);
}

function showEditChildModal() {
  const child = getCurrentChild();
  const emojis = ['👶','👧','🧒','👦','👸','🤴','🎀','🌸','🦄','🐰','🐻','🌈'];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box add-child-modal">
      <div class="modal-close" id="close-edit-child">✕</div>
      <div class="modal-title">编辑宝贝</div>
      <div class="emoji-picker">
        ${emojis.map(e => `<div class="emoji-option ${e === child.avatar ? 'selected' : ''}" data-emoji="${e}">${e}</div>`).join('')}
      </div>
      <div class="selected-avatar" id="selected-avatar">${child.avatar}</div>
      <input type="text" class="child-name-input" id="edit-child-name" placeholder="请输入宝贝的名字" maxlength="10" value="${child.name}">
      <button class="modal-btn ok full-width" id="confirm-edit-child">保存</button>
    </div>
  `;
  document.body.appendChild(overlay);

  let selectedEmoji = child.avatar;
  overlay.querySelectorAll('.emoji-option').forEach(el => {
    el.addEventListener('click', () => {
      selectedEmoji = el.dataset.emoji;
      document.getElementById('selected-avatar').textContent = selectedEmoji;
      overlay.querySelectorAll('.emoji-option').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  overlay.querySelector('#close-edit-child').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#confirm-edit-child').addEventListener('click', () => {
    const name = document.getElementById('edit-child-name').value.trim();
    if (!name) { document.getElementById('edit-child-name').focus(); return; }
    updateChild(name, selectedEmoji);
    overlay.remove();
    location.reload();
  });
}

function showStats() {
  const stats = getStats();
  let html = `
    <p>总打卡天数：${stats.totalDays} 天</p>
    <p>总完成作业：${stats.totalTasks} 项</p>
    <p>连续打卡：${stats.consecutive} 天</p>
    <p>近7天完成情况：</p><div class="bar-chart">
  `;
  stats.last7.forEach(d => {
    const h = Math.min(d.count * 20, 100);
    html += `<div class="bar-wrap"><div class="bar" style="height:${h}px"></div><div class="bar-label">${d.date}</div></div>`;
  });
  html += '</div>';
  if (stats.medals.length > 0) {
    html += '<p>已获得勋章：</p><div class="medal-list">';
    stats.medals.forEach(m => html += `<span class="medal">${m.icon} ${m.name}</span>`);
    html += '</div>';
  }
  showBottomSheet({ title: '📊 打卡统计', content: html });
}

// ==================== 作业管理弹窗 ====================
function showTaskManage() {
  const child = getCurrentChild();
  let html = '<div class="manage-list">';
  if (child.tasks.length === 0) {
    html += '<div class="manage-empty">暂无作业</div>';
  } else {
    child.tasks.forEach(t => {
      html += `
        <div class="manage-item">
          <div class="manage-item-name">${t.icon} ${t.name}</div>
          <button class="manage-btn del" data-id="${t.id}">删除</button>
        </div>
      `;
    });
  }
  html += '</div>';
  html += '<div class="manage-input-row"><input type="text" id="new-task-name" placeholder="输入作业名称"><button id="add-task-btn">添加</button></div>';

  const sheet = showBottomSheet({ title: '📚 作业管理', content: html });
  sheet.querySelectorAll('.manage-btn.del').forEach(btn => {
    btn.addEventListener('click', () => {
      removeTask(Number(btn.dataset.id));
      sheet._close();
      setTimeout(showTaskManage, 350);
    });
  });
  const addBtn = sheet.querySelector('#add-task-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const input = sheet.querySelector('#new-task-name');
      const name = input ? input.value.trim() : '';
      if (!name) return;
      addTask(name, '✨');
      playSuccess();
      sheet._close();
      setTimeout(showTaskManage, 350);
    });
  }
}

// ==================== 愿望管理弹窗 ====================
function showWishManage() {
  const child = getCurrentChild();
  let html = '';
  if (child.customWishes.length > 0) {
    html += '<div style="font-size:13px;color:#886600;margin-bottom:6px;">待审核愿望：</div><div class="manage-list">';
    child.customWishes.forEach(w => {
      html += `
        <div class="manage-item">
          <div><div class="manage-item-name">${w.icon} ${w.name}</div><div class="manage-item-cost">默认${w.cost}颗星星</div></div>
          <div class="manage-btns">
            <button class="manage-btn approve" data-id="${w.id}" data-cost="${w.cost}">通过</button>
            <button class="manage-btn del" data-id="${w.id}">删除</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  html += '<div style="font-size:13px;color:#555;margin-bottom:6px;">已有愿望：</div><div class="manage-list">';
  if (child.wishes.length === 0) {
    html += '<div class="manage-empty">暂无愿望</div>';
  } else {
    child.wishes.forEach(w => {
      html += `
        <div class="manage-item">
          <div><div class="manage-item-name">${w.icon} ${w.name}</div><div class="manage-item-cost">${w.cost}颗星星</div></div>
          <button class="manage-btn del" data-id="${w.id}">删除</button>
        </div>
      `;
    });
  }
  html += '</div>';

  const sheet = showBottomSheet({ title: '🎁 愿望管理', content: html });
  sheet.querySelectorAll('.manage-btn.approve').forEach(btn => {
    btn.addEventListener('click', () => {
      approveCustomWish(Number(btn.dataset.id), Number(btn.dataset.cost));
      playSuccess();
      sheet._close();
      setTimeout(showWishManage, 350);
    });
  });
  sheet.querySelectorAll('.manage-btn.del').forEach(btn => {
    btn.addEventListener('click', () => {
      removeWish(Number(btn.dataset.id));
      playAlert();
      sheet._close();
      setTimeout(showWishManage, 350);
    });
  });
}

// ==================== 排行榜页 ====================
function initRankPage() {
  initPageCommon();
  renderRank('stars');
  // Tab 切换
  document.querySelectorAll('.rank-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.rank-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderRank(tab.dataset.type);
    });
  });
}

function renderRank(type) {
  const ranked = getRankData(type);
  const container = document.getElementById('rank-list');
  if (!container) return;
  const units = { stars: '颗', streak: '天', week: '次' };
  const unit = units[type] || '';

  if (ranked.length <= 1) {
    container.innerHTML = '<div class="rank-empty"><div class="rank-empty-icon">🏆</div><div>添加更多宝贝一起 PK 吧！</div></div>';
  } else {
    let html = '';
    ranked.forEach((item, idx) => {
      const medals = ['🥇','🥈','🥉'];
      const medal = idx < 3 ? medals[idx] : `${idx + 1}`;
      const isFirst = idx === 0;
      html += `
        <div class="rank-card ${isFirst ? 'rank-first' : ''}">
          <div class="rank-medal">${medal}</div>
          <div class="rank-avatar ${isFirst ? 'rank-avatar-lg' : ''}">${item.avatar}</div>
          <div class="rank-info">
            <div class="rank-name">${item.name}</div>
            <div class="rank-value">${item.value} ${unit}</div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // 全家成就
  const familyBox = document.getElementById('family-stats');
  if (familyBox) {
    const fs = getFamilyStats();
    familyBox.innerHTML = `
      <div class="family-stat"><span class="family-stat-icon">🎯</span><span>全家总星星</span><strong>${fs.totalStars}</strong></div>
      <div class="family-stat"><span class="family-stat-icon">📊</span><span>全家总打卡</span><strong>${fs.totalCheckins} 次</strong></div>
      <div class="family-stat"><span class="family-stat-icon">🏅</span><span>全家勋章</span><strong>${fs.totalMedals} 枚</strong></div>
    `;
  }
}

// ==================== 自动初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 页面通用初始化已移至各页面调用
});
