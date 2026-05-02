import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { 
  Check, Trash2, Plus, Circle, CheckCircle2, Calendar, Clock, 
  AlertCircle, Filter, ArrowUpDown, List as ListIcon, 
  CheckSquare, Search, X, AlignLeft, CheckCircle, Hash, Timer, 
  Play, Pause, RotateCcw, Flame, Zap, Trophy, ChevronLeft, ChevronRight,
  BrainCircuit, TrendingUp, TrendingDown, Target, AlertTriangle, CheckSquare2
} from 'lucide-react'
import type { ListType } from './App'

interface Subtask {
  id: string
  title: string
  is_completed: boolean
}

interface Task {
  id: number
  user_id: string
  list_id: number | null
  title: string
  is_completed: boolean
  deadline_date: string | null
  deadline_time: string | null
  priority: 'low' | 'medium' | 'high' | 'none'
  description?: string | null
  subtasks?: Subtask[] | null
  tags?: string[] | null
  completed_at?: string | null
  focus_sessions?: number | null
  created_at?: string
}

interface TaskListProps {
  session: Session
  activeListId: number | 'default' | 'completed' | 'today' | 'upcoming' | 'calendar' | 'search' | 'dashboard' | 'account'
  searchQuery?: string
  customLists: ListType[]
}

