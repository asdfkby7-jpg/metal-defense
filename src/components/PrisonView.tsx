import React from 'react';
import { GameState, Prisoner } from '../types';
import { soundFx } from '../utils/audio';
import {
  Lock,
  Droplet,
  Coins,
  Sparkles,
  RefreshCw,
  Heart,
  Skull,
  UserCheck,
  Zap,
} from 'lucide-react';

interface PrisonViewProps {
  state: GameState;
  onDrainBlood: (instanceId: string) => void;
  onRansomPrisoner: (instanceId: string) => void;
  onConvertMinion: (instanceId: string) => void;
  onTriggerBLEvent: (prisoner: Prisoner) => void;
}

export const PrisonView: React.FC<PrisonViewProps> = ({
  state,
  onDrainBlood,
  onRansomPrisoner,
  onConvertMinion,
  onTriggerBLEvent,
}) => {
  return (
    <div id="prison-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-zinc-900 to-zinc-950 border border-purple-800/60 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-900 text-purple-200 border border-purple-500/40">
              지하 감옥 & 혈액 연구소
            </span>
            <span className="text-xs text-zinc-400">
              (현재 수감 포로: <span className="text-purple-300 font-bold">{state.prisoners.length}</span>명)
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-400" />
            포획된 용사단 포로 관리 및 혈액 수집
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            포획된 용사의 피를 빨아 주군의 마력을 수집하거나, 몸값을 요구하고, 충직한 하수인으로 개조하세요.
          </p>
        </div>
      </div>

      {/* Empty Prison State */}
      {state.prisoners.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 mx-auto flex items-center justify-center text-zinc-600">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-300">현재 지하 감옥이 비어있습니다.</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              던전에 포획용 함정(마법 포획 족쇄, 마령 거미 등)을 설치하거나 웨이브 방어전을 통해 용사단을 포획해오세요!
            </p>
          </div>
        </div>
      ) : (
        /* Prisoner Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {state.prisoners.map((prisoner) => {
            const hero = prisoner.hero;
            const isBL = hero.isBLHero;
            const isRookie = hero.id === 'h_rookie' || hero.name.includes('루키') || hero.name.includes('카일');
            const ransomValue = isRookie ? 0 : hero.goldReward * 2 + prisoner.capturedAtWave * 100;
            const manaValue = hero.manaPurity + Math.floor(hero.maxHp * 0.5);
            const conversionManaCost = 150;

            return (
              <div
                key={prisoner.instanceId}
                className={`bg-zinc-950 rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 shadow-xl ${
                  isBL
                    ? 'border-pink-500/50 hover:border-pink-400 ring-1 ring-pink-500/20'
                    : 'border-purple-900/40 hover:border-purple-700'
                }`}
              >
                {/* Prisoner Info Header */}
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-500/40 bg-zinc-900 flex-shrink-0 relative">
                    <img
                      src={state.customImages[hero.id] || hero.imageUrl}
                      alt={state.customNames?.[hero.id] || hero.name}
                      className="w-full h-full object-cover animate-breath"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-zinc-100 truncate">
                        {state.customNames?.[hero.id] || hero.name}
                      </h3>
                      <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/40 px-2 py-0.5 rounded font-bold">
                        {hero.rank}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 mt-0.5">{hero.title}</p>
                    <p className="text-[11px] text-purple-300/80 italic mt-1 line-clamp-2">{hero.description}</p>
                  </div>
                </div>

                {/* Health & Value Stats */}
                <div className="bg-zinc-900/80 rounded-xl p-3 border border-zinc-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">포획 상태:</span>
                    <span className="text-emerald-400 font-bold">건강 상태 {prisoner.remainingHealthPercent}%</span>
                  </div>

                  {/* Drain & Affinity Imprint Progress */}
                  <div className="pt-1 border-t border-zinc-800 space-y-2">
                    {/* Blood Drain Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <Droplet className="w-3.5 h-3.5 fill-rose-500 text-rose-400" />
                          피의 각인 (흡혈):
                        </span>
                        <span className="font-mono font-extrabold text-rose-400">
                          {prisoner.drainCount || 0} / 3 회
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-600 to-rose-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((prisoner.drainCount || 0) / 3) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Whisper Affinity Progress */}
                    {isBL && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-pink-300 font-bold flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-400" />
                            호감도 각인 (귓속말):
                          </span>
                          <span className="font-mono font-extrabold text-pink-400">
                            {prisoner.interrogationCount || 0} / 3 회
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, ((prisoner.interrogationCount || 0) / 3) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-zinc-400 leading-tight">
                      * <strong className="text-rose-400">흡혈 3회</strong>: 주군 최대 HP 대폭 강화 & 용사 약화 각인<br/>
                      * <strong className="text-pink-400">귓속말 3회</strong>: 마력/주군HP 미증가, <strong className="text-pink-300">용사 HP 100% 온전 보존</strong> 각인
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[11px]">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Droplet className="w-3.5 h-3.5 text-red-400" /> 1회 흡혈 획득 마력:
                    </span>
                    <span className="font-mono text-red-400 font-extrabold">+{manaValue} MP</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" /> 몸값 요구 (포로 교환):
                    </span>
                    {isRookie ? (
                      <span className="text-zinc-500 font-bold">교환 불가 (0G / MP만 가능)</span>
                    ) : (
                      <span className="font-mono text-amber-300 font-extrabold">+{ransomValue} G</span>
                    )}
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  {/* Special Interrogation Event Button */}
                  {isBL && (
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        onTriggerBLEvent(prisoner);
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-700 via-rose-800 to-purple-900 hover:from-pink-600 hover:to-purple-800 text-white font-extrabold text-xs shadow-lg shadow-pink-950 border border-pink-400/50 flex items-center justify-center gap-2 transition-all animate-pulse"
                    >
                      <Sparkles className="w-4 h-4 text-pink-300" />
                      <span>특별 심문 & 포로 선택지 이벤트</span>
                    </button>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {/* Drain Blood */}
                    {(() => {
                      const isDrainedThisWave = prisoner.lastDrainedWave === state.wave;
                      return (
                        <button
                          disabled={isDrainedThisWave}
                          onClick={() => {
                            if (isDrainedThisWave) return;
                            soundFx.playBloodDrain();
                            onDrainBlood(prisoner.instanceId);
                          }}
                          className={`py-2 rounded-xl border font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-colors ${
                            isDrainedThisWave
                              ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                              : 'bg-red-950/80 hover:bg-red-900 text-red-200 border-red-800/50'
                          }`}
                          title={
                            isDrainedThisWave
                              ? `이미 이번 턴(Wave ${state.wave})에 흡혈을 완료했습니다. 다음 웨이브에서 다시 가능합니다.`
                              : isRookie
                              ? `루키 모험가는 미숙하여 주군 HP 증가율이 0.2%(<0.3%)로 미미하며, 1회 흡혈 후 즉시 소멸합니다.`
                              : `용사의 강함에 따라 주군 최대 HP +1%~5% 영구 증가 (MP 미증가, 턴당 1회, 3회 시 아군 각인 및 침실 밀애 해금)`
                          }
                        >
                          <Droplet className={`w-4 h-4 ${isDrainedThisWave ? 'text-zinc-600' : 'text-red-400'}`} />
                          <span>{isDrainedThisWave ? '이번턴 완료' : '피 흡혈'}</span>
                        </button>
                      );
                    })()}

                    {/* Ransom */}
                    <button
                      disabled={isRookie}
                      onClick={() => {
                        if (isRookie) return;
                        soundFx.playRansomGold();
                        onRansomPrisoner(prisoner.instanceId);
                      }}
                      className={`py-2 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-colors ${
                        isRookie
                          ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                          : 'bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-800/50'
                      }`}
                      title={
                        isRookie
                          ? '루키 모험가는 무명이라 가문에서 몸값을 지급하지 않습니다. MP(피 채취)만 가능합니다.'
                          : '고위 귀족 용사단 가문에 몸값을 요구합니다.'
                      }
                    >
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>{isRookie ? '몸값 불가' : '몸값 교환'}</span>
                    </button>

                    {/* Convert to Minion */}
                    <button
                      onClick={() => {
                        soundFx.playClick();
                        onConvertMinion(prisoner.instanceId);
                      }}
                      disabled={state.mana < conversionManaCost}
                      className={`py-2 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-colors ${
                        state.mana < conversionManaCost
                          ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                          : 'bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800/50'
                      }`}
                      title={`마력 ${conversionManaCost}MP를 소모하여 즉시 충직한 하수인 몬스터로 개조합니다.`}
                    >
                      <UserCheck className="w-4 h-4 text-purple-400" />
                      <span>하수인 개조</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
