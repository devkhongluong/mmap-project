import React, { useState, useEffect, useRef, useCallback } from 'react';

// =====================================================================
// TYPES
// =====================================================================
interface Todo {
  id: number;
  text: string;
  time: string;
  done: boolean;
}

interface TreeNode {
  dayIndex: number;
  title: string;
  status: 'completed' | 'current' | 'locked';
  phase: string;
}

interface LearningMap {
  id: number;
  title: string;
  shortTitle: string;
  progress: number;
  currentDay: string;
  currentDayIndex: number;
  totalDays: number;
  checklists: string[];
  treeNodes: TreeNode[];
}

// =====================================================================
// MOCK DATA
// =====================================================================
const MOCK_MAPS: LearningMap[] = [
  {
    id: 1,
    title: 'Lộ trình Java Core → Spring Boot 3',
    shortTitle: 'Java → Spring Boot',
    progress: 15,
    currentDay: 'Day 3: Tính Đa hình & Interface',
    currentDayIndex: 3,
    totalDays: 98,
    checklists: [
      'Hiểu khái niệm Polymorphism và cách JVM xử lý runtime dispatch',
      'Phân biệt Abstract Class vs Interface và biết khi nào dùng cái nào',
      'Implement Interface Comparable để sort Custom Object với Collections.sort()',
      'Code bài tập: Xây dựng hệ thống quản lý động vật đa hình',
    ],
    treeNodes: [
      { dayIndex: 1, title: 'Nền tảng OOP & Class', status: 'completed', phase: 'Phase 1: Java Core' },
      { dayIndex: 2, title: 'Kế thừa & Encapsulation', status: 'completed', phase: 'Phase 1: Java Core' },
      { dayIndex: 3, title: 'Đa hình & Interface', status: 'current', phase: 'Phase 1: Java Core' },
      { dayIndex: 4, title: 'Collections Framework', status: 'locked', phase: 'Phase 1: Java Core' },
      { dayIndex: 5, title: 'Stream API & Lambda', status: 'locked', phase: 'Phase 1: Java Core' },
      { dayIndex: 6, title: 'Exception Handling', status: 'locked', phase: 'Phase 2: Advanced Java' },
      { dayIndex: 7, title: 'Multithreading Basics', status: 'locked', phase: 'Phase 2: Advanced Java' },
      { dayIndex: 8, title: 'Spring Boot Setup', status: 'locked', phase: 'Phase 3: Spring Boot' },
    ],
  },
  {
    id: 2,
    title: 'Luyện thi IELTS 7.0 (Reading & Listening)',
    shortTitle: 'IELTS 7.0',
    progress: 47,
    currentDay: 'Day 30: Skimming & Scanning',
    currentDayIndex: 30,
    totalDays: 60,
    checklists: [
      'Luyện kỹ thuật Skimming: đọc tiêu đề và câu đầu mỗi đoạn văn',
      'Luyện kỹ thuật Scanning: tìm keyword và số liệu cụ thể trong bài',
      'Hoàn thành 1 bài Reading Cambridge 17, Test 1, Passage 1 (có tính giờ)',
      'Ghi chú 10 từ vựng học thuật mới vào Anki (Academic Word List)',
    ],
    treeNodes: [
      { dayIndex: 28, title: 'True/False/Not Given', status: 'completed', phase: 'Week 4: Reading Skills' },
      { dayIndex: 29, title: 'Matching Headings', status: 'completed', phase: 'Week 4: Reading Skills' },
      { dayIndex: 30, title: 'Skimming & Scanning', status: 'current', phase: 'Week 4: Reading Skills' },
      { dayIndex: 31, title: 'Summary Completion', status: 'locked', phase: 'Week 4: Reading Skills' },
      { dayIndex: 32, title: 'Full Mock Test #4', status: 'locked', phase: 'Week 4: Reading Skills' },
    ],
  },
];

