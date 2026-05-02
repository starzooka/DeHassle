import React, { useState } from 'react'
import { supabase } from './supabaseClient'
import { AlertCircle, CheckCircle2, Loader2, LayoutDashboard } from 'lucide-react'

export default function Auth() {
  const [loading, setLoading] = useState<boolean>(false)
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const clearAlerts = () => {
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    clearAlerts()
    
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErrorMsg(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    clearAlerts()

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      setErrorMsg(error.message)
    } else {
      setSuccessMsg("Success! You can now log in.")
      setPassword('') 
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-8 transition-colors">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl text-white mb-4 shadow-sm">
            <LayoutDashboard size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome to De-Hassle</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
            Enter your credentials to access your tasks.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-3 p-4 mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-3 p-4 mb-6 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-lg">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{successMsg}</p>
          </div>
        )}

        <form className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button 
              onClick={handleLogin} 
              disabled={loading} 
              className="flex items-center justify-center w-full py-3 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
            </button>
            <button 
              onClick={handleSignUp} 
              disabled={loading} 
              className="flex items-center justify-center w-full py-3 bg-transparent border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              Create Account
            </button>
          </div>
        </form>
        
      </div>
    </div>
  )
}