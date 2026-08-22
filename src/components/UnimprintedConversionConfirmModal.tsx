import React from 'react';
import { Prisoner, VampireLord, CustomImageMap, CustomNameMap } from '../types';
import { soundFx } from '../utils/audio';
import { AlertTriangle, UserCheck, ShieldAlert, HeartCrack, X, Check, Lock } from 'lucide-react';

interface UnimprintedConversionConfirmModalProps {
  prisoner: Prisoner;
  lord: VampireLord;
  customImages: CustomImageMap;
  customNames: CustomNameMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UnimprintedConversionConfirmModal: React.FC<UnimprintedConversionConfirmModalProps> = ({
  prisoner,
  lord,
  customImages,
  customNames,
  onConfirm,
  onCancel,
}) => {
  const hero = prisoner.hero;
  const heroPower = hero.attack + hero.defense + hero.hp;
  const lordPower = lord.baseAttack + lord.baseDefense + lord.baseHp;
  const isHeroStronger = heroPower > lordPower;

  return (
    <div
      id="unimprinted-conversion-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="bg-gradient-to-br from-zinc-950 via-purple-950/40 to-zinc-950 border-2 border-amber-500/70 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
        {/* Close Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            onCancel();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Badge Header */}
        <div className="flex items-center gap-2">
          <span className="bg-amber-600/90 text-amber-100 text-xs font-bold px-3 py-1 rounded-full border border-amber-400/50 flex items-center gap-1.5 shadow-md">
            <AlertTriangle className="w-4 h-4 text-amber-200" />
            각인 미완료 하수인 강제 개조 경고
          </span>
        </div>

        {/* Hero & Lord Comparison Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-500/60 bg-zinc-950 flex-shrink-0">
            <img
              src={customImages[hero.id] || hero.imageUrl}
              alt={customNames?.[hero.id] || hero.name}
              className="w-full h-full object-cover animate-breath"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 truncate">
                {customNames?.[hero.id] || hero.name}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                {hero.rank}
              </span>
            </div>
            <p className="text-xs text-zinc-400">{hero.title}</p>
            <div className="text-[11px] text-purple-300">
              현재 흡혈 각인 진행도: <strong className="text-pink-400 font-mono">{prisoner.drainCount || 0} / 3회</strong>
            </div>
          </div>
        </div>

        {/* Vital Warning Notice Box */}
        <div className="bg-rose-950/40 border border-rose-600/50 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <HeartCrack className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-rose-300">
                각인 되지 않은 하수인은 영주의 침실로는 부를 수 없습니다.
              </h4>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                * 3회 흡혈 각인을 거치지 않고 강제로 개조하면 주인공에게 영구 HP를 빼앗기지 않은 채 하수인이 될 수 있습니다.
              </p>
            </div>
          </div>

          {/* Risk Level Notice */}
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
            isHeroStronger
              ? 'bg-red-950/70 border-red-500/60 text-red-200'
              : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
          }`}>
            {isHeroStronger ? (
              <>
                <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 animate-bounce" />
                <div>
                  <span className="font-bold text-red-400">[탈옥 위험 50%]</span> 수감된 포로의 종합 전투력({heroPower})이 주군({lordPower})보다 강력합니다! <strong>50% 확률로 탈옥하여 적으로 다시 출현</strong>할 수 있습니다.
                </div>
              </>
            ) : (
              <>
                <UserCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-emerald-300">[탈옥 위험 없음]</span> 주군의 전투력({lordPower})이 포로({heroPower})를 압도하여 탈옥 없이 안정적으로 복속됩니다.
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400 font-medium">
          위험과 제약을 감수하고 계속 개조를 시도하시겠습니까?
        </p>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              soundFx.playClick();
              onCancel();
            }}
            className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>취소하기</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              onConfirm();
            }}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-800 via-rose-800 to-amber-700 hover:from-purple-700 hover:to-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-950 border border-amber-500/50 transition-all"
          >
            <Check className="w-4 h-4 text-amber-300" />
            <span>계속 개조 시도</span>
          </button>
        </div>
      </div>
    </div>
  );
};
