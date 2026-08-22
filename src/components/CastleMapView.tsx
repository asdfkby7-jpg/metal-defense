import React from 'react';
import { GameState, DungeonRoom, ActiveHero } from '../types';
import { soundFx } from '../utils/audio';
import {
  Coins,
  Lock,
  Zap,
  Crown,
  Skull,
  Swords,
  Flame,
  Droplet,
  Sparkles,
  Footprints,
  Shield,
  Eye,
} from 'lucide-react';

interface CastleMapViewProps {
  state: GameState;
  selectedRoomId?: string;
  onSelectRoom?: (roomId: string) => void;
  activeHeroes?: ActiveHero[];
  animatingRooms?: {
    [roomId: string]: {
      type: 'combat' | 'trap';
      trapType?: string;
      damageText?: string;
    };
  };
  onAddGold?: (amount: number) => void;
  onAddMana?: (amount: number) => void;
  onMovePlacedMinion?: (fromRoomId: string, instanceId: string, toRoomId: string) => void;
  onMoveLord?: (roomId: string) => void;
  onStartWave?: () => void;
  onOpenHumanityModal?: () => void;
}

export const CastleMapView: React.FC<CastleMapViewProps> = ({
  state,
  selectedRoomId,
  onSelectRoom,
  activeHeroes = [],
  animatingRooms = {},
  onAddGold,
  onAddMana,
  onMovePlacedMinion,
  onMoveLord,
  onStartWave,
  onOpenHumanityModal,
}) => {
  const [dragOverRoomId, setDragOverRoomId] = React.useState<string | null>(null);

  // Condition for Humanity Restoration: Imprinted heroes >= 6 AND deployed in defense >= 6
  const imprintedCount =
    (state.imprintedHeroIds?.length || 0) +
    (state.inheritedHeroIds?.length || 0);
  const deployedImprintedHeroCount = state.rooms.reduce(
    (acc, r) =>
      acc +
      r.placedMinions.filter(
        (m) =>
          m.isCustomHeroMinion ||
          m.isImprinted ||
          Boolean(m.originalHeroId) ||
          m.id.startsWith('minion_converted_')
      ).length,
    0
  );
  const canRestoreHumanity = imprintedCount >= 6 && deployedImprintedHeroCount >= 6;
  return (
    <div className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-extrabold text-zinc-100">
            거대 흡혈귀 성 구조 평면도 (Castle Blueprint)
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> 회색 돌길 입구
          </span>
          <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> 무작위 갈림길 (불규칙)
          </span>
          <span className="flex items-center gap-1 bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-800/40 font-bold">
            ★ 입구 방: 몬스터 2마리 가능
          </span>
        </div>
      </div>

      {/* Main Map Container: Green Grass Background with Castle Schematic */}
      <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-emerald-950 via-green-950 to-emerald-950 rounded-2xl border-2 border-emerald-800/40 p-2 sm:p-4 overflow-hidden shadow-inner select-none">
        {/* Grass Texture & Trees Overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#059669 1px, #022c22 1px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px',
          }}
        />

        {/* Outer Forest Trees Decoration */}
        <div className="absolute top-2 left-2 text-emerald-800/60 text-xs font-serif pointer-events-none">
          🌲 🌲 🌲
        </div>
        <div className="absolute bottom-2 left-2 text-emerald-800/60 text-xs font-serif pointer-events-none">
          🌲 🌲 🌲
        </div>
        <div className="absolute top-2 right-2 text-emerald-800/60 text-xs font-serif pointer-events-none hidden md:block">
          🌲 🌲 🌲
        </div>
        <div className="absolute bottom-2 right-2 text-emerald-800/60 text-xs font-serif pointer-events-none">
          🌲 🌲 🌲
        </div>

        {/* Top-Right Green Grass Wave Button */}
        {onStartWave && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30 pointer-events-auto">
            <button
              id="btn-map-start-wave"
              onClick={(e) => {
                e.stopPropagation();
                soundFx.playVictory();
                onStartWave();
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-700 to-red-800 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs sm:text-sm shadow-2xl shadow-red-950/90 border-2 border-amber-400/80 flex items-center gap-1.5 sm:gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap animate-bounce"
              title={`Wave ${state.wave} 방어 시작`}
            >
              <Swords className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
              <span>⚔️ Wave {state.wave} 방어 시작</span>
            </button>
          </div>
        )}

        {/* Grey Stone Path (Leftmost Entry Road) */}
        <div
          className="absolute left-0 top-[38%] bottom-[38%] w-[12%] bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-700 border-y-2 border-zinc-400/60 shadow-lg flex items-center justify-center z-10"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #52525b 0, #52525b 8px, #3f3f46 8px, #3f3f46 16px)`,
          }}
        >
          <div className="bg-zinc-950/80 text-zinc-200 px-1.5 py-0.5 rounded text-[9px] font-extrabold border border-zinc-500/50 flex items-center gap-1 shadow whitespace-nowrap -rotate-90 sm:rotate-0">
            <Footprints className="w-3 h-3 text-amber-400 animate-pulse" />
            회색 돌길
          </div>
        </div>

        {/* Outer Top-Down Perimeter Castle Wall Graphic SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Stone Wall Hatching / Brick Pattern */}
            <pattern
              id="wallBrickPattern"
              width="4"
              height="4"
              patternTransform="rotate(30 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <rect width="4" height="4" fill="#3f3f46" />
              <line x1="0" y1="0" x2="4" y2="0" stroke="#18181b" strokeWidth="0.5" />
              <line x1="0" y1="2" x2="4" y2="2" stroke="#18181b" strokeWidth="0.5" />
              <line x1="2" y1="0" x2="2" y2="2" stroke="#27272a" strokeWidth="0.5" />
              <line x1="0" y1="2" x2="0" y2="4" stroke="#27272a" strokeWidth="0.5" />
            </pattern>

            {/* Turret Tower Radial Top-Down Gradient */}
            <radialGradient id="turretRoofGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="60%" stopColor="#3f3f46" />
              <stop offset="100%" stopColor="#18181b" />
            </radialGradient>

            {/* Drop Shadow Filter for Castle Walls */}
            <filter id="wallShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0.6" dy="0.8" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.85" />
            </filter>
          </defs>

          {/* North Castle Wall Paths (From Entrance Room X:14.5%, Y:18% -> Top Outer Y:4% -> East Outer X:90% -> MP Room X:90%, Y:26%) */}
          {/* Layer 1: Heavy Shadow Layer */}
          <path
            d="M 14.5 18 L 14.5 4 L 90 4 L 90 26"
            fill="none"
            stroke="#000000"
            strokeWidth="3.6"
            strokeLinecap="square"
            strokeLinejoin="miter"
            opacity="0.75"
            filter="url(#wallShadow)"
          />
          {/* Layer 2: Outer Stone Base Foundation */}
          <path
            d="M 14.5 18 L 14.5 4 L 90 4 L 90 26"
            fill="none"
            stroke="#18181b"
            strokeWidth="2.6"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          {/* Layer 3: Main Wall Stone Body */}
          <path
            d="M 14.5 18 L 14.5 4 L 90 4 L 90 26"
            fill="none"
            stroke="#3f3f46"
            strokeWidth="1.9"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          {/* Layer 4: Top Walkway Rampart */}
          <path
            d="M 14.5 18 L 14.5 4 L 90 4 L 90 26"
            fill="none"
            stroke="#71717a"
            strokeWidth="1.1"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          {/* Layer 5: Crenellations / Battlements Tooth Highlights */}
          <path
            d="M 14.5 18 L 14.5 4 L 90 4 L 90 26"
            fill="none"
            stroke="#e4e4e7"
            strokeWidth="0.5"
            strokeDasharray="0.8 0.8"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />

          {/* South Castle Wall Paths (From Entrance Room X:14.5%, Y:82% -> Bottom Outer Y:96% -> East Outer X:90% -> MP Room X:90%, Y:74%) */}
          {/* Layer 1: Heavy Shadow Layer */}
          <path
            d="M 14.5 82 L 14.5 96 L 90 96 L 90 74"
            fill="none"
            stroke="#000000"
            strokeWidth="3.6"
            strokeLinecap="square"
            strokeLinejoin="miter"
            opacity="0.75"
            filter="url(#wallShadow)"
          />
          {/* Layer 2: Outer Stone Base Foundation */}
          <path
            d="M 14.5 82 L 14.5 96 L 90 96 L 90 74"
            fill="none"
            stroke="#18181b"
            strokeWidth="2.6"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          {/* Layer 3: Main Wall Stone Body */}
          <path
            d="M 14.5 82 L 14.5 96 L 90 96 L 90 74"
            fill="none"
            stroke="#3f3f46"
            strokeWidth="1.9"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          {/* Layer 4: Top Walkway Rampart */}
          <path
            d="M 14.5 82 L 14.5 96 L 90 96 L 90 74"
            fill="none"
            stroke="#71717a"
            strokeWidth="1.1"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          {/* Layer 5: Crenellations / Battlements Tooth Highlights */}
          <path
            d="M 14.5 82 L 14.5 96 L 90 96 L 90 74"
            fill="none"
            stroke="#e4e4e7"
            strokeWidth="0.5"
            strokeDasharray="0.8 0.8"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />

          {/* Top-View Corner Watchtower Turrets (8 Key Junction Turrets) */}
          {[
            { cx: 14.5, cy: 18, label: '입구 북성루' },
            { cx: 14.5, cy: 4, label: '북서 성루' },
            { cx: 90, cy: 4, label: '북동 성루' },
            { cx: 90, cy: 26, label: 'MP 북성루' },
            { cx: 14.5, cy: 82, label: '입구 남성루' },
            { cx: 14.5, cy: 96, label: '남서 성루' },
            { cx: 90, cy: 96, label: '남동 성루' },
            { cx: 90, cy: 74, label: 'MP 남성루' },
          ].map((turret, idx) => (
            <g key={idx} className="cursor-pointer">
              {/* Outer Shadow Ring */}
              <circle cx={turret.cx} cy={turret.cy} r="2.3" fill="#000000" opacity="0.6" />
              {/* Stone Base Ring */}
              <circle cx={turret.cx} cy={turret.cy} r="2.0" fill="#18181b" stroke="#71717a" strokeWidth="0.4" />
              {/* Wall Deck Ring */}
              <circle cx={turret.cx} cy={turret.cy} r="1.4" fill="url(#turretRoofGrad)" stroke="#a1a1aa" strokeWidth="0.3" />
              {/* Center Arrow Slit Slits */}
              <line x1={turret.cx - 0.7} y1={turret.cy} x2={turret.cx + 0.7} y2={turret.cy} stroke="#f4f4f5" strokeWidth="0.3" />
              <line x1={turret.cx} y1={turret.cy - 0.7} x2={turret.cx} y2={turret.cy + 0.7} stroke="#f4f4f5" strokeWidth="0.3" />
              <circle cx={turret.cx} cy={turret.cy} r="0.3" fill="#dc2626" />
            </g>
          ))}

          {/* Top-Down Wall Labels */}
          <text
            x="52.25"
            y="2.8"
            fill="#e4e4e7"
            fontSize="2.2"
            fontWeight="bold"
            textAnchor="middle"
            className="drop-shadow-md select-none font-mono"
          >
            🏰 [북쪽 내성 외곽 성벽]
          </text>
          <text
            x="52.25"
            y="99.2"
            fill="#e4e4e7"
            fontSize="2.2"
            fontWeight="bold"
            textAnchor="middle"
            className="drop-shadow-md select-none font-mono"
          >
            🏰 [남쪽 내성 외곽 성벽]
          </text>
        </svg>

        {/* Castle Rooms Layout */}
        <div className="relative w-full h-full z-10">
          {state.rooms.map((room) => {
            const isSelected = room.id === selectedRoomId;
            const heroesInRoom = activeHeroes.filter(
              (h) => h.currentRoomId === room.id && h.status !== 'Defeated' && h.status !== 'Captured'
            );
            const anim = animatingRooms[room.id];

            // Render style depending on whether it's Entrance, MP, GOLD, White Marble, or standard
            const isGoldRoom = room.id === 'r_gold' || room.destinationType === 'GOLD';
            const isMpRoom = room.id === 'r_mp' || room.destinationType === 'MP';
            const isEntrance = room.isEntrance || isMpRoom;
            const isDestination = room.isDestination;

            // Marble white background is strictly for central corridors (north, south, mid-left, sanctuary path), excluding GOLD and MP
            const isWhiteMarble =
              !isGoldRoom &&
              !isMpRoom &&
              !room.isEntrance &&
              (room.id === 'r_north1' ||
                room.id === 'r_south1' ||
                room.id === 'r_mid_left' ||
                room.id === 'r_mid2');

            // Check trap installations
            const hasSpikeTrap = room.placedTraps.some(
              (t) => t.id.includes('spike') || t.name.includes('가시')
            );
            const hasPoisonTrap = room.placedTraps.some(
              (t) => t.id.includes('poison') || t.name.includes('독가스')
            );

            return (
              <div
                key={room.id}
                onClick={() => onSelectRoom && onSelectRoom(room.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverRoomId(room.id);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDragOverRoomId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverRoomId(null);
                  try {
                    const raw = e.dataTransfer.getData('text/plain');
                    if (!raw) return;
                    const data = JSON.parse(raw);
                    if (data.type === 'minion' && data.fromRoomId && data.instanceId) {
                      if (onMovePlacedMinion) {
                        onMovePlacedMinion(data.fromRoomId, data.instanceId, room.id);
                      }
                    } else if (data.type === 'lord') {
                      if (onMoveLord) {
                        onMoveLord(room.id);
                      }
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                style={{
                  left: `${room.x}%`,
                  top: `${room.y}%`,
                  width: `${room.width}%`,
                  height: `${room.height}%`,
                }}
                className={`absolute rounded-xl transition-all duration-200 cursor-pointer flex flex-col justify-between p-1.5 sm:p-2 border-2 shadow-2xl overflow-hidden ${
                  dragOverRoomId === room.id
                    ? 'bg-emerald-950/90 border-emerald-400 ring-4 ring-emerald-400/60 scale-[1.02] z-30'
                    : isSelected
                    ? isWhiteMarble
                      ? 'bg-slate-50 border-red-600 ring-4 ring-red-500/60 shadow-red-500/30 z-20'
                      : isGoldRoom
                      ? 'bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 border-red-600 ring-4 ring-red-500/60 shadow-yellow-500/50 z-20'
                      : 'bg-zinc-900/95 border-red-500 ring-2 ring-red-500/50 shadow-red-950 z-20'
                    : isGoldRoom
                    ? 'bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-600 border-yellow-200 shadow-xl shadow-yellow-500/40 hover:border-yellow-100 text-amber-950 font-extrabold'
                    : isEntrance
                    ? 'bg-gradient-to-br from-amber-950/80 via-zinc-900/90 to-zinc-950/90 border-amber-500/70 hover:border-amber-400'
                    : isWhiteMarble
                    ? 'bg-gradient-to-br from-stone-50 via-slate-100 to-stone-200 border-slate-300 hover:border-slate-500 text-stone-900 shadow-xl shadow-slate-300/30'
                    : isDestination
                    ? room.destinationType === 'PRISON'
                      ? 'bg-gradient-to-br from-purple-950/90 via-zinc-900 to-purple-900/90 border-purple-400'
                      : 'bg-gradient-to-br from-red-950/90 via-zinc-900 to-rose-900/90 border-red-400'
                    : 'bg-zinc-900/90 hover:bg-zinc-800/90 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {/* Marble Texture Effect for White Marble Rooms */}
                {isWhiteMarble && (
                  <div
                    className="absolute inset-0 pointer-events-none z-0 opacity-25 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:8px_8px]"
                    title="대리석 질감"
                  />
                )}
                {/* Gold Button Floating Above GOLD Room */}
                {isGoldRoom && (
                  <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFx.playClick();
                        if (onAddGold) onAddGold(4000);
                      }}
                      className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black text-[10px] sm:text-xs shadow-xl border border-amber-200 flex items-center gap-1 transition-all transform hover:scale-110 active:scale-95 cursor-pointer whitespace-nowrap"
                      title="골드 +4,000G 즉시 증가"
                    >
                      <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-950 fill-amber-900" />
                      +4,000G
                    </button>
                  </div>
                )}
                {/* MP Button Floating Above MP Room */}
                {isMpRoom && (
                  <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFx.playClick();
                        if (onAddMana) onAddMana(1000);
                      }}
                      className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-600 hover:from-purple-400 hover:to-indigo-300 text-white font-black text-[10px] sm:text-xs shadow-xl border border-purple-300 flex items-center gap-1 transition-all transform hover:scale-110 active:scale-95 cursor-pointer whitespace-nowrap"
                      title="마력 +1,000 MP 즉시 증가"
                    >
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-300 fill-yellow-300" />
                      +1,000 MP
                    </button>
                  </div>
                )}
                {/* Humanity Restoration Button Floating Directly Below MP Room */}
                {isMpRoom && canRestoreHumanity && (
                  <div className="absolute -bottom-9 sm:-bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-max">
                    <button
                      id="btn-humanity-restore-trigger-map"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFx.playVictory();
                        if (onOpenHumanityModal) onOpenHumanityModal();
                      }}
                      className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-400 hover:from-amber-300 hover:to-yellow-200 text-zinc-950 font-black text-[10px] sm:text-xs shadow-2xl shadow-amber-400/80 border-2 border-amber-200 flex items-center gap-1.5 transition-all transform hover:scale-110 active:scale-95 cursor-pointer animate-pulse"
                      title="주군의 인간성 회복 (하프 뱀파이어 ➔ 인간 전환)"
                    >
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-950 fill-amber-700" />
                      <span>✨ 인간성 회복</span>
                    </button>
                  </div>
                )}
                {/* Spike Pit Trap Floor Perforations (검은 타공) */}
                {hasSpikeTrap && (
                  <div className="absolute inset-2 pointer-events-none z-0 grid grid-cols-4 grid-rows-3 gap-2 opacity-80 overflow-hidden">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={`hole_${i}`}
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-black border border-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] mx-auto my-auto"
                        title="가시 바닥 타공"
                      />
                    ))}
                  </div>
                )}

                {/* Poison Gas Trap Wall Pipes (북쪽, 남쪽 배관) */}
                {hasPoisonTrap && (
                  <>
                    {/* North Wall Pipe */}
                    <div
                      className="absolute top-0 inset-x-2 h-2.5 bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800 border-b border-zinc-950 rounded-b shadow z-10 flex items-center justify-around px-2 pointer-events-none"
                      title="북쪽 독가스 분출 배관"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/90 border border-emerald-950 shadow" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/90 border border-emerald-950 shadow" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/90 border border-emerald-950 shadow" />
                    </div>
                    {/* South Wall Pipe */}
                    <div
                      className="absolute bottom-0 inset-x-2 h-2.5 bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800 border-t border-zinc-950 rounded-t shadow z-10 flex items-center justify-around px-2 pointer-events-none"
                      title="남쪽 독가스 분출 배관"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/90 border border-emerald-950 shadow" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/90 border border-emerald-950 shadow" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/90 border border-emerald-950 shadow" />
                    </div>
                  </>
                )}

                {/* Wall Opening / Hole Passages Indicators (East/West/North/South) */}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-zinc-950 border border-amber-500/80 rounded-r shadow" title="서측 구멍 (West)" />
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-4 bg-zinc-950 border border-amber-500/80 rounded-l shadow" title="동측 구멍 (East)" />

                {/* North Hole Indicator (Shown for middle and south rooms, not north rooms) */}
                {room.y > 20 && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-zinc-950 border border-amber-500/80 rounded-b shadow" title="북측 구멍 (North)" />
                )}

                {/* South Hole Indicator (Shown for middle and north rooms, not south rooms) */}
                {room.y < 60 && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-zinc-950 border border-amber-500/80 rounded-t shadow" title="남측 구멍 (South)" />
                )}

                {/* Room Name & Info Tag (Top-Left) */}
                <div className="absolute top-1 left-1.5 z-10 max-w-[50%]">
                  <span
                    className={`text-[9px] sm:text-[10px] font-black truncate flex items-center gap-0.5 ${
                      isWhiteMarble
                        ? 'text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]'
                        : isGoldRoom
                        ? 'text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
                        : 'text-zinc-100 drop-shadow'
                    }`}
                  >
                    {isEntrance && <span className="text-amber-400 font-black">★</span>}
                    {isSelected && <span className="text-red-500 font-black text-[9px]">🎯</span>}
                    {room.name.split(' ')[0]}
                  </span>
                </div>

                {/* Top-Right Container: Placed Monsters (Standardized Portrait Size matching North rooms) */}
                {!isEntrance ? (
                  <div className="absolute top-1 right-1 z-20 flex items-center justify-end gap-0.5">
                    {room.placedMinions.map((m) => {
                      const hpPct = Math.max(0, Math.min(100, Math.floor((m.currentHp / m.maxHp) * 100)));
                      const isDead = m.currentHp <= 0;
                      const lvl = m.level || 1 + Math.floor((m.bonusMaxHp || 0) / 6);

                      return (
                        <div
                          key={m.instanceId}
                          draggable={!isDead}
                          onDragStart={(e) => {
                            if (isDead) return;
                            e.stopPropagation();
                            e.dataTransfer.setData(
                              'text/plain',
                              JSON.stringify({ fromRoomId: room.id, instanceId: m.instanceId, type: 'minion' })
                            );
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className={`w-[50px] h-[50px] sm:w-[76px] sm:h-[76px] md:w-[101px] md:h-[101px] rounded-lg overflow-hidden border-2 ${
                            isDead ? 'border-red-600 animate-blink-twice' : 'border-red-500'
                          } bg-black shadow-md relative group flex-shrink-0 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform`}
                          title={`🖐️ [하수인] ${state.customNames?.[m.id] || m.name} (Lv.${lvl}, HP: ${m.currentHp}/${m.maxHp}, 공격력: ${m.attack})`}
                        >
                          <img
                            src={state.customImages[m.id] || m.imageUrl}
                            alt={state.customNames?.[m.id] || m.name}
                            className="w-full h-full object-cover animate-breath pointer-events-none"
                          />
                          {/* Bottom-Left Level Badge */}
                          <div className="absolute bottom-2 left-0.5 z-20 px-1 py-0.5 bg-purple-950/90 border border-purple-400/80 rounded text-[7px] sm:text-[9px] font-black text-purple-200 leading-none shadow pointer-events-none">
                            Lv.{lvl}
                          </div>
                          {/* Minion HP Bar */}
                          <div className="absolute bottom-0 inset-x-0 bg-black/80 h-1.5 sm:h-2 px-0.5 py-0.5 flex items-center z-10">
                            <div
                              className={`h-full rounded-full transition-all ${
                                hpPct > 50 ? 'bg-emerald-500' : hpPct > 20 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${hpPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {room.hasLord && (
                      <div
                        draggable={true}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify({ fromRoomId: room.id, type: 'lord' })
                          );
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="w-[50px] h-[50px] sm:w-[76px] sm:h-[76px] md:w-[101px] md:h-[101px] rounded-lg overflow-hidden border-2 border-amber-400 bg-black shadow-md flex-shrink-0 relative cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
                        title="👑 [드래그하여 주군 방 이동] 흡혈귀 주군"
                      >
                        <img
                          src={state.customImages['lord'] || state.lord.imageUrl}
                          alt={state.customNames?.['lord'] || state.lord.name}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        <Crown className="absolute bottom-0 right-0 w-3 h-3 text-amber-400 drop-shadow" />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Entrance Room Monster Positioning: Upper Slot (상부) & Lower Slot (하부) */
                  <div className="absolute inset-y-1 right-1 z-20 flex flex-col justify-between items-end pointer-events-auto">
                    {/* Upper Defense Slot (상부 방어 슬롯) */}
                    {room.placedMinions[0] ? (() => {
                      const m1 = room.placedMinions[0];
                      const hpPct1 = Math.max(0, Math.min(100, Math.floor((m1.currentHp / m1.maxHp) * 100)));
                      const isDead1 = m1.currentHp <= 0;
                      const lvl1 = m1.level || 1 + Math.floor((m1.bonusMaxHp || 0) / 6);
                      return (
                        <div
                          draggable={!isDead1}
                          onDragStart={(e) => {
                            if (isDead1) return;
                            e.stopPropagation();
                            e.dataTransfer.setData(
                              'text/plain',
                              JSON.stringify({
                                fromRoomId: room.id,
                                instanceId: m1.instanceId,
                                type: 'minion',
                              })
                            );
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className={`w-[46px] h-[46px] sm:w-[72px] sm:h-[72px] md:w-[96px] md:h-[96px] rounded-lg overflow-hidden border-2 ${
                            isDead1 ? 'border-red-600 animate-blink-twice' : 'border-red-500'
                          } bg-black shadow-md relative group cursor-grab active:cursor-grabbing hover:scale-105 transition-transform`}
                          title={`🖐️ [상부 슬롯] ${state.customNames?.[m1.id] || m1.name} (Lv.${lvl1}, HP: ${m1.currentHp}/${m1.maxHp})`}
                        >
                          <img
                            src={state.customImages[m1.id] || m1.imageUrl}
                            alt={state.customNames?.[m1.id] || m1.name}
                            className="w-full h-full object-cover animate-breath pointer-events-none"
                          />
                          <div className="absolute top-0.5 right-0.5 bg-red-950/90 text-red-200 border border-red-500/60 text-[6px] sm:text-[8px] font-black px-1 rounded">
                            상부
                          </div>
                          <div className="absolute bottom-2 left-0.5 z-20 px-1 py-0.5 bg-purple-950/90 border border-purple-400/80 rounded text-[7px] sm:text-[9px] font-black text-purple-200 leading-none shadow pointer-events-none">
                            Lv.{lvl1}
                          </div>
                          <div className="absolute bottom-0 inset-x-0 bg-black/80 h-1.5 sm:h-2 px-0.5 py-0.5 flex items-center z-10">
                            <div
                              className={`h-full rounded-full transition-all ${
                                hpPct1 > 50 ? 'bg-emerald-500' : hpPct1 > 20 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${hpPct1}%` }}
                            />
                          </div>
                        </div>
                      );
                    })() : room.hasLord ? (
                      <div
                        draggable={true}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify({ fromRoomId: room.id, type: 'lord' })
                          );
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="w-[46px] h-[46px] sm:w-[72px] sm:h-[72px] md:w-[96px] md:h-[96px] rounded-lg overflow-hidden border-2 border-amber-400 bg-black shadow-md relative cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
                        title="👑 [상부 주군 배치] 흡혈귀 주군"
                      >
                        <img
                          src={state.customImages['lord'] || state.lord.imageUrl}
                          alt={state.customNames?.['lord'] || state.lord.name}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        <div className="absolute top-0.5 right-0.5 bg-amber-950/90 text-amber-200 border border-amber-500/60 text-[6px] sm:text-[8px] font-black px-1 rounded">
                          상부
                        </div>
                        <Crown className="absolute bottom-0 right-0 w-3 h-3 text-amber-400 drop-shadow" />
                      </div>
                    ) : (
                      <div className="w-[46px] h-[46px] sm:w-[72px] sm:h-[72px] md:w-[96px] md:h-[96px] rounded-lg border border-dashed border-red-500/30 bg-zinc-950/30 flex flex-col items-center justify-center text-[7px] sm:text-[9px] text-zinc-400 font-bold">
                        <span>상부 슬롯</span>
                        <span className="text-[6px] sm:text-[8px] text-zinc-500 font-mono">(빈자리)</span>
                      </div>
                    )}

                    {/* Lower Defense Slot (하부 방어 슬롯) */}
                    {room.placedMinions[1] ? (() => {
                      const m2 = room.placedMinions[1];
                      const hpPct2 = Math.max(0, Math.min(100, Math.floor((m2.currentHp / m2.maxHp) * 100)));
                      const isDead2 = m2.currentHp <= 0;
                      const lvl2 = m2.level || 1 + Math.floor((m2.bonusMaxHp || 0) / 6);
                      return (
                        <div
                          draggable={!isDead2}
                          onDragStart={(e) => {
                            if (isDead2) return;
                            e.stopPropagation();
                            e.dataTransfer.setData(
                              'text/plain',
                              JSON.stringify({
                                fromRoomId: room.id,
                                instanceId: m2.instanceId,
                                type: 'minion',
                              })
                            );
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className={`w-[46px] h-[46px] sm:w-[72px] sm:h-[72px] md:w-[96px] md:h-[96px] rounded-lg overflow-hidden border-2 ${
                            isDead2 ? 'border-red-600 animate-blink-twice' : 'border-red-500'
                          } bg-black shadow-md relative group cursor-grab active:cursor-grabbing hover:scale-105 transition-transform`}
                          title={`🖐️ [하부 슬롯] ${state.customNames?.[m2.id] || m2.name} (Lv.${lvl2}, HP: ${m2.currentHp}/${m2.maxHp})`}
                        >
                          <img
                            src={state.customImages[m2.id] || m2.imageUrl}
                            alt={state.customNames?.[m2.id] || m2.name}
                            className="w-full h-full object-cover animate-breath pointer-events-none"
                          />
                          <div className="absolute top-0.5 right-0.5 bg-red-950/90 text-red-200 border border-red-500/60 text-[6px] sm:text-[8px] font-black px-1 rounded">
                            하부
                          </div>
                          <div className="absolute bottom-2 left-0.5 z-20 px-1 py-0.5 bg-purple-950/90 border border-purple-400/80 rounded text-[7px] sm:text-[9px] font-black text-purple-200 leading-none shadow pointer-events-none">
                            Lv.{lvl2}
                          </div>
                          <div className="absolute bottom-0 inset-x-0 bg-black/80 h-1.5 sm:h-2 px-0.5 py-0.5 flex items-center z-10">
                            <div
                              className={`h-full rounded-full transition-all ${
                                hpPct2 > 50 ? 'bg-emerald-500' : hpPct2 > 20 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${hpPct2}%` }}
                            />
                          </div>
                        </div>
                      );
                    })() : (room.placedMinions[0] && room.hasLord) ? (
                      <div
                        draggable={true}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify({ fromRoomId: room.id, type: 'lord' })
                          );
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="w-[46px] h-[46px] sm:w-[72px] sm:h-[72px] md:w-[96px] md:h-[96px] rounded-lg overflow-hidden border-2 border-amber-400 bg-black shadow-md relative cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
                        title="👑 [하부 주군 배치] 흡혈귀 주군"
                      >
                        <img
                          src={state.customImages['lord'] || state.lord.imageUrl}
                          alt={state.customNames?.['lord'] || state.lord.name}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        <div className="absolute top-0.5 right-0.5 bg-amber-950/90 text-amber-200 border border-amber-500/60 text-[6px] sm:text-[8px] font-black px-1 rounded">
                          하부
                        </div>
                        <Crown className="absolute bottom-0 right-0 w-3 h-3 text-amber-400 drop-shadow" />
                      </div>
                    ) : (
                      <div className="w-[46px] h-[46px] sm:w-[72px] sm:h-[72px] md:w-[96px] md:h-[96px] rounded-lg border border-dashed border-red-500/30 bg-zinc-950/30 flex flex-col items-center justify-center text-[7px] sm:text-[9px] text-zinc-400 font-bold">
                        <span>하부 슬롯</span>
                        <span className="text-[6px] sm:text-[8px] text-zinc-500 font-mono">(빈자리)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Left-Center Container: Invading Heroes (Enters from left-center, stacked vertically with slight overlap when multiple) */}
                <div className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-start -space-y-4 sm:-space-y-6 md:-space-y-8">
                  {heroesInRoom.map((hero, index) => (
                    <div
                      key={`${hero.instanceId}_${hero.currentRoomId}`}
                      style={{ zIndex: 20 + index }}
                      className="w-[48px] h-[48px] sm:w-[70px] sm:h-[70px] md:w-[92px] md:h-[92px] rounded-lg overflow-hidden border-2 border-amber-400 bg-black shadow-lg flex-shrink-0 relative animate-room-passage animate-move-4dir hover:z-30 hover:scale-105 transition-all"
                      title={`침입 용사 #${index + 1}: ${state.customNames?.[hero.id] || hero.name} (HP ${hero.currentHp}/${hero.maxHp})`}
                    >
                      <img
                        src={state.customImages[hero.id] || hero.imageUrl}
                        alt={state.customNames?.[hero.id] || hero.name}
                        className="w-full h-full object-cover animate-waddle"
                      />
                      {/* Hero Index / Count Badge overlay so user instantly knows count */}
                      <div className="absolute top-0.5 left-0.5 bg-black/80 text-amber-300 border border-amber-500/60 text-[6px] sm:text-[8px] font-black px-1 rounded flex items-center gap-0.5 shadow">
                        <span>#{index + 1}</span>
                      </div>
                      <div className="absolute top-0.5 right-0.5 bg-black/80 text-amber-300 border border-amber-500/60 text-[6px] sm:text-[8px] font-black px-1 rounded flex items-center gap-0.5 shadow">
                        <span className="animate-compass-dir">🧭</span>
                        <span>동서남북</span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-red-950/80">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-300"
                          style={{ width: `${Math.max(0, (hero.currentHp / hero.maxHp) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Destination Special Label Prominent Render */}
                {isDestination && (
                  <div className="my-auto text-center z-10">
                    <div className="text-[10px] sm:text-xs font-black tracking-widest drop-shadow">
                      {room.destinationType === 'GOLD' && (
                        <span className="text-amber-300 bg-amber-950/90 px-1.5 py-0.5 rounded border border-amber-400/60 shadow">
                          GOLD
                        </span>
                      )}
                      {room.destinationType === 'PRISON' && (
                        <span className="text-purple-300 bg-purple-950/90 px-1.5 py-0.5 rounded border border-purple-400/60 shadow">
                          PRISON
                        </span>
                      )}
                      {room.destinationType === 'MP' && (
                        <span className="text-red-300 bg-red-950/90 px-1.5 py-0.5 rounded border border-red-400/60 shadow">
                          MP
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Traps Installed Preview Badges (Bottom-Right) */}
                <div className="absolute bottom-1 right-1 z-10 flex items-center gap-0.5">
                  {room.placedTraps.map((t, idx) => (
                    <div
                      key={`trap_${idx}`}
                      className="px-1 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/50 text-[8px] font-bold flex items-center gap-0.5"
                      title={`함정: ${t.name}`}
                    >
                      <Zap className="w-2.5 h-2.5 text-amber-400" />
                    </div>
                  ))}
                </div>

                {/* Combat Animation Overlay (Direct Physical Strike Action 1v1 Combat) */}
                {anim && anim.type === 'combat' && (() => {
                  const fightingHero = heroesInRoom[0];
                  const fightingMinion = room.placedMinions.find((m) => m.currentHp > 0 || m.isEscaped) || room.placedMinions[0];
                  const hasLordInRoom = room.hasLord;

                  const heroImg = fightingHero ? (state.customImages[fightingHero.id] || fightingHero.imageUrl) : '';
                  const heroName = fightingHero ? (state.customNames?.[fightingHero.id] || fightingHero.name) : '용사';
                  const heroHp = fightingHero ? fightingHero.currentHp : 100;
                  const heroMaxHp = fightingHero ? fightingHero.maxHp : 100;

                  const defenderImg = fightingMinion
                    ? (state.customImages[fightingMinion.id] || fightingMinion.imageUrl)
                    : hasLordInRoom
                    ? (state.customImages['lord'] || state.lord.imageUrl)
                    : '';

                  const defenderName = fightingMinion
                    ? (state.customNames?.[fightingMinion.id] || fightingMinion.name)
                    : hasLordInRoom
                    ? (state.customNames?.['lord'] || state.lord.name)
                    : '하수인';

                  const defenderHp = fightingMinion ? fightingMinion.currentHp : hasLordInRoom ? state.lord.baseHp : 100;
                  const defenderMaxHp = fightingMinion ? fightingMinion.maxHp : hasLordInRoom ? state.lord.baseHp : 100;

                  return (
                    <div className="absolute inset-0 bg-red-950/95 border-2 border-red-500 rounded-xl flex flex-col items-center justify-between p-1 z-30 overflow-hidden shadow-2xl">
                      {/* Top Banner */}
                      <div className="z-20 bg-black/90 px-2 py-0.5 rounded-full border border-red-500/80 shadow flex items-center gap-1 mt-0.5">
                        <Swords className="w-3 h-3 text-amber-300 animate-pulse" />
                        <span className="text-[8px] sm:text-[10px] font-black text-amber-200">
                          ⚔️ 1대1 직접 맞대결 타격!
                        </span>
                      </div>

                      {/* Direct Physical Attack Clash Arena */}
                      <div className="flex items-center justify-center gap-1 sm:gap-3 z-20 my-auto relative w-full px-1">
                        {/* Hero Portrait (Left) -> Strikes Right directly */}
                        {heroImg && (
                          <div className="flex flex-col items-center relative animate-direct-strike-hero z-20">
                            <div
                              className="w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 border-amber-400 bg-black shadow-2xl relative"
                              title={`[용사] ${heroName}`}
                            >
                              <img src={heroImg} alt={heroName} className="w-full h-full object-cover" />
                              <div className="absolute top-0 left-0 bg-amber-500 text-black text-[6px] sm:text-[8px] font-black px-1 rounded-br">
                                용사
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-900 border border-zinc-700 rounded-full mt-0.5 overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 transition-all"
                                style={{ width: `${Math.max(0, (heroHp / heroMaxHp) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Impact Slash/Sparks Center Burst */}
                        <div className="relative z-30 flex flex-col items-center justify-center">
                          <div className="text-red-500 font-black text-xs sm:text-base animate-impact-slash drop-shadow-[0_0_10px_rgba(239,68,68,1)]">
                            💥⚔️💥
                          </div>
                          <span className="text-amber-300 font-black text-[8px] sm:text-[10px] animate-pulse">VS</span>
                        </div>

                        {/* Defender Portrait (Right) -> Strikes Left directly */}
                        {defenderImg && (
                          <div className="flex flex-col items-center relative animate-direct-strike-defender z-20">
                            <div
                              className="w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 border-red-500 bg-black shadow-2xl relative"
                              title={`[수비자] ${defenderName}`}
                            >
                              <img src={defenderImg} alt={defenderName} className="w-full h-full object-cover" />
                              <div className="absolute top-0 right-0 bg-red-600 text-white text-[6px] sm:text-[8px] font-black px-1 rounded-bl">
                                {hasLordInRoom && !fightingMinion ? '주군' : '하수인'}
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-900 border border-zinc-700 rounded-full mt-0.5 overflow-hidden">
                              <div
                                className="h-full bg-purple-400 transition-all"
                                style={{ width: `${Math.max(0, (defenderHp / defenderMaxHp) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {anim.damageText && (
                        <span className="text-[8px] sm:text-[10px] font-mono font-bold text-red-100 bg-black/90 px-2 py-0.5 rounded mb-0.5 z-20 border border-red-800">
                          {anim.damageText}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Trap Mechanism Animation Overlay (When trap triggers in this room and hero is present) */}
                {anim && anim.type === 'trap' && (
                  (() => {
                    if (heroesInRoom.length === 0) return null;

                    const trappedHero = heroesInRoom[0];
                    const heroImg = trappedHero ? (state.customImages[trappedHero.id] || trappedHero.imageUrl) : '';
                    const heroName = trappedHero ? (state.customNames?.[trappedHero.id] || trappedHero.name) : '용사';

                    const isSpikeAnim =
                      anim.trapType?.includes('가시') ||
                      anim.trapType?.includes('spike') ||
                      hasSpikeTrap;
                    const isPoisonAnim =
                      anim.trapType?.includes('독가스') ||
                      anim.trapType?.includes('poison') ||
                      hasPoisonTrap;

                    if (isSpikeAnim) {
                      return (
                        <div className="absolute inset-0 bg-black/80 border-2 border-zinc-400 rounded-xl flex flex-col items-center justify-between p-1 z-30 overflow-hidden">
                          {/* Trapped Hero Portrait in Center getting hit */}
                          {heroImg && (
                            <div className="absolute top-1 z-20 animate-shake">
                              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg overflow-hidden border-2 border-red-500 bg-black shadow-lg">
                                <img src={heroImg} alt={heroName} className="w-full h-full object-cover" />
                              </div>
                            </div>
                          )}

                          {/* Gray Spikes Thrusting Up from Floor */}
                          <div className="absolute inset-x-0 bottom-0 top-1 flex items-end justify-around px-1 z-10 pointer-events-none">
                            {Array.from({ length: 7 }).map((_, idx) => (
                              <div
                                key={`spike_${idx}`}
                                className="w-2.5 sm:w-3.5 h-10 sm:h-14 bg-gradient-to-t from-zinc-700 via-zinc-300 to-zinc-100 shadow-xl animate-spike-thrust"
                                style={{
                                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                                  animationDelay: `${idx * 0.04}s`,
                                }}
                              />
                            ))}
                          </div>

                          <div className="z-20 text-center bg-zinc-950/95 px-2 py-0.5 rounded border border-zinc-500 shadow-lg my-auto mt-8 sm:mt-10">
                            <span className="text-[9px] sm:text-[11px] font-black text-zinc-100 drop-shadow flex items-center gap-1 justify-center">
                              📌 [{heroName}] 가시 함정 직격!
                            </span>
                            <span className="text-[8px] sm:text-[10px] font-mono font-bold text-red-400 block">
                              {anim.damageText || '-35 HP'}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    if (isPoisonAnim) {
                      return (
                        <div className="absolute inset-0 bg-emerald-950/85 border-2 border-emerald-500 rounded-xl flex flex-col items-center justify-center p-1 z-30 overflow-hidden">
                          {/* Trapped Hero Portrait in Center getting hit */}
                          {heroImg && (
                            <div className="absolute top-1 z-20 animate-pulse">
                              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg overflow-hidden border-2 border-emerald-400 bg-black shadow-lg">
                                <img src={heroImg} alt={heroName} className="w-full h-full object-cover" />
                              </div>
                            </div>
                          )}

                          {/* Dark Green Poison Gas Billowing */}
                          <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/70 via-emerald-950/90 to-emerald-900/70 z-10 animate-pulse pointer-events-none" />
                          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-emerald-600/50 rounded-full blur-md animate-gas-rise" />
                            <div
                              className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/40 rounded-full blur-lg animate-gas-rise"
                              style={{ animationDelay: '0.25s' }}
                            />
                          </div>

                          <div className="z-20 text-center bg-emerald-950/95 px-2 py-0.5 rounded border border-emerald-400 shadow-lg my-auto mt-8 sm:mt-10">
                            <span className="text-[9px] sm:text-[11px] font-black text-emerald-300 drop-shadow flex items-center gap-1 justify-center">
                              ☠️ [{heroName}] 독가스 중독!
                            </span>
                            <span className="text-[8px] sm:text-[10px] font-mono font-bold text-emerald-200 block">
                              {anim.damageText || '-25 HP'}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="absolute inset-0 bg-amber-950/90 border-2 border-amber-400 rounded-xl flex flex-col items-center justify-center p-1 z-30 animate-pulse">
                        <Flame className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 animate-bounce" />
                        <span className="text-[9px] sm:text-[11px] font-extrabold text-amber-300 mt-1 drop-shadow">
                          ⚡ [{heroName}] 함정 피격!
                        </span>
                        <span className="text-[8px] sm:text-[10px] font-mono font-bold text-amber-200">
                          {anim.trapType || '데미지 발동'}
                        </span>
                      </div>
                    );
                  })()
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