// Simulated AI feedback pool
const AI_FEEDBACKS = [
  '🎉 **Tuyệt vời!** Bạn đã tóm tắt bài học rất súc tích và đúng trọng tâm. Tôi đặc biệt ấn tượng với cách bạn diễn giải sự khác biệt giữa các khái niệm bằng ngôn ngữ của riêng mình.\n\n💡 **Gợi ý bổ sung:** Thử liên kết lý thuyết hôm nay với một tình huống thực tế trong dự án production. Ví dụ cụ thể sẽ giúp bộ não ghi nhớ sâu hơn gấp 3 lần!',
  '✅ **Rất tốt!** Bài note của bạn cho thấy bạn đã nắm vững phần lớn nội dung cốt lõi. Cách trình bày logic và rõ ràng.\n\n🔁 **Nhắc nhở Spaced Repetition:** Đừng quên ôn lại bài này sau 24h và 7 ngày để chuyển kiến thức từ bộ nhớ ngắn hạn sang dài hạn nhé!',
  '💪 **Ấn tượng!** Bạn đã capture được những điểm mấu chốt nhất của ngày học hôm nay.\n\n🧐 **Thử thách tư duy:** Hãy đặt câu hỏi "Tại sao?" và "Dùng khi nào?" cho từng khái niệm bạn vừa ghi. Học chủ động (Active Recall) là phương pháp hiệu quả nhất để không quên kiến thức!',
];

// =====================================================================
// POMODORO HOOK
// =====================================================================
const WORK_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

function usePomodoro() {
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(WORK_SEC);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalTime = phase === 'work' ? WORK_SEC : BREAK_SEC;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const toggle = useCallback(() => setIsRunning(r => !r), []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setPhase('work');
    setTimeLeft(WORK_SEC);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t > 1) return t - 1;
        // Phase complete — flip
        if (phase === 'work') {
          setSessions(s => s + 1);
          setPhase('break');
          return BREAK_SEC;
        } else {
          setPhase('work');
          return WORK_SEC;
        }
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, phase]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return { phase, timeLeft, isRunning, sessions, progress, toggle, reset, fmt };
}

