import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './supabaseClient'
import type { Session } from '@supabase/supabase-js'
import { Key, Shield, Smartphone, AlertCircle, CheckCircle2, Loader2, Copy, User, Trash2, Clock } from 'lucide-react'

export default function Account({ session }: { session: Session }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null)

  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaMsg, setMfaMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null)

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // --- Deletion State ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showGoodbye, setShowGoodbye] = useState(false)

  useEffect(() => {
    checkMfaStatus()
  }, [])

  // Prevents background scrolling when any modal is open
  useEffect(() => {
    const scrollContainers = document.querySelectorAll('.overflow-y-auto')
    if (isDeleteModalOpen || showGoodbye) {
      document.body.style.overflow = 'hidden'
      scrollContainers.forEach(el => (el as HTMLElement).style.overflow = 'hidden')
    } else {
      document.body.style.overflow = ''
      scrollContainers.forEach(el => (el as HTMLElement).style.overflow = '')
    }
    
    return () => {
      document.body.style.overflow = ''
      scrollContainers.forEach(el => (el as HTMLElement).style.overflow = '')
    }
  }, [isDeleteModalOpen, showGoodbye])

  const checkMfaStatus = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) return
    const totpFactor = data.totp[0]
    if (totpFactor && totpFactor.status === 'verified') {
      setMfaEnabled(true)
      setMfaFactorId(totpFactor.id)
    } else {
      setMfaEnabled(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdMsg(null)
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: "Passwords do not match." })
      return
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: "Password must be at least 6 characters." })
      return
    }

    setPwdLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwdLoading(false)

    if (error) setPwdMsg({ type: 'error', text: error.message })
    else {
      setPwdMsg({ type: 'success', text: "Password updated successfully!" })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const startEnrollment = async () => {
    setMfaMsg(null)
    setMfaLoading(true)
    setOtp(Array(6).fill(''))

    try {
      const { data: existingFactors } = await supabase.auth.mfa.listFactors()
      if (existingFactors && existingFactors.all) {
        const unverified = existingFactors.all.filter(f => f.status === 'unverified' && f.factor_type === 'totp')
        for (const factor of unverified) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id })
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({ 
        factorType: 'totp',
        friendlyName: 'TaskFlow App'
      })
      
      if (error) {
        setMfaMsg({ type: 'error', text: error.message })
        setMfaLoading(false)
        return
      }
      
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setMfaFactorId(data.id)
      setIsEnrolling(true)
    } catch (err: any) {
      setMfaMsg({ type: 'error', text: err.message || 'Failed to start 2FA setup.' })
    } finally {
      setMfaLoading(false)
    }
  }

  const verifyAndEnableMfa = async () => {
    const verifyCode = otp.join('')
    if (!mfaFactorId || verifyCode.length < 6) return
    setMfaMsg(null)
    setMfaLoading(true)

    const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
    if (challenge.error) {
      setMfaMsg({ type: 'error', text: challenge.error.message })
      setMfaLoading(false)
      return
    }

    const verify = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.data.id,
      code: verifyCode
    })

    if (verify.error) {
      setMfaMsg({ type: 'error', text: "Invalid code. Please try again." })
      setOtp(Array(6).fill(''))
      inputRefs.current[0]?.focus()
    } else {
      setMfaEnabled(true)
      setIsEnrolling(false)
      setMfaMsg({ type: 'success', text: "2FA successfully enabled!" })
    }
    setMfaLoading(false)
  }

  const disableMfa = async () => {
    if (!mfaFactorId) return
    setMfaLoading(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
    setMfaLoading(false)
    if (error) {
      setMfaMsg({ type: 'error', text: error.message })
    } else {
      setMfaEnabled(false)
      setMfaFactorId(null)
      setMfaMsg({ type: 'success', text: "2FA has been disabled." })
    }
  }

  const copySecret = () => { if (secret) navigator.clipboard.writeText(secret) }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.substring(value.length - 1)
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6)
    if (pastedData) {
      const newOtp = [...otp]
      for (let i = 0; i < pastedData.length; i++) newOtp[i] = pastedData[i]
      setOtp(newOtp)
      const focusIndex = Math.min(pastedData.length, 5)
      inputRefs.current[focusIndex]?.focus()
    }
  }

  // --- MODIFIED TO SCHEDULE SOFT DELETION ---
  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return
    setIsDeleting(true)

    try {
      // Calculate a date 30 days from now
      const deletionDate = new Date()
      deletionDate.setDate(deletionDate.getDate() + 30)

      // Store the scheduled deletion date in the user's metadata
      const { error } = await supabase.auth.updateUser({
        data: { deletion_scheduled_at: deletionDate.toISOString() }
      })

      if (error) throw error

      setIsDeleteModalOpen(false)
      setShowGoodbye(true)

      // Hold the goodbye message for 4 seconds before kicking them to the login screen
      setTimeout(async () => {
        await supabase.auth.signOut()
      }, 4000)

    } catch (err) {
      console.error(err)
      setIsDeleting(false)
    }
  }

  if (showGoodbye) {
    return createPortal(
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-[#0A0A0A] p-4 animate-pop-in">
        <div className="w-24 h-24 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
          <Clock size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 text-center">Account Scheduled for Deletion</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-center max-w-sm">
          You will be logged out shortly. Your account will be permanently deleted in 30 days. You can cancel this process anytime by logging back in.
        </p>
      </div>,
      document.body
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-slide-in">
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Account Settings</h2>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 md:mt-2 font-medium">Manage your security and authentication preferences.</p>
      </div>

      <div className="space-y-4 md:space-y-6">
        
        {/* Profile Card */}
        <div className="bg-white dark:bg-[#111111] p-5 md:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
          <div className="flex items-center gap-3 mb-5 md:mb-6">
            <div className="bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg text-slate-500 dark:text-slate-400">
              <User size={18} />
            </div>
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-500">Profile Information</h3>
          </div>
          <div className="space-y-2 text-left">
            <label className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email Address</label>
            <input 
              type="text" 
              disabled 
              value={session.user.email} 
              className="w-full px-4 py-3 md:py-3.5 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl cursor-not-allowed font-medium text-sm md:text-base shadow-sm"
            />
            <p className="text-[10px] md:text-xs text-slate-400 font-medium pt-1">Email cannot be changed directly.</p>
          </div>
        </div>

        {/* Password Card */}
        <div className="bg-white dark:bg-[#111111] p-5 md:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
          <div className="flex items-center gap-3 mb-5 md:mb-6">
            <div className="bg-blue-50 dark:bg-blue-500/10 p-2 rounded-lg text-blue-600 dark:text-blue-400">
              <Key size={18} />
            </div>
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-500">Change Password</h3>
          </div>

          {pwdMsg && (
            <div className={`flex items-start gap-2 p-3 md:p-4 mb-5 md:mb-6 text-xs md:text-sm rounded-xl border ${pwdMsg.type === 'error' ? 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-900/30' : 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-900/30'}`}>
              {pwdMsg.type === 'error' ? <AlertCircle size={16} className="shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" /> : <CheckCircle2 size={16} className="shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />}
              <p className="font-bold">{pwdMsg.text}</p>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4 md:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              <div className="space-y-2">
                <label className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 md:py-3.5 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm md:text-base shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] md:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 md:py-3.5 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm md:text-base shadow-sm" />
              </div>
            </div>
            <button type="submit" disabled={pwdLoading || !newPassword || !confirmPassword} className="mt-2 md:mt-4 px-6 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center w-full sm:w-auto min-w-[160px]">
              {pwdLoading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>

        {/* 2FA Security Card */}
        <div className="bg-white dark:bg-[#111111] p-5 md:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-5 md:mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${mfaEnabled ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400"}`}>
                <Shield size={18} />
              </div>
              <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-500">Two-Factor Auth (2FA)</h3>
            </div>
            {mfaEnabled && <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest">Enabled</span>}
          </div>

          {mfaMsg && (
            <div className={`flex items-start gap-2 p-3 md:p-4 mb-5 md:mb-6 text-xs md:text-sm rounded-xl border relative z-10 ${mfaMsg.type === 'error' ? 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-900/30' : 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-900/30'}`}>
              {mfaMsg.type === 'error' ? <AlertCircle size={16} className="shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" /> : <CheckCircle2 size={16} className="shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />}
              <p className="font-bold">{mfaMsg.text}</p>
            </div>
          )}

          {!mfaEnabled && !isEnrolling && (
            <div className="relative z-10">
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium mb-5 md:mb-6 leading-relaxed max-w-2xl">
                Add an extra layer of security to your account. Once enabled, you will be required to enter a 6-digit code from an authenticator app (like Google Authenticator or Authy) when you sign in.
              </p>
              <button onClick={startEnrollment} disabled={mfaLoading} className="px-6 py-2.5 md:py-3 w-full sm:w-auto bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs md:text-sm font-bold shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[160px]">
                {mfaLoading ? <Loader2 size={18} className="animate-spin" /> : 'Set up 2FA'}
              </button>
            </div>
          )}

          {mfaEnabled && (
            <div className="relative z-10">
               <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium mb-5 md:mb-6 leading-relaxed">
                Your account is currently protected by an authenticator app.
              </p>
              <button onClick={disableMfa} disabled={mfaLoading} className="px-6 py-2.5 md:py-3 w-full sm:w-auto border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-xs md:text-sm font-bold active:scale-95 transition-all flex items-center justify-center min-w-[160px]">
                {mfaLoading ? <Loader2 size={18} className="animate-spin" /> : 'Disable 2FA'}
              </button>
            </div>
          )}

          {isEnrolling && qrCode && (
            <div className="bg-slate-50 dark:bg-[#0A0A0A] p-5 md:p-6 lg:p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 relative z-10 animate-slide-in mt-4 md:mt-6">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 items-center md:items-start">
                
                <div className="flex flex-col items-center gap-4 shrink-0 w-full sm:w-auto">
                  <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200">
                    <img src={qrCode} alt="2FA QR Code" className="w-32 h-32 md:w-40 md:h-40 object-contain" />
                  </div>
                </div>
                
                <div className="flex-1 space-y-5 md:space-y-6 w-full">
                  <div className="text-center md:text-left">
                    <h4 className="text-sm md:text-base font-bold text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-2 mb-1.5 md:mb-2">
                      <Smartphone size={16} className="text-blue-500 md:w-[18px] md:h-[18px]"/> Configure your app
                    </h4>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      Scan the QR code using your preferred authenticator app, or manually enter the secret key below.
                    </p>
                  </div>
                  
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center md:text-left block">Manual Entry Key</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 bg-slate-100 dark:bg-slate-800/80 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-[13px] font-mono font-medium text-slate-800 dark:text-slate-200 break-all border border-slate-200 dark:border-slate-700/50">
                        {secret}
                      </code>
                      <button onClick={copySecret} title="Copy Key" className="p-2 md:p-2.5 text-slate-500 hover:text-blue-600 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-blue-300 dark:hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all shadow-sm">
                        <Copy size={14} className="md:w-4 md:h-4"/>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 md:pt-2 text-center md:text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Enter 6-digit Code</label>
                    <div className="flex gap-1.5 sm:gap-2 md:gap-3 justify-center md:justify-start">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { inputRefs.current[index] = el }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(index, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(index, e)}
                          onPaste={handleOtpPaste}
                          className="w-10 h-12 sm:w-11 sm:h-12 md:w-12 md:h-14 bg-white dark:bg-[#151515] border border-slate-200 dark:border-slate-700 text-center text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 md:pt-4">
                    <button onClick={verifyAndEnableMfa} disabled={otp.join('').length < 6 || mfaLoading} className="w-full sm:w-auto px-6 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center min-w-[160px]">
                      {mfaLoading ? <Loader2 size={16} className="animate-spin md:w-[18px] md:h-[18px]" /> : 'Verify & Enable'}
                    </button>
                    <button onClick={() => setIsEnrolling(false)} className="w-full sm:w-auto px-5 py-2.5 md:py-3 font-bold text-xs md:text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- DANGER ZONE --- */}
        <div className="bg-rose-50/50 dark:bg-rose-900/5 p-5 md:p-8 rounded-2xl border border-rose-200 dark:border-rose-900/30 shadow-sm mt-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-rose-100 dark:bg-rose-500/10 p-2 rounded-lg text-rose-600 dark:text-rose-400">
              <AlertCircle size={18} />
            </div>
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">Danger Zone</h3>
          </div>
          <p className="text-sm text-rose-800 dark:text-rose-300/80 mb-6 font-medium">
            Deleting your account will schedule it for permanent removal in 30 days. You will lose access immediately.
          </p>

          <button 
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-6 py-2.5 md:py-3 w-full sm:w-auto border-2 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-xl text-xs md:text-sm font-bold active:scale-95 transition-all flex items-center justify-center min-w-[160px]"
          >
            Delete Account
          </button>
        </div>

      </div>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#151515] border border-rose-200/60 dark:border-rose-900/30 rounded-3xl shadow-2xl p-6 sm:p-8 animate-pop-in overflow-hidden">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">Delete Account?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium text-center">
              Your account will be deactivated immediately and permanently deleted in 30 days. 
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-center">Type "DELETE" to confirm</label>
                <input 
                  type="text" 
                  value={deleteInput} 
                  onChange={(e) => setDeleteInput(e.target.value)} 
                  placeholder="DELETE"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-mono font-bold text-center"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== 'DELETE' || isDeleting}
                  className="flex items-center justify-center w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Schedule Deletion'}
                </button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-3 font-bold text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}