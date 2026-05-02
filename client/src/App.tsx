import React, { useState, useEffect, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import TaskList from './TaskList'
import Account from './Account'
import { 
  LogOut, Sun, Moon, LayoutDashboard, Menu, X, Inbox, CheckSquare, 
  List as ListIcon, Plus, Trash2, Edit2, Search, CalendarDays, 
  CalendarClock, Calendar as CalendarIcon, GripVertical, Command, Activity, Settings, Loader2, ShieldAlert, RefreshCcw
} from 'lucide-react'

export interface ListType {
  id: number | 'default' | 'completed' | 'today' | 'upcoming' | 'calendar' | 'search' | 'dashboard' | 'account'
  name: string
}

const ShortcutRow = ({ label, keys }: { label: string, keys: string[] }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
    <div className="flex items-center gap-1.5">
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {k === 'or' ? (
            <span className="text-[10px] font-bold text-slate-400 uppercase">{k}</span>
          ) : (
            <span className="min-w-[24px] h-6 flex items-center justify-center px-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono font-bold text-slate-600 dark:text-slate-300 shadow-sm">{k}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
)

function App() {
  const [session, setSession] = useState<Session | null>(null)
  
  const [needsMfa, setNeedsMfa] = useState<boolean>(false)
  const [mfaChallengeFactorId, setMfaChallengeFactorId] = useState<string | null>(null)
  const [mfaInputCode, setMfaInputCode] = useState('')
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaLoading, setMfaLoading] = useState(false)

  // --- Deletion State ---
  const [isScheduledForDeletion, setIsScheduledForDeletion] = useState<boolean>(false)
  const [deletionDate, setDeletionDate] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const [isDarkMode, setIsDarkMode] = useState<boolean>(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  
  // FIXED: Changed the default page to the Productivity Dashboard
  const [activeListId, setActiveListId] = useState<number | 'default' | 'completed' | 'today' | 'upcoming' | 'calendar' | 'search' | 'dashboard' | 'account'>('dashboard')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [customLists, setCustomLists] = useState<ListType[]>([])
  const [newListName, setNewListName] = useState('')
  
  const [editingListId, setEditingListId] = useState<number | null>(null)
  const [editListNameText, setEditListNameText] = useState('')

  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDarkMode])

  useEffect(() => {
    // FIXED: Forces a server-side check. If an admin deletes the user from the database,
    // this check will fail and instantly log them out on page load/refresh.
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        supabase.auth.signOut()
        setSession(null)
        return
      }
      
      // If the user genuinely still exists on the server, fetch their local session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        if (session) checkUserStatus(session)
      })
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkUserStatus(session)
      else {
        setNeedsMfa(false)
        setIsScheduledForDeletion(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Checks both MFA and Deletion Status
  const checkUserStatus = async (currentSession: Session) => {
    // 1. Check Deletion Status
    const deletionTimestamp = currentSession.user.user_metadata?.deletion_scheduled_at
    if (deletionTimestamp) {
      setIsScheduledForDeletion(true)
      const dateObj = new Date(deletionTimestamp)
      setDeletionDate(dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))
      return // Stop checking, they need to restore first
    } else {
      setIsScheduledForDeletion(false)
    }

    // 2. Check MFA Status
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) return

    if (data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
      const factors = await supabase.auth.mfa.listFactors()
      const totpFactor = factors.data?.totp[0]
      if (totpFactor) {
        setMfaChallengeFactorId(totpFactor.id)
        setNeedsMfa(true)
      }
    } else {
      setNeedsMfa(false)
      fetchLists()
    }
  }

  const handleRestoreAccount = async () => {
    setIsRestoring(true)
    const { error } = await supabase.auth.updateUser({
      data: { deletion_scheduled_at: null }
    })
    
    setIsRestoring(false)
    if (!error) {
      setIsScheduledForDeletion(false)
      if (session) checkUserStatus(session) // Re-run checks to verify MFA and fetch lists
    }
  }

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaChallengeFactorId || mfaInputCode.length < 6) return
    setMfaLoading(true)
    setMfaError(null)

    const challenge = await supabase.auth.mfa.challenge({ factorId: mfaChallengeFactorId })
    if (challenge.error) {
      setMfaError(challenge.error.message)
      setMfaLoading(false)
      return
    }

    const verify = await supabase.auth.mfa.verify({
      factorId: mfaChallengeFactorId,
      challengeId: challenge.data.id,
      code: mfaInputCode
    })

    if (verify.error) {
      setMfaError("Invalid authenticator code.")
    } else {
      setNeedsMfa(false)
      fetchLists()
    }
    setMfaLoading(false)
  }

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName
      const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT'
      
      if (e.key === 'Escape') {
        if (showShortcutsModal) { setShowShortcutsModal(false); return }
        if (isInputFocused) (document.activeElement as HTMLElement).blur()
        return
      }

      if (isInputFocused || needsMfa || isScheduledForDeletion) return

      switch(e.key) {
        case '?': e.preventDefault(); setShowShortcutsModal(true); break;
        case '/': e.preventDefault(); searchInputRef.current?.focus(); break;
        case '[': setIsSidebarOpen(prev => !prev); break;
        case '1': setActiveListId('default'); break;
        case '2': setActiveListId('today'); break;
        case '3': setActiveListId('upcoming'); break;
        case '4': setActiveListId('calendar'); break;
        case '5': setActiveListId('completed'); break;
        case '6': setActiveListId('dashboard'); break;
      }
    }
    
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [showShortcutsModal, needsMfa, isScheduledForDeletion])

  const fetchLists = async () => {
    if (!session || needsMfa || isScheduledForDeletion) return
    const { data, error } = await supabase.from('lists').select('*').order('id', { ascending: true })
    if (error) return

    let fetchedLists = data || []
    
    const hasInitialized = localStorage.getItem(`init_lists_${session.user.id}`)
    if (fetchedLists.length === 0 && !hasInitialized) {
      const defaultLists = ['Family', 'Friends', 'Work']
      const { data: insertedData } = await supabase.from('lists').insert(defaultLists.map(name => ({ user_id: session.user.id, name }))).select()
      if (insertedData) { fetchedLists = insertedData; localStorage.setItem(`init_lists_${session.user.id}`, 'true') }
    } else {
      localStorage.setItem(`init_lists_${session.user.id}`, 'true')
    }

    const savedOrderStr = localStorage.getItem(`list_order_${session.user.id}`)
    if (savedOrderStr) {
      try {
        const savedOrder = JSON.parse(savedOrderStr) as number[]
        fetchedLists.sort((a, b) => {
          const indexA = savedOrder.indexOf(a.id as number)
          const indexB = savedOrder.indexOf(b.id as number)
          if (indexA === -1 && indexB === -1) return 0
          if (indexA === -1) return 1
          if (indexB === -1) return -1
          return indexA - indexB
        })
      } catch (e) { console.error('Failed to parse list order', e) }
    }

    setCustomLists(fetchedLists)
  }

  const addList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim() || !session) return
    const { data, error } = await supabase.from('lists').insert([{ user_id: session.user.id, name: newListName }]).select()
    if (!error && data) {
      const newLists = [...customLists, data[0]]
      setCustomLists(newLists)
      saveListOrder(newLists)
      setNewListName('')
    }
  }

  const deleteList = async (id: number) => {
    if (activeListId === id) setActiveListId('default')
    const { error } = await supabase.from('lists').delete().eq('id', id)
    if (!error) {
      const newLists = customLists.filter(list => list.id !== id)
      setCustomLists(newLists)
      saveListOrder(newLists)
    }
  }

  const startEditing = (list: ListType) => {
    setEditingListId(list.id as number)
    setEditListNameText(list.name)
  }

  const saveEditedList = async () => {
    if (!editListNameText.trim() || editingListId === null) return
    const { error } = await supabase.from('lists').update({ name: editListNameText }).eq('id', editingListId)
    if (!error) setCustomLists(customLists.map(l => l.id === editingListId ? { ...l, name: editListNameText } : l))
    setEditingListId(null)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('dragIndex', index.toString())
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'))
    if (dragIndex === dropIndex || isNaN(dragIndex)) return

    const newLists = [...customLists]
    const [draggedItem] = newLists.splice(dragIndex, 1)
    newLists.splice(dropIndex, 0, draggedItem)
    
    setCustomLists(newLists)
    saveListOrder(newLists)
  }

  const saveListOrder = (lists: ListType[]) => {
    if (!session) return
    const order = lists.map(l => l.id)
    localStorage.setItem(`list_order_${session.user.id}`, JSON.stringify(order))
  }

  // --- RENDERING ROUTER ---

  if (!session) return <div className="min-h-screen font-sans"><Auth /></div>

  if (isScheduledForDeletion) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] font-sans p-4">
        <div className="w-full max-w-lg bg-white dark:bg-[#151515] border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-2xl p-8 sm:p-10 text-center animate-pop-in">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <RefreshCcw size={36} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Account Recovery</h2>
          <p className="text-base text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">
            Your account is currently scheduled for permanent deletion on <span className="font-bold text-slate-700 dark:text-slate-200">{deletionDate}</span>. Would you like to restore your account and cancel the deletion?
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleRestoreAccount}
              disabled={isRestoring}
              className="flex items-center justify-center w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isRestoring ? <Loader2 size={20} className="animate-spin" /> : 'Yes, Restore My Account'}
            </button>
            <button onClick={() => supabase.auth.signOut()} className="py-4 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              No, keep it deleted (Log Out)
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (needsMfa) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-4">
        <div className="w-full max-w-sm bg-white dark:bg-[#151515] border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-pop-in">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">Two-Factor Auth</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">Enter the 6-digit code from your authenticator app to continue.</p>
          
          <form onSubmit={handleMfaSubmit} className="space-y-6">
            <input 
              type="text" 
              autoFocus
              placeholder="000000"
              maxLength={6}
              value={mfaInputCode} 
              onChange={e => setMfaInputCode(e.target.value.replace(/\D/g, ''))} 
              className="w-full px-4 py-3 sm:py-4 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono font-bold tracking-[1em] text-xl sm:text-2xl text-center" 
            />
            {mfaError && <p className="text-sm text-red-500 font-bold">{mfaError}</p>}
            
            <div className="pt-2 flex flex-col gap-3">
              <button disabled={mfaInputCode.length < 6 || mfaLoading} className="flex items-center justify-center w-full py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm sm:text-base font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50">
                {mfaLoading ? <Loader2 size={20} className="animate-spin" /> : 'Verify Code'}
              </button>
              <button type="button" onClick={() => supabase.auth.signOut()} className="py-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300">
                Cancel & Sign Out
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const activeListName = 
    activeListId === 'default' ? 'All Tasks' : 
    activeListId === 'completed' ? 'Completed' :
    activeListId === 'today' ? "Today" :
    activeListId === 'upcoming' ? "Upcoming" :
    activeListId === 'calendar' ? "Calendar" :
    activeListId === 'dashboard' ? "Productivity Dashboard" :
    activeListId === 'account' ? "Account Settings" :
    activeListId === 'search' ? `Search: "${searchQuery}"` :
    customLists.find(l => l.id === activeListId)?.name || 'Tasks'

  const getButtonClass = (isActive: boolean) => 
    `w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
      isActive 
        ? 'bg-blue-600 shadow-md shadow-blue-500/20 text-white font-medium transform scale-[1.02]' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
    }`

  const renderShortcutBadge = (num: string, isActive: boolean) => (
    <span className={`hidden md:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
      isActive ? 'border-white/30 text-white/80' : 'border-slate-200 dark:border-slate-700 text-slate-400 group-hover:border-slate-300 dark:group-hover:text-slate-500'
    }`}>
      {num}
    </span>
  )

  return (
    <div className="flex h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] font-sans overflow-hidden transition-colors duration-300">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-[280px] md:w-72 bg-white dark:bg-[#111111] border-r border-slate-200/60 dark:border-slate-800/60 transform ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col`}>
        <div className="p-5 md:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/30">
              <LayoutDashboard size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight">DeHassle</h1>
          </div>
          <button className="md:hidden p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-6 md:space-y-8 pb-6 min-h-0 no-scrollbar">
          <div>
            <div className="px-3 mb-2 md:mb-3">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Smart Views</p>
            </div>
            <div className="space-y-1">
              <button onClick={() => { setActiveListId('default'); setIsSidebarOpen(false) }} className={getButtonClass(activeListId === 'default')}>
                <div className="flex items-center gap-3"><Inbox size={18} /> <span className="text-sm md:text-base">All Tasks</span></div>
                {renderShortcutBadge('1', activeListId === 'default')}
              </button>
              <button onClick={() => { setActiveListId('today'); setIsSidebarOpen(false) }} className={getButtonClass(activeListId === 'today')}>
                <div className="flex items-center gap-3"><CalendarDays size={18} /> <span className="text-sm md:text-base">Today</span></div>
                {renderShortcutBadge('2', activeListId === 'today')}
              </button>
              <button onClick={() => { setActiveListId('upcoming'); setIsSidebarOpen(false) }} className={getButtonClass(activeListId === 'upcoming')}>
                <div className="flex items-center gap-3"><CalendarClock size={18} /> <span className="text-sm md:text-base">Upcoming</span></div>
                {renderShortcutBadge('3', activeListId === 'upcoming')}
              </button>
              <button onClick={() => { setActiveListId('calendar'); setIsSidebarOpen(false) }} className={getButtonClass(activeListId === 'calendar')}>
                <div className="flex items-center gap-3"><CalendarIcon size={18} /> <span className="text-sm md:text-base">Calendar</span></div>
                {renderShortcutBadge('4', activeListId === 'calendar')}
              </button>
              <button onClick={() => { setActiveListId('completed'); setIsSidebarOpen(false) }} className={getButtonClass(activeListId === 'completed')}>
                <div className="flex items-center gap-3"><CheckSquare size={18} /> <span className="text-sm md:text-base">Completed</span></div>
                {renderShortcutBadge('5', activeListId === 'completed')}
              </button>
              <button onClick={() => { setActiveListId('dashboard'); setIsSidebarOpen(false) }} className={getButtonClass(activeListId === 'dashboard')}>
                <div className="flex items-center gap-3"><Activity size={18} /> <span className="text-sm md:text-base">Dashboard</span></div>
                {renderShortcutBadge('6', activeListId === 'dashboard')}
              </button>
            </div>
          </div>

          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 md:mb-3">My Lists</p>
            <div className="space-y-1">
              {customLists.map((list, index) => (
                <div 
                  key={list.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`group flex items-center justify-between rounded-xl transition-all cursor-grab active:cursor-grabbing ${activeListId === list.id ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  <div className="pl-2 opacity-0 group-hover:opacity-40 transition-opacity"><GripVertical size={14} /></div>
                  
                  {editingListId === list.id ? (
                    <div className="flex-1 flex items-center gap-2 px-2 py-1">
                      <input 
                        type="text" autoFocus value={editListNameText} 
                        onChange={(e) => setEditListNameText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditedList()}
                        onBlur={saveEditedList}
                        className="flex-1 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none shadow-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setActiveListId(list.id as number); setIsSidebarOpen(false) }} className="flex-1 flex items-center gap-3 px-2 py-2.5 text-left overflow-hidden">
                        <ListIcon size={16} className={activeListId === list.id ? "text-blue-500" : "opacity-70"} /> 
                        <span className="truncate text-sm md:text-base">{list.name}</span>
                      </button>
                      <div className="flex items-center pr-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditing(list)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-md transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => deleteList(list.id as number)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-md transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <form onSubmit={addList} className="mt-4 px-3">
              <div className="relative flex items-center group">
                <input 
                  type="text" 
                  placeholder="New list..." 
                  value={newListName} 
                  onChange={(e) => setNewListName(e.target.value)} 
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-transparent focus:border-slate-300 dark:focus:border-slate-700 text-sm rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all" 
                />
                <button type="submit" className="absolute right-2 p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100">
                  <Plus size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 shrink-0">
           <div className="flex gap-2 mb-2">
             <button onClick={() => { setActiveListId('account'); setIsSidebarOpen(false); }} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl transition-all ${activeListId === 'account' ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20' : 'bg-transparent border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <Settings size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Account</span>
             </button>
           </div>
           <div className="flex gap-2">
            <button onClick={() => setShowShortcutsModal(true)} title="Keyboard Shortcuts (?)" className="hidden md:flex flex-1 justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-all">
              <Command size={18} />
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Theme" className="flex-1 flex justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-all">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => supabase.auth.signOut()} title="Log Out" className="flex-1 flex justify-center p-2.5 rounded-xl border border-red-100 dark:border-red-900/30 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              <LogOut size={18} />
            </button>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="sticky top-0 z-20 flex items-center justify-between p-4 md:px-8 md:py-5 backdrop-blur-xl bg-[#FAFAFA]/80 dark:bg-[#0A0A0A]/80 border-b border-slate-200/60 dark:border-slate-800/60 transition-colors duration-300">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg md:hidden transition-colors"><Menu size={24} /></button>
            <span className="font-bold text-lg md:text-xl text-slate-900 dark:text-white truncate hidden sm:block tracking-tight">{activeListName}</span>
          </div>
          
          <div className="flex-1 max-w-md ml-2 md:ml-4">
            <div className="relative flex items-center group">
              <Search size={16} className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value) setActiveListId('search')
                  else if (activeListId === 'account' || activeListId === 'dashboard' || activeListId === 'calendar') setActiveListId('default')
                }}
                className="w-full pl-10 pr-4 md:pr-8 py-2 md:py-2.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-sm rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all shadow-sm" 
              />
              <div className="absolute right-3 hidden md:block opacity-100 group-focus-within:opacity-0 transition-opacity">
                <span className="text-[10px] font-mono border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded px-1.5 py-0.5 text-slate-400">/</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className={`mx-auto pb-24 md:pb-20 ${activeListId === 'calendar' ? 'max-w-6xl' : 'max-w-4xl'}`}>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight sm:hidden">{activeListName}</h2>
            
            {activeListId === 'account' ? (
              <Account session={session} />
            ) : (
              <TaskList 
                session={session} 
                activeListId={activeListId} 
                searchQuery={searchQuery} 
                customLists={customLists} 
              />
            )}

          </div>
        </div>
      </main>

      {/* Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowShortcutsModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#151515] border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 animate-pop-in overflow-hidden">
            <button onClick={() => setShowShortcutsModal(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none"><X size={20} /></button>
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30"><Command size={24} strokeWidth={2.5} /></div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Navigate and manage tasks at lightspeed.</p>
              </div>
            </div>
            <div className="space-y-8">
              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">Global Navigation</h3>
                <div className="bg-slate-50 dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 px-4">
                  <ShortcutRow label="Show this menu" keys={['?']} />
                  <ShortcutRow label="Search Tasks" keys={['/']} />
                  <ShortcutRow label="Toggle Sidebar" keys={['[']} />
                  <ShortcutRow label="Go to Smart Views" keys={['1', '2', '3', '4', '5', '6']} />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">Task Actions</h3>
                <div className="bg-slate-50 dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 px-4">
                  <ShortcutRow label="Create New Task" keys={['N', 'or', 'C']} />
                  <ShortcutRow label="Navigate Tasks" keys={['↑', '↓', 'or', 'J', 'K']} />
                  <ShortcutRow label="Mark Completed" keys={['X']} />
                  <ShortcutRow label="Open Task Details" keys={['E', 'or', 'Enter']} />
                  <ShortcutRow label="Delete Task" keys={['Del']} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App