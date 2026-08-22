import React from 'react';
import { GameState } from '../types';
import { soundFx } from '../utils/audio';
import {
  Droplet,
  Coins,
  ShieldAlert,
  Moon,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Skull,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  state: GameState;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onResetGame: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onOpenSettings,
  onOpenHelp,
  onResetGame,
  onToggleMute,
  isMuted,
}) => {
  // Lord's total attack and defense scaled by Mana!
  const manaBonus = Math.floor(Math.sqrt(state.mana) * 3);
  const totalLordAtk = state.lord.baseAttack + manaBonus;
  const totalLordDef = state.lord.baseDefense + Math.floor(manaBonus * 0.5);

  return (
    <header id="app-header" className="bg-zinc-950/95 border-b border-red-900/40 text-zinc-100 sticky top-0 z-30 backdrop-blur-md shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 via-rose-900 to-zinc-950 flex items-center justify-center border border-red-500/50 shadow-lg shadow-red-900/30">
              <Skull className="w-6 h-6 text-red-200 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-red-400 via-rose-200 to-amber-200 bg-clip-text text-transparent tracking-wide">
                네버엔딩 메탈 디펜스
              </h1>
              <p className="text-xs text-zinc-400 flex items-center gap-2">
                <span>{state.customNames?.['lord'] || state.lord.name}</span>
                <span className="text-red-500">•</span>
                <span className="text-amber-400">Lv.{state.lord.level}</span>
              </p>
            </div>
          </div>

          {/* Resources Bar */}
          <div className="flex flex-wrap items-center gap-3 md:gap-6 bg-zinc-900/90 px-4 py-2 rounded-xl border border-zinc-800">
            {/* Gold */}
            <div className="flex items-center gap-2" title="골드: 던전 건설, 트랩 제작, 하수인 고용에 사용">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">골드 (Gold)</div>
                <div className="text-sm font-extrabold text-amber-300 font-mono">
                  {state.gold.toLocaleString()} <span className="text-xs font-normal text-amber-500">G</span>
                </div>
              </div>
            </div>

            <div className="w-px h-8 bg-zinc-800 hidden sm:block" />

            {/* Mana */}
            <div className="flex items-center gap-2" title="마력: 피를 흡수하여 수집. 주군의 공격력/방어력을 획기적으로 상승시킴!">
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <Droplet className="w-4 h-4 fill-red-500/30 text-red-400" />
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  마력 (Mana)
                  <span className="text-[9px] text-red-400 bg-red-950 px-1 rounded border border-red-800/50">
                    +ATK {manaBonus}
                  </span>
                </div>
                <div className="text-sm font-extrabold text-red-400 font-mono">
                  {state.mana.toLocaleString()} <span className="text-xs font-normal text-red-500">MP</span>
                </div>
              </div>
            </div>

            <div className="w-px h-8 bg-zinc-800 hidden sm:block" />

            {/* Wave / Night Raid Status */}
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${state.wave % 5 === 0 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {state.wave % 5 === 0 ? <Moon className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider">진행 상태</div>
                <div className="text-sm font-bold text-zinc-200 flex items-center gap-1.5">
                  <span>Wave {state.wave}</span>
                  {state.wave % 5 === 0 && (
                    state.lastExecutedRaidWave === state.wave ? (
                      <span className="text-[10px] bg-zinc-800 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 흡정야행 완료 (1/1회)
                      </span>
                    ) : (
                      <span className="text-[10px] bg-purple-900/80 text-purple-200 px-1.5 py-0.5 rounded-md border border-purple-500/50 flex items-center gap-1 animate-bounce">
                        <Sparkles className="w-3 h-3 text-purple-300" /> 흡정야행 가능! (1회 한정)
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Lord Quick Combat Power */}
            <div className="hidden lg:flex items-center gap-2 bg-red-950/40 px-3 py-1 rounded-lg border border-red-900/30 text-xs">
              <span className="text-red-300 font-semibold">주군 전투력:</span>
              <span className="text-amber-300 font-mono">ATK {totalLordAtk}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-blue-300 font-mono">DEF {totalLordDef}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-sound"
              onClick={() => {
                onToggleMute();
                soundFx.playClick();
              }}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
              title={isMuted ? '음소거 해제' : '음소거'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              id="btn-open-help"
              onClick={() => {
                soundFx.playClick();
                onOpenHelp();
              }}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
              title="도움말 & 가이드"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
            </button>

            <button
              id="btn-reset-game"
              onClick={() => {
                soundFx.playClick();
                if (confirm('모든 데이터와 커스텀 이미지를 초기화하시겠습니까?')) {
                  onResetGame();
                }
              }}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 hover:border-red-800 text-zinc-400 hover:text-red-300 transition-colors"
              title="게임 초기화"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