// ==========================================
// Slide-out Right Panel Component
// ==========================================
const TaskDetailSidePanel = ({ 
  task, onClose, onUpdateDb, customLists 
}: { 
  task: Task, onClose: () => void, onUpdateDb: (id: number, updates: Partial<Task>) => void, customLists: ListType[]
}) => {
  const [localTitle, setLocalTitle] = useState(task.title)
  const [localDesc, setLocalDesc] = useState(task.description || '')
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks || [])
  const [newTagInput, setNewTagInput] = useState('')

  const [timerDurationOption, setTimerDurationOption] = useState<number>(25) 
  const [timerSeconds, setTimerSeconds] = useState(25 * 60)
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    setLocalTitle(task.title)
    setLocalDesc(task.description || '')
    setLocalSubtasks(task.subtasks || [])
    setIsTimerActive(false)
    setTimerSeconds(timerDurationOption * 60)
    setShowCelebration(false)
  }, [task.id, timerDurationOption])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (isTimerActive && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds(prev => prev - 1), 1000)
    } else if (isTimerActive && timerSeconds === 0) {
      setIsTimerActive(false)
      const newSessionCount = (task.focus_sessions || 0) + 1
      onUpdateDb(task.id, { focus_sessions: newSessionCount })
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 4000)
      setTimerSeconds(timerDurationOption * 60)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isTimerActive, timerSeconds, task.id, task.focus_sessions, timerDurationOption, onUpdateDb])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const saveTitle = () => { if (localTitle.trim() && localTitle !== task.title) onUpdateDb(task.id, { title: localTitle }) }
  const saveDesc = () => { if (localDesc !== (task.description || '')) onUpdateDb(task.id, { description: localDesc }) }
  const saveSubtasks = (updated: Subtask[]) => { setLocalSubtasks(updated); onUpdateDb(task.id, { subtasks: updated }) }

  const addSubtask = () => {
    const newSt: Subtask = { id: Date.now().toString(), title: '', is_completed: false }
    saveSubtasks([...localSubtasks, newSt])
  }
  const updateSubtaskTitle = (id: string, title: string) => { setLocalSubtasks(localSubtasks.map(st => st.id === id ? { ...st, title } : st)) }
  const toggleSubtask = (id: string) => { saveSubtasks(localSubtasks.map(st => st.id === id ? { ...st, is_completed: !st.is_completed } : st)) }
  const deleteSubtask = (id: string) => { saveSubtasks(localSubtasks.filter(st => st.id !== id)) }

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault()
      const currentTags = task.tags || []
      if (!currentTags.includes(newTagInput.trim())) { onUpdateDb(task.id, { tags: [...currentTags, newTagInput.trim()] }) }
      setNewTagInput('')
    }
  }
  const removeTag = (tagToRemove: string) => { onUpdateDb(task.id, { tags: (task.tags || []).filter(t => t !== tagToRemove) }) }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-slate-900/10 dark:bg-black/40 backdrop-blur-sm z-[60] animate-pop-in" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] md:w-[500px] lg:w-[550px] bg-white dark:bg-[#151515] shadow-[-20px_0_40px_rgba(0,0,0,0.05)] dark:shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-[70] border-l border-slate-200/60 dark:border-slate-800 flex flex-col transform animate-slide-in-right">
        
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-slate-100 dark:border-slate-800/60 bg-white/80 dark:bg-[#151515]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => onUpdateDb(task.id, { is_completed: !task.is_completed, completed_at: !task.is_completed ? new Date().toISOString() : null })} className="text-slate-400 hover:text-blue-500 transition-colors">
              {task.is_completed ? <CheckCircle2 size={24} className="text-blue-500" /> : <Circle size={24} />}
            </button>
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded">Task Details</span>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6 lg:p-8 space-y-6 md:space-y-8 custom-scrollbar">
          <div>
            <textarea 
              value={localTitle} onChange={(e) => setLocalTitle(e.target.value)} onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLElement).blur() } }}
              rows={1} className={`w-full text-xl md:text-2xl lg:text-3xl font-bold bg-transparent focus:outline-none transition-colors resize-none overflow-hidden ${task.is_completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}
              style={{ minHeight: '40px' }}
            />
            {(task.focus_sessions || 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Array.from({ length: task.focus_sessions || 0 }).map((_, i) => (
                  <Zap key={i} size={16} className="text-amber-400 dark:text-amber-300 fill-amber-400 dark:fill-amber-300 animate-pop-in" />
                ))}
              </div>
            )}
          </div>

          {!task.is_completed && (
            <div className={`relative p-4 md:p-5 rounded-2xl border transition-all duration-500 ${showCelebration ? 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-500/50 shadow-lg shadow-amber-500/20' : isTimerActive ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-500/30 shadow-md shadow-orange-500/10' : 'bg-slate-50 border-slate-200 dark:bg-[#111111] dark:border-slate-800'}`}>
              {showCelebration && (
                <div className="absolute -top-3 -right-3 bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pop-in shadow-lg flex items-center gap-1 z-10"><Zap size={12} className="fill-current"/> +1 Spark</div>
              )}
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-2 text-orange-500 dark:text-orange-400 font-bold">
                  <Timer className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                  <span className="text-[10px] md:text-xs uppercase tracking-widest">Focus Timer</span>
                </div>
                <div className="flex items-center gap-2">
                  <select value={timerDurationOption} onChange={(e) => setTimerDurationOption(parseInt(e.target.value))} disabled={isTimerActive} className="bg-transparent text-xs font-bold text-slate-500 dark:text-slate-400 focus:outline-none cursor-pointer appearance-none disabled:opacity-50">
                    <option value={5}>5 min</option>
                    <option value={15}>15 min</option>
                    <option value={25}>25 min</option>
                    <option value={50}>50 min</option>
                  </select>
                  <button onClick={() => { setIsTimerActive(false); setTimerSeconds(timerDurationOption * 60); }} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"><RotateCcw size={14} /></button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className={`text-3xl sm:text-4xl lg:text-5xl font-mono font-bold tracking-tight transition-colors ${showCelebration ? 'text-amber-600 dark:text-amber-400' : isTimerActive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {formatTimer(timerSeconds)}
                </div>
                <button onClick={() => setIsTimerActive(!isTimerActive)} className={`flex items-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold text-xs md:text-sm transition-all shadow-sm active:scale-95 ${isTimerActive ? 'bg-orange-200/50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white/90'}`}>
                  {isTimerActive ? <Pause className="w-3.5 h-3.5 md:w-4 md:h-4"/> : <Play className="w-3.5 h-3.5 md:w-4 md:h-4"/>}
                  {isTimerActive ? 'Pause' : 'Start'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pr-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Calendar size={12}/> Due Date</label>
                {task.deadline_date && <button onClick={() => onUpdateDb(task.id, { deadline_date: null, deadline_time: null })} title="Remove Date" className="text-slate-400 hover:text-red-500 transition-colors"><X size={12}/></button>}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 md:px-3.5 md:py-2.5 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text relative" onClick={(e) => { const input = e.currentTarget.querySelector('input'); if (e.target !== input) { try { input?.showPicker(); } catch(err) {} } }}>
                <Calendar size={16} className="text-slate-400 cursor-pointer flex-shrink-0" />
                <input type="date" value={task.deadline_date || ''} onChange={(e) => onUpdateDb(task.id, { deadline_date: e.target.value || null })} className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 focus:outline-none cursor-text" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between pr-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Clock size={12}/> Time</label>
                {task.deadline_time && <button onClick={() => onUpdateDb(task.id, { deadline_time: null })} title="Remove Time" className="text-slate-400 hover:text-red-500 transition-colors"><X size={12}/></button>}
              </div>
              <div className={`flex items-center gap-2 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 md:px-3.5 md:py-2.5 transition-all relative ${!task.deadline_date ? 'opacity-50 pointer-events-none' : 'focus-within:ring-2 focus-within:ring-blue-500/20 cursor-text'}`} onClick={(e) => { const input = e.currentTarget.querySelector('input'); if (e.target !== input) { try { input?.showPicker(); } catch(err) {} } }}>
                <Clock size={16} className="text-slate-400 cursor-pointer flex-shrink-0" />
                <input type="time" disabled={!task.deadline_date} value={task.deadline_time ? task.deadline_time.substring(0, 5) : ''} onChange={(e) => onUpdateDb(task.id, { deadline_time: e.target.value ? e.target.value + ':00' : null })} className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 focus:outline-none cursor-text" />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><AlertCircle size={12}/> Priority</label>
              <select value={task.priority} onChange={(e) => onUpdateDb(task.id, { priority: e.target.value as any })} className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 text-sm rounded-xl px-3 py-2 md:px-3.5 md:py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer">
                <option value="none">None</option>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><ListIcon size={12}/> List</label>
              <select value={task.list_id || 'none'} onChange={(e) => onUpdateDb(task.id, { list_id: e.target.value === 'none' ? null : parseInt(e.target.value) })} className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 text-sm rounded-xl px-3 py-2 md:px-3.5 md:py-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer">
                <option value="none">General Tasks (Inbox)</option>
                {customLists.map(l => <option key={l.id} value={l.id as number}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800/60" />

          <div className="space-y-2.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><AlignLeft size={12}/> Description & Notes</label>
            <textarea value={localDesc} onChange={(e) => setLocalDesc(e.target.value)} onBlur={saveDesc} placeholder="Add details, links, or notes..." className="w-full min-h-[100px] md:min-h-[120px] bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 text-sm rounded-2xl px-3 py-3 md:px-4 md:py-3.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-y custom-scrollbar" />
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><CheckCircle size={12}/> Subtasks</label>
              {localSubtasks.length > 0 && <span className="text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">{localSubtasks.filter(st => st.is_completed).length} / {localSubtasks.length}</span>}
            </div>
            <div className="space-y-2">
              {localSubtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 md:gap-3 group bg-white dark:bg-[#111111] border border-slate-100 dark:border-slate-800/80 p-2 md:p-2.5 rounded-xl transition-colors hover:border-slate-200 dark:hover:border-slate-700">
                  <button onClick={() => toggleSubtask(st.id)} className="text-slate-400 hover:text-blue-500 flex-shrink-0 transition-colors">{st.is_completed ? <CheckSquare className="w-4 h-4 md:w-[18px] md:h-[18px] text-blue-500" /> : <div className="w-4 h-4 md:w-[18px] md:h-[18px] border-2 border-slate-300 dark:border-slate-600 rounded transition-colors group-hover:border-blue-400" />}</button>
                  <input type="text" value={st.title} onChange={(e) => updateSubtaskTitle(st.id, e.target.value)} onBlur={() => saveSubtasks(localSubtasks)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).blur()} placeholder="Subtask title..." className={`flex-1 bg-transparent text-sm focus:outline-none transition-colors ${st.is_completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}`} />
                  <button onClick={() => deleteSubtask(st.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-md transition-all"><X size={14}/></button>
                </div>
              ))}
            </div>
            <button onClick={addSubtask} className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-500 hover:text-blue-600 bg-slate-50 dark:bg-[#0A0A0A] hover:bg-blue-50 dark:hover:bg-blue-500/10 w-full p-2 md:p-2.5 rounded-xl transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30"><Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> Add subtask</button>
          </div>

          <hr className="border-slate-100 dark:border-slate-800/60" />

          <div className="space-y-3.5 pb-8">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Hash size={12}/> Tags</label>
            <div className="flex flex-wrap gap-2 items-center">
              {task.tags?.map(tag => (
                <span key={tag} className="group flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[11px] md:text-xs font-bold border border-slate-200 dark:border-slate-700">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={12}/></button>
                </span>
              ))}
              <input type="text" value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} onKeyDown={addTag} placeholder="+ Add tag..." className="bg-transparent text-sm font-medium text-slate-600 dark:text-slate-400 focus:outline-none placeholder:text-slate-400 w-24 md:w-28 py-1 px-2" />
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// ==========================================
// FIXED SvgPieChart (Perfectly Rounded Donut)
// ==========================================
const SvgPieChart = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
  const total = data.reduce((acc, d) => acc + d.value, 0)
  let currentOffset = 0
  
  if (total === 0) return (
    <svg viewBox="0 0 40 40" className="w-full h-full">
      <circle r="15.91549431" cx="20" cy="20" fill="transparent" strokeWidth="6" className="stroke-slate-100 dark:stroke-slate-800/50" />
    </svg>
  )

  return (
    <svg viewBox="0 0 40 40" className="w-full h-full transform -rotate-90 drop-shadow-md">
      {/* Background Track Circle */}
      <circle r="15.91549431" cx="20" cy="20" fill="transparent" strokeWidth="6" className="stroke-slate-100 dark:stroke-slate-800/50" />
      
      {/* Data Slices */}
      {data.map((slice, i) => {
        const percentage = (slice.value / total) * 100
        const offset = 100 - currentOffset
        currentOffset += percentage
        if (percentage === 0) return null
        return (
          <circle
            key={i}
            r="15.91549431"
            cx="20"
            cy="20"
            fill="transparent"
            stroke={slice.color}
            strokeWidth="6"
            strokeDasharray={`${percentage} ${100 - percentage}`}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer"
          />
        )
      })}
    </svg>
  )
}

// ==========================================
// Dashboard Component (Gamification & Insights)
// ==========================================
const ProductivityDashboard = ({ allTasks, customLists, onUpdateDb }: { allTasks: Task[], customLists: ListType[], onUpdateDb: (id: number, updates: Partial<Task>) => void }) => {
  const [resolvingOverdueId, setResolvingOverdueId] = useState<number | null>(null)
  const [resolveDate, setResolveDate] = useState<string>('')

  const todayDateObj = new Date()
  const todayStr = todayDateObj.toISOString().split('T')[0]

  // --- 1. Basic Stats & Heatmap ---
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date()
    d.setDate(todayDateObj.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })

  const completedCounts = allTasks.reduce((acc, task) => {
    if (task.is_completed && task.completed_at) {
      const date = task.completed_at.split('T')[0]
      acc[date] = (acc[date] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const maxCompleted = Math.max(...Object.values(completedCounts), 1)

  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
    const ratio = count / maxCompleted
    if (ratio < 0.3) return 'bg-emerald-200 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-800/80'
    if (ratio < 0.6) return 'bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600'
    return 'bg-emerald-500 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-400'
  }

  const totalAdded = allTasks.length
  const totalCompleted = allTasks.filter(t => t.is_completed).length
  
  let currentStreak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (completedCounts[days[i]] > 0) currentStreak++
    else break
  }

  // --- 2. Gamification (Level System) ---
  const totalFocusSessions = allTasks.reduce((acc, task) => acc + (task.focus_sessions || 0), 0)
  const totalScore = (totalCompleted * 10) + (totalFocusSessions * 25)

  const calculateLevel = (xp: number) => {
    if (xp < 100) return { level: 1, title: 'Novice Planner', nextXp: 100, progress: xp / 100 }
    if (xp < 300) return { level: 2, title: 'Task Ninja', nextXp: 300, progress: (xp - 100) / 200 }
    if (xp < 700) return { level: 3, title: 'Productivity Master', nextXp: 700, progress: (xp - 300) / 400 }
    return { level: 4, title: 'Grandmaster', nextXp: 1500, progress: (xp - 700) / 800 }
  }

  const { level, title, nextXp, progress } = calculateLevel(totalScore)

  // --- 3. Smart Insights ---
  const completedHours = allTasks.filter(t => t.is_completed && t.completed_at).map(t => new Date(t.completed_at!).getHours())
  let peakTimeStr = "Not enough data"
  if (completedHours.length > 0) {
    const hourCounts = completedHours.reduce((acc, hour) => { acc[hour] = (acc[hour] || 0) + 1; return acc }, {} as Record<number, number>)
    const peakHour = parseInt(Object.keys(hourCounts).reduce((a, b) => hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b))
    if (peakHour >= 5 && peakHour < 12) peakTimeStr = `Morning (${peakHour}:00 AM)`
    else if (peakHour >= 12 && peakHour < 17) peakTimeStr = `Afternoon (${peakHour === 12 ? 12 : peakHour - 12}:00 PM)`
    else if (peakHour >= 17 && peakHour < 21) peakTimeStr = `Evening (${peakHour - 12}:00 PM)`
    else peakTimeStr = `Night (${peakHour > 12 ? peakHour - 12 : peakHour}:00 ${peakHour >= 12 ? 'PM' : 'AM'})`
  }

  const thisWeekCount = days.slice(23, 30).reduce((acc, day) => acc + (completedCounts[day] || 0), 0)
  const lastWeekCount = days.slice(16, 23).reduce((acc, day) => acc + (completedCounts[day] || 0), 0)
  let weeklyTrend = 0
  if (lastWeekCount > 0) weeklyTrend = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)

  // --- 4. Task Distribution Pie Chart ---
  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4']
  const distributionData = customLists.map((list, index) => ({
    label: list.name,
    value: allTasks.filter(t => t.list_id === list.id).length,
    color: pieColors[index % pieColors.length]
  }))
  const inboxCount = allTasks.filter(t => !t.list_id).length
  if (inboxCount > 0) distributionData.push({ label: 'General Inbox', value: inboxCount, color: '#94a3b8' })
  const activePieData = distributionData.filter(d => d.value > 0)

  // --- 5. Overdue Action Center ---
  const overdueTasks = allTasks.filter(t => !t.is_completed && t.deadline_date && t.deadline_date < todayStr)

  return (
    <div className="space-y-6 md:space-y-8 animate-slide-in pb-12">
      
      {/* 1. RPG Gamification Header */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200/60 dark:border-slate-800/60 p-5 md:p-8 rounded-2xl shadow-sm relative overflow-hidden">
        {/* Decorative subtle background glow */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2"><Trophy className="w-5 h-5 text-amber-500 drop-shadow-sm"/> <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Your Rank</span></div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Level {level}: {title}</h2>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300">{totalScore} <span className="text-sm md:text-base font-bold text-slate-400 uppercase tracking-widest">Total XP</span></div>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1.5">10 XP per task • 25 XP per focus spark</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-3 relative z-10">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Level {level}</span>
            <span>{nextXp - totalScore} XP to Level {level + 1}</span>
          </div>
          <div className="h-3 md:h-4 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-700/50">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${Math.max(5, progress * 100)}%` }}>
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Overdue Action Center (Alert!) */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50/80 dark:bg-red-500/5 border border-red-200 dark:border-red-900/30 p-5 md:p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-widest">Needs Attention ({overdueTasks.length})</h3>
          </div>
          <p className="text-sm font-medium text-red-800 dark:text-red-300/80 mb-5">These tasks are past their deadline. Did you forget to check them off?</p>
          
          <div className="space-y-3">
            {overdueTasks.slice(0, 3).map(task => (
              <div key={task.id} className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-red-100 dark:border-red-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[250px] md:max-w-[400px]">{task.title}</h4>
                  <span className="text-xs font-bold text-red-500 mt-1 inline-block">Due: {task.deadline_date}</span>
                </div>
                
                {resolvingOverdueId === task.id ? (
                  <div className="flex items-center gap-2 animate-slide-in">
                    <input type="date" value={resolveDate} onChange={(e) => setResolveDate(e.target.value)} className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500" />
                    <button onClick={() => { onUpdateDb(task.id, { is_completed: true, completed_at: resolveDate ? `${resolveDate}T12:00:00.000Z` : todayDateObj.toISOString() }); setResolvingOverdueId(null); }} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-emerald-500/20">Save</button>
                    <button onClick={() => setResolvingOverdueId(null)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"><X size={16}/></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setResolvingOverdueId(task.id); setResolveDate(task.deadline_date || todayStr); }} className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors">I did this!</button>
                    <button onClick={() => onUpdateDb(task.id, { deadline_date: todayStr })} className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors">Move to Today</button>
                  </div>
                )}
              </div>
            ))}
            {overdueTasks.length > 3 && <p className="text-xs font-bold text-red-500 px-2 mt-4">+ {overdueTasks.length - 3} more overdue tasks in your list.</p>}
          </div>
        </div>
      )}

      {/* 3. Analytics & Smart Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* Left Column: Stats & Insights */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors">
              <div className="text-slate-500 flex items-center gap-2 mb-3"><CheckSquare2 className="w-4 h-4 text-blue-500"/> <span className="text-xs font-bold uppercase tracking-widest">Added vs Done</span></div>
              <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{totalCompleted} <span className="text-lg text-slate-400 font-medium">/ {totalAdded}</span></div>
            </div>
            
            {/* Streak Motivator Block */}
            <div className="bg-gradient-to-br from-orange-500 to-rose-600 p-6 rounded-2xl shadow-lg shadow-orange-500/20 text-white flex flex-col justify-between transform transition-transform hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-3 opacity-90"><Flame className="w-4 h-4"/> <span className="text-xs font-bold uppercase tracking-widest">Current Streak</span></div>
              <div>
                 <div className="text-3xl md:text-4xl font-bold">{currentStreak} <span className="text-lg font-medium opacity-80">days</span></div>
                 {currentStreak > 0 && (
                    <p className="text-[10px] md:text-xs text-orange-100 mt-2 font-medium leading-snug">
                      {currentStreak >= 7 ? "Incredible streak! This level of focus will definitely set you apart in the 2026 job market." : 
                       currentStreak >= 3 ? "You're on a roll! Consistency is key as you prep for your corporate career." : 
                       "Great start! Keep the momentum going to build a solid habit."}
                    </p>
                 )}
                 {currentStreak === 0 && (
                    <p className="text-[10px] md:text-xs text-orange-100 mt-2 font-medium leading-snug">Complete a task today to start your streak!</p>
                 )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
             <div className="flex items-center gap-2 mb-5 text-indigo-600 dark:text-indigo-400">
                <BrainCircuit className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Smart Insights</h3>
              </div>
              <div className="space-y-4">
                
                {/* Fixed Icon Layouts */}
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#151515] p-4 md:p-5 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30">
                  <div className="bg-indigo-100 dark:bg-indigo-500/10 p-3 rounded-xl flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Peak Productivity</h4>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">You get the most done in the <span className="text-indigo-600 dark:text-indigo-400 font-bold">{peakTimeStr}</span>.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#151515] p-4 md:p-5 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm transition-all hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-500/30">
                  <div className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${weeklyTrend >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-rose-100 dark:bg-rose-500/10'}`}>
                    {weeklyTrend >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Weekly Velocity</h4>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">You completed <span className={`font-bold ${weeklyTrend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{thisWeekCount} tasks</span> this week ({weeklyTrend >= 0 ? '+' : ''}{weeklyTrend}% vs last week).</p>
                  </div>
                </div>

              </div>
          </div>
        </div>

        {/* Right Column: Refined Pie Chart */}
        <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Task Distribution</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center pt-2">
            <div className="w-36 h-36 md:w-44 md:h-44 relative mb-8">
              <SvgPieChart data={activePieData} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900 dark:text-white drop-shadow-sm">{totalAdded}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Total</span>
              </div>
            </div>
            
            <div className="w-full space-y-2.5 overflow-y-auto max-h-[160px] custom-scrollbar pr-2">
              {activePieData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs md:text-sm font-medium">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color }}></div>
                    <span className="text-slate-700 dark:text-slate-300 truncate">{d.label}</span>
                  </div>
                  <span className="text-slate-900 dark:text-white font-bold ml-2 shrink-0">{d.value}</span>
                </div>
              ))}
              {activePieData.length === 0 && <p className="text-sm text-slate-400 text-center font-medium">Add some tasks to see your distribution.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Activity Heatmap */}
      <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Activity Heatmap (Last 30 Days)</div>
        <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] md:grid-cols-[repeat(10,minmax(0,1fr))] lg:grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
          {days.map(day => (
            <div key={day} title={`${day}: ${completedCounts[day] || 0} tasks`} className={`aspect-square rounded-[4px] md:rounded-lg border transition-colors hover:scale-110 cursor-pointer shadow-sm ${getIntensityClass(completedCounts[day] || 0)}`} />
          ))}
        </div>
        <div className="flex justify-end items-center gap-2 mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Less <div className="w-3 h-3 rounded-[3px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"/>
          <div className="w-3 h-3 rounded-[3px] bg-emerald-400 dark:bg-emerald-700 border border-emerald-500 dark:border-emerald-600"/>
          <div className="w-3 h-3 rounded-[3px] bg-emerald-500 dark:bg-emerald-500 border border-emerald-600 dark:border-emerald-400"/> More
        </div>
      </div>

    </div>
  )
}

// ==========================================
// FULL CALENDAR VIEW COMPONENT
// ==========================================
const TaskCalendarView = ({ allTasks, onUpdateDb, onOpenTask }: { allTasks: Task[], onUpdateDb: (id: number, updates: Partial<Task>) => void, onOpenTask: (id: number) => void }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  const formatDateStr = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentMonth(new Date())

  const unscheduledTasks = allTasks.filter(t => !t.deadline_date && !t.is_completed)

  const handleDragStart = (e: React.DragEvent, taskId: number) => { e.dataTransfer.setData('taskId', taskId.toString()) }

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) onUpdateDb(Number(taskId), { deadline_date: dateStr })
  }

  return (
    <div className="flex flex-col h-full animate-slide-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Calendar className="text-blue-500" />
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-2 bg-white dark:bg-[#111111] p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button onClick={prevMonth} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><ChevronLeft size={18}/></button>
          <button onClick={goToToday} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Today</button>
          <button onClick={nextMonth} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><ChevronRight size={18}/></button>
        </div>
      </div>

      {unscheduledTasks.length > 0 && (
        <div className="mb-6 bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5"><AlertCircle size={12}/> Unscheduled Tasks</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {unscheduledTasks.map(task => (
              <div 
                key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onClick={() => onOpenTask(task.id)}
                className="shrink-0 max-w-[200px] truncate px-3 py-2 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors shadow-sm"
              >
                {task.title}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex-1">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A0A0A]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 auto-rows-fr">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-r border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-[#0A0A0A]/50" />
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dateNum = i + 1
            const dateStr = formatDateStr(year, month, dateNum)
            const isToday = dateStr === formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
            const dayTasks = allTasks.filter(t => t.deadline_date === dateStr)

            return (
              <div 
                key={dateNum} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, dateStr)}
                className={`min-h-[100px] md:min-h-[120px] p-1.5 md:p-2 border-r border-b border-slate-100 dark:border-slate-800/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
              >
                <div className={`text-xs font-bold mb-2 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-400'}`}>
                  {dateNum}
                </div>
                
                <div className="space-y-1">
                  {dayTasks.map(task => (
                    <div 
                      key={task.id} draggable onDragStart={e => handleDragStart(e, task.id)} onClick={() => onOpenTask(task.id)}
                      className={`truncate text-[10px] md:text-xs font-medium px-2 py-1 rounded-md cursor-grab active:cursor-grabbing border ${
                        task.is_completed 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent line-through' 
                          : 'bg-white dark:bg-[#1A1A1A] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-500/50'
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// MAIN TASK LIST COMPONENT
// ==========================================
export default function TaskList({ session, activeListId, searchQuery, customLists }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [displayedTasks, setDisplayedTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false) 

  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'completed' | 'high-priority'>('all')
  const [sortBy, setSortBy] = useState<'default' | 'date-asc' | 'date-desc' | 'priority' | 'alphabetical'>('default')

  const newTaskInputRef = useRef<HTMLInputElement>(null)
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskDate, setNewTaskDate] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'none'>('none')
  const [newTaskTargetList, setNewTaskTargetList] = useState<string>('none')
  const [showOptions, setShowOptions] = useState(false)

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')

  useEffect(() => { 
    fetchTasks() 
    setFilterBy('all')
    setSelectedTaskId(null)
    setIsPanelOpen(false)
  }, [activeListId, searchQuery])

  useEffect(() => { processAndDisplayTasks(tasks) }, [tasks, filterBy, sortBy])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT'
      
      if (e.key === 'Escape') { 
        if (isInput) (document.activeElement as HTMLElement).blur()
        if (showOptions) setShowOptions(false)
        if (editingTaskId) setEditingTaskId(null)
        if (isPanelOpen) setIsPanelOpen(false) 
        else setSelectedTaskId(null)
        return
      }

      if (isInput || activeListId === 'dashboard' || activeListId === 'calendar') return
      if (e.key === 'n' || e.key === 'c') { e.preventDefault(); newTaskInputRef.current?.focus(); return; }
      if (displayedTasks.length === 0) return

      const currentIndex = displayedTasks.findIndex(t => t.id === selectedTaskId)

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault()
          const nextIndex = currentIndex < displayedTasks.length - 1 ? currentIndex + 1 : 0
          setSelectedTaskId(displayedTasks[nextIndex]?.id || null)
          break
        case 'ArrowUp':
        case 'k':
          e.preventDefault()
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : displayedTasks.length - 1
          setSelectedTaskId(displayedTasks[prevIndex]?.id || null)
          break
        case 'Enter': 
        case 'e':     
          if (selectedTaskId) setIsPanelOpen(true)
          break
        case 'x': 
          if (selectedTaskId) { const t = displayedTasks.find(t => t.id === selectedTaskId); if (t) toggleTask(t); } 
          break;
        case 'Delete':
        case 'Backspace': 
          if (selectedTaskId) deleteTask(selectedTaskId); 
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [displayedTasks, selectedTaskId, isPanelOpen, activeListId])

  useEffect(() => {
    if (selectedTaskId && !isPanelOpen && activeListId !== 'dashboard' && activeListId !== 'calendar') {
      const el = document.getElementById(`task-${selectedTaskId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedTaskId, isPanelOpen, activeListId])

  const processAndDisplayTasks = (rawTasks: Task[]) => {
    let processed = [...rawTasks]
    if (filterBy === 'active') processed = processed.filter(t => !t.is_completed)
    else if (filterBy === 'completed') processed = processed.filter(t => t.is_completed)
    else if (filterBy === 'high-priority') processed = processed.filter(t => t.priority === 'high')

    const priorityWeight = { high: 3, medium: 2, low: 1, none: 0 }
    processed.sort((a, b) => {
      if (sortBy === 'priority') { if (priorityWeight[a.priority] !== priorityWeight[b.priority]) return priorityWeight[b.priority] - priorityWeight[a.priority] }
      else if (sortBy === 'date-asc' || sortBy === 'date-desc') {
        if (a.deadline_date && !b.deadline_date) return sortBy === 'date-asc' ? -1 : 1
        if (!a.deadline_date && b.deadline_date) return sortBy === 'date-asc' ? 1 : -1
        if (a.deadline_date && b.deadline_date) return sortBy === 'date-asc' ? new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime() : new Date(b.deadline_date).getTime() - new Date(a.deadline_date).getTime()
      }
      else if (sortBy === 'alphabetical') return a.title.localeCompare(b.title)
      
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) return priorityWeight[b.priority] - priorityWeight[a.priority]
      if (a.deadline_date && b.deadline_date && a.deadline_date !== b.deadline_date) return new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime()
      return b.id - a.id
    })
    setDisplayedTasks(processed)
  }

  const fetchTasks = async () => {
    let query = supabase.from('tasks').select('*')
    const todayStr = new Date().toLocaleDateString('en-CA') 

    if (activeListId === 'default' || activeListId === 'dashboard' || activeListId === 'calendar') {
      if (activeListId === 'default') query = query.eq('is_completed', false)
      if (activeListId === 'calendar') query = query.eq('is_completed', false)
    }
    else if (activeListId === 'completed') query = query.eq('is_completed', true)
    else if (activeListId === 'today') query = query.eq('deadline_date', todayStr).eq('is_completed', false)
    else if (activeListId === 'upcoming') query = query.gt('deadline_date', todayStr).eq('is_completed', false)
    else if (activeListId === 'search' && searchQuery) query = query.ilike('title', `%${searchQuery}%`)
    else if (typeof activeListId === 'number') query = query.eq('list_id', activeListId)

    const { data, error } = await query
    if (!error) setTasks(data || [])
  }

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskText.trim()) return

    const formattedTime = newTaskDate && newTaskTime ? (newTaskTime.length === 5 ? newTaskTime + ':00' : newTaskTime) : null
    const insertData: Partial<Task> = {
      user_id: session.user.id,
      title: newTaskText,
      list_id: newTaskTargetList === 'none' ? null : parseInt(newTaskTargetList),
      deadline_date: newTaskDate || null,
      deadline_time: formattedTime,
      priority: newTaskPriority,
      subtasks: [],
      tags: [],
      focus_sessions: 0
    }

    const { data, error } = await supabase.from('tasks').insert([insertData]).select()

    if (!error && data) {
      setTasks([...tasks, data[0]])
      setNewTaskText('')
      setNewTaskDate('')
      setNewTaskTime('')
      setNewTaskPriority('none')
      setNewTaskTargetList('none')
      setShowOptions(false)
      newTaskInputRef.current?.blur()
    }
  }

  const updateTaskInDb = async (id: number, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (error) { alert(`Failed to save: ${error.message}`); fetchTasks() }
  }

  const toggleTask = (task: Task) => {
    const newStatus = !task.is_completed
    const completedAt = newStatus ? new Date().toISOString() : null
    updateTaskInDb(task.id, { is_completed: newStatus, completed_at: completedAt })
  }

  const deleteTask = async (id: number) => {
    if (selectedTaskId === id) { setIsPanelOpen(false); setSelectedTaskId(null); }
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) setTasks(tasks.filter(t => t.id !== id))
  }


  const saveEditedTask = async (id: number) => {
    if (!editTaskTitle.trim()) return
    const updates = { title: editTaskTitle }
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t))
      setEditingTaskId(null)
      if (newTaskInputRef.current) document.body.focus() 
    }
  }

  const formatDateTime = (dateStr: string | null, timeStr: string | null) => {
    if (!dateStr) return null
    const [year, month, day] = dateStr.split('-')
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    if (!timeStr) return formattedDate
    const [hours, minutes] = timeStr.split(':')
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
    return `${formattedDate}, ${parseInt(hours) % 12 || 12}:${minutes} ${ampm}`
  }

  const getListName = (listId: number | null) => {
    if (!listId) return null
    return customLists.find(l => l.id === listId)?.name || null
  }

  const priorityColors = {
    high: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/20',
    medium: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20',
    low: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20',
    none: 'hidden'
  }

  // --- View Routing ---
  if (activeListId === 'dashboard') {
    return <ProductivityDashboard allTasks={tasks} customLists={customLists} onUpdateDb={updateTaskInDb} />
  }

  if (activeListId === 'calendar') {
    return (
      <>
        {isPanelOpen && selectedTaskId && (
          <TaskDetailSidePanel task={tasks.find(t => t.id === selectedTaskId)!} onClose={() => setIsPanelOpen(false)} onUpdateDb={updateTaskInDb} customLists={customLists} />
        )}
        <TaskCalendarView 
          allTasks={tasks} 
          onUpdateDb={updateTaskInDb} 
          onOpenTask={(id) => { setSelectedTaskId(id); setIsPanelOpen(true); }} 
        />
      </>
    )
  }

  return (
    <div className="w-full relative animate-slide-in">
      
      {isPanelOpen && selectedTaskId && (
        <TaskDetailSidePanel task={displayedTasks.find(t => t.id === selectedTaskId)!} onClose={() => setIsPanelOpen(false)} onUpdateDb={updateTaskInDb} customLists={customLists} />
      )}

      {activeListId === 'default' && (
        <form onSubmit={addTask} className="mb-6 md:mb-10 bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative z-10">
          <div className="flex items-center p-2 relative">
            <input
              ref={newTaskInputRef} type="text" placeholder="Add a new task..." value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onFocus={() => { setShowOptions(true); setSelectedTaskId(null); setIsPanelOpen(false); }}
              className="w-full px-3 md:px-4 py-3 bg-transparent text-base md:text-lg text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 font-medium"
            />
            {!showOptions && !newTaskText && (
               <div className="absolute right-4 hidden md:flex items-center gap-1 opacity-50 pointer-events-none">
                 <span className="text-[11px] font-mono border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5">N</span>
               </div>
            )}
          </div>

          {showOptions && (
            <div className="p-3 md:p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0A0A0A]/50 rounded-b-2xl flex flex-wrap gap-3 md:gap-4 items-center justify-between animate-pop-in origin-top">
              <div className="flex flex-wrap gap-2 md:gap-2.5">
                
                <div className="flex items-center gap-1.5 md:gap-2 bg-white dark:bg-[#111111] px-2.5 py-2 md:px-3 md:py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                  <ListIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
                  <select value={newTaskTargetList} onChange={(e) => setNewTaskTargetList(e.target.value)} className="bg-transparent text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer w-24 md:w-auto">
                    <option value="none">General Tasks</option>
                    {customLists.map(list => <option key={list.id} value={list.id as number}>{list.name}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 md:gap-2 bg-white dark:bg-[#111111] px-2.5 py-2 md:px-3 md:py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 transition-all cursor-text relative" onClick={(e) => { const input = e.currentTarget.querySelector('input'); if (e.target !== input) { try { input?.showPicker(); } catch(err) {} } }}>
                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500 cursor-pointer flex-shrink-0" />
                  <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="w-full bg-transparent text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-text [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-0" />
                </div>

                {newTaskDate && (
                  <div className="flex items-center gap-1.5 md:gap-2 bg-white dark:bg-[#111111] px-2.5 py-2 md:px-3 md:py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pop-in focus-within:ring-2 focus-within:ring-blue-500/50 transition-all cursor-text relative" onClick={(e) => { const input = e.currentTarget.querySelector('input'); if (e.target !== input) { try { input?.showPicker(); } catch(err) {} } }}>
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500 cursor-pointer flex-shrink-0" />
                    <input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="w-full bg-transparent text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-text [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:w-0" />
                  </div>
                )}

                <div className="flex items-center gap-1.5 md:gap-2 bg-white dark:bg-[#111111] px-2.5 py-2 md:px-3 md:py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                  <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400" />
                  <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as any)} className="bg-transparent text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
                    <option value="none">No Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                <button type="button" onClick={() => setShowOptions(false)} className="px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-blue-500/20 transform hover:scale-[1.02] transition-all active:scale-95">Save Task</button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* FILTER & SORT ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3 md:gap-4 px-1">
        {tasks.length > 0 ? (
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <div className="flex items-center gap-1.5 md:gap-2 text-slate-500 bg-slate-200/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50 shrink-0">
              <Filter size={14} />
              <select value={filterBy} onChange={e => setFilterBy(e.target.value as any)} className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="high-priority">High Priority</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-slate-500 bg-slate-200/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50 shrink-0">
              <ArrowUpDown size={14} />
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer">
                <option value="default">Smart Sort</option>
                <option value="date-asc">Soonest</option>
                <option value="date-desc">Latest</option>
                <option value="priority">Priority</option>
                <option value="alphabetical">A-Z</option>
              </select>
            </div>
          </div>
        ) : <div/>}

        <div className="hidden md:flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-200/50 dark:bg-slate-800/50 px-2 py-1 rounded">
            Press <kbd className="font-mono bg-white dark:bg-slate-700 px-1 border border-slate-300 dark:border-slate-600 rounded">?</kbd> for shortcuts
          </span>
        </div>
      </div>

      <div className="space-y-2 relative">
        {displayedTasks.map((task, index) => (
          <React.Fragment key={task.id}>
            
            {editingTaskId === task.id ? (
              <div id={`task-${task.id}`} className="flex flex-col gap-4 p-4 md:p-5 w-full bg-white dark:bg-[#111111] border-2 border-blue-500 rounded-2xl shadow-lg z-20 relative animate-pop-in">
                <input
                  type="text" autoFocus value={editTaskTitle} onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="w-full px-2 md:px-3 py-2 bg-transparent text-base md:text-lg font-medium focus:outline-none text-slate-900 dark:text-slate-100"
                  placeholder="Task title"
                />
                <div className="flex gap-2 justify-end mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <button onClick={() => setEditingTaskId(null)} className="px-4 md:px-5 py-2 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Cancel</button>
                  <button onClick={() => saveEditedTask(task.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-5 py-2 rounded-xl text-xs md:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all">Save Title</button>
                </div>
              </div>
            ) : (
              <div 
                id={`task-${task.id}`}
                onClick={() => { setSelectedTaskId(task.id); setIsPanelOpen(true); }}
                className={`group flex items-start sm:items-center justify-between p-3.5 sm:px-5 md:p-4 rounded-2xl border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
                  selectedTaskId === task.id 
                    ? 'bg-white dark:bg-[#1A1A1A] border-blue-400 dark:border-blue-500/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transform scale-[1.01] z-10 relative' 
                    : 'bg-white dark:bg-[#111111] border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm opacity-95 hover:opacity-100'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start sm:items-center gap-3 md:gap-4 flex-1 pt-0.5 sm:pt-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleTask(task); }} 
                    className="flex-shrink-0 mt-0.5 sm:mt-0 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 hover:scale-110 active:scale-90 transition-all focus:outline-none"
                  >
                    {task.is_completed ? <CheckCircle2 className="text-blue-500 drop-shadow-sm w-5 h-5 md:w-6 md:h-6" /> : <Circle strokeWidth={2.5} className="w-5 h-5 md:w-6 md:h-6" />}
                  </button>
                  
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[15px] md:text-[17px] truncate transition-all duration-300 select-none ${task.is_completed ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-100 font-medium'}`}>
                        {task.title}
                      </span>
                      {((task.description) || (task.subtasks && task.subtasks.length > 0)) && (
                        <AlignLeft size={14} className="text-slate-300 dark:text-slate-700 flex-shrink-0" />
                      )}
                      {(task.focus_sessions || 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] md:text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/30 ml-1">
                          <Zap size={10} className="fill-current" /> {task.focus_sessions}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 md:gap-2 items-center">
                      {activeListId === 'default' && task.list_id && (
                         <span className="flex items-center gap-1 md:gap-1.5 text-[9px] md:text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-1.5 md:px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">
                           <ListIcon size={10} /> {getListName(task.list_id)}
                         </span>
                      )}

                      {(task.deadline_date || task.deadline_time) && (
                        <span className={`flex items-center gap-1 md:gap-1.5 text-[10px] md:text-[11px] font-bold px-1.5 md:px-2 py-0.5 rounded border ${
                          task.deadline_date && new Date(task.deadline_date) < new Date() && !task.is_completed 
                            ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20' 
                            : 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-slate-400'
                        }`}>
                          <Calendar size={10} className="md:w-3 md:h-3" />
                          {formatDateTime(task.deadline_date, task.deadline_time)}
                        </span>
                      )}
                      
                      {task.priority !== 'none' && (
                        <span className={`text-[9px] md:text-[10px] uppercase tracking-wider font-extrabold px-1.5 md:px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      )}

                      {task.tags && task.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold px-1.5 md:px-2 py-0.5 rounded bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                          #{tag}
                        </span>
                      ))}
                      {task.tags && task.tags.length > 2 && <span className="text-[10px] md:text-xs font-bold text-slate-400">+{task.tags.length - 2}</span>}
                    </div>
                  </div>
                </div>
                
                <div className={`flex items-center gap-1 transition-all ml-2 md:ml-4 ${selectedTaskId === task.id ? 'opacity-100 translate-x-0' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-x-2 sm:group-hover:translate-x-0'}`}>
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-slate-300 sm:text-slate-400 dark:text-slate-600 sm:dark:text-slate-500 hover:text-red-600 p-1.5 md:p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors focus:outline-none">
                    <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {displayedTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 md:py-20 px-4 text-center animate-pop-in">
          <div className="w-20 h-20 md:w-24 md:h-24 mb-4 md:mb-6 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center border-8 border-white dark:border-slate-900 shadow-sm">
            {activeListId === 'completed' ? <CheckSquare size={32} className="text-blue-400 md:w-9 md:h-9" /> :
             activeListId === 'search' ? <Search size={32} className="text-slate-400 md:w-9 md:h-9" /> :
             <Check size={36} className="text-emerald-400 md:w-10 md:h-10" />}
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-2">
            {activeListId === 'search' ? "No results found" :
             activeListId === 'completed' ? "Nothing completed yet" : 
             activeListId === 'today' ? "Clear schedule today" : 
             tasks.length > 0 ? "No matches for these filters" :
             "You're all caught up!"}
          </h3>
          <p className="text-xs md:text-sm font-medium text-slate-500 max-w-xs">
            {activeListId === 'search' ? "Try adjusting your search terms." :
             tasks.length > 0 ? "Adjust your sort and filter settings above to see your tasks." :
             "Enjoy your peace of mind or add a new task to get started."}
          </p>
        </div>
      )}
    </div>
  )
}