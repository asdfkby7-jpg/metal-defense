import React, { useState } from 'react';
import { GameState, Prisoner, BLEventChoice } from '../types';
import { initialBLEvents } from '../data/defaultData';
import { soundFx } from '../utils/audio';
import { Sparkles, Heart, MessageSquare, X, Check, Crown, Droplet, Coins, UserCheck, LogOut, ArrowLeft } from 'lucide-react';

interface BLEventModalProps {
  state: GameState;
  prisoner: Prisoner;
  onClose: () => void;
  onChoiceSelected: (
    prisonerInstanceId: string,
    choice: BLEventChoice
  ) => void;
}

export const BLEventModal: React.FC<BLEventModalProps> = ({
  state,
  prisoner,
  onClose,
  onChoiceSelected,
}) => {
  const eventData =
    initialBLEvents.find((e) => e.heroId === prisoner.hero.id) || initialBLEvents[0];

  const [selectedChoice, setSelectedChoice] = useState<BLEventChoice | null>(null);

  const hero = prisoner.hero;
  const isRookie = hero.id === 'h_rookie' || hero.name.includes('루키') || hero.name.includes('카일');
  const ransomValue = isRookie ? 0 : hero.goldReward * 2 + prisoner.capturedAtWave * 100;

  const handleConfirmChoice = (choice: BLEventChoice) => {
    soundFx.playVictory();
    onChoiceSelected(prisoner.instanceId, choice);
    onClose();
  };

  return (
    <div id="bl-event-modal" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-zinc-950 via-purple-950/50 to-zinc-950 border-2 border-pink-500/60 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
        {/* Close Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Header */}
        <div className="flex items-center gap-2">
          <span className="bg-pink-600 text-white text-xs font-bold px-2.5 py-1 rounded-full border border-pink-400/50 flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 fill-white" /> 특별 선택지 심문 이벤트
          </span>
          <span className="text-xs text-zinc-400">주군의 포로 심문</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100">{eventData.title}</h2>

        {/* Hero Portrait & Narrative Dialogue */}
        <div className="bg-zinc-900/90 border border-pink-900/50 rounded-2xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-inner">
          <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-pink-500/80 bg-zinc-950 flex-shrink-0 shadow-lg shadow-pink-950">
            <img
              src={state.customImages[prisoner.hero.id] || prisoner.hero.imageUrl}
              alt={state.customNames?.[prisoner.hero.id] || prisoner.hero.name}
              className="w-full h-full object-cover animate-breath"
            />
          </div>

          <div className="space-y-3 text-center sm:text-left flex-1">
            <div>
              <h3 className="text-base font-bold text-pink-200">{state.customNames?.[prisoner.hero.id] || prisoner.hero.name}</h3>
              <p className="text-xs text-pink-400/80 font-medium">{prisoner.hero.title}</p>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed italic">{eventData.description}</p>

            <div className="bg-purple-950/60 border border-purple-800/40 rounded-xl p-3 text-xs text-pink-200 font-medium leading-relaxed">
              {eventData.dialogue}
            </div>
          </div>
        </div>

        {/* Assistant Phantom Reaction Comment */}
        <div className="bg-zinc-900/60 border border-purple-900/40 rounded-xl p-3 flex items-center gap-3 text-xs text-purple-300">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-purple-500/50 flex-shrink-0">
            <img
              src={state.customImages['assistant'] || state.assistant.imageUrl}
              alt={state.customNames?.['assistant'] || state.assistant.name}
              className="w-full h-full object-cover animate-breath"
            />
          </div>
          <p className="italic">
            {state.customNames?.['assistant'] || state.assistant.name}: "주군, 수감된 용사가 지독하게 도도하군요. 어떤 방식으로 지배하시겠습니까?"
          </p>
        </div>

        {/* Choices List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">주군의 대응 선택지 (하나를 선택하십시오)</h4>

          <div className="space-y-2">
            {eventData.choices.map((choice, idx) => {
              const isDrain = choice.rewardType === 'DrainBlood';
              const isAffinity = choice.rewardType === 'Affinity';
              const isGold = choice.rewardType === 'Gold';
              const isConvert = choice.rewardType === 'ConvertMinion';

              const isDrainedThisWave = isDrain && prisoner.lastDrainedWave === state.wave;
              const isInterrogatedThisWave = isAffinity && prisoner.lastInterrogatedWave === state.wave;
              const isDisabled = isDrainedThisWave || isInterrogatedThisWave;

              let dynamicEffect = choice.effectText;
              if (isGold) {
                dynamicEffect = isRookie
                  ? '루키 모험가는 무명이라 몸값이 없습니다. (0 Gold)'
                  : `포로 일반 몸값 교환 공식에 따른 즉시 지급: +${ransomValue} Gold`;
              } else if (isAffinity) {
                dynamicEffect = `귓속말로 호감도를 높입니다. (마력 증가 없음 / 웨이브당 1회 / 현재 진행: ${prisoner.interrogationCount || 0}/3회 - 3회 누적 시 용사 HP 100% 보존 상태로 각인 및 침실 초대 해금)${
                  isInterrogatedThisWave ? ' [⚠️ 이번 웨이브 완료 - 다음 웨이브에 가능]' : ''
                }`;
              } else if (isDrain) {
                dynamicEffect = `${choice.effectText} (현재 누적: ${prisoner.drainCount || 0}/3회)${
                  isDrainedThisWave ? ' [⚠️ 이번 웨이브 완료 - 다음 웨이브에 가능]' : ''
                }`;
              }

              return (
                <button
                  key={`choice_${idx}`}
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    soundFx.playClick();
                    handleConfirmChoice(choice);
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between gap-4 group shadow-md ${
                    isDisabled
                      ? 'bg-zinc-900/60 border border-zinc-800 text-zinc-600 opacity-60 cursor-not-allowed'
                      : isDrain
                      ? 'bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/70 hover:border-rose-500'
                      : isAffinity
                      ? 'bg-pink-950/40 hover:bg-pink-900/60 border border-pink-700/70 hover:border-pink-400'
                      : isConvert
                      ? 'bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/70 hover:border-purple-500'
                      : isGold
                      ? 'bg-amber-950/30 hover:bg-amber-900/50 border border-amber-800/60 hover:border-amber-500'
                      : 'bg-zinc-900/90 hover:bg-pink-950/60 border border-zinc-800 hover:border-pink-500/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className={`text-sm font-bold flex items-center gap-2 ${
                      isDisabled ? 'text-zinc-500' : 'text-zinc-100 group-hover:text-pink-200'
                    }`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isDisabled
                          ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          : isDrain
                          ? 'bg-rose-900 text-rose-200 border border-rose-600'
                          : isAffinity
                          ? 'bg-pink-900 text-pink-200 border border-pink-500'
                          : isConvert
                          ? 'bg-purple-900 text-purple-200 border border-purple-600'
                          : isGold
                          ? 'bg-amber-900 text-amber-200 border border-amber-600'
                          : 'bg-pink-950 text-pink-300 border border-pink-700/50'
                      }`}>
                        {idx + 1}
                      </span>
                      <span>{choice.text}</span>
                    </div>
                    <div className={`text-xs font-semibold pl-8 ${
                      isDisabled
                        ? 'text-zinc-500 italic'
                        : isDrain
                        ? 'text-rose-400'
                        : isAffinity
                        ? 'text-pink-300 font-bold'
                        : isConvert
                        ? 'text-purple-300'
                        : isGold
                        ? 'text-amber-300 font-bold'
                        : 'text-emerald-400'
                    }`}>
                      {dynamicEffect}
                    </div>
                  </div>

                  <div className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    isDisabled
                      ? 'bg-zinc-900 text-zinc-700'
                      : 'bg-zinc-900/80 text-pink-300 group-hover:bg-pink-600 group-hover:text-white'
                  }`}>
                    {isDrain && <Droplet className={`w-4 h-4 ${isDisabled ? 'text-zinc-700' : 'text-rose-400 group-hover:text-white fill-rose-500/50'}`} />}
                    {isAffinity && <MessageSquare className={`w-4 h-4 ${isDisabled ? 'text-zinc-700' : 'text-pink-300 group-hover:text-white'}`} />}
                    {isGold && <Coins className={`w-4 h-4 ${isDisabled ? 'text-zinc-700' : 'text-amber-400 group-hover:text-white'}`} />}
                    {isConvert && <UserCheck className={`w-4 h-4 ${isDisabled ? 'text-zinc-700' : 'text-purple-300 group-hover:text-white'}`} />}
                    {!isDrain && !isAffinity && !isGold && !isConvert && <Sparkles className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}

            {/* 오늘은 그냥 돌아간다 선택지 (아무것도 선택하지 않고 감옥으로 복귀) */}
            <button
              id="btn-bl-event-return"
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="w-full text-left p-4 rounded-xl transition-all flex items-center justify-between gap-4 group shadow-md bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 mt-3"
            >
              <div className="space-y-1">
                <div className="text-sm font-bold flex items-center gap-2 text-zinc-300 group-hover:text-zinc-100">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-zinc-800 text-zinc-400 border border-zinc-600 group-hover:bg-zinc-700 group-hover:text-zinc-200">
                    ↩
                  </span>
                  <span>오늘은 그냥 돌아간다</span>
                </div>
                <div className="text-xs font-semibold pl-8 text-zinc-400 group-hover:text-zinc-300">
                  아무런 조치도 취하지 않고 포로의 감방을 나섭니다. (포로 상태 유지 / 기회 소모 없음)
                </div>
              </div>

              <div className="p-2 rounded-lg transition-colors flex-shrink-0 bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200">
                <LogOut className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
