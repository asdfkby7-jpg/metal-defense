import React from 'react';
import { motion } from 'motion/react';
import { Skull, RotateCcw, ShieldAlert, Sparkles, Heart, Crown } from 'lucide-react';
import { GameState } from '../types';
import { soundFx } from '../utils/audio';

interface GameOverModalProps {
  isOpen: boolean;
  state: GameState;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  state,
  onRestart,
}) => {
  if (!isOpen) return null;

  const lordName = state.customNames?.['lord'] || state.lord.name;
  const inheritedCount = state.inheritedHeroIds?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="relative w-full max-w-lg bg-gradient-to-b from-zinc-950 via-red-950/40 to-zinc-950 border-2 border-red-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950 text-center overflow-hidden"
      >
        {/* Skull Icon */}
        <div className="relative mx-auto w-20 h-20 mb-5 rounded-2xl bg-gradient-to-tr from-red-700 via-rose-600 to-red-900 p-0.5 shadow-xl shadow-red-900/50 flex items-center justify-center">
          <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
            <Skull className="w-11 h-11 text-red-500 animate-pulse" />
          </div>
          <Crown className="absolute -top-2 -right-2 w-6 h-6 text-zinc-500" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950 border border-red-600/60 text-red-300 text-xs font-black tracking-wider uppercase mb-2">
          <ShieldAlert className="w-3.5 h-3.5" />
          마왕성 함락 & 주군 전사
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-red-100 mb-2">
          주군 사망 (게임 오버)
        </h1>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-5">
          주군 <strong className="text-red-300">{lordName}</strong>의 체력이 0이 되어 용사단에 의해 마왕성이 함락되었습니다.<br />
          게임은 1웨이브로 초기화되지만, 주군의 영혼에 각인된 <strong className="text-amber-300">향상된 영구 능력치</strong>는 그대로 계승됩니다!
        </p>

        {/* Inherited Stats Preview */}
        <div className="bg-zinc-900/90 border border-red-900/60 rounded-2xl p-4 mb-6 text-left text-xs space-y-2.5">
          <div className="flex items-center justify-between text-zinc-300 border-b border-zinc-800 pb-2">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> 계승되는 주군 최대 체력
            </span>
            <span className="font-mono font-extrabold text-amber-300 text-sm">
              {state.lord.baseHp} HP (그림자 암흑기사 이상)
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-300 border-b border-zinc-800 pb-2">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> 계승되는 주군 공격력 / 방어력
            </span>
            <span className="font-mono font-bold text-zinc-200">
              ATK {state.lord.baseAttack} / DEF {state.lord.baseDefense} (Lv.{state.lord.level})
            </span>
          </div>
          {inheritedCount > 0 && (
            <div className="flex items-center justify-between text-zinc-300 pt-1">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> 계승된 각인 용사 보유량
              </span>
              <span className="font-mono font-bold text-emerald-300">
                {inheritedCount}명 즉시 재소환 가능
              </span>
            </div>
          )}
        </div>

        {/* Restart Button */}
        <button
          id="btn-restart-game-over"
          onClick={() => {
            soundFx.playClick();
            onRestart();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-700 via-rose-700 to-red-800 hover:from-red-600 hover:to-rose-600 text-white font-black text-sm sm:text-base shadow-xl shadow-red-950 border border-red-500/60 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <RotateCcw className="w-5 h-5 text-white" />
          <span>계승된 능력치로 새로운 방어전 시작 (초기화)</span>
        </button>
      </motion.div>
    </div>
  );
};
