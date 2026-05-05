// ==================== 核心数据管理 ====================
const STORAGE_KEY = 'checkin_app_data';

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

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
  const btn = overlay.querySelector('.modal-btn');
  btn.addEventListener('click', () => {
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

function getDefaultData() {
  return {
    childName: '一年级宝贝',
    childAvatar: '👶',
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

function loadData() {
  // 优先从 URL 导入分享数据
  const params = new URLSearchParams(location.search);
  const shared = params.get('data');
  if (shared) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(shared)))));
      saveDataRaw(decoded);
      history.replaceState({}, '', location.pathname);
      return decoded;
    } catch (e) { console.error('分享数据解析失败', e); }
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return getDefaultData();
  try { return JSON.parse(raw); } catch (e) { return getDefaultData(); }
}

function saveDataRaw(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let _data = loadData();

function saveData() { saveDataRaw(_data); }

function getData() { return _data; }

// ==================== 周期检查（不再自动按日重置） ====================
function checkNewDay() {
  // 打卡周期不再自动按天重置，由兑换愿望后手动开启新周期
}

// ==================== 作业管理 ====================
function getTasks() { return _data.tasks; }

function addTask(name, icon) {
  const id = Date.now();
  _data.tasks.push({ id, name, icon: icon || '✨', default: false });
  saveData();
  return id;
}

function removeTask(id) {
  _data.tasks = _data.tasks.filter(t => t.id !== id);
  _data.todayCheckin.completed = _data.todayCheckin.completed.filter(cid => cid !== id);
  saveData();
}

function updateTask(id, name, icon) {
  const t = _data.tasks.find(t => t.id === id);
  if (t) { t.name = name; if (icon) t.icon = icon; saveData(); }
}

// ==================== 打卡逻辑 ====================
function getTodayCompleted() {
  return _data.todayCheckin.completed;
}

function isTaskCompleted(taskId) {
  return _data.todayCheckin.completed.includes(taskId);
}

function toggleTaskCheckin(taskId) {
  const idx = _data.todayCheckin.completed.indexOf(taskId);
  const task = _data.tasks.find(t => t.id === taskId);
  if (idx > -1) {
    // 撤销打卡（不扣星星，星星是全部完成后一次性奖励的）
    _data.todayCheckin.completed.splice(idx, 1);
    saveData();
    return false;
  } else {
    // 打卡
    _data.todayCheckin.completed.push(taskId);
    saveData();
    // 检查是否全部完成
    checkAllCompleted();
    return true;
  }
}

// 检查当前周期是否全部作业完成
function checkAllCompleted() {
  const total = _data.tasks.length;
  const done = _data.todayCheckin.completed.length;
  if (done >= total && !_data.cycleStarEarned) {
    _data.cycleStarEarned = true;
    _data.stars++;
    _data.starHistory.push({
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

// 开始新打卡周期（重置打卡状态，保留星星、愿望等）
function resetCheckinCycle() {
  if (_data.todayCheckin.completed.length === 0) {
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
  const today = getTodayStr();
  _data.checkinRecords[today] = [..._data.todayCheckin.completed];
  _data.todayCheckin = { date: today, completed: [] };
  _data.cycleStarEarned = false;
  saveData();
  playSuccess();
  showModal({ title: '新周期开始！', message: '继续加油赚星星吧！⭐', icon: '🎉', btnText: '好的', onClose: () => location.reload() });
}

// ==================== 连续打卡 ====================
function getConsecutiveDays() {
  const dates = Object.keys(_data.checkinRecords).concat(
    _data.todayCheckin.completed.length > 0 ? [_data.todayCheckin.date] : []
  ).sort();
  if (dates.length === 0) return 0;
  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    const d1 = new Date(dates[i]), d0 = new Date(dates[i-1]);
    const diff = (d1 - d0) / (1000*60*60*24);
    if (diff === 1) streak++; else break;
  }
  // 检查今天是否有打卡
  const today = getTodayStr();
  if (!_data.checkinRecords[today] && _data.todayCheckin.completed.length === 0) {
    // 今天没打卡，看昨天有没有
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    const ystr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    if (!dates.includes(ystr)) return 0;
  }
  return streak;
}

function checkConsecutive() {
  const streak = getConsecutiveDays();
  const has3 = _data.medals.find(m => m.id === '3day');
  const has7 = _data.medals.find(m => m.id === '7day');
  if (streak >= 3 && !has3) {
    _data.medals.push({ id: '3day', name: '打卡小能手', icon: '🥉', date: getTodayStr() });
    _data.stars++;
    _data.starHistory.push({ date: getTodayStr(), taskId: -1, note: '连续打卡3天奖励' });
    saveData();
    playSuccess();
    setTimeout(() => showModal({ title: '太棒啦！', message: '你连续打卡3天！<br>获得「打卡小能手」勋章<br>+ 1颗奖励星星', icon: '🥉', btnText: '好耶！' }), 300);
  }
  if (streak >= 7 && !has7) {
    _data.medals.push({ id: '7day', name: '坚持小达人', icon: '🥇', date: getTodayStr() });
    _data.stars += 2;
    _data.starHistory.push({ date: getTodayStr(), taskId: -1, note: '连续打卡7天奖励' });
    saveData();
    playSuccess();
    setTimeout(() => showModal({ title: '太厉害了！', message: '你连续打卡7天！<br>获得「坚持小达人」勋章<br>+ 2颗奖励星星', icon: '🥇', btnText: '好耶！' }), 300);
  }
}

// ==================== 星星与愿望 ====================
function getStars() { return _data.stars; }

function getStarHistory() { return _data.starHistory.slice().reverse(); }

function getWishes() { return _data.wishes; }

function addCustomWish(name, cost) {
  const id = Date.now();
  _data.customWishes.push({ id, name, cost: cost || 5, icon: '🎁' });
  saveData();
}

function approveCustomWish(id, cost) {
  const idx = _data.customWishes.findIndex(w => w.id === id);
  if (idx > -1) {
    const w = _data.customWishes[idx];
    w.cost = cost || w.cost;
    _data.wishes.push(w);
    _data.customWishes.splice(idx, 1);
    saveData();
  }
}

function removeWish(id) {
  _data.wishes = _data.wishes.filter(w => w.id !== id);
  _data.customWishes = _data.customWishes.filter(w => w.id !== id);
  saveData();
}

function exchangeWish(wishId) {
  const wish = _data.wishes.find(w => w.id === wishId);
  if (!wish) return { success: false, msg: '愿望不存在' };
  if (_data.stars < wish.cost) return { success: false, msg: `再攒 ${wish.cost - _data.stars} 颗星星就可以兑换啦！` };
  _data.stars -= wish.cost;
  _data.exchangedWishes.push({
    wishId: wish.id,
    name: wish.name,
    icon: wish.icon || '🎁',
    date: getTodayStr()
  });
  saveData();
  // 兑换成功后提示是否开始新周期
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
  return _data.exchangedWishes.slice().reverse();
}

// ==================== 统计 ====================
function getStats() {
  const records = _data.checkinRecords;
  const dates = Object.keys(records).sort();
  const last7 = dates.slice(-7).map(d => ({
    date: d.slice(5),
    count: records[d] ? records[d].length : 0
  }));
  // 包含今天
  const today = getTodayStr();
  if (_data.todayCheckin.completed.length > 0) {
    const existing = last7.find(x => x.date === today.slice(5));
    if (existing) existing.count = _data.todayCheckin.completed.length;
    else last7.push({ date: today.slice(5), count: _data.todayCheckin.completed.length });
  }
  const totalDays = dates.length + (_data.todayCheckin.completed.length > 0 ? 1 : 0);
  const totalTasks = Object.values(records).reduce((a,b)=>a+(b?b.length:0), 0) + _data.todayCheckin.completed.length;
  return { last7, totalDays, totalTasks, consecutive: getConsecutiveDays(), medals: _data.medals };
}

// ==================== 设置 ====================
function updateSettings(obj) {
  Object.assign(_data.settings, obj);
  saveData();
}

function updateChild(name, avatar) {
  if (name) _data.childName = name;
  if (avatar) _data.childAvatar = avatar;
  saveData();
}

// ==================== 分享功能 ====================
function generateShareUrl() {
  const json = JSON.stringify(_data);
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
      _data = getDefaultData();
      saveData();
      playAlert();
      showModal({ title: '已重置', message: '所有数据已清空', icon: '🔄', btnText: '确定', onClose: () => location.reload() });
    }
  });
}

// ==================== 页面初始化辅助 ====================
function initPageCommon() {
  // 不再自动按日重置打卡周期
}

// ==================== 首页 ====================
function initHomePage() {
  initPageCommon();
  const totalEl = document.getElementById('total');
  const nameEl = document.getElementById('child-name');
  const avatarEl = document.getElementById('child-avatar');
  if (totalEl) totalEl.innerText = _data.stars;
  if (nameEl) nameEl.innerText = _data.childName;
  if (avatarEl) avatarEl.innerText = _data.childAvatar;
  // 当前周期打卡进度
  const done = _data.todayCheckin.completed.length;
  const total = _data.tasks.length;
  const progEl = document.getElementById('today-progress');
  if (progEl) progEl.innerText = `${done}/${total}`;
}

// ==================== 打卡页 ====================
function initCheckinPage() {
  initPageCommon();
  renderTaskList();
  // 绑定开始新周期按钮
  const cycleBtn = document.getElementById('new-cycle-btn');
  if (cycleBtn) {
    cycleBtn.addEventListener('click', resetCheckinCycle);
  }
}

function renderTaskList() {
  const list = document.querySelector('.task-list');
  if (!list) return;
  list.innerHTML = '';
  _data.tasks.forEach(task => {
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
      const becameDone = toggleTaskCheckin(task.id);
      playDing();
      renderTaskList();
      // 更新顶部星星数
      const totalEl = document.getElementById('total');
      if(totalEl) totalEl.innerText = getStars();
    });
    list.appendChild(div);
  });

  // 自定义作业入口已移至家长中心->作业管理
}

