"use client";
import { useState } from "react";
import api from "@/lib/api";

export const CONFIRM_PHRASE = 'CONFIRM SYSTEM FORMAT';

export function JITResetModal({ onClose, onConfirm }) {
  const [phrase, setPhrase] = useState('');
  const [jitPassword, setJitPassword] = useState('');
  const [step, setStep] = useState(1); // 1=phrase, 2=jit
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');

  const phraseMatch = phrase === CONFIRM_PHRASE;

  const handleExecute = async () => {
    if (!phraseMatch || !jitPassword) return;
    setError('');
    setIsExecuting(true);
    try {
      // Step 1: Verify JIT password
      const jitRes = await api.post('/admin/verify-jit', { password: jitPassword });
      const jitToken = jitRes.data.jitToken;
      // Step 2: Execute reset with JIT token
      await api.post('/admin/system/reset', {}, {
        headers: { 'x-jit-token': jitToken },
      });
      await onConfirm();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Reset failed. Check JIT password.';
      setError(msg);
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Red pulsing border glow */}
      <div className="w-full max-w-lg relative">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-red-600 via-red-500/50 to-transparent opacity-70 blur-sm animate-pulse pointer-events-none" />

        <div className="relative bg-[#0d0608] border border-red-500/40 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(220,38,38,0.3)]">
          {/* Header */}
          <div className="bg-red-950/60 border-b border-red-500/30 px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <div>
                <p className="font-mono text-[9px] text-red-400/60 uppercase tracking-widest">⚠ DESTRUCTIVE OPERATION</p>
                <h2 className="font-mono font-black text-base text-red-200 uppercase tracking-tighter">System Database Reset</h2>
              </div>
            </div>
            <button onClick={onClose} disabled={isExecuting} className="text-red-400/50 hover:text-red-200 transition-colors text-xl">&times;</button>
          </div>

          <div className="p-8 space-y-6">
            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 space-y-1.5">
              <p className="font-mono font-black text-[11px] text-red-300 uppercase tracking-widest">⚠ This action is irreversible</p>
              <p className="font-mono text-[10px] text-red-400/70 leading-relaxed">
                All service bookings, event registrations, merch sales, comments, audit logs, mini events, and broadcasts will be permanently deleted.
              </p>
              <p className="font-mono text-[10px] text-emerald-400/80 mt-2">✓ Preserved: User accounts, Events catalog, Merch catalog.</p>
            </div>

            {/* Step 1: Phrase confirmation */}
            <div>
              <label className="font-mono text-[10px] text-white/40 uppercase tracking-widest block mb-2">
                Type exactly to continue:
                <span className="text-red-400 font-black ml-2">{CONFIRM_PHRASE}</span>
              </label>
              <input
                type="text"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="Type the phrase above..."
                autoComplete="off"
                spellCheck={false}
                className={`w-full bg-black/40 border rounded-xl px-4 py-3 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none transition-all ${
                  phrase.length > 0
                    ? phraseMatch
                      ? 'border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                      : 'border-red-500/60 shadow-[0_0_10px_rgba(220,38,38,0.15)]'
                    : 'border-white/10'
                }`}
              />
            </div>

            {/* Step 2: JIT Password (unlocks when phrase is correct) */}
            <div className={`transition-all duration-300 ${phraseMatch ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <label className="font-mono text-[10px] text-white/40 uppercase tracking-widest block mb-2">JIT Admin Password</label>
              <input
                type="password"
                value={jitPassword}
                onChange={(e) => setJitPassword(e.target.value)}
                placeholder="Enter JIT password..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-red-500/60 transition-all"
              />
            </div>

            {error && <p className="font-mono text-xs text-red-400">{error}</p>}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                disabled={isExecuting}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white/40 hover:bg-white/10 transition-all disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={!phraseMatch || !jitPassword || isExecuting}
                className="flex-1 py-3 bg-red-600 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white hover:bg-red-500 transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(220,38,38,0.3)]"
              >
                {isExecuting ? 'Executing...' : '⚡ Execute Reset'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function JITActionModal({ title, description, onClose, onConfirm }) {
  const [jitPassword, setJitPassword] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!jitPassword.trim()) return;
    setError('');
    setIsExecuting(true);
    try {
      const jitRes = await api.post('/admin/verify-jit', { password: jitPassword });
      await onConfirm(jitRes.data.jitToken);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Authorization failed.';
      setError(msg);
      setIsExecuting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isExecuting) onClose(); }}
    >
      <div className="w-full max-w-md relative">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber-500/40 via-amber-400/10 to-transparent blur-sm pointer-events-none" />
        <div className="relative bg-[#0d0f0a] border border-amber-500/25 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.12)]">

          {/* Header */}
          <div className="bg-amber-950/30 border-b border-amber-500/20 px-7 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="font-mono text-[9px] text-amber-400/50 uppercase tracking-widest">Authorization Required</p>
                <h2 className="font-mono font-black text-sm text-amber-100 uppercase tracking-tighter">{title || 'Confirm Action'}</h2>
              </div>
            </div>
            <button onClick={onClose} disabled={isExecuting} className="text-white/20 hover:text-white transition-colors text-xl">&times;</button>
          </div>

          <div className="p-7 space-y-5">
            {description && (
              <p className="font-mono text-[10px] text-white/40 leading-relaxed">{description}</p>
            )}

            {/* JIT Password */}
            <div>
              <label className="font-mono text-[10px] text-white/30 uppercase tracking-widest block mb-2">JIT Admin Password</label>
              <input
                type="password"
                value={jitPassword}
                onChange={(e) => setJitPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                placeholder="Enter JIT password to authorize..."
                autoFocus
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>

            {error && <p className="font-mono text-xs text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isExecuting}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white/40 hover:bg-white/10 transition-all disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!jitPassword.trim() || isExecuting}
                className="flex-1 py-3 bg-amber-600 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white hover:bg-amber-500 transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                {isExecuting ? 'Authorizing...' : 'Confirm →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
