import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Crown, Sparkles, CheckCircle2, Shield, ArrowRight, UserCheck, Star } from 'lucide-react';
import { GameState, Hero, Minion } from '../types';
import { initialHeroesCatalog } from '../data/defaultData';
import { soundFx } from '../utils/audio';

interface MissionSuccessModalProps {
  isOpen: boolean;
  state: GameState;
  onConfirmInherit: (selectedHeroId: string | null) => void;
}

export const MissionSuccessModal: React.FC<MissionSuccessModalProps> = ({
  isOpen,
  state,
  onConfirmInherit,
}) => {
  if (!isOpen) return null;

  const lordName = state.customNames?.['lord'] || state.lord.name;
  const currentSuccessCount = (state.missionSuccessCount || 0) + 1;
  const alreadyInheritedIds = new Set<string>(state.inheritedHeroIds || []);

  // Collect all currently imprinted heroes in the run
  const allImprintedMinions = state.inventoryMinions.filter(
    (m) =>
      (m.isCustomHeroMinion || m.id.startsWith('minion_converted_')) &&
      (m.isImprinted || (state.imprintedHeroIds && state.imprintedHeroIds.includes(m.originalHeroId || '')))
  );

  const heroCandidates: Hero[] = [];
  const candidateIds = new Set<string>();

  // Add imprinted heroes from inventory
  allImprintedMinions.forEach((m) => {
    const heroId = m.originalHeroId || m.id.replace('minion_converted_', '');
    if (heroId && !candidateIds.has(heroId) && !alreadyInheritedIds.has(heroId)) {
      candidateIds.add(heroId);
      const found = initialHeroesCatalog.find((h) => h.id === heroId);
      if (found) {
        heroCandidates.push(found);
      } else {
        heroCandidates.push({
          id: heroId,
          name: m.originalHeroName || m.name.replace('아군이 된 ', ''),
          title: '각인된 아군 용사',
          rank: m.tier >= 4 ? 'Platinum' : m.tier === 3 ? 'Gold' : 'Silver',
          hp: m.hp,
          maxHp: m.maxHp,
          attack: m.attack,
          defense: m.defense,
          speed: m.speed,
          goldReward: 500,
          manaPurity: 200,
          description: m.description,
          imageUrl: m.imageUrl,
          isBLHero: true,
        });
      }
    }
  });

  // Also check imprintedHeroIds
  (state.imprintedHeroIds || []).forEach((heroId) => {
    if (!candidateIds.has(heroId) && !alreadyInheritedIds.has(heroId)) {
      candidateIds.add(heroId);
      const found = initialHeroesCatalog.find((h) => h.id === heroId);
      if (found) heroCandidates.push(found);
    }
  });

  // Already inherited heroes list
  const alreadyInheritedHeroes: Hero[] = (state.inheritedHeroIds || [])
    .map((id) => initialHeroesCatalog.find((h) => h.id === id))
    .filter((h): h is Hero => h !== undefined);

  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(
    heroCandidates.length > 0 ? heroCandidates[0].id : null
  );

  const handleSelect = (heroId: string) => {
    soundFx.playClick();
    setSelectedHeroId(heroId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        className="relative w-full max-w-2xl bg-gradient-to-b from-zinc-900 via-amber-950/30 to-zinc-950 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/30 text-center my-6 overflow-hidden"
      >
        {/* Top Trophy Banner */}
        <div className="relative mx-auto w-20 h-20 mb-4 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 p-0.5 shadow-xl shadow-amber-500/40 flex items-center justify-center">
          <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
            <Trophy className="w-11 h-11 text-amber-300 animate-bounce" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 animate-pulse" />
          <Star className="absolute -bottom-2 -left-2 w-6 h-6 text-amber-400 fill-amber-400" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-950/80 border border-amber-400/60 text-amber-300 text-xs font-black tracking-wider uppercase mb-2">
          <Crown className="w-3.5 h-3.5" />
          제 {currentSuccessCount}회차 미션 완료 달성
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-amber-100 mb-2">
          🏆 미션 성공! (30웨이브 최종 방어 완수)
        </h1>

        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-lg mx-auto mb-5">
          축하합니다! 제국의 30웨이브 대공세를 완벽하게 막아내고 성을 지켜냈습니다.<br />
          다음 초기화 시 <strong className="text-amber-300">영구 승계할 각인 용사를 1명 선택</strong>하여 다음 회차 시작 시 함께 출격시킬 수 있습니다.
        </p>

        {/* Existing Automatically Inherited Heroes */}
        {alreadyInheritedHeroes.length > 0 && (
          <div className="bg-zinc-900/90 border border-amber-500/40 rounded-2xl p-4 mb-5 text-left">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                이전 미션 성공으로 자동 계승되는 용사 ({alreadyInheritedHeroes.length}명)
              </span>
              <span className="text-[11px] text-zinc-400 font-normal">다음 회차 시작 시 자동 포함</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {alreadyInheritedHeroes.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-2 bg-zinc-950 border border-emerald-500/50 rounded-xl px-3 py-1.5 shadow"
                >
                  <img
                    src={state.customImages[h.id] || h.imageUrl}
                    alt={h.name}
                    className="w-6 h-6 rounded-lg object-cover border border-emerald-400"
                  />
                  <span className="text-xs font-bold text-emerald-200">{state.customNames?.[h.id] || h.name}</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-bold">
                    자동 계승
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hero Selection for This Inheritance */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 mb-5 text-left">
          <h3 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-amber-400" />
            이번 미션 성공으로 영구 승계할 각인 용사 선택 (1명)
          </h3>

          {heroCandidates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              {heroCandidates.map((hero) => {
                const isSelected = selectedHeroId === hero.id;
                const heroName = state.customNames?.[hero.id] || hero.name;

                return (
                  <div
                    key={hero.id}
                    onClick={() => handleSelect(hero.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-950'
                        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden border border-amber-500/50 bg-black flex-shrink-0">
                      <img
                        src={state.customImages[hero.id] || hero.imageUrl}
                        alt={heroName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-zinc-100 truncate">{heroName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-amber-300 font-bold">
                          {hero.rank}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{hero.title}</p>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                        HP {hero.hp} | ATK {hero.attack} | DEF {hero.defense}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-zinc-400 text-xs">
              선택 가능한 새로운 각인 용사가 없거나 이미 모든 각인 용사를 승계했습니다.<br />
              (기존 승계된 용사들과 함께 다음 회차를 진행할 수 있습니다.)
            </div>
          )}
        </div>

        {/* Lord Stats Inheritance Summary */}
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 mb-6 text-xs text-amber-200/90 text-center">
          👑 주군 <strong className="text-amber-100">{lordName}</strong>의 향상된 능력치(최대 HP: {state.lord.baseHp}, 공격력: {state.lord.baseAttack}, 방어력: {state.lord.baseDefense}, Lv.{state.lord.level})는 다음 회차로 영구 승계됩니다.
        </div>

        {/* Confirmation Button */}
        <button
          id="btn-confirm-mission-success-inherit"
          onClick={() => {
            soundFx.playVictory();
            onConfirmInherit(selectedHeroId);
          }}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-base shadow-2xl shadow-amber-500/40 border-2 border-amber-200 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Trophy className="w-5 h-5 text-zinc-950" />
          <span>승계 확정 & 다음 회차 시작하기 (1웨이브 초기화)</span>
          <ArrowRight className="w-5 h-5 text-zinc-950" />
        </button>
      </motion.div>
    </div>
  );
};