// =====================================================================
// MAIN COMPONENT
// =====================================================================
export default function App() {
  // ---------- Time ----------
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const fmtClock = (d: Date) =>
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  // ---------- Multi-Map ----------
  const [activeMapId, setActiveMapId] = useState(1);
  const [mapLoading, setMapLoading] = useState(false);
  const activeMap = MOCK_MAPS.find(m => m.id === activeMapId)!;

  // ---------- Per-map checklist ----------
  const [checklistMap, setChecklistMap] = useState<Record<number, boolean[]>>({
    1: [false, false, false, false],
    2: [false, false, false, false],
  });
  const checklist = checklistMap[activeMapId] ?? [];
  const checkedCount = checklist.filter(Boolean).length;
  const isAllChecked = checklist.length > 0 && checklist.every(Boolean);

  // ---------- Day completion ----------
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({});
  const dayDone = completedDays[activeMapId] ?? false;

  // ---------- Modals ----------
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const closeModal = () => setActiveModal(null);

  // ---------- Todo ----------
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Ôn từ vựng tiếng Anh buổi sáng', time: '07:30', done: true },
    { id: 2, text: 'Code bài tập OOP: Kế thừa', time: '09:00', done: false },
    { id: 3, text: 'Đọc tài liệu Spring Boot Docs', time: '14:00', done: false },
    { id: 4, text: 'Đi siêu thị', time: '17:00', done: false },
  ]);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoTime, setNewTodoTime] = useState('');

  // ---------- Note + AI ----------
  const [noteText, setNoteText] = useState('');
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [aiText, setAiText] = useState('');

  // ---------- Tree Map zoom ----------
  const [treeZoom, setTreeZoom] = useState(1);

  // ---------- Pomodoro ----------
  const pomo = usePomodoro();
  const RING_R = 38;
  const RING_C = 2 * Math.PI * RING_R;
  const ringOffset = RING_C - (pomo.progress / 100) * RING_C;

  // =====================================================================
  // HANDLERS
  // =====================================================================
  const handleCheck = (idx: number) => {
    setChecklistMap(prev => ({
      ...prev,
      [activeMapId]: prev[activeMapId].map((v, i) => (i === idx ? !v : v)),
    }));
  };

  const switchMap = (id: number) => {
    if (id === activeMapId || mapLoading) return;
    setMapLoading(true);
    setTimeout(() => {
      setActiveMapId(id);
      setMapLoading(false);
    }, 500);
  };

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.time === 'Cả ngày') return 1;
    if (b.time === 'Cả ngày') return -1;
    return a.time.localeCompare(b.time);
  });

  const handleAddTodo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !newTodoText.trim()) return;
    const newItem: Todo = {
      id: Date.now(),
      text: newTodoText.trim(),
      time: newTodoTime || 'Cả ngày',
      done: false,
    };
    setTodos(prev =>
      [...prev, newItem].sort((a, b) => {
        if (a.time === 'Cả ngày') return 1;
        if (b.time === 'Cả ngày') return -1;
        return a.time.localeCompare(b.time);
      })
    );
    setNewTodoText('');
    setNewTodoTime('');
  };

  const toggleTodo = (id: number) =>
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));

  const openNoteModal = () => {
    setNoteText('');
    setAiState('idle');
    setAiText('');
    setActiveModal('note_input');
  };

  const sendToAI = () => {
    if (noteText.trim().length < 20 || aiState !== 'idle') return;
    setAiState('loading');
    setTimeout(() => {
      setAiText(AI_FEEDBACKS[Math.floor(Math.random() * AI_FEEDBACKS.length)]);
      setAiState('done');
    }, 2200);
  };

  const saveNote = () => {
    setCompletedDays(prev => ({ ...prev, [activeMapId]: true }));
    setActiveModal('day_complete');
  };

  // =====================================================================
  // MODAL RENDERER
  // =====================================================================
  const renderModal = () => {
    switch (activeModal) {

      // ── Note Input + AI ─────────────────────────────────────────────
      case 'note_input':
        return (
          <div className="flex flex-col gap-5 h-full">
            {/* Header */}
            <div>
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{activeMap.currentDay}</span>
              <h2 className="text-xl font-bold text-gray-800 mt-0.5">Xác nhận & Nhập Note</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Tóm tắt những gì bạn đã học bằng ngôn ngữ của chính mình.
                <span className="text-red-400 font-medium"> Chức năng dán (Ctrl+V) đã bị tắt</span> để đảm bảo bạn tự viết.
              </p>
            </div>

            {/* Textarea */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Tóm tắt bài học hôm nay của bạn:</label>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onPaste={e => e.preventDefault()}
                placeholder="Hôm nay tôi đã học về... Tôi hiểu được rằng... Điểm quan trọng nhất là..."
                rows={5}
                disabled={aiState === 'loading'}
                className="w-full p-4 border border-gray-200 rounded-xl text-sm leading-relaxed resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:bg-gray-50 disabled:text-gray-400"
              />
              <div className="flex justify-between items-center text-xs">
                <span className={noteText.length < 20 ? 'text-amber-500' : 'text-green-500 font-medium'}>
                  {noteText.length < 20
                    ? `⚠ Cần thêm ít nhất ${20 - noteText.length} ký tự nữa`
                    : `✓ ${noteText.length} ký tự — Sẵn sàng gửi AI`}
                </span>
                <span className="text-gray-400">🔒 Paste bị chặn</span>
              </div>
            </div>

            {/* AI Feedback */}
            {aiState !== 'idle' && (
              <div
                className={`rounded-xl p-4 border text-sm leading-relaxed transition-all ${
                  aiState === 'loading'
                    ? 'bg-blue-50 border-blue-100'
                    : 'bg-gradient-to-br from-emerald-50 to-green-50 border-green-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                      aiState === 'loading' ? 'bg-blue-200' : 'bg-green-500 text-white'
                    }`}
                    style={aiState === 'loading' ? { animation: 'spin 1s linear infinite' } : {}}
                  >
                    {aiState === 'loading' ? '⟳' : '✓'}
                  </div>
                  <span className="font-bold text-gray-700">
                    {aiState === 'loading' ? 'Gemini AI đang phân tích bài note của bạn...' : 'Nhận xét từ Gemini AI'}
                  </span>
                </div>
                {aiState === 'done' && (
                  <p className="text-gray-700 whitespace-pre-line">{aiText}</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-auto flex-shrink-0">
              {aiState !== 'done' ? (
                <button
                  onClick={sendToAI}
                  disabled={noteText.trim().length < 20 || aiState === 'loading'}
                  className={`flex-grow py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    noteText.trim().length >= 20 && aiState === 'idle'
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:-translate-y-0.5'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {aiState === 'loading' ? (
                    <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Đang gửi AI...</>
                  ) : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Gửi AI Xác Nhận</>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setAiState('idle'); setAiText(''); }}
                    className="px-5 py-3.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                  >
                    Sửa lại Note
                  </button>
                  <button
                    onClick={saveNote}
                    className="flex-grow py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Hoàn Tất & Lưu Note
                  </button>
                </>
              )}
            </div>
          </div>
        );

      // ── Day Complete Celebration ─────────────────────────────────────
      case 'day_complete':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-6 text-center">
            <div className="text-7xl" style={{ animation: 'bounce 1s ease infinite' }}>🎉</div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 mb-1">Hoàn thành ngày học!</h2>
              <p className="text-gray-500 text-sm">{activeMap.currentDay}</p>
            </div>
            <div className="w-full max-w-xs bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
              <div className="text-4xl font-black text-blue-600 mb-1">
                {activeMap.currentDayIndex}/{activeMap.totalDays}
              </div>
              <div className="text-xs text-blue-400 mb-4">ngày hoàn thành trong lộ trình</div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  style={{ width: `${activeMap.progress}%`, transition: 'width 1s ease' }}
                />
              </div>
              <div className="text-xs text-blue-400 mt-2">{activeMap.progress}% hoàn thành</div>
            </div>
            <p className="text-sm text-gray-400 italic">
              ✨ Node hôm nay trên Tree Map đã sáng lên!
            </p>
            <button
              onClick={closeModal}
              className="px-10 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg transition-all hover:-translate-y-0.5"
            >
              Tuyệt vời, tiếp tục! →
            </button>
          </div>
        );

      // ── Todo Manage ──────────────────────────────────────────────────
      case 'todo_manage':
        return (
          <div className="flex flex-col h-full gap-5">
            <div className="flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800">Quản lý To-do List</h2>
              <span className="text-sm font-bold text-blue-500">
                {todos.filter(t => t.done).length}/{todos.length} xong
              </span>
            </div>

            {/* Add new */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex-shrink-0">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Thêm việc mới</p>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={newTodoTime}
                  onChange={e => setNewTodoTime(e.target.value)}
                  className="p-2.5 border border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
                />
                <input
                  type="text"
                  placeholder="Nhập việc cần làm và nhấn Enter..."
                  value={newTodoText}
                  onChange={e => setNewTodoText(e.target.value)}
                  onKeyDown={handleAddTodo}
                  className="flex-grow p-2.5 border border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto flex flex-col gap-2 pr-1">
              {sortedTodos.map(todo => (
                <label
                  key={todo.id}
                  className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-all select-none ${
                    todo.done
                      ? 'bg-gray-50 border-gray-100'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={todo.done}
                      onChange={() => toggleTodo(todo.id)}
                      className="w-5 h-5 text-blue-600 rounded cursor-pointer accent-blue-500"
                    />
                    <span className={`text-sm ${todo.done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                      {todo.text}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold flex-shrink-0 ml-2 ${
                      todo.done ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {todo.time}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      // ── Tree Map Full ─────────────────────────────────────────────────
      case 'tree_map':
        return (
          <div className="flex flex-col h-full gap-4">
            {/* Header */}
            <div className="flex justify-between items-end flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Bản đồ Phát triển</h2>
                <p className="text-sm text-blue-500 font-medium mt-0.5">{activeMap.title}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-gray-800">{activeMap.progress}%</div>
                <div className="text-xs text-gray-400">đã hoàn thành</div>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl flex-shrink-0">
              <span className="text-xs font-semibold text-gray-500">Thu phóng: {Math.round(treeZoom * 100)}%</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTreeZoom(v => Math.max(0.5, parseFloat((v - 0.2).toFixed(1))))}
                  className="w-7 h-7 bg-white rounded-lg shadow text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 font-bold transition-colors"
                >
                  −
                </button>
                <input
                  type="range" min="0.5" max="2" step="0.1"
                  value={treeZoom}
                  onChange={e => setTreeZoom(parseFloat(e.target.value))}
                  className="w-28 accent-blue-500"
                />
                <button
                  onClick={() => setTreeZoom(v => Math.min(2, parseFloat((v + 0.2).toFixed(1))))}
                  className="w-7 h-7 bg-white rounded-lg shadow text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 font-bold transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-grow bg-slate-50 border border-slate-200 rounded-xl overflow-auto cursor-grab active:cursor-grabbing">
              <div
                style={{ transform: `scale(${treeZoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }}
                className="flex flex-col items-center pt-6 pb-16"
              >
                {activeMap.treeNodes.map((node, i) => {
                  const isLeft = i % 2 === 0;
                  const prevPhase = i > 0 ? activeMap.treeNodes[i - 1].phase : null;
                  const showPhaseLabel = prevPhase !== node.phase;

                  return (
                    <div key={i} className="flex flex-col items-center w-full">
                      {showPhaseLabel && (
                        <div className={`${i > 0 ? 'mt-5' : ''} mb-3 text-xs font-bold uppercase tracking-widest text-gray-400 bg-white border border-gray-200 px-5 py-1.5 rounded-full shadow-sm`}>
                          {node.phase}
                        </div>
                      )}

                      {/* Connector */}
                      {(i > 0 || !showPhaseLabel) && i > 0 && (
                        <div
                          className="w-0.5 h-8"
                          style={{ backgroundColor: node.status !== 'locked' ? '#93C5FD' : '#E5E7EB' }}
                        />
                      )}

                      {/* Node row */}
                      <div className={`relative flex items-center w-full max-w-sm ${isLeft ? 'justify-end pr-[52%]' : 'justify-start pl-[52%]'}`}>
                        {/* Center dot */}
                        <div
                          className={`absolute left-1/2 -translate-x-1/2 rounded-full border-4 border-white shadow z-10 ${
                            node.status === 'current'
                              ? 'w-5 h-5 bg-blue-500'
                              : node.status === 'completed'
                              ? 'w-4 h-4 bg-blue-500'
                              : 'w-4 h-4 bg-gray-300'
                          }`}
                          style={node.status === 'current' ? {
                            animation: 'pulse 2s ease-in-out infinite',
                            boxShadow: '0 0 0 6px rgba(59,130,246,0.15)',
                          } : {}}
                        />

                        {/* Connector to card */}
                        <div
                          className="absolute left-1/2 top-1/2 -translate-y-1/2 h-px"
                          style={{
                            width: '44px',
                            left: isLeft ? 'calc(50% - 44px)' : '50%',
                            backgroundColor: node.status !== 'locked' ? '#93C5FD' : '#E5E7EB',
                          }}
                        />

                        {/* Card */}
                        <div
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm border whitespace-nowrap ${
                            node.status === 'current'
                              ? 'bg-white border-blue-400 text-blue-700 shadow-blue-100 shadow-md'
                              : node.status === 'completed'
                              ? 'bg-blue-500 border-blue-600 text-white'
                              : 'bg-white border-gray-200 text-gray-400'
                          }`}
                          style={node.status === 'current' ? { transform: 'scale(1.05)' } : {}}
                        >
                          {node.status === 'current'
                            ? `▶ ${node.title}`
                            : node.status === 'completed'
                            ? `✓ ${node.title}`
                            : `🔒 ${node.title}`}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Finish */}
                <div className="w-0.5 h-8 bg-gray-200" />
                <div className="bg-yellow-100 border-2 border-yellow-300 text-yellow-700 px-6 py-3 rounded-full font-black text-sm shadow">
                  🏁 Đích: Hoàn thành {activeMap.totalDays} ngày
                </div>
              </div>
            </div>
          </div>
        );

      // ── Note History ─────────────────────────────────────────────────
      case 'note_history':
        return (
          <div className="flex flex-col h-full gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Lịch sử Note</h2>
              <p className="text-sm text-gray-400 mt-0.5">{activeMap.title}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-1">
              {Array.from({ length: activeMap.currentDayIndex }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-100 rounded-xl p-3.5 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-blue-500 mb-1.5">Day {i + 1}</div>
                  <div className="text-xs text-gray-500 leading-relaxed line-clamp-3 italic">
                    Hoàn thành và ghi note bài học về {activeMap.treeNodes[i]?.title ?? '...'}
                  </div>
                  <div className="text-xs text-gray-300 mt-2 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Đọc lại →
                  </div>
                </div>
              ))}
              {activeMap.currentDayIndex === 0 && (
                <div className="col-span-3 text-center py-10 text-gray-400 text-sm">
                  Chưa có note nào. Hoàn thành ngày đầu tiên để bắt đầu!
                </div>
              )}
            </div>
          </div>
        );

      // ── Profile ──────────────────────────────────────────────────────
      case 'profile':
        return (
          <div className="flex flex-col items-center gap-6 py-2">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              </svg>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-black text-gray-800">Nhà Phát Triển</h2>
              <p className="text-sm text-gray-400 mt-1">Tham gia từ 01/06/2026 · <span className="text-orange-500 font-bold">🔥 24 ngày streak</span></p>
            </div>

            {/* Stats */}
            <div className="w-full grid grid-cols-3 gap-3">
              {[
                { label: 'Lộ trình', value: '2', icon: '🗺️' },
                { label: 'Ngày hoàn thành', value: '32', icon: '✅' },
                { label: 'Pomodoro', value: String(pomo.sessions), icon: '🍅' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                  <div className="text-xl mb-0.5">{s.icon}</div>
                  <div className="text-xl font-black text-gray-800">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Badges */}
            <div className="w-full">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Huy hiệu kỹ năng</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: '☕', name: 'Coder Cà Phê', bg: 'from-amber-50 to-orange-50', border: 'border-amber-200', text: 'text-amber-700', unlocked: true },
                  { icon: '🎯', name: 'OOP Master', bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200', text: 'text-blue-700', unlocked: true },
                  { icon: '📚', name: 'IELTS Warrior', bg: 'from-green-50 to-emerald-50', border: 'border-green-200', text: 'text-green-700', unlocked: true },
                  { icon: '🔒', name: 'Sắp mở...', bg: 'from-gray-50 to-gray-50', border: 'border-gray-200', text: 'text-gray-400', unlocked: false },
                ].map((b, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center p-3 rounded-xl border bg-gradient-to-br ${b.bg} ${b.border} transition-transform ${b.unlocked ? 'hover:scale-105 cursor-pointer' : 'opacity-60 grayscale'}`}
                  >
                    <span className="text-2xl">{b.icon}</span>
                    <span className={`text-xs font-bold mt-1 text-center leading-tight ${b.text}`}>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Đang phát triển...
          </div>
        );
    }
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <>
      {/* Global CSS for animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; box-sizing: border-box; }
        body { background: #F0F2F5; margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); } 50% { box-shadow: 0 0 0 8px rgba(59,130,246,0); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
      `}</style>

      <div className="min-h-screen bg-[#F0F2F5] flex flex-col">

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center gap-4">

            {/* Logo + Map Selector */}
            <div className="flex items-center gap-5 min-w-0">
              <div className="text-xl font-black tracking-widest text-gray-200 select-none flex-shrink-0">
                <span className="text-blue-500">M</span>MAP
              </div>

              <nav className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 min-w-0 overflow-x-auto">
                {MOCK_MAPS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => switchMap(m.id)}
                    disabled={mapLoading}
                    title={m.title}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                      activeMapId === m.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                    }`}
                  >
                    {m.shortTitle}
                  </button>
                ))}
                <div className="w-px h-5 bg-gray-300 mx-1 flex-shrink-0" />
                <button
                  onClick={() => alert('Mở luồng Import File Excel tại đây')}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-400 hover:text-blue-500 hover:bg-white/60 transition-all flex items-center gap-1 flex-shrink-0"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Thêm Mới
                </button>
              </nav>
            </div>

            {/* Profile Button */}
            <button
              onClick={() => setActiveModal('profile')}
              className="flex items-center gap-3 hover:bg-gray-100 px-3 py-2 rounded-xl transition-all flex-shrink-0"
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-gray-700 leading-none">Nhà Phát Triển</div>
                <div className="text-xs text-gray-400 mt-0.5">3 huy hiệu · 🔥 24 streak</div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                </svg>
              </div>
            </button>
          </div>
        </header>

        {/* ── MAIN GRID ──────────────────────────────────────────────── */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ═══════ CỘT TRÁI ═══════ */}
          <aside className="lg:col-span-3 flex flex-col gap-5">

            {/* Note Widget */}
            <div
              onClick={() => setActiveModal('note_history')}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col cursor-pointer hover:shadow-md hover:border-purple-200 transition-all group"
              style={{ minHeight: 148 }}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <h2 className="font-bold text-gray-700 text-sm tracking-wide">NOTE HÔM QUA</h2>
                </div>
                <span className="text-xs text-purple-400 group-hover:text-purple-600 transition-colors">Lịch sử →</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed italic line-clamp-3">
                Hôm qua học về <span className="font-semibold text-purple-500 not-italic">{activeMap.title}</span> — ôn lại các khái niệm nền tảng và áp dụng vào bài tập thực hành...
              </p>
            </div>

            {/* Todo Widget */}
            <div
              onClick={() => setActiveModal('todo_manage')}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group flex-grow"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                      <polyline points="9 11 12 14 22 4"/>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                  </div>
                  <h2 className="font-bold text-gray-700 text-sm tracking-wide">TO-DO HÔM NAY</h2>
                </div>
                <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold">
                  {todos.filter(t => t.done).length}/{todos.length}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 overflow-hidden flex-grow">
                {sortedTodos.slice(0, 6).map(todo => (
                  <div key={todo.id} className={`flex items-center gap-3 ${todo.done ? 'opacity-50' : ''}`}>
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${todo.done ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {todo.done && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <span className={`text-sm block truncate ${todo.done ? 'text-gray-400 line-through' : 'text-gray-600 font-medium'}`}>
                        {todo.text}
                      </span>
                      <span className="text-xs font-bold text-blue-400">{todo.time}</span>
                    </div>
                  </div>
                ))}
                {todos.length > 6 && (
                  <p className="text-xs text-gray-400 text-center mt-1">+{todos.length - 6} việc khác...</p>
                )}
              </div>
            </div>
          </aside>

          {/* ═══════ CỘT GIỮA ═══════ */}
          <section className="lg:col-span-6 flex flex-col gap-5">

            {/* Clock */}
            <div className="text-center py-1">
              <h1 className="text-4xl font-black tracking-widest text-gray-800 tabular-nums">
                {fmtClock(now)}
              </h1>
              <p className="text-sm text-gray-400 mt-1 capitalize">{fmtDate(now)}</p>
            </div>

            {/* ── Pomodoro Timer ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between gap-4">

                {/* Phase + Time Info */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full w-fit ${
                      pomo.phase === 'work' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {pomo.phase === 'work' ? '🔥 Tập trung' : '☕ Nghỉ giải lao'}
                  </span>
                  <div className="text-3xl font-black text-gray-800 tabular-nums">{pomo.fmt(pomo.timeLeft)}</div>
                  <div className="text-xs text-gray-400">
                    {pomo.sessions > 0 ? `🍅 ${pomo.sessions} phiên hoàn thành hôm nay` : 'Bấm Bắt đầu để học tập trung'}
                  </div>
                </div>

                {/* SVG Progress Ring */}
                <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                  <svg width="96" height="96" viewBox="0 0 96 96" className="absolute">
                    <circle cx="48" cy="48" r={RING_R} fill="none" stroke="#F3F4F6" strokeWidth="7" />
                    <circle
                      cx="48" cy="48" r={RING_R}
                      fill="none"
                      stroke={pomo.phase === 'work' ? '#EF4444' : '#10B981'}
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      strokeDashoffset={ringOffset}
                      style={{
                        transform: 'rotate(-90deg)',
                        transformOrigin: '48px 48px',
                        transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
                      }}
                    />
                  </svg>
                  <span className="relative text-2xl select-none">
                    {pomo.phase === 'work' ? '🔥' : '☕'}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={pomo.toggle}
                    className={`w-20 h-10 rounded-xl font-bold text-sm transition-all ${
                      pomo.isRunning
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {pomo.isRunning ? '⏸ Dừng' : '▶ Bắt đầu'}
                  </button>
                  <button
                    onClick={pomo.reset}
                    className="w-20 h-10 rounded-xl font-bold text-sm bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 transition-all"
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>
            </div>

            {/* ── Checklist Card ── */}
            <div
              className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex-grow flex flex-col relative overflow-hidden transition-opacity duration-300 ${mapLoading ? 'opacity-40 pointer-events-none' : 'fade-in'}`}
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl" />

              {/* Map + Day header */}
              <div className="mb-4">
                <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">{activeMap.title}</div>
                <h2 className="text-xl font-bold text-gray-800">
                  {mapLoading ? <span className="animate-pulse text-gray-300">Đang tải...</span> : activeMap.currentDay}
                </h2>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-grow h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${checklist.length > 0 ? (checkedCount / checklist.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-500 flex-shrink-0 tabular-nums">
                  {checkedCount}/{checklist.length}
                </span>
              </div>

              {/* Checklist items */}
              <div className="flex-grow flex flex-col gap-3 overflow-y-auto">
                {activeMap.checklists.map((text, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-4 p-3.5 rounded-xl cursor-pointer border transition-all ${
                      checklist[idx]
                        ? 'bg-blue-50/70 border-blue-100'
                        : 'hover:bg-gray-50 border-transparent hover:border-gray-100'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all duration-200 ${
                        checklist[idx] ? 'bg-blue-500 border-blue-500 shadow-sm' : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {checklist[idx] && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={!!checklist[idx]}
                      onChange={() => handleCheck(idx)}
                    />
                    <span className={`text-sm font-medium leading-relaxed transition-colors ${checklist[idx] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {text}
                    </span>
                  </label>
                ))}
              </div>

              {/* Complete Button */}
              {!dayDone ? (
                <button
                  onClick={isAllChecked ? openNoteModal : undefined}
                  disabled={!isAllChecked}
                  className={`w-full mt-5 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                    isAllChecked
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isAllChecked ? (
                    <>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      Hoàn thành & Nhập Note
                    </>
                  ) : (
                    `Hoàn thành ${checkedCount}/${checklist.length} mục để mở khóa`
                  )}
                </button>
              ) : (
                <div className="w-full mt-5 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Ngày hôm nay đã hoàn thành! 🎉
                </div>
              )}
            </div>
          </section>

          {/* ═══════ CỘT PHẢI ═══════ */}
          <aside className="lg:col-span-3">
            <div
              onClick={() => setActiveModal('tree_map')}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
            >
              {/* Bottom progress bar */}
              <div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 rounded-b-2xl"
                style={{ width: `${activeMap.progress}%` }}
              />

              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <h2 className="font-bold text-gray-700 text-sm tracking-wide">TREE MAP</h2>
                </div>
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                  {activeMap.progress}%
                </span>
              </div>

              {/* Mini Tree Map */}
              <div className="flex-grow w-full border border-dashed border-gray-100 rounded-xl bg-gradient-to-b from-gray-50 to-white flex items-start justify-center overflow-hidden relative py-3">
                <svg width="160" height="100%" viewBox={`0 0 160 ${activeMap.treeNodes.length * 36 + 20}`} className="overflow-visible">
                  {/* Vertical guide */}
                  <line x1="80" y1="5" x2="80" y2={activeMap.treeNodes.length * 36 + 10} stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="3 3"/>

                  {activeMap.treeNodes.map((node, i) => {
                    const y = 14 + i * 36;
                    const isLeft = i % 2 === 0;
                    const lineX2 = isLeft ? 68 : 92;
                    const labelX = isLeft ? 62 : 88;
                    const labelAnchor = isLeft ? 'end' : 'start';
                    const color = node.status === 'locked' ? '#D1D5DB' : '#3B82F6';

                    return (
                      <g key={i}>
                        <line x1="80" y1={y} x2={lineX2} y2={y} stroke={node.status !== 'locked' ? '#BFDBFE' : '#F3F4F6'} strokeWidth="1.5"/>
                        {node.status === 'current' ? (
                          <>
                            <circle cx="80" cy={y} r="7" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2"/>
                            <circle cx="80" cy={y} r="3.5" fill="#3B82F6" style={{ animation: 'pulse 2s ease infinite' }}/>
                          </>
                        ) : (
                          <circle cx="80" cy={y} r={node.status === 'completed' ? 5 : 4.5} fill={node.status === 'completed' ? '#3B82F6' : 'white'} stroke={color} strokeWidth="1.5"/>
                        )}
                        <text x={labelX} y={y + 1} textAnchor={labelAnchor} fontSize="7.5" fill={node.status === 'current' ? '#3B82F6' : node.status === 'completed' ? '#6B7280' : '#9CA3AF'} fontWeight={node.status === 'current' ? '700' : '500'} dominantBaseline="middle">
                          {node.title.length > 14 ? node.title.substring(0, 14) + '…' : node.title}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute bottom-2 right-2 text-xs text-gray-300 group-hover:text-indigo-400 transition-colors">
                  Xem đầy đủ →
                </div>
              </div>

              {/* Stats */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                  <div className="text-xl font-black text-blue-600">{activeMap.currentDayIndex}</div>
                  <div className="text-xs text-blue-400">Ngày hiện tại</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <div className="text-xl font-black text-gray-600">{activeMap.totalDays - activeMap.currentDayIndex}</div>
                  <div className="text-xs text-gray-400">Ngày còn lại</div>
                </div>
              </div>
            </div>
          </aside>
        </main>

        {/* ── MODAL OVERLAY ──────────────────────────────────────────── */}
        {activeModal && (
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col relative fade-in"
              style={{ maxHeight: '88vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-full flex items-center justify-center z-20 transition-all font-bold text-sm"
                aria-label="Đóng"
              >
                ✕
              </button>

              <div className="p-6 sm:p-8 flex-grow overflow-y-auto">
                {renderModal()}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}