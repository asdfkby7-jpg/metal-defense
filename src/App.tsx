import React, { useState, useEffect } from 'react';
import {
  GameState,
  Prisoner,
  BLEventChoice,
  ExpeditionTarget,
  PlacedMinion,
  Minion,
  DungeonRoom,
  Hero,
} from './types';
import {
  initialLord,
  initialAssistant,
  initialMinionsCatalog,
  initialTrapsCatalog,
  initialRooms,
  initialHeroesCatalog,
} from './data/defaultData';
import {
  loadGameState,
  saveGameState,
  loadCustomImages,
  loadCustomNames,
  clearGameState,
} from './utils/storage';
import { soundFx } from './utils/audio';

// Components
import { Header } from './components/Header';
import { AssistantPanel } from './components/AssistantPanel';
import { DungeonMapView } from './components/DungeonMapView';
import { BattleView } from './components/BattleView';
import { PrisonView } from './components/PrisonView';
import { NightExpeditionView } from './components/NightExpeditionView';
import { CustomImageManager } from './components/CustomImageManager';
import { ShopView } from './components/ShopView';
import { BedchamberView } from './components/BedchamberView';
import { BLEventModal } from './components/BLEventModal';
import { ImprintEventModal } from './components/ImprintEventModal';
import { UnimprintedConversionConfirmModal } from './components/UnimprintedConversionConfirmModal';
import { HelpModal } from './components/HelpModal';
import { HumanityModal } from './components/HumanityModal';
import { HumanityEndingModal } from './components/HumanityEndingModal';
import { MissionSuccessModal } from './components/MissionSuccessModal';
import { GameOverModal } from './components/GameOverModal';

// Helper to create converted minion from hero for inherited heroes
const createConvertedMinionFromHero = (hero: Hero): Minion => ({
  id: `minion_converted_${hero.id}`,
  name: `아군이 된 ${hero.name}`,
  tier: 4,
  type: 'Melee',
  hp: hero.hp + 120,
  maxHp: hero.hp + 120,
  attack: hero.attack + 25,
  defense: hero.defense + 20,
  speed: 8,
  costGold: 0,
  costMana: 0,
  description: `미션 성공으로 영구 승계되어 마왕성에 합류한 충성스러운 아군 용사. 영주의 침실에서 밀애가 가능합니다.`,
  imageUrl: hero.imageUrl,
  isUnlocked: true,
  isCustomHeroMinion: true,
  isImprinted: true,
  originalHeroId: hero.id,
  originalHeroName: hero.name,
  stock: 1,
});

const buildInventoryWithInheritedHeroes = (inheritedHeroIds: string[] = []): Minion[] => {
  const baseList = [...initialMinionsCatalog];
  inheritedHeroIds.forEach((heroId) => {
    const hero = initialHeroesCatalog.find((h) => h.id === heroId);
    if (hero && !baseList.some((m) => m.originalHeroId === hero.id || m.id === `minion_converted_${hero.id}`)) {
      baseList.push(createConvertedMinionFromHero(hero));
    }
  });
  return baseList;
};

// Icons for Tabs
import {
  Shield,
  Lock,
  Moon,
  Image as ImageIcon,
  Sparkles,
  Swords,
  Coins,
  Heart,
} from 'lucide-react';

