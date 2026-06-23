<template>
  <div class="min-h-screen p-8 bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
    
    <header class="max-w-[1400px] mx-auto mb-8 flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
      <div>
        <h1 class="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">🗓️ 大學空堂媒合器</h1>
        <p class="text-slate-500 dark:text-slate-400 text-base mt-1">期末專題前後端整合版 — 點選課表、即時寫入 SQLite 資料庫</p>
      </div>
      <button @click="toggleDarkMode" class="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all text-xl">
        {{ isDarkMode ? '☀️' : '🌙' }}
      </button>
    </header>

    <div class="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-5 gap-8">
      
      <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-fit space-y-6 transition-colors md:col-span-1">
        
        <div>
          <label class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">➕ 快速新增成員</label>
          <div class="flex gap-2">
            <input 
              type="text" 
              v-model="newUserName" 
              @keyup.enter="addUser"
              placeholder="輸入姓名..." 
              class="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-transparent focus:outline-none focus:border-orange-500 dark:text-white">
            <button @click="addUser" class="bg-slate-800 dark:bg-slate-600 hover:bg-slate-900 dark:hover:bg-slate-500 text-white text-xs font-medium px-3 py-2 rounded-xl transition-all">
              新增
            </button>
          </div>
        </div>

        <div v-if="mode === 'edit' && users.length > 1">
          <label class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">📋 課表複製精靈</label>
          <div class="space-y-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 text-xs">
            <p class="text-slate-500 dark:text-slate-400 mb-1">將他人的課表複製並覆蓋到當前使用者：</p>
            <select v-model="copySourceUserId" class="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 mb-2">
              <option value="" disabled>選擇被複製對象...</option>
              <option v-for="user in users.filter(u => u.id !== currentUserId)" :key="user.id" :value="user.id">
                {{ user.name }} 的課表
              </option>
            </select>
            <button @click="copySchedule" :disabled="!copySourceUserId" class="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-medium py-1.5 rounded-lg transition-all">
              複製並覆蓋
            </button>
          </div>
        </div>

        <hr class="border-slate-100 dark:border-slate-700">

        <div>
          <label class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">⚙️ 操作模式</label>
          <div class="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
            <button @click="mode = 'edit'; currentMatchUsers = []" :class="mode === 'edit' ? 'bg-white dark:bg-slate-600 text-orange-600 dark:text-orange-400 shadow-sm font-bold' : 'text-slate-500 dark:text-slate-400'" class="flex-1 py-2 text-sm font-medium rounded-lg transition-all">
              個人編輯
            </button>
            <button @click="mode = 'match'" :class="mode === 'match' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-slate-500 dark:text-slate-400'" class="flex-1 py-2 text-sm font-medium rounded-lg transition-all">
              群組媒合
            </button>
          </div>
        </div>

        <div v-if="mode === 'edit'" class="space-y-3">
          <label class="block text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">切換/刪除成員</label>
          <div class="space-y-1 max-h-64 overflow-y-auto pr-1">
            <div v-for="user in users" :key="user.id" :class="currentUserId === user.id ? 'btn-user-active' : 'btn-user-inactive'" class="w-full px-3 py-2.5 text-sm rounded-xl border transition-all flex justify-between items-center group bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <span @click="currentUserChange(user.id)" class="flex-1 cursor-pointer font-semibold">{{ user.name }}</span>
              <button @click.stop="deleteUser(user.id)" class="text-slate-400 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-opacity p-1">
                🗑️
              </button>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-2">💡 塗鴉小技巧：按住滑鼠左鍵不放並**拖曳滑動**，可快速塗抹課表狀態！</p>
        </div>

        <div v-if="mode === 'match'" class="space-y-3">
          <label class="block text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">勾選要媒合的人員</label>
          <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
            <label v-for="user in users" :key="user.id" class="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border border-transparent transition-all">
              <input type="checkbox" :value="user.id" v-model="currentMatchUsers" class="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 bg-transparent">
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ user.name }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 md:col-span-4 overflow-x-auto transition-colors dark:bg-slate-800">
        
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 min-w-[800px]">
          <h3 class="text-xl font-bold">
            <span v-if="mode === 'edit'" class="text-orange-600 dark:text-orange-400">✍️ 正在編輯：{{ currentUser?.name }} 的課表</span>
            <span v-else class="text-blue-600 dark:text-blue-400">🔍 群組空堂精準媒合</span>
          </h3>
          
          <div class="flex items-center gap-5 text-sm font-semibold bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 bg-orange-500 rounded-sm"></span> 有課</div>
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-sm"></span> 有人忙碌</div>
            <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 bg-blue-500 rounded-sm"></span> 全體空堂 (黃金時段 ✨)</div>
          </div>
        </div>

        <div class="min-w-[800px] border border-slate-100 dark:border-slate-700 rounded-2xl overflow-y-auto max-h-[650px] relative bg-white dark:bg-slate-800 transition-colors">
          <div class="grid grid-cols-6 gap-3 min-w-full">
            
            <div class="sticky top-0 z-10 col-span-6 grid grid-cols-6 gap-3 bg-slate-100 dark:bg-slate-700 p-4 border-b border-slate-200 dark:border-slate-600 text-center font-bold text-slate-700 dark:text-slate-200">
              <div class="text-sm text-slate-400 dark:text-slate-400">節次</div>
              <div v-for="day in days" :key="day" class="text-base">{{ day }}</div>
            </div>

            <div class="col-span-6 p-3 space-y-3">
              <div v-for="period in 14" :key="period" class="grid grid-cols-6 gap-3 items-stretch">
                
                <div class="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-2.5 flex flex-col justify-center items-center text-center border border-dashed border-slate-200 dark:border-slate-600 transition-colors">
                  <span class="text-sm font-bold text-slate-700 dark:text-slate-300">第 {{ period }} 節</span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{{ getPeriodTime(period) }}</span>
                </div>

                <div 
                  v-for="dayIndex in 5" 
                  :key="dayIndex"
                  @mousedown="onCellMouseDown(dayIndex, period)"
                  @mouseenter="onCellMouseEnter(dayIndex, period)"
                  :class="getCellClass(dayIndex, period)"
                  :style="getCellStyle(dayIndex, period)"
                  class="timetable-cell">
                  
                  <div class="w-full text-center p-1 select-none">
                    <span class="text-sm md:text-base font-bold block mb-1">
                      {{ mode === 'edit' ? (isCellBusy(currentUserId, dayIndex, period) ? '有課' : '空堂') : getMatchMainText(dayIndex, period) }}
                    </span>
                    <span v-if="mode === 'match' && currentMatchUsers.length > 0" class="text-[11px] block font-medium leading-tight">
                      {{ getCellSubDetails(dayIndex, period) }}
                    </span>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>

        <div v-if="mode === 'edit' && currentUser" class="mt-4 flex justify-end">
          <button @click="saveScheduleToBackend" class="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-2.5 rounded-xl text-sm shadow-sm transition-all">
            儲存 {{ currentUser.name }} 的課表至資料庫
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import axios from 'axios';

