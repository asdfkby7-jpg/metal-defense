import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Sun, Heart, Crown, ArrowRight, RotateCcw, ShieldCheck, Check } from 'lucide-react';
import { GameState } from '../types';
import { soundFx } from '../utils/audio';

interface HumanityEndingModalProps {
  isOpen: boolean;
  state: GameState;
  onRestartNewLife: () => void;
}

export const HumanityEndingModal: React.FC<HumanityEndingModalProps> = ({
  isOpen,
  state,
  onRestartNewLife,
}) => {
  if (!isOpen) return null;

  const lordName = state.customNames?.['lord'] || state.lord.name;
  const assistantName = state.customNames?.['assistant'] || state.assistant.name;

  const deployedHeroes = state.rooms.flatMap((r) =>
    r.placedMinions.filter(
      (m) =>
        m.isCustomHeroMinion ||
        m.isImprinted ||
        Boolean(m.originalHeroId) ||
        m.id.startsWith('minion_converted_')
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="relative w-full max-w-2xl bg-gradient-to-b from-stone-900 via-amber-950/40 to-stone-950 border-2 border-amber-400 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-amber-500/30 text-center my-8 overflow-hidden"
      >
        {/* Divine Light Beams */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent pointer-events-none" />

        {/* Crown & Sun Emblem */}
        <div className="relative mx-auto w-24 h-24 mb-6 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 p-1 shadow-2xl shadow-amber-400/50 flex items-center justify-center">
          <div className="w-full h-full bg-zinc-950 rounded-[20px] flex items-center justify-center relative overflow-hidden">
            <Sun className="w-14 h-14 text-amber-300 animate-spin" style={{ animationDuration: '15s' }} />
            <Crown className="absolute bottom-2 right-2 w-5 h-5 text-amber-400" />
          </div>
          <Sparkles className="absolute -top-3 -right-3 w-8 h-8 text-yellow-300 animate-pulse" />
          <Heart className="absolute -bottom-3 -left-3 w-8 h-8 text-rose-400 fill-rose-500/50 animate-bounce" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-200 text-xs font-black tracking-widest uppercase mb-4 shadow">
          <Sparkles className="w-4 h-4 text-amber-300" />
          🌟 TRUE ENDING: 인간성 회복 & 인간 세계 차원 이동
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-amber-100 mb-3 drop-shadow">
          빛으로 되돌아온 군주 {lordName}
        </h1>

        <p className="text-sm sm:text-base text-amber-200/90 font-medium leading-relaxed max-w-xl mx-auto mb-6">
          하프 뱀파이어 군주로서 칠흑의 어둠 속에서 피의 갈증과 싸워오던 당신은, 성을 함께 지켜온 각인된 영웅들의 순수한 유대와 사랑을 통해 잃어버렸던 인간성을 완전히 되찾았습니다.
        </p>

        {/* Story Narrative Card */}
        <div className="bg-zinc-950/80 border border-amber-500/40 rounded-2xl p-5 text-left text-xs sm:text-sm text-zinc-300 space-y-3 mb-6 shadow-inner">
          <p className="leading-relaxed">
            마왕성의 어두운 장막이 걷히고, 눈부신 황금빛 차원의 문이 열립니다. 충직한 비서 <span className="text-amber-300 font-bold">{assistantName}</span>과 당신의 곁을 든든하게 지켜준 각인 동료 용사들이 미소를 지으며 손을 내밉니다.
          </p>
          <p className="leading-relaxed text-amber-200/90 italic font-serif">
            "주군, 이제 피의 굴레는 끝났습니다. 우리와 함께 새로운 세상, 인간계로 향하시지요."
          </p>
          <p className="leading-relaxed">
            당신은 흡혈귀의 숙명을 뒤로하고, 영원한 전우들과 함께 차원의 문 너머 평화로운 인간 세계로 발걸음을 옮깁니다.
          </p>
        </div>

        {/* Deployed Companions Showcase */}
        {deployedHeroes.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 mb-6">
            <h3 className="text-xs font-bold text-amber-300 mb-3 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              함께 차원 이동한 각인 수호 영웅단 ({deployedHeroes.length}인)
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {deployedHeroes.map((h, idx) => (
                <div
                  key={`${h.instanceId || h.id}_${idx}`}
                  className="flex items-center gap-2 bg-zinc-950/90 border border-amber-500/30 rounded-xl px-3 py-1.5 shadow"
                >
                  <img
                    src={state.customImages[h.id] || h.imageUrl}
                    alt={h.name}
                    className="w-7 h-7 rounded-lg object-cover border border-amber-400/50"
                  />
                  <span className="text-xs font-bold text-zinc-200">{state.customNames?.[h.id] || h.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inherited Stats Note */}
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 mb-6 text-xs text-amber-300 text-center">
          ✨ 주군의 성장한 영구 능력치 (최대 HP: {state.lord.baseHp}, 공격력: {state.lord.baseAttack}, 방어력: {state.lord.baseDefense}, Lv.{state.lord.level}) 및 계승된 각인 용사는 영원히 보존됩니다.
        </div>

        {/* Restart / Next Journey Button */}
        <button
          id="btn-restart-after-humanity-ending"
          onClick={() => {
            soundFx.playVictory();
            onRestartNewLife();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-base shadow-2xl shadow-amber-500/50 border-2 border-amber-200 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <RotateCcw className="w-5 h-5 text-zinc-950" />
          <span>계승된 능력치와 함께 새로운 회차 시작하기 (초기화)</span>
          <ArrowRight className="w-5 h-5 text-zinc-950" />
        </button>
      </motion.div>
    </div>
  );
};
