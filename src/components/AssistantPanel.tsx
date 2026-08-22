import React, { useState } from 'react';
import { GameState } from '../types';
import { soundFx } from '../utils/audio';
import { MessageSquare, Sparkles, AlertCircle, Heart, ChevronRight } from 'lucide-react';

interface AssistantPanelProps {
  state: GameState;
  onNavigateTab?: (tab: string) => void;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ state, onNavigateTab }) => {
  const [showFullChat, setShowFullChat] = useState(false);

  // Generate dynamic contextual advice from Assistant Secretary Sebastian
  const getContextualAdvice = () => {
    if (state.prisoners.length > 0) {
      const blCount = state.prisoners.filter(p => p.hero.isBLHero).length;
      if (blCount > 0) {
        return `주군! 지하 감옥에 특별 수감된 용사가 존재합니다! 감옥 탭에서 특별 심문 이벤트나 혈액 수집, 몸값 요구를 결정해주십시오.`;
      }
      return `주군, 포획된 용사 ${state.prisoners.length}명이 감옥에서 대기 중입니다! 피를 흡수해 마력을 채우거나, 하수인으로 개조하시겠습니까?`;
    }

    if (state.wave % 5 === 0 && !state.isBattleActive) {
      if (state.lastExecutedRaidWave === state.wave) {
        return `주군! 이번 5번째 웨이브의 [흡정야행단] 출격(1/1회)을 무사히 완수하셨습니다. 성의 방어선을 점검하고 다음 방어전을 대비하십시오.`;
      }
      return `주군! 5번째 웨이브에 달했습니다. 마력을 습격하여 대량 수집할 수 있는 [흡정야행단]을 편성해 야행에 나설 준비가 되었습니다! (웨이브당 1회 한정)`;
    }

    const emptyMinionRooms = state.rooms.filter(r => r.placedMinions.length === 0).length;
    if (emptyMinionRooms > 0) {
      return `주군, 방어선에 하수인이 한 명도 배치되지 않은 구역이 ${emptyMinionRooms}곳 있습니다! 모험가들이 몰려오기 전에 몬스터를 배치하세요.`;
    }

    if (state.mana > 500 && state.lord.level < 5) {
      return `마력이 넉넉하게 모였습니다! 상점 탭에서 마력을 연구하여 주군의 능력치를 높이거나 상위 하수인을 해금하시기를 추천합니다.`;
    }

    return state.assistant.dialogue;
  };

  const adviceText = getContextualAdvice();

  return (
    <div id="assistant-panel" className="bg-gradient-to-r from-zinc-950 via-purple-950/20 to-zinc-950 border border-purple-900/30 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Assistant Avatar & Info */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-purple-500/50 shadow-md shadow-purple-950 bg-zinc-900 flex-shrink-0">
              <img
                src={state.customImages['assistant'] || state.assistant.imageUrl}
                alt={state.customNames?.['assistant'] || state.assistant.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105 animate-breath"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 text-[10px] bg-purple-950 text-purple-200 border border-purple-500/50 px-1.5 py-0.5 rounded-full font-bold">
              재상
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-purple-200">{state.customNames?.['assistant'] || state.assistant.name}</h3>
              <span className="text-xs text-purple-200 bg-purple-900/90 px-2 py-0.5 rounded-md border border-purple-500/50 font-extrabold shadow">
                종족: {state.assistant.race || '팬텀'}
              </span>
              <span className="text-xs text-purple-400/80 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-800/40">
                {state.assistant.relationship}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>실시간 던전 재상 보고서</span>
            </p>
          </div>
        </div>

        {/* Dynamic Advice Bubble */}
        <div className="flex-1 bg-zinc-900/90 border border-purple-900/40 rounded-xl p-3 text-xs md:text-sm text-zinc-200 shadow-inner flex items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5 animate-bounce" />
            <p className="leading-relaxed font-medium">{adviceText}</p>
          </div>

          {/* Quick Action Link based on context */}
          {state.prisoners.length > 0 && onNavigateTab && (
            <button
              onClick={() => {
                soundFx.playClick();
                onNavigateTab('prison');
              }}
              className="px-3 py-1.5 rounded-lg bg-red-900 hover:bg-red-800 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-red-950 whitespace-nowrap"
            >
              감옥으로 이동 <ChevronRight className="w-3 h-3" />
            </button>
          )}

          {state.wave % 5 === 0 && state.lastExecutedRaidWave !== state.wave && state.prisoners.length === 0 && onNavigateTab && (
            <button
              onClick={() => {
                soundFx.playClick();
                onNavigateTab('raid');
              }}
              className="px-3 py-1.5 rounded-lg bg-purple-900 hover:bg-purple-800 text-purple-100 font-bold text-xs flex items-center gap-1 shadow-md shadow-purple-950 whitespace-nowrap animate-pulse"
            >
              흡정야행 준비 <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
