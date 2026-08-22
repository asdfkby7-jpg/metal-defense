import React, { useState } from 'react';
import { GameState, DungeonRoom, Minion, Trap, PlacedMinion } from '../types';
import { soundFx } from '../utils/audio';
import { CastleMapView } from './CastleMapView';
import {
  Shield,
  Plus,
  Trash2,
  Crown,
  Skull,
  Zap,
  Swords,
  ChevronRight,
  Info,
  TriangleAlert,
  Droplet,
  Lock,
} from 'lucide-react';

interface DungeonMapViewProps {
  state: GameState;
  onDeployMinion: (roomId: string, minionId: string) => void;
  onRemoveMinion: (roomId: string, instanceId: string) => void;
  onMovePlacedMinion?: (fromRoomId: string, instanceId: string, toRoomId: string) => void;
  onDeployTrap: (roomId: string, trapId: string) => void;
  onRemoveTrap: (roomId: string, trapIndex: number) => void;
  onMoveLord: (roomId: string) => void;
  onStartWave: () => void;
  onNavigateTab: (tab: string) => void;
  onAddGold?: (amount: number) => void;
  onAddMana?: (amount: number) => void;
  onOpenHumanityModal?: () => void;
}

export const DungeonMapView: React.FC<DungeonMapViewProps> = ({
  state,
  onDeployMinion,
  onRemoveMinion,
  onMovePlacedMinion,
  onDeployTrap,
  onRemoveTrap,
  onMoveLord,
  onStartWave,
  onNavigateTab,
  onAddGold,
  onAddMana,
  onOpenHumanityModal,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('r_entrance');
  const [activeTab, setActiveTab] = useState<'minions' | 'traps'>('minions');

  const activeRoom = state.rooms.find((r) => r.id === selectedRoomId) || state.rooms[0];

  const imprintedCount =
    (state.imprintedHeroIds?.length || 0) +
    (state.inheritedHeroIds?.length || 0);
  const deployedImprintedHeroCount = state.rooms.reduce(
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
  const canRestoreHumanity = imprintedCount >= 6 && deployedImprintedHeroCount >= 6;

  return (
    <div id="dungeon-map-view" className="space-y-6">
      {/* Overview Banner & Start Wave Button */}
      <div className="bg-gradient-to-r from-zinc-900 via-red-950/40 to-zinc-900 border border-red-900/40 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-900/80 text-red-200 border border-red-500/40">
              Wave {state.wave} 준비 단계
            </span>
            <span className="text-xs text-zinc-400">
              (총 {state.rooms.reduce((acc, r) => acc + r.placedMinions.length, 0)}명의 하수인 배치됨)
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            거대 흡혈귀 성 던전 방어선 구축
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            각 구역에 몬스터와 함정을 배치하고, 주군 {state.customNames?.['lord'] || state.lord.name}의 배치를 결정하세요.
          </p>
        </div>

        <button
          id="btn-start-wave"
          onClick={() => {
            soundFx.playVictory();
            onStartWave();
          }}
          className="w-full md:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-red-700 via-rose-800 to-red-900 hover:from-red-600 hover:to-rose-700 text-white font-extrabold text-base shadow-lg shadow-red-950 border border-red-500/50 flex items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95"
        >
          <Swords className="w-6 h-6 text-amber-300 animate-pulse" />
          <span>침입자 용사단 방어 시작! (Wave {state.wave})</span>
          <ChevronRight className="w-5 h-5 text-red-200" />
        </button>
      </div>

      {/* Humanity Restoration Ready Banner */}
      {canRestoreHumanity && (
        <div className="bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-rose-950/80 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/30 border border-amber-400 flex items-center justify-center text-amber-300 flex-shrink-0">
              ✨
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-amber-200">
                [기적] 각인 용사 6인 방어 배치 달성 ➔ 주군의 인간성 회복 가능!
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5">
                평면도 MP 마력 대성소 아래의 <strong className="text-amber-100">[✨ 인간성 회복]</strong> 칸을 눌러 인간으로의 복귀 및 인간계 차원 이동을 선택할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playVictory();
              if (onOpenHumanityModal) onOpenHumanityModal();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-400 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black text-xs sm:text-sm shadow-xl border border-amber-200 flex items-center gap-2 whitespace-nowrap transition-transform hover:scale-105 active:scale-95"
          >
            <span>인간성 회복 선택</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Visual Castle Blueprint Map */}
      <CastleMapView
        state={state}
        selectedRoomId={selectedRoomId}
        onSelectRoom={(roomId) => {
          soundFx.playClick();
          setSelectedRoomId(roomId);
        }}
        onStartWave={onStartWave}
        onAddGold={onAddGold}
        onAddMana={onAddMana}
        onMovePlacedMinion={onMovePlacedMinion}
        onMoveLord={onMoveLord}
        onOpenHumanityModal={onOpenHumanityModal}
      />

      {/* Selected Room Direct Placement Workspace (Selected directly on Castle Map) */}
      <div className="bg-zinc-950 border-2 border-red-900/40 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Room Header & Lord Placement Control */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold bg-red-950 text-red-300 border border-red-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                🎯 평면도 선택 구역
              </span>
              <h3 className="text-lg font-bold text-zinc-100">{activeRoom.name}</h3>
              {activeRoom.hasLord ? (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-400" /> 주군 {state.customNames?.['lord'] || state.lord.name} 주둔 중
                </span>
              ) : (
                <button
                  id="btn-move-lord"
                  onClick={() => {
                    soundFx.playClick();
                    onMoveLord(activeRoom.id);
                  }}
                  className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-amber-950 border border-zinc-700 hover:border-amber-600 text-zinc-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  주군을 이 구역으로 이동 배치
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">{activeRoom.description}</p>
          </div>

          {/* Room Capacity Stats */}
          {(() => {
            const isEntrance = activeRoom.id === 'r_entrance';
            const maxOccupants = isEntrance ? 2 : 1;
            const currentOccupants = activeRoom.placedMinions.length + (activeRoom.hasLord ? 1 : 0);
            return (
              <div className="flex items-center gap-4 bg-zinc-900/80 px-4 py-2 rounded-xl border border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-400">배치 인원(주군 포함): </span>
                  <span className={`font-bold ${currentOccupants >= maxOccupants ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {currentOccupants} / {maxOccupants}
                  </span>
                  <span className="text-[10px] text-zinc-500 ml-1">
                    {isEntrance ? '(입구방: 상부 1명 + 하부 1명)' : '(일반방: 총 1명)'}
                  </span>
                </div>
                <div className="w-px h-4 bg-zinc-800" />
                <div>
                  <span className="text-zinc-400">함정 슬롯: </span>
                  <span className="font-bold text-amber-400">
                    {activeRoom.placedTraps.length} / {activeRoom.maxTraps}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Currently Deployed Units in Selected Room */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
            <Skull className="w-4 h-4 text-red-400" />
            배치된 수호 하수인 & 함정 목록
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Lord Slot Card if stationed here */}
            {activeRoom.hasLord && (
              <div className="bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/50 rounded-xl p-3 flex items-center gap-3 relative shadow-lg">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-amber-400 bg-zinc-950 flex-shrink-0">
                  <img
                    src={state.customImages['lord'] || state.lord.imageUrl}
                    alt={state.customNames?.['lord'] || state.lord.name}
                    className="w-full h-full object-cover animate-breath"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-300 truncate">{state.customNames?.['lord'] || state.lord.name}</span>
                    <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    <span className="text-red-400 font-bold">ATK {state.lord.baseAttack + Math.floor(Math.sqrt(state.mana)*3)}</span> •{' '}
                    <span className="text-blue-400 font-bold">DEF {state.lord.baseDefense + Math.floor(Math.sqrt(state.mana)*1.5)}</span>
                  </div>
                  <span className="text-[10px] text-amber-400/80 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800/40 inline-block mt-1">
                    최종 수비자 (마력 비례 대폭 강화)
                  </span>
                </div>
              </div>
            )}

            {/* Placed Minions */}
            {activeRoom.placedMinions.map((minion) => (
              <div
                key={minion.instanceId}
                className="bg-zinc-900/90 border border-red-900/40 rounded-xl p-3 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-red-500/40 bg-zinc-950 flex-shrink-0 relative">
                    <img
                      src={state.customImages[minion.id] || minion.imageUrl}
                      alt={state.customNames?.[minion.id] || minion.name}
                      className="w-full h-full object-cover animate-breath"
                    />
                    <div className="absolute bottom-0 left-0 bg-purple-950/90 border border-purple-400 text-purple-200 text-[8px] font-black px-1 rounded-tr">
                      Lv.{minion.level || 1 + Math.floor((minion.bonusMaxHp || 0) / 6)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      <span>{state.customNames?.[minion.id] || minion.name}</span>
                      <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800/40 px-1.5 rounded font-black">
                        Lv.{minion.level || 1 + Math.floor((minion.bonusMaxHp || 0) / 6)}
                      </span>
                      <span className="text-[9px] bg-red-950 text-red-300 border border-red-800/40 px-1.5 rounded">
                        T{minion.tier} {minion.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
                      <span>공격 {minion.attack}</span>
                      <span>•</span>
                      <span>방어 {minion.defense}</span>
                      <span>•</span>
                      <span className="text-emerald-400">HP {minion.hp}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundFx.playClick();
                    onRemoveMinion(activeRoom.id, minion.instanceId);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-300 border border-zinc-700 hover:border-red-800 transition-colors"
                  title="하수인 회수"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Placed Traps */}
            {activeRoom.placedTraps.map((trap, tIdx) => (
              <div
                key={`trap_card_${tIdx}`}
                className="bg-zinc-900/90 border border-amber-900/40 rounded-xl p-3 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-300">{trap.name}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      데미지 <span className="text-amber-400 font-bold">{trap.damage}</span> ({trap.effectType})
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    soundFx.playClick();
                    onRemoveTrap(activeRoom.id, tIdx);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-300 border border-zinc-700 hover:border-red-800 transition-colors"
                  title="함정 철거"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Selection to Deploy New Minions / Traps */}
        <div className="border-t border-zinc-800 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundFx.playClick();
                  setActiveTab('minions');
                }}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  activeTab === 'minions'
                    ? 'bg-red-900/80 text-white border border-red-500/50 shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <Skull className="w-4 h-4" /> 하수인 배치 가능 목록 ({state.inventoryMinions.length})
              </button>

              <button
                onClick={() => {
                  soundFx.playClick();
                  setActiveTab('traps');
                }}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  activeTab === 'traps'
                    ? 'bg-amber-900/80 text-white border border-amber-500/50 shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <Zap className="w-4 h-4" /> 함정 건설 가능 목록 ({state.availableTraps.filter((t) => t.isUnlocked).length})
              </button>
            </div>

            <button
              onClick={() => {
                soundFx.playClick();
                onNavigateTab('shop');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 hover:underline"
            >
              상점에서 더 강력한 몬스터/함정 해금하기 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Minion Deployment List */}
          {activeTab === 'minions' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {state.inventoryMinions.map((minion) => {
                const maxRoomOccupants = activeRoom.id === 'r_entrance' ? 2 : 1;
                const currentRoomOccupants = activeRoom.placedMinions.length + (activeRoom.hasLord ? 1 : 0);
                const isRoomFull = currentRoomOccupants >= maxRoomOccupants;
                const isConvertedAdventurer =
                  minion.isCustomHeroMinion ||
                  minion.id.startsWith('minion_converted_') ||
                  minion.costGold === 0;

                const totalStock = minion.stock ?? 1;
                const placedCount = state.rooms.reduce((acc, r) => {
                  return (
                    acc +
                    r.placedMinions.filter(
                      (pm) =>
                        pm.id === minion.id ||
                        (pm.originalHeroId && pm.originalHeroId === minion.originalHeroId) ||
                        pm.name === minion.name
                    ).length
                  );
                }, 0);
                const availableStock = totalStock - placedCount;
                const isStockOut = isConvertedAdventurer && availableStock <= 0;

                const canAfford = isConvertedAdventurer
                  ? state.mana >= minion.costMana
                  : (state.gold >= minion.costGold && state.mana >= minion.costMana);

                return (
                  <div
                    key={minion.id}
                    className={`bg-zinc-900/60 border rounded-xl p-3 flex flex-col justify-between gap-3 transition-colors ${
                      isConvertedAdventurer
                        ? 'border-purple-800/60 hover:border-purple-600'
                        : 'border-zinc-800 hover:border-red-900/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 flex-shrink-0 relative">
                        <img
                          src={state.customImages[minion.id] || minion.imageUrl}
                          alt={state.customNames?.[minion.id] || minion.name}
                          className="w-full h-full object-cover animate-breath"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className="text-xs font-bold text-zinc-200">{state.customNames?.[minion.id] || minion.name}</h5>
                          {isConvertedAdventurer && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${
                              isStockOut
                                ? 'bg-red-950/90 text-red-300 border-red-700/80'
                                : 'bg-purple-950 text-purple-200 border-purple-700/60'
                            }`}>
                              보유 {totalStock} (가능 {Math.max(0, availableStock)})
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{minion.description}</p>
                        <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-2">
                          <span>공격 {minion.attack}</span>
                          <span>•</span>
                          <span>체력 {minion.hp}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px]">
                      <div className="flex items-center gap-2 font-mono">
                        {isConvertedAdventurer ? (
                          <span className="text-purple-300 font-extrabold text-[10px]">0G (적자 배치 가능)</span>
                        ) : (
                          <span className={state.gold < minion.costGold ? "text-red-400 font-bold" : "text-amber-400"}>{minion.costGold}G</span>
                        )}
                        <span className="text-red-400">{minion.costMana}MP</span>
                      </div>

                      <button
                        onClick={() => {
                          soundFx.playClick();
                          onDeployMinion(activeRoom.id, minion.id);
                        }}
                        disabled={isRoomFull || !canAfford || isStockOut}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          isRoomFull || !canAfford || isStockOut
                            ? 'bg-zinc-800 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                            : 'bg-red-900 hover:bg-red-800 text-white border border-red-600/50 shadow-md'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isRoomFull ? '슬롯 가득참' : isStockOut ? '수량 소진 (0)' : '배치'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trap Construction List */}
          {activeTab === 'traps' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {state.availableTraps
                .filter((t) => t.isUnlocked)
                .map((trap) => {
                  const isRoomFull = activeRoom.placedTraps.length >= activeRoom.maxTraps;
                  const canAfford = state.gold >= trap.costGold && state.mana >= trap.costMana;

                  return (
                    <div
                      key={trap.id}
                      className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between gap-3 hover:border-amber-900/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-950/40 border border-amber-600/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-amber-200">{trap.name}</h5>
                          <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{trap.description}</p>
                          <div className="text-[10px] text-amber-400 mt-1 font-semibold">
                            피해량 {trap.damage} ({trap.effectType})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px]">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-amber-400">{trap.costGold}G</span>
                          <span className="text-red-400">{trap.costMana}MP</span>
                        </div>

                        <button
                          onClick={() => {
                            soundFx.playClick();
                            onDeployTrap(activeRoom.id, trap.id);
                          }}
                          disabled={isRoomFull || !canAfford}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            isRoomFull || !canAfford
                              ? 'bg-zinc-800 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                              : 'bg-amber-900 hover:bg-amber-800 text-white border border-amber-600/50 shadow-md'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isRoomFull ? '슬롯 가득참' : '설치'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
