'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { User } from '../types';
import { ApiError, authApi } from '../lib/api';
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  IdCard
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { setCurrentUser } = useApp();

  const [citizenIdInput, setCitizenIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forced Password Change Modal State
  const [showForceChangeModal, setShowForceChangeModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  // Format a Thai citizen ID while still accepting 12-digit foreign personnel identifiers.
  const formatCitizenId = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 13);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 1 || i === 5 || i === 10 || i === 12) formatted += '-';
      formatted += digits[i];
    }
    return formatted;
  };

  const handleCitizenIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 13) {
      setCitizenIdInput(raw);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const cleanInputCid = citizenIdInput.trim();
    if (![12, 13].includes(cleanInputCid.length)) {
      setErrorMessage('กรุณากรอกรหัสประจำตัวให้ครบ 12 หรือ 13 หลัก');
      setIsLoading(false);
      return;
    }

    try {
      const result = await authApi.login(cleanInputCid, passwordInput);
      setCurrentUser(result.user);
      if (result.mustChangePassword) {
        setPendingUser(result.user);
        setShowForceChangeModal(true);
      } else {
        onLoginSuccess();
      }
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forced First-Time Password Change
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');

    if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setChangeError('รหัสผ่านต้องมีอย่างน้อย 10 ตัว และมีทั้งตัวอักษรกับตัวเลข');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (!pendingUser) return;

    try {
      const updated = await authApi.changePassword(newPassword, confirmPassword);
      setCurrentUser(updated);
      setChangeSuccess(true);
      setTimeout(() => {
        setShowForceChangeModal(false);
        onLoginSuccess();
      }, 700);
    } catch (error) {
      setChangeError(error instanceof ApiError ? error.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    }
  };

  return (
    <div
      className="min-h-screen w-full relative flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat font-sans"
      style={{
        backgroundImage: 'url(/school-bg.jpg)'
      }}
    >
      {/* Dark & Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#051329]/85 via-[#0b1f3a]/75 to-[#1a3a60]/80 backdrop-blur-xs"></div>

      {/* Main Login Card */}
      <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/40 animate-in fade-in zoom-in-95 duration-300">
        {/* Header Branding */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-white p-2 shadow-lg border border-slate-100 flex items-center justify-center ring-4 ring-blue-500/20">
            <img
              src="/school-logo.png"
              alt="ตราประจำโรงเรียนมกุฎเมืองราชวิทยาลัย"
              className="w-full h-full object-contain drop-shadow-xs"
            />
          </div>

          <div>
            <h1 className="text-lg font-black text-[#0b1f3a] tracking-tight">
              โรงเรียนมกุฎเมืองราชวิทยาลัย
            </h1>
            <p className="text-xs font-semibold text-blue-900 mt-0.5">
              ระบบสารสนเทศบริหารงานโรงเรียน (MMV Smart School)
            </p>
            <p className="text-[11px] text-slate-400">
              สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาชลบุรี ระยอง
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Thai citizen ID or foreign personnel identifier */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              รหัสประจำตัวบุคลากร 12–13 หลัก
            </label>
            <div className="relative">
              <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                maxLength={17}
                placeholder="x-xxxx-xxxxx-xx-x"
                value={formatCitizenId(citizenIdInput)}
                onChange={handleCitizenIdChange}
                className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-blue-700 font-mono text-sm font-bold text-slate-800 outline-hidden transition-all shadow-2xs"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              * ป้อนเลขประจำตัวประชาชน หรือรหัสบุคลากรต่างชาติ
            </p>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                รหัสผ่าน (Password)
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="กรอกรหัสผ่าน..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-blue-700 text-sm font-medium text-slate-800 outline-hidden transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#0b1f3a] to-[#153e70] hover:from-[#102a4e] hover:to-[#1c4d87] text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer mt-3"
          >
            <span>เข้าสู่ระบบ (Sign In)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Forced Password Reset Modal (บังคับเปลี่ยนรหัสผ่านครั้งแรก) */}
      {showForceChangeModal && pendingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="text-center space-y-1 pb-3 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center font-bold">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-[#0b1f3a] tracking-tight">
                ตั้งรหัสผ่านใหม่สำหรับการใช้งานครั้งแรก
              </h3>
              <p className="text-xs text-slate-500">
                ยินดีต้อนรับคุณ <strong>{pendingUser.name}</strong><br/>
                เพื่อความปลอดภัยของข้อมูล กรุณากำหนดรหัสผ่านใหม่ส่วนตัวของท่าน
              </p>
            </div>

            {changeError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{changeError}</span>
              </div>
            )}

            {changeSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>บันทึกรหัสผ่านใหม่สำเร็จ! กำลังเข้าสู่ระบบ...</span>
              </div>
            )}

            <form onSubmit={handleSaveNewPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 10 ตัวอักษร) *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="พิมพ์รหัสผ่านใหม่..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 outline-hidden focus:bg-white focus:border-blue-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ยืนยันรหัสผ่านใหม่อีกครั้ง *
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="พิมพ์ยืนยันรหัสผ่านใหม่อีกครั้ง..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 outline-hidden focus:bg-white focus:border-blue-700"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-950 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>คำแนะนำการตั้งรหัสผ่าน:</span>
                </div>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                  <li>ความยาวอย่างน้อย 10 ตัวอักษร</li>
                  <li>ต้องมีตัวอักษรภาษาอังกฤษและตัวเลข</li>
                  <li>หลีกเลี่ยงข้อมูลส่วนตัวหรือรหัสที่เดาง่าย</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={changeSuccess}
                className="w-full py-2.5 rounded-xl bg-[#0b1f3a] hover:bg-[#153e70] text-white font-extrabold text-xs shadow-md transition-all mt-2 cursor-pointer"
              >
                ✓ บันทึกรหัสผ่านใหม่และเข้าสู่ระบบ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
