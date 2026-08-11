import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { UserMap, DayDetail, ChecklistItem } from '@/api/maps';
import type { Todo } from '@/api/todos';
import type { NoteHistory } from '@/api/notes';
import { ImportMapModal } from '@/components/ImportMapModal';
import { reviewNoteWithAi } from '@/api/ai';
import { ContentReaderModal } from '@/components/ContentReaderModal';
import type { UserProfile } from '@/api/profile';
import { saveGroqKey, deleteGroqKey, getGroqKeyStatus } from '@/api/profile';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import confetti from 'canvas-confetti';

// =====================================================================
// PROPS INTERFACE — Nhận dữ liệu thực từ useDashboard() hook
// =====================================================================
interface DashboardProps {
  // Auth & Profile
  user: { email: string; username: string } | null;
  profile: UserProfile | null;
  logout: () => void;

  // Maps
  maps: UserMap[];
  activeMapId: number | null;
  activeMap: UserMap | null;
  isLoadingMaps: boolean;

  // Current day
  currentDay: DayDetail | null;
  isLoadingDay: boolean;

  // Todos
  todos: Todo[];
  isLoadingTodos: boolean;

  // Note history
  noteHistory: NoteHistory[];

  // Error
  error: string | null;
  clearError: () => void;
  isServerWarming: boolean;
  retryLoad: () => void;

  // Today date
  today: string;

  // Actions
  switchMap: (mapId: number, userMapId: number) => Promise<void>;
  toggleChecklist: (checklistId: number) => Promise<void>;
  saveNote: (mapDayId: number, noteContent: string) => Promise<void>;
  fetchTodos: (date: string) => void;
  fetchMaps: () => Promise<void>;
  createTodo: (content: string, dueTime: string | null) => Promise<void>;
  toggleTodo: (id: number) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
  fetchNoteHistory: (mapId: number) => void;
}

// =====================================================================
// POMODORO HOOK
// =====================================================================
const fireConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B']
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
};

