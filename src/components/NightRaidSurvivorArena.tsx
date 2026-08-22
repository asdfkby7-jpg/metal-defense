import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, Minion, ExpeditionTarget, Hero } from '../types';
import { soundFx } from '../utils/audio';
import {
  Shield,
  Zap,
  Flame,
  Award,
  Heart,
  Skull,
  Play,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Swords,
  Timer,
  AlertTriangle,
  Radio,
  Crosshair,
  Crown,
  Compass,
  Trees,
} from 'lucide-react';

interface NightRaidSurvivorArenaProps {
  state: GameState;
  target: ExpeditionTarget;
  bossHero: Hero;
  selectedSquad: Minion[]; // Up to 2 companions
  onVictory: (rewardMana: number, rewardGold: number, capturedHero?: Hero, captureRate?: number) => void;
  onDefeat: (partialMana: number, lostCompanion?: Minion) => void;
  onExit: () => void;
}

interface CombatUnit {
  id: string;
  name: string;
  type: 'player' | 'companion' | 'peasant' | 'soldier' | 'elite_guard' | 'boss';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  color: string;
  imageUrl?: string;
  attackCooldown: number;
  isImprinted?: boolean;
  minionRef?: Minion;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  isPlayer: boolean;
  life: number;
  isSuper?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface BladeSlash {
  id: string;
  x: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  damage: number;
}

interface BloodGem {
  id: string;
  x: number;
  y: number;
  value: number;
}

interface ArenaObstacle {
  id: string;
  x: number;
  y: number;
  radius: number; // physical collision radius
  foliageRadius: number; // visual foliage size
  type: 'tree' | 'fence' | 'thorn_bush' | 'sacred_pillar';
  variant: number;
}

interface ArenaTrap {
  id: string;
  x: number;
  y: number;
  radius: number;
  name: string;
  type: 'spikes' | 'rune' | 'flame' | 'holy';
  state: 'idle' | 'warning' | 'active';
  timer: number;
  idleDuration: number;
  warningDuration: number;
  activeDuration: number;
  repositionTimer: number;
  repositionInterval: number;
  relocateAnim: number; // 0 to 1 for teleport shimmer
}

export const NightRaidSurvivorArena: React.FC<NightRaidSurvivorArenaProps> = ({
  state,
  target,
  bossHero,
  selectedSquad,
  onVictory,
  onDefeat,
  onExit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Companions (max 2)
  const companions = useMemo(() => selectedSquad.slice(0, 2), [selectedSquad]);

  // Imprinted hero companion calculations (1 -> +10% attack speed, 2 -> +20% attack speed & super effects)
  const imprintedCount = useMemo(() => {
    return companions.filter(
      (c) => c.isImprinted || state.imprintedHeroIds?.includes(c.originalHeroId || '')
    ).length;
  }, [companions, state.imprintedHeroIds]);

  const attackSpeedBuffPercent = imprintedCount >= 2 ? 20 : imprintedCount === 1 ? 10 : 0;
  const isSuperEffectActive = imprintedCount >= 2;

  // Companions power calculation (5% to 50% HP & ATK bonus for Lord)
  const squadPowerBonusPercent = useMemo(() => {
    const totalCompanionPower = companions.reduce(
      (sum, c) => sum + (c.hp + c.attack * 2 + c.defense),
      0
    );
    const ratio = Math.min(1, Math.max(0, (totalCompanionPower - 50) / 1200));
    return Math.round(5 + ratio * 45);
  }, [companions]);

  // Field Scroll Direction ('right' | 'down' | 'left' | 'up')
  const scrollDirection: 'right' | 'down' | 'left' | 'up' = useMemo(() => {
    if (target.scrollDirection) return target.scrollDirection;
    if (target.fieldTheme === 'village') return 'right';
    if (target.fieldTheme === 'training') return 'down';
    if (target.fieldTheme === 'noble_castle') return 'left';
    return 'up';
  }, [target]);

  // Game Timers & State
  const [timeElapsed, setTimeElapsed] = useState(0); // 0 to 120 seconds
  const [gameStateStatus, setGameStateStatus] = useState<'playing' | 'victory' | 'defeat'>('playing');
  const [collectedBlood, setCollectedBlood] = useState(0);
  const [level, setLevel] = useState(1);
  const [kills, setKills] = useState(0);
  const [playerCurrentHp, setPlayerCurrentHp] = useState<number>(500);
  const [playerMaxHp, setPlayerMaxHp] = useState<number>(500);

  // Special Popups & Warnings
  const [bossCutIn, setBossCutIn] = useState<{
    visible: boolean;
    skillName: string;
    heroName: string;
    imageUrl: string;
  } | null>(null);

  const [announcement, setAnnouncement] = useState<{
    text: string;
    color: string;
  } | null>({
    text: `⚡ [${target.name}] 야행 침투 개시! (${scrollDirection === 'right' ? '동쪽 우측' : scrollDirection === 'down' ? '남쪽 하향' : scrollDirection === 'left' ? '서쪽 좌측' : '북쪽 상향'} 고속 돌파 중)`,
    color: 'text-amber-300',
  });

  // Controls
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  // Game Engine Refs
  const unitsRef = useRef<CombatUnit[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bladeSlashesRef = useRef<BladeSlash[]>([]);
  const gemsRef = useRef<BloodGem[]>([]);
  const trapsRef = useRef<ArenaTrap[]>([]);
  const obstaclesRef = useRef<ArenaObstacle[]>([]);
  const bossSpawnedRef = useRef<boolean>(false);
  const eliteSpawnedRef = useRef<boolean>(false);
  const elite2SpawnedRef = useRef<boolean>(false);
  const lastBossSpecialTimeRef = useRef<number>(0);
  const lastBossBasicShotTimeRef = useRef<number>(0);
  const orbitAngleRef = useRef<number>(0);
  const timeElapsedRef = useRef<number>(0);
  const scrollOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const obstacleSpawnTimerRef = useRef<number>(0);
  const lastGlobalTrapShiftTimeRef = useRef<number>(0);
  const isFinishedRef = useRef<boolean>(false);

  // Determine obstacle type based on field theme
  const getObstacleType = (): 'tree' | 'fence' | 'thorn_bush' | 'sacred_pillar' => {
    if (target.fieldTheme === 'village') return 'tree';
    if (target.fieldTheme === 'training') return 'fence';
    if (target.fieldTheme === 'noble_castle') return 'thorn_bush';
    return 'sacred_pillar';
  };

  // Generate initial field traps based on field difficulty
  const generateFieldTraps = (): ArenaTrap[] => {
    // Increased trap count with difficulty
    const trapCount =
      target.difficulty === 1 ? 4 : target.difficulty === 2 ? 7 : target.difficulty === 3 ? 11 : 16;

    const trapType: 'spikes' | 'rune' | 'flame' | 'holy' =
      target.fieldTheme === 'village'
        ? 'spikes'
        : target.fieldTheme === 'training'
        ? 'rune'
        : target.fieldTheme === 'noble_castle'
        ? 'flame'
        : 'holy';

    const trapName =
      trapType === 'spikes'
        ? '가시 바닥 구덩이'
        : trapType === 'rune'
        ? '충격 비전 마법진'
        : trapType === 'flame'
        ? '혈염 분출구'
        : '신성 낙뢰 성역';

    const generated: ArenaTrap[] = [];
    const minDistance = 75;

    for (let i = 0; i < trapCount; i++) {
      let attempts = 0;
      let valid = false;
      let tx = 0;
      let ty = 0;

      while (!valid && attempts < 50) {
        attempts++;
        tx = 80 + Math.random() * 640;
        ty = 80 + Math.random() * 460;

        // Avoid exact spawn center
        if (Math.hypot(tx - 400, ty - 300) < 130) continue;

        // Avoid too close to other traps
        const tooClose = generated.some((t) => Math.hypot(t.x - tx, t.y - ty) < minDistance);
        if (!tooClose) {
          valid = true;
        }
      }

      generated.push({
        id: `trap_${i}`,
        x: tx,
        y: ty,
        radius: 32 + Math.random() * 8,
        name: trapName,
        type: trapType,
        state: 'idle',
        timer: Math.random() * 2.0, // staggered start
        idleDuration: 1.8 + Math.random() * 1.4,
        warningDuration: 0.9,
        activeDuration: 0.85,
        repositionTimer: Math.random() * 3.0, // staggered relocation
        repositionInterval: 5.5 + Math.random() * 4.0, // relocates every 5.5~9.5s
        relocateAnim: 0,
      });
    }

    return generated;
  };

  // Generate initial moving obstacles
  const generateInitialObstacles = (): ArenaObstacle[] => {
    const obsType = getObstacleType();
    const count = 6;
    const list: ArenaObstacle[] = [];
    for (let i = 0; i < count; i++) {
      const radius = 22 + Math.random() * 12;
      list.push({
        id: `obs_init_${i}`,
        x: 60 + Math.random() * 680,
        y: 60 + Math.random() * 500,
        radius,
        foliageRadius: radius * (1.5 + Math.random() * 0.4),
        type: obsType,
        variant: Math.random(),
      });
    }
    return list;
  };

  // Initialize Squad, Traps, Obstacles
  useEffect(() => {
    const lord = state.lord;
    const lordName = state.customNames?.['lord'] || lord.name;
    const lordImage = state.customImages['lord'] || lord.imageUrl;

    // Lord base stats scaled by power bonus
    const lordMaxHp = Math.round((lord.baseHp * 1.6 + lord.level * 40) * (1 + squadPowerBonusPercent / 100));
    const lordAttack = Math.round((lord.baseAttack + lord.level * 10) * (1 + squadPowerBonusPercent / 100));
    const lordDefense = lord.baseDefense + lord.level * 5;

    setPlayerMaxHp(lordMaxHp);
    setPlayerCurrentHp(lordMaxHp);

    // 1. Leader: Lord (Radius 22, prominent, projectile shooter)
    const leaderUnit: CombatUnit = {
      id: 'unit_lord',
      name: lordName,
      type: 'player',
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      radius: 22,
      hp: lordMaxHp,
      maxHp: lordMaxHp,
      attack: lordAttack,
      defense: lordDefense,
      speed: 3.8,
      color: '#dc2626',
      imageUrl: lordImage,
      attackCooldown: 0,
    };

    // 2. Companions: Up to 2 (Radius 11 - half size of lord, orbiting, melee only)
    const companionUnits: CombatUnit[] = companions.map((minion, idx) => {
      const angle = idx === 0 ? 0 : Math.PI;
      const dist = 42;
      const isImp = minion.isImprinted || state.imprintedHeroIds?.includes(minion.originalHeroId || '');
      return {
        id: `companion_${minion.id}_${idx}`,
        name: state.customNames?.[minion.id] || minion.name,
        type: 'companion',
        x: 400 + Math.cos(angle) * dist,
        y: 300 + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 11,
        hp: minion.hp,
        maxHp: minion.maxHp,
        attack: minion.attack,
        defense: minion.defense,
        speed: 3.8,
        color: isImp ? '#ec4899' : '#a855f7',
        imageUrl: state.customImages[minion.id] || minion.imageUrl,
        attackCooldown: 0,
        isImprinted: isImp,
        minionRef: minion,
      };
    });

    unitsRef.current = [leaderUnit, ...companionUnits];
    trapsRef.current = generateFieldTraps();
    obstaclesRef.current = generateInitialObstacles();
    projectilesRef.current = [];
    particlesRef.current = [];
    bladeSlashesRef.current = [];
    gemsRef.current = [];
    bossSpawnedRef.current = false;
    eliteSpawnedRef.current = false;
    elite2SpawnedRef.current = false;
    timeElapsedRef.current = 0;
    scrollOffsetRef.current = { x: 0, y: 0 };
    obstacleSpawnTimerRef.current = 0;
    lastGlobalTrapShiftTimeRef.current = 0;
    isFinishedRef.current = false;
  }, [companions, squadPowerBonusPercent, state.customImages, state.customNames, state.imprintedHeroIds, state.lord, target]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main 60FPS Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    // Field scroll velocity vectors
    const scrollSpeed = 65; // px per second
    let scrollVx = 0;
    let scrollVy = 0;
    if (scrollDirection === 'right') {
      scrollVx = scrollSpeed;
      scrollVy = 0;
    } else if (scrollDirection === 'down') {
      scrollVx = 0;
      scrollVy = scrollSpeed;
    } else if (scrollDirection === 'left') {
      scrollVx = -scrollSpeed;
      scrollVy = 0;
    } else {
      scrollVx = 0;
      scrollVy = -scrollSpeed;
    }

    // Spawn an obstacle from the upstream screen border
    const spawnObstacle = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const obsType = getObstacleType();
      const radius = 22 + Math.random() * 12;
      let ox = 0;
      let oy = 0;

      if (scrollDirection === 'right') {
        ox = -50;
        oy = 40 + Math.random() * (canvas.height - 80);
      } else if (scrollDirection === 'left') {
        ox = canvas.width + 50;
        oy = 40 + Math.random() * (canvas.height - 80);
      } else if (scrollDirection === 'down') {
        ox = 40 + Math.random() * (canvas.width - 80);
        oy = -50;
      } else {
        ox = 40 + Math.random() * (canvas.width - 80);
        oy = canvas.height + 50;
      }

      obstaclesRef.current.push({
        id: `obs_${Date.now()}_${Math.random()}`,
        x: ox,
        y: oy,
        radius,
        foliageRadius: radius * (1.5 + Math.random() * 0.4),
        type: obsType,
        variant: Math.random(),
      });
    };

    // Relocate a single trap to a new random location with particle fx
    const relocateTrap = (trap: ArenaTrap, leaderPos: { x: number; y: number }, canvasWidth: number, canvasHeight: number) => {
      // Spawn disappearance particles
      for (let p = 0; p < 8; p++) {
        particlesRef.current.push({
          x: trap.x + (Math.random() - 0.5) * 20,
          y: trap.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          color: trap.type === 'holy' ? '#fde047' : trap.type === 'flame' ? '#ef4444' : '#38bdf8',
          life: 20,
          maxLife: 20,
          size: 3,
        });
      }

      // Pick new valid coordinates avoiding immediate player area
      let attempts = 0;
      let valid = false;
      let nx = trap.x;
      let ny = trap.y;
      while (!valid && attempts < 30) {
        attempts++;
        nx = 70 + Math.random() * (canvasWidth - 140);
        ny = 70 + Math.random() * (canvasHeight - 140);
        if (Math.hypot(nx - leaderPos.x, ny - leaderPos.y) > 110) {
          valid = true;
        }
      }

      trap.x = nx;
      trap.y = ny;
      trap.state = 'idle';
      trap.timer = 0;
      trap.repositionTimer = 0;
      trap.repositionInterval = 5.5 + Math.random() * 4.0;
      trap.relocateAnim = 1.0; // Flash effect

      // Spawn arrival particles
      for (let p = 0; p < 12; p++) {
        particlesRef.current.push({
          x: trap.x + (Math.random() - 0.5) * 25,
          y: trap.y + (Math.random() - 0.5) * 25,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          color: '#a855f7',
          life: 25,
          maxLife: 25,
          size: 3.5,
        });
      }
    };

    // Spawn enemies with increased difficulty stats
    const spawnEnemy = (type: 'peasant' | 'soldier' | 'elite_guard' | 'boss', customHero?: Hero) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Spawn on border
      let x = 0;
      let y = 0;
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) {
        x = Math.random() * canvas.width;
        y = -30;
      } else if (edge === 1) {
        x = canvas.width + 30;
        y = Math.random() * canvas.height;
      } else if (edge === 2) {
        x = Math.random() * canvas.width;
        y = canvas.height + 30;
      } else {
        x = -30;
        y = Math.random() * canvas.height;
      }

      if (type === 'peasant') {
        unitsRef.current.push({
          id: `peasant_${Date.now()}_${Math.random()}`,
          name: '농노병',
          type: 'peasant',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 13,
          // Higher HP and Attack for high difficulty
          hp: 95 + timeElapsedRef.current * 3.0,
          maxHp: 95 + timeElapsedRef.current * 3.0,
          attack: 16 + timeElapsedRef.current * 0.35,
          defense: 6,
          speed: 1.9 + Math.random() * 0.6,
          color: '#a1a1aa',
          attackCooldown: 0,
        });
      } else if (type === 'soldier') {
        unitsRef.current.push({
          id: `soldier_${Date.now()}_${Math.random()}`,
          name: '정예 무장병',
          type: 'soldier',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 17,
          // Higher HP and Attack for high difficulty
          hp: 280 + timeElapsedRef.current * 5.5,
          maxHp: 280 + timeElapsedRef.current * 5.5,
          attack: 38 + timeElapsedRef.current * 0.7,
          defense: 20,
          speed: 1.45,
          color: '#38bdf8',
          attackCooldown: 0,
        });
      } else if (type === 'elite_guard') {
        unitsRef.current.push({
          id: `elite_guard_${Date.now()}`,
          name: '제국 철갑 중장기사',
          type: 'elite_guard',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 25,
          // Substantial HP and Attack
          hp: 2400 + timeElapsedRef.current * 8.0,
          maxHp: 2400 + timeElapsedRef.current * 8.0,
          attack: 115,
          defense: 50,
          speed: 1.35,
          color: '#f59e0b',
          attackCooldown: 0,
        });
      } else if (type === 'boss' && customHero) {
        // High difficulty boss hero stats: Substantially increased HP & Attack!
        const heroHpScaled = customHero.hp * 9.5;
        const heroAtkScaled = customHero.attack * 0.95;
        const heroDefScaled = customHero.defense * 0.85;

        unitsRef.current.push({
          id: `boss_${customHero.id}`,
          name: state.customNames?.[customHero.id] || customHero.name,
          type: 'boss',
          x,
          y,
          vx: 0,
          vy: 0,
          radius: 32,
          hp: heroHpScaled,
          maxHp: heroHpScaled,
          attack: heroAtkScaled,
          defense: heroDefScaled,
          speed: 1.85,
          color: '#ec4899',
          imageUrl: state.customImages[customHero.id] || customHero.imageUrl,
          attackCooldown: 0,
        });
      }
    };

    const getBossCaptureRate = (h: Hero): number => {
      const id = h.id;
      const name = h.name;
      if (id === 'h_exp_ranger' || name.includes('윈드러너') || name.includes('일리아스')) return 0.40;
      if (id === 'h_exp_crusader' || name.includes('크루제') || name.includes('베르톨트')) return 0.30;
      if (id === 'h_exp_templar' || name.includes('뤼미에르') || name.includes('발렌타인')) return 0.20;
      return 0.30;
    };

    // Boss ultimate skill attack with 360 projectile barrage and cut-in
    const triggerBossSpecialAttack = (boss: CombatUnit) => {
      soundFx.playHeroCry();

      setBossCutIn({
        visible: true,
        skillName: bossHero.specialSkillName || '달빛 성검 유성 폭쇄',
        heroName: boss.name,
        imageUrl: boss.imageUrl || bossHero.imageUrl,
      });

      setTimeout(() => {
        setBossCutIn(null);
      }, 2200);

      // Create boss nova projectiles (360 degree barrage)
      const numBullets = 20;
      for (let i = 0; i < numBullets; i++) {
        const angle = (i * (2 * Math.PI)) / numBullets;
        projectilesRef.current.push({
          id: `boss_proj_${Date.now()}_${i}`,
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * 5.0,
          vy: Math.sin(angle) * 5.0,
          damage: 48,
          radius: 9,
          color: '#ec4899',
          isPlayer: false,
          life: 180,
        });
      }

      // Add dramatic particles
      for (let i = 0; i < 35; i++) {
        particlesRef.current.push({
          x: boss.x,
          y: boss.y,
          vx: (Math.random() - 0.5) * 9,
          vy: (Math.random() - 0.5) * 9,
          color: '#f472b6',
          life: 45,
          maxLife: 45,
          size: 4 + Math.random() * 4,
        });
      }
    };

    // Boss basic periodic 3-way spread attack
    const triggerBossBasicAttack = (boss: CombatUnit, leader: CombatUnit) => {
      const baseAngle = Math.atan2(leader.y - boss.y, leader.x - boss.x);
      const spreads = [-0.25, 0, 0.25];
      spreads.forEach((spreadAngle, i) => {
        const angle = baseAngle + spreadAngle;
        projectilesRef.current.push({
          id: `boss_basic_${Date.now()}_${i}`,
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * 5.8,
          vy: Math.sin(angle) * 5.8,
          damage: 28,
          radius: 7,
          color: '#fb7185',
          isPlayer: false,
          life: 120,
        });
      });
    };

    const gameLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      if (gameStateStatus !== 'playing' || isFinishedRef.current) {
        return;
      }

      // Advance Time
      timeElapsedRef.current += dt;
      const currentSeconds = Math.floor(timeElapsedRef.current);
      setTimeElapsed(currentSeconds);

      // Advance Background Scroll Offset
      scrollOffsetRef.current.x += scrollVx * dt;
      scrollOffsetRef.current.y += scrollVy * dt;

      // 120s Survival Victory
      if (timeElapsedRef.current >= 120) {
        isFinishedRef.current = true;
        setGameStateStatus('victory');
        soundFx.playVictory();
        const captureRate = getBossCaptureRate(bossHero);
        const isCaptured = Math.random() < captureRate;
        onVictory(target.baseManaReward, target.baseGoldReward, isCaptured ? bossHero : undefined, captureRate);
        return;
      }

      // Check 35s Elite Guard Spawn
      if (currentSeconds >= 35 && !eliteSpawnedRef.current) {
        eliteSpawnedRef.current = true;
        spawnEnemy('elite_guard');
        soundFx.playTrapTrigger();
        setAnnouncement({
          text: '⚠️ [35초 경과] 강력한 제국 철갑 중장기사가 출현했습니다!',
          color: 'text-amber-400',
        });
        setTimeout(() => setAnnouncement(null), 3500);
      }

      // Check 70s Second Elite Guard Spawn
      if (currentSeconds >= 70 && !elite2SpawnedRef.current) {
        elite2SpawnedRef.current = true;
        spawnEnemy('elite_guard');
        soundFx.playTrapTrigger();
        setAnnouncement({
          text: '⚠️ [70초 경과] 증원된 제국 철갑 중장기사가 출현했습니다!',
          color: 'text-orange-400',
        });
        setTimeout(() => setAnnouncement(null), 3500);
      }

      // Check 80s (1m 20s) Boss Hero Spawn
      if (currentSeconds >= 80 && !bossSpawnedRef.current) {
        bossSpawnedRef.current = true;
        spawnEnemy('boss', bossHero);
        soundFx.playLordEmpower();
        setAnnouncement({
          text: `🚨 [1분 20초 경과] 핵심 용사 [${bossHero.name}] 참전! HP/공격력 대폭 강화 상태!`,
          color: 'text-pink-400 font-extrabold',
        });
        setTimeout(() => setAnnouncement(null), 4000);
      }

      // Periodic Normal Spawning (Swarms increase with time & difficulty)
      const spawnInterval = Math.max(0.24, 1.4 - (timeElapsedRef.current / 120) * 1.1);
      if (Math.random() < dt / spawnInterval) {
        if (Math.random() < 0.65) {
          spawnEnemy('peasant');
        } else {
          spawnEnemy('soldier');
        }
      }

      // Periodic Moving Obstacle Spawning (나무/목책/석주가 간헐적으로 등장)
      obstacleSpawnTimerRef.current += dt;
      if (obstacleSpawnTimerRef.current >= (2.2 + Math.random() * 1.8)) {
        obstacleSpawnTimerRef.current = 0;
        spawnObstacle();
      }

      // Rotate player orbiting companions
      orbitAngleRef.current += dt * 3.0;

      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // -------------------------------------------------------------
      // 1. UPDATE LEADER (주인공 Vampire Lord)
      // -------------------------------------------------------------
      const leader = unitsRef.current.find((u) => u.type === 'player');
      if (!leader || leader.hp <= 0) {
        // Player defeated before 2 minutes -> 1 companion lost!
        isFinishedRef.current = true;
        setGameStateStatus('defeat');
        soundFx.playHeroCry();

        const lostCompanion = companions.length > 0
          ? companions[Math.floor(Math.random() * companions.length)]
          : undefined;

        onDefeat(Math.floor(target.baseManaReward * 0.25), lostCompanion);
        return;
      }

      setPlayerCurrentHp(Math.max(0, Math.round(leader.hp)));

      // Move Leader
      let moveX = 0;
      let moveY = 0;
      if (keysPressed.current['w'] || keysPressed.current['arrowup']) moveY -= 1;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) moveY += 1;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveX -= 1;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveX += 1;

