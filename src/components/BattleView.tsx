import React, { useState, useEffect, useRef } from 'react';
import { GameState, ActiveHero, Hero, DungeonRoom, Prisoner, RankType } from '../types';
import { initialHeroesCatalog } from '../data/defaultData';
import { soundFx } from '../utils/audio';
import { CastleMapView } from './CastleMapView';
import {
  Swords,
  ShieldAlert,
  Zap,
  Skull,
  Lock,
  Crown,
  Droplet,
  Coins,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';

interface BattleViewProps {
  state: GameState;
  onFinishWave: (rewards: {
    goldGained: number;
    manaGained: number;
    capturedPrisoners: Prisoner[];
    logs: string[];
    updatedRooms?: DungeonRoom[];
  }) => void;
  onLordDefeated?: () => void;
  onMissionSuccess?: (rewards: {
    goldGained: number;
    manaGained: number;
    capturedPrisoners: Prisoner[];
    logs: string[];
    updatedRooms?: DungeonRoom[];
  }) => void;
  onAddGold?: (amount: number) => void;
  onAddMana?: (amount: number) => void;
  onMovePlacedMinion?: (fromRoomId: string, instanceId: string, toRoomId: string) => void;
  onMoveLord?: (roomId: string) => void;
  onOpenHumanityModal?: () => void;
}

export const BattleView: React.FC<BattleViewProps> = ({
  state,
  onFinishWave,
  onLordDefeated,
  onMissionSuccess,
  onAddGold,
  onAddMana,
  onMovePlacedMinion,
  onMoveLord,
  onOpenHumanityModal,
}) => {
  const [activeHeroes, setActiveHeroes] = useState<ActiveHero[]>([]);
  const [battleStep, setBattleStep] = useState<number>(0);
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  const [goldEarned, setGoldEarned] = useState<number>(0);
  const [manaEarned, setManaEarned] = useState<number>(0);
  const [newCaptured, setNewCaptured] = useState<Prisoner[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [showSettlementModal, setShowSettlementModal] = useState<boolean>(false);
  const [currentRooms, setCurrentRooms] = useState<DungeonRoom[]>(state.rooms);
  const [lordCurrentHp, setLordCurrentHp] = useState<number>(state.lord.baseHp);
  const [isLordDead, setIsLordDead] = useState<boolean>(false);
  const [animatingRooms, setAnimatingRooms] = useState<{
    [roomId: string]: {
      type: 'combat' | 'trap';
      trapType?: string;
      damageText?: string;
    };
  }>({});

  const trapTriggerCountsRef = useRef<Record<string, number>>({});
  const hitMinionIdsRef = useRef<Set<string>>(new Set());

  // Initialize Invading Hero Party starting at Entrance Hall (1-on-1 invasion) & Start 300 Epic Rock BGM
  useEffect(() => {
    soundFx.playBattleRockBgm();
    trapTriggerCountsRef.current = {};
    hitMinionIdsRef.current.clear();
    setCurrentRooms(state.rooms);
    setLordCurrentHp(state.lord.baseHp);
    setIsLordDead(false);
    const spawned: ActiveHero[] = [];
    // 1. Invading hero party total capacity cap: Maximum 11 units per wave
    const MAX_INVADERS = 11;

    // Leader hero count scales gradually with wave progress (Wave 1~6: 1, Wave 7~18: 1~2, Wave 19+: 2~3)
    const maxLeaderCount = Math.min(3, Math.max(1, 1 + Math.floor(((state.wave - 1) * 2) / 29)));

    // Non-rookie prisoners cannot appear in new waves
    const prisonerHeroIds = new Set(
      state.prisoners
        .filter((p) => p.hero.id !== 'h_rookie' && !p.hero.name.includes('루키') && !p.hero.name.includes('카일'))
        .map((p) => p.hero.id)
    );
    const prisonerHeroNames = new Set(
      state.prisoners
        .filter((p) => p.hero.id !== 'h_rookie' && !p.hero.name.includes('루키') && !p.hero.name.includes('카일'))
        .map((p) => p.hero.name)
    );

    // Converted allies & Imprinted heroes & Inherited heroes cannot appear as enemies
    const allyHeroIds = new Set<string>();
    const allyHeroNames = new Set<string>();

    state.inventoryMinions.forEach((m) => {
      if (m.isCustomHeroMinion || m.isImprinted) {
        if (m.originalHeroId) allyHeroIds.add(m.originalHeroId);
        if (m.originalHeroName) allyHeroNames.add(m.originalHeroName);
        const stripped = m.name.replace('개조된 ', '').replace('아군이 된 ', '');
        allyHeroNames.add(stripped);
      }
    });

    state.rooms.forEach((r) => {
      r.placedMinions.forEach((m) => {
        if (m.isCustomHeroMinion || m.isImprinted) {
          if (m.originalHeroId) allyHeroIds.add(m.originalHeroId);
          if (m.originalHeroName) allyHeroNames.add(m.originalHeroName);
          const stripped = m.name.replace('개조된 ', '').replace('아군이 된 ', '');
          allyHeroNames.add(stripped);
        }
      });
    });

    if (state.convertedHeroIds) {
      state.convertedHeroIds.forEach((id) => allyHeroIds.add(id));
    }
    if (state.imprintedHeroIds) {
      state.imprintedHeroIds.forEach((id) => allyHeroIds.add(id));
    }
    if (state.inheritedHeroIds) {
      state.inheritedHeroIds.forEach((id) => allyHeroIds.add(id));
    }

    const isHeroAvailableForSpawn = (hero: Hero, currentSpawnedList: Hero[]): boolean => {
      if (hero.isNightRaidOnly) return false; // Only encountered and captured via Night Hunt!
      if (state.imprintedHeroIds?.includes(hero.id)) return false; // Imprinted heroes never spawn as enemy!
      if (state.inheritedHeroIds?.includes(hero.id)) return false; // Inherited heroes never spawn as enemy!
      if (state.convertedHeroIds?.includes(hero.id)) return false;

      const isRookie = hero.id === 'h_rookie' || hero.name.includes('루키') || hero.name.includes('카일');
      if (isRookie) return true; // Rookie can spawn infinitely

      if (prisonerHeroIds.has(hero.id) || prisonerHeroNames.has(hero.name)) return false;
      if (allyHeroIds.has(hero.id) || allyHeroNames.has(hero.name)) return false;
      if (currentSpawnedList.some((s) => s.id === hero.id || s.name === hero.name)) return false;

      return true;
    };

    const selectedLeaderHeroes: Hero[] = [];
    for (let i = 0; i < maxLeaderCount; i++) {
      let heroTemplate: Hero;
      if (state.wave >= 2 && Math.random() < 0.6) {
        const availableBL = initialHeroesCatalog.filter((h) => h.isBLHero && isHeroAvailableForSpawn(h, selectedLeaderHeroes));
        if (availableBL.length > 0) {
          heroTemplate = availableBL[Math.floor(Math.random() * availableBL.length)];
        } else {
          const availableAll = initialHeroesCatalog.filter((h) => isHeroAvailableForSpawn(h, selectedLeaderHeroes));
          heroTemplate = availableAll[Math.floor(Math.random() * availableAll.length)] || initialHeroesCatalog[0];
        }
      } else if (state.wave >= 4) {
        const availableAll = initialHeroesCatalog.filter((h) => isHeroAvailableForSpawn(h, selectedLeaderHeroes));
        heroTemplate = availableAll[Math.floor(Math.random() * availableAll.length)] || initialHeroesCatalog[0];
      } else {
        const lowerRanks = initialHeroesCatalog.filter(
          (h) => (h.rank === 'Bronze' || h.rank === 'Silver') && isHeroAvailableForSpawn(h, selectedLeaderHeroes)
        );
        heroTemplate =
          lowerRanks[Math.floor(Math.random() * lowerRanks.length)] ||
          initialHeroesCatalog.find((h) => isHeroAvailableForSpawn(h, selectedLeaderHeroes)) ||
          initialHeroesCatalog[0];
      }
      selectedLeaderHeroes.push(heroTemplate);
    }

    // Reference templates for bulk units
    const rookieTemplate = initialHeroesCatalog.find((h) => h.id === 'h_rookie') || initialHeroesCatalog[0];
    const ethanTemplate = initialHeroesCatalog.find((h) => h.id === 'h_paladin_apprentice') || initialHeroesCatalog[1];

    const rawArmedSoldiers: ActiveHero[] = [];
    const rawSilverKnights: ActiveHero[] = [];
    const leaderHeroes: ActiveHero[] = [];

    // Bodyguard generation rules per leader:
    // - Bronze: 0 armed soldiers, 0 silver knights
    // - Silver: 3 armed soldiers, 0 silver knights
    // - Gold: 5 armed soldiers, 1 silver knight
    // - Platinum: 7 armed soldiers, 2 silver knights
    // - Royal: 8 armed soldiers, 2 silver knights
    selectedLeaderHeroes.forEach((h, hIdx) => {
      let soldierCount = 0;
      let knightCount = 0;

      if (h.rank === 'Silver') {
        soldierCount = 3;
        knightCount = 0;
      } else if (h.rank === 'Gold') {
        soldierCount = 5;
        knightCount = 1;
      } else if (h.rank === 'Platinum') {
        soldierCount = 7;
        knightCount = 2;
      } else if (h.rank === 'Royal') {
        soldierCount = 8;
        knightCount = 2;
      }

      // Armed Soldiers (무장병): Rookie equivalent (40 HP, 18 ATK, 3 DEF)
      for (let s = 0; s < soldierCount; s++) {
        rawArmedSoldiers.push({
          id: 'escort_soldier',
          name: `무장병 (${h.name} 호위 #${s + 1})`,
          title: '선봉 호위 무장병',
          rank: 'Bronze',
          hp: 40,
          maxHp: 40 + (state.wave - 1) * 10,
          attack: 18 + (state.wave - 1) * 5,
          defense: 3 + (state.wave - 1) * 2,
          speed: 8,
          goldReward: 30 + state.wave * 15,
          manaPurity: 10,
          description: '용사를 호위하며 최선봉에서 진격하는 제국 무장병 (루키 모험가급 능력치)',
          imageUrl: rookieTemplate.imageUrl,
          isBulkUnit: true,
          instanceId: `soldier_${Date.now()}_${hIdx}_${s}`,
          currentHp: 40 + (state.wave - 1) * 10,
          currentRoomIndex: 0,
          currentRoomId: 'r_entrance',
          pathHistory: ['r_entrance'],
          sameRoomStayCount: 1,
          totalMovesCount: 0,
          status: 'Infiltrating',
        });
      }

      // Silver Knights (실버 기사): Ethan equivalent (110 HP, 38 ATK, 22 DEF)
      for (let k = 0; k < knightCount; k++) {
        rawSilverKnights.push({
          id: 'escort_silver_knight',
          name: `실버 기사 (${h.name} 호위 #${k + 1})`,
          title: '정예 호위 성기사',
          rank: 'Silver',
          hp: 110,
          maxHp: 110 + (state.wave - 1) * 10,
          attack: 38 + (state.wave - 1) * 5,
          defense: 22 + (state.wave - 1) * 3,
          speed: 7,
          goldReward: 80 + state.wave * 25,
          manaPurity: 25,
          description: '고위 용사를 호위하는 정예 실버 기사 (에단과 동등한 능력치)',
          imageUrl: ethanTemplate.imageUrl,
          isBulkUnit: true,
          instanceId: `knight_${Date.now()}_${hIdx}_${k}`,
          currentHp: 110 + (state.wave - 1) * 10,
          currentRoomIndex: 0,
          currentRoomId: 'r_entrance',
          pathHistory: ['r_entrance'],
          sameRoomStayCount: 1,
          totalMovesCount: 0,
          status: 'Infiltrating',
        });
      }

      // Leader Hero
      leaderHeroes.push({
        ...h,
        instanceId: `invader_${Date.now()}_${hIdx}`,
        currentHp: h.hp + (state.wave - 1) * 10,
        maxHp: h.hp + (state.wave - 1) * 10,
        attack: h.attack + (state.wave - 1) * 5,
        defense: h.defense + (state.wave - 1) * 3,
        currentRoomIndex: 0,
        currentRoomId: 'r_entrance',
        pathHistory: ['r_entrance'],
        sameRoomStayCount: 1,
        totalMovesCount: 0,
        status: 'Infiltrating',
      });
    });

    // Enforce MAX_INVADERS (11) total party unit cap:
    // Retain all leader heroes and fill the rest of the available slots with knights and soldiers.
    const maxEscortCapacity = Math.max(0, MAX_INVADERS - leaderHeroes.length);
    
    // Allocate knights and soldiers into the remaining escort capacity
    const silverKnights = rawSilverKnights.slice(0, maxEscortCapacity);
    const remainingForSoldiers = Math.max(0, maxEscortCapacity - silverKnights.length);
    const armedSoldiers = rawArmedSoldiers.slice(0, remainingForSoldiers);

    // Marching Order:
    // "무장병이 먼저 진입한 후 계급이 높은 용사가 마지막 진입한다."
    const rankWeight: Record<RankType, number> = {
      Bronze: 1,
      Silver: 2,
      Gold: 3,
      Platinum: 4,
      Royal: 5,
    };
    leaderHeroes.sort((a, b) => (rankWeight[a.rank] || 1) - (rankWeight[b.rank] || 1));

    // Strictly capped at MAX_INVADERS (11)
    const finalSpawned: ActiveHero[] = [...armedSoldiers, ...silverKnights, ...leaderHeroes].slice(0, MAX_INVADERS);

    setActiveHeroes(finalSpawned);
    const leaderNames = leaderHeroes.map((h) => state.customNames?.[h.id] || h.name).join(', ');
    setBattleLogs([
      `⚔️ [경보 Wave ${state.wave}] 용사단 ${leaderHeroes.length}인 및 호위 무장병 ${armedSoldiers.length}명, 실버 기사 ${silverKnights.length}명 (총 ${finalSpawned.length}명 / 최대 11명 상한)이 미궁 입구에 진입했습니다! (선봉 무장병 진입 ➔ 후방 지휘 용사 [${leaderNames}] 순차 진격)`,
    ]);

    return () => {
      soundFx.stopBattleRockBgm();
    };
  }, [state.wave]);

  // Automatic Turn Progression Loop (침입 속도: 약 2.2초 타이머 간격)
  useEffect(() => {
    if (activeHeroes.length === 0 || isFinished) return;

    const autoTimer = setTimeout(() => {
      handleNextStep();
    }, 2200);

    return () => clearTimeout(autoTimer);
  }, [activeHeroes, isFinished, battleStep]);

  // Helper: Hero escape probability based on character identity
  const getHeroEscapeProbability = (h: Hero): number => {
    const hId = h.id;
    const hName = h.name;
    if (hId === 'h_rookie' || hName.includes('카일') || hName.includes('루키')) return 0.20; // 카일 20%
    if (hId === 'h_paladin_apprentice' || hName.includes('에단')) return 0.50; // 에단 50%
    if (hId === 'h_bl_prince' || hName.includes('에스테르') || hName.includes('루시안')) return 0.70; // 에스테르 70%
    if (hId === 'h_bl_knight_commander' || hName.includes('다벤포트') || hName.includes('제프리')) return 0.80; // 다벤포트 80%
    if (hId === 'h_royal_archmage' || hName.includes('테오도르')) return 0.90; // 테오도르 90%
    return 0.50;
  };

  // Turn Simulation Loop
  const handleNextStep = () => {
    if (isFinished) return;

    soundFx.playBattleClash();

    let stepLogs: string[] = [];
    let addedGold = 0;
    let addedMana = 0;
    const addedCaptured: Prisoner[] = [];
    const newAnims: typeof animatingRooms = {};
    let updatedRoomsForTurn = [...currentRooms];

    const claimedRoomIds = new Set<string>();
    const heroIdsWhoMovedOut = new Set<string>();

    const isEntranceRoomId = (roomId: string) => {
      const roomObj = state.rooms.find((r) => r.id === roomId);
      return roomId === 'r_entrance' || roomObj?.isEntrance === true;
    };

    const isRoomAvailable = (targetRoomId: string, currentHeroInstanceId: string) => {
      if (isEntranceRoomId(targetRoomId)) return true;
      if (claimedRoomIds.has(targetRoomId)) return false;

      const currentlyOccupiedByOther = activeHeroes.some(
        (ah) =>
          ah.instanceId !== currentHeroInstanceId &&
          (ah.status === 'Infiltrating' || ah.status === 'Fighting' || ah.status === 'Trapped') &&
          ah.currentRoomId === targetRoomId &&
          !heroIdsWhoMovedOut.has(ah.instanceId)
      );
      if (currentlyOccupiedByOther) return false;

      return true;
    };

    // Calculate Lord's Long-Range Support Magic Attack Targets
    // Requirement:
    // - Lv. 5+: Targets 1 room with enemies in order: GOLD > PRISON > MP (성소)
    // - Lv. 10+: Targets up to 2 rooms simultaneously with enemies in order: GOLD > PRISON > MP
    // - Attack power = 50% of Lord's total attack power
    const lordLevel = state.lord.level;
    const manaBonus = Math.floor(Math.sqrt(state.mana) * 3);
    const lordAtk = state.lord.baseAttack + manaBonus;
    const lordName = state.customNames?.['lord'] || state.lord.name;

    const targetedSupportRoomIds = new Set<string>();
    let runningLordHp = lordCurrentHp;

    if (lordLevel >= 5) {
      const maxSupportTargets = lordLevel >= 10 ? 2 : 1;
      const supportPriorityTypes: ('GOLD' | 'PRISON' | 'MP')[] = ['GOLD', 'PRISON', 'MP'];

      for (const destType of supportPriorityTypes) {
        const targetRoomObj = state.rooms.find(
          (r) =>
            r.destinationType === destType ||
            (destType === 'GOLD' && r.id === 'r_gold') ||
            (destType === 'PRISON' && r.id === 'r_prison') ||
            (destType === 'MP' && r.id === 'r_mp')
        );

        if (targetRoomObj) {
          const hasLivingEnemy = activeHeroes.some(
            (h) =>
              (h.status === 'Infiltrating' || h.status === 'Fighting' || h.status === 'Trapped') &&
              h.currentRoomId === targetRoomObj.id &&
              h.currentHp > 0
          );

          if (hasLivingEnemy) {
            targetedSupportRoomIds.add(targetRoomObj.id);
            if (targetedSupportRoomIds.size >= maxSupportTargets) break;
          }
        }
      }
    }

    const updatedHeroes = activeHeroes.map((hero) => {
      // Skip inactive heroes
      if (
        hero.status === 'Defeated' ||
        hero.status === 'Captured' ||
        hero.status === 'ReachedGold' ||
        hero.status === 'ReachedPrison' ||
        hero.status === 'ReachedMP'
      ) {
        return hero;
      }

      const room = state.rooms.find((r) => r.id === hero.currentRoomId) || state.rooms[0];
      if (!room) {
        return { ...hero, status: 'ReachedMP' as const };
      }

      let hp = hero.currentHp;
      let status = hero.status;
      const heroName = state.customNames?.[hero.id] || hero.name;

      let hadCombatInRoom = false;
      let hadTrapInRoom = false;

      // 1. Trap Mechanism Triggers (Monsters are IMMUNE to traps! Every trap triggers ONLY 1 TURN per wave)
      room.placedTraps.forEach((trap) => {
        const isSpike = trap.id.includes('spike') || trap.name.includes('가시');
        const isPoison = trap.id.includes('poison') || trap.name.includes('독가스');
        const trapKey = `${room.id}_${trap.id}`;
        const currentTriggerCount = trapTriggerCountsRef.current[trapKey] || 0;

        if (currentTriggerCount >= 1) {
          stepLogs.push(`⚠️ [함정 발동 완료] ${room.name}의 [${trap.name}]은(는) 이번 웨이브 발동(1/1회)을 이미 소진하였습니다.`);
          return;
        }

        trapTriggerCountsRef.current[trapKey] = currentTriggerCount + 1;

        soundFx.playTrapTrigger();
        hp -= trap.damage;
        hadTrapInRoom = true;

        if (isSpike) {
          stepLogs.push(`📌 [가시 바닥 구덩이 발동] ${room.name}의 검은 타공에서 회색 침이 솟구쳐 ${heroName}에게 ${trap.damage} 피해! (웨이브당 1턴 발동 완료)`);
        } else if (isPoison) {
          stepLogs.push(`☠️ [독가스 분출구 발동] ${room.name}의 북/남 배관에서 검녹색 독가스가 분출되어 ${heroName}에게 ${trap.damage} 피해! (웨이브당 1턴 발동 완료)`);
        } else {
          stepLogs.push(`⚡ [함정 작동] ${room.name}의 [${trap.name}]! ${heroName}에게 ${trap.damage} 피해! (웨이브당 1턴 발동 완료)`);
        }

        newAnims[room.id] = {
          type: 'trap',
          trapType: trap.name,
          damageText: `-${trap.damage} HP (1턴 발동)`,
        };

        if (trap.effectType === 'ManaDrain') {
          const drained = Math.floor(trap.damage * 0.8);
          addedMana += drained;
          stepLogs.push(`🩸 [마력 수집] 함정이 ${heroName}의 혈액에서 +${drained} MP 수집!`);
        }
      });

      // 1.5 Lord's Long-Range Support Magic Attack (Lv.5+: 1 room GOLD>PRISON>MP, Lv.10+: 2 rooms simultaneously, 50% power)
      if (targetedSupportRoomIds.has(room.id) && hp > 0) {
        const supportPower = Math.floor(lordAtk * 0.5);
        const supportDmg = Math.max(15, Math.floor(supportPower - hero.defense * 0.2));
        hp -= supportDmg;

        stepLogs.push(
          `🔮 [주군 원거리 마법지원 (Lv.${lordLevel})] 주군 ${lordName}이(가) 옥좌에서 [${room.name}] 방의 침입자 ${heroName}에게 50% 위력 마법 지원 사격을 가했습니다! (-${supportDmg} HP, 남은 HP: ${Math.max(0, hp)})`
        );

        newAnims[room.id] = {
          type: 'combat',
          damageText: `🔮 지원 마법 -${supportDmg} HP`,
        };
      }

      // 2. 1-on-1 Monster Combat in this room until HP <= 0
      const activeRoom = updatedRoomsForTurn.find((r) => r.id === room.id) || room;
      const hasLivingMinionsInRoom = activeRoom.placedMinions.some((m) => m.currentHp > 0 && !m.isEscaped);

      if (hasLivingMinionsInRoom && hp > 0) {
        hadCombatInRoom = true;
        newAnims[room.id] = {
          type: 'combat',
          damageText: `1대1 맞대결 교전 중`,
        };

        const updatedMinionsInRoom = [...activeRoom.placedMinions];

        for (let i = 0; i < updatedMinionsInRoom.length; i++) {
          const minion = updatedMinionsInRoom[i];
          if (minion.currentHp <= 0 || minion.isEscaped) continue;
          if (hp <= 0) break; // Hero defeated

          const minionName = state.customNames?.[minion.id] || minion.name;
          hitMinionIdsRef.current.add(minion.instanceId);

          let currentMinionHp = minion.currentHp;

          // 1v1 battle loop until minion HP <= 0 or hero HP <= 0
          while (currentMinionHp > 0 && hp > 0) {
            // Minion attacks Hero
            const minionAtkDmg = Math.max(5, minion.attack - hero.defense);
            hp -= minionAtkDmg;
            stepLogs.push(`👹 [1대1 교전] ${minionName}이(가) ${heroName}에게 ${minionAtkDmg} 피해! (용사 남은 HP: ${Math.max(0, hp)}/${hero.maxHp})`);

            if (hp <= 0) break;

            // Hero attacks Minion back
            const heroCounterAtk = Math.max(8, Math.floor(hero.attack * 0.8 - minion.defense / 2));
            currentMinionHp -= heroCounterAtk;
            stepLogs.push(`💥 [1대1 교전] 용사 ${heroName}의 일격! [${minionName}] 체력 -${heroCounterAtk} (남은 HP: ${Math.max(0, currentMinionHp)}/${minion.maxHp})`);
          }

          if (currentMinionHp <= 0) {
            // Minion defeated -> 50% chance to escape!
            const escapeSuccess = Math.random() < 0.50;
            if (escapeSuccess) {
              stepLogs.push(
                `🏃💨 [하수인 도망 성공 (50%)] [${minionName}]이(가) 체력이 0이 되었으나 50% 확률로 무사히 후방으로 도망쳤습니다! 다음 웨이브 때 회복되어 복귀합니다.`
              );
              updatedMinionsInRoom[i] = {
                ...minion,
                currentHp: 0,
                isEscaped: true,
              };
            } else {
              stepLogs.push(
                `💀 [하수인 소멸 (도망 실패 50%)] 용사 ${heroName}의 공격에 하수인 [${minionName}]이(가) 도망치지 못하고 2번 점멸 후 소멸했습니다!`
              );
              updatedMinionsInRoom[i] = {
                ...minion,
                currentHp: 0,
                isEscaped: false,
              };
            }
          } else {
            updatedMinionsInRoom[i] = {
              ...minion,
              currentHp: currentMinionHp,
            };
          }
        }

        updatedRoomsForTurn = updatedRoomsForTurn.map((r) =>
          r.id === room.id
            ? {
                ...r,
                placedMinions: updatedMinionsInRoom.filter((m) => m.currentHp > 0 || m.isEscaped),
              }
            : r
        );
      }

      // 3. Vampire Lord 1v1 Combat if Lord is in this room and Hero still alive!
      if (room.hasLord && hp > 0 && runningLordHp > 0) {
        hadCombatInRoom = true;
        newAnims[room.id] = {
          type: 'combat',
          damageText: `주군 1대1 교전`,
        };

        const manaBonus = Math.floor(Math.sqrt(state.mana) * 3);
        const lordAtk = state.lord.baseAttack + manaBonus;
        const lordName = state.customNames?.['lord'] || state.lord.name;

        while (hp > 0 && runningLordHp > 0) {
          const lordDmg = Math.max(30, Math.floor(lordAtk * 1.2 - hero.defense));
          hp -= lordDmg;
          stepLogs.push(`👑 [주군 1대1 강림] 주군 ${lordName}의 압도적 일격! ${heroName}에게 ${lordDmg} 피해! (남은 HP: ${Math.max(0, hp)})`);

          const lordDrain = Math.floor(hero.manaPurity * 0.5);
          addedMana += lordDrain;

          if (hp > 0) {
            const heroCounterDmg = Math.max(12, Math.floor(hero.attack * 0.9 - state.lord.baseDefense / 2));
            runningLordHp -= heroCounterDmg;
            stepLogs.push(`⚔️ [주군 피격] ${heroName}의 결사적 반격! 주군 ${lordName}에게 ${heroCounterDmg} 피해! (주군 남은 체력: ${Math.max(0, runningLordHp)}/${state.lord.baseHp})`);

            if (runningLordHp <= 0) {
              runningLordHp = 0;
              stepLogs.push(`💀 [주군 전사] 주군 ${lordName}의 체력이 0이 되어 전사하였습니다! 마왕성이 함락됩니다.`);
              break;
            }
          }
        }
      }

      // Check if Lord died during this clash
      if (runningLordHp <= 0) {
        runningLordHp = 0;
        setLordCurrentHp(0);
        setIsLordDead(true);
        setIsFinished(true);
        soundFx.stopBattleRockBgm();
        soundFx.playDefeat();
        if (onLordDefeated) {
          onLordDefeated();
        }
      }

      // Check Hero Defeat / Capture / Escape
      if (hp <= 0 || (hp < hero.maxHp * 0.35 && room.placedTraps.some((t) => t.effectType === 'CaptureBoost'))) {
        if (hero.isBulkUnit) {
          // Bulk unit (Armed Soldier / Silver Knight) defeated -> spoils rewarded, disappears, not captured to prison
          status = 'Defeated';
          const earnedGold = Math.floor(hero.goldReward);
          const earnedMana = Math.floor(hero.manaPurity);
          addedGold += earnedGold;
          addedMana += earnedMana;
          stepLogs.push(
            `💀 [호위병 격파] 용사단의 [${heroName}]이(가) 쓰러져 소멸했습니다! (+${earnedGold} G, +${earnedMana} MP 획득)`
          );
        } else {
          const escapeChance = getHeroEscapeProbability(hero);
          const fullCaptureGold = hero.goldReward * 2 + state.wave * 100;
          const fullCaptureMana = hero.manaPurity + Math.floor(hero.maxHp * 0.5);

          if (Math.random() < escapeChance) {
            // Successfully escaped towards village (Left)
            status = 'Defeated';
            const ratio = 0.08 + Math.random() * 0.04;
            const earnedGold = Math.floor(fullCaptureGold * ratio);
            const earnedMana = Math.floor(fullCaptureMana * ratio);

            addedGold += earnedGold;
            addedMana += earnedMana;
            stepLogs.push(
              `🏃💨 [용사 마을 도망 성공 (확률 ${(escapeChance * 100).toFixed(0)}%)] ${heroName}이(가) HP가 0이 되자 좌측 마을 방향으로 재빨리 도망쳤습니다! 전리품 보상: +${earnedGold} Gold, +${earnedMana} MP`
            );
          } else {
            // Failed to escape -> Captured to Prison!
            status = 'Captured';
            soundFx.playBloodDrain();
            stepLogs.push(
              `⛓️ [포획 성공 (도망 실패 확률 ${((1 - escapeChance) * 100).toFixed(0)}%)] ${heroName}이(가) 도망치는데 실패하여 지하 감옥에 수감되었습니다!`
            );

            addedCaptured.push({
              instanceId: hero.instanceId,
              hero: hero,
              capturedAtWave: state.wave,
              remainingHealthPercent: Math.max(10, Math.floor((hp / hero.maxHp) * 100)),
              affinity: hero.isBLHero ? 20 : 0,
            });
          }
        }
      } else {
        // Hero survived
        const stayCount = hero.sameRoomStayCount || 1;
        const moveCount = hero.totalMovesCount || 0;

        // If hero had combat or triggered a trap in this room in this step, STAY in this room for this step so hero and trap/monster clash together!
        if (hadCombatInRoom || hadTrapInRoom) {
          if (!isEntranceRoomId(hero.currentRoomId)) {
            claimedRoomIds.add(hero.currentRoomId);
          }
          return {
            ...hero,
            currentHp: Math.max(0, hp),
            currentRoomId: room.id,
            sameRoomStayCount: stayCount + 1,
            totalMovesCount: moveCount,
            status: status as any,
          };
        }

        // Otherwise (no living monsters/lord in this room or combat completed previously), advance to next room
        if (room.isDestination) {
          const roomInState = updatedRoomsForTurn.find((r) => r.id === room.id) || room;
          const livingGuards = roomInState.placedMinions.filter((m) => m.currentHp > 0 && !m.isEscaped);
          const hasLordGuard = roomInState.hasLord;

          if (room.destinationType === 'GOLD') {
            status = 'ReachedGold';
            if (livingGuards.length > 0 || hasLordGuard) {
              const gName = hasLordGuard
                ? (state.customNames?.['lord'] || state.lord.name)
                : (state.customNames?.[livingGuards[0].id] || livingGuards[0].name);
              stepLogs.push(
                `🛡️ [방어 성공] ${heroName}이(가) GOLD 성소 금고에 도달했으나, 방을 지키는 수호자 [${gName}]이(가) 죽거나 도망치지 않고 버텨내어 골드 감소가 발생하지 않았습니다!`
              );
            } else {
              const loss = 100 * state.wave;
              addedGold -= loss;
              stepLogs.push(
                `🚨 [골드 감소] GOLD 성소를 지키는 수호자가 소멸/도망쳤습니다! ${heroName}이(가) 금고를 털어 황금 -${loss} Gold 감소!`
              );
            }
          } else if (room.destinationType === 'PRISON') {
            status = 'ReachedPrison';
            if (livingGuards.length > 0 || hasLordGuard) {
              const gName = hasLordGuard
                ? (state.customNames?.['lord'] || state.lord.name)
                : (state.customNames?.[livingGuards[0].id] || livingGuards[0].name);
              stepLogs.push(
                `🛡️ [방어 성공] ${heroName}이(가) PRISON 지하 감옥에 도달했으나, 방을 지키는 수호자 [${gName}]이(가) 죽거나 도망치지 않고 버텨내어 수비 자원/포로 감소가 발생하지 않았습니다!`
              );
            } else {
              const loss = 150 * state.wave;
              addedGold -= loss;
              stepLogs.push(
                `🚨 [포획 자원 감소] PRISON 감옥을 지키는 수호자가 소멸/도망쳤습니다! ${heroName}이(가) 감옥을 습격하여 수비 자원 -${loss} Gold 감소!`
              );
            }
          } else if (room.destinationType === 'MP') {
            status = 'ReachedMP';
            if (livingGuards.length > 0 || hasLordGuard) {
              const gName = hasLordGuard
                ? (state.customNames?.['lord'] || state.lord.name)
                : (state.customNames?.[livingGuards[0].id] || livingGuards[0].name);
              stepLogs.push(
                `🛡️ [방어 성공] ${heroName}이(가) MP 마력 대성소에 도달했으나, 방을 지키는 수호자 [${gName}]이(가) 죽거나 도망치지 않고 버텨내어 마력 감소가 발생하지 않았습니다!`
              );
            } else {
              const loss = 80 * state.wave;
              addedMana -= loss;
              stepLogs.push(
                `🚨 [마력 감소] MP 성소를 지키는 수호자가 소멸/도망쳤습니다! ${heroName}이(가) 마력 대성소를 탈취하여 마력 -${loss} MP 감소!`
              );
            }
          }
        } else {
          if (moveCount > 11) {
            stepLogs.push(
              `🚨🏃💨 [미궁 완전 탈출] ${heroName}이(가) 누적 이동 11회 초과(${moveCount}회)로 입구 도착 여부와 상관없이 미궁을 성공적으로 탈출(도주)했습니다!`
            );
            return {
              ...hero,
              currentHp: Math.max(1, hp),
              sameRoomStayCount: stayCount + 1,
              totalMovesCount: moveCount,
              status: 'Defeated' as const,
            };
          } else if (moveCount >= 9) {
            if (room.isEntrance || room.id === 'r_entrance') {
              stepLogs.push(
                `🚨🏃💨 [마을 도주 완료] ${heroName}이(가) 미궁 속 누적 이동량(${moveCount}회) 초과로 공포에 질려 입구를 넘어 마을로 완전히 도망쳤습니다!`
              );
              return {
                ...hero,
                currentHp: Math.max(1, hp),
                sameRoomStayCount: stayCount + 1,
                totalMovesCount: moveCount,
                status: 'Defeated' as const,
              };
            } else if (room.connections.length > 0) {
              const sortedByLeft = [...room.connections]
                .map((id) => state.rooms.find((r) => r.id === id))
                .filter((r): r is DungeonRoom => r !== undefined)
                .sort((a, b) => a.x - b.x);

              const availableLeftmost = sortedByLeft.filter((r) => isRoomAvailable(r.id, hero.instanceId));

              if (availableLeftmost.length > 0) {
                const leftmostRoom = availableLeftmost[0];
                const newMoves = moveCount + 1;
                const isEscaped = newMoves > 11;

                heroIdsWhoMovedOut.add(hero.instanceId);
                if (!isEntranceRoomId(leftmostRoom.id)) {
                  claimedRoomIds.add(leftmostRoom.id);
                }

                // Check collision/combat in new room
                const nextRoomInState = updatedRoomsForTurn.find((r) => r.id === leftmostRoom.id) || leftmostRoom;
                if (
                  nextRoomInState.placedMinions.some((m) => m.currentHp > 0 && !m.isEscaped) ||
                  nextRoomInState.hasLord
                ) {
                  newAnims[leftmostRoom.id] = { type: 'combat', damageText: '1대1 맞대결 교전 중' };
                }

                return {
                  ...hero,
                  currentHp: Math.max(1, hp),
                  currentRoomId: leftmostRoom.id,
                  pathHistory: [...hero.pathHistory, leftmostRoom.id],
                  sameRoomStayCount: 1,
                  totalMovesCount: newMoves,
                  status: isEscaped ? ('Defeated' as const) : ('Infiltrating' as const),
                };
              }
            }
          } else if (room.connections.length > 0) {
            const pathHist = hero.pathHistory;
            const prevRoomId = pathHist.length >= 2 ? pathHist[pathHist.length - 2] : null;

            const availableConnected = room.connections.filter((cId) => isRoomAvailable(cId, hero.instanceId));

            if (availableConnected.length > 0) {
              let nextRoomId: string;

              if (prevRoomId && availableConnected.includes(prevRoomId) && Math.random() < 0.20) {
                nextRoomId = prevRoomId;
              } else {
                nextRoomId = availableConnected[Math.floor(Math.random() * availableConnected.length)];
              }

              const nextRoomObj = state.rooms.find((r) => r.id === nextRoomId);

              if (nextRoomObj) {
                const isSame = nextRoomId === hero.currentRoomId;
                const newMoves = isSame ? moveCount : moveCount + 1;
                const newStay = isSame ? stayCount + 1 : 1;
                const isEscaped = newMoves > 11;

                heroIdsWhoMovedOut.add(hero.instanceId);
                if (!isEntranceRoomId(nextRoomId)) {
                  claimedRoomIds.add(nextRoomId);
                }

                if (!isSame) {
                  stepLogs.push(
                    `🏃 [방 이동] 생존한 용사 ${heroName}이(가) [${nextRoomObj.name}] 방으로 진격합니다. (이동 ${newMoves}회)`
                  );
                }

                // Check collision/combat upon entering next room
                const nextRoomInState = updatedRoomsForTurn.find((r) => r.id === nextRoomId) || nextRoomObj;
                if (
                  nextRoomInState.placedMinions.some((m) => m.currentHp > 0 && !m.isEscaped) ||
                  nextRoomInState.hasLord
                ) {
                  newAnims[nextRoomId] = { type: 'combat', damageText: '1대1 맞대결 교전 중' };
                }

                return {
                  ...hero,
                  currentHp: Math.max(1, hp),
                  currentRoomId: nextRoomId,
                  pathHistory: [...hero.pathHistory, nextRoomId],
                  sameRoomStayCount: newStay,
                  totalMovesCount: newMoves,
                  status: isEscaped ? ('Defeated' as const) : ('Infiltrating' as const),
                };
              }
            }
          }

          if (!isEntranceRoomId(hero.currentRoomId)) {
            claimedRoomIds.add(hero.currentRoomId);
          }
          return {
            ...hero,
            currentHp: Math.max(0, hp),
            sameRoomStayCount: stayCount + 1,
            totalMovesCount: moveCount,
            status: status as any,
          };
        }
      }

      return {
        ...hero,
        currentHp: Math.max(0, hp),
        status: status as any,
      };
    });

    setAnimatingRooms(newAnims);
    setActiveHeroes(updatedHeroes);
    setBattleLogs((prev) => [...prev, ...stepLogs]);
    setGoldEarned((g) => g + addedGold);
    setManaEarned((m) => m + addedMana);
    setNewCaptured((c) => [...c, ...addedCaptured]);
    setLordCurrentHp(runningLordHp);
    setBattleStep((s) => s + 1);

    // Check if wave finished
    const allEnded = updatedHeroes.every(
      (h) =>
        h.status === 'Defeated' ||
        h.status === 'Captured' ||
        h.status === 'ReachedGold' ||
        h.status === 'ReachedPrison' ||
        h.status === 'ReachedMP'
    );

    if (allEnded) {
      // Apply survival stat boosts (+2 ATK, +3 MaxHP) and end-of-wave HP recovery (including escaped minions)
      const finalBoostedRooms = updatedRoomsForTurn.map((r) => ({
        ...r,
        placedMinions: r.placedMinions
          .filter((m) => m.currentHp > 0 || m.isEscaped)
          .map((m) => {
            const wasHit = hitMinionIdsRef.current.has(m.instanceId);
            let currentBonusMaxHp = m.bonusMaxHp || 0;
            let newAtk = m.attack;
            let newMaxHp = m.maxHp;

            if (wasHit) {
              currentBonusMaxHp += 3;
              newAtk += 2;
              newMaxHp += 3;
            }

            const newLevel = 1 + Math.floor(currentBonusMaxHp / 6);
            const isVampireNoble =
              m.id === 'm7_vampire_berserker' ||
              m.name.includes('혈각성') ||
              m.name.includes('흡혈 귀족');
            const baseHeal = isVampireNoble ? 60 : 30;
            const perLevelHeal = isVampireNoble ? 20 : 10;
            const levelBonusHeal = (newLevel - 1) * perLevelHeal;
            const totalHeal = baseHeal + levelBonusHeal;

            const currentHpVal = m.isEscaped ? 0 : m.currentHp;
            const newHp = Math.min(newMaxHp, currentHpVal + totalHeal);
            const mName = state.customNames?.[m.id] || m.name;

            if (m.isEscaped) {
              stepLogs.push(
                `💚 [하수인 도망 후 복귀 & 회복] 도망쳤던 [${mName}] (Lv.${newLevel})이(가) 다음 웨이브에 회복되어 복귀했습니다! (+${totalHeal} HP ➔ ${newHp}/${newMaxHp})`
              );
            } else if (wasHit) {
              stepLogs.push(
                `💪 [하수인 불굴의 성장 & 회복] 용사의 공격을 견뎌낸 [${mName}] (Lv.${newLevel})! 능력치 상승(공격력 +2 ➔ ${newAtk}, 최대 HP +3 ➔ ${newMaxHp}) 및 웨이브 완료 회복 (+${totalHeal} HP ➔ ${newHp}/${newMaxHp})`
              );
            } else {
              stepLogs.push(
                `💚 [하수인 웨이브 회복] [${mName}] (Lv.${newLevel}) 회복 완료 (+${totalHeal} HP ➔ ${newHp}/${newMaxHp})`
              );
            }

            return {
              ...m,
              attack: newAtk,
              maxHp: newMaxHp,
              hp: newMaxHp,
              bonusMaxHp: currentBonusMaxHp,
              level: newLevel,
              currentHp: newHp,
              isEscaped: false,
            };
          }),
      }));

      setCurrentRooms(finalBoostedRooms);
      setIsFinished(true);
      setShowSettlementModal(true);
      soundFx.stopBattleRockBgm();
      soundFx.playVictory();
    } else {
      setCurrentRooms(updatedRoomsForTurn);
    }
  };

  const handleConfirmFinish = () => {
    setShowSettlementModal(false);
    soundFx.playVictory();
    if (state.wave === 30 && onMissionSuccess) {
      onMissionSuccess({
        goldGained: goldEarned,
        manaGained: manaEarned,
        capturedPrisoners: newCaptured,
        logs: battleLogs,
        updatedRooms: currentRooms,
      });
    } else {
      onFinishWave({
        goldGained: goldEarned,
        manaGained: manaEarned,
        capturedPrisoners: newCaptured,
        logs: battleLogs,
        updatedRooms: currentRooms,
      });
    }
  };

  return (
    <div id="battle-view" className="space-y-6">
      {/* Wave Header Status */}
      <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-zinc-950 border border-red-800/60 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-900 text-red-100 border border-red-500/50 animate-pulse">
              LIVE WAVE {state.wave} / 30 실시간 침투 방어전
            </span>
            <span className="text-xs text-zinc-400">TURN {battleStep}</span>
          </div>
          <h2 className="text-xl font-extrabold text-zinc-100 mt-1 flex items-center gap-2">
            <Swords className="w-6 h-6 text-red-500" />
            침입자 용사단 방어 전투 진행 중
          </h2>
        </div>

        {/* Action Controls */}
        {!isFinished ? (
          <button
            id="btn-next-battle-step"
            onClick={handleNextStep}
            className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white font-extrabold text-sm shadow-xl shadow-red-950 border border-red-500/50 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95"
          >
            <span>다음 교전 진행 (턴 {battleStep + 1})</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            id="btn-finish-wave"
            onClick={handleConfirmFinish}
            className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm shadow-xl shadow-emerald-950 border border-emerald-500/50 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 animate-bounce"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>{state.wave === 30 ? '🏆 30웨이브 최종 클리어! 미션 성공' : '전투 정산 완료 & 던전 정비로 복귀'}</span>
          </button>
        )}
      </div>

      {/* Visual Live Blueprint Map during Battle */}
      <CastleMapView
        state={{ ...state, rooms: currentRooms }}
        activeHeroes={activeHeroes}
        animatingRooms={animatingRooms}
        onAddGold={onAddGold}
        onAddMana={onAddMana}
        onMovePlacedMinion={onMovePlacedMinion}
        onMoveLord={onMoveLord}
        onOpenHumanityModal={onOpenHumanityModal}
      />

      {/* Invader Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeHeroes.map((hero) => {
          const roomObj = state.rooms.find((r) => r.id === hero.currentRoomId);
          const roomName = roomObj?.name || '입구';

          return (
            <div
              key={hero.instanceId}
              className={`rounded-2xl p-4 border transition-all ${
                hero.status === 'Captured'
                  ? 'bg-purple-950/40 border-purple-500/60 ring-2 ring-purple-500/30'
                  : hero.status === 'Defeated'
                  ? 'bg-zinc-950 border-zinc-800 opacity-60'
                  : hero.status === 'ReachedGold' || hero.status === 'ReachedPrison' || hero.status === 'ReachedMP'
                  ? 'bg-amber-950/40 border-amber-500/80 ring-2 ring-amber-500/40'
                  : 'bg-zinc-900 border-red-900/50 shadow-lg shadow-red-950/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 flex-shrink-0 relative">
                  <img
                    src={state.customImages[hero.id] || hero.imageUrl}
                    alt={state.customNames?.[hero.id] || hero.name}
                    className="w-full h-full object-cover animate-breath"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-zinc-100 truncate">
                      {state.customNames?.[hero.id] || hero.name}
                    </h4>
                    <span className="text-[9px] bg-zinc-800 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-zinc-700">
                      {hero.rank}
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{hero.title}</p>

                  <div className="mt-1.5 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">위치:</span>
                    <span className="text-red-300 font-bold">{roomName}</span>
                  </div>
                </div>
              </div>

              {/* HP Bar */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>체력 (HP)</span>
                  <span className="font-mono text-zinc-200">
                    {hero.currentHp} / {hero.maxHp}
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      hero.currentHp / hero.maxHp < 0.3
                        ? 'bg-red-600'
                        : hero.currentHp / hero.maxHp < 0.6
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(0, (hero.currentHp / hero.maxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                {hero.status === 'Infiltrating' && (
                  <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                    <Swords className="w-3.5 h-3.5" /> 침투 진격 중
                  </span>
                )}
                {hero.status === 'Captured' && (
                  <span className="text-purple-300 font-bold text-[11px] flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-purple-400" /> 감옥 수감 완료!
                  </span>
                )}
                {hero.status === 'Defeated' && (
                  <span className="text-zinc-500 font-bold text-[11px] flex items-center gap-1">
                    <Skull className="w-3.5 h-3.5" /> 격퇴 처단됨
                  </span>
                )}
                {hero.status === 'ReachedGold' && (
                  <span className="text-amber-300 font-bold text-[11px] flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" /> GOLD 침범! (자원 손실)
                  </span>
                )}
                {hero.status === 'ReachedPrison' && (
                  <span className="text-purple-300 font-bold text-[11px] flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-purple-400" /> PRISON 침범! (자원 손실)
                  </span>
                )}
                {hero.status === 'ReachedMP' && (
                  <span className="text-red-300 font-bold text-[11px] flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5 text-red-400" /> MP 침범! (마력 손실)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Battle Live Combat Log */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-3">
        <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          실시간 던전 전투 로그
        </h3>

        <div className="bg-black/80 rounded-xl p-4 h-48 overflow-y-auto space-y-1.5 font-mono text-xs text-zinc-300 border border-zinc-900 shadow-inner">
          {battleLogs.map((log, idx) => (
            <div key={`log_${idx}`} className="leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* Battle Result Settlement Popup Modal */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-zinc-900 via-purple-950/80 to-zinc-950 border-2 border-purple-500/60 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
            {/* Top Right Close 'X' Button */}
            <button
              id="btn-close-settlement-x"
              onClick={handleConfirmFinish}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors shadow-lg"
              title="정산 창 닫기 (X)"
            >
              <X className="w-6 h-6 text-zinc-300" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-purple-900/60 pb-4">
              <Crown className="w-8 h-8 text-amber-400 animate-bounce" />
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">WAVE {state.wave} 방어전 완료</span>
                <h3 className="text-xl font-black text-purple-100">던전 방어 전투 정산 보고서</h3>
              </div>
            </div>

            {/* Settlement Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-zinc-900/90 p-4 rounded-2xl border border-amber-500/40 text-center">
                <Coins className="w-7 h-7 text-amber-400 mx-auto mb-1" />
                <div className="text-[11px] text-zinc-400 font-bold">골드 정산</div>
                <div className={`text-base font-black font-mono mt-0.5 ${goldEarned >= 0 ? 'text-amber-300' : 'text-red-400'}`}>
                  {goldEarned >= 0 ? `+${goldEarned}` : goldEarned} G
                </div>
              </div>

              <div className="bg-zinc-900/90 p-4 rounded-2xl border border-red-500/40 text-center">
                <Droplet className="w-7 h-7 text-red-400 mx-auto mb-1" />
                <div className="text-[11px] text-zinc-400 font-bold">마력 정산</div>
                <div className={`text-base font-black font-mono mt-0.5 ${manaEarned >= 0 ? 'text-red-400' : 'text-amber-400'}`}>
                  {manaEarned >= 0 ? `+${manaEarned}` : manaEarned} MP
                </div>
              </div>

              <div className="bg-zinc-900/90 p-4 rounded-2xl border border-purple-500/40 text-center">
                <Lock className="w-7 h-7 text-purple-400 mx-auto mb-1" />
                <div className="text-[11px] text-zinc-400 font-bold">생포한 포로</div>
                <div className="text-base font-black text-purple-300 font-mono mt-0.5">{newCaptured.length} 명</div>
              </div>
            </div>

            {/* Prisoners Captured Preview List */}
            {newCaptured.length > 0 && (
              <div className="bg-zinc-950/80 rounded-2xl p-4 border border-purple-900/50 space-y-2">
                <div className="text-xs font-bold text-purple-300 flex items-center justify-between">
                  <span>⛓️ 신규 포획한 용사 포로</span>
                  <span className="text-[10px] text-zinc-400">지하 감옥으로 이송됨</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {newCaptured.map((p) => (
                    <div
                      key={p.instanceId}
                      className="w-10 h-10 rounded-xl overflow-hidden border-2 border-purple-500 bg-black flex-shrink-0 relative group"
                      title={`${p.hero.name} (체력 ${p.remainingHealthPercent}%)`}
                    >
                      <img
                        src={state.customImages[p.hero.id] || p.hero.imageUrl}
                        alt={p.hero.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Dismiss / Confirm Button */}
            <button
              onClick={handleConfirmFinish}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-950/50 border border-emerald-400/50 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>정산 확인 및 던전 영지로 복귀</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

