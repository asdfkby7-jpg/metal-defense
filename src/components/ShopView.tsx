import React from 'react';
import { GameState, Minion, Trap } from '../types';
import { soundFx } from '../utils/audio';
import {
  Sparkles,
  Coins,
  Droplet,
  Crown,
  Lock,
  Unlock,
  Zap,
  Skull,
  Shield,
  Check,
} from 'lucide-react';

interface ShopViewProps {
  state: GameState;
  onUpgradeLord: () => void;
  onUnlockMinion: (minionId: string) => void;
  onUnlockTrap: (trapId: string) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  state,
  onUpgradeLord,
  onUnlockMinion,
  onUnlockTrap,
}) => {
  const lordUpgradeCostGold = state.lord.level * 400;
  const lordUpgradeCostMana = state.lord.level * 200;
  const canAffordLordUpgrade = state.gold >= lordUpgradeCostGold && state.mana >= lordUpgradeCostMana;

  return (
    <div id="shop-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-zinc-900 to-zinc-950 border border-amber-800/60 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-900 text-amber-100 border border-amber-500/40">
              어둠의 연구소 & 소환 상점
            </span>
            <span className="text-xs text-zinc-400">마력 및 골드로 해금</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            주군 권능 강화 및 신규 몬스터/함정 연구
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            수집한 마력과 골드를 투자하여 주군 {state.customNames?.['lord'] || state.lord.name}의 권능을 높이고 상위 티어 몬스터와 트랩을 해금하세요.
          </p>
        </div>
      </div>

      {/* Lord Level Empower Panel */}
      <div className="bg-gradient-to-br from-zinc-950 via-red-950/20 to-zinc-950 border border-amber-500/40 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400 bg-zinc-950 shadow-lg shadow-amber-950 flex-shrink-0">
            <img
              src={state.customImages['lord'] || state.lord.imageUrl}
              alt={state.customNames?.['lord'] || state.lord.name}
              className="w-full h-full object-cover animate-breath"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-amber-200">주군 {state.customNames?.['lord'] || state.lord.name} 레벨업</h3>
              <span className="text-xs text-amber-400 bg-amber-950 px-2 py-0.5 rounded font-bold border border-amber-800/40">
                현재 Lv.{state.lord.level}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              주군의 기본 체력(+100), 공격력(+20), 방어력(+10)이 전면 상승합니다.
            </p>
            <div className="mt-2 text-[11px] space-y-0.5 font-medium">
              <p className={state.lord.level >= 5 ? "text-purple-300 font-bold" : "text-zinc-500"}>
                🔮 [Lv.5 특전] 골드방, 감옥, 성소 적 침입 시 1개 방 50% 원거리 마법 지원사격 (우선순위: 골드방 &gt; 감옥 &gt; 성소)
              </p>
              <p className={state.lord.level >= 10 ? "text-amber-300 font-bold" : "text-zinc-500"}>
                🔮 [Lv.10 특전] 2개 방 동시 원거리 지원 마법사격 확장
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            soundFx.playVictory();
            onUpgradeLord();
          }}
          disabled={!canAffordLordUpgrade}
          className={`px-6 py-3.5 rounded-xl font-extrabold text-xs shadow-lg flex items-center gap-3 transition-all ${
            !canAffordLordUpgrade
              ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white border border-amber-400/50 shadow-amber-950'
          }`}
        >
          <Crown className="w-5 h-5 text-amber-200" />
          <span>
            주군 권능 강화 ({lordUpgradeCostGold} G / {lordUpgradeCostMana} MP)
          </span>
        </button>
      </div>

      {/* Minions Unlock Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
          <Skull className="w-4 h-4 text-red-400" />
          상위 하수인 몬스터 해금 연구
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.inventoryMinions.map((minion) => {
            const canAfford = state.gold >= minion.costGold * 1.5 && state.mana >= minion.costMana * 1.5;

            return (
              <div
                key={minion.id}
                className={`bg-zinc-950 border rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-lg ${
                  minion.isUnlocked ? 'border-zinc-800' : 'border-red-950 bg-red-950/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 flex-shrink-0">
                    <img
                      src={state.customImages[minion.id] || minion.imageUrl}
                      alt={state.customNames?.[minion.id] || minion.name}
                      className="w-full h-full object-cover animate-breath"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h4 className="text-xs font-bold text-zinc-100">{minion.name}</h4>
                      <span className="text-[9px] bg-red-950 text-red-300 px-1 rounded">T{minion.tier}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">{minion.description}</p>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
                  {minion.isUnlocked ? (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" /> 연구 해금 완료
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        soundFx.playVictory();
                        onUnlockMinion(minion.id);
                      }}
                      disabled={!canAfford}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                        !canAfford
                          ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                          : 'bg-red-900 hover:bg-red-800 text-white border border-red-600/50'
                      }`}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>해금 ({Math.floor(minion.costGold * 1.5)}G / {Math.floor(minion.costMana * 1.5)}MP)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Traps Unlock Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          상위 트랩 기믹 해금 연구
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.availableTraps.map((trap) => {
            const canAfford = state.gold >= trap.costGold * 1.5 && state.mana >= trap.costMana * 1.5;

            return (
              <div
                key={trap.id}
                className={`bg-zinc-950 border rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-lg ${
                  trap.isUnlocked ? 'border-zinc-800' : 'border-amber-950 bg-amber-950/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-600/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-200">{trap.name}</h4>
                    <p className="text-[10px] text-zinc-400 mt-1">{trap.description}</p>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
                  {trap.isUnlocked ? (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" /> 연구 해금 완료
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        soundFx.playVictory();
                        onUnlockTrap(trap.id);
                      }}
                      disabled={!canAfford}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                        !canAfford
                          ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                          : 'bg-amber-900 hover:bg-amber-800 text-white border border-amber-600/50'
                      }`}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>해금 ({Math.floor(trap.costGold * 1.5)}G / {Math.floor(trap.costMana * 1.5)}MP)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