      if (mousePos.current.active) {
        const dx = mousePos.current.x - leader.x;
        const dy = mousePos.current.y - leader.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 15) {
          moveX = dx / dist;
          moveY = dy / dist;
        }
      }

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        leader.x = Math.max(25, Math.min(canvas.width - 25, leader.x + (moveX / len) * leader.speed));
        leader.y = Math.max(25, Math.min(canvas.height - 25, leader.y + (moveY / len) * leader.speed));
      }

      // -------------------------------------------------------------
      // 2. UPDATE OBSTACLES & OBSTACLE COLLISION (나무 밀림 효과)
      // -------------------------------------------------------------
      // Move obstacles across screen along scroll direction
      obstaclesRef.current.forEach((obs) => {
        obs.x += scrollVx * dt;
        obs.y += scrollVy * dt;

        // Collision with Leader (Lord)
        const distToLeader = Math.hypot(leader.x - obs.x, leader.y - obs.y);
        const minLeaderDist = leader.radius + obs.radius;
        if (distToLeader < minLeaderDist && distToLeader > 0.001) {
          // No HP damage! But physically pushes / displaces leader
          const overlap = minLeaderDist - distToLeader;
          const nx = (leader.x - obs.x) / distToLeader;
          const ny = (leader.y - obs.y) / distToLeader;
          leader.x += nx * overlap;
          leader.y += ny * overlap;

          // Also push along the obstacle drift
          leader.x += scrollVx * dt * 0.9;
          leader.y += scrollVy * dt * 0.9;

          // Keep within bounds
          leader.x = Math.max(25, Math.min(canvas.width - 25, leader.x));
          leader.y = Math.max(25, Math.min(canvas.height - 25, leader.y));

          // Occasional leaf/dust particle on push
          if (Math.random() < 0.2) {
            particlesRef.current.push({
              x: leader.x + (Math.random() - 0.5) * 15,
              y: leader.y + (Math.random() - 0.5) * 15,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              color: obs.type === 'tree' ? '#4ade80' : obs.type === 'thorn_bush' ? '#f43f5e' : '#e2e8f0',
              life: 16,
              maxLife: 16,
              size: 2.5,
            });
          }
        }

        // Collision with Mobs / Enemies (pushed around obstacles)
        unitsRef.current.forEach((unit) => {
          if (unit.type === 'peasant' || unit.type === 'soldier' || unit.type === 'elite_guard' || unit.type === 'boss') {
            const d = Math.hypot(unit.x - obs.x, unit.y - obs.y);
            const md = unit.radius + obs.radius;
            if (d < md && d > 0.001) {
              const ov = md - d;
              unit.x += ((unit.x - obs.x) / d) * ov;
              unit.y += ((unit.y - obs.y) / d) * ov;
            }
          }
        });
      });

      // Filter out off-screen obstacles
      obstaclesRef.current = obstaclesRef.current.filter((obs) => {
        return (
          obs.x >= -100 &&
          obs.x <= canvas.width + 100 &&
          obs.y >= -100 &&
          obs.y <= canvas.height + 100
        );
      });

      // -------------------------------------------------------------
      // 3. UPDATE COMPANIONS (동행 최대 2인: 반 사이즈, 공전, 단거리 칼질 공격만)
      // -------------------------------------------------------------
      const companionList = unitsRef.current.filter((u) => u.type === 'companion');
      companionList.forEach((comp, idx) => {
        const targetAngle = orbitAngleRef.current + (idx === 0 ? 0 : Math.PI);
        const orbitDist = 42;
        comp.x = leader.x + Math.cos(targetAngle) * orbitDist;
        comp.y = leader.y + Math.sin(targetAngle) * orbitDist;
      });

      // -------------------------------------------------------------
      // 4. COMBAT & ATTACKS
      // -------------------------------------------------------------
      const enemies = unitsRef.current.filter(
        (u) => u.type === 'peasant' || u.type === 'soldier' || u.type === 'elite_guard' || u.type === 'boss'
      );

      const currentMana = state.mana || 0;
      const mpDamageMultiplier = 1 + (currentMana / 1000) * 0.45;
      const mpSpeedBonus = Math.min(5, (currentMana / 500) * 1.3);

      const attackCooldownMultiplier = 1 - attackSpeedBuffPercent / 100;
      const baseLordCooldown = Math.max(0.12, (0.40 / (1 + (currentMana / 800) * 0.45)) * attackCooldownMultiplier);

      // (A) ONLY Lord fires projectiles!
      leader.attackCooldown -= dt;
      if (leader.attackCooldown <= 0 && enemies.length > 0) {
        leader.attackCooldown = baseLordCooldown;

        // Find nearest enemy
        let nearestEnemy: CombatUnit | null = null;
        let minDist = 99999;
        enemies.forEach((e) => {
          const d = Math.hypot(e.x - leader.x, e.y - leader.y);
          if (d < minDist) {
            minDist = d;
            nearestEnemy = e;
          }
        });

        if (nearestEnemy && minDist < 520) {
          const angle = Math.atan2(
            (nearestEnemy as CombatUnit).y - leader.y,
            (nearestEnemy as CombatUnit).x - leader.x
          );
          const projSpeed = 8.5 + mpSpeedBonus;
          const projDamage = (leader.attack * 1.05 + level * 7) * mpDamageMultiplier;

          projectilesRef.current.push({
            id: `proj_${Date.now()}_${Math.random()}`,
            x: leader.x,
            y: leader.y,
            vx: Math.cos(angle) * projSpeed,
            vy: Math.sin(angle) * projSpeed,
            damage: projDamage,
            radius: isSuperEffectActive ? 8.5 : 6.5,
            color: isSuperEffectActive ? '#f43f5e' : currentMana > 1000 ? '#ec4899' : '#dc2626',
            isPlayer: true,
            life: 95,
            isSuper: isSuperEffectActive,
          });

          // If super effect is active, add starry particle burst at muzzle
          if (isSuperEffectActive) {
            for (let s = 0; s < 4; s++) {
              particlesRef.current.push({
                x: leader.x,
                y: leader.y,
                vx: Math.cos(angle + (Math.random() - 0.5) * 0.8) * 4,
                vy: Math.sin(angle + (Math.random() - 0.5) * 0.8) * 4,
                color: Math.random() > 0.5 ? '#fbcfe8' : '#f59e0b',
                life: 18,
                maxLife: 18,
                size: 3 + Math.random() * 3,
              });
            }
          }

          soundFx.playAttackSlash();
        }
      }

      // (B) Companions: Melee slash attack ONLY against nearby enemies (< 58px)
      companionList.forEach((comp) => {
        comp.attackCooldown -= dt;
        if (comp.attackCooldown <= 0 && enemies.length > 0) {
          let meleeTarget: CombatUnit | null = null;
          let minMeleeDist = 60;

          enemies.forEach((e) => {
            const d = Math.hypot(e.x - comp.x, e.y - comp.y);
            if (d < minMeleeDist) {
              minMeleeDist = d;
              meleeTarget = e;
            }
          });

          if (meleeTarget) {
            comp.attackCooldown = 0.30;
            const slashAngle = Math.atan2(
              (meleeTarget as CombatUnit).y - comp.y,
              (meleeTarget as CombatUnit).x - comp.x
            );

            // Execute melee blade slash
            const slashDmg = comp.attack * 1.45;
            (meleeTarget as CombatUnit).hp -= slashDmg;

            // Push enemy slightly away
            (meleeTarget as CombatUnit).x += Math.cos(slashAngle) * 7;
            (meleeTarget as CombatUnit).y += Math.sin(slashAngle) * 7;

            // Add animated Blade Slash FX
            bladeSlashesRef.current.push({
              id: `slash_${Date.now()}_${Math.random()}`,
              x: comp.x,
              y: comp.y,
              angle: slashAngle,
              radius: 32,
              color: comp.isImprinted ? '#f472b6' : '#c084fc',
              life: 10,
              maxLife: 10,
              damage: slashDmg,
            });

            soundFx.playAttackSlash();
          }
        }
      });

      // -------------------------------------------------------------
      // 5. UPDATE TRAPS & DYNAMIC RANDOM REPOSITIONING
      // -------------------------------------------------------------
      // (A) Check Global Trap Shift Wave every 25 seconds
      if (currentSeconds >= 25 && currentSeconds - lastGlobalTrapShiftTimeRef.current >= 25) {
        lastGlobalTrapShiftTimeRef.current = currentSeconds;
        soundFx.playTrapTrigger();
        setAnnouncement({
          text: '🌀 [지형 격변] 필드의 모든 함정 마력 좌표가 일제히 재배치됩니다!',
          color: 'text-cyan-300 font-extrabold',
        });
        setTimeout(() => setAnnouncement(null), 3200);

        trapsRef.current.forEach((trap) => {
          relocateTrap(trap, { x: leader.x, y: leader.y }, canvas.width, canvas.height);
        });
      }

      // (B) Individual Trap Cycle & Relocation
      trapsRef.current.forEach((trap) => {
        trap.timer += dt;
        trap.repositionTimer += dt;
        if (trap.relocateAnim > 0) {
          trap.relocateAnim = Math.max(0, trap.relocateAnim - dt * 2.0);
        }

        // Relocate individual trap when its timer expires
        if (trap.repositionTimer >= trap.repositionInterval) {
          relocateTrap(trap, { x: leader.x, y: leader.y }, canvas.width, canvas.height);
        }

        if (trap.state === 'idle') {
          if (trap.timer >= trap.idleDuration) {
            trap.state = 'warning';
            trap.timer = 0;
          }
        } else if (trap.state === 'warning') {
          if (trap.timer >= trap.warningDuration) {
            trap.state = 'active';
            trap.timer = 0;
            soundFx.playTrapTrigger();
          }
        } else if (trap.state === 'active') {
          // Continuous hazard damage to leader if standing inside
          const distToLeader = Math.hypot(leader.x - trap.x, leader.y - trap.y);
          if (distToLeader < trap.radius + leader.radius) {
            const trapDamage = (18 + target.difficulty * 9) * dt * 2.2;
            leader.hp -= trapDamage;

            // Spark particles on trap hit
            if (Math.random() < 0.35) {
              particlesRef.current.push({
                x: leader.x + (Math.random() - 0.5) * 20,
                y: leader.y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: trap.type === 'holy' ? '#fde047' : trap.type === 'flame' ? '#ef4444' : '#38bdf8',
                life: 15,
                maxLife: 15,
                size: 3,
              });
            }
          }

          if (trap.timer >= trap.activeDuration) {
            trap.state = 'idle';
            trap.timer = 0;
          }
        }
      });

      // -------------------------------------------------------------
      // 6. UPDATE ENEMIES & BOSS ATTACKS
      // -------------------------------------------------------------
      enemies.forEach((enemy) => {
        // Move towards leader
        const dx = leader.x - enemy.x;
        const dy = leader.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
          enemy.x += (dx / dist) * enemy.speed;
          enemy.y += (dy / dist) * enemy.speed;
        }

        // Enemy melee damage on contact with Lord
        const contactDist = Math.hypot(leader.x - enemy.x, leader.y - enemy.y);
        if (contactDist < leader.radius + enemy.radius) {
          const rawDmg = Math.max(1, enemy.attack - leader.defense * 0.4);
          leader.hp -= rawDmg * dt * 2.2;
        }

        // Boss Combat Logic
        if (enemy.type === 'boss') {
          // Boss basic shot every 1.8s
          if (timeElapsedRef.current - lastBossBasicShotTimeRef.current >= 1.8) {
            lastBossBasicShotTimeRef.current = timeElapsedRef.current;
            triggerBossBasicAttack(enemy, leader);
          }

          // Boss Special Attack every 8.5s
          if (timeElapsedRef.current - lastBossSpecialTimeRef.current >= 8.5) {
            lastBossSpecialTimeRef.current = timeElapsedRef.current;
            triggerBossSpecialAttack(enemy);
          }
        }
      });

      // -------------------------------------------------------------
      // 7. UPDATE PROJECTILES
      // -------------------------------------------------------------
      projectilesRef.current.forEach((proj) => {
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.life -= 1;

        if (proj.isPlayer) {
          // Check collision with enemies
          enemies.forEach((enemy) => {
            const d = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
            if (d < enemy.radius + proj.radius && proj.life > 0) {
              enemy.hp -= proj.damage;
              proj.life = 0; // Destroy projectile

              // Particle blood splash
              const pCount = proj.isSuper ? 8 : 5;
              for (let k = 0; k < pCount; k++) {
                particlesRef.current.push({
                  x: proj.x,
                  y: proj.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  color: proj.isSuper ? '#fb7185' : '#dc2626',
                  life: 20,
                  maxLife: 20,
                  size: 3.5,
                });
              }
            }
          });
        } else {
          // Boss projectile hitting Lord
          const d = Math.hypot(leader.x - proj.x, leader.y - proj.y);
          if (d < leader.radius + proj.radius && proj.life > 0) {
            leader.hp -= proj.damage;
            proj.life = 0;
            soundFx.playHeroAttack();
          }
        }
      });

      projectilesRef.current = projectilesRef.current.filter((p) => p.life > 0);

      // Update Blade Slashes
      bladeSlashesRef.current.forEach((s) => {
        s.life -= 1;
      });
      bladeSlashesRef.current = bladeSlashesRef.current.filter((s) => s.life > 0);

      // -------------------------------------------------------------
      // 8. HANDLE ENEMY DEATHS & GEM DROPS
      // -------------------------------------------------------------
      unitsRef.current = unitsRef.current.filter((unit) => {
        if (unit.type === 'player' || unit.type === 'companion') {
          return true;
        }
        if (unit.hp <= 0) {
          // Enemy died!
          setKills((prev) => prev + 1);

          // Drop Gem
          gemsRef.current.push({
            id: `gem_${Date.now()}_${Math.random()}`,
            x: unit.x,
            y: unit.y,
            value: unit.type === 'boss' ? 60 : unit.type === 'elite_guard' ? 25 : 5,
          });

          // If Boss was killed -> Early Victory!
          if (unit.type === 'boss') {
            isFinishedRef.current = true;
            setGameStateStatus('victory');
            soundFx.playVictory();
            const captureRate = getBossCaptureRate(bossHero);
            const isCaptured = Math.random() < captureRate;
            onVictory(target.baseManaReward, target.baseGoldReward, isCaptured ? bossHero : undefined, captureRate);
            return false;
          }

          return false;
        }
        return true;
      });

      // -------------------------------------------------------------
      // 9. UPDATE BLOOD GEMS & VACUUM
      // -------------------------------------------------------------
      gemsRef.current.forEach((gem) => {
        const d = Math.hypot(leader.x - gem.x, leader.y - gem.y);
        if (d < 140) {
          // Vacuum pull
          gem.x += ((leader.x - gem.x) / d) * 7.0;
          gem.y += ((leader.y - gem.y) / d) * 7.0;
        }
        if (d < leader.radius + 14) {
          // Collect
          setCollectedBlood((prev) => {
            const next = prev + gem.value;
            if (next >= level * 100) {
              setLevel((lvl) => lvl + 1);
              soundFx.playLordEmpower();
              leader.hp = Math.min(leader.maxHp, leader.hp + 70); // Heal on level
            }
            return next;
          });
          soundFx.playBloodDrain();
          gem.value = 0;
        }
      });
      gemsRef.current = gemsRef.current.filter((g) => g.value > 0);

      // Update Particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      // -------------------------------------------------------------
      // 10. RENDER CANVAS (Directional Scrolling & Thematic World)
      // -------------------------------------------------------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const offsetX = ((scrollOffsetRef.current.x % 50) + 50) % 50;
      const offsetY = ((scrollOffsetRef.current.y % 50) + 50) % 50;

      // Dynamic Scrolling Background Grid & Theme
      if (target.fieldTheme === 'village') {
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 1.2;

        for (let x = -50 + offsetX; x < canvas.width + 50; x += 45) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = -50 + offsetY; y < canvas.height + 50; y += 45) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      } else if (target.fieldTheme === 'training') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;

        for (let x = -50 + offsetX; x < canvas.width + 50; x += 50) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = -50 + offsetY; y < canvas.height + 50; y += 50) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      } else if (target.fieldTheme === 'noble_castle') {
        ctx.fillStyle = '#270815';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#4a0e2e';
        ctx.lineWidth = 1.5;

        for (let x = -50 + offsetX; x < canvas.width + 50; x += 48) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = -50 + offsetY; y < canvas.height + 50; y += 48) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#180d24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#311a4d';
        ctx.lineWidth = 1.5;

        for (let x = -50 + offsetX; x < canvas.width + 50; x += 46) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = -50 + offsetY; y < canvas.height + 50; y += 46) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }

      // (A) Draw Traps (with Teleport Relocation Shimmer)
      trapsRef.current.forEach((trap) => {
        ctx.save();

        // Teleportation arrival glow
        if (trap.relocateAnim > 0) {
          ctx.strokeStyle = `rgba(168, 85, 247, ${trap.relocateAnim})`;
          ctx.lineWidth = 4 * trap.relocateAnim;
          ctx.beginPath();
          ctx.arc(trap.x, trap.y, trap.radius * (1 + (1 - trap.relocateAnim) * 0.5), 0, Math.PI * 2);
          ctx.stroke();
        }

        if (trap.state === 'idle') {
          // Subtle faint trap outline
          ctx.strokeStyle = 'rgba(161, 161, 170, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(161, 161, 170, 0.06)';
          ctx.fill();

          // Subtle moving runic mark inside trap
          const spin = timeElapsedRef.current * 1.5;
          ctx.strokeStyle = 'rgba(161, 161, 170, 0.2)';
          ctx.beginPath();
          ctx.arc(trap.x, trap.y, trap.radius * 0.5, spin, spin + Math.PI);
          ctx.stroke();
        } else if (trap.state === 'warning') {
          // Pulsing Warning circle
          const pulse = (Math.sin(timeElapsedRef.current * 14) + 1) / 2;
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + pulse * 0.55})`;
          ctx.lineWidth = 2.8;
          ctx.beginPath();
          ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(239, 68, 68, ${0.18 + pulse * 0.18})`;
          ctx.fill();

          // Warning exclamation mark
          ctx.fillStyle = '#fca5a5';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚠', trap.x, trap.y);
        } else if (trap.state === 'active') {
          // Active Eruption
          const activeGlow =
            trap.type === 'holy'
              ? 'rgba(250, 204, 21, 0.45)'
              : trap.type === 'flame'
              ? 'rgba(239, 68, 68, 0.5)'
              : 'rgba(56, 189, 248, 0.5)';

          ctx.fillStyle = activeGlow;
          ctx.beginPath();
          ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle =
            trap.type === 'holy' ? '#facc15' : trap.type === 'flame' ? '#ef4444' : '#38bdf8';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // Spike / Lightning / Fire Burst spokes
          const spokes = 8;
          for (let sp = 0; sp < spokes; sp++) {
            const spAngle = (sp * Math.PI * 2) / spokes + timeElapsedRef.current * 5;
            const rInner = trap.radius * 0.25;
            const rOuter = trap.radius * 1.2;
            ctx.beginPath();
            ctx.moveTo(trap.x + Math.cos(spAngle) * rInner, trap.y + Math.sin(spAngle) * rInner);
            ctx.lineTo(trap.x + Math.cos(spAngle) * rOuter, trap.y + Math.sin(spAngle) * rOuter);
            ctx.stroke();
          }
        }
        ctx.restore();
      });

      // (B) Draw Moving Obstacles (나무, 목책, 핏빛 가시목, 신성 석주)
      obstaclesRef.current.forEach((obs) => {
        ctx.save();
        const sway = Math.sin(timeElapsedRef.current * 2.5 + obs.variant * 10) * 2;

        // Shadow beneath obstacle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(obs.x, obs.y + obs.radius * 0.7, obs.radius * 1.1, obs.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        if (obs.type === 'tree') {
          // Lush Gothic Tree
          // Trunk
          ctx.fillStyle = '#451a03';
          ctx.fillRect(obs.x - 5, obs.y - 4, 10, obs.radius * 0.9);

          // Foliage layers
          ctx.fillStyle = '#14532d';
          ctx.beginPath();
          ctx.arc(obs.x + sway, obs.y - 8, obs.foliageRadius * 0.85, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#166534';
          ctx.beginPath();
          ctx.arc(obs.x - 4 + sway, obs.y - 12, obs.foliageRadius * 0.7, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(obs.x + 4 + sway, obs.y - 16, obs.foliageRadius * 0.55, 0, Math.PI * 2);
          ctx.fill();

          // Highlight
          ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
          ctx.beginPath();
          ctx.arc(obs.x + sway, obs.y - 18, obs.foliageRadius * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === 'fence') {
          // Training Fortified Barricade / Dummy
          ctx.fillStyle = '#78350f';
          ctx.fillRect(obs.x - obs.radius * 0.9, obs.y - 8, obs.radius * 1.8, 16);
          ctx.fillStyle = '#92400e';
          ctx.fillRect(obs.x - obs.radius * 0.8, obs.y - 12, obs.radius * 1.6, 24);
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.x - obs.radius * 0.8, obs.y - 12, obs.radius * 1.6, 24);

          // Training target marker
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === 'thorn_bush') {
          // Noble Castle Thorny Rose Bramble Tree
          ctx.fillStyle = '#3f0c10';
          ctx.beginPath();
          ctx.arc(obs.x + sway, obs.y - 6, obs.foliageRadius * 0.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#7f1d1d';
          ctx.beginPath();
          ctx.arc(obs.x - 3 + sway, obs.y - 10, obs.foliageRadius * 0.65, 0, Math.PI * 2);
          ctx.fill();

          // Blood Roses
          const rosePositions = [
            { rx: -6, ry: -8 },
            { rx: 5, ry: -12 },
            { rx: -2, ry: -16 },
          ];
          rosePositions.forEach((pos) => {
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(obs.x + pos.rx + sway, obs.y + pos.ry, 4.5, 0, Math.PI * 2);
            ctx.fill();
          });
        } else {
          // Cathedral Sacred Marble Pillar / Holy Tree
          ctx.fillStyle = '#475569';
          ctx.fillRect(obs.x - 8, obs.y - obs.radius * 0.8, 16, obs.radius * 1.6);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(obs.x - 6, obs.y - obs.radius * 0.75, 12, obs.radius * 1.5);

          // Holy golden capital & glow
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(obs.x - 10, obs.y - obs.radius * 0.85, 20, 5);
          ctx.fillRect(obs.x - 10, obs.y + obs.radius * 0.75, 20, 5);

          ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, obs.radius * 0.8, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      });

      // (C) Draw Blood Gems
      gemsRef.current.forEach((gem) => {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(gem.x, gem.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // (D) Draw Blade Slashes (Companions Melee Visual FX)
      bladeSlashesRef.current.forEach((slash) => {
        ctx.save();
        const progress = slash.life / slash.maxLife;
        ctx.strokeStyle = slash.color;
        ctx.lineWidth = 4.5 * progress;
        ctx.shadowColor = slash.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(slash.x, slash.y, slash.radius, slash.angle - Math.PI / 3, slash.angle + Math.PI / 3);
        ctx.stroke();
        ctx.restore();
      });

      // (E) Draw Projectiles
      projectilesRef.current.forEach((proj) => {
        ctx.save();
        ctx.fillStyle = proj.color;
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = proj.isSuper ? 16 : 8;

        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();

        if (proj.isSuper) {
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, proj.radius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      // (F) Draw Particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // (G) Draw Units
      unitsRef.current.forEach((unit) => {
        ctx.save();

        if (unit.type === 'player') {
          // Leader Lord Aura
          if (isSuperEffectActive) {
            const auraPulse = (Math.sin(timeElapsedRef.current * 6) + 1) / 2;
            ctx.strokeStyle = `rgba(244, 63, 94, ${0.6 + auraPulse * 0.4})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, unit.radius + 8 + auraPulse * 4, 0, Math.PI * 2);
            ctx.stroke();

            // Rotating Magic Star / Runes under Lord
            const starSpokes = 6;
            ctx.strokeStyle = `rgba(251, 191, 36, ${0.4 + auraPulse * 0.3})`;
            ctx.lineWidth = 1.5;
            for (let st = 0; st < starSpokes; st++) {
              const stAngle = (st * Math.PI * 2) / starSpokes + timeElapsedRef.current * 2;
              ctx.beginPath();
              ctx.moveTo(unit.x, unit.y);
              ctx.lineTo(unit.x + Math.cos(stAngle) * 32, unit.y + Math.sin(stAngle) * 32);
              ctx.stroke();
            }
          }

          // Lord Main Body
          ctx.fillStyle = unit.color;
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Crown Symbol inside Lord
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('👑', unit.x, unit.y);
        } else if (unit.type === 'companion') {
          // Companion Unit: Half size (radius 11), orbiting around lord
          ctx.fillStyle = unit.color;
          ctx.shadowColor = unit.isImprinted ? '#f472b6' : '#a855f7';
          ctx.shadowBlur = unit.isImprinted ? 10 : 6;
          ctx.beginPath();
          ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = unit.isImprinted ? '#fbcfe8' : '#e9d5ff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Heart / Sword symbol for companion
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(unit.isImprinted ? '♥' : '⚔', unit.x, unit.y);
        } else if (unit.type === 'boss') {
          // Boss Hero - Prominent & Menacing
          ctx.fillStyle = unit.color;
          ctx.shadowColor = '#ec4899';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f472b6';
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // Boss Skull / Crown Badge
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', unit.x, unit.y);
        } else {
          // Enemies
          ctx.fillStyle = unit.color;
          ctx.beginPath();
          ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Health Bar for all units
        const barWidth = unit.radius * 2.2;
        const barHeight = unit.type === 'boss' ? 6 : 4;
        const barX = unit.x - barWidth / 2;
        const barY = unit.y - unit.radius - (unit.type === 'boss' ? 12 : 8);
        const hpPercent = Math.max(0, Math.min(1, unit.hp / unit.maxHp));

        ctx.fillStyle = '#27272a';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = unit.type === 'player' ? '#22c55e' : unit.type === 'companion' ? '#a855f7' : unit.type === 'boss' ? '#ec4899' : '#ef4444';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // Name tag
        ctx.fillStyle = '#ffffff';
        ctx.font = unit.type === 'boss' ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(unit.name, unit.x, barY - 3);

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [attackSpeedBuffPercent, bossHero, companions, isSuperEffectActive, level, onDefeat, onVictory, scrollDirection, state.customImages, state.customNames, state.mana, target]);

  return (
    <div id="night-raid-arena" className="space-y-4">
      {/* Top HUD & Stats */}
      <div className="bg-zinc-950 border border-purple-900/60 rounded-2xl p-4 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Squad & Direction Status */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-900 text-purple-200 border border-purple-500/50 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>주군 총사령관 출격</span>
            </span>

            {/* Scrolling Direction Indicator */}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 flex items-center gap-1.5 animate-pulse">
              <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>
                전진 방향: {scrollDirection === 'right' ? '우측 돌파 (동풍 질주)' : scrollDirection === 'down' ? '남측 강하 (하향 돌파)' : scrollDirection === 'left' ? '좌측 돌파 (서풍 질주)' : '상공 비상 (상향 돌파)'}
              </span>
            </span>

            {/* Imprinted Hero Resonance Tag */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                imprintedCount === 2
                  ? 'bg-pink-950 text-pink-200 border-pink-500 animate-pulse'
                  : imprintedCount === 1
                  ? 'bg-purple-950 text-purple-200 border-purple-500/60'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${imprintedCount > 0 ? 'fill-pink-500 text-pink-400' : 'text-zinc-500'}`} />
              <span>
                각인 용사 {imprintedCount}/2명: 공속 +{attackSpeedBuffPercent}%
                {isSuperEffectActive && ' (극대 이펙트 발동!)'}
              </span>
            </span>

            {/* Squad Strength Buff Tag */}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>결사대 공명: HP & 화력 +{squadPowerBonusPercent}%</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-red-400 font-bold">
              주군 HP: {playerCurrentHp} / {playerMaxHp}
            </span>
            <span className="text-zinc-500">|</span>
            <span className="text-pink-400 font-bold">격파 수: {kills}</span>
            <span className="text-zinc-500">|</span>
            <span className="text-amber-400 font-bold">작동 함정: {trapsRef.current.length}개 (주기적 무작위 재배치)</span>
          </div>
        </div>

        {/* Right: Time & Quit Button */}
        <div className="flex items-center gap-4">
          <div className="bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-xl flex items-center gap-2 font-mono font-extrabold text-sm">
            <Timer className="w-4 h-4 text-purple-400 animate-spin" />
            <span className="text-zinc-200">
              {Math.floor(timeElapsed / 60)
                .toString()
                .padStart(2, '0')}
                :{(timeElapsed % 60).toString().padStart(2, '0')} / 02:00
            </span>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onExit();
            }}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>작전 중단</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-purple-900/60 shadow-2xl bg-black flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={620}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            mousePos.current = {
              x: (e.clientX - rect.left) * (800 / rect.width),
              y: (e.clientY - rect.top) * (620 / rect.height),
              active: true,
            };
          }}
          onMouseLeave={() => {
            mousePos.current.active = false;
          }}
          className="w-full max-w-[800px] h-[620px] cursor-crosshair block"
        />

        {/* Dynamic In-Game Announcement Banner */}
        {announcement && (
          <div className="absolute top-6 inset-x-0 flex justify-center pointer-events-none animate-bounce">
            <div className="bg-black/90 border border-purple-500/80 px-6 py-2 rounded-full text-xs font-extrabold shadow-2xl backdrop-blur-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className={announcement.color}>{announcement.text}</span>
            </div>
          </div>
        )}

        {/* Boss Cut-in Modal when boss uses special skill */}
        {bossCutIn && bossCutIn.visible && (
          <div className="absolute top-8 right-8 w-64 bg-gradient-to-br from-pink-950/95 via-purple-950/95 to-zinc-950/95 border-2 border-pink-500 rounded-2xl p-4 shadow-2xl animate-pulse flex items-center gap-3 backdrop-blur-md">
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-pink-400 bg-zinc-900 flex-shrink-0">
              <img
                src={bossCutIn.imageUrl}
                alt={bossCutIn.heroName}
                className="w-full h-full object-cover animate-breath"
              />
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="text-[10px] text-pink-300 font-bold uppercase tracking-wider">
                용사 광역 필살기 발동!
              </div>
              <h4 className="text-xs font-extrabold text-white truncate">{bossCutIn.heroName}</h4>
              <p className="text-[11px] text-amber-300 font-mono font-bold mt-0.5 line-clamp-1">
                [{bossCutIn.skillName}]
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Control Guide & Obstacle / Trap Mechanics Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Direction & Obstacle Push Mechanics */}
        <div className="bg-zinc-950 border border-purple-900/40 rounded-xl p-3.5 space-y-2 text-xs">
          <h4 className="font-bold text-purple-300 flex items-center gap-1.5">
            <Trees className="w-4 h-4 text-emerald-400" />
            지형 이동 & 나무 장애물 기믹
          </h4>
          <div className="space-y-1 text-zinc-300 text-[11px] leading-relaxed">
            <div>
              🌲 <strong className="text-zinc-100">나무/장애물 물리 판정</strong>: 필드가 진행 방향으로 계속 스크롤되며 나무 및 장애물이 이동합니다. 부딪혀도 HP 피해는 없으나 기류에 밀려 이동이 차단/밀려날 수 있습니다.
            </div>
            <div>
              ⚔️ <strong className="text-zinc-100">동행 2인 결사대</strong>: 주군 주위를 공전하며 근접 적에게 칼질 참격을 가합니다.
            </div>
            <div className="text-pink-300">
              ♥ <strong className="text-pink-200">각인 용사 공명</strong>: 1명 동행 시 공속 +10%, 2명 동행 시 공속 +20% & 극대 마법탄 이펙트 발동!
            </div>
          </div>
        </div>

        {/* Right: Dynamic Trap Gimmicks & Balance Warning */}
        <div className="bg-zinc-950 border border-purple-900/40 rounded-xl p-3.5 space-y-2 text-xs">
          <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            시간별 무작위 함정 재배치 & 고난도 용사
          </h4>
          <div className="space-y-1 text-zinc-300 text-[11px] leading-relaxed">
            <div>
              ⚡ <strong className="text-zinc-100">함정 위치 무작위 재배치</strong>: 모든 함정은 시간에 따라 지속적으로 새로운 좌표로 순간이동하며 지형이 급변합니다.
            </div>
            <div>
              👑 <strong className="text-amber-300">핵심 용사 대폭 강화</strong>: 출현하는 용사의 체력과 공격력이 대폭 상향되어 극도의 주의가 요구됩니다.
            </div>
            <div className="text-red-400 font-bold">
              💀 <strong className="text-red-300">패배 패널티</strong>: 2분을 버티지 못하고 HP가 0이 되면 동행 결사대원 중 1명을 잃게 됩니다!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
