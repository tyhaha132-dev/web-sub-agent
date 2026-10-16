'use client';

import type { SVGProps } from 'react';

interface EnglishIllustrationProps extends SVGProps<SVGSVGElement> {
  word?: string;
  topic?: string;
  size?: number;
}

/**
 * Minh họa vector SVG hiện đại cho ứng dụng học từ vựng EnglishFun:
 * - Học tập / Giáo dục (Book / Study / Learn / Education)
 * - Đồ ăn / Trái cây (Food / Fruit / Apple)
 * - Kinh doanh / Văn phòng (Business / Office / Finance / Meeting)
 * - Công nghệ / Thiết bị (Tech / Computer / Internet)
 * - Du lịch / Di chuyển (Travel / Transport / Flight / Vacation)
 * - Tư duy / Ý tưởng (Idea / Brain / Lightbulb / Mind)
 * - Giao tiếp / Đối thoại (Chat / Speech / Message)
 * - Thiên nhiên / Môi trường (Nature / Environment / Earth)
 * - Thành công / Mục tiêu (Success / Trophy / Goal)
 * - Thời gian / Lịch trình (Time / Clock / Schedule)
 * - Mặc định / Thẻ từ vựng (Card / Flashcards / Word A-Z)
 */
export default function EnglishIllustration({
  word = '',
  topic = '',
  size = 84,
  style,
  ...props
}: EnglishIllustrationProps) {
  const query = `${word} ${topic}`.toLowerCase();

  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 100 100',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    style: {
      display: 'inline-block',
      verticalAlign: 'middle',
      filter: 'drop-shadow(0 6px 12px rgba(124, 58, 237, 0.22))',
      ...style,
    },
    ...props,
  };

  // 1. Food / Fruit / Apple
  if (/apple|fruit|food|eat|drink|cook|meal|snack|bread|dinner/i.test(query)) {
    return (
      <svg {...commonProps} aria-label="Minh họa thực phẩm / quả táo">
        <defs>
          <linearGradient id="appleGrad" x1="20" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f43f5e" />
            <stop offset="1" stopColor="#be123c" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="50" y1="10" x2="70" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10b981" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>
        </defs>
        {/* Apple Body */}
        <path
          d="M50 35 C42 22 20 25 18 48 C16 70 34 88 50 88 C66 88 84 70 82 48 C80 25 58 22 50 35 Z"
          fill="url(#appleGrad)"
          stroke="#9f1239"
          strokeWidth="2.5"
        />
        {/* Highlight */}
        <path
          d="M28 42 C26 52 30 64 36 70"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Stem */}
        <path
          d="M50 34 C50 20 54 14 58 10"
          stroke="#78350f"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Leaf */}
        <path
          d="M54 22 C64 16 74 18 76 26 C68 30 58 28 54 22 Z"
          fill="url(#leafGrad)"
          stroke="#065f46"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  // 2. Business / Office / Finance / Meeting / Work
  if (/business|office|finance|money|meet|work|manage|contract|invest|company|market|sales/i.test(query)) {
    return (
      <svg {...commonProps} aria-label="Minh họa kinh doanh / văn phòng">
        <defs>
          <linearGradient id="caseGrad" x1="15" y1="28" x2="85" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#4338ca" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="40" y1="45" x2="60" y2="65" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
        </defs>
        {/* Handle */}
        <path
          d="M38 32 V20 C38 16 42 14 50 14 C58 14 62 16 62 20 V32"
          stroke="#312e81"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Briefcase Body */}
        <rect x="15" y="30" width="70" height="52" rx="10" fill="url(#caseGrad)" stroke="#312e81" strokeWidth="2.5" />
        {/* Center Stripe */}
        <line x1="15" y1="52" x2="85" y2="52" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="4 3" />
        {/* Metal Locks */}
        <rect x="30" y="47" width="8" height="10" rx="2" fill="url(#goldGrad)" stroke="#b45309" strokeWidth="1" />
        <rect x="62" y="47" width="8" height="10" rx="2" fill="url(#goldGrad)" stroke="#b45309" strokeWidth="1" />
        {/* Small rising trend line badge */}
        <circle cx="50" cy="52" r="7" fill="#ffffff" />
        <path d="M46 54 L49 51 L51 53 L55 48" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 3. Travel / Transport / Flight / Vacation
  if (/travel|trip|flight|plane|air|tour|hotel|vacation|visit|journey/i.test(query)) {
    return (
      <svg {...commonProps} aria-label="Minh họa du lịch / máy bay">
        <defs>
          <linearGradient id="planeGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        {/* Flight path loop */}
        <path
          d="M18 78 C25 50 40 40 55 58 C65 70 82 65 80 40"
          stroke="#cbd5e1"
          strokeWidth="2.5"
          strokeDasharray="4 4"
          fill="none"
        />
        {/* Airplane */}
        <g transform="translate(18, 12) rotate(22 35 35)">
          <path
            d="M35 10 L41 32 L68 40 L68 47 L41 45 L40 60 L48 66 L48 72 L35 69 L22 72 L22 66 L30 60 L29 45 L2 47 L2 40 L29 32 Z"
            fill="url(#planeGrad)"
            stroke="#0369a1"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
        {/* Small clouds */}
        <ellipse cx="28" cy="78" rx="14" ry="7" fill="#e2e8f0" />
        <ellipse cx="78" cy="74" rx="16" ry="8" fill="#e2e8f0" />
      </svg>
    );
  }

  // 4. Technology / Computer / Data / Screen
  if (/tech|comput|data|program|code|soft|screen|app|web|online|device/i.test(query)) {
    return (
      <svg {...commonProps} aria-label="Minh họa công nghệ / máy tính">
        <defs>
          <linearGradient id="screenGrad" x1="20" y1="18" x2="80" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f172a" />
            <stop offset="1" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="neonGrad" x1="30" y1="30" x2="70" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#06b6d4" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        {/* Laptop Screen */}
        <rect x="20" y="20" width="60" height="42" rx="6" fill="url(#screenGrad)" stroke="#475569" strokeWidth="2.5" />
        {/* Inner display */}
        <rect x="24" y="24" width="52" height="34" rx="3" fill="#020617" />
        {/* Code glyphs */}
        <path d="M32 36 L27 41 L32 46" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M44 36 L49 41 L44 46" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="38" y1="35" x2="34" y2="47" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
        {/* Base */}
        <path d="M12 68 H88 L80 74 H20 Z" fill="#94a3b8" stroke="#475569" strokeWidth="2" strokeLinejoin="round" />
        {/* Trackpad */}
        <rect x="42" y="70" width="16" height="3" rx="1" fill="#cbd5e1" />
      </svg>
    );
  }

  // 5. Idea / Mind / Brain / Lightbulb / Creativity
  if (/idea|think|brain|mind|smart|create|bright|innovat|memory|invent/i.test(query)) {
    return (
      <svg {...commonProps} aria-label="Minh họa ý tưởng / bóng đèn">
        <defs>
          <linearGradient id="bulbGrad" x1="30" y1="15" x2="70" y2="65" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fef08a" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {/* Rays */}
        <line x1="50" y1="8" x2="50" y2="15" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="22" y1="24" x2="28" y2="28" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="78" y1="24" x2="72" y2="28" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="14" y1="46" x2="22" y2="46" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="86" y1="46" x2="78" y2="46" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        {/* Bulb Glass */}
        <path
          d="M50 18 C34 18 26 30 28 44 C29 52 38 60 40 68 H60 C62 60 71 52 72 44 C74 30 66 18 50 18 Z"
          fill="url(#bulbGrad)"
          stroke="#d97706"
          strokeWidth="2.5"
        />
        {/* Filament */}
        <path d="M42 46 L47 38 L53 38 L58 46" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Screw Base */}
        <rect x="42" y="68" width="16" height="5" rx="2" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
        <rect x="44" y="74" width="12" height="4" rx="2" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
        <path d="M46 79 C46 82 54 82 54 79 Z" fill="#64748b" />
      </svg>
    );
  }

  // 6. Success / Trophy / Achievement / Win
  if (/success|win|trophy|goal|score|rank|top|champion|achieve|honor/i.test(query)) {
    return (
      <svg {...commonProps} aria-label="Minh họa cúp vàng chiến thắng">
        <defs>
          <linearGradient id="goldCup" x1="25" y1="15" x2="75" y2="65" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fde047" />
            <stop offset="0.6" stopColor="#eab308" />
            <stop offset="1" stopColor="#ca8a04" />
          </linearGradient>
        </defs>
        {/* Handles */}
        <path d="M30 28 C16 28 14 46 28 48" stroke="#ca8a04" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M70 28 C84 28 86 46 72 48" stroke="#ca8a04" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Cup Bowl */}
        <path
          d="M26 20 H74 V40 C74 54 60 62 50 62 C40 62 26 54 26 40 Z"
          fill="url(#goldCup)"
          stroke="#a16207"
          strokeWidth="2.5"
        />
        {/* Star in cup */}
        <polygon points="50,30 52,35 57,35 53,38 55,43 50,40 45,43 47,38 43,35 48,35" fill="#ffffff" />
        {/* Stem & Base */}
        <path d="M47 62 H53 V72 H47 Z" fill="#ca8a04" stroke="#a16207" strokeWidth="2" />
        <rect x="34" y="72" width="32" height="12" rx="4" fill="#78350f" stroke="#451a03" strokeWidth="2" />
      </svg>
    );
  }

  // 7. Nature / Environment / Plant / Earth
  if (/nature|environ|earth|planet|green|tree|plant|eco|wild/i.test(query)) {
    return (
      <svg {...commonProps} aria-label="Minh họa thiên nhiên / môi trường">
        <defs>
          <linearGradient id="earthGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="treeGrad" x1="30" y1="20" x2="70" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34d399" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>
        {/* Earth circle */}
        <circle cx="50" cy="50" r="36" fill="url(#earthGrad)" stroke="#0369a1" strokeWidth="2.5" />
        {/* Continents */}
        <path
          d="M34 32 C38 28 46 30 52 26 C56 34 50 42 42 46 C34 44 30 38 34 32 Z"
          fill="url(#treeGrad)"
        />
        <path
          d="M48 54 C54 50 62 52 68 58 C66 68 56 74 46 72 C44 64 46 58 48 54 Z"
          fill="url(#treeGrad)"
        />
        {/* Sprout atop */}
        <path d="M50 14 C48 8 40 10 40 16 C46 16 48 15 50 14 Z" fill="#10b981" />
        <path d="M50 14 C52 8 60 10 60 16 C54 16 52 15 50 14 Z" fill="#059669" />
      </svg>
    );
  }

  // 8. Default: Sách học & Thẻ từ vựng mở rộng (Book / Study / Flashcards)
  return (
    <svg {...commonProps} aria-label="Minh họa học từ vựng EnglishFun">
      <defs>
        <linearGradient id="bookCover" x1="15" y1="25" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="pagesGrad" x1="20" y1="35" x2="80" y2="75" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>
      {/* Background soft aura */}
      <circle cx="50" cy="50" r="42" fill="rgba(139, 92, 246, 0.08)" />
      {/* Floating stars */}
      <circle cx="22" cy="24" r="2.5" fill="#fbbf24" />
      <circle cx="78" cy="20" r="3" fill="#f43f5e" />
      <circle cx="82" cy="72" r="2" fill="#38bdf8" />
      {/* Book Cover */}
      <path
        d="M50 68 C36 60 20 62 16 65 V28 C20 25 36 23 50 31 C64 23 80 25 84 28 V65 C80 62 64 60 50 68 Z"
        fill="url(#bookCover)"
        stroke="#6d28d9"
        strokeWidth="2.5"
      />
      {/* Pages Left */}
      <path
        d="M50 64 C37 57 23 58 20 61 V29 C23 26 37 25 50 32 Z"
        fill="url(#pagesGrad)"
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />
      {/* Pages Right */}
      <path
        d="M50 64 C63 57 77 58 80 61 V29 C77 26 63 25 50 32 Z"
        fill="url(#pagesGrad)"
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />
      {/* Center Spine Marker */}
      <line x1="50" y1="32" x2="50" y2="65" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
      {/* Text lines */}
      <line x1="26" y1="39" x2="44" y2="42" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="46" x2="42" y2="49" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="53" x2="38" y2="55" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="56" y1="42" x2="74" y2="39" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="56" y1="49" x2="72" y2="46" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      {/* Bookmark ribbon */}
      <path d="M50 32 V52 L54 48 L58 52 V33" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
    </svg>
  );
}
