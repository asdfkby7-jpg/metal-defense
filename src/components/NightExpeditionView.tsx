import React, { useState, useMemo } from 'react';
import { GameState, ExpeditionTarget, Minion, Hero } from '../types';
import { initialExpeditionTargets, initialHeroesCatalog } from '../data/defaultData';
import { NightRaidSurvivorArena } from './NightRaidSurvivorArena';
import { soundFx } from '../utils/audio';
import {
  Moon,
  Sparkles,
  Swords,
  Droplet,
  Coins,
  ChevronRight,
  Shield,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  Flame,
  Award,
  Crown,
  Heart,
  Skull,
} from 'lucide-react';

interface NightExpeditionViewProps {
  state: GameState;
  onExecuteRaid: (
    target: ExpeditionTarget,
    rewardMana: number,
    rewardGold: number,
    capturedHero?: Hero,
    lostCompanion?: Minion
  ) => void;
  onSkipRaid: () => void;
}

export const NightExpeditionView: React.FC<NightExpeditionViewProps> = ({
  state,
  onExecuteRaid,
  onSkipRaid,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('exp_village');
  const [isPlayingArena, setIsPlayingArena] = useState<boolean>(false);
  const [raidResult, setRaidResult] = useState<{
    success: boolean;
    mana: number;
    gold: number;
    message: string;
    capturedHero?: Hero;
    lostCompanion?: Minion;
  } | null>(null);

  const selectedTarget =
    initialExpeditionTargets.find((t) => t.id === selectedTargetId) || initialExpeditionTargets[0];

  const totalMinionsPlaced = state.rooms.reduce((acc, r) => acc + r.placedMinions.length, 0);

  // Wave condition checks
  const isNightRaidWave = state.wave > 0 && state.wave % 5 === 0;
  const isRaidAlreadyExecutedThisWave = state.lastExecutedRaidWave === state.wave;
  const nextRaidWave = isNightRaidWave
    ? state.wave + 5
    : Math.ceil(state.wave / 5) * 5;

  const hasEnoughMana = state.mana >= selectedTarget.reqMana;
  const hasEnoughMinions = totalMinionsPlaced >= selectedTarget.reqMinions;
  const canAffordRequirements = hasEnoughMana && hasEnoughMinions;

  // Crucial Rule: Can only execute at most 1 time in a night raid wave, even if MP is sufficient
  const canLaunchRaid = isNightRaidWave && !isRaidAlreadyExecutedThisWave && canAffordRequirements;

  // Compute up to 2 strongest companion minions among all owned minions and converted hero minions
  const strongestCompanions: Minion[] = useMemo(() => {
    const sorted = [...state.inventoryMinions]
      .filter((m) => m.isUnlocked)
      .sort((a, b) => {
        const scoreA = a.hp + a.attack * 2 + a.defense;
        const scoreB = b.hp + b.attack * 2 + b.defense;
        return scoreB - scoreA;
      });

    return sorted.slice(0, 2);
  }, [state.inventoryMinions]);

  // Imprinted hero companion resonance calculations (1 -> +10% attack speed, 2 -> +20% attack speed & super effects)
  const imprintedCount = useMemo(() => {
    return strongestCompanions.filter(
      (c) => c.isImprinted || state.imprintedHeroIds?.includes(c.originalHeroId || '')
    ).length;
  }, [strongestCompanions, state.imprintedHeroIds]);

  const attackSpeedBuffPercent = imprintedCount >= 2 ? 20 : imprintedCount === 1 ? 10 : 0;

  // Companions power calculation (5% to 50% HP & ATK bonus for Lord)
  const squadPowerBonusPercent = useMemo(() => {
    const totalCompanionPower = strongestCompanions.reduce(
      (sum, c) => sum + (c.hp + c.attack * 2 + c.defense),
      0
    );
    const ratio = Math.min(1, Math.max(0, (totalCompanionPower - 50) / 1200));
    return Math.round(5 + ratio * 45);
  }, [strongestCompanions]);

  // Find boss hero for selected target
  const bossHero: Hero = useMemo(() => {
    const found = initialHeroesCatalog.find((h) => h.id === selectedTarget.bossHeroId);
    return (
      found ||
      initialHeroesCatalog.find((h) => h.isNightRaidOnly) ||
      initialHeroesCatalog[0]
    );
  }, [selectedTarget]);

  // Start Survivor Arena Combat
  const handleStartArena = () => {
    if (!canLaunchRaid) return;
    soundFx.playClick();
    setIsPlayingArena(true);
  };

  // Victory in Survivor Arena
  const handleArenaVictory = (
    rewardMana: number,
    rewardGold: number,
    capturedHero?: Hero,
    captureRate?: number
  ) => {
    setIsPlayingArena(false);
    const bonusMultiplier = 1 + state.lord.level * 0.2;
    const finalMana = Math.floor(rewardMana * bonusMultiplier);
    const finalGold = Math.floor(rewardGold * bonusMultiplier);
    const lordName = state.customNames?.['lord'] || state.lord.name;
    const heroName = state.customNames?.[bossHero.id] || bossHero.name;
    const ratePercent = captureRate ? `${Math.round(captureRate * 100)}%` : '확률';

    if (capturedHero) {
      setRaidResult({
        success: true,
        mana: finalMana,
        gold: finalGold,
        capturedHero,
        message: `🌑 [흡정야행 대승리 & 생포 성공 (확률 ${ratePercent})] 주군 ${lordName}과 2인 결사대가 [${selectedTarget.name}]을 완벽히 정복하고, 체력 0이 된 핵심 용사 [${heroName}]을(를) 완벽히 제압하여 지하 감옥에 수감했습니다!`,
      });
    } else {
      setRaidResult({
        success: true,
        mana: finalMana,
        gold: finalGold,
        capturedHero: undefined,
        message: `🌑 [흡정야행 대승리 & 생포 실패 (확률 ${ratePercent})] 주군 ${lordName}과 2인 결사대가 [${selectedTarget.name}]을 정복하여 자원을 전액 탈취했으나, 체력이 0이 된 용사 [${heroName}]이(가) 연막탄을 터뜨리며 도망쳤습니다!`,
      });
    }
  };

  // Defeat in Survivor Arena (If died before 2 minutes, lose 1 companion)
  const handleArenaDefeat = (partialMana: number, lostCompanion?: Minion) => {
    setIsPlayingArena(false);
    setRaidResult({
      success: false,
      mana: partialMana,
      gold: 0,
      lostCompanion,
      message: lostCompanion
        ? `💀 [작전 실패 & 결사대 전사] 2분을 버티지 못하고 주군이 치명상을 입었습니다! 동행한 결사대원 [${
            state.customNames?.[lostCompanion.id] || lostCompanion.name
          }]이(가) 주군을 구출하고 전사하여 영구히 잃었습니다...`
        : `⚠️ [작전 퇴각] 맹렬한 수비대의 반격에 부딪혀 일부 마력(${partialMana} MP)만 회수한 채 본대로 복귀하였습니다.`,
    });
  };

  // Exit Arena prematurely
  const handleArenaExit = () => {
    setIsPlayingArena(false);
  };

  // If in real-time battle arena, render the arena canvas
  if (isPlayingArena) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <NightRaidSurvivorArena
          state={state}
          target={selectedTarget}
          bossHero={bossHero}
          selectedSquad={strongestCompanions}
          onVictory={handleArenaVictory}
          onDefeat={handleArenaDefeat}
          onExit={handleArenaExit}
        />
      </div>
    );
  }

  return (
    <div id="night-expedition-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-zinc-950 border border-purple-800/60 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {isNightRaidWave ? (
              isRaidAlreadyExecutedThisWave ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-purple-300 border border-purple-500/50 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Wave {state.wave} 흡정야행 1회 완료
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-900 text-purple-200 border border-purple-500/50 animate-pulse flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-purple-300" /> 5번째 웨이브 야행 페이즈 (Wave {state.wave})
                </span>
              )
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-900 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-zinc-500" /> 5웨이브 주기 대기 중 (다음 개방: Wave {nextRaidWave})
              </span>
            )}
            <span className="text-xs text-amber-300/90 font-semibold">
              ⭐ 규칙: 흡정야행은 MP가 충분하더라도 웨이브당 최대 1회만 실행 가능
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-zinc-100 mt-1.5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            마력 대량 수집 및 신규 용사 생포: 주군 & 2인 결사대 흡정야행
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            주군(투사체 전담)과 2인의 최정예 결사대(근접 참격 전담)가 출격하여 2분간의 실시간 생존 전투를 벌입니다. 2분을 버티지 못하고 사망 시 결사대원 1명을 영구히 잃습니다!
          </p>
        </div>

        {/* Skip Raid Button */}
        {isNightRaidWave && !isRaidAlreadyExecutedThisWave && (
          <button
            onClick={() => {
              soundFx.playClick();
              onSkipRaid();
            }}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <XCircle className="w-4 h-4 text-zinc-500" />
            <span>야행 스킵 (이번 웨이브 턴 넘기기)</span>
          </button>
        )}
      </div>

      {/* 1-Time Limit Notice Banner */}
      {isNightRaidWave && isRaidAlreadyExecutedThisWave && (
        <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-4 flex items-center gap-3 text-xs text-purple-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="space-y-0.5">
            <div className="font-bold text-zinc-100 text-sm">
              이번 Wave {state.wave} 흡정야행 출격(1/1회)을 이미 완수하였습니다.
            </div>
            <p className="text-zinc-300 leading-relaxed">
              마력(MP)이 충분하더라도 흡정야행은 웨이브당 1회까지만 실행 가능합니다. 다음 흡정야행은 <strong>Wave {nextRaidWave}</strong>에 다시 진행할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {!isNightRaidWave && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 text-xs text-zinc-300">
          <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <div className="font-bold text-zinc-100 text-sm">
              현재는 일반 방어 웨이브(Wave {state.wave}) 진행 중입니다.
            </div>
            <p className="text-zinc-400 mt-0.5">
              흡정야행은 5번째 웨이브마다(Wave 5, 10, 15, 20...) 1회씩만 개방됩니다. 4대 필드와 출격 결사대를 사전 점검하세요.
            </p>
          </div>
        </div>
      )}

      {/* 3-Person Strike Squad Formation Banner */}
      <div className="bg-zinc-950 border border-purple-900/50 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-zinc-200">출격 3인 결사대 포메이션 & 전투 공명 버프</h3>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-pink-950 text-pink-300 border border-pink-700/50">
              각인 용사 {imprintedCount}/2명: 공속 +{attackSpeedBuffPercent}%
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-950 text-amber-300 border border-amber-700/50">
              결사대 공명: HP & ATK +{squadPowerBonusPercent}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Leader Lord */}
          <div className="bg-gradient-to-br from-red-950/60 via-purple-950/40 to-zinc-900 border border-red-500/50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-red-400 bg-zinc-950 flex-shrink-0 relative">
              <img
                src={state.customImages['lord'] || state.lord.imageUrl}
                alt={state.lord.name}
                className="w-full h-full object-cover animate-breath"
              />
              <span className="absolute bottom-0 inset-x-0 bg-red-950/90 text-[9px] font-bold text-center text-red-200">
                총사령관
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-red-200 truncate flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  {state.customNames?.['lord'] || state.lord.name}
                </h4>
                <span className="text-[10px] text-amber-300 font-mono">Lv.{state.lord.level}</span>
              </div>
              <p className="text-[10px] text-red-300 font-bold mt-0.5">유일한 원거리 투사체 난사</p>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 font-mono">
                <span className="text-red-400 font-bold">HP {state.lord.baseHp}</span>
                <span className="text-amber-400 font-bold">ATK {state.lord.baseAttack}</span>
              </div>
            </div>
          </div>

          {/* 2 & 3. Companions */}
          {strongestCompanions.map((unit, idx) => {
            const isImp = unit.isImprinted || state.imprintedHeroIds?.includes(unit.originalHeroId || '');
            return (
              <div
                key={unit.id}
                className={`bg-zinc-900/80 border rounded-xl p-3 flex items-center gap-3 ${
                  isImp ? 'border-pink-500/60 ring-1 ring-pink-500/30' : 'border-zinc-800'
                }`}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-purple-500/50 bg-zinc-950 flex-shrink-0 relative">
                  <img
                    src={state.customImages[unit.id] || unit.imageUrl}
                    alt={unit.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] font-bold text-center text-purple-300">
                    호위 대원 {idx + 1}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-100 truncate">
                      {state.customNames?.[unit.id] || unit.name}
                    </h4>
                    {isImp ? (
                      <span className="text-[9px] bg-pink-950 text-pink-300 border border-pink-700/50 px-1 py-0.2 rounded font-bold">
                        각인 용사
                      </span>
                    ) : (
                      <span className="text-[10px] text-purple-400 font-mono">T{unit.tier}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-purple-300 mt-0.5">반 사이즈 공전 & 근접 참격</p>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 font-mono">
                    <span className="text-red-400 font-bold">HP {unit.hp}</span>
                    <span className="text-amber-400 font-bold">ATK {unit.attack}</span>
                    <span className="text-blue-400">DEF {unit.defense}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {strongestCompanions.length < 2 && (
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-3 flex items-center justify-center text-zinc-600 text-xs font-bold">
              + 추가 보유 하수인 없음
            </div>
          )}
        </div>
      </div>

      {!raidResult ? (
        /* Target Selection Grid (4 Thematic Fields) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Target List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-300">4대 침투 필드 선택</h3>
              <span className="text-xs text-purple-400 font-mono">
                {isNightRaidWave && !isRaidAlreadyExecutedThisWave ? '출격 가능 (1/1회)' : isNightRaidWave ? '출격 완료 (0/1회 남음)' : '대기 중'}
              </span>
            </div>

            <div className="space-y-3">
              {initialExpeditionTargets.map((target) => {
                const isSelected = target.id === selectedTargetId;
                const fieldBoss = initialHeroesCatalog.find((h) => h.id === target.bossHeroId);
                const trapCount =
                  target.difficulty === 1 ? 2 : target.difficulty === 2 ? 5 : target.difficulty === 3 ? 8 : 12;
                const captureChanceText =
                  target.bossHeroId === 'h_exp_ranger'
                    ? '40%'
                    : target.bossHeroId === 'h_exp_crusader'
                    ? '30%'
                    : target.bossHeroId === 'h_exp_templar'
                    ? '20%'
                    : '30%';

                return (
                  <div
                    key={target.id}
                    onClick={() => {
                      soundFx.playClick();
                      setSelectedTargetId(target.id);
                    }}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-purple-950/60 border-purple-500 shadow-xl ring-2 ring-purple-500/30'
                        : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-purple-500/40 bg-zinc-900 flex-shrink-0">
                        <img
                          src={target.imageUrl}
                          alt={target.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-100">{target.name}</h4>
                          <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800/40 px-1.5 py-0.5 rounded">
                            난이도 ★{target.difficulty}
                          </span>
                          <span className="text-[10px] text-red-400 font-bold">
                            함정 {trapCount}개
                          </span>
                          <span className="text-[10px] bg-pink-950 text-pink-300 border border-pink-700/50 px-1.5 py-0.5 rounded font-bold">
                            🎯 생포율 {captureChanceText}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{target.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-pink-400 font-bold">
                            생포 대상: {fieldBoss?.name || '특수 용사'} ({captureChanceText})
                          </span>
                          <span className="text-[10px] text-zinc-500">• {target.riskText}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs space-y-1 flex-shrink-0">
                      <div className="text-red-400 font-bold">+{target.baseManaReward} MP</div>
                      <div className="text-amber-300 font-bold">+{target.baseGoldReward} G</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Target Preview & Launch Panel */}
          <div className="bg-zinc-950 border border-purple-900/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-purple-200">{selectedTarget.name} 작전 브리핑</h3>
                <span className="text-xs text-amber-400 font-mono font-bold">
                  소모 마력: {selectedTarget.reqMana} MP / 최소 하수인: {selectedTarget.reqMinions}명
                </span>
              </div>

              {/* Boss Hero Target Banner */}
              <div className="bg-gradient-to-r from-pink-950/40 to-purple-950/40 border border-pink-500/40 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-pink-400 bg-zinc-900 flex-shrink-0">
                  <img
                    src={state.customImages[bossHero.id] || bossHero.imageUrl}
                    alt={bossHero.name}
                    className="w-full h-full object-cover animate-breath"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-pink-200">{bossHero.name}</span>
                    <span className="text-[10px] bg-pink-950 text-pink-300 px-1.5 py-0.5 rounded border border-pink-700/50">
                      {bossHero.rank} 생포 대상
                    </span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/50 font-bold">
                      🎯 HP 0 격파 시 생포 확률:{' '}
                      {bossHero.id === 'h_exp_ranger'
                        ? '40%'
                        : bossHero.id === 'h_exp_crusader'
                        ? '30%'
                        : bossHero.id === 'h_exp_templar'
                        ? '20%'
                        : '30%'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">{bossHero.description}</p>
                  <p className="text-[10px] text-yellow-300/90 font-mono mt-0.5">
                    * 1분 20초 경과 시 출현 & 10초 주기 특수 공격 [{bossHero.specialSkillName}] 사용
                  </p>
                </div>
              </div>

              {/* Requirements Checklist */}
              <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">현재 보유 마력:</span>
                  <span className={`font-mono font-bold ${hasEnoughMana ? 'text-emerald-400' : 'text-red-400'}`}>
                    {state.mana} MP / {selectedTarget.reqMana} MP
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">현재 수호 배치 하수인:</span>
                  <span className={`font-mono font-bold ${hasEnoughMinions ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalMinionsPlaced} 명 / {selectedTarget.reqMinions} 명
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2">
                  <span className="text-zinc-400">이번 웨이브 실행 가능 여부:</span>
                  <span className={`font-bold ${!isNightRaidWave ? 'text-zinc-500' : isRaidAlreadyExecutedThisWave ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {!isNightRaidWave ? `Wave ${nextRaidWave}에 개방` : isRaidAlreadyExecutedThisWave ? '이번 웨이브 1회 실행 완료' : '출격 가능 (1회 한정)'}
                  </span>
                </div>
              </div>

              {/* Rule reminder box */}
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-purple-900/30 text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>2분간 실시간 생존 & 사망 시 결사대원 1명 영구 전사</span>
                </div>
                <p className="text-zinc-400">
                  전투 중 2분을 버티지 못하고 HP가 0이 되면 작전 실패 처리되며, 동행한 결사대원 중 1명이 영구히 전사하여 사라집니다.
                </p>
              </div>
            </div>

            {/* Launch Button */}
            <button
              id="btn-launch-raid"
              onClick={handleStartArena}
              disabled={!canLaunchRaid}
              className={`w-full py-4 rounded-xl font-extrabold text-sm sm:text-base shadow-xl flex items-center justify-center gap-3 transition-all ${
                !canLaunchRaid
                  ? 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-700 via-pink-800 to-purple-900 hover:from-purple-600 hover:to-pink-700 text-white border border-purple-500/50 shadow-purple-950 animate-pulse'
              }`}
            >
              {!isNightRaidWave ? (
                <>
                  <Lock className="w-5 h-5 text-zinc-500" />
                  <span>Wave {nextRaidWave} 도달 시 출격 개방</span>
                </>
              ) : isRaidAlreadyExecutedThisWave ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  <span>이번 웨이브 출격 완료 (1회 한정 소진됨)</span>
                </>
              ) : !canAffordRequirements ? (
                <>
                  <Swords className="w-5 h-5 text-zinc-500" />
                  <span>{!hasEnoughMana ? '마력(MP) 부족' : '배치된 하수인 수 부족'}</span>
                </>
              ) : (
                <>
                  <Swords className="w-5 h-5 text-purple-200" />
                  <span>흡정야행 뱀서라이크 습격 단행! (2분 실시간 전투)</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Raid Result Screen */
        <div className="bg-zinc-950 border-2 border-purple-500/60 rounded-2xl p-8 text-center space-y-6 shadow-2xl animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-purple-950 border-2 border-purple-500/60 mx-auto flex items-center justify-center text-purple-300 shadow-lg shadow-purple-950">
            {raidResult.success ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-amber-400" />
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-zinc-100">
              {raidResult.success ? '흡정야행 대성공 • 용사 생포 완료!' : '흡정야행 작전 종료'}
            </h3>
            <p className="text-sm text-purple-300 max-w-lg mx-auto">{raidResult.message}</p>
            <p className="text-xs text-zinc-400">
              (이번 Wave {state.wave}의 1회 출격 한도를 사용하였습니다. 다음 출격은 Wave {nextRaidWave}입니다.)
            </p>
          </div>

          {/* Captured Hero Showcase if successful */}
          {raidResult.capturedHero && (
            <div className="max-w-md mx-auto bg-gradient-to-r from-pink-950/60 to-purple-950/60 border-2 border-pink-500/60 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-pink-400 bg-zinc-950 flex-shrink-0">
                <img
                  src={state.customImages[raidResult.capturedHero.id] || raidResult.capturedHero.imageUrl}
                  alt={raidResult.capturedHero.name}
                  className="w-full h-full object-cover animate-breath"
                />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-pink-200 truncate">
                    {state.customNames?.[raidResult.capturedHero.id] || raidResult.capturedHero.name}
                  </h4>
                  <span className="text-[10px] bg-pink-900 text-pink-200 px-2 py-0.5 rounded-full font-bold">
                    신규 포로 획득!
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">{raidResult.capturedHero.title}</p>
                <p className="text-[11px] text-pink-400/80 mt-1">
                  지하 감옥 탭에서 혈액 채취(주군 영구 HP 증가), 포로 심문, 3회 흡혈 각인 의식을 진행할 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {/* Lost Companion Showcase if defeated */}
          {raidResult.lostCompanion && (
            <div className="max-w-md mx-auto bg-red-950/70 border-2 border-red-500/70 rounded-2xl p-4 flex items-center gap-4 shadow-xl text-left">
              <div className="w-14 h-14 rounded-xl bg-black border border-red-500/60 flex items-center justify-center text-red-400 flex-shrink-0">
                <Skull className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-red-200 truncate">
                    {state.customNames?.[raidResult.lostCompanion.id] || raidResult.lostCompanion.name}
                  </h4>
                  <span className="text-[10px] bg-red-900 text-red-200 px-2 py-0.5 rounded font-bold">
                    전사 손실됨
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  2분을 버티지 못하고 패배하여 주군을 호위하던 결사대원이 전사하였습니다.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-6 max-w-md mx-auto">
            <div className="bg-zinc-900/90 px-6 py-3 rounded-xl border border-red-500/30 font-mono">
              <div className="text-xs text-zinc-400">수집 마력</div>
              <div className="text-xl font-extrabold text-red-400">+{raidResult.mana} MP</div>
            </div>

            <div className="bg-zinc-900/90 px-6 py-3 rounded-xl border border-amber-500/30 font-mono">
              <div className="text-xs text-zinc-400">약탈 골드</div>
              <div className="text-xl font-extrabold text-amber-300">+{raidResult.gold} G</div>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playVictory();
              onExecuteRaid(
                selectedTarget,
                raidResult.mana,
                raidResult.gold,
                raidResult.capturedHero,
                raidResult.lostCompanion
              );
            }}
            className="px-8 py-3.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-extrabold text-sm border border-purple-500/50 shadow-lg shadow-purple-950 inline-flex items-center gap-2"
          >
            <span>던전 관리로 복귀 (포로 수감 및 결과 처리)</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
