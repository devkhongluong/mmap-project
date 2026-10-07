import re
import sys

file_path = r'd:\soloweb\frontend\src\pages\DashboardComponent.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add confetti import
content = content.replace("import { reviewNoteWithAi } from '@/api/ai';", "import { reviewNoteWithAi } from '@/api/ai';\nimport confetti from 'canvas-confetti';")

# 2. Add fireConfetti helper after imports
helper_code = """
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
"""
content = content.replace("export function DashboardComponent() {", helper_code + "\nexport function DashboardComponent() {")

# 3. Add confetti to pomodoro work -> break transition
old_pomo_phase = """        if (phase === 'work') {
          setSessions(s => s + 1);
          setPhase('break');
          return breakSec;
        }"""
new_pomo_phase = """        if (phase === 'work') {
          setSessions(s => s + 1);
          setPhase('break');
          fireConfetti();
          return breakSec;
        }"""
content = content.replace(old_pomo_phase, new_pomo_phase)

# 4. Tab Visibility Catcher
# Inside DashboardComponent:
# We need to add a useEffect
tab_catcher_code = """
  // ── Tab Switch Catcher ──
  const [tabWarning, setTabWarning] = useState<string | null>(null);
  const hiddenTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pomo.isActive && pomo.phase === 'work') {
          hiddenTimeRef.current = Date.now();
        }
      } else {
        if (hiddenTimeRef.current && pomo.isActive && pomo.phase === 'work') {
          const absentSeconds = Math.floor((Date.now() - hiddenTimeRef.current) / 1000);
          if (absentSeconds > 10) {
            setTabWarning(`Đừng lơ đãng nhé, bạn vừa rời đi ${absentSeconds} giây!`);
            setTimeout(() => setTabWarning(null), 5000);
          }
        }
        hiddenTimeRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [pomo.isActive, pomo.phase]);
"""
# inject tab_catcher_code at the start of DashboardComponent
old_dashboard_start = "export function DashboardComponent() {\n  const {"
new_dashboard_start = "export function DashboardComponent() {\n  const {" + tab_catcher_code
content = content.replace(old_dashboard_start, new_dashboard_start)

# 5. Zen Mode Logic & Smart Suggestion
zen_mode_calc = """
  const isZenMode = pomo.isActive && pomo.phase === 'work';
  const zenClass = isZenMode ? 'opacity-20 blur-[2px] pointer-events-none transition-all duration-700' : 'transition-all duration-700';

  const firstUndoneTodo = todos.find(t => !t.completed);
"""
old_profile_call = "  const profile = getProfile();"
new_profile_call = "  const profile = getProfile();\n" + zen_mode_calc
content = content.replace(old_profile_call, new_profile_call)

# Apply zenClass to sidebars
old_left_col = '<aside className="lg:col-span-3 space-y-5">'
new_left_col = '<aside className={`lg:col-span-3 space-y-5 ${zenClass}`}>'
content = content.replace(old_left_col, new_left_col)

old_right_col = '<aside className="lg:col-span-3 flex flex-col gap-5 h-[calc(100vh-2rem)] overflow-hidden">'
new_right_col = '<aside className={`lg:col-span-3 flex flex-col gap-5 h-[calc(100vh-2rem)] overflow-hidden ${zenClass}`}>'
content = content.replace(old_right_col, new_right_col)

# 6. Smart Suggestion UI inside Pomodoro card
smart_suggestion_ui = """
                    {/* Smart Suggestion */}
                    {!isZenMode && firstUndoneTodo && (
                      <div className="mt-4 p-3 bg-white/40 border border-indigo-100 rounded-xl text-center">
                        <p className="text-sm text-gray-700 mb-2">Gợi ý việc tiếp theo: <strong className="text-indigo-600">{firstUndoneTodo.content}</strong></p>
                        <button
                          onClick={() => {
                            pomo.setWorkMin(5);
                            pomo.toggle();
                          }}
                          className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-lg hover:shadow-md hover:scale-105 transition-all"
                        >
                          Học thử 5 phút!
                        </button>
                      </div>
                    )}
"""
old_pomo_card_end = """                      </button>
                    </div>
                  </div>
                </div>"""
new_pomo_card_end = """                      </button>
                    </div>
                  </div>""" + smart_suggestion_ui + """
                </div>"""
content = content.replace(old_pomo_card_end, new_pomo_card_end)

# Also expose setWorkMin in usePomodoro return
old_pomo_return = "    sessions\n  };\n}"
new_pomo_return = "    sessions,\n    setWorkMin\n  };\n}"
content = content.replace(old_pomo_return, new_pomo_return)

# Expose isActive in usePomodoro return
old_pomo_return2 = "    sessions,\n    setWorkMin\n  };\n}"
new_pomo_return2 = "    sessions,\n    setWorkMin,\n    isActive: isRunning\n  };\n}"
content = content.replace(old_pomo_return2, new_pomo_return2)

# 7. Add Toast for Tab Catcher
old_dashboard_end = """    </div>
  );
}"""
new_dashboard_end = """
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
    </div>
  );
}"""
content = content.replace(old_dashboard_end, new_dashboard_end)

# 8. Fire confetti on check task
old_toggle_todo = """  const onToggleTodo = (id: number) => {
    toggleTodo(id);
  };"""
new_toggle_todo = """  const onToggleTodo = (id: number) => {
    const t = todos.find(x => x.id === id);
    if (t && !t.completed) fireConfetti();
    toggleTodo(id);
  };"""
content = content.replace(old_toggle_todo, new_toggle_todo)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patch successful')