// 後端 API 的基本網址
const API_BASE = 'http://localhost:3000/api';

const days = ['星期一', '星期二', '星期三', '星期四', '星期五'];
const mode = ref('edit'); 
const currentUserId = ref(null); 
const currentMatchUsers = ref([]); 
const newUserName = ref('');
const copySourceUserId = ref('');
const isDarkMode = ref(false);

const isDrawing = ref(false);
const drawingMode = ref(1); 

// 連線真實後端的動態響應資料
const users = ref([]);
const schedules = ref({});

// ==========================================
// 🚀 初始化：從 Express 獲取真實資料庫數據
// ==========================================
const fetchInitialData = async () => {
  try {
    // 1. 拿取使用者名單
    const userRes = await axios.get(`${API_BASE}/users`);
    users.value = userRes.data;
    if (users.value.length > 0 && !currentUserId.value) {
      currentUserId.value = users.value[0].id;
    }

    // 2. 拿取課表矩陣
    const scheduleRes = await axios.get(`${API_BASE}/schedules`);
    schedules.value = scheduleRes.data;
  } catch (error) {
    console.error("無法與 Express 後端連線:", error);
    alert("後端連線失敗，請確認 Express 伺服器是否正常執行中！");
  }
};

onMounted(() => {
  fetchInitialData();
  window.addEventListener('mouseup', handleGlobalMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', handleGlobalMouseUp);
});

// ==========================================
// 功能運作與後端連動 API
// ==========================================
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const addUser = async () => {
  if (!newUserName.value.trim()) return alert('請輸入成員姓名！');
  try {
    const res = await axios.post(`${API_BASE}/users`, { name: newUserName.value.trim() });
    users.value.push(res.data);
    schedules.value[res.data.id] = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
    currentUserId.value = res.data.id;
    newUserName.value = '';
  } catch (error) {
    alert("新增成員失敗");
  }
};

const deleteUser = async (id) => {
  if (users.value.length <= 1) return alert('系統至少需保留一位成員！');
  if (confirm(`確定要從資料庫刪除「${users.value.find(u => u.id === id)?.name}」嗎？`)) {
    try {
      await axios.delete(`${API_BASE}/users/${id}`);
      users.value = users.value.filter(u => u.id !== id);
      delete schedules.value[id];
      if (currentUserId.value === id) currentUserId.value = users.value[0].id;
      currentMatchUsers.value = currentMatchUsers.value.filter(uid => uid !== id);
    } catch (error) {
      alert("刪除成員失敗");
    }
  }
};

const saveScheduleToBackend = async () => {
  const uid = currentUserId.value;
  try {
    const res = await axios.post(`${API_BASE}/schedules/save`, {
      userId: uid,
      userSchedule: schedules.value[uid] || {}
    });
    alert(res.data.message);
  } catch (error) {
    alert("儲存課表失敗，請重試");
  }
};

const copySchedule = () => {
  if (!copySourceUserId.value) return;
  schedules.value[currentUserId.value] = JSON.parse(JSON.stringify(schedules.value[copySourceUserId.value]));
  alert(`已將課表暫存複製！請記得點擊右下角「儲存至資料庫」進行永久儲存。`);
  copySourceUserId.value = '';
};

// ==========================================
// 課表內部矩陣運算與塗鴉邏輯
// ==========================================
const isCellBusy = (userId, day, period) => {
  return schedules.value[userId]?.[day]?.[period] === 1;
};

const onCellMouseDown = (day, period) => {
  if (mode.value !== 'edit') return;
  isDrawing.value = true;
  const currentlyBusy = isCellBusy(currentUserId.value, day, period);
  drawingMode.value = currentlyBusy ? 0 : 1;
  toggleCellStatus(day, period, drawingMode.value);
};

const onCellMouseEnter = (day, period) => {
  if (!isDrawing.value || mode.value !== 'edit') return;
  toggleCellStatus(day, period, drawingMode.value);
};

const toggleCellStatus = (day, period, targetMode) => {
  const uid = currentUserId.value;
  if (!schedules.value[uid]) schedules.value[uid] = {};
  if (!schedules.value[uid][day]) schedules.value[uid][day] = {};
  
  if (targetMode === 1) {
    schedules.value[uid][day][period] = 1;
  } else {
    delete schedules.value[uid][day][period];
  }
};

const handleGlobalMouseUp = () => { isDrawing.value = false; };

const getCellStyle = (day, period) => {
  if (mode.value !== 'match' || currentMatchUsers.value.length === 0) return {};

  const totalSelected = currentMatchUsers.value.length;
  const busyCount = currentMatchUsers.value.filter(uid => isCellBusy(uid, day, period)).length;

  if (busyCount > 0) {
    return {
      backgroundColor: isDarkMode.value ? '#1e293b' : '#ffffff',
      color: isDarkMode.value ? '#475569' : '#94a3b8', 
      borderColor: isDarkMode.value ? '#334155' : '#e2e8f0'
    };
  }

  return {
    backgroundColor: '#3b82f6', 
    color: '#ffffff',           
    borderColor: '#2563eb',     
    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)' 
  };
};

