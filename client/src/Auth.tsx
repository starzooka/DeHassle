import React, { useState } from 'react'
import { supabase } from './supabaseClient'
import { AlertCircle, CheckCircle2, Loader2, LayoutDashboard, Mail, ArrowRight } from 'lucide-react'

export default function Auth() {
  const [isSignUpView, setIsSignUpView] = useState<boolean>(false)
  const [verificationSent, setVerificationSent] = useState<boolean>(false)

  const [loading, setLoading] = useState<boolean>(false)
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const clearAlerts = () => {
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const toggleView = () => {
    setIsSignUpView(!isSignUpView)
    setVerificationSent(false)
    clearAlerts()
    setPassword('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAlerts()
    
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      // Catch the specific Supabase error for unconfirmed emails
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setErrorMsg("Please verify your email address before logging in. Check your inbox for the confirmation link.")
      } else {
        setErrorMsg(error.message)
      }
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAlerts()

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.")
      return
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      setErrorMsg(error.message)
    } else {
      // Show the email confirmation screen
      setVerificationSent(true)
      setPassword('') 
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#111111] border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-xl p-8 transition-all relative overflow-hidden animate-pop-in">
        
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3.5 rounded-2xl text-white mb-5 shadow-lg shadow-blue-500/30">
            <LayoutDashboard size={28} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {verificationSent ? "Check your email" : isSignUpView ? "Create an Account" : "Welcome to DeHassle"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-[280px]">
            {verificationSent 
              ? "We've sent a verification link to your inbox." 
              : isSignUpView 
                ? "Sign up to start organizing your workflow and building streaks." 
                : "Enter your credentials to access your tasks."}
          </p>
        </div>

        {/* --- VERIFICATION SENT VIEW --- */}
        {verificationSent ? (
          <div className="flex flex-col items-center animate-slide-in relative z-10">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Mail size={32} />
            </div>
            <p className="text-center text-slate-700 dark:text-slate-300 font-medium mb-8">
              Please click the link we sent to <br/><span className="font-bold text-slate-900 dark:text-white">{email}</span> to activate your account.
            </p>
            <button 
              onClick={() => {
                setVerificationSent(false)
                setIsSignUpView(false)
              }} 
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl font-bold transition-all active:scale-95 shadow-md"
            >
              Back to Sign In <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          
          /* --- LOGIN / SIGNUP FORM --- */
          <div className="relative z-10 animate-slide-in">
            {errorMsg && (
              <div className="flex items-start gap-3 p-4 mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-900/30 rounded-xl animate-pop-in">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-3 p-4 mb-6 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl animate-pop-in">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{successMsg}</p>
              </div>
            )}

            <form onSubmit={isSignUpView ? handleSignUp : handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder:text-slate-400 shadow-sm"
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={loading} 
                  className="flex items-center justify-center w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : isSignUpView ? 'Create Account' : 'Sign In'}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/60 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {isSignUpView ? "Already have an account?" : "Don't have an account?"}
                <button 
                  onClick={toggleView} 
                  className="ml-2 text-blue-600 dark:text-blue-400 font-bold hover:underline transition-all"
                >
                  {isSignUpView ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </div>
          </div>
        )}
        
      </div>
    </div>
  )
}