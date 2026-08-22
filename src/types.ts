export type RankType = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Royal';

export type MinionType = 'Melee' | 'Ranged' | 'Magic' | 'Support' | 'Tank';

export interface Minion {
  id: string;
  name: string;
  tier: number;
  type: MinionType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  costGold: number;
  costMana: number;
  description: string;
  imageUrl: string;
  isUnlocked: boolean;
  isCustomHeroMinion?: boolean;
  originalHeroId?: string;
  originalHeroName?: string;
  isImprinted?: boolean; // Whether converted through 3-drains imprint (can enter Bedchamber)
  stock?: number; // Total accumulated count for converted hero minions
}

export interface PlacedMinion extends Minion {
  instanceId: string;
  currentHp: number;
  level?: number;
  bonusMaxHp?: number;
  isEscaped?: boolean;
}

export interface Trap {
  id: string;
  name: string;
  tier: number;
  costGold: number;
  costMana: number;
  damage: number;
  effectType: 'Damage' | 'Slow' | 'CaptureBoost' | 'ManaDrain' | 'Stun';
  description: string;
  icon: string;
  isUnlocked: boolean;
}

export interface Hero {
  id: string;
  name: string;
  title: string;
  rank: RankType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  goldReward: number;
  manaPurity: number; // Mana gained when drained
  description: string;
  imageUrl: string;
  isBLHero?: boolean;
  isNightRaidOnly?: boolean;
  specialSkillName?: string;
  blEventId?: string;
  personality?: string;
  isBulkUnit?: boolean; // Bulk escort (Armed Soldier, Silver Knight) - not in gallery or prison
}

export interface ActiveHero extends Hero {
  instanceId: string;
  currentHp: number;
  currentRoomIndex: number;
  currentRoomId: string;
  pathHistory: string[];
  sameRoomStayCount?: number;
  totalMovesCount?: number;
  status: 'Infiltrating' | 'Trapped' | 'Fighting' | 'Defeated' | 'Captured' | 'ReachedGold' | 'ReachedPrison' | 'ReachedMP';
}

export interface DungeonRoom {
  id: string;
  name: string;
  type: 'Entrance' | 'Hallway' | 'TrapChamber' | 'GuardPost' | 'ThroneRoom';
  description: string;
  isEntrance?: boolean;
  isDestination?: boolean;
  destinationType?: 'GOLD' | 'PRISON' | 'MP';
  connections: string[]; // Connected room IDs via wall holes
  x: number; // Position percentage X for blueprint map
  y: number; // Position percentage Y for blueprint map
  width: number;
  height: number;
  maxMinions: number; // 2 for entrance, 1 for standard
  maxTraps: number; // 1 for all rooms
  placedMinions: PlacedMinion[];
  placedTraps: Trap[];
  hasLord: boolean;
}

export interface Prisoner {
  instanceId: string;
  hero: Hero;
  capturedAtWave: number;
  remainingHealthPercent: number;
  affinity: number; // For romance/conversion choices
  drainCount?: number; // Cumulative blood drain count
  lastDrainedWave?: number; // Wave when blood was last drained (1 per wave limit)
  interrogationCount?: number; // Cumulative whisper/affinity interrogation count (3 triggers imprint)
  lastInterrogatedWave?: number; // Wave when whisper interrogation was last performed (1 per wave limit)
  imprintedVia?: 'blood_drain' | 'whisper'; // Path through which imprint was achieved
  hasSeenSpecialEvent?: boolean;
}

export interface VampireLord {
  name: string;
  title: string;
  level: number;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  manaSpent: number; // Total mana used to empower self
  imageUrl: string;
}

export interface Assistant {
  name: string;
  title: string;
  race?: string;
  relationship: string;
  dialogue: string;
  mood: 'Normal' | 'Pleased' | 'Worried' | 'Flustered' | 'Strict';
  imageUrl: string;
}

export interface BLEventChoice {
  text: string;
  effectText: string;
  rewardType: 'Mana' | 'Gold' | 'Affinity' | 'ConvertMinion' | 'SpecialItem' | 'DrainBlood';
  rewardValue: number;
  assistantReaction?: string;
  nextDialogue?: string;
}

export interface BLEvent {
  id: string;
  heroId: string;
  title: string;
  description: string;
  dialogue: string;
  choices: BLEventChoice[];
}

export interface ExpeditionTarget {
  id: string;
  name: string;
  difficulty: number;
  reqMana: number;
  reqMinions: number;
  baseManaReward: number;
  baseGoldReward: number;
  description: string;
  riskText: string;
  imageUrl: string;
  bossHeroId: string;
  fieldTheme: 'village' | 'training' | 'noble_castle' | 'cathedral';
  scrollDirection?: 'up' | 'down' | 'left' | 'right';
}

export interface GameLog {
  id: string;
  timestamp: string;
  type: 'info' | 'battle' | 'capture' | 'drain' | 'ransom' | 'event' | 'raid';
  message: string;
}

export interface CustomImageMap {
  [key: string]: string; // key can be 'lord', 'assistant', minionId, heroId, trapId
}

export interface CustomNameMap {
  [key: string]: string; // custom names for 'lord', 'assistant', minionId, heroId, trapId
}

export interface GameState {
  gold: number;
  mana: number;
  wave: number;
  day: number;
  lord: VampireLord;
  assistant: Assistant;
  rooms: DungeonRoom[];
  inventoryMinions: Minion[];
  availableTraps: Trap[];
  prisoners: Prisoner[];
  logs: GameLog[];
  customImages: CustomImageMap;
  customNames: CustomNameMap;
  unlockedExpeditions: string[];
  convertedHeroIds?: string[];
  imprintedHeroIds?: string[]; // Hero IDs who were imprinted via 3 drains/whispers and are eligible for Bedchamber
  inheritedHeroIds?: string[]; // Hero IDs permanently inherited across game resets/mission completions
  missionSuccessCount?: number; // Cumulative number of Wave 30 mission successes
  hasRestoredHumanity?: boolean; // Whether Lord restored humanity and dimensionally shifted
  chamberCompletedHeroIds?: string[]; // Hero IDs who have completed the special bedroom encounter for 1-time MP reward
  isBattleActive: boolean;
  nightExpeditionReady: boolean;
  lastExecutedRaidWave?: number;
}