const getCellClass = (day, period) => {
  if (mode.value === 'edit') {
    return isCellBusy(currentUserId.value, day, period)
      ? 'bg-orange-500 border-orange-600 dark:border-orange-500 text-white font-bold shadow-inner' 
      : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-400 dark:text-slate-600 hover:border-orange-300 dark:hover:border-orange-500 hover:bg-orange-50/20';
  }
  if (mode.value === 'match') {
    if (currentMatchUsers.value.length === 0) {
      return 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 border-dashed cursor-not-allowed';
    }
    return 'border';
  }
};

const getMatchMainText = (day, period) => {
  if (currentMatchUsers.value.length === 0) return '未選人員';
  const busyCount = currentMatchUsers.value.filter(uid => isCellBusy(uid, day, period)).length;
  const freeCount = currentMatchUsers.value.length - busyCount;

  if (busyCount === 0) return '全體空堂 ✨';
  if (freeCount === 0) return '全員忙碌';
  return `${freeCount} 人有空`;
};

const getCellSubDetails = (day, period) => {
  const busyUsers = currentMatchUsers.value.filter(uid => isCellBusy(uid, day, period)).map(uid => users.value.find(u => u.id === uid)?.name);
  const freeUsers = currentMatchUsers.value.filter(uid => !isCellBusy(uid, day, period)).map(uid => users.value.find(u => u.id === uid)?.name);

  if (freeUsers.length === 0) return '無人有空';
  if (busyUsers.length === 0) return '大家都有空';
  return `有空: ${freeUsers.join(',')}`;
};

const currentUser = computed(() => users.value.find(u => u.id === currentUserId.value));
const currentUserChange = (id) => currentUserId.value = id;

const getPeriodTime = (period) => {
  const times = {
    1: '08:10-09:00', 2: '09:10-10:00', 3: '10:10-11:00', 4: '11:10-12:00',
    5: '13:10-14:00', 6: '14:10-15:00', 7: '15:10-16:00', 8: '16:10-17:00',
    9: '17:10-18:00', 10: '18:20-19:10', 11: '19:15-20:05', 12: '20:10-21:00',
    13: '21:05-21:55', 14: '22:00-22:50'
  };
  return times[period] || '';
};
</script>

<style scoped>
.sticky {
  position: sticky;
  top: 0;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

.timetable-cell {
  height: 4.6rem;
  border-radius: 0.85rem;
  border-width: 1px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.15s ease-in-out;
  cursor: pointer;
}

.btn-user-active {
  background-color: #fff7ed;
  border-color: #f97316;
  color: #c2410c;
  font-weight: 700;
}
.btn-user-inactive {
  border-color: #e5e7eb;
  color: #4b5563;
}
.btn-user-inactive:hover {
  background-color: #f9fafb;
}

.dark .btn-user-active {
  background-color: #7c2d12;
  border-color: #ea580c;
  color: #ffedd5;
}
.dark .btn-user-inactive {
  border-color: #334155;
  color: #cbd5e1;
  background-color: #1e293b;
}
.dark .btn-user-inactive:hover {
  background-color: #334155;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}
.dark ::-webkit-scrollbar-thumb {
  background: #475569;
}
</style>