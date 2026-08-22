// SVG Portrait Generator for default Gothic Vampire Castle artwork

export function createGothicAvatarSvg(
  type: 'lord' | 'assistant' | 'minion' | 'hero' | 'bl_hero' | 'trap',
  subType: string,
  primaryColor = '#dc2626',
  secondaryColor = '#18181b'
): string {
  let iconSvg = '';
  let badge = '';

  if (type === 'lord') {
    iconSvg = `
      <circle cx="100" cy="80" r="38" fill="#fecdd3" stroke="${primaryColor}" stroke-width="2"/>
      <path d="M 60 70 Q 100 30 140 70 Q 130 50 100 45 Q 70 50 60 70 Z" fill="#18181b"/>
      <path d="M 85 85 L 88 95 L 92 85 M 108 85 L 112 95 L 115 85" fill="#f87171" stroke="#991b1b" stroke-width="1.5"/>
      <ellipse cx="85" cy="78" rx="4" ry="6" fill="#991b1b"/>
      <ellipse cx="115" cy="78" rx="4" ry="6" fill="#991b1b"/>
      <circle cx="86" cy="77" r="1.5" fill="#fff"/>
      <circle cx="116" cy="77" r="1.5" fill="#fff"/>
      <path d="M 50 120 L 100 105 L 150 120 L 165 200 L 35 200 Z" fill="#450a0a" stroke="${primaryColor}" stroke-width="3"/>
      <path d="M 70 120 Q 100 135 130 120 L 140 200 L 60 200 Z" fill="#111827"/>
      <polygon points="100,20 115,50 145,55 120,75 128,105 100,88 72,105 80,75 55,55 85,50" fill="#eab308" opacity="0.8"/>
    `;
    badge = 'LORD';
  } else if (type === 'assistant') {
    iconSvg = `
      <circle cx="100" cy="85" r="36" fill="#ffedd5" stroke="#9333ea" stroke-width="2"/>
      <path d="M 55 80 Q 100 25 145 80 Q 155 120 140 160 Q 100 170 60 160 Q 45 120 55 80 Z" fill="#3b0764"/>
      <ellipse cx="85" cy="82" rx="5" ry="7" fill="#c084fc"/>
      <ellipse cx="115" cy="82" rx="5" ry="7" fill="#c084fc"/>
      <circle cx="86" cy="80" r="1.5" fill="#fff"/>
      <circle cx="116" cy="80" r="1.5" fill="#fff"/>
      <path d="M 88 95 Q 100 102 112 95" stroke="#e11d48" stroke-width="2" fill="none"/>
      <path d="M 60 130 L 100 115 L 140 130 L 155 200 L 45 200 Z" fill="#2e1065" stroke="#a855f7" stroke-width="2"/>
      <path d="M 85 115 L 100 145 L 115 115" fill="#f43f5e"/>
    `;
    badge = 'ADMIN';
  } else if (type === 'bl_hero') {
    iconSvg = `
      <defs>
        <linearGradient id="blGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f472b6" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="80" r="38" fill="#fff1f2" stroke="url(#blGlow)" stroke-width="3"/>
      <!-- Soft wavy long hair -->
      <path d="M 50 60 Q 100 15 150 60 Q 160 110 145 150 Q 100 130 55 150 Q 40 110 50 60 Z" fill="#38bdf8"/>
      <!-- Sparkles -->
      <polygon points="150,40 154,48 162,52 154,56 150,64 146,56 138,52 146,48" fill="#fbbf24"/>
      <polygon points="40,50 43,55 48,58 43,61 40,66 37,61 32,58 37,55" fill="#f472b6"/>
      <!-- Handsome eyes -->
      <ellipse cx="82" cy="78" rx="6" ry="8" fill="#0284c7"/>
      <ellipse cx="118" cy="78" rx="6" ry="8" fill="#0284c7"/>
      <circle cx="84" cy="75" r="2" fill="#fff"/>
      <circle cx="120" cy="75" r="2" fill="#fff"/>
      <path d="M 92 92 Q 100 96 108 92" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <!-- Shiny Armor/Robes -->
      <path d="M 55 125 L 100 110 L 145 125 L 160 200 L 40 200 Z" fill="#1e1b4b" stroke="#38bdf8" stroke-width="2"/>
      <path d="M 100 110 L 100 190" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4,4"/>
    `;
    badge = 'BISHOU';
  } else if (type === 'hero') {
    iconSvg = `
      <circle cx="100" cy="80" r="36" fill="#fef3c7" stroke="#eab308" stroke-width="2"/>
      <path d="M 60 50 L 100 25 L 140 50 L 135 90 L 100 100 L 65 90 Z" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
      <rect x="75" y="65" width="50" height="15" fill="#1e293b" rx="4"/>
      <ellipse cx="88" cy="72" rx="3" ry="3" fill="#38bdf8"/>
      <ellipse cx="112" cy="72" rx="3" ry="3" fill="#38bdf8"/>
      <path d="M 50 120 L 100 105 L 150 120 L 160 200 L 40 200 Z" fill="#334155" stroke="#f59e0b" stroke-width="2"/>
      <path d="M 95 105 L 105 105 L 105 170 L 115 170 L 100 190 L 85 170 L 95 170 Z" fill="#f59e0b"/>
    `;
    badge = 'HERO';
  } else if (type === 'minion') {
    iconSvg = `
      <circle cx="100" cy="100" r="65" fill="${secondaryColor}" stroke="${primaryColor}" stroke-width="3"/>
      <!-- Monster Wings/Horns -->
      <path d="M 35 70 Q 10 30 50 20 Q 65 45 60 70 Z" fill="#450a0a"/>
      <path d="M 165 70 Q 190 30 150 20 Q 135 45 140 70 Z" fill="#450a0a"/>
      <!-- Glowing Monster Eyes -->
      <polygon points="70,80 90,85 75,95" fill="#f87171"/>
      <polygon points="130,80 110,85 125,95" fill="#f87171"/>
      <circle cx="80" cy="87" r="2" fill="#fff"/>
      <circle cx="120" cy="87" r="2" fill="#fff"/>
      <!-- Fangs -->
      <polygon points="80,115 88,135 95,115" fill="#ffffff"/>
      <polygon points="105,115 112,135 120,115" fill="#ffffff"/>
      <path d="M 75 115 Q 100 125 125 115" stroke="#dc2626" stroke-width="3" fill="none"/>
    `;
    badge = subType.toUpperCase().slice(0, 6);
  } else {
    // Trap
    iconSvg = `
      <rect x="20" y="20" width="160" height="160" rx="16" fill="#18181b" stroke="${primaryColor}" stroke-width="3"/>
      <path d="M 100 40 L 120 80 L 160 100 L 120 120 L 100 160 L 80 120 L 40 100 L 80 80 Z" fill="${primaryColor}" opacity="0.8"/>
      <circle cx="100" cy="100" r="25" fill="#000" stroke="#f59e0b" stroke-width="2"/>
    `;
    badge = 'TRAP';
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
      <rect width="200" height="200" fill="#09090b"/>
      <!-- Grid pattern background -->
      <path d="M 0 40 L 200 40 M 0 80 L 200 80 M 0 120 L 200 120 M 0 160 L 200 160 M 40 0 L 40 200 M 80 0 L 80 200 M 120 0 L 120 200 M 160 0 L 160 200" stroke="#27272a" stroke-width="1" opacity="0.4"/>
      ${iconSvg}
      <!-- Border Overlay -->
      <rect x="4" y="4" width="192" height="192" fill="none" stroke="${primaryColor}" stroke-width="2" rx="8"/>
      <!-- Badge label -->
      <rect x="130" y="10" width="60" height="20" rx="4" fill="${primaryColor}"/>
      <text x="160" y="24" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">${badge}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
