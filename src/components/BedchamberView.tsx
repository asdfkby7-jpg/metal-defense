import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Sparkles,
  Flame,
  Moon,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Zap,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { GameState, Hero, Minion } from '../types';
import { soundFx } from '../utils/audio';
import { initialHeroesCatalog } from '../data/defaultData';

interface BedchamberViewProps {
  state: GameState;
  onCompleteChamberEncounter: (heroId: string, mpReward: number, dialogueSummary: string) => void;
}

interface DialogueNode {
  speaker: string;
  text: string;
  isLord?: boolean;
  choices?: {
    text: string;
    intensity: 'romantic' | 'deep' | 'passionate';
    nextStep: number;
    reactionText: string;
  }[];
}

interface HeroChamberStory {
  heroId: string;
  title: string;
  subtitle: string;
  bgGlow: string;
  rank: string;
  mpReward: number;
  intro: string;
  dialogueNodes: DialogueNode[];
  climaxDialogue: {
    kissText: string;
    intimacyText: string;
    conclusionText: string;
  };
}

export const BedchamberView: React.FC<BedchamberViewProps> = ({
  state,
  onCompleteChamberEncounter,
}) => {
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [storyStep, setStoryStep] = useState<number>(0);
  const [selectedChoiceReaction, setSelectedChoiceReaction] = useState<string | null>(null);
  const [isKissing, setIsKissing] = useState<boolean>(false);
  const [isCompletedInSession, setIsCompletedInSession] = useState<boolean>(false);

  // Find all imprinted heroes (strictly through 3-drains imprint)
  const imprintedMinions = state.inventoryMinions.filter(
    (m) =>
      (m.isCustomHeroMinion || m.id.startsWith('minion_converted_')) &&
      (m.isImprinted || (state.imprintedHeroIds && state.imprintedHeroIds.includes(m.originalHeroId || '')))
  );

  // Match converted minions with Hero templates
  const availableHeroList: Hero[] = [];
  const processedIds = new Set<string>();

  imprintedMinions.forEach((minion) => {
    const heroId =
      minion.originalHeroId ||
      minion.id.replace('minion_converted_', '') ||
      '';
    if (heroId && !processedIds.has(heroId)) {
      processedIds.add(heroId);
      const found = initialHeroesCatalog.find((h) => h.id === heroId);
      if (found) {
        availableHeroList.push(found);
      } else {
        // Fallback reconstructed Hero
        availableHeroList.push({
          id: heroId,
          name: minion.originalHeroName || minion.name.replace('아군이 된 ', ''),
          title: '각인된 아군 용사',
          rank: minion.tier >= 4 ? 'Platinum' : minion.tier === 3 ? 'Gold' : 'Silver',
          hp: minion.hp,
          maxHp: minion.maxHp,
          attack: minion.attack,
          defense: minion.defense,
          speed: minion.speed,
          goldReward: 500,
          manaPurity: 200,
          description: minion.description,
          imageUrl: minion.imageUrl,
          isBLHero: true,
        });
      }
    }
  });

  // Also include any in convertedHeroIds if not in processedIds
  (state.convertedHeroIds || []).forEach((heroId) => {
    if (!processedIds.has(heroId)) {
      processedIds.add(heroId);
      const found = initialHeroesCatalog.find((h) => h.id === heroId);
      if (found) availableHeroList.push(found);
    }
  });

  // Helper to calculate MP reward based on rank
  const getMpRewardByRank = (rank: string) => {
    switch (rank) {
      case 'Royal':
        return 700;
      case 'Platinum':
        return 500;
      case 'Gold':
        return 350;
      case 'Silver':
        return 200;
      case 'Bronze':
      default:
        return 120;
    }
  };

  // Get rich dialogue story for hero
  const getHeroStory = (hero: Hero): HeroChamberStory => {
    const lordName = state.customNames?.['lord'] || state.lord.name;
    const heroName = state.customNames?.[hero.id] || hero.name;
    const mpReward = getMpRewardByRank(hero.rank);

    // Dynamic tailored storylines per hero archetype
    if (hero.id === 'h_bl_prince' || hero.id.includes('prince')) {
      return {
        heroId: hero.id,
        title: `${heroName} - 달빛 아래의 서약`,
        subtitle: `은발의 하이엘프 왕자 (${hero.rank} Rank)`,
        bgGlow: 'from-pink-950/40 via-purple-950/30 to-zinc-950',
        rank: hero.rank,
        mpReward,
        intro: `달빛이 비치는 영주의 침실. 은빛 머리칼의 ${heroName}가 뒷목에 새겨진 붉은 흡혈 각인을 매만지며 침대 곁으로 조용히 다가옵니다.`,
        dialogueNodes: [
          {
            speaker: heroName,
            text: `"...주군. 뒷목의 각인이 욱신거릴 때마다 당신의 갈증과 숨결이 제 심장까지 전해집니다. 이 방으로 절 부르신 이유가 무엇입니까?"`,
            choices: [
              {
                text: `"네 고결한 영혼과 온기를 더 가까이 느끼고 싶었다."`,
                intensity: 'romantic',
                nextStep: 1,
                reactionText: `${heroName}의 귓가가 붉게 물들며 시선을 비스듬히 내립니다.`,
              },
              {
                text: `"내 충성스러운 기사로서, 오늘 밤은 내 곁을 지켜라."`,
                intensity: 'deep',
                nextStep: 1,
                reactionText: `${heroName}가 결연한 눈빛으로 가슴에 손을 얹고 한 발짝 다가섭니다.`,
              },
              {
                text: `"더 이상 숨기지 마라. 너 역시 내게 닿기를 원하고 있지 않나?"`,
                intensity: 'passionate',
                nextStep: 1,
                reactionText: `${heroName}의 숨이 순간 멎으며 도발적인 시선으로 주군을 마주합니다.`,
              },
            ],
          },
          {
            speaker: heroName,
            text: `"당신의 흡혈은 차갑지만... 마주 잡은 손끝은 잔인할 만큼 뜨겁군요. 더 이상 왕가의 긍지도, 기사의 맹세도 소용없습니다. 제 영혼은 이미 당신의 것입니다."`,
            choices: [
              {
                text: `(손을 뻗어 그의 뺨을 어루만지며 입술을 포갠다)`,
                intensity: 'romantic',
                nextStep: 2,
                reactionText: `부드럽고 농밀한 입맞춤과 함께 두 사람의 마력이 강렬하게 교명합니다.`,
              },
              {
                text: `(그의 뒷목 각인을 살며시 쓸어내리며 깊숙이 입맞춘다)`,
                intensity: 'passionate',
                nextStep: 2,
                reactionText: `${heroName}가 낮은 신음을 흘리며 주군의 품에 완전히 몸을 기댑니다.`,
              },
            ],
          },
        ],
        climaxDialogue: {
          kissText: `달콤하면서도 아찔한 키스가 길게 이어지자, ${heroName}의 눈동자가 황홀한 마력의 빛으로 젖어듭니다.`,
          intimacyText: `침실의 장막이 드리워지고, 두 사람은 서로의 온기와 호흡을 밤새 얽으며 깊고 농밀한 밀애의 밤을 나눕니다. 고위 엘프의 순수한 영혼이 주군에게 완전히 헌신하며 체내 깊은 마력이 일체화됩니다.`,
          conclusionText: `영혼의 교감을 통해 주군의 근원 마력 풀이 폭발적으로 정화되어 영구 MP +${mpReward}가 개화되었습니다!`,
        },
      };
    } else if (hero.id === 'h_bl_knight_commander' || hero.id.includes('commander')) {
      return {
        heroId: hero.id,
        title: `${heroName} - 갑주를 벗어던진 맹세`,
        subtitle: `제국 성기사단 부단장 (${hero.rank} Rank)`,
        bgGlow: 'from-purple-950/40 via-indigo-950/30 to-zinc-950',
        rank: hero.rank,
        mpReward,
        intro: `무거운 제복과 견장을 내려놓은 ${heroName}가 단정한 셔츠 차림으로 영주의 침실 침상 앞에 무릎을 꿇고 서 있습니다.`,
        dialogueNodes: [
          {
            speaker: heroName,
            text: `"교단의 규율보다... 주군 당신의 손길이 제게는 더욱 절대적인 율법이 되었습니다. 오늘 밤, 절 어찌 명하시겠습니까."`,
            choices: [
              {
                text: `"무릎을 꿇을 필요 없다. 내 곁에 나란히 누워라."`,
                intensity: 'romantic',
                nextStep: 1,
                reactionText: `${heroName}가 수줍게 일어나 조심스럽게 침상 곁으로 다가옵니다.`,
              },
              {
                text: `"부단장으로서의 가면을 벗고, 오직 내 연인으로서 존재해라."`,
                intensity: 'deep',
                nextStep: 1,
                reactionText: `${heroName}의 단단한 가슴이 거칠게 오르내리며 눈시울이 붉어집니다.`,
              },
              {
                text: `"내 갈증을 채워줄 준비가 되었느냐."`,
                intensity: 'passionate',
                nextStep: 1,
                reactionText: `${heroName}가 스스로 셔츠 깃을 풀어 헤치며 쇄골과 각인을 드러냅니다.`,
              },
            ],
          },
          {
            speaker: heroName,
            text: `"주군... 제 숨도, 심장 박동도 모두 당신의 것입니다. 당신의 품 안에서라면 영원히 타락해도 여한이 없습니다."`,
            choices: [
              {
                text: `(그의 굳은 어깨를 끌어당겨 열정적인 키스를 나눈다)`,
                intensity: 'passionate',
                nextStep: 2,
                reactionText: `숨 쉴 틈 없는 열정적인 입맞춤이 두 사람의 체온을 한계까지 끌어올립니다.`,
              },
            ],
          },
        ],
        climaxDialogue: {
          kissText: `단단한 체구의 성기사가 주군의 리드에 따라 허리를 떨며 깊은 키스에 순응합니다.`,
          intimacyText: `밤이 깊어갈수록 침실 안은 두 사람의 억눌렸던 열정과 숨결로 가득 차오릅니다. 성스러운 신성력과 암흑 마력이 격렬히 뒤섞이며 침대 위에서 끝없는 사랑의 교환이 이어집니다.`,
          conclusionText: `최고위 성기사단장의 모든 정기가 주군에게 흡수되어 영구 MP +${mpReward}가 개화되었습니다!`,
        },
      };
    } else if (hero.id === 'h_exp_templar' || hero.id.includes('templar')) {
      return {
        heroId: hero.id,
        title: `${heroName} - 성검사의 순백 밀애`,
        subtitle: `순백 결계의 성검사 (${hero.rank} Rank)`,
        bgGlow: 'from-sky-950/40 via-purple-950/30 to-zinc-950',
        rank: hero.rank,
        mpReward,
        intro: `순백의 결계를 다루던 성검사 ${heroName}가 촛불 하나만 켜진 어둑한 침실에서 머뭇거리며 주군을 응시합니다.`,
        dialogueNodes: [
          {
            speaker: heroName,
            text: `"절 3번이나 흡혈하여 뒷목에 각인을 새기셨을 때부터... 제 검은 이미 주군 당신만을 위해 휘둘러지기로 정해져 있었습니다. 이 침상 위에서도 마찬가지입니다."`,
            choices: [
              {
                text: `"네 순결한 결계는 이제 날 지키는 가장 견고한 요람이다."`,
                intensity: 'romantic',
                nextStep: 1,
                reactionText: `${heroName}가 옅은 미소를 지으며 손가락을 얽어옵니다.`,
              },
              {
                text: `"네 모든 것을 원한다. 결계를 풀고 내게 전부 내맡겨라."`,
                intensity: 'passionate',
                nextStep: 1,
                reactionText: `${heroName}가 전율하며 순백의 로브를 부드럽게 흘러내립니다.`,
              },
            ],
          },
          {
            speaker: heroName,
            text: `"아아... 주군... 제 몸이 타오르는 것처럼 뜨겁습니다. 부디 저를 안아주십시오."`,
            choices: [
              {
                text: `(그의 입술을 탐하며 침상 위로 쓰러뜨린다)`,
                intensity: 'passionate',
                nextStep: 2,
                reactionText: `입술 사이로 흘러나오는 뜨거운 교성이 방 안을 가득 메웁니다.`,
              },
            ],
          },
        ],
        climaxDialogue: {
          kissText: `떨리는 입술이 포개어지고, 성검사의 고결했던 호흡이 주군의 혀끝에 사로잡혀 농밀하게 녹아내립니다.`,
          intimacyText: `두 사람의 나신이 얽히며 새벽이 밝아올 때까지 농밀한 사랑의 밤이 지속됩니다. 성검사의 정결한 순백 마력이 주군의 핏줄 속으로 흘러들어가 완벽한 조화를 이룹니다.`,
          conclusionText: `최상위 성검사와의 첫 합방으로 영구 MP +${mpReward}를 흡수하였습니다!`,
        },
      };
    } else {
      // General converted hero storyline
      return {
        heroId: hero.id,
        title: `${heroName} - 주군과의 은밀한 밤`,
        subtitle: `${hero.title} (${hero.rank} Rank)`,
        bgGlow: 'from-red-950/40 via-purple-950/30 to-zinc-950',
        rank: hero.rank,
        mpReward,
        intro: `주군의 각인을 받은 ${heroName}가 은밀한 부름을 받고 조용히 영주의 침실로 들어섰습니다.`,
        dialogueNodes: [
          {
            speaker: heroName,
            text: `"주군... 각인이 새겨진 후 매일 밤 당신의 꿈을 꾸었습니다. 저를 이곳으로 부르신 뜻을 받들겠습니다."`,
            choices: [
              {
                text: `"네 헌신에 보답하고자 한다. 편히 다가오너라."`,
                intensity: 'romantic',
                nextStep: 1,
                reactionText: `${heroName}가 안도하며 주군의 손을 조심스레 쥡니다.`,
              },
              {
                text: `"오늘 밤은 나와 하나가 되어 진정한 힘을 나누자."`,
                intensity: 'passionate',
                nextStep: 1,
                reactionText: `${heroName}의 눈빛에 붉은 열정이 깃들며 침대로 다가옵니다.`,
              },
            ],
          },
          {
            speaker: heroName,
            text: `"제 모든 충성과 마음을 당신께 바치겠습니다. 주군... 사랑합니다."`,
            choices: [
              {
                text: `(그의 허리를 감싸 안고 깊게 입맞춘다)`,
                intensity: 'passionate',
                nextStep: 2,
                reactionText: `달콤한 입맞춤과 함께 두 사람의 몸이 하나로 밀착됩니다.`,
              },
            ],
          },
        ],
        climaxDialogue: {
          kissText: `서로를 갈구하는 뜨거운 키스가 이어지며 침실의 공기가 후끈 달아오릅니다.`,
          intimacyText: `침대 위에서 두 사람은 격정적이면서도 다정한 밀회를 나눕니다. 용사의 체내에 잠들어 있던 마력 에너지가 주군에게 완벽히 전이되며 황홀경을 선사합니다.`,
          conclusionText: `깊은 정사의 교감을 통해 영구 MP +${mpReward}를 획득하였습니다!`,
        },
      };
    }
  };

  const handleStartStory = (hero: Hero) => {
    soundFx.playClick();
    setSelectedHero(hero);
    setStoryStep(0);
    setSelectedChoiceReaction(null);
    setIsKissing(false);
    setIsCompletedInSession(false);
  };

  const handleSelectChoice = (reaction: string, nextStep: number) => {
    soundFx.playClick();
    setSelectedChoiceReaction(reaction);
    setTimeout(() => {
      setStoryStep(nextStep);
      setSelectedChoiceReaction(null);
    }, 1200);
  };

  const handleTriggerClimax = (hero: Hero, story: HeroChamberStory) => {
    soundFx.playLordEmpower();
    setIsKissing(true);
    setTimeout(() => {
      setStoryStep(3); // Climax intimacy stage
      setIsKissing(false);
    }, 2000);
  };

  const handleFinishEncounter = (hero: Hero, story: HeroChamberStory) => {
    soundFx.playLordEmpower();
    const alreadyCompleted = (state.chamberCompletedHeroIds || []).includes(hero.id);
    const rewardMp = alreadyCompleted ? 0 : story.mpReward;

    onCompleteChamberEncounter(
      hero.id,
      rewardMp,
      `${hero.name}와의 농밀한 하룻밤 정사 완료! (+${rewardMp} MP)`
    );

    setIsCompletedInSession(true);
  };

  return (
    <div className="space-y-6">
      {/* Bedchamber Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-rose-950 to-zinc-950 p-6 rounded-2xl border border-rose-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Heart className="w-64 h-64 text-rose-500 fill-rose-500" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-900/50 border border-rose-500/50 text-rose-300">
              <Heart className="w-6 h-6 fill-rose-400 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-rose-100 flex items-center gap-2">
                영주의 침실 (Lord's Bedchamber)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-900/60 text-rose-300 border border-rose-500/40 font-semibold">
                  농밀한 밀애의 성소
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-rose-300/80">
                뒷목 각인을 받아 완전한 충성을 맹세한 아군 용사를 침실로 소환하여 농밀한 선택형 대화와 키스, 밤자리를 나누세요.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-3 text-xs text-zinc-300">
            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-rose-900/40">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>
                <strong>용사 1명당 1회 한정:</strong> 첫 밀애 완료 시 용사 등급에 따른 <strong>영구 MP 대량 획득!</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-rose-900/40">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>
                <strong>흡정야행 강화 연동:</strong> 보유 MP가 높을수록 뱀서라이크 전투의 <strong>투사체 공격력/탄속/재장전 속도 대폭 상승!</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Hero Selector or Active Story Stage */}
      {!selectedHero ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-rose-400" />
              침실로 초대 가능한 각인 아군 용사 목록 ({availableHeroList.length}명)
            </h3>
          </div>

          {availableHeroList.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800 space-y-3">
              <Lock className="w-12 h-12 text-zinc-600 mx-auto" />
              <div className="text-base font-bold text-zinc-300">
                아직 전향된 각인 용사가 없습니다
              </div>
              <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                지하 감옥(PRISON)에서 포로의 피를 3회 채취하여 <strong>'뒷목 각인'</strong> 의식을 완료하면,
                해당 용사가 아군으로 전향되어 이곳 침실로 소환할 수 있게 됩니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableHeroList.map((hero) => {
                const isCompleted = (state.chamberCompletedHeroIds || []).includes(hero.id);
                const mpReward = getMpRewardByRank(hero.rank);
                const heroImg = state.customImages?.[hero.id] || hero.imageUrl;
                const heroCustomName = state.customNames?.[hero.id] || hero.name;

                return (
                  <motion.div
                    key={hero.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isCompleted
                        ? 'bg-zinc-900/60 border-zinc-800'
                        : 'bg-gradient-to-b from-rose-950/30 to-zinc-900/90 border-rose-800/40 shadow-lg shadow-rose-950/30 hover:border-rose-500'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-3.5">
                        <div className="relative">
                          <img
                            src={heroImg}
                            alt={heroCustomName}
                            className="w-16 h-16 rounded-xl object-cover border-2 border-rose-500/60 bg-zinc-950 shadow-md"
                          />
                          <span className="absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500">
                            {hero.rank}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-bold text-zinc-100 truncate">
                              {heroCustomName}
                            </h4>
                            {isCompleted ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                                <CheckCircle2 className="w-3 h-3" />
                                밀애 완료
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-500/40 animate-pulse">
                                <Heart className="w-3 h-3 fill-rose-400" />
                                MP 미수령
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate">{hero.title}</p>
                          <p className="text-[11px] text-rose-400/90 font-medium mt-1">
                            {hero.personality || '주군에게 뒷목 각인을 받아 심장이 요동침'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-black/40 p-3 rounded-xl border border-zinc-800 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-zinc-400">
                          <span>밀애 보상 (첫 1회):</span>
                          <span className="font-bold text-purple-400 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" />
                            +{mpReward} MP
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-400">
                          <span>친밀도 & 교감 상태:</span>
                          <span className="font-bold text-rose-300">
                            {isCompleted ? '완전한 반려 (영혼 일체)' : '농밀한 밤 대기 중'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartStory(hero)}
                      className={`w-full mt-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                        isCompleted
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                          : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-900/50'
                      }`}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                      <span>{isCompleted ? '다시 밀애 나누기' : '침실로 소환하기'}</span>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Active Bedchamber Visual-Novel Scene */
        (() => {
          const story = getHeroStory(selectedHero);
          const heroImg = state.customImages?.[selectedHero.id] || selectedHero.imageUrl;
          const lordImg = state.customImages?.['lord'] || state.lord.imageUrl;
          const heroCustomName = state.customNames?.[selectedHero.id] || selectedHero.name;
          const lordCustomName = state.customNames?.['lord'] || state.lord.name;
          const isAlreadyCompleted = (state.chamberCompletedHeroIds || []).includes(selectedHero.id);

          return (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 rounded-3xl border border-rose-800/50 shadow-2xl bg-gradient-to-b ${story.bgGlow} space-y-6 relative overflow-hidden`}
            >
              {/* Top Navigation */}
              <div className="flex items-center justify-between border-b border-rose-900/40 pb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-rose-100 flex items-center gap-2">
                    <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                    {story.title}
                  </h3>
                  <p className="text-xs text-rose-300/80">{story.subtitle}</p>
                </div>
                <button
                  onClick={() => setSelectedHero(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-700"
                >
                  침실 목록으로
                </button>
              </div>

              {/* Character Avatars & Stage */}
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-6 bg-black/40 rounded-2xl border border-rose-950 relative overflow-hidden">
                {/* Kiss Animation Overlay */}
                <AnimatePresence>
                  {isKissing && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-rose-950/90 backdrop-blur-md flex flex-col items-center justify-center z-30 space-y-3"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.25, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                      >
                        <Heart className="w-20 h-20 text-rose-500 fill-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]" />
                      </motion.div>
                      <div className="text-xl font-black text-rose-100 tracking-wider">
                        뜨거운 입맞춤과 깊은 숨결...
                      </div>
                      <p className="text-xs text-rose-300">
                        두 사람의 마력과 영혼이 교차하며 장막이 닫힙니다...
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Lord Avatar */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="relative">
                    <img
                      src={lordImg}
                      alt={lordCustomName}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-red-500 shadow-xl shadow-red-950"
                    />
                    <span className="absolute -bottom-2 bg-red-950 text-red-300 border border-red-500/60 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {lordCustomName}
                    </span>
                  </div>
                </div>

                {/* Central Romance Emote */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="p-3 rounded-full bg-rose-900/40 border border-rose-500/40"
                  >
                    <Sparkles className="w-6 h-6 text-rose-400" />
                  </motion.div>
                  <span className="text-[11px] font-bold text-rose-400">
                    {storyStep >= 2 ? '영혼의 결합' : '농밀한 대화 중'}
                  </span>
                </div>

                {/* Hero Avatar */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="relative">
                    <img
                      src={heroImg}
                      alt={heroCustomName}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-pink-500 shadow-xl shadow-pink-950"
                    />
                    <span className="absolute -bottom-2 bg-pink-950 text-pink-300 border border-pink-500/60 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {heroCustomName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dialogue Box Area */}
              <div className="space-y-4">
                {/* Intro on step 0 */}
                {storyStep === 0 && (
                  <div className="p-4 rounded-xl bg-black/60 border border-rose-900/40 text-xs sm:text-sm text-rose-200/90 leading-relaxed">
                    {story.intro}
                  </div>
                )}

                {/* Dialogue Nodes (Step 0, 1) */}
                {storyStep < story.dialogueNodes.length ? (
                  <div className="bg-zinc-950/80 p-5 rounded-2xl border border-rose-800/40 space-y-4">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <MessageCircle className="w-4 h-4" />
                      <span>{story.dialogueNodes[storyStep].speaker}</span>
                    </div>

                    <p className="text-sm sm:text-base text-zinc-100 leading-relaxed pl-2 border-l-2 border-rose-500">
                      {story.dialogueNodes[storyStep].text}
                    </p>

                    {/* Reaction text after choice */}
                    {selectedChoiceReaction && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 bg-rose-950/60 rounded-xl border border-rose-500/50 text-xs text-rose-200 font-medium"
                      >
                        {selectedChoiceReaction}
                      </motion.div>
                    )}

                    {/* User Choices */}
                    {!selectedChoiceReaction && story.dialogueNodes[storyStep].choices && (
                      <div className="space-y-2 pt-2">
                        <div className="text-xs font-semibold text-rose-300">주군의 선택지:</div>
                        {story.dialogueNodes[storyStep].choices?.map((choice, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectChoice(choice.reactionText, choice.nextStep)}
                            className="w-full text-left p-3.5 rounded-xl bg-zinc-900/90 hover:bg-rose-950/70 border border-zinc-800 hover:border-rose-500/60 text-xs sm:text-sm text-zinc-200 font-medium transition-all flex items-center justify-between group"
                          >
                            <span className="flex-1">{choice.text}</span>
                            <ArrowRight className="w-4 h-4 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : storyStep === 2 ? (
                  /* Climax Kiss & Intimacy Trigger */
                  <div className="bg-gradient-to-b from-rose-950/60 to-zinc-950 p-6 rounded-2xl border border-rose-500/50 space-y-5 text-center">
                    <div className="p-3 bg-rose-900/40 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-rose-400/50">
                      <Heart className="w-8 h-8 text-rose-400 fill-rose-400" />
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-rose-100">
                        {story.climaxDialogue.kissText}
                      </h4>
                      <p className="text-xs sm:text-sm text-rose-300/90 max-w-xl mx-auto leading-relaxed">
                        선택에 따라 서로의 온기를 온전히 나누며 밤을 지새우게 됩니다.
                      </p>
                    </div>

                    <button
                      onClick={() => handleTriggerClimax(selectedHero, story)}
                      className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-sm shadow-xl shadow-rose-950 flex items-center justify-center gap-2 mx-auto"
                    >
                      <Heart className="w-5 h-5 fill-white" />
                      <span>{heroCustomName}와(과) 함께 밤자리를 가진다</span>
                    </button>
                  </div>
                ) : (
                  /* Step 3: Morning Conclusion & MP Reward */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-950/90 p-6 rounded-2xl border border-rose-500/60 space-y-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                        <Moon className="w-4 h-4" />
                        <span>농밀한 밤자리의 결말</span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed bg-black/50 p-4 rounded-xl border border-rose-950">
                        {story.climaxDialogue.intimacyText}
                      </p>
                      <div className="p-4 bg-purple-950/60 rounded-xl border border-purple-500/50 text-xs sm:text-sm text-purple-200 font-bold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-purple-400 shrink-0" />
                        <span>{story.climaxDialogue.conclusionText}</span>
                      </div>
                    </div>

                    {!isCompletedInSession && (
                      <button
                        onClick={() => handleFinishEncounter(selectedHero, story)}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-700 to-rose-700 hover:from-purple-600 hover:to-rose-600 text-white font-black text-sm shadow-xl shadow-purple-950 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>밀애 완료 및 마력(MP) 정기 흡수</span>
                      </button>
                    )}

                    {isCompletedInSession && (
                      <div className="text-center space-y-3 pt-2">
                        <div className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>성공적으로 밀애를 마쳤습니다! 영구 MP가 개화되었습니다.</span>
                        </div>
                        <button
                          onClick={() => setSelectedHero(null)}
                          className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700"
                        >
                          침실 목록으로 돌아가기
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })()
      )}
    </div>
  );
};