function playDing() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

// 成功庆祝音效（欢快三音阶）
function playSuccess() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523, 659, 784]; // C5 E5 G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.25);
    });
  } catch (e) {}
}

// 提示音效（短促低音）
function playAlert() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

// ==================== 星星罐页 ====================
function initStarsPage() {
  initPageCommon();
  updateJarDisplay();
  renderWishList();
  renderExchangedList();
  // 自定义愿望入口已移至家长中心->愿望管理
}

function updateJarDisplay() {
  const currentEl = document.getElementById('current');
  if (currentEl) currentEl.innerText = _data.stars;
  const jarEl = document.getElementById('jar-stars');
  if (jarEl) {
    const maxShow = Math.min(_data.stars, 20);
    jarEl.innerHTML = '⭐'.repeat(maxShow) + (_data.stars > 20 ? '...' : '');
  }
}

function renderWishList() {
  const list = document.querySelector('.wish-list');
  if (!list) return;
  list.innerHTML = '';
  _data.wishes.forEach(wish => {
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
    const btn = div.querySelector('.exchange');
    btn.addEventListener('click', () => {
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
  // 孩子信息
  const nameEl = document.getElementById('child-name');
  const avatarEl = document.getElementById('child-avatar');
  if (nameEl) nameEl.innerText = _data.childName;
  if (avatarEl) avatarEl.innerText = _data.childAvatar;

  // 编辑孩子信息
  const editBtn = document.getElementById('edit-child');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const name = prompt('请输入宝贝的名字：', _data.childName);
      if (name !== null) {
        const avatar = prompt('选择头像 emoji（如 👶👧🧒）：', _data.childAvatar);
        updateChild(name || _data.childName, avatar || _data.childAvatar);
        if (nameEl) nameEl.innerText = _data.childName;
        if (avatarEl) avatarEl.innerText = _data.childAvatar;
      }
    });
  }

  // 作业管理
  const taskManage = document.getElementById('task-manage');
  if (taskManage) {
    taskManage.addEventListener('click', showTaskManage);
  }

  // 愿望管理
  const wishManage = document.getElementById('wish-manage');
  if (wishManage) {
    wishManage.addEventListener('click', showWishManage);
  }

  // 打卡统计
  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) {
    statsBtn.addEventListener('click', showStats);
  }

  // 生成分享链接
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', copyShareLink);
  }

  // 重置
  const resetBtn = document.getElementById('reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAll);
  }
}

