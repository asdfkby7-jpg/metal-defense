import React from 'react';
import { GameState, Prisoner } from '../types';
import { soundFx } from '../utils/audio';
import { Droplet, Heart, Sparkles, UserCheck, ShieldCheck, MessageSquare } from 'lucide-react';

interface ImprintEventModalProps {
  prisoner: Prisoner;
  state: GameState;
  onCompleteImprint: (prisoner: Prisoner) => void;
}

export const ImprintEventModal: React.FC<ImprintEventModalProps> = ({
  prisoner,
  state,
  onCompleteImprint,
}) => {
  const hero = prisoner.hero;
  const lord = state.lord;
  const lordName = state.customNames?.['lord'] || lord.name;
  const heroName = state.customNames?.[hero.id] || hero.name;
  const isWhisper = prisoner.imprintedVia === 'whisper';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className={`bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 ${
        isWhisper ? 'border-pink-500/80 shadow-pink-950/80' : 'border-red-600/80 shadow-red-950/80'
      } rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-zinc-100 relative overflow-hidden`}>
        {/* Glowing Background FX */}
        <div className={`absolute -top-24 -left-24 w-60 h-60 ${
          isWhisper ? 'bg-pink-600/20' : 'bg-red-600/20'
        } rounded-full blur-3xl pointer-events-none`} />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Title Header */}
        <div className="text-center space-y-1 relative z-10">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
            isWhisper ? 'bg-pink-950 border-pink-500/60 text-pink-300' : 'bg-red-950 border-red-500/60 text-red-300'
          } border text-xs font-extrabold tracking-wide uppercase`}>
            {isWhisper ? (
              <>
                <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                심문 귓속말 3회 호감도 달성 • 신뢰의 영혼 각인(Imprint) 발동!
              </>
            ) : (
              <>
                <Droplet className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                피의 3회 흡혈 달성 • 영혼의 각인(Imprint) 발동!
              </>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-300 to-purple-300">
            {isWhisper ? '포로의 마음을 사로잡은 교감 각인 의식' : '포로의 뒷목을 깨무는 혈계 각인 의식'}
          </h2>
        </div>

        {/* Visual Scene: Lord & Prisoner Duel of Souls */}
        <div className={`bg-zinc-900/90 border ${
          isWhisper ? 'border-pink-900/60' : 'border-red-900/60'
        } rounded-2xl p-5 relative z-10 flex flex-col items-center gap-4`}>
          <div className="flex items-center justify-center gap-6 w-full">
            {/* Lord Avatar */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-red-500 shadow-lg shadow-red-950 bg-zinc-950 relative">
                <img
                  src={state.customImages['lord'] || lord.imageUrl}
                  alt={lordName}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs font-bold text-red-300">{lordName}</span>
              <span className="text-[10px] text-zinc-400">지배하는 군주</span>
            </div>

            {/* Action FX Center */}
            <div className="flex flex-col items-center gap-1 text-center">
              <div className={`w-10 h-10 rounded-full ${
                isWhisper ? 'bg-pink-900/60 border-pink-500/60' : 'bg-red-900/60 border-red-500/60'
              } border flex items-center justify-center animate-pulse`}>
                {isWhisper ? (
                  <MessageSquare className="w-5 h-5 text-pink-400 animate-bounce" />
                ) : (
                  <Heart className="w-5 h-5 text-red-400 fill-red-500 animate-ping" />
                )}
              </div>
              <span className={`text-[11px] font-mono font-bold ${isWhisper ? 'text-pink-400' : 'text-red-400'}`}>
                {isWhisper ? '귓속말 교감' : '뒷목 흡혈'}
              </span>
              <span className="text-[9px] text-zinc-400">3/3 각인 성립</span>
            </div>

            {/* Hero Avatar */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-pink-500 shadow-lg shadow-pink-950 bg-zinc-950 relative">
                <img
                  src={state.customImages[hero.id] || hero.imageUrl}
                  alt={heroName}
                  className="w-full h-full object-cover animate-breath"
                />
              </div>
              <span className="text-xs font-bold text-pink-300">{heroName}</span>
              <span className="text-[10px] text-pink-400/80">{hero.title}</span>
            </div>
          </div>

          {/* Narrative Text */}
          <div className="bg-black/60 rounded-xl p-4 border border-zinc-800 text-xs sm:text-sm text-zinc-300 leading-relaxed text-center sm:text-left space-y-2">
            {isWhisper ? (
              <>
                <p>
                  <strong className="text-purple-400">{lordName}</strong>께서{' '}
                  <strong className="text-pink-300">{heroName}</strong>의 귓가에 나직하고 깊은 신뢰의 속삭임을 전했습니다.
                </p>
                <p className="text-zinc-400 italic">
                  피를 흘리지 않고도 주군의 마성과 다정함에 용사의 완고한 마음이 완전히 녹아내렸습니다. 용사의 생명력(HP)은 전혀 손상되지 않고 100% 온전하게 보존되었습니다.
                </p>
                <div className="p-2.5 rounded-lg bg-pink-950/60 border border-pink-800/40 text-pink-200 text-xs italic font-serif text-center">
                  “주군… 당신의 숨결이 귓가에 닿을 때마다 제 심장이 뜁니다… 피를 흘리지 않고도 저는 온전히 당신의 사람이 되겠습니다.”
                </div>
              </>
            ) : (
              <>
                <p>
                  <strong className="text-red-400">{lordName}</strong>께서 저항력을 잃은{' '}
                  <strong className="text-pink-300">{heroName}</strong>의 뒷목을 송곳니로 깊게 깨물었습니다.
                </p>
                <p className="text-zinc-400 italic">
                  주군의 짙은 칠흑 마력이 포로의 전신 혈관으로 흘러들어가며, 반항적이던 눈동자는 황홀경과 깊은 경외감에 물들었습니다.
                </p>
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/40 text-red-200 text-xs italic font-serif text-center">
                  “아아… 주군… 제 몸도, 영혼도… 이제 영원히 당신의 명령에 복종합니다…”
                </div>
              </>
            )}
          </div>
        </div>

        {/* Benefits & Unlocks */}
        <div className="bg-zinc-900/60 rounded-2xl p-4 border border-zinc-800 space-y-2 text-xs relative z-10">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <UserCheck className="w-4 h-4" />
            <span>아군 전향: [아군이 된 {heroName}] 하수인 인벤토리에 영구 편입!</span>
          </div>
          <div className="flex items-center gap-2 text-purple-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>자유 배치: 던전 방 방어선 및 흡정야행 3인 결사대에 출격 가능!</span>
          </div>
          {isWhisper ? (
            <div className="flex items-center gap-2 text-pink-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>용사 체력 100% 온전 보존 (흡혈로 인한 약화 없음 / 침실 소환 완전 해금)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>주군 최대 생명력 영구 증가 보너스 누적 완료! (침실 소환 완전 해금)</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            soundFx.playVictory();
            onCompleteImprint(prisoner);
          }}
          className={`w-full py-3.5 rounded-2xl bg-gradient-to-r ${
            isWhisper
              ? 'from-pink-600 via-rose-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 shadow-pink-950/80 border-pink-400/50'
              : 'from-red-600 via-rose-600 to-purple-700 hover:from-red-500 hover:to-purple-600 shadow-red-950/80 border-red-400/50'
          } text-white font-black text-sm shadow-xl border flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] relative z-10`}
        >
          <Heart className="w-4 h-4 fill-white" />
          <span>각인 완료 및 아군 하수인으로 편입하기</span>
        </button>
      </div>
    </div>
  );
};

