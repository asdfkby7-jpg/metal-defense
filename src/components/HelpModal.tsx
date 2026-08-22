import React from 'react';
import { soundFx } from '../utils/audio';
import { X, Shield, Droplet, Coins, Crown, Heart, Moon, Image as ImageIcon } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div id="help-modal" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-zinc-950 border-2 border-red-900/60 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-red-200 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            흡혈귀 성 던전 경영 가이드 & 루프 지침서
          </h2>
          <p className="text-xs text-zinc-400">
            둥지짓는 드래곤 스타일의 거대 흡혈귀 성 방어전 매뉴얼
          </p>
        </div>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Section 1 */}
          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-2">
            <h3 className="font-bold text-amber-300 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" /> 자원 시스템 (골드 & 마력)
            </h3>
            <p className="text-zinc-300 leading-relaxed">
              • <strong>골드 (Gold):</strong> 용사단을 격퇴하거나 귀족 포로의 몸값을 요구하여 획득. 던전 방어선 구축, 트랩 및 하수인 배치에 사용됩니다.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              • <strong>마력 (Mana):</strong> 포획한 용사의 피를 채취하거나 야행을 통해 수집. 마력이 높아질수록 주군의 공격력과 방어력이 획기적으로 증가합니다!
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-2">
            <h3 className="font-bold text-purple-300 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-red-400" /> 용사 포획 & 감옥 관리
            </h3>
            <p className="text-zinc-300 leading-relaxed">
              • 포획용 트랩이나 거미 하수인을 설치하면 체력이 낮아진 침입자를 <strong>포획</strong>할 수 있습니다.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              • 감옥에 수감된 용사는 <strong>피 채취 (마력 수집)</strong>, <strong>몸값 요구 (골드 획득)</strong>, <strong>하수인 개조</strong> 중 원하는 조치를 취할 수 있습니다.
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-2">
            <h3 className="font-bold text-pink-300 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" /> 특수 용사 포로 심문 & 선택지 이벤트
            </h3>
            <p className="text-zinc-300 leading-relaxed">
              • 높은 난이도 웨이브에서는 <strong>도도한 하이엘프 왕자나 제국 성기사단장</strong>이 침입합니다.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              • 이들을 포획하면 관능적이고 흥미진진한 <strong>선택지 이벤트</strong>가 발생하여 호감도, 특수 마력, 직속 개조 하수인 등의 대형 보상을 얻을 수 있습니다.
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 space-y-2">
            <h3 className="font-bold text-indigo-300 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" /> 5번째 웨이브: 흡정야행단
            </h3>
            <p className="text-zinc-300 leading-relaxed">
              • 5번의 웨이브 방어를 성공해낼 때마다 거꾸로 인간 마을이나 성기사 수련원을 급습하는 <strong>흡정야행 (Night Raid)</strong> 페이즈가 열립니다.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              • <strong>1회 실행 제한</strong>: 마력(MP)이 충분하더라도 흡정야행은 해당 5번째 웨이브상에서 <strong>최대 1회까지만</strong> 단행할 수 있습니다. 전력이 부족하다면 야행을 스킵하고 다음 방어전을 준비할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Section 5 Custom Character Guide */}
        <div className="bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-950 p-4 rounded-2xl border border-purple-900/40 text-xs space-y-1">
          <h3 className="font-bold text-purple-300 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-purple-400" /> 커스텀 캐릭터 이름 & 이미지 (JPG, PNG, GIF, WEBP)
          </h3>
          <p className="text-zinc-300 leading-relaxed">
            [커스텀 화랑] 탭에서 주군, 재상 겸 비서 세바스챤, 하수인 몬스터, 함정, 용사단의 이름을 직접 변경하고 본인이 소장한 JPG, PNG, GIF(움짤), WEBP 이미지 파일로 외형을 자유롭게 자유 커스터마이징할 수 있습니다. 모든 캐릭터는 생동감 넘치는 숨쉬는 모션 연출이 적용됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};