function showStats() {
  const stats = getStats();
  let html = '<div class="stats-overlay" id="stats-overlay"><div class="stats-popup">';
  html += '<h3>打卡统计</h3>';
  html += `<p>总打卡天数：${stats.totalDays} 天</p>`;
  html += `<p>总完成作业：${stats.totalTasks} 项</p>`;
  html += `<p>连续打卡：${stats.consecutive} 天</p>`;
  html += '<p>近7天完成情况：</p><div class="bar-chart">';
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
  html += '<button class="close-stats" onclick="document.getElementById(\'stats-overlay\').remove()">关闭</button>';
  html += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

// ==================== 作业管理弹窗 ====================
function showTaskManage() {
  playAlert();
  let html = '<div class="manage-overlay" id="task-overlay"><div class="manage-popup">';
  html += '<h3>📚 作业管理</h3>';
  html += '<div class="manage-list">';
  if (_data.tasks.length === 0) {
    html += '<div class="manage-empty">暂无作业</div>';
  } else {
    _data.tasks.forEach(t => {
      html += `
        <div class="manage-item">
          <div class="manage-item-name">${t.icon} ${t.name}</div>
          <button class="manage-btn del" onclick="delTaskFromManage(${t.id})">删除</button>
        </div>
      `;
    });
  }
  html += '</div>';
  html += '<div class="manage-input-row"><input type="text" id="new-task-name" placeholder="输入作业名称（如：整理书包）"><button onclick="addTaskFromManage()">添加</button></div>';
  html += '<button class="close-manage" onclick="document.getElementById(\'task-overlay\').remove()">关闭</button>';
  html += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
function addTaskFromManage() {
  const input = document.getElementById('new-task-name');
  const name = input ? input.value.trim() : '';
  if (!name) return;
  addTask(name, '✨');
  playSuccess();
  document.getElementById('task-overlay').remove();
  showTaskManage();
}
function delTaskFromManage(id) {
  removeTask(id);
  playAlert();
  document.getElementById('task-overlay').remove();
  showTaskManage();
}

// ==================== 愿望管理弹窗 ====================
function showWishManage() {
  playAlert();
  let html = '<div class="manage-overlay" id="wish-overlay"><div class="manage-popup">';
  html += '<h3>🎁 愿望管理</h3>';

  // 待审核愿望
  if (_data.customWishes.length > 0) {
    html += '<div style="font-size:13px;color:#886600;margin-bottom:6px;">待审核愿望：</div>';
    html += '<div class="manage-list">';
    _data.customWishes.forEach(w => {
      html += `
        <div class="manage-item">
          <div>
            <div class="manage-item-name">${w.icon} ${w.name}</div>
            <div class="manage-item-cost">默认${w.cost}颗星星</div>
          </div>
          <div class="manage-btns">
            <button class="manage-btn approve" onclick="approveWishFromManage(${w.id},${w.cost})">通过</button>
            <button class="manage-btn del" onclick="delWishFromManage(${w.id})">删除</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  // 已有愿望
  html += '<div style="font-size:13px;color:#555;margin-bottom:6px;">已有愿望：</div>';
  html += '<div class="manage-list">';
  if (_data.wishes.length === 0) {
    html += '<div class="manage-empty">暂无愿望</div>';
  } else {
    _data.wishes.forEach(w => {
      html += `
        <div class="manage-item">
          <div>
            <div class="manage-item-name">${w.icon} ${w.name}</div>
            <div class="manage-item-cost">${w.cost}颗星星</div>
          </div>
          <button class="manage-btn del" onclick="delWishFromManage(${w.id})">删除</button>
        </div>
      `;
    });
  }
  html += '</div>';

  html += '<button class="close-manage" onclick="document.getElementById(\'wish-overlay\').remove()">关闭</button>';
  html += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
function approveWishFromManage(id, cost) {
  approveCustomWish(id, cost);
  playSuccess();
  document.getElementById('wish-overlay').remove();
  showWishManage();
}
function delWishFromManage(id) {
  removeWish(id);
  playAlert();
  document.getElementById('wish-overlay').remove();
  showWishManage();
}

// ==================== 自动初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 不再自动按日重置
});
