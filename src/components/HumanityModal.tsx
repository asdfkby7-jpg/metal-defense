import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Heart, Sun, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { GameState } from '../types';
import { soundFx } from '../utils/audio';

interface HumanityModalProps {
  isOpen: boolean;
  state: GameState;
  onConfirm: () => void;
  onCancel: () => void;
}

export const HumanityModal: React.FC<HumanityModalProps> = ({
  isOpen,
  state,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const lordName = state.customNames?.['lord'] || state.lord.name;
  const deployedHeroCount = state.rooms.reduce(
    (acc, r) =>
      acc +
      r.placedMinions.filter(
        (m) =>
          m.isCustomHeroMinion ||
          m.isImprinted ||
          Boolean(m.originalHeroId) ||
          m.id.startsWith('minion_converted_')
      ).length,
    0
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 border-2 border-amber-500/70 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/20 text-center overflow-hidden"
        >
          {/* Celestial Glow Effect */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Header */}
          <div className="relative mx-auto w-20 h-20 mb-5 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-rose-400 p-0.5 shadow-xl shadow-amber-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Sun className="w-10 h-10 text-amber-300 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-300 animate-bounce" />
            <Heart className="absolute -bottom-2 -left-2 w-6 h-6 text-rose-400 animate-pulse fill-rose-500/40" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            인간성 회복 & 차원 이동의 기적
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-zinc-100 mb-2">
            하프 뱀파이어의 정화
          </h2>

          {/* Condition verification info */}
          <div className="bg-zinc-900/90 border border-amber-900/50 rounded-2xl p-4 mb-6 text-left text-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4" /> 각인된 동료 용사 방어 배치
              </span>
              <span className="font-extrabold text-amber-300">{deployedHeroCount}명 배치 완료 (조건: 6명 이상 달성)</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              6인 이상의 각인 용사들이 당신을 향한 흔들리지 않는 신뢰와 헌신으로 마왕성을 수호하며, 주군 <strong className="text-zinc-200">{lordName}</strong>의 얼어붙었던 심장에 따스한 인간의 온기를 불어넣었습니다.
            </p>
          </div>

          {/* Exact Required User Prompt */}
          <div className="bg-gradient-to-r from-amber-950/60 via-zinc-900/80 to-amber-950/60 border-2 border-amber-400/80 rounded-2xl p-5 mb-8 shadow-inner">
            <p className="text-base sm:text-lg font-black text-amber-100 leading-snug">
              "당신은 하프뱀파이어에서 인간으로 완전히 되돌아오게 됩니다. 선택하시겠습니까?"
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              id="btn-humanity-confirm-yes"
              onClick={() => {
                soundFx.playVictory();
                onConfirm();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-sm shadow-lg shadow-amber-500/30 border border-amber-200 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sun className="w-4 h-4 text-zinc-950 fill-zinc-950" />
              <span>그렇다.</span>
            </button>

            <button
              id="btn-humanity-confirm-no"
              onClick={() => {
                soundFx.playClick();
                onCancel();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 font-bold text-sm border border-zinc-700 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>아니다. 그대로 게임을 진행한다.</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
