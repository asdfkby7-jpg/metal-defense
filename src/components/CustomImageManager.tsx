import React, { useState, useEffect } from 'react';
import { GameState } from '../types';
import { convertFileToBase64, saveCustomImage, saveCustomName, resetCustomImage, resetCustomName } from '../utils/storage';
import { soundFx } from '../utils/audio';
import {
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
  Edit3,
} from 'lucide-react';

interface CustomImageManagerProps {
  state: GameState;
  onUpdateCustomImage: (key: string, dataUrl: string) => void;
  onResetCustomImage: (key: string) => void;
  onUpdateCustomName: (key: string, name: string) => void;
  onResetCustomName: (key: string) => void;
}

export const CustomImageManager: React.FC<CustomImageManagerProps> = ({
  state,
  onUpdateCustomImage,
  onResetCustomImage,
  onUpdateCustomName,
  onResetCustomName,
}) => {
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('lord');
  const [nameInput, setNameInput] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'lord' | 'minions' | 'traps' | 'heroes'>('lord');

  const lordName = state?.lord?.name || '그리프 폰 발타자르';
  const lordImg = state?.lord?.imageUrl || '';
  const assistantName = state?.assistant?.name || '세바스챤';
  const assistantImg = state?.assistant?.imageUrl || '';
  const inventoryMinions = state?.inventoryMinions || [];
  const availableTraps = state?.availableTraps || [];
  const customNames = state?.customNames || {};
  const customImages = state?.customImages || {};

  // List of configurable entities across all categories
  const entityCategories = [
    {
      tab: 'lord',
      label: '주군 & 재상',
      items: [
        {
          key: 'lord',
          defaultName: lordName,
          title: '던전 군주',
          defaultImg: lordImg,
        },
        {
          key: 'assistant',
          defaultName: assistantName,
          title: '던전 재상 겸 비서',
          defaultImg: assistantImg,
        },
      ],
    },
    {
      tab: 'minions',
      label: '하수인 몬스터',
      items: inventoryMinions.map((m) => ({
        key: m.id,
        defaultName: m.name,
        title: `Tier ${m.tier} 하수인`,
        defaultImg: m.imageUrl,
      })),
    },
    {
      tab: 'traps',
      label: '던전 함정 기믹',
      items: availableTraps.map((t) => ({
        key: t.id,
        defaultName: t.name,
        title: `DPS ${t.dps} 함정`,
        defaultImg: t.imageUrl,
      })),
    },
    {
      tab: 'heroes',
      label: '침입 용사단 & 포로',
      items: [
        { key: 'h_rookie', defaultName: '루키 모험가 카일', title: 'Bronze 용사', defaultImg: '' },
        { key: 'h_paladin_apprentice', defaultName: '성기사단 단원 에단', title: 'Silver 용사', defaultImg: '' },
        { key: 'h_exp_ranger', defaultName: '일리아스 윈드러너', title: 'Silver 야행 용사 (달빛 명사수)', defaultImg: '' },
        { key: 'h_bl_prince', defaultName: '루시안 폰 에스테르', title: 'Gold 용사', defaultImg: '' },
        { key: 'h_exp_crusader', defaultName: '베르톨트 폰 크루제', title: 'Gold 야행 용사 (이단심문관)', defaultImg: '' },
        { key: 'h_bl_knight_commander', defaultName: '제프리 다벤포트', title: 'Platinum 용사', defaultImg: '' },
        { key: 'h_exp_templar', defaultName: '발렌타인 드 뤼미에르', title: 'Platinum 야행 용사 (성검사)', defaultImg: '' },
        { key: 'h_royal_archmage', defaultName: '왕실 대마법사 테오도르', title: 'Royal 용사', defaultImg: '' },
      ],
    },
  ];

  const currentCategory = entityCategories.find((c) => c.tab === activeTab) || entityCategories[0];
  const currentItem =
    currentCategory.items.find((i) => i.key === selectedEntityKey) ||
    currentCategory.items[0] || {
      key: 'lord',
      defaultName: lordName,
      title: '던전 군주',
      defaultImg: lordImg,
    };

  const currentDisplayName = customNames[currentItem.key] || currentItem.defaultName;
  const currentImage = customImages[currentItem.key] || currentItem.defaultImg || lordImg;

  // Synchronize name input when entity selection changes
  useEffect(() => {
    setNameInput(currentDisplayName);
    setPreviewUrl('');
  }, [selectedEntityKey, activeTab, currentDisplayName]);

  // File Upload Handler for JPG, PNG, GIF, WEBP
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await convertFileToBase64(file);
        setPreviewUrl(base64);
      } catch (err) {
        alert('이미지 파일 변환에 실패했습니다.');
      }
    }
  };

  const handleApplyChanges = () => {
    soundFx.playClick();

    // Update image if a new file was uploaded
    if (previewUrl) {
      onUpdateCustomImage(currentItem.key, previewUrl);
      saveCustomImage(currentItem.key, previewUrl);
    }

    // Update name if changed
    const trimmedName = nameInput.trim();
    if (trimmedName && trimmedName !== currentItem.defaultName) {
      onUpdateCustomName(currentItem.key, trimmedName);
      saveCustomName(currentItem.key, trimmedName);
    } else if (trimmedName === currentItem.defaultName) {
      onResetCustomName(currentItem.key);
      resetCustomName(currentItem.key);
    }

    setPreviewUrl('');
    alert(`[${trimmedName || currentItem.defaultName}] 캐릭터의 커스텀 정보가 성공적으로 저장되었습니다!`);
  };

  const handleReset = () => {
    soundFx.playClick();
    onResetCustomImage(currentItem.key);
    resetCustomImage(currentItem.key);
    onResetCustomName(currentItem.key);
    resetCustomName(currentItem.key);
    setNameInput(currentItem.defaultName);
    setPreviewUrl('');
  };

  const isCustomized = (customImages && !!customImages[currentItem.key]) || (customNames && !!customNames[currentItem.key]);

  return (
    <div id="custom-image-manager" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-purple-950/40 to-zinc-900 border border-purple-800/50 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-900 text-purple-200 border border-purple-500/40">
              커스텀 캐릭터 & 명칭 관리소
            </span>
            <span className="text-xs text-zinc-400">JPG, PNG, GIF(움짤), WEBP 로컬 파일 지원</span>
          </div>
          <h2 className="text-xl font-extrabold text-zinc-100 mt-1 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-400" />
            모든 등장 캐릭터 이름 및 이미지 커스터마이징
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            주군 {lordName}, 재상 세바스챤, 하수인, 함정, 용사단의 이름과 외형 이미지를 변경하여 몰입감을 극대화하세요.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity Selector List */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-zinc-200">커스텀 대상 선택</h3>
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {entityCategories.map((cat) => (
              <button
                key={cat.tab}
                onClick={() => {
                  soundFx.playClick();
                  setActiveTab(cat.tab as any);
                  setSelectedEntityKey(cat.items[0].key);
                }}
                className={`py-1.5 rounded-lg text-[11px] font-bold transition-all text-center ${
                  activeTab === cat.tab
                    ? 'bg-purple-900 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items List */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {currentCategory.items.map((item) => {
              const isSelected = item.key === selectedEntityKey;
              const hasCustomImg = !!customImages[item.key];
              const hasCustomName = !!customNames[item.key];
              const displayName = customNames[item.key] || item.defaultName;
              const imgUrl = customImages[item.key] || item.defaultImg || lordImg;

              return (
                <div
                  key={item.key}
                  onClick={() => {
                    soundFx.playClick();
                    setSelectedEntityKey(item.key);
                  }}
                  className={`cursor-pointer rounded-xl p-3 border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-purple-950/50 border-purple-500 shadow-md ring-1 ring-purple-500/30'
                      : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 flex-shrink-0 relative">
                      <img
                        src={imgUrl}
                        alt={displayName}
                        className="w-full h-full object-cover animate-breath"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">{displayName}</h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-zinc-500">{item.title}</span>
                        {(hasCustomImg || hasCustomName) && (
                          <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800/50 px-1 rounded font-bold">
                            커스텀
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upload & Name Workspace */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              [{currentDisplayName}] 캐릭터 설정
            </h3>

            {isCustomized && (
              <button
                onClick={handleReset}
                className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                기본 설정 복원
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Live Preview Card with Breathing Motion */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-purple-500/60 shadow-xl shadow-purple-950/40 bg-zinc-950 relative">
                <img
                  src={previewUrl || currentImage}
                  alt={nameInput || currentDisplayName}
                  className="w-full h-full object-cover animate-breath"
                />
              </div>

              <div>
                <h4 className="text-base font-extrabold text-zinc-100">{nameInput || currentDisplayName}</h4>
                <p className="text-xs text-purple-300 font-medium mt-0.5">{currentItem.title}</p>
                <p className="text-[11px] text-zinc-500 mt-2">
                  {previewUrl
                    ? '새로 업로드한 로컬 이미지 (숨쉬는 연출 적용)'
                    : customImages[currentItem.key]
                    ? '적용 중인 커스텀 이미지 (GIF/JPG/PNG)'
                    : '기본 일러스트'}
                </p>
              </div>
            </div>

            {/* Custom Inputs Panel */}
            <div className="space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Name Change Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    캐릭터 이름 입력 & 변경
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="새로운 이름 입력..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500 font-medium"
                  />
                  <p className="text-[10px] text-zinc-500">
                    기본 이름: <span className="text-zinc-400 font-semibold">{currentItem.defaultName}</span>
                  </p>
                </div>

                {/* Local Image File Upload Input (JPG, PNG, GIF, WEBP) */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-purple-400" />
                    내 PC에서 이미지 파일 선택 (JPG, PNG, GIF, WEBP)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-950 file:text-purple-200 hover:file:bg-purple-900 file:cursor-pointer bg-zinc-900 rounded-xl border border-zinc-800 p-1"
                  />
                  <p className="text-[10px] text-zinc-500">
                    움짤 GIF 및 애니메이션 WEBP도 완벽히 지원됩니다.
                  </p>
                </div>
              </div>

              {/* Apply Button */}
              <button
                id="btn-apply-custom-character"
                onClick={handleApplyChanges}
                disabled={!previewUrl && nameInput === currentDisplayName}
                className={`w-full py-3.5 rounded-xl font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all ${
                  !previewUrl && nameInput === currentDisplayName
                    ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white border border-purple-500/50 shadow-purple-950'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>선택 캐릭터 이름 및 이미지 저장 적용</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