export default function App() {
  // Load initial or persisted state
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = loadGameState();
    const loadedImages = loadCustomImages();
    const loadedNames = loadCustomNames();

    const defaultState: GameState = {
      gold: 500,
      mana: 200,
      wave: 1,
      day: 1,
      lord: initialLord,
      assistant: initialAssistant,
      rooms: initialRooms,
      inventoryMinions: initialMinionsCatalog,
      availableTraps: initialTrapsCatalog,
      prisoners: [],
      logs: [
        {
          id: 'log_start',
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          message: '🦇 거대 성의 주군 그리프 폰 발타자르께서 눈을 뜨셨습니다. 방어선 구축을 시작하세요.',
        },
      ],
      customImages: loadedImages,
      customNames: loadedNames,
      unlockedExpeditions: ['exp_village'],
      convertedHeroIds: [],
      chamberCompletedHeroIds: [],
      isBattleActive: false,
      nightExpeditionReady: false,
    };

    if (saved && typeof saved === 'object') {
      const hasValidRooms =
        Array.isArray(saved.rooms) &&
        saved.rooms.length === 11 &&
        saved.rooms.some((r: any) => r.id === 'r_north_left');

      const savedLord = saved.lord;
      const loadedLord = savedLord && savedLord.name
        ? {
            ...initialLord,
            ...savedLord,
            name: savedLord.name === '드라쿨리스' ? '그리프 폰 발타자르' : savedLord.name,
          }
        : initialLord;

      const inheritedHeroIds = saved.inheritedHeroIds || [];
      const baseInventory = saved.inventoryMinions || buildInventoryWithInheritedHeroes(inheritedHeroIds);
      const fullInventory = [...baseInventory];
      inheritedHeroIds.forEach((heroId: string) => {
        const hero = initialHeroesCatalog.find((h) => h.id === heroId);
        if (hero && !fullInventory.some((m) => m.originalHeroId === hero.id || m.id === `minion_converted_${hero.id}`)) {
          fullInventory.push(createConvertedMinionFromHero(hero));
        }
      });

      return {
        ...defaultState,
        ...saved,
        lord: loadedLord,
        assistant: saved.assistant && saved.assistant.name ? { ...initialAssistant, ...saved.assistant } : initialAssistant,
        rooms: hasValidRooms ? saved.rooms : initialRooms,
        inventoryMinions: fullInventory,
        availableTraps: saved.availableTraps || initialTrapsCatalog,
        customImages: { ...loadedImages, ...(saved.customImages || {}) },
        customNames: { ...loadedNames, ...(saved.customNames || {}) },
        chamberCompletedHeroIds: saved.chamberCompletedHeroIds || [],
        inheritedHeroIds: inheritedHeroIds,
        imprintedHeroIds: saved.imprintedHeroIds || [],
        convertedHeroIds: saved.convertedHeroIds || [],
        missionSuccessCount: saved.missionSuccessCount || 0,
      };
    }

    return defaultState;
  });

  const [activeTab, setActiveTab] = useState<
    'dungeon' | 'battle' | 'prison' | 'raid' | 'custom' | 'shop' | 'chamber'
  >('dungeon');

  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeBLEventPrisoner, setActiveBLEventPrisoner] = useState<Prisoner | null>(null);
  const [activeImprintPrisoner, setActiveImprintPrisoner] = useState<Prisoner | null>(null);
  const [pendingConversionPrisoner, setPendingConversionPrisoner] = useState<Prisoner | null>(null);

  // New Modals for Humanity, Ending, Wave 30 Success, and Game Over
  const [isHumanityModalOpen, setIsHumanityModalOpen] = useState(false);
  const [isHumanityEndingOpen, setIsHumanityEndingOpen] = useState(false);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);
  const [isMissionSuccessModalOpen, setIsMissionSuccessModalOpen] = useState(false);
  const [missionSuccessSettlementData, setMissionSuccessSettlementData] = useState<any | null>(null);

  // Auto save game state on change
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  // Handle Deploy Minion
  const handleDeployMinion = (roomId: string, minionId: string) => {
    const minionTemplate = gameState.inventoryMinions.find((m) => m.id === minionId);
    if (!minionTemplate) return;

    const targetRoom = gameState.rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    // Room capacity limit: Entrance allows 2 total (Upper/Lower, including Lord). All other rooms allow 1 total (including Lord).
    const maxOccupants = targetRoom.id === 'r_entrance' ? 2 : 1;
    const currentOccupants = targetRoom.placedMinions.length + (targetRoom.hasLord ? 1 : 0);

    if (currentOccupants >= maxOccupants) {
      if (targetRoom.id === 'r_entrance') {
        alert(
          `⚠️ [입구방 배치 정원 초과] 입구방은 주군 포함 최대 2명(상부 슬롯 1명, 하부 슬롯 1명)까지만 배치할 수 있습니다! 기존 하수인을 회수하거나 다른 방에 배치해주세요.`
        );
      } else {
        if (targetRoom.hasLord) {
          alert(`⚠️ [배치 불가] 주군이 주둔 중인 방에는 추가 하수인을 배치할 수 없습니다. (주군 포함 최대 1명 배치 가능)`);
        } else {
          alert(`⚠️ [배치 공간 부족] ${targetRoom.name}은(는) 주군 포함 최대 1명까지만 배치할 수 있습니다! (기존 하수인을 회수 후 배치하세요)`);
        }
      }
      return;
    }

    const isConvertedAdventurer =
      minionTemplate.isCustomHeroMinion ||
      minionTemplate.id.startsWith('minion_converted_') ||
      minionTemplate.costGold === 0;

    if (isConvertedAdventurer) {
      if (gameState.mana < minionTemplate.costMana) {
        alert('마력이 부족합니다!');
        return;
      }

      // Check available stock for converted hero minions
      const totalStock = minionTemplate.stock ?? 1;
      const placedCount = gameState.rooms.reduce((acc, room) => {
        return (
          acc +
          room.placedMinions.filter(
            (pm) =>
              pm.id === minionTemplate.id ||
              (pm.originalHeroId && pm.originalHeroId === minionTemplate.originalHeroId) ||
              pm.name === minionTemplate.name
          ).length
        );
      }, 0);

      const availableCount = totalStock - placedCount;
      if (availableCount <= 0) {
        alert(
          `⚠️ [배치 불가] ${minionTemplate.name}의 배치 가능한 남은 개조 수량이 없습니다!\n(누적 개조 보유량: ${totalStock}개, 현재 모든 방에 배치됨: ${placedCount}개)\n새 용사를 포획 및 개조하여 수량을 확보해야 합니다.`
        );
        return;
      }
    } else {
      if (gameState.gold < minionTemplate.costGold || gameState.mana < minionTemplate.costMana) {
        alert('자원(골드/마력)이 부족합니다!');
        return;
      }
    }

    const newPlacedInstance: PlacedMinion = {
      ...minionTemplate,
      instanceId: `inst_minion_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      currentHp: minionTemplate.hp,
    };

    soundFx.playClick();
    setGameState((prev) => ({
      ...prev,
      gold: isConvertedAdventurer ? prev.gold : prev.gold - minionTemplate.costGold,
      mana: prev.mana - minionTemplate.costMana,
      rooms: prev.rooms.map((room) =>
        room.id === roomId
          ? { ...room, placedMinions: [...room.placedMinions, newPlacedInstance] }
          : room
      ),
    }));
  };

  // Handle Remove Minion
  const handleRemoveMinion = (roomId: string, instanceId: string) => {
    soundFx.playClick();
    setGameState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              placedMinions: room.placedMinions.filter((m) => m.instanceId !== instanceId),
            }
          : room
      ),
    }));
  };

  // Drag & Drop: Move Placed Minion / Converted Ally between rooms (Swapping position if occupied)
  const handleMovePlacedMinion = (fromRoomId: string, instanceId: string, toRoomId: string) => {
    if (fromRoomId === toRoomId) return;

    setGameState((prev) => {
      const fromRoom = prev.rooms.find((r) => r.id === fromRoomId);
      const toRoom = prev.rooms.find((r) => r.id === toRoomId);

      if (!fromRoom || !toRoom) return prev;

      const targetMinion = fromRoom.placedMinions.find((m) => m.instanceId === instanceId);
      if (!targetMinion) return prev;

      const maxOccupants = toRoom.id === 'r_entrance' ? 2 : 1;
      const toCurrentMinions = toRoom.placedMinions;
      const toHasLord = toRoom.hasLord;
      const toOccupantsCount = toCurrentMinions.length + (toHasLord ? 1 : 0);

      // Check if toRoom has empty slot for this minion without swapping
      if (toOccupantsCount < maxOccupants) {
        soundFx.playClick();
        return {
          ...prev,
          rooms: prev.rooms.map((room) => {
            if (room.id === fromRoomId) {
              return {
                ...room,
                placedMinions: room.placedMinions.filter((m) => m.instanceId !== instanceId),
              };
            }
            if (room.id === toRoomId) {
              return {
                ...room,
                placedMinions: [...room.placedMinions, targetMinion],
              };
            }
            return room;
          }),
        };
      }

      // If toRoom is full:
      // If toRoom is occupied by Lord and has no minion (e.g. non-entrance room with Lord)
      if (toHasLord && toCurrentMinions.length === 0) {
        alert(`⚠️ [이동 불가] 주군이 주둔 중인 방으로는 하수인을 이동할 수 없습니다. (주군 포함 최대 1명)`);
        return prev;
      }

      // If toRoom has existing minion(s), SWAP positions between fromRoom and toRoom
      if (toCurrentMinions.length > 0) {
        const swappedMinion = toCurrentMinions[toCurrentMinions.length - 1];
        const remainingToMinions = toCurrentMinions.slice(0, toCurrentMinions.length - 1);

        soundFx.playClick();
        return {
          ...prev,
          rooms: prev.rooms.map((room) => {
            if (room.id === fromRoomId) {
              const remainingFrom = room.placedMinions.filter((m) => m.instanceId !== instanceId);
              return {
                ...room,
                placedMinions: [...remainingFrom, swappedMinion],
              };
            }
            if (room.id === toRoomId) {
              return {
                ...room,
                placedMinions: [...remainingToMinions, targetMinion],
              };
            }
            return room;
          }),
        };
      }

      alert(`⚠️ [배치 공간 부족] ${toRoom.name}은(는) 배치 공간이 가득 찼습니다!`);
      return prev;
    });
  };

  // Handle Deploy Trap
  const handleDeployTrap = (roomId: string, trapId: string) => {
    const trapTemplate = gameState.availableTraps.find((t) => t.id === trapId);
    if (!trapTemplate) return;

    if (gameState.gold < trapTemplate.costGold || gameState.mana < trapTemplate.costMana) {
      alert('자원(골드/마력)이 부족합니다!');
      return;
    }

    soundFx.playClick();
    setGameState((prev) => ({
      ...prev,
      gold: prev.gold - trapTemplate.costGold,
      mana: prev.mana - trapTemplate.costMana,
      rooms: prev.rooms.map((room) =>
        room.id === roomId
          ? { ...room, placedTraps: [...room.placedTraps, trapTemplate] }
          : room
      ),
    }));
  };

  // Handle Remove Trap
  const handleRemoveTrap = (roomId: string, trapIndex: number) => {
    soundFx.playClick();
    setGameState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              placedTraps: room.placedTraps.filter((_, idx) => idx !== trapIndex),
            }
          : room
      ),
    }));
  };

  // Move Vampire Lord Position
  const handleMoveLord = (roomId: string) => {
    setGameState((prev) => {
      const targetRoom = prev.rooms.find((r) => r.id === roomId);
      if (!targetRoom) return prev;
      if (targetRoom.hasLord) return prev;

      const maxOccupants = targetRoom.id === 'r_entrance' ? 2 : 1;
      // Moving Lord in means target room's minions + 1 <= maxOccupants
      if (targetRoom.placedMinions.length >= maxOccupants) {
        if (targetRoom.id === 'r_entrance') {
          alert(`⚠️ [입구방 정원 초과] 입구방은 주군 포함 총 2명(상부/하부 각 1명)까지 배치 가능합니다. 배치된 하수인 1명을 먼저 회수해주세요.`);
        } else {
          alert(`⚠️ [배치 인원 초과] ${targetRoom.name}은(는) 주군 포함 총 1명만 배치 가능합니다. 배치된 하수인을 먼저 회수하거나 다른 방으로 이동해주세요.`);
        }
        return prev;
      }

      soundFx.playClick();
      return {
        ...prev,
        rooms: prev.rooms.map((room) => ({
          ...room,
          hasLord: room.id === roomId,
        })),
      };
    });
  };

  // Start Wave Defense
  const handleStartWave = () => {
    setGameState((prev) => ({ ...prev, isBattleActive: true }));
    setActiveTab('battle');
  };

  // Finish Wave Defense Result Settlement
  const handleFinishWave = ({
    goldGained,
    manaGained,
    capturedPrisoners,
    logs,
    updatedRooms,
  }: {
    goldGained: number;
    manaGained: number;
    capturedPrisoners: Prisoner[];
    logs: string[];
    updatedRooms?: DungeonRoom[];
  }) => {
    const nextWave = gameState.wave + 1;
    const isNightRaid = nextWave % 5 === 0;

    setGameState((prev) => ({
      ...prev,
      gold: prev.gold + goldGained,
      mana: prev.mana + manaGained,
      wave: nextWave,
      day: prev.day + 1,
      prisoners: [...prev.prisoners, ...capturedPrisoners],
      rooms: updatedRooms || prev.rooms,
      isBattleActive: false,
      nightExpeditionReady: isNightRaid,
      assistant: {
        ...prev.assistant,
        dialogue: isNightRaid
          ? `주군! 5번째 웨이브 방어에 성공하였습니다. 마력을 수집하기 위한 [흡정야행단]을 출격시킬 준비가 되었습니다!`
          : capturedPrisoners.length > 0
          ? `주군, 이번 전투에서 용사 ${capturedPrisoners.length}명을 감옥으로 성공적으로 수감했습니다!`
          : `Wave ${prev.wave} 방어전이 끝났습니다. 성의 수비선 상태를 재정비해주세요.`,
      },
    }));

    if (isNightRaid) {
      setActiveTab('raid');
    } else {
      setActiveTab('dungeon');
    }
  };

  // Lord Defeat & Game Over Handler (Carries over Lord improved stats & inherited heroes)
  const handleLordDefeated = () => {
    setIsGameOverModalOpen(true);
  };

  const handleGameOverRestart = () => {
    setGameState((prev) => {
      const inheritedHeroIds = prev.inheritedHeroIds || [];
      const inheritedMinions = buildInventoryWithInheritedHeroes(inheritedHeroIds);
      return {
        ...prev,
        gold: 500,
        mana: 200,
        wave: 1,
        day: 1,
        rooms: initialRooms,
        inventoryMinions: inheritedMinions,
        availableTraps: initialTrapsCatalog,
        prisoners: [],
        isBattleActive: false,
        nightExpeditionReady: false,
        lord: {
          ...initialLord,
          baseHp: prev.lord.baseHp,
          baseAttack: prev.lord.baseAttack,
          baseDefense: prev.lord.baseDefense,
          level: prev.lord.level,
          manaSpent: prev.lord.manaSpent,
        },
        logs: [
          {
            id: `log_restart_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'info',
            message: `👑 [능력치 계승 초기화] 주군의 체력(${prev.lord.baseHp} HP), 공격력, 방어력이 그대로 계승되어 새로운 1웨이브가 시작되었습니다.`,
          },
          ...prev.logs,
        ],
      };
    });
    setIsGameOverModalOpen(false);
    setActiveTab('dungeon');
  };

  // Wave 30 Mission Success Handler
  const handleMissionSuccess = (rewards: any) => {
    setMissionSuccessSettlementData(rewards);
    setIsMissionSuccessModalOpen(true);
  };

  const handleConfirmInherit = (selectedHeroId: string | null) => {
    setGameState((prev) => {
      const updatedInheritedIds = [...(prev.inheritedHeroIds || [])];
      if (selectedHeroId && !updatedInheritedIds.includes(selectedHeroId)) {
        updatedInheritedIds.push(selectedHeroId);
      }
      const inheritedMinions = buildInventoryWithInheritedHeroes(updatedInheritedIds);

      return {
        ...prev,
        gold: 500,
        mana: 200,
        wave: 1,
        day: 1,
        rooms: initialRooms,
        inventoryMinions: inheritedMinions,
        availableTraps: initialTrapsCatalog,
        prisoners: [],
        inheritedHeroIds: updatedInheritedIds,
        missionSuccessCount: (prev.missionSuccessCount || 0) + 1,
        isBattleActive: false,
        nightExpeditionReady: false,
        lord: {
          ...initialLord,
          baseHp: prev.lord.baseHp,
          baseAttack: prev.lord.baseAttack,
          baseDefense: prev.lord.baseDefense,
          level: prev.lord.level,
          manaSpent: prev.lord.manaSpent,
        },
        logs: [
          {
            id: `log_success_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'event',
            message: `🏆 [30웨이브 미션 완수 & 승계] 새로운 회차가 시작되었습니다! 승계된 각인 용사(${updatedInheritedIds.length}명)와 강화된 주군 능력치가 계승되었습니다.`,
          },
          ...prev.logs,
        ],
      };
    });
    setIsMissionSuccessModalOpen(false);
    setActiveTab('dungeon');
  };

  // Humanity Restoration & Dimensional Shift Handlers
  const handleOpenHumanityModal = () => {
    setIsHumanityModalOpen(true);
  };

  const handleHumanityConfirmYes = () => {
    setIsHumanityModalOpen(false);
    setIsHumanityEndingOpen(true);
    setGameState((prev) => ({
      ...prev,
      hasRestoredHumanity: true,
      logs: [
        {
          id: `log_humanity_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'event',
          message: `✨ [진 엔딩: 인간성 회복] 주군이 하프 뱀파이어에서 인간으로 완전히 정화되어 동료들과 함께 인간계로 차원 이동했습니다.`,
        },
        ...prev.logs,
      ],
    }));
  };

  const handleRestartAfterHumanityEnding = () => {
    setGameState((prev) => {
      const inheritedHeroIds = prev.inheritedHeroIds || [];
      const inheritedMinions = buildInventoryWithInheritedHeroes(inheritedHeroIds);
      return {
        ...prev,
        gold: 500,
        mana: 200,
        wave: 1,
        day: 1,
        rooms: initialRooms,
        inventoryMinions: inheritedMinions,
        availableTraps: initialTrapsCatalog,
        prisoners: [],
        isBattleActive: false,
        nightExpeditionReady: false,
        lord: {
          ...initialLord,
          baseHp: prev.lord.baseHp,
          baseAttack: prev.lord.baseAttack,
          baseDefense: prev.lord.baseDefense,
          level: prev.lord.level,
          manaSpent: prev.lord.manaSpent,
        },
        logs: [
          {
            id: `log_new_cycle_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'info',
            message: `🌟 [새로운 회차 시작] 영구 승계된 용사들과 강화된 주군의 힘으로 새로운 여정이 시작됩니다.`,
          },
          ...prev.logs,
        ],
      };
    });
    setIsHumanityEndingOpen(false);
    setActiveTab('dungeon');
  };

  // Calculate HP gain percentage based on hero strength/rank (1% to 5%, Rookie < 0.3% e.g. 0.2%)
  const getDrainHpGainPercent = (hero: Hero): number => {
    if (hero.id === 'h_rookie' || hero.name.includes('루키') || hero.name.includes('카일')) {
      return 0.2; // 0.2% (< 0.3% rule)
    }
    switch (hero.rank) {
      case 'Royal':
        return 5;
      case 'Platinum':
        return 4;
      case 'Gold':
        return 3;
      case 'Silver':
        return 2;
      case 'Bronze':
      default:
        return 1;
    }
  };

  // Prison Action: Extract Blood / Drain -> Increases Lord baseHp based on rank, NO MP gain. Rookie vanishes after 1 drain.
  const handleDrainBlood = (instanceId: string) => {
    const prisoner = gameState.prisoners.find((p) => p.instanceId === instanceId);
    if (!prisoner) return;

    // Rule: Draining can only be done ONCE per wave/turn
    if (prisoner.lastDrainedWave === gameState.wave) {
      alert(`이미 이번 턴(Wave ${gameState.wave})에 피를 채취했습니다! 다음 웨이브에서 다시 가능합니다.`);
      return;
    }

    const isRookie =
      prisoner.hero.id === 'h_rookie' ||
      prisoner.hero.name.includes('루키') ||
      prisoner.hero.name.includes('카일');

    const hpGainPercent = getDrainHpGainPercent(prisoner.hero);
    // Calculated HP bonus based on current lord baseHp
    const hpGainAmount = Math.max(1, Math.round(gameState.lord.baseHp * (hpGainPercent / 100)));

    // Rule: Rookie Adventurer vanishes immediately after 1 drain with negligible 0.2% HP gain
    if (isRookie) {
      setGameState((prev) => {
        const updatedLord = {
          ...prev.lord,
          baseHp: prev.lord.baseHp + hpGainAmount,
        };

        return {
          ...prev,
          lord: updatedLord,
          prisoners: prev.prisoners.filter((p) => p.instanceId !== instanceId),
          logs: [
            {
              id: `log_drain_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'drain',
              message: `🩸 [루키 모험가 흡혈 소멸] 미숙한 루키 모험가 ${prisoner.hero.name}의 혈액을 흡혈하여 주군 최대 체력 +${hpGainPercent}% (+${hpGainAmount} HP, 현재 ${updatedLord.baseHp} HP)가 소폭 증가하였으며, 1회 흡혈 후 생명력을 모두 소진하여 즉시 소멸하였습니다.`,
            },
            ...prev.logs,
          ],
        };
      });

      alert(
        `🩸 [루키 모험가 흡혈 소멸]\n\n루키 모험가는 혈액과 마력이 미숙하여 주군 최대 HP 증가율이 ${hpGainPercent}%(+${hpGainAmount} HP)로 미미하며, 1회 흡혈 후 생명력을 모두 다해 즉시 소멸하였습니다.`
      );
      return;
    }

    const currentDrainCount = (prisoner.drainCount || 0) + 1;

    if (currentDrainCount >= 3) {
      // 3+ drains reached: Trigger Neck-Bite Imprint Event!
      setActiveImprintPrisoner({
        ...prisoner,
        drainCount: 3,
        lastDrainedWave: gameState.wave,
        imprintedVia: 'blood_drain',
      });
      return;
    }

    // Normal drain (1st or 2nd time): Lord HP increases by 1%~5%, MP does NOT increase
    setGameState((prev) => {
      const updatedLord = {
        ...prev.lord,
        baseHp: prev.lord.baseHp + hpGainAmount,
      };

      const updatedPrisoners = prev.prisoners.map((p) =>
        p.instanceId === instanceId
          ? {
              ...p,
              drainCount: currentDrainCount,
              lastDrainedWave: prev.wave,
              remainingHealthPercent: Math.max(20, p.remainingHealthPercent - 25),
            }
          : p
      );

      return {
        ...prev,
        // No MP increase per rule
        lord: updatedLord,
        prisoners: updatedPrisoners,
        logs: [
          {
            id: `log_drain_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'drain',
            message: `🩸 [흡혈 완료] ${prisoner.hero.name}(${prisoner.hero.rank})의 혈액 흡수! 주군 최대 체력 +${hpGainPercent}% (+${hpGainAmount} HP, 현재 ${updatedLord.baseHp} HP) [각인 진행: ${currentDrainCount}/3]`,
          },
          ...prev.logs,
        ],
      };
    });

    alert(
      `🩸 [피 흡혈 완료] ${prisoner.hero.name}(${prisoner.hero.rank})의 혈액을 흡수하여 주군의 최대 HP가 +${hpGainPercent}% (+${hpGainAmount} HP) 증가하였습니다!\n(MP는 증가하지 않음 / 누적 흡혈 각인 진행: ${currentDrainCount}/3회 - 3회 시 아군 각인 및 침실 초대 가능)`
    );
  };

  // Complete 3-Drains or 3-Whispers Imprint Event
  const handleCompleteImprint = (prisoner: Prisoner) => {
    const isWhisper = prisoner.imprintedVia === 'whisper';
    const hpGainPercent = getDrainHpGainPercent(prisoner.hero);
    const hpGainAmount = Math.max(1, Math.round(gameState.lord.baseHp * (hpGainPercent / 100)));

    setGameState((prev) => {
      // Blood drain strengthens lord HP; Whisper does not strengthen lord HP (preserves hero HP instead)
      const updatedLord = isWhisper
        ? prev.lord
        : {
            ...prev.lord,
            baseHp: prev.lord.baseHp + hpGainAmount,
          };

      const existingIndex = prev.inventoryMinions.findIndex(
        (m) =>
          (m.isCustomHeroMinion || m.id.startsWith('minion_converted_')) &&
          ((m.originalHeroId && m.originalHeroId === prisoner.hero.id) ||
            m.name === `아군이 된 ${prisoner.hero.name}`)
      );

      let updatedInventory = [...prev.inventoryMinions];
      if (existingIndex >= 0) {
        const existing = updatedInventory[existingIndex];
        const currentStock = existing.stock ?? 1;
        updatedInventory[existingIndex] = {
          ...existing,
          stock: currentStock + 1,
          isUnlocked: true,
          isImprinted: true,
        };
      } else {
        const convertedMinion: Minion = {
          id: `minion_converted_${prisoner.hero.id}`,
          name: `아군이 된 ${prisoner.hero.name}`,
          tier: 4,
          type: 'Melee' as const,
          hp: prisoner.hero.hp + 120,
          maxHp: prisoner.hero.hp + 120,
          attack: prisoner.hero.attack + 25,
          defense: prisoner.hero.defense + 20,
          speed: 8,
          costGold: 0,
          costMana: 0,
          description: isWhisper
            ? `주군과 귓속말 교감으로 깊은 유대를 맺어 충성을 맹세한 아군 용사 (흡혈 없이 온전한 HP 보존). 영주의 침실에서 밀애가 가능합니다.`
            : `주군에게 3회 흡혈 후 뒷목 각인을 받아 완전한 충성을 맹세한 아군 용사. 영주의 침실에서 밀애가 가능합니다.`,
          imageUrl: prisoner.hero.imageUrl,
          isUnlocked: true,
          isCustomHeroMinion: true,
          isImprinted: true,
          originalHeroId: prisoner.hero.id,
          originalHeroName: prisoner.hero.name,
          stock: 1,
        };
        updatedInventory.push(convertedMinion);
      }

      return {
        ...prev,
        lord: updatedLord,
        inventoryMinions: updatedInventory,
        convertedHeroIds: [...(prev.convertedHeroIds || []), prisoner.hero.id],
        imprintedHeroIds: [...(prev.imprintedHeroIds || []), prisoner.hero.id],
        prisoners: prev.prisoners.filter((p) => p.instanceId !== prisoner.instanceId),
        logs: [
          {
            id: `log_imprint_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'event',
            message: isWhisper
              ? `💖 [호감도 각인 완료] ${prisoner.hero.name}과(와) 귓속말 교감으로 영혼의 각인을 새겼습니다! (용사 HP 100% 온전 보존) [영주의 침실]에서 선택 및 소환 가능!`
              : `🩸 [목덜미 각인 완료] ${prisoner.hero.name}의 뒷목을 깨물어 영혼의 각인을 새겼습니다! [영주의 침실]에서 선택 및 소환 가능!`,
          },
          ...prev.logs,
        ],
      };
    });

    setActiveImprintPrisoner(null);

    alert(
      isWhisper
        ? `💖 [호감도 각인 완료] ${prisoner.hero.name}의 호감도를 모두 채워 온전한 HP를 보존한 채 아군으로 전향했습니다!\n* [영주의 침실]에서 언제든 초대하여 밀애를 즐길 수 있습니다.`
        : `🩸 [피의 각인 완료] ${prisoner.hero.name}의 뒷목을 흡혈하여 영혼의 각인을 새기고 아군으로 편입했습니다!\n* [영주의 침실]에서 언제든 초대하여 밀애를 즐길 수 있습니다.`
    );
  };

  // Prison Action: Prisoner Exchange / Ransom Gold
  const handleRansomPrisoner = (instanceId: string) => {
    const prisoner = gameState.prisoners.find((p) => p.instanceId === instanceId);
    if (!prisoner) return;

    if (
      prisoner.hero.id === 'h_rookie' ||
      prisoner.hero.name.includes('루키') ||
      prisoner.hero.name.includes('카일')
    ) {
      alert('⚠️ 루키 모험가는 무명이라 가문에서 몸값(Gold)을 지급하지 않습니다. MP(피 채취)만 가능합니다!');
      return;
    }

    const goldYield = prisoner.hero.goldReward * 2 + prisoner.capturedAtWave * 100;

    setGameState((prev) => ({
      ...prev,
      gold: prev.gold + goldYield,
      prisoners: prev.prisoners.filter((p) => p.instanceId !== instanceId),
      logs: [
        {
          id: `log_ransom_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'gold',
          message: `💰 [포로 교환] ${prisoner.hero.name}의 가문으로부터 몸값 +${goldYield} Gold를 지급받았습니다.`,
        },
        ...prev.logs,
      ],
    }));

    alert(`💰 [포로 교환] ${prisoner.hero.name}의 귀족 가문으로부터 몸값 +${goldYield} Gold를 지급받았습니다!`);
  };

  // Prison Action: Request Convert to Minion (Shows warning modal if not imprinted)
  const handleConvertMinion = (instanceId: string) => {
    const prisoner = gameState.prisoners.find((p) => p.instanceId === instanceId);
    if (!prisoner) return;

    if (gameState.mana < 150) {
      alert('하수인 개조에는 최소 150 MP의 마력이 필요합니다!');
      return;
    }

    const isImprinted = (prisoner.drainCount || 0) >= 3;
    if (!isImprinted) {
      // Show confirmation warning modal before converting without imprint
      setPendingConversionPrisoner(prisoner);
      return;
    }

    // If already imprinted, proceed directly
    executeMinionConversion(prisoner);
  };

  // Execute actual minion conversion (with 50% escape chance if hero is stronger than lord)
  const executeMinionConversion = (prisoner: Prisoner) => {
    const isImprinted = (prisoner.drainCount || 0) >= 3;
    const hero = prisoner.hero;
    const heroPower = hero.attack + hero.defense + hero.hp;
    const lordPower = gameState.lord.baseAttack + gameState.lord.baseDefense + gameState.lord.baseHp;
    const isHeroStronger = heroPower > lordPower;

    // If unimprinted AND hero is stronger than lord -> 50% escape risk!
    if (!isImprinted && isHeroStronger) {
      const escapeRoll = Math.random();
      if (escapeRoll < 0.5) {
        // Hero escapes prison and will appear again as enemy!
        setGameState((prev) => ({
          ...prev,
          mana: Math.max(0, prev.mana - 150),
          prisoners: prev.prisoners.filter((p) => p.instanceId !== prisoner.instanceId),
          logs: [
            {
              id: `log_escape_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'attack',
              message: `⚠️ [탈옥 발생!] 주군보다 강한 ${hero.name}(전투력 ${heroPower} vs ${lordPower})이(가) 개조 중 사슬을 끊고 탈옥하였습니다! 다음 웨이브에서 적으로 다시 등장합니다!`,
            },
            ...prev.logs,
          ],
        }));

        alert(
          `🚨 [탈옥 발생!]\n\n각인되지 않은 상태에서 주군(전투력 ${lordPower})보다 강력한 ${hero.name}(전투력 ${heroPower})이(가) 마력 개조 중 사슬을 깨뜨리고 탈옥했습니다!\n\n(소모 마력: 150 MP / 차후 웨이브에서 적으로 다시 등장합니다)`
        );
        return;
      }
    }

    // Success in conversion (without HP absorption if unimprinted)
    setGameState((prev) => {
      const existingIndex = prev.inventoryMinions.findIndex(
        (m) =>
          (m.isCustomHeroMinion || m.id.startsWith('minion_converted_')) &&
          ((m.originalHeroId && m.originalHeroId === hero.id) ||
            m.name === `개조된 ${hero.name}`)
      );

      let updatedInventory = [...prev.inventoryMinions];

      if (existingIndex >= 0) {
        const existing = updatedInventory[existingIndex];
        const currentStock = existing.stock ?? 1;
        updatedInventory[existingIndex] = {
          ...existing,
          stock: currentStock + 1,
          isUnlocked: true,
          isImprinted: isImprinted ? true : existing.isImprinted,
        };
      } else {
        const convertedMinion: Minion = {
          id: `minion_converted_${hero.id}`,
          name: `개조된 ${hero.name}`,
          tier: 3,
          type: 'Melee' as const,
          hp: hero.hp + 100,
          maxHp: hero.hp + 100,
          attack: hero.attack + 20,
          defense: hero.defense + 15,
          speed: 8,
          costGold: 0,
          costMana: 0,
          description: isImprinted
            ? `주군에게 3회 흡혈 후 뒷목 각인을 받아 완전한 충성을 맹세한 아군 용사.`
            : `주인공에게 HP를 빼앗기지 않은 채 개조된 하수인. (각인 미완료로 영주의 침실 초대 불가)`,
          imageUrl: hero.imageUrl,
          isUnlocked: true,
          isCustomHeroMinion: true,
          isImprinted: isImprinted,
          originalHeroId: hero.id,
          originalHeroName: hero.name,
          stock: 1,
        };
        updatedInventory.push(convertedMinion);
      }

      const updatedImprintedIds = isImprinted
        ? [...(prev.imprintedHeroIds || []), hero.id]
        : prev.imprintedHeroIds || [];

      return {
        ...prev,
        mana: prev.mana - 150,
        inventoryMinions: updatedInventory,
        convertedHeroIds: [...(prev.convertedHeroIds || []), hero.id],
        imprintedHeroIds: updatedImprintedIds,
        prisoners: prev.prisoners.filter((p) => p.instanceId !== prisoner.instanceId),
        logs: [
          {
            id: `log_convert_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'event',
            message: `🧟 [하수인 개조 성공] ${hero.name}을(를) 충직한 하수인으로 개조했습니다.${
              !isImprinted ? ' (주군 HP 흡수 없음 / 영주의 침실 초대 불가)' : ''
            }`,
          },
          ...prev.logs,
        ],
      };
    });

    alert(
      `🧟 [하수인 개조 완료] ${hero.name}을(를) 하수인으로 개조했습니다! (배치 가능 수량 +1)\n${
        !isImprinted
          ? '* 각인되지 않은 하수인이므로 주인공의 HP는 흡혈되지 않았으며, [영주의 침실]에는 초대할 수 없습니다.'
          : '* 영혼의 각인이 완료되어 침실 초대가 가능합니다.'
      }`
    );
  };

  // Trigger BL Choice Event Modal
  const handleTriggerBLEvent = (prisoner: Prisoner) => {
    setActiveBLEventPrisoner(prisoner);
  };

  // Handle Choice Selected in BL Event Modal
  const handleBLEventChoice = (instanceId: string, choice: BLEventChoice) => {
    const prisoner = gameState.prisoners.find((p) => p.instanceId === instanceId);
    if (!prisoner) return;

    if (choice.rewardType === 'DrainBlood') {
      // Execute Blood Drain directly
      handleDrainBlood(instanceId);
      return;
    }

    if (choice.rewardType === 'Gold') {
      // Execute general ransom gold exchange formula directly (same as standard ransom)
      handleRansomPrisoner(instanceId);
      return;
    }

    if (choice.rewardType === 'ConvertMinion') {
      // Triggers minion conversion (with confirmation modal & escape chance checks)
      handleConvertMinion(instanceId);
      return;
    }

    if (choice.rewardType === 'Affinity') {
      // Whisper Affinity choice: Increases affinity count without increasing mana/lord HP (1 per wave limit)
      if (prisoner.lastInterrogatedWave === gameState.wave) {
        alert(`⚠️ [귓속말 1회 제한]\n\n이번 웨이브(Wave ${gameState.wave})에서는 이미 ${prisoner.hero.name}에게 귓속말 심문을 진행했습니다. 다음 웨이브에서 다시 속삭일 수 있습니다.`);
        return;
      }

      const currentAffinityCount = (prisoner.interrogationCount || 0) + 1;

      if (currentAffinityCount >= 3) {
        // Trigger Whisper Imprint Modal (preserves full HP)
        setActiveImprintPrisoner({
          ...prisoner,
          interrogationCount: 3,
          lastInterrogatedWave: gameState.wave,
          imprintedVia: 'whisper',
        });
        return;
      }

      setGameState((prev) => ({
        ...prev,
        prisoners: prev.prisoners.map((p) =>
          p.instanceId === instanceId
            ? {
                ...p,
                interrogationCount: currentAffinityCount,
                lastInterrogatedWave: prev.wave,
              }
            : p
        ),
        logs: [
          {
            id: `log_whisper_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'event',
            message: `💖 [심문 귓속말 완료] ${prisoner.hero.name}의 귓가에 속삭였습니다. (마력 증가 없음 / 호감도 각인 진행: ${currentAffinityCount}/3회 - 웨이브당 1회 한정)`,
          },
          ...prev.logs,
        ],
      }));

      alert(
        `💖 [귓속말 심문 완료]\n\n${prisoner.hero.name}의 귓가에 은밀한 말을 속삭여 호감도를 높였습니다.\n(마력/주군HP는 증가하지 않음 / 호감도 각인 진행: ${currentAffinityCount}/3회 - 3회 달성 시 흡혈 없이 온전한 HP 상태로 아군 각인 및 침실 초대 해금)`
      );
      return;
    }

    // Default: Mana or other rewards
    setGameState((prev) => {
      let manaBonus = choice.rewardType === 'Mana' ? choice.rewardValue : 0;
      return {
        ...prev,
        mana: prev.mana + manaBonus,
        prisoners: prev.prisoners.filter((p) => p.instanceId !== instanceId),
        logs: [
          {
            id: `log_bl_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'event',
            message: `✨ [특별 심문 완료] ${prisoner.hero.name}과의 대화로 마력 +${manaBonus} MP를 획득하였습니다.`,
          },
          ...prev.logs,
        ],
      };
    });
  };

  // Execute Night Expedition (Only 1 time per night raid wave)
  const handleExecuteRaid = (
    target: ExpeditionTarget,
    rewardMana: number,
    rewardGold: number,
    capturedHero?: Hero,
    lostCompanion?: Minion
  ) => {
    setGameState((prev) => {
      let updatedPrisoners = [...prev.prisoners];
      let updatedInventory = [...prev.inventoryMinions];
      let updatedRooms = [...prev.rooms];

      if (capturedHero) {
        const newPrisoner: Prisoner = {
          instanceId: `prisoner_raid_${Date.now()}`,
          hero: capturedHero,
          capturedAtWave: prev.wave,
          remainingHealthPercent: 100,
          affinity: 20,
          drainCount: 0,
        };
        updatedPrisoners.push(newPrisoner);
      }

      let lostMsg = '';
      if (lostCompanion) {
        const compIndex = updatedInventory.findIndex((m) => m.id === lostCompanion.id);
        if (compIndex >= 0) {
          const comp = updatedInventory[compIndex];
          if (comp.stock && comp.stock > 1) {
            updatedInventory[compIndex] = {
              ...comp,
              stock: comp.stock - 1,
            };
          } else {
            updatedInventory = updatedInventory.filter((m) => m.id !== lostCompanion.id);
          }
        }
        // Remove from rooms if deployed
        updatedRooms = updatedRooms.map((r) => ({
          ...r,
          placedMinions: r.placedMinions.filter((pm) => pm.id !== lostCompanion.id),
        }));
        lostMsg = ` [결사대원 ${lostCompanion.name} 전사 손실]`;
      }

      return {
        ...prev,
        mana: Math.max(0, prev.mana + rewardMana - target.reqMana),
        gold: prev.gold + rewardGold,
        prisoners: updatedPrisoners,
        inventoryMinions: updatedInventory,
        rooms: updatedRooms,
        nightExpeditionReady: false,
        lastExecutedRaidWave: prev.wave,
        logs: [
          {
            id: `log_raid_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'raid',
            message: `🌑 [흡정야행 완료] Wave ${prev.wave} 야행 습격 실행. ${rewardMana} MP / ${rewardGold} G 획득!${
              capturedHero ? ` [핵심 용사 ${capturedHero.name} 생포!]` : ''
            }${lostMsg} (웨이브당 1회 한정)`,
          },
          ...prev.logs,
        ],
      };
    });
    setActiveTab('dungeon');
  };

  // Skip Night Expedition
  const handleSkipRaid = () => {
    setGameState((prev) => ({
      ...prev,
      nightExpeditionReady: false,
      lastExecutedRaidWave: prev.wave,
    }));
    setActiveTab('dungeon');
  };

  // Upgrade Lord Level
  const handleUpgradeLord = () => {
    const costGold = gameState.lord.level * 400;
    const costMana = gameState.lord.level * 200;

    if (gameState.gold < costGold || gameState.mana < costMana) return;

    setGameState((prev) => ({
      ...prev,
      gold: prev.gold - costGold,
      mana: prev.mana - costMana,
      lord: {
        ...prev.lord,
        level: prev.lord.level + 1,
        baseHp: prev.lord.baseHp + 100,
        baseAttack: prev.lord.baseAttack + 20,
        baseDefense: prev.lord.baseDefense + 10,
      },
    }));
  };

  // Unlock Minion in Shop
  const handleUnlockMinion = (minionId: string) => {
    const minion = gameState.inventoryMinions.find((m) => m.id === minionId);
    if (!minion) return;

    const costGold = Math.floor(minion.costGold * 1.5);
    const costMana = Math.floor(minion.costMana * 1.5);

    if (gameState.gold < costGold || gameState.mana < costMana) return;

    setGameState((prev) => ({
      ...prev,
      gold: prev.gold - costGold,
      mana: prev.mana - costMana,
      inventoryMinions: prev.inventoryMinions.map((m) =>
        m.id === minionId ? { ...m, isUnlocked: true } : m
      ),
    }));
  };

  // Unlock Trap in Shop
  const handleUnlockTrap = (trapId: string) => {
    const trap = gameState.availableTraps.find((t) => t.id === trapId);
    if (!trap) return;

    const costGold = Math.floor(trap.costGold * 1.5);
    const costMana = Math.floor(trap.costMana * 1.5);

    if (gameState.gold < costGold || gameState.mana < costMana) return;

    setGameState((prev) => ({
      ...prev,
      gold: prev.gold - costGold,
      mana: prev.mana - costMana,
      availableTraps: prev.availableTraps.map((t) =>
        t.id === trapId ? { ...t, isUnlocked: true } : t
      ),
    }));
  };

  // Update Custom Character JPG/PNG Image Map
  const handleUpdateCustomImage = (key: string, dataUrl: string) => {
    setGameState((prev) => ({
      ...prev,
      customImages: {
        ...prev.customImages,
        [key]: dataUrl,
      },
    }));
  };

  // Reset Custom Image to default
  const handleResetCustomImage = (key: string) => {
    setGameState((prev) => {
      const nextCustom = { ...prev.customImages };
      delete nextCustom[key];
      return {
        ...prev,
        customImages: nextCustom,
      };
    });
  };

  // Update Custom Name
  const handleUpdateCustomName = (key: string, name: string) => {
    setGameState((prev) => {
      let updatedLord = prev.lord;
      let updatedAssistant = prev.assistant;
      if (key === 'lord') {
        updatedLord = { ...prev.lord, name };
      }
      if (key === 'assistant') {
        updatedAssistant = { ...prev.assistant, name };
      }

      return {
        ...prev,
        lord: updatedLord,
        assistant: updatedAssistant,
        customNames: {
          ...prev.customNames,
          [key]: name,
        },
        inventoryMinions: prev.inventoryMinions.map((m) =>
          m.id === key ? { ...m, name } : m
        ),
        availableTraps: prev.availableTraps.map((t) =>
          t.id === key ? { ...t, name } : t
        ),
      };
    });
  };

  // Reset Custom Name
  const handleResetCustomName = (key: string) => {
    setGameState((prev) => {
      const nextNames = { ...prev.customNames };
      delete nextNames[key];
      return {
        ...prev,
        customNames: nextNames,
      };
    });
  };

  // Complete Lord's Bedchamber Romance / Intimacy Encounter (One-time MP gain per hero)
  const handleCompleteChamberEncounter = (heroId: string, mpReward: number, dialogueSummary: string) => {
    setGameState((prev) => {
      const alreadyCompleted = (prev.chamberCompletedHeroIds || []).includes(heroId);
      const newReward = alreadyCompleted ? 0 : mpReward;
      const updatedCompleted = alreadyCompleted
        ? prev.chamberCompletedHeroIds || []
        : [...(prev.chamberCompletedHeroIds || []), heroId];

      return {
        ...prev,
        mana: prev.mana + newReward,
        chamberCompletedHeroIds: updatedCompleted,
        logs: [
          {
            id: `log_chamber_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'event',
            message: `🌹 [영주의 침실 밀애 완료] ${dialogueSummary}${
              newReward > 0 ? ` (영구 MP +${newReward} 획득!)` : ' (재밀애 완료)'
            }`,
          },
          ...prev.logs,
        ],
      };
    });

    if (mpReward > 0) {
      alert(`🌹 [밀애 성료] 주군과 각인 용사의 깊은 정사를 통해 영구 MP +${mpReward}를 흡수하였습니다!\n(보유 MP 상승으로 흡정야행 투사체 공격력/속도/재장전 속도 강화)`);
    }
  };

  // Add Gold Cheat/Button
  const handleAddGold = (amount: number = 10000) => {
    setGameState((prev) => ({
      ...prev,
      gold: prev.gold + amount,
    }));
  };

  // Add Mana Cheat/Button
  const handleAddMana = (amount: number = 1000) => {
    setGameState((prev) => ({
      ...prev,
      mana: prev.mana + amount,
    }));
  };

  // Reset Game Data
  const handleResetGame = () => {
    clearGameState();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-red-900 selection:text-white flex flex-col">
      {/* Top Header & Resource Bar */}
      <Header
        state={gameState}
        onOpenSettings={() => setActiveTab('custom')}
        onOpenHelp={() => setShowHelp(true)}
        onResetGame={handleResetGame}
        onToggleMute={() => setIsMuted(soundFx.toggleMute())}
        isMuted={isMuted}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Assistant Secretary Sebastian Panel */}
        <AssistantPanel
          state={gameState}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
        />

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800">
          <button
            id="tab-dungeon"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('dungeon');
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'dungeon'
                ? 'bg-gradient-to-r from-red-800 to-rose-900 text-white border border-red-500/50 shadow-lg shadow-red-950'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Shield className="w-4 h-4 text-red-400" />
            <span>던전 설계 & 방어배치</span>
          </button>

          <button
            id="tab-prison"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('prison');
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap relative ${
              activeTab === 'prison'
                ? 'bg-gradient-to-r from-purple-800 to-indigo-900 text-white border border-purple-500/50 shadow-lg shadow-purple-950'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Lock className="w-4 h-4 text-purple-400" />
            <span>지하 감옥 ({gameState.prisoners.length})</span>
            {gameState.prisoners.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping absolute top-1 right-1" />
            )}
          </button>

          <button
            id="tab-raid"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('raid');
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'raid'
                ? 'bg-gradient-to-r from-purple-900 to-slate-900 text-white border border-purple-500/50 shadow-lg shadow-purple-950'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Moon className="w-4 h-4 text-purple-300" />
            <span>흡정야행단 (5Wave)</span>
            {gameState.wave % 5 === 0 && (
              gameState.lastExecutedRaidWave === gameState.wave ? (
                <span className="text-[10px] bg-zinc-800 text-purple-300 border border-purple-500/40 px-1.5 rounded-full font-bold">
                  1회 완료
                </span>
              ) : (
                <span className="text-[10px] bg-purple-600 text-white px-1.5 rounded-full font-extrabold animate-pulse">
                  출격 가능
                </span>
              )
            )}
          </button>

          <button
            id="tab-custom"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('custom');
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'custom'
                ? 'bg-gradient-to-r from-rose-900 to-zinc-900 text-white border border-rose-500/50 shadow-lg shadow-rose-950'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-rose-400" />
            <span>커스텀 캐릭터 화랑</span>
          </button>

          <button
            id="tab-shop"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('shop');
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'shop'
                ? 'bg-gradient-to-r from-amber-900 to-zinc-900 text-white border border-amber-500/50 shadow-lg shadow-amber-950'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>어둠의 연구소 & 상점</span>
          </button>

          <button
            id="tab-chamber"
            onClick={() => {
              soundFx.playClick();
              setActiveTab('chamber');
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all whitespace-nowrap relative ${
              activeTab === 'chamber'
                ? 'bg-gradient-to-r from-rose-900 via-pink-900 to-purple-950 text-white border border-rose-500/50 shadow-lg shadow-rose-950'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-400 fill-rose-500/40 animate-pulse" />
            <span>영주의 침실</span>
            {gameState.inventoryMinions.some((m) => m.isCustomHeroMinion || m.id.startsWith('minion_converted_')) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
            )}
          </button>
        </nav>

        {/* Tab Content Views */}
        {activeTab === 'dungeon' && (
          <DungeonMapView
            state={gameState}
            onDeployMinion={handleDeployMinion}
            onRemoveMinion={handleRemoveMinion}
            onMovePlacedMinion={handleMovePlacedMinion}
            onDeployTrap={handleDeployTrap}
            onRemoveTrap={handleRemoveTrap}
            onMoveLord={handleMoveLord}
            onStartWave={handleStartWave}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            onAddGold={handleAddGold}
            onAddMana={handleAddMana}
            onOpenHumanityModal={handleOpenHumanityModal}
          />
        )}

        {activeTab === 'battle' && (
          <BattleView
            state={gameState}
            onFinishWave={handleFinishWave}
            onAddGold={handleAddGold}
            onAddMana={handleAddMana}
            onMovePlacedMinion={handleMovePlacedMinion}
            onMoveLord={handleMoveLord}
            onLordDefeated={handleLordDefeated}
            onMissionSuccess={handleMissionSuccess}
            onOpenHumanityModal={handleOpenHumanityModal}
          />
        )}

        {activeTab === 'prison' && (
          <PrisonView
            state={gameState}
            onDrainBlood={handleDrainBlood}
            onRansomPrisoner={handleRansomPrisoner}
            onConvertMinion={handleConvertMinion}
            onTriggerBLEvent={handleTriggerBLEvent}
          />
        )}

        {activeTab === 'raid' && (
          <NightExpeditionView
            state={gameState}
            onExecuteRaid={handleExecuteRaid}
            onSkipRaid={handleSkipRaid}
          />
        )}

        {activeTab === 'custom' && (
          <CustomImageManager
            state={gameState}
            onUpdateCustomImage={handleUpdateCustomImage}
            onResetCustomImage={handleResetCustomImage}
            onUpdateCustomName={handleUpdateCustomName}
            onResetCustomName={handleResetCustomName}
          />
        )}

        {activeTab === 'shop' && (
          <ShopView
            state={gameState}
            onUpgradeLord={handleUpgradeLord}
            onUnlockMinion={handleUnlockMinion}
            onUnlockTrap={handleUnlockTrap}
          />
        )}

        {activeTab === 'chamber' && (
          <BedchamberView
            state={gameState}
            onCompleteChamberEncounter={handleCompleteChamberEncounter}
          />
        )}
      </main>

      {/* BL Event Choice Modal */}
      {activeBLEventPrisoner && (
        <BLEventModal
          state={gameState}
          prisoner={activeBLEventPrisoner}
          onClose={() => setActiveBLEventPrisoner(null)}
          onChoiceSelected={handleBLEventChoice}
        />
      )}

      {/* 3-Drains Blood Imprint Event Modal */}
      {activeImprintPrisoner && (
        <ImprintEventModal
          state={gameState}
          prisoner={activeImprintPrisoner}
          onCompleteImprint={handleCompleteImprint}
        />
      )}

      {/* Unimprinted Minion Conversion Confirmation Modal */}
      {pendingConversionPrisoner && (
        <UnimprintedConversionConfirmModal
          prisoner={pendingConversionPrisoner}
          lord={gameState.lord}
          customImages={gameState.customImages}
          customNames={gameState.customNames}
          onConfirm={() => {
            const p = pendingConversionPrisoner;
            setPendingConversionPrisoner(null);
            executeMinionConversion(p);
          }}
          onCancel={() => setPendingConversionPrisoner(null)}
        />
      )}

      {/* Humanity Restoration Confirmation Modal */}
      <HumanityModal
        isOpen={isHumanityModalOpen}
        onClose={() => setIsHumanityModalOpen(false)}
        onConfirmYes={handleHumanityConfirmYes}
      />

      {/* True Ending: Humanity Restored & Dimensional Shift Modal */}
      <HumanityEndingModal
        isOpen={isHumanityEndingOpen}
        state={gameState}
        onRestart={handleRestartAfterHumanityEnding}
      />

      {/* Wave 30 Mission Success & Imprinted Hero Inheritance Modal */}
      <MissionSuccessModal
        isOpen={isMissionSuccessModalOpen}
        state={gameState}
        settlementData={missionSuccessSettlementData}
        onConfirmInherit={handleConfirmInherit}
      />

      {/* Game Over Modal (Stat Inheritance & Restart) */}
      <GameOverModal
        isOpen={isGameOverModalOpen}
        state={gameState}
        onRestartGame={handleGameOverRestart}
      />

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-4 text-center text-xs text-zinc-500">
        <p>네버엔딩 메탈 디펜스 (Neverending Metal Defense) • Dungeon Castle Simulation</p>
      </footer>
    </div>
  );
}