function usePomodoro() {
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const workSec = workMin * 60;
  const breakSec = breakMin * 60;
  const totalTime = phase === 'work' ? workSec : breakSec;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const toggle = useCallback(() => setIsRunning(r => !r), []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setPhase('work');
    setTimeLeft(workMin * 60);
  }, [workMin]);

  const changeWorkMin = useCallback((delta: number) => {
    if (isRunning) return;
    setWorkMin(m => {
      const next = Math.max(1, Math.min(90, m + delta));
      setTimeLeft(next * 60);
      setPhase('work');
      return next;
    });
  }, [isRunning]);

  const changeBreakMin = useCallback((delta: number) => {
    if (isRunning) return;
    setBreakMin(m => Math.max(1, Math.min(30, m + delta)));
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t > 1) return t - 1;
        if (phase === 'work') {
          setSessions(s => s + 1);
          setPhase('break');
          fireConfetti();
          return breakSec;
        } else {
          setPhase('work');
          return workSec;
        }
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, phase, workSec, breakSec]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return { phase, timeLeft, isRunning, sessions, progress, toggle, reset, fmt, workMin, breakMin, changeWorkMin, changeBreakMin, setWorkMin };
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================
function formatDueTime(dueTime: string | null): string {
  if (!dueTime) return 'Cả ngày';
  try {
    return new Date(dueTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dueTime;
  }
}

// =====================================================================
// EMPTY STATE — Khi user chưa có map nào
// =====================================================================
function EmptyMapState() {
  return (
    <div className="flex flex-col items-center justify-center flex-grow gap-6 py-16 text-center px-6">
      <div className="text-7xl">🗺️</div>
      <div>
        <h2 className="text-2xl font-black text-gray-700 mb-2">Chưa có lộ trình học tập</h2>
        <p className="text-gray-600 font-medium text-sm max-w-sm mx-auto leading-relaxed">
          Bắt đầu bằng cách import file Excel lộ trình học tập của bạn. Mỗi Map là một hành trình chinh phục kỹ năng mới!
        </p>
      </div>
      <a
        href="/api/static/mmap_template.xlsx"
        download
        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg transition-all hover:-translate-y-0.5 flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Tải file mẫu Excel
      </a>
      <p className="text-xs text-gray-300 mt-2">Sau khi tải về, điền thông tin lộ trình vào file rồi import lên hệ thống</p>
    </div>
  );
}

// =====================================================================
// MAIN COMPONENT
// =====================================================================
export default function DashboardComponent(props: DashboardProps) {
  const {
    user, profile, logout,
    maps, activeMapId, activeMap, isLoadingMaps,
    currentDay, isLoadingDay,
    todos, isLoadingTodos,
    noteHistory,
    error, clearError, retryLoad,
    switchMap, toggleChecklist, saveNote,
    fetchMaps, createTodo, toggleTodo, deleteTodo,
    fetchNoteHistory,
  } = props;

  // ---------- Time & Theme ----------
  const [now, setNow] = useState(new Date());
  const [themeMode, setThemeMode] = useState<'auto' | 'sunrise' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'night'>('auto');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const fmtClock = (d: Date) =>
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  // Compute active theme
  const currentTheme = React.useMemo(() => {
    if (themeMode !== 'auto') return themeMode;
    const hour = now.getHours();
    if (hour >= 5 && hour < 7) return 'sunrise';
    if (hour >= 7 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 15) return 'noon';
    if (hour >= 15 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 19) return 'sunset';
    return 'night';
  }, [themeMode, now]);

  const cycleTheme = () => {
    const modes: typeof themeMode[] = ['auto', 'sunrise', 'morning', 'noon', 'afternoon', 'sunset', 'night'];
    setThemeMode(prev => {
      const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
      return modes[nextIdx];
    });
  };

  const getThemeBg = () => {
    switch (currentTheme) {
      case 'sunrise': return '/backgrounds/Sunrise.png';
      case 'morning': return '/backgrounds/morning.png';
      case 'noon': return '/backgrounds/noon.png';
      case 'afternoon': return '/backgrounds/afternoon.png';
      case 'sunset': return '/backgrounds/Sunset.png';
      case 'night': return '/backgrounds/night.png';
      default: return '/backgrounds/morning.png';
    }
  };
  const getThemeIcon = (mode: string) => {
    if (mode === 'auto') return '✨';
    if (mode === 'sunrise') return '🌅';
    if (mode === 'morning') return '🌤️';
    if (mode === 'noon') return '☀️';
    if (mode === 'afternoon') return '🌇';
    if (mode === 'sunset') return '🌆';
    if (mode === 'night') return '🌙';
    return '✨';
  };

  // ---------- Mobile Navigation ----------
  const [mobileTab, setMobileTab] = useState<'home' | 'map' | 'tools' | 'notes'>('home');

  // ---------- Import modal ----------
  const [showImportModal, setShowImportModal] = useState(false);

  // ---------- Tree Map Collapse ----------
  const [collapsedPhases, setCollapsedPhases] = useState<string[]>([]);
  
  const togglePhase = (phaseName: string) => {
    setCollapsedPhases(prev => 
      prev.includes(phaseName) 
        ? prev.filter(p => p !== phaseName) 
        : [...prev, phaseName]
    );
  };

  // ---------- Map switching ----------
  const [mapSwitching, setMapSwitching] = useState(false);
  const handleSwitchMap = async (map: UserMap) => {
    if (map.mapId === activeMapId || mapSwitching) return;
    setMapSwitching(true);
    await switchMap(map.mapId, map.userMapId);
    setMapSwitching(false);
  };

  // ---------- Checklist ----------
  const checklists: ChecklistItem[] = currentDay?.checklists ?? [];
  const checkedCount = currentDay?.checkedCount ?? 0;
  const isAllChecked = currentDay?.allChecked ?? false;
  const dayDone = currentDay?.dayCompleted ?? false;

  const [checkingId, setCheckingId] = useState<number | null>(null);
  const handleCheck = async (item: ChecklistItem) => {
    if (checkingId !== null) return;
    setCheckingId(item.checklistId);
    await toggleChecklist(item.checklistId);
    setCheckingId(null);
  };

  // ---------- Modals ----------
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const closeModal = () => setActiveModal(null);

  // ---------- Todo ----------
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoTime, setNewTodoTime] = useState('');
  const [addingTodo, setAddingTodo] = useState(false);

  const sortedTodos = [...todos].sort((a, b) => {
    if (!a.dueTime) return 1;
    if (!b.dueTime) return -1;
    return a.dueTime.localeCompare(b.dueTime);
  });

  const handleAddTodo = async (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return;
    if (!newTodoText.trim() || addingTodo) return;
    setAddingTodo(true);
    const dueTime = newTodoTime
      ? `${props.today}T${newTodoTime}:00+07:00`
      : null;
    await createTodo(newTodoText.trim(), dueTime);
    setNewTodoText('');
    setNewTodoTime('');
    setAddingTodo(false);
  };

  // ---------- Note + AI ----------
  const [noteText, setNoteText] = useState('');
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [aiText, setAiText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // ---------- Tree Map zoom ----------
  const [treeZoom, setTreeZoom] = useState(1);

  // ---------- Focus Tab (Lý thuyết / Bài học) ----------
  const [focusTab, setFocusTab] = useState<'theory' | 'checklist'>('checklist');
  const [readerMaterial, setReaderMaterial] = useState<any | null>(null);
  const materials = currentDay?.materials ?? [];

  // Auto-switch tab: nếu có tài liệu và ngày chưa complete → mặc định "theory"
  useEffect(() => {
    if (materials.length > 0 && !currentDay?.dayCompleted) {
      setFocusTab('theory');
    } else {
      setFocusTab('checklist');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDay?.mapDayId]);

  // ---------- Pomodoro ----------
  const pomo = usePomodoro();

  // ---------- Voice Chat AI ----------
  const voiceCtx = {
    dayTitle: currentDay?.dayTitle ?? '',
    phaseName: currentDay?.phaseName ?? '',
    checklistItems: (currentDay?.checklists ?? []).map((c: ChecklistItem) => c.checkpointContent),
    materials: (currentDay?.materials ?? []).map(m => ({
      title: m.title,
      contentType: m.contentType,
      content: m.content,
    })),
  };
  const voice = useVoiceChat(voiceCtx);

  const [showVoicePanel, setShowVoicePanel] = useState(false);

  // ---------- Groq Key Settings ----------
  const [showGroqSettings, setShowGroqSettings] = useState(false);
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [groqKeyMasked, setGroqKeyMasked] = useState('');
  const [hasGroqKey, setHasGroqKey] = useState(false);
  const [groqKeyMsg, setGroqKeyMsg] = useState('');

  useEffect(() => {
    getGroqKeyStatus().then(s => {
      setHasGroqKey(s.hasKey);
      setGroqKeyMasked(s.maskedKey);
    }).catch(() => {});
  }, []);

  const handleSaveGroqKey = async () => {
    if (!groqKeyInput.trim()) return;
    try {
      await saveGroqKey(groqKeyInput.trim());
      setGroqKeyMsg('✅ Đã lưu key!');
      setHasGroqKey(true);
      setGroqKeyMasked(groqKeyInput.trim().substring(0, 8) + '••••••••••••••••');
      setGroqKeyInput('');
      setTimeout(() => setGroqKeyMsg(''), 3000);
    } catch { setGroqKeyMsg('❌ Lưu thất bại. Thử lại.'); }
  };

  const handleDeleteGroqKey = async () => {
    try {
      await deleteGroqKey();
      setHasGroqKey(false); setGroqKeyMasked(''); setGroqKeyMsg('🗑️ Đã xoá key.');
      setTimeout(() => setGroqKeyMsg(''), 3000);
    } catch { setGroqKeyMsg('❌ Xoá thất bại.'); }
  };

  // ── Ctrl+D push-to-talk: giữ → nghe, thả → gửi AI ──
  const isHoldingRef = useRef(false);
  useEffect(() => {
    const isInputTarget = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputTarget(e)) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (e.repeat) return; // Bỏ qua auto-repeat khi giữ phím
        if (isHoldingRef.current) return;
        isHoldingRef.current = true;
        setShowVoicePanel(true);
        voice.startListening();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd' && isHoldingRef.current) {
        e.preventDefault();
        isHoldingRef.current = false;
        voice.stopAndSend();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [voice.startListening, voice.stopAndSend]);



  const [tabWarning, setTabWarning] = useState<string | null>(null);
  const hiddenTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pomo.isRunning && pomo.phase === 'work') {
          hiddenTimeRef.current = Date.now();
        }
      } else {
        if (hiddenTimeRef.current && pomo.isRunning && pomo.phase === 'work') {
          const absentSeconds = Math.floor((Date.now() - hiddenTimeRef.current) / 1000);
          if (absentSeconds > 5) {
            setTabWarning(`Đừng lơ đãng nhé, bạn vừa rời đi ${absentSeconds} giây!`);
            setTimeout(() => setTabWarning(null), 5000);
          }
        }
        hiddenTimeRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [pomo.isRunning, pomo.phase]);

  const isZenMode = pomo.isRunning && pomo.phase === 'work';
  const firstUndoneTodo = todos.find(t => !t.done);

  const handleToggleTodo = (id: number) => {
    const t = todos.find(x => x.id === id);
    if (t && !t.done) fireConfetti();
    toggleTodo(id);
  };

  const RING_R = 38;
  const RING_C = 2 * Math.PI * RING_R;
  const ringOffset = RING_C - (pomo.progress / 100) * RING_C;

  // =====================================================================
  // HANDLERS
  // =====================================================================
  const openNoteModal = () => {
    setNoteText('');
    setAiState('idle');
    setAiText('');
    setActiveModal('note_input');
  };

  const sendToAI = async () => {
    if (noteText.trim().length < 20 || aiState !== 'idle') return;
    setAiState('loading');
    
    try {
      const feedback = await reviewNoteWithAi(noteText);
      setAiText(feedback);
      setAiState('done');
    } catch (err: any) {
      setAiText(err.message || 'Không thể gọi AI lúc này. Thử lại sau.');
      setAiState('done');
    }
  };

  const handleSaveNote = async () => {
    if (!currentDay || savingNote) return;
    setSavingNote(true);
    await saveNote(currentDay.mapDayId, noteText);
    setSavingNote(false);
    setActiveModal('day_complete');
  };

  const handleOpenNoteHistory = () => {
    if (activeMap) fetchNoteHistory(activeMap.mapId);
    setActiveModal('note_history');
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
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                {currentDay ? `Day ${currentDay.dayIndex}: ${currentDay.dayTitle}` : '...'}
              </span>
              <h2 className="text-xl font-bold text-gray-800 mt-0.5">Xác nhận & Nhập Note</h2>
              <p className="text-sm text-gray-700 font-medium mt-1 leading-relaxed">
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
                disabled={aiState === 'loading' || savingNote}
                className="w-full p-4 border border-gray-200 bg-white text-gray-800 rounded-xl text-sm leading-relaxed resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:bg-gray-50 disabled:text-gray-400"
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
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="flex-grow py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingNote ? (
                      <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Đang lưu...</>
                    ) : (
                      <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Hoàn Tất & Lưu Note</>
                    )}
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
              <p className="text-gray-700 font-medium text-sm">
                {currentDay ? `Day ${currentDay.dayIndex}: ${currentDay.dayTitle}` : ''}
              </p>
            </div>
            <div className="w-full max-w-xs bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
              <div className="text-4xl font-black text-blue-600 mb-1">
                {activeMap?.daysCompleted ?? 0}/{activeMap?.totalDays ?? 0}
              </div>
              <div className="text-xs text-blue-400 mb-4">ngày hoàn thành trong lộ trình</div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  style={{ width: `${activeMap?.progressPct ?? 0}%`, transition: 'width 1s ease' }}
                />
              </div>
              <div className="text-xs text-blue-400 mt-2">{activeMap?.progressPct ?? 0}% hoàn thành</div>
            </div>
            <p className="text-sm text-gray-600 font-medium italic">
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
                  className="p-2.5 border border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white flex-shrink-0"
                />
                <input
                  type="text"
                  placeholder="Nhập việc cần làm..."
                  value={newTodoText}
                  onChange={e => setNewTodoText(e.target.value)}
                  onKeyDown={handleAddTodo}
                  disabled={addingTodo}
                  className="flex-grow p-2.5 border border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white disabled:opacity-60"
                />
                <button
                  onClick={() => handleAddTodo()}
                  disabled={addingTodo || !newTodoText.trim()}
                  className="flex-shrink-0 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {addingTodo ? (
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  )}
                  Thêm
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto flex flex-col gap-2 pr-1">
              {isLoadingTodos ? (
                <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Đang tải...</div>
              ) : sortedTodos.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Chưa có việc nào hôm nay!</div>
              ) : sortedTodos.map(todo => (
                <div
                  key={todo.id}
                  className={`flex items-center justify-between p-3.5 border rounded-xl transition-all select-none ${
                    todo.done
                      ? 'bg-gray-50 border-gray-100'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-grow min-w-0">
                    <input
                      type="checkbox"
                      checked={todo.done}
                      onChange={() => handleToggleTodo(todo.id)}
                      className="w-5 h-5 text-blue-600 rounded cursor-pointer accent-blue-500 flex-shrink-0"
                    />
                    <span className={`text-sm truncate ${todo.done ? 'text-gray-500 font-medium line-through' : 'text-gray-900 font-semibold'}`}>
                      {todo.taskContent}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${todo.done ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'}`}>
                      {formatDueTime(todo.dueTime)}
                    </span>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                      title="Xóa"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // ── Tree Map Full ─────────────────────────────────────────────────
      case 'tree_map':
        if (!activeMap) return null;
        return (
          <div className="flex flex-col h-full gap-4">
            {/* Header */}
            <div className="flex justify-between items-end flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Bản đồ Phát triển</h2>
                <p className="text-sm text-blue-500 font-medium mt-0.5">{activeMap.title}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-gray-800">{activeMap.progressPct}%</div>
                <div className="text-xs text-gray-600 font-medium">đã hoàn thành</div>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl flex-shrink-0">
              <span className="text-xs font-semibold text-gray-500">Thu phóng: {Math.round(treeZoom * 100)}%</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTreeZoom(v => Math.max(0.5, parseFloat((v - 0.2).toFixed(1))))}
                  className="w-7 h-7 bg-white rounded-lg shadow text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 font-bold transition-colors"
                >−</button>
                <input
                  type="range" min="0.5" max="2" step="0.1"
                  value={treeZoom}
                  onChange={e => setTreeZoom(parseFloat(e.target.value))}
                  className="w-28 accent-blue-500"
                />
                <button
                  onClick={() => setTreeZoom(v => Math.min(2, parseFloat((v + 0.2).toFixed(1))))}
                  className="w-7 h-7 bg-white rounded-lg shadow text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 font-bold transition-colors"
                >+</button>
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
                  const prevPhase = i > 0 ? activeMap.treeNodes[i - 1].phaseName : null;
                  const showPhaseLabel = prevPhase !== node.phaseName;
                  const nodeStatus = node.status.toLowerCase() as 'completed' | 'unlocked' | 'locked';
                  const isCompleted = nodeStatus === 'completed';
                  const isCurrent = nodeStatus === 'unlocked';
                  
                  // Tính tổng số bài trong phase này và số bài hoàn thành
                  const phaseNodes = activeMap.treeNodes.filter(n => n.phaseName === node.phaseName);
                  const phaseCompleted = phaseNodes.filter(n => n.status.toLowerCase() === 'completed').length;
                  const isCollapsed = collapsedPhases.includes(node.phaseName);

                  return (
                    <React.Fragment key={node.mapDayId}>
                      {showPhaseLabel && (
                        <div 
                          onClick={() => togglePhase(node.phaseName)}
                          className={`${i > 0 ? 'mt-5' : ''} mb-3 text-xs font-bold uppercase tracking-widest bg-white border border-gray-200 px-5 py-2 rounded-full shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2 ${isCollapsed ? 'text-gray-500' : 'text-blue-500'}`}
                          title="Bấm để thu gọn/mở rộng Phase"
                        >
                          {node.phaseName}
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md lowercase tracking-normal">
                            {phaseCompleted}/{phaseNodes.length}
                          </span>
                          <svg className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      )}

                      {!isCollapsed && (
                        <div className="flex flex-col items-center w-full">
                          {/* Connector */}
                          {(!showPhaseLabel || !isCollapsed) && (
                            <div
                              className={`w-0.5 ${showPhaseLabel ? 'h-3' : 'h-8'}`}
                              style={{ backgroundColor: !nodeStatus.includes('locked') ? '#93C5FD' : '#E5E7EB' }}
                            />
                          )}

                          {/* Node row */}
                          <div className={`relative flex items-center w-full max-w-sm ${isLeft ? 'justify-end pr-[52%]' : 'justify-start pl-[52%]'}`}>
                            {/* Center dot */}
                            <div
                              className={`absolute left-1/2 -translate-x-1/2 rounded-full border-4 border-white shadow z-10 ${
                                isCurrent ? 'w-5 h-5 bg-blue-500'
                                  : isCompleted ? 'w-4 h-4 bg-blue-500'
                                  : 'w-4 h-4 bg-gray-300'
                              }`}
                              style={isCurrent ? {
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
                                backgroundColor: !nodeStatus.includes('locked') ? '#93C5FD' : '#E5E7EB',
                              }}
                            />

                            {/* Card */}
                            <div
                              className={`px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm border whitespace-nowrap ${
                                isCurrent
                                  ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 cursor-pointer shadow-blue-200'
                                  : isCompleted
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer'
                                  : 'bg-white text-gray-400 border-gray-200 opacity-60'
                              }`}
                              style={isCurrent ? { transform: 'scale(1.05)' } : {}}
                              onClick={() => {
                                if (isCurrent || isCompleted) {
                                  // Có thể thêm logic chọn ngày cũ ở đây
                                }
                              }}
                            >
                              Day {node.dayIndex}
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
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
              <p className="text-sm text-gray-600 font-medium mt-0.5">{activeMap?.title}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-1">
              {noteHistory.length === 0 ? (
                <div className="col-span-3 text-center py-10 text-gray-400 text-sm">
                  Chưa có note nào. Hoàn thành ngày đầu tiên để bắt đầu!
                </div>
              ) : noteHistory.map((note) => (
                <div
                  key={note.noteId}
                  className="bg-white/60 backdrop-blur-[100px] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl p-3.5 hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  <div className="text-xs font-bold text-blue-500 mb-1.5">Day {note.dayIndex}</div>
                  <div className="text-xs font-bold text-gray-800 mb-1 line-clamp-1">{note.dayTitle}</div>
                  <div className="text-xs text-gray-700 font-medium leading-relaxed line-clamp-3 italic">
                    {note.noteContent}
                  </div>
                  <div className="text-xs text-gray-300 mt-2">
                    {new Date(note.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              ))}
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
              <h2 className="text-xl font-black text-gray-800">{user?.username ?? 'Người dùng'}</h2>
              <p className="text-sm text-gray-600 font-medium mt-1">{user?.email}</p>
            </div>

            {/* Stats */}
            <div className="w-full grid grid-cols-4 gap-2">
              {[
                { label: 'Lộ trình', value: String(profile?.totalMapsEnrolled ?? maps.length), icon: '🗺️' },
                { label: 'Ngày học', value: String(profile?.totalDaysCompleted ?? maps.reduce((s, m) => s + m.daysCompleted, 0)), icon: '✅' },
                { label: 'Chuỗi', value: `${profile?.currentStreak ?? 0}🔥`, icon: '⚡' },
                { label: 'Cà chua', value: String(pomo.sessions), icon: '🍅' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-center">
                  <div className="text-lg mb-0.5">{s.icon}</div>
                  <div className="text-lg font-black text-gray-800">{s.value}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Skills */}
            {profile?.skills && profile.skills.length > 0 && (
              <div className="w-full">
                <div className="text-xs font-bold text-gray-500 uppercase mb-3">Kỹ năng đạt được</div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(skill => (
                    <div key={skill.skillId} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold" title={`Mở khóa: ${new Date(skill.unlockedAt).toLocaleDateString('vi-VN')}`}>
                      <span>{skill.iconUrl}</span>
                      {skill.skillName}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={() => { logout(); }}
              className="w-full py-3 rounded-xl font-bold text-sm bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-all flex items-center justify-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Đăng xuất
            </button>
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
      {/* Global CSS */}
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

      {/* Error Banner */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-red-500 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-3 fade-in max-w-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="flex-grow">{error}</span>
          <button
            onClick={() => { clearError(); retryLoad(); }}
            className="flex-shrink-0 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-bold transition-all"
          >
            🔄 Thử lại
          </button>
          <button onClick={clearError} className="flex-shrink-0 font-bold opacity-80 hover:opacity-100">✕</button>
        </div>
      )}

      <div 
        className="min-h-screen flex flex-col transition-all duration-700 bg-cover bg-center bg-no-repeat bg-fixed relative"
        style={{ backgroundImage: `url(${getThemeBg()})` }}
      >
        {/* Dimmed Overlay */}
        <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white/50 backdrop-blur-[100px] border-b border-white/30 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center gap-4">

            {/* Logo + Map Selector */}
            <div className="flex items-center gap-5 min-w-0">
              <div className="text-xl font-black tracking-widest text-gray-800 select-none flex-shrink-0 drop-shadow-md">
                <span className="text-blue-600">M</span>MAP
              </div>

              <div className="flex items-center gap-2">
                <nav className="flex items-center bg-white/60 backdrop-blur-[100px] rounded-xl p-1 gap-0.5 min-w-0 overflow-x-auto shadow-sm border border-white/40">
                  {isLoadingMaps ? (
                    <div className="px-4 py-1.5 text-sm text-gray-400">Đang tải...</div>
                  ) : maps.map(m => (
                    <button
                      key={m.userMapId}
                      onClick={() => handleSwitchMap(m)}
                      disabled={mapSwitching}
                      title={m.title}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                        activeMapId === m.mapId
                          ? 'bg-white/80 text-blue-600 shadow-sm'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      {m.title.length > 20 ? m.title.substring(0, 20) + '…' : m.title}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-gray-300 mx-1 flex-shrink-0" />
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-gray-700 bg-white/40 hover:bg-white/60 rounded-lg whitespace-nowrap flex-shrink-0 transition-colors border border-white/40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Thêm Mới
                  </button>
                </nav>

                <button
                  onClick={cycleTheme}
                  title={`Giao diện: ${themeMode}`}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/40 hover:bg-white/60 border border-white/40 shadow-sm transition-all"
                >
                  <span className="text-lg leading-none">{getThemeIcon(themeMode)}</span>
                </button>
              </div>
            </div>

            {/* Streak & Profile Button */}
            <div className="flex items-center gap-3">
              {profile && profile.currentStreak > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-600 px-3 py-1.5 rounded-xl font-black text-sm shadow-sm" title="Chuỗi học tập">
                  🔥 {profile.currentStreak}
                </div>
              )}
              <button
                onClick={() => setActiveModal('profile')}
                className="flex items-center gap-3 hover:bg-gray-100 px-3 py-2 rounded-xl transition-all flex-shrink-0"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-gray-700 leading-none">{user?.username ?? 'Người dùng'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{maps.length} lộ trình</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0 relative">
                  {profile && profile.currentStreak > 0 && (
                    <div className="sm:hidden absolute -top-1.5 -right-1.5 text-xs bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                      🔥{profile.currentStreak}
                    </div>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* ── MAIN GRID ──────────────────────────────────────────────── */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-20 lg:mb-0">

          {/* Empty state — chưa có map */}
          {!isLoadingMaps && maps.length === 0 && (
            <div className="lg:col-span-12 flex">
              <EmptyMapState />
            </div>
          )}

          {/* Normal layout — đã có map */}
          {maps.length > 0 && (
            <>
              {/* ═══════ CỘT TRÁI ═══════ */}
              <aside className={`flex-col gap-5 transition-all duration-500 ${isZenMode ? 'hidden' : 'lg:col-span-3 lg:flex'} ${mobileTab === 'notes' ? 'flex' : 'hidden'}`}>

                {/* Note Widget */}
                <div
                  onClick={handleOpenNoteHistory}
                  className="bg-white/60 backdrop-blur-[100px] rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] shadow-sm p-5 flex flex-col cursor-pointer hover:shadow-md hover:border-purple-200 transition-all group"
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
                    {noteHistory.length > 0
                      ? noteHistory[0].noteContent
                      : `Học ${activeMap?.title ?? '...'} — Hoàn thành ngày đầu tiên để bắt đầu ghi note!`}
                  </p>
                </div>

                {/* Todo Widget */}
                <div
                  onClick={() => setActiveModal('todo_manage')}
                  className="bg-white/60 backdrop-blur-[100px] rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] shadow-sm p-5 flex flex-col cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group flex-grow"
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
                    {isLoadingTodos ? (
                      <div className="text-xs text-gray-400 text-center py-4">Đang tải...</div>
                    ) : sortedTodos.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center py-4">Chưa có việc nào hôm nay!</div>
                    ) : sortedTodos.slice(0, 6).map(todo => (
                      <div key={todo.id} className={`flex items-center gap-3 ${todo.done ? 'opacity-50' : ''}`}>
                        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${todo.done ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                          {todo.done && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <span className={`text-sm block truncate ${todo.done ? 'text-gray-500 font-medium line-through' : 'text-gray-600 font-medium'}`}>
                            {todo.taskContent}
                          </span>
                          <span className="text-xs font-bold text-blue-400">{formatDueTime(todo.dueTime)}</span>
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
              <section className={`flex-col gap-5 transition-all duration-500 ${isZenMode ? 'lg:col-span-8 lg:col-start-3 max-w-4xl mx-auto w-full' : 'lg:col-span-6'} ${mobileTab === 'home' ? 'flex' : 'hidden lg:flex'}`}>

                {/* Clock */}
                <div className="text-center py-1">
                  <h1 className={`text-4xl font-black tracking-widest tabular-nums transition-colors ${currentTheme === 'night' ? 'text-white drop-shadow-md' : 'text-gray-800'}`}>
                    {fmtClock(now)}
                  </h1>
                  <p className={`text-sm font-medium mt-1 capitalize transition-colors ${currentTheme === 'night' ? 'text-white drop-shadow-sm' : 'text-gray-600'}`}>{fmtDate(now)}</p>
                </div>

                {/* ── Pomodoro Timer ── */}
                <div className="bg-white/60 backdrop-blur-[100px] rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] shadow-sm p-5">
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

                      {/* Time adjustment controls */}
                      {!pomo.isRunning && (
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-10">Tập trung</span>
                            <button onClick={() => pomo.changeWorkMin(-5)} className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 font-bold text-xs transition-colors flex items-center justify-center">−</button>
                            <span className="text-xs font-black text-gray-700 tabular-nums w-10 text-center">{pomo.workMin} phút</span>
                            <button onClick={() => pomo.changeWorkMin(5)} className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 font-bold text-xs transition-colors flex items-center justify-center">+</button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-10">Nghỉ</span>
                            <button onClick={() => pomo.changeBreakMin(-1)} className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 font-bold text-xs transition-colors flex items-center justify-center">−</button>
                            <span className="text-xs font-black text-gray-700 tabular-nums w-10 text-center">{pomo.breakMin} phút</span>
                            <button onClick={() => pomo.changeBreakMin(1)} className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 font-bold text-xs transition-colors flex items-center justify-center">+</button>
                          </div>
                        </div>
                      )}
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

                  {/* Smart Suggestion */}
                  {!isZenMode && firstUndoneTodo && (
                    <div className="mt-4 p-3 bg-white/40 border border-indigo-100 rounded-xl text-center fade-in">
                      <p className="text-sm text-gray-700 mb-2">Gợi ý việc tiếp: <strong className="text-indigo-600">{firstUndoneTodo.taskContent}</strong></p>
                      <button
                        onClick={() => {
                          pomo.setWorkMin(5);
                          pomo.toggle();
                        }}
                        className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all"
                      >
                        Học thử 5 phút!
                      </button>
                    </div>
                  )}

                </div>

                {/* ── Checklist Card ── */}
                <div
                  className={`bg-white/60 backdrop-blur-[100px] rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] shadow-sm p-6 flex-grow flex flex-col relative overflow-hidden transition-opacity duration-300 ${mapSwitching ? 'opacity-40 pointer-events-none' : 'fade-in'}`}
                >
                  {/* Top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl" />

                  {/* Map + Day header */}
                  <div className="mb-4">
                    <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">{activeMap?.title}</div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {isLoadingDay
                        ? <span className="animate-pulse text-gray-300">Đang tải ngày học...</span>
                        : currentDay
                        ? `Day ${currentDay.dayIndex}: ${currentDay.dayTitle}`
                        : <span className="text-gray-400 text-base">Chưa có ngày học</span>}
                    </h2>
                    {currentDay?.phaseName && (
                      <p className="text-xs text-gray-400 mt-0.5">{currentDay.phaseName}</p>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-grow h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${checklists.length > 0 ? (checkedCount / checklists.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-500 flex-shrink-0 tabular-nums">
                      {checkedCount}/{checklists.length}
                    </span>
                  </div>

                  {/* ── Tab Switcher ── */}
                  <div className="flex gap-1 mb-4 bg-gray-100/80 rounded-xl p-1">
                    <button
                      onClick={() => setFocusTab('theory')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${
                        focusTab === 'theory'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <span>📚</span>
                      Lý Thuyết
                      {materials.length > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                          focusTab === 'theory' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                        }`}>{materials.length}</span>
                      )}
                    </button>
                    <button
                      onClick={() => setFocusTab('checklist')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${
                        focusTab === 'checklist'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <span>✅</span>
                      Bài Học
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        focusTab === 'checklist' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
                      }`}>{checklists.length}</span>
                    </button>
                  </div>

                  {/* ── Tab: Lý Thuyết ── */}
                  {focusTab === 'theory' && (
                    <div className="flex-grow flex flex-col gap-3 overflow-y-auto">
                      {isLoadingDay ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                        ))
                      ) : materials.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                          <div className="text-4xl">📭</div>
                          <p className="text-sm font-semibold text-gray-500">Chưa có tài liệu cho ngày này</p>
                          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                            Người tạo lộ trình chưa thêm tài liệu tham khảo. Hãy tự tìm tài liệu hoặc chuyển sang tab <strong>Bài Học</strong> để bắt đầu.
                          </p>
                          <button
                            onClick={() => setFocusTab('checklist')}
                            className="mt-1 px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            → Xem Bài Học
                          </button>
                        </div>
                      ) : (
                        materials.map((mat) => {
                          const isLink = mat.contentType === 'link' || mat.contentType === 'youtube';
                          const isYt   = mat.contentType === 'youtube';
                          const icon   = isYt ? '▶️' : mat.contentType === 'link' ? '🔗' : '📄';
                          let domain = '';
                          if (isLink) {
                            try { domain = new URL(mat.content).hostname.replace('www.', ''); } catch { domain = mat.content.slice(0, 30); }
                          }
                          // YouTube thumbnail
                          let ytThumb = '';
                          if (isYt) {
                            const match = mat.content.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
                            if (match) ytThumb = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
                          }
                          return (
                            <div
                              key={mat.materialId}
                              className={`rounded-xl border p-4 transition-all bg-white hover:border-indigo-200 hover:shadow-sm cursor-pointer border-gray-200`}
                              onClick={() => setReaderMaterial(mat)}
                            >
                              {/* YouTube thumbnail */}
                              {isYt && ytThumb && (
                                <div className="relative mb-3 rounded-lg overflow-hidden">
                                  <img src={ytThumb} alt={mat.title} className="w-full h-32 object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-start gap-3">
                                <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
                                <div className="min-w-0 flex-grow">
                                  <p className={`text-sm font-bold leading-snug text-gray-800 group-hover:text-indigo-600`}>{mat.title}</p>

                                  {/* Link: hiện domain */}
                                  {isLink && (
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{domain}</p>
                                  )}

                                  {/* Text: preview ngắn gọn */}
                                  {mat.contentType === 'text' && (
                                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2 whitespace-pre-line">{mat.content}</p>
                                  )}
                                </div>

                                {/* Nút xem */}
                                <div className="flex-shrink-0">
                                  <span className="flex items-center gap-1 text-xs font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                    {isYt ? 'Xem video' : mat.contentType === 'text' ? 'Đọc lý thuyết' : 'Mở tài liệu'}
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ── Tab: Bài Học (Checklist) ── */}
                  {focusTab === 'checklist' && (
                  <div className="flex-grow flex flex-col gap-3 overflow-y-auto">
                    {isLoadingDay ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                      ))
                    ) : checklists.length === 0 ? (
                      <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
                        {currentDay?.dayCompleted ? '✅ Ngày này đã hoàn thành!' : 'Không có checklist cho ngày này'}
                      </div>
                    ) : checklists.map((item) => (
                      <label
                        key={item.checklistId}
                        className={`flex items-start gap-4 p-3.5 rounded-xl cursor-pointer border transition-all ${
                          item.isChecked
                            ? 'bg-blue-50/70 border-blue-100'
                            : 'hover:bg-gray-50 border-transparent hover:border-gray-100'
                        } ${checkingId === item.checklistId ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all duration-200 ${
                            item.isChecked ? 'bg-blue-500 border-blue-500 shadow-sm' : 'border-gray-300 hover:border-blue-300'
                          }`}
                        >
                          {item.isChecked && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={item.isChecked}
                          onChange={() => handleCheck(item)}
                        />
                        <span className={`text-sm font-medium leading-relaxed transition-colors ${item.isChecked ? 'text-gray-500 font-medium line-through' : 'text-gray-700'}`}>
                          {item.checkpointContent}
                        </span>
                      </label>
                    ))}
                  </div>
                  )}

                  {/* Complete Button */}
                  {!dayDone ? (
                    <button
                      onClick={isAllChecked ? openNoteModal : undefined}
                      disabled={!isAllChecked || isLoadingDay}
                      className={`w-full mt-5 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                        isAllChecked && !isLoadingDay
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isAllChecked ? (
                        <>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          Hoàn thành & Nhập Note
                        </>
                      ) : (
                        `Hoàn thành ${checkedCount}/${checklists.length} mục để mở khóa`
                      )}
                    </button>
                  ) : (
                    <div className="w-full mt-5 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      Ngày hôm nay đã hoàn thành! 🎉
                    </div>
                  )}
                </div>
              </section>

              {/* ═══════ CỘT PHẢI ═══════ */}
              <aside className={`flex-col gap-5 transition-all duration-500 ${isZenMode ? 'hidden' : 'lg:col-span-3 lg:flex'} ${mobileTab === 'tools' ? 'flex' : 'hidden'}`}>
                <div
                  onClick={() => setActiveModal('tree_map')}
                  className="bg-white/60 backdrop-blur-[100px] rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] shadow-sm p-5 flex flex-col cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
                >
                  {/* Bottom progress bar */}
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 rounded-b-2xl"
                    style={{ width: `${activeMap?.progressPct ?? 0}%` }}
                  />

                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <h2 className="font-bold text-gray-700 text-sm tracking-wide">TREE MAP</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                        {activeMap?.progressPct ?? 0}%
                      </span>
                      <span className="text-[10px] text-gray-300 group-hover:text-indigo-400 transition-colors font-semibold">
                        Xem đầy đủ →
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-blue-50 rounded-xl p-2 text-center">
                      <div className="text-lg font-black text-blue-600">{activeMap?.currentDayIndex ?? 0}</div>
                      <div className="text-[10px] text-blue-400">Ngày hiện tại</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <div className="text-lg font-black text-gray-600">
                        {(activeMap?.totalDays ?? 0) - (activeMap?.currentDayIndex ?? 0)}
                      </div>
                      <div className="text-[10px] text-gray-400">Ngày còn lại</div>
                    </div>
                  </div>

                  {/* Mini Tree Map — fixed height, scrollable */}
                  <div
                    className="w-full border border-dashed border-gray-100 rounded-xl bg-gradient-to-b from-gray-50 to-white flex items-start justify-center overflow-y-auto relative py-3"
                    style={{ maxHeight: '260px' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {activeMap && activeMap.treeNodes.length > 0 ? (
                      <svg
                        width="160"
                        height={Math.max(200, activeMap.treeNodes.length * 32 + 20)}
                        viewBox={`0 0 160 ${Math.max(200, activeMap.treeNodes.length * 32 + 20)}`}
                      >
                        {/* Vertical guide */}
                        <line x1="80" y1="5" x2="80" y2={activeMap.treeNodes.length * 32 + 10} stroke="#E5E7EB" strokeWidth="1.5" strokeDasharray="3 3"/>

                        {activeMap.treeNodes.map((node, i) => {
                          const y = 14 + i * 32;
                          const isLeft = i % 2 === 0;
                          const lineX2 = isLeft ? 68 : 92;
                          const labelX = isLeft ? 62 : 88;
                          const labelAnchor = isLeft ? 'end' : 'start';
                          const isCompleted = node.status === 'COMPLETED';
                          const isCurrent = node.status === 'UNLOCKED';
                          const color = node.status === 'LOCKED' ? '#D1D5DB' : '#3B82F6';

                          return (
                            <g key={node.mapDayId}>
                              <line x1="80" y1={y} x2={lineX2} y2={y} stroke={node.status !== 'LOCKED' ? '#BFDBFE' : '#F3F4F6'} strokeWidth="1.5"/>
                              {isCurrent ? (
                                <>
                                  <circle cx="80" cy={y} r="7" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2"/>
                                  <circle cx="80" cy={y} r="3.5" fill="#3B82F6"/>
                                </>
                              ) : (
                                <circle cx="80" cy={y} r={isCompleted ? 5 : 4.5} fill={isCompleted ? '#3B82F6' : 'white'} stroke={color} strokeWidth="1.5"/>
                              )}
                              <text x={labelX} y={y + 1} textAnchor={labelAnchor as 'end' | 'start'} fontSize="7.5" fill={isCurrent ? '#3B82F6' : isCompleted ? '#6B7280' : '#9CA3AF'} fontWeight={isCurrent ? '700' : '500'} dominantBaseline="middle">
                                {node.dayTitle.length > 13 ? node.dayTitle.substring(0, 13) + '…' : node.dayTitle}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    ) : (
                      <div className="text-xs text-gray-400 text-center py-10">Chưa có dữ liệu</div>
                    )}
                  </div>

                  <div className="mt-2 text-center text-[10px] text-gray-300 group-hover:text-indigo-400 transition-colors">
                    Click để xem toàn bộ lộ trình
                  </div>
                </div>
              </aside>
            </>
          )}
        </main>

        {/* ── MOBILE BOTTOM NAVIGATION ─────────────────────────────────── */}
        {maps.length > 0 && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/50 backdrop-blur-[100px] border-t border-white/50 flex items-center justify-around pb-safe pt-1 px-2 z-40 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
            {[
              { id: 'home', label: 'Hôm nay', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
              { id: 'notes', label: 'Ghi chú', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
              { id: 'map', label: 'Lộ trình', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg> },
              { id: 'tools', label: 'Công cụ', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setMobileTab(tab.id as 'home' | 'map' | 'tools' | 'notes');
                  if (tab.id === 'map') {
                    setActiveModal('tree_map');
                  }
                }}
                className={`flex flex-col items-center gap-1 p-2 w-1/4 transition-colors ${
                  (mobileTab === tab.id && tab.id !== 'map') || (activeModal === 'tree_map' && tab.id === 'map')
                    ? 'text-blue-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="mb-0.5">{tab.icon}</div>
                <span className="text-[10px] font-bold">{tab.label}</span>
              </button>
            ))}
          </nav>
        )}

        {/* ── IMPORT MODAL ────────────────────────────────────────── */}
        {showImportModal && (
          <ImportMapModal
            onClose={() => setShowImportModal(false)}
            onSuccess={() => fetchMaps()}
          />
        )}
        
        {/* Content Reader Modal */}
        <ContentReaderModal 
          material={readerMaterial} 
          onClose={() => setReaderMaterial(null)} 
        />

        {/* ── MODAL OVERLAY ──────────────────────────────────────────── */}
        {activeModal && (
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in"
            onClick={closeModal}
          >
            <div
              className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col relative fade-in"
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

        {/* Tab Warning Overlay */}
        {tabWarning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl">👀</div>
              <h3 className="text-xl font-bold text-gray-800">Cảnh báo xao nhãng!</h3>
              <p className="text-gray-600 text-center font-medium">{tabWarning}</p>
            </div>
          </div>
        )}

        {/* ── Voice Chat AI — Ctrl+D shortcut + panel ── */}

        {/* Keyboard hint badge — luôn hiện góc dưới phải */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">

          {/* ── Groq Key Settings Panel ── */}
          {showGroqSettings && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xl w-80 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center text-sm">⚙️</div>
                  <h3 className="font-bold text-sm text-gray-800">Cài đặt AI Key</h3>
                </div>
                <button
                  onClick={() => setShowGroqSettings(false)}
                  className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center text-xs transition-colors"
                >✕</button>
              </div>

              {hasGroqKey ? (
                <div className="mb-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-green-600 font-medium mb-0.5">Key hiện tại</p>
                  <p className="font-mono text-green-700 text-xs">{groqKeyMasked}</p>
                </div>
              ) : (
                <div className="mb-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-amber-700">⚠️ Chưa có key riêng — đang dùng key chung của hệ thống (giới hạn chung).</p>
                </div>
              )}

              <input
                type="password"
                placeholder="Nhập Groq API key (gsk_...)"
                value={groqKeyInput}
                onChange={e => setGroqKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveGroqKey()}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent mb-2 transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveGroqKey}
                  disabled={!groqKeyInput.trim()}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
                >Lưu key</button>
                {hasGroqKey && (
                  <button
                    onClick={handleDeleteGroqKey}
                    className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl transition-colors border border-red-100"
                  >Xoá</button>
                )}
              </div>
              {groqKeyMsg && (
                <p className={`text-xs mt-2 text-center font-medium ${groqKeyMsg.startsWith('✅') ? 'text-green-600' : groqKeyMsg.startsWith('🗑️') ? 'text-gray-500' : 'text-red-500'}`}>
                  {groqKeyMsg}
                </p>
              )}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs text-violet-500 hover:text-violet-700 mt-3 font-medium"
              >
                🔗 Lấy key miễn phí tại console.groq.com →
              </a>
            </div>
          )}

          {/* ── Chat Panel — câu hỏi & trả lời ── */}
          {showVoicePanel && (voice.state !== 'idle' || voice.answer || voice.errorMsg) && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-80 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  {voice.state === 'listening' && (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                      <span className="text-xs font-semibold text-gray-700">Đang nghe...</span>
                    </>
                  )}
                  {voice.state === 'thinking' && (
                    <>
                      <svg className="animate-spin h-3 w-3 text-violet-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      <span className="text-xs font-semibold text-gray-700">AI đang trả lời...</span>
                    </>
                  )}
                  {voice.state === 'answered' && (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                      <span className="text-xs font-semibold text-gray-700">Trợ lý AI</span>
                    </>
                  )}
                  {voice.state === 'error' && (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                      <span className="text-xs font-semibold text-gray-700">Lỗi</span>
                    </>
                  )}
                </div>
                <button
                  onClick={voice.clearAnswer}
                  className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center text-xs transition-colors"
                >✕</button>
              </div>

              {/* Body */}
              <div className="px-4 py-3 space-y-2">
                {/* Interim — chữ đang nhận realtime khi giữ phím */}
                {voice.state === 'listening' && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">👤</div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {voice.transcript || ''}
                        <span className="text-gray-400">{voice.interimTranscript}</span>
                        <span className="inline-flex gap-0.5 ml-1">
                          <span className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></span>
                          <span className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></span>
                          <span className="w-1 h-1 bg-red-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></span>
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Thả <kbd className="bg-gray-100 border border-gray-200 rounded px-1 font-mono text-xs">Ctrl+D</kbd> để gửi</p>
                    </div>
                  </div>
                )}
                {/* Final transcript sau khi gửi */}
                {voice.state !== 'listening' && voice.transcript && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">👤</div>
                    <p className="text-xs text-gray-500 italic leading-relaxed">"{voice.transcript}"</p>
                  </div>
                )}
                {voice.answer && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">✨</div>
                    <p className="text-sm text-gray-800 leading-relaxed">{voice.answer}</p>
                  </div>
                )}
                {voice.errorMsg && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <p className="text-xs text-red-600">{voice.errorMsg}</p>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              {voice.answer && (
                <div className="px-4 pb-3 flex items-center gap-2">
                  <button
                    onClick={voice.speakAnswer}
                    className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
                  >
                    {voice.isSpeaking
                      ? <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Dừng đọc</>
                      : <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>Đọc lại</>
                    }
                  </button>
                  <span className="text-gray-200">|</span>
                  <button
                    onClick={() => { voice.clearAnswer(); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                    Hỏi tiếp
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Status badge + keyboard hint ── */}
          <div className="flex items-center gap-2">
            {/* Settings gear */}
            <button
              onClick={() => setShowGroqSettings(v => !v)}
              title="Cài đặt Groq API key"
              className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-md border transition-all duration-200',
                showGroqSettings
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300',
              ].join(' ')}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            {/* Ctrl+D shortcut pill */}
            <button
              onClick={() => {
                setShowVoicePanel(true);
                if (voice.state === 'listening') {
                  voice.stopAndSend();
                } else if (voice.state === 'idle' || voice.state === 'answered' || voice.state === 'error') {
                  voice.startListening();
                }
              }}
              title="Giữ phím Ctrl+D để nói, thả ra để gửi"
              className={[
                'flex items-center gap-2 px-3 h-8 rounded-full text-xs font-semibold shadow-md border transition-all duration-200 select-none',
                voice.state === 'listening'
                  ? 'bg-red-500 border-red-400 text-white shadow-red-200'
                  : voice.state === 'thinking'
                  ? 'bg-violet-500 border-violet-400 text-white shadow-violet-200 cursor-wait'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 hover:shadow-violet-100',
              ].join(' ')}
            >
              {voice.state === 'listening' ? (
                <>
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span></span>
                  Đang nghe (Thả Ctrl+D để gửi)
                </>
              ) : voice.state === 'thinking' ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  AI đang nghĩ
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  <span className="text-gray-500 font-medium">Giữ</span>
                  <span className="text-gray-400 font-mono">Ctrl</span>
                  <span className="text-gray-300">+</span>
                  <span className="text-gray-400 font-mono">D</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
