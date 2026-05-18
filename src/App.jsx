import { useState, useCallback, useEffect, useRef } from "react";

// ─── Fonts ────────────────────────────────────────────────────────────────
// Futura PT Book (英数字) + Hiragino Sans W4 (日本語)
// Futura PT は Adobe Fonts / ローカル環境依存のため @font-face で優先指定
const FONT_STYLE = document.createElement("style");
FONT_STYLE.textContent = `
  input::placeholder { color: rgba(255,255,255,0.4) !important; }
  input { caret-color: white !important; }

  @import url('https://fonts.cdnfonts.com/css/futura-pt');
  :root {
    --font-main: 'Futura PT', 'Futura', 'Century Gothic', '-apple-system', sans-serif;
  }
  * {
    font-family: 'Futura PT', 'Futura', 'Century Gothic', 'Hiragino Sans', 'ヒラギノ角ゴ ProN W4', 'Hiragino Kaku Gothic ProN', sans-serif !important;
  }
`;
document.head.appendChild(FONT_STYLE);
const FONT = "'Futura PT','Futura','Century Gothic','Hiragino Sans','ヒラギノ角ゴ ProN W4','Hiragino Kaku Gothic ProN',sans-serif";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// ─── Design Tokens ─────────────────────────────────────────────────────────
// White/grey base, holographic accent (reference: White Payments UI)
const BG_BASE  = "#F0F2F8";          // body background
const BG_GRAD  = "linear-gradient(160deg, #F4F6FC 0%, #EEF0F8 40%, #F0F4FF 70%, #EFF8FA 100%)";

// Holographic gradient (aurora / prism accent)
const HOLO_GRAD = "linear-gradient(125deg, #FFD6FA 0%, #C7B8FF 20%, #93C5FD 40%, #6EE7FA 55%, #A7F3D0 70%, #FDE68A 85%, #FECDD3 100%)";
const HOLO_GRAD2 = "linear-gradient(135deg, #E0D7FF 0%, #BAE6FD 35%, #A7F3D0 65%, #FDE68A 100%)";
// Noise gradient button — 水色・緑・黄・ピンク系
// Pearl holographic gradient — like reference image (iridescent soap bubble)
const NOISE_GRAD = "linear-gradient(125deg, rgba(255,255,255,0.95) 0%, #F0E6FF 18%, #DDE8FF 34%, #D4F0FF 48%, #E8F8F0 62%, #FFF0F8 78%, rgba(255,255,255,0.9) 100%)";
const NOISE_SHADOW = "0 4px 24px rgba(180,160,220,0.28), 0 2px 8px rgba(200,220,255,0.30), 0 1px 3px rgba(255,255,255,0.95), inset 0 1px 2px rgba(255,255,255,0.9)";

// Glass surface
const GLASS_BG    = "rgba(255,255,255,0.72)";
const GLASS_BG2   = "rgba(255,255,255,0.50)";
const GLASS_BORDER = "1px solid rgba(255,255,255,0.90)";

const WHITE  = "#FFFFFF";
const PINK   = "#E879A0";
const PINK_GLOW = "rgba(232,121,160,0.22)";
const PURPLE = "#A78BFA";
const TEAL   = "#2DD4BF";
const TEAL2  = "#0D9488";
const TEAL3  = "#0F766E";
const TEAL_GLOW = "rgba(45,212,191,0.25)";
const GRAY   = "#94A3B8";
const GRAY_L = "#CBD5E1";
const DARK   = "#334155";
const DARKER = "#1E293B";

// Legacy
const BG  = "#F0F2F8";
const BG2 = "#E8EBF4";

// Shadows — soft, light
const neuShadow      = (s=8) => `${s}px ${s}px ${s*2.2}px rgba(180,190,220,0.55), -${s/2}px -${s/2}px ${s*1.5}px rgba(255,255,255,0.95)`;
const neuInsetShadow = (s=6) => `inset ${s}px ${s}px ${s*1.8}px rgba(180,190,220,0.45), inset -${s/2}px -${s/2}px ${s}px rgba(255,255,255,0.9)`;

const neuCard = {
  background: GLASS_BG,
  backdropFilter: "blur(20px) saturate(1.8)",
  WebkitBackdropFilter: "blur(20px) saturate(1.8)",
  border: GLASS_BORDER,
  borderRadius: 24,
  boxShadow: `10px 10px 30px rgba(180,190,220,0.45), -4px -4px 14px rgba(255,255,255,0.95)`,
};
const neuInset = (s=6) => ({
  background: GLASS_BG2,
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.75)",
  boxShadow: neuInsetShadow(s),
});

const ACCENT_GRAD   = HOLO_GRAD;
const ACCENT_SHADOW = `0 4px 20px rgba(167,139,250,0.35), 0 1px 4px rgba(255,255,255,0.8)`;

// Soft holographic blob (decorative)
const blobStyle = (top, left, size, color, opacity=0.22) => ({
  position:"fixed", top, left, width:size, height:size,
  borderRadius:"60% 40% 55% 45% / 45% 55% 45% 55%",
  background:color, opacity, filter:`blur(${parseInt(size)*0.28}px)`,
  zIndex:0, pointerEvents:"none",
  animation:"blobFloat 10s ease-in-out infinite alternate",
});

// ─── 3D SVG Icons (18 types) ───────────────────────────────────────────────
const ICON_KEYS = ["coin","house","phone","food","star","wallet","pencil","chart","list","gear","car","heart","book","plane","shop","music","gym","pet","beauty","gift","water","electric","gas","subscription","carshare","hobby","cafe","baby","medicine","camera","diamond","fire","flower","rice","sake","sports","train","umbrella","yoga","wifi","hospital","nisa","fork","basket","medal","memo","tshirt","herb"];

const Icon3D = ({ type = "star", size = 32 }) => {
  const s = size;
  const map = {
    coin: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="icoin1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#B45309"/></linearGradient>
          <linearGradient id="icoin2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FEF9C3"/><stop offset="100%" stopColor="#FDE68A"/></linearGradient>
          <filter id="fcoin"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#B45309" floodOpacity="0.38"/></filter>
        </defs>
        <g filter="url(#fcoin)"><circle cx="24" cy="24" r="19" fill="url(#icoin1)"/><ellipse cx="21" cy="20" rx="13" ry="9" fill="url(#icoin2)" opacity="0.52"/></g>
        <text x="24" y="30" textAnchor="middle" fontSize="17" fontWeight="900" fill="#78350F" fontFamily="sans-serif">¥</text>
        <circle cx="24" cy="24" r="19" stroke="white" strokeWidth="1.5" opacity="0.22"/>
      </svg>
    ),
    house: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ihouse1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDA4CF"/><stop offset="100%" stopColor="#DB2777"/></linearGradient>
          <linearGradient id="ihouse2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FEF9C3"/><stop offset="100%" stopColor="#FCA5A5"/></linearGradient>
          <filter id="fhouse"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#DB2777" floodOpacity="0.30"/></filter>
        </defs>
        <g filter="url(#fhouse)"><polygon points="24,5 43,23 5,23" fill="url(#ihouse1)"/><rect x="9" y="23" width="30" height="20" rx="3" fill="url(#ihouse2)"/><rect x="19" y="30" width="10" height="13" rx="2" fill="url(#ihouse1)" opacity="0.5"/><polygon points="24,5 43,23 38,23" fill="white" opacity="0.20"/></g>
      </svg>
    ),
    phone: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="iphone1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#93C5FD"/><stop offset="100%" stopColor="#1D4ED8"/></linearGradient>
          <filter id="fphone"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#1D4ED8" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fphone)"><rect x="12" y="4" width="24" height="40" rx="7" fill="url(#iphone1)"/><rect x="12" y="4" width="24" height="16" rx="7" fill="white" opacity="0.20"/><rect x="17" y="8" width="14" height="3" rx="1.5" fill="white" opacity="0.6"/></g>
        <circle cx="24" cy="39" r="3" fill="white" opacity="0.5"/>
      </svg>
    ),
    food: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ifood1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#EA580C"/></linearGradient>
          <filter id="ffood"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#EA580C" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#ffood)"><ellipse cx="24" cy="30" rx="19" ry="13" fill="url(#ifood1)"/><ellipse cx="24" cy="26" rx="19" ry="9" fill="#FEF3C7" opacity="0.6"/><ellipse cx="24" cy="26" rx="12" ry="5.5" fill="#F97316" opacity="0.52"/></g>
        <rect x="22" y="8" width="4" height="16" rx="2" fill="#16A34A"/>
        <ellipse cx="24" cy="8" rx="6" ry="4.5" fill="#4ADE80"/>
      </svg>
    ),
    star: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="istar1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#DDD6FE"/><stop offset="100%" stopColor="#6D28D9"/></linearGradient>
          <filter id="fstar"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#6D28D9" floodOpacity="0.32"/></filter>
        </defs>
        <g filter="url(#fstar)"><polygon points="24,4 29.5,18.5 44,18.5 32.5,27.5 37,42 24,33.5 11,42 15.5,27.5 4,18.5 18.5,18.5" fill="url(#istar1)"/><polygon points="24,4 29.5,18.5 44,18.5" fill="white" opacity="0.18"/></g>
        <circle cx="24" cy="24" r="5" fill="white" opacity="0.32"/>
      </svg>
    ),
    wallet: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="iwallet1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="100%" stopColor="#047857"/></linearGradient>
          <linearGradient id="iwallet2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#A7F3D0"/><stop offset="100%" stopColor="#34D399"/></linearGradient>
          <filter id="fwallet"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#047857" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fwallet)"><rect x="4" y="14" width="40" height="26" rx="9" fill="url(#iwallet1)"/><rect x="4" y="14" width="40" height="12" rx="9" fill="white" opacity="0.18"/><rect x="28" y="22" width="16" height="12" rx="6" fill="url(#iwallet2)"/><circle cx="36" cy="28" r="3" fill="#047857"/></g>
      </svg>
    ),
    pencil: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ipencil1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDA4CF"/><stop offset="100%" stopColor="#DB2777"/></linearGradient>
          <linearGradient id="ipencil2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#F59E0B"/></linearGradient>
          <filter id="fpencil"><feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#DB2777" floodOpacity="0.32"/></filter>
        </defs>
        <g filter="url(#fpencil)" transform="rotate(-45 24 24)"><rect x="14" y="6" width="20" height="30" rx="4" fill="url(#ipencil1)"/><rect x="14" y="6" width="20" height="10" rx="4" fill="white" opacity="0.22"/><rect x="14" y="32" width="20" height="8" rx="2" fill="url(#ipencil2)"/><polygon points="14,40 24,48 34,40" fill="#92400E"/></g>
        <circle cx="34" cy="12" r="4" fill="white" opacity="0.45"/>
      </svg>
    ),
    chart: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ichart1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="100%" stopColor="#059669"/></linearGradient>
          <linearGradient id="ichart2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#93C5FD"/><stop offset="100%" stopColor="#2563EB"/></linearGradient>
          <linearGradient id="ichart3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F9A8D4"/><stop offset="100%" stopColor="#DB2777"/></linearGradient>
          <filter id="fchart"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#2563EB" floodOpacity="0.26"/></filter>
        </defs>
        <g filter="url(#fchart)"><rect x="5" y="28" width="10" height="14" rx="3" fill="url(#ichart1)"/><rect x="19" y="20" width="10" height="22" rx="3" fill="url(#ichart2)"/><rect x="33" y="12" width="10" height="30" rx="3" fill="url(#ichart3)"/></g>
        <rect x="5" y="28" width="10" height="5" rx="3" fill="white" opacity="0.28"/><rect x="19" y="20" width="10" height="5" rx="3" fill="white" opacity="0.28"/><rect x="33" y="12" width="10" height="5" rx="3" fill="white" opacity="0.28"/>
      </svg>
    ),
    list: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ilist1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#C4B5FD"/><stop offset="100%" stopColor="#7C3AED"/></linearGradient>
          <filter id="flist"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#7C3AED" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#flist)"><rect x="5" y="8" width="38" height="34" rx="9" fill="url(#ilist1)"/><rect x="5" y="8" width="38" height="14" rx="9" fill="white" opacity="0.16"/></g>
        <circle cx="13" cy="21" r="3.5" fill="white" opacity="0.88"/><rect x="20" y="18.5" width="17" height="5" rx="2.5" fill="white" opacity="0.78"/>
        <circle cx="13" cy="32" r="3.5" fill="white" opacity="0.58"/><rect x="20" y="29.5" width="12" height="5" rx="2.5" fill="white" opacity="0.48"/>
      </svg>
    ),
    gear: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="igear1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#D97706"/></linearGradient>
          <filter id="fgear"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#D97706" floodOpacity="0.38"/></filter>
        </defs>
        <g filter="url(#fgear)">
          <path d="M20 4h8l2 6 5 2 5-4 6 6-4 5 2 5 6 2v8l-6 2-2 5 4 5-6 6-5-4-5 2-2 6h-8l-2-6-5-2-5 4-6-6 4-5-2-5-6-2v-8l6-2 2-5-4-5 6-6 5 4 5-2z" fill="url(#igear1)"/>
          <circle cx="24" cy="24" r="7" fill="white" opacity="0.82"/><circle cx="24" cy="24" r="4" fill="url(#igear1)" opacity="0.48"/>
        </g>
      </svg>
    ),
    car: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="icar1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#93C5FD"/><stop offset="100%" stopColor="#1E40AF"/></linearGradient>
          <filter id="fcar"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1E40AF" floodOpacity="0.32"/></filter>
        </defs>
        <g filter="url(#fcar)">
          <rect x="4" y="22" width="40" height="16" rx="5" fill="url(#icar1)"/>
          <path d="M10 22 L16 12 H32 L38 22Z" fill="#60A5FA"/>
          <path d="M10 22 L16 12 H24" fill="white" opacity="0.18"/>
          <rect x="16" y="14" width="16" height="8" rx="2" fill="#BAE6FD" opacity="0.7"/>
        </g>
        <circle cx="14" cy="37" r="5" fill="#1E293B"/><circle cx="14" cy="37" r="2.5" fill="#94A3B8"/>
        <circle cx="34" cy="37" r="5" fill="#1E293B"/><circle cx="34" cy="37" r="2.5" fill="#94A3B8"/>
      </svg>
    ),
    heart: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="iheart1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FCA5A5"/><stop offset="100%" stopColor="#DC2626"/></linearGradient>
          <filter id="fheart"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#DC2626" floodOpacity="0.35"/></filter>
        </defs>
        <g filter="url(#fheart)">
          <path d="M24 40 C24 40 6 28 6 17 C6 11 10.5 7 15.5 7 C18.5 7 21.5 8.5 24 11 C26.5 8.5 29.5 7 32.5 7 C37.5 7 42 11 42 17 C42 28 24 40 24 40Z" fill="url(#iheart1)"/>
          <path d="M24 40 C24 40 6 28 6 17 C6 11 10.5 7 15.5 7" stroke="white" strokeWidth="1" opacity="0.25" fill="none"/>
        </g>
        <ellipse cx="17" cy="15" rx="5" ry="4" fill="white" opacity="0.3" transform="rotate(-20 17 15)"/>
      </svg>
    ),
    book: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ibook1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="100%" stopColor="#065F46"/></linearGradient>
          <filter id="fbook"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#065F46" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fbook)">
          <rect x="8" y="5" width="28" height="38" rx="4" fill="url(#ibook1)"/>
          <rect x="8" y="5" width="28" height="14" rx="4" fill="white" opacity="0.18"/>
          <rect x="6" y="7" width="6" height="34" rx="3" fill="#047857"/>
        </g>
        <rect x="15" y="14" width="14" height="2.5" rx="1.2" fill="white" opacity="0.7"/>
        <rect x="15" y="20" width="10" height="2.5" rx="1.2" fill="white" opacity="0.5"/>
        <rect x="15" y="26" width="12" height="2.5" rx="1.2" fill="white" opacity="0.4"/>
      </svg>
    ),
    plane: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="iplane1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#BAE6FD"/><stop offset="100%" stopColor="#0284C7"/></linearGradient>
          <filter id="fplane"><feDropShadow dx="1" dy="2" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.32"/></filter>
        </defs>
        <g filter="url(#fplane)" transform="rotate(-35 24 24)">
          <path d="M24 4 L32 20 H44 L36 26 L40 42 L24 34 L8 42 L12 26 L4 20 H16Z" fill="url(#iplane1)"/>
          <path d="M24 4 L32 20 H44" fill="white" opacity="0.2"/>
        </g>
      </svg>
    ),
    shop: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ishop1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FCD34D"/><stop offset="100%" stopColor="#B45309"/></linearGradient>
          <linearGradient id="ishop2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FEF3C7"/><stop offset="100%" stopColor="#FDE68A"/></linearGradient>
          <filter id="fshop"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#B45309" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fshop)">
          <rect x="6" y="18" width="36" height="26" rx="4" fill="url(#ishop2)"/>
          <path d="M6 18 L10 8 H38 L42 18Z" fill="url(#ishop1)"/>
          <path d="M6 18 L10 8 H24" fill="white" opacity="0.2"/>
        </g>
        <rect x="18" y="28" width="12" height="16" rx="3" fill="url(#ishop1)" opacity="0.6"/>
        <rect x="10" y="26" width="8" height="8" rx="2" fill="url(#ishop1)" opacity="0.5"/>
        <rect x="30" y="26" width="8" height="8" rx="2" fill="url(#ishop1)" opacity="0.5"/>
      </svg>
    ),
    music: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="imusic1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F9A8D4"/><stop offset="100%" stopColor="#9D174D"/></linearGradient>
          <filter id="fmusic"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#9D174D" floodOpacity="0.32"/></filter>
        </defs>
        <g filter="url(#fmusic)">
          <rect x="18" y="4" width="22" height="5" rx="2.5" fill="url(#imusic1)"/>
          <rect x="18" y="4" width="4" height="24" rx="2" fill="url(#imusic1)"/>
          <rect x="36" y="4" width="4" height="20" rx="2" fill="url(#imusic1)"/>
          <circle cx="14" cy="36" r="8" fill="url(#imusic1)"/>
          <circle cx="32" cy="32" r="8" fill="url(#imusic1)"/>
        </g>
        <circle cx="14" cy="36" r="3.5" fill="white" opacity="0.55"/>
        <circle cx="32" cy="32" r="3.5" fill="white" opacity="0.55"/>
      </svg>
    ),
    gym: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="igym1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="100%" stopColor="#065F46"/></linearGradient>
          <filter id="fgym"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#065F46" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fgym)">
          <rect x="2" y="20" width="8" height="8" rx="3" fill="url(#igym1)"/>
          <rect x="8" y="16" width="6" height="16" rx="3" fill="url(#igym1)"/>
          <rect x="34" y="16" width="6" height="16" rx="3" fill="url(#igym1)"/>
          <rect x="38" y="20" width="8" height="8" rx="3" fill="url(#igym1)"/>
          <rect x="14" y="22" width="20" height="4" rx="2" fill="#065F46"/>
        </g>
        <rect x="2" y="20" width="8" height="4" rx="3" fill="white" opacity="0.25"/>
        <rect x="38" y="20" width="8" height="4" rx="3" fill="white" opacity="0.25"/>
      </svg>
    ),
    pet: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ipet1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#92400E"/></linearGradient>
          <filter id="fpet"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#92400E" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fpet)">
          <circle cx="24" cy="28" r="14" fill="url(#ipet1)"/>
          <ellipse cx="11" cy="14" rx="5" ry="7" fill="url(#ipet1)" transform="rotate(-20 11 14)"/>
          <ellipse cx="37" cy="14" rx="5" ry="7" fill="url(#ipet1)" transform="rotate(20 37 14)"/>
          <ellipse cx="24" cy="25" rx="14" ry="10" fill="#FEF3C7" opacity="0.5"/>
        </g>
        <circle cx="20" cy="26" r="2" fill="#1E293B"/>
        <circle cx="28" cy="26" r="2" fill="#1E293B"/>
        <path d="M20 32 Q24 36 28 32" stroke="#92400E" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    beauty: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ibeauty1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F9A8D4"/><stop offset="100%" stopColor="#BE185D"/></linearGradient>
          <filter id="fbeauty"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#BE185D" floodOpacity="0.32"/></filter>
        </defs>
        <g filter="url(#fbeauty)">
          <ellipse cx="24" cy="30" rx="12" ry="14" fill="url(#ibeauty1)"/>
          <rect x="20" y="4" width="8" height="18" rx="4" fill="url(#ibeauty1)"/>
          <ellipse cx="24" cy="22" rx="8" ry="5" fill="#FDE8F0"/>
        </g>
        <ellipse cx="24" cy="28" rx="5" ry="7" fill="white" opacity="0.22"/>
        <circle cx="29" cy="14" r="4" fill="#FDE68A"/>
        <circle cx="29" cy="14" r="2" fill="#F59E0B"/>
      </svg>
    ),
    gift: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="igift1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FCA5A5"/><stop offset="100%" stopColor="#DC2626"/></linearGradient>
          <linearGradient id="igift2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FEF9C3"/><stop offset="100%" stopColor="#FDE68A"/></linearGradient>
          <filter id="fgift"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#DC2626" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fgift)">
          <rect x="6" y="20" width="36" height="24" rx="4" fill="url(#igift2)"/>
          <rect x="6" y="14" width="36" height="10" rx="4" fill="url(#igift1)"/>
          <rect x="20" y="14" width="8" height="30" rx="2" fill="url(#igift1)" opacity="0.7"/>
        </g>
        <path d="M24 14 C18 14 14 10 16 7 C18 4 22 8 24 14Z" fill="url(#igift1)"/>
        <path d="M24 14 C30 14 34 10 32 7 C30 4 26 8 24 14Z" fill="url(#igift1)"/>
        <rect x="6" y="14" width="36" height="4" rx="2" fill="white" opacity="0.2"/>
      </svg>
    ),
    water: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="iwater1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#BAE6FD"/><stop offset="100%" stopColor="#0369A1"/></linearGradient>
          <filter id="fwater"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0369A1" floodOpacity="0.32"/></filter>
        </defs>
        <g filter="url(#fwater)">
          <path d="M24 4 C24 4 8 22 8 32 C8 40.8 15.2 44 24 44 C32.8 44 40 40.8 40 32 C40 22 24 4 24 4Z" fill="url(#iwater1)"/>
        </g>
        <ellipse cx="18" cy="28" rx="4" ry="6" fill="white" opacity="0.3" transform="rotate(-20 18 28)"/>
        <ellipse cx="24" cy="36" rx="6" ry="4" fill="white" opacity="0.18"/>
      </svg>
    ),
    electric: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ielec1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#D97706"/></linearGradient>
          <filter id="felec"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#D97706" floodOpacity="0.4"/></filter>
        </defs>
        <g filter="url(#felec)">
          <polygon points="28,4 14,26 22,26 20,44 34,22 26,22" fill="url(#ielec1)"/>
        </g>
        <polygon points="28,4 14,26 22,26" fill="white" opacity="0.25"/>
      </svg>
    ),
    gas: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="igas1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FCA5A5"/><stop offset="100%" stopColor="#DC2626"/></linearGradient>
          <linearGradient id="igas2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FEF9C3"/><stop offset="100%" stopColor="#FDE68A"/></linearGradient>
          <filter id="fgas"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#DC2626" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fgas)">
          <rect x="10" y="18" width="28" height="26" rx="6" fill="url(#igas2)"/>
          <rect x="16" y="10" width="16" height="12" rx="4" fill="url(#igas1)"/>
          <rect x="20" y="6" width="8" height="6" rx="3" fill="url(#igas1)" opacity="0.7"/>
        </g>
        <circle cx="18" cy="32" r="4" fill="url(#igas1)" opacity="0.7"/>
        <circle cx="30" cy="32" r="4" fill="url(#igas1)" opacity="0.7"/>
        <rect x="10" y="18" width="28" height="7" rx="6" fill="white" opacity="0.18"/>
      </svg>
    ),
    subscription: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="isub1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#C4B5FD"/><stop offset="100%" stopColor="#6D28D9"/></linearGradient>
          <filter id="fsub"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#6D28D9" floodOpacity="0.32"/></filter>
        </defs>
        <g filter="url(#fsub)">
          <rect x="4" y="10" width="40" height="28" rx="7" fill="url(#isub1)"/>
          <rect x="4" y="10" width="40" height="11" rx="7" fill="white" opacity="0.16"/>
        </g>
        <circle cx="14" cy="24" r="4" fill="white" opacity="0.85"/>
        <rect x="22" y="21" width="16" height="3" rx="1.5" fill="white" opacity="0.75"/>
        <rect x="22" y="27" width="10" height="3" rx="1.5" fill="white" opacity="0.5"/>
        <circle cx="36" cy="34" r="7" fill="#10B981"/>
        <path d="M33 34 L35 36 L39 32" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    carshare: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="icars1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="100%" stopColor="#065F46"/></linearGradient>
          <filter id="fcars"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#065F46" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fcars)">
          <rect x="4" y="22" width="40" height="16" rx="5" fill="url(#icars1)"/>
          <path d="M10 22 L16 12 H32 L38 22Z" fill="#34D399"/>
          <rect x="16" y="14" width="16" height="8" rx="2" fill="#BAE6FD" opacity="0.7"/>
          <path d="M10 22 L16 12 H24" fill="white" opacity="0.16"/>
        </g>
        <circle cx="14" cy="37" r="5" fill="#1E293B"/><circle cx="14" cy="37" r="2.5" fill="#94A3B8"/>
        <circle cx="34" cy="37" r="5" fill="#1E293B"/><circle cx="34" cy="37" r="2.5" fill="#94A3B8"/>
        <circle cx="38" cy="14" r="6" fill="#2DD4BF"/>
        <path d="M35.5 14 L37.5 16 L40.5 12" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    hobby: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ihobby1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#D97706"/></linearGradient>
          <linearGradient id="ihobby2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F9A8D4"/><stop offset="100%" stopColor="#DB2777"/></linearGradient>
          <filter id="fhobby"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#D97706" floodOpacity="0.3"/></filter>
        </defs>
        <g filter="url(#fhobby)">
          <circle cx="24" cy="24" r="18" fill="url(#ihobby1)"/>
          <circle cx="24" cy="24" r="10" fill="url(#ihobby2)"/>
          <circle cx="24" cy="24" r="4" fill="white" opacity="0.9"/>
        </g>
        <circle cx="24" cy="6" r="3" fill="url(#ihobby2)"/>
        <circle cx="24" cy="42" r="3" fill="url(#ihobby2)"/>
        <circle cx="6" cy="24" r="3" fill="url(#ihobby2)"/>
        <circle cx="42" cy="24" r="3" fill="url(#ihobby2)"/>
      </svg>
    ),
    cafe: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="icafe1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#92400E"/></linearGradient>
          <filter id="fcafe"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#92400E" floodOpacity="0.32"/></filter>
        </defs>
        <g filter="url(#fcafe)">
          <path d="M8 20 H34 L30 40 H12 Z" fill="url(#icafe1)"/>
          <rect x="34" y="20" width="8" height="12" rx="4" fill="url(#icafe1)" opacity="0.7"/>
          <rect x="8" y="20" width="26" height="6" rx="3" fill="white" opacity="0.2"/>
        </g>
        <path d="M14 12 Q16 8 14 6" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
        <path d="M20 10 Q22 6 20 4" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
        <path d="M26 12 Q28 8 26 6" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
    baby: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ibaby1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#F59E0B"/></linearGradient>
          <filter id="fbaby"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#F59E0B" floodOpacity="0.3"/></filter>
        </defs>
        <g filter="url(#fbaby)">
          <circle cx="24" cy="16" r="12" fill="url(#ibaby1)"/>
          <path d="M12 28 C12 40 36 40 36 28 L36 36 C36 42 12 42 12 36 Z" fill="url(#ibaby1)"/>
        </g>
        <circle cx="20" cy="15" r="2" fill="#1E293B"/>
        <circle cx="28" cy="15" r="2" fill="#1E293B"/>
        <path d="M20 21 Q24 25 28 21" stroke="#92400E" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="16" cy="18" rx="3" ry="2" fill="#FBBF24" opacity="0.5"/>
        <ellipse cx="32" cy="18" rx="3" ry="2" fill="#FBBF24" opacity="0.5"/>
      </svg>
    ),
    medicine: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="imed1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="100%" stopColor="#065F46"/></linearGradient>
          <linearGradient id="imed2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FCA5A5"/><stop offset="100%" stopColor="#DC2626"/></linearGradient>
          <filter id="fmed"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#065F46" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fmed)">
          <rect x="10" y="10" width="28" height="28" rx="14" fill="url(#imed1)"/>
          <rect x="10" y="10" width="28" height="14" rx="14" fill="url(#imed2)"/>
        </g>
        <rect x="10" y="22" width="28" height="2" fill="white" opacity="0.4"/>
      </svg>
    ),
    camera: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="icam1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#334155"/><stop offset="100%" stopColor="#0F172A"/></linearGradient>
          <filter id="fcam"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.4"/></filter>
        </defs>
        <g filter="url(#fcam)">
          <rect x="4" y="14" width="40" height="28" rx="6" fill="url(#icam1)"/>
          <path d="M16 14 L20 8 H28 L32 14Z" fill="url(#icam1)"/>
          <rect x="4" y="14" width="40" height="9" rx="6" fill="white" opacity="0.1"/>
        </g>
        <circle cx="24" cy="28" r="9" fill="#1E293B"/><circle cx="24" cy="28" r="7" fill="#38BDF8" opacity="0.4"/><circle cx="24" cy="28" r="4" fill="white" opacity="0.3"/>
        <circle cx="36" cy="20" r="2.5" fill="#FDE68A"/>
      </svg>
    ),
    diamond: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="idiam1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#BAE6FD"/><stop offset="100%" stopColor="#0369A1"/></linearGradient>
          <filter id="fdiam"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0369A1" floodOpacity="0.35"/></filter>
        </defs>
        <g filter="url(#fdiam)">
          <polygon points="24,4 40,18 24,44 8,18" fill="url(#idiam1)"/>
          <polygon points="8,18 40,18 24,44" fill="#0369A1" opacity="0.3"/>
          <polygon points="24,4 8,18 16,18" fill="white" opacity="0.35"/>
        </g>
        <polygon points="16,18 24,4 32,18" fill="white" opacity="0.2"/>
      </svg>
    ),
    fire: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ifire1" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#DC2626"/><stop offset="50%" stopColor="#F97316"/><stop offset="100%" stopColor="#FDE68A"/></linearGradient>
          <filter id="ffire"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#DC2626" floodOpacity="0.4"/></filter>
        </defs>
        <g filter="url(#ffire)">
          <path d="M24 4 C24 4 32 14 30 22 C34 18 36 12 34 6 C40 12 42 22 38 30 C36 36 30 42 24 44 C18 42 12 36 10 30 C6 22 8 12 14 6 C12 12 14 18 18 22 C16 14 24 4 24 4Z" fill="url(#ifire1)"/>
        </g>
        <ellipse cx="24" cy="34" rx="6" ry="8" fill="#FDE68A" opacity="0.4"/>
      </svg>
    ),
    flower: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="iflower1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F9A8D4"/><stop offset="100%" stopColor="#BE185D"/></linearGradient>
          <filter id="fflower"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#BE185D" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fflower)">
          <ellipse cx="24" cy="12" rx="7" ry="10" fill="url(#iflower1)"/>
          <ellipse cx="24" cy="36" rx="7" ry="10" fill="url(#iflower1)"/>
          <ellipse cx="12" cy="24" rx="10" ry="7" fill="url(#iflower1)"/>
          <ellipse cx="36" cy="24" rx="10" ry="7" fill="url(#iflower1)"/>
        </g>
        <circle cx="24" cy="24" r="8" fill="#FDE68A"/>
        <circle cx="24" cy="24" r="4" fill="#F59E0B"/>
      </svg>
    ),
    rice: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="irice1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FEF9C3"/><stop offset="100%" stopColor="#F59E0B"/></linearGradient>
          <filter id="frice"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#F59E0B" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#frice)">
          <path d="M8 30 Q8 44 24 44 Q40 44 40 30 L36 16 H12 Z" fill="url(#irice1)"/>
          <path d="M12 16 H36 Q38 16 38 18 Q38 20 36 20 H12 Q10 20 10 18 Q10 16 12 16Z" fill="#F59E0B"/>
        </g>
        <rect x="21" y="6" width="6" height="12" rx="3" fill="#22C55E"/>
        <ellipse cx="24" cy="32" rx="10" ry="6" fill="white" opacity="0.3"/>
      </svg>
    ),
    sake: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="isake1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FCA5A5"/><stop offset="100%" stopColor="#7C3AED"/></linearGradient>
          <filter id="fsake"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#7C3AED" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fsake)">
          <path d="M16 8 H32 L36 20 Q40 28 40 34 C40 40 34 44 24 44 C14 44 8 40 8 34 Q8 28 12 20 Z" fill="url(#isake1)"/>
          <path d="M16 8 H32 L36 20 H12 Z" fill="white" opacity="0.2"/>
        </g>
        <rect x="18" y="4" width="12" height="6" rx="3" fill="url(#isake1)"/>
        <ellipse cx="24" cy="34" rx="10" ry="6" fill="white" opacity="0.18"/>
      </svg>
    ),
    sports: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="isports1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="100%" stopColor="#065F46"/></linearGradient>
          <filter id="fsports"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#065F46" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fsports)">
          <circle cx="24" cy="24" r="19" fill="url(#isports1)"/>
        </g>
        <path d="M5 24 Q12 18 24 24 Q36 30 43 24" stroke="white" strokeWidth="2" fill="none" opacity="0.6"/>
        <path d="M24 5 Q30 12 24 24 Q18 36 24 43" stroke="white" strokeWidth="2" fill="none" opacity="0.6"/>
        <circle cx="24" cy="24" r="19" stroke="white" strokeWidth="1" opacity="0.2"/>
      </svg>
    ),
    train: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="itrain1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#93C5FD"/><stop offset="100%" stopColor="#1D4ED8"/></linearGradient>
          <filter id="ftrain"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#1D4ED8" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#ftrain)">
          <rect x="10" y="6" width="28" height="32" rx="8" fill="url(#itrain1)"/>
          <rect x="10" y="6" width="28" height="12" rx="8" fill="white" opacity="0.18"/>
        </g>
        <rect x="14" y="10" width="8" height="6" rx="2" fill="#BAE6FD" opacity="0.8"/>
        <rect x="26" y="10" width="8" height="6" rx="2" fill="#BAE6FD" opacity="0.8"/>
        <circle cx="17" cy="30" r="4" fill="#1E293B"/><circle cx="17" cy="30" r="2" fill="#94A3B8"/>
        <circle cx="31" cy="30" r="4" fill="#1E293B"/><circle cx="31" cy="30" r="2" fill="#94A3B8"/>
        <rect x="8" y="38" width="32" height="4" rx="2" fill="url(#itrain1)" opacity="0.5"/>
        <rect x="14" y="38" width="4" height="6" rx="1" fill="url(#itrain1)" opacity="0.6"/>
        <rect x="30" y="38" width="4" height="6" rx="1" fill="url(#itrain1)" opacity="0.6"/>
      </svg>
    ),
    umbrella: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="iumb1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#C4B5FD"/><stop offset="100%" stopColor="#6D28D9"/></linearGradient>
          <filter id="fumb"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#6D28D9" floodOpacity="0.3"/></filter>
        </defs>
        <g filter="url(#fumb)">
          <path d="M24 4 C10 4 4 16 4 24 H44 C44 16 38 4 24 4Z" fill="url(#iumb1)"/>
          <path d="M24 4 C10 4 4 16 4 24 H14 C14 16 18 8 24 4Z" fill="white" opacity="0.18"/>
        </g>
        <rect x="22" y="24" width="4" height="16" rx="2" fill="url(#iumb1)"/>
        <path d="M22 40 Q22 46 28 44" stroke="url(#iumb1)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    yoga: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="iyoga1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F9A8D4"/><stop offset="100%" stopColor="#9D174D"/></linearGradient>
          <filter id="fyoga"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#9D174D" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fyoga)">
          <circle cx="24" cy="8" r="5" fill="url(#iyoga1)"/>
          <path d="M24 13 L24 28 M24 28 L14 38 M24 28 L34 38 M14 20 L34 20" stroke="url(#iyoga1)" strokeWidth="3.5" strokeLinecap="round"/>
        </g>
        <circle cx="24" cy="8" r="3" fill="white" opacity="0.4"/>
      </svg>
    ),
    wifi: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="iwifi1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#BAE6FD"/><stop offset="100%" stopColor="#0284C7"/></linearGradient>
          <filter id="fwifi"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.32"/></filter>
        </defs>
        <g filter="url(#fwifi)">
          <path d="M8 20 Q24 8 40 20" stroke="url(#iwifi1)" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M13 26 Q24 17 35 26" stroke="url(#iwifi1)" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d="M18 32 Q24 26 30 32" stroke="url(#iwifi1)" strokeWidth="4" fill="none" strokeLinecap="round"/>
        </g>
        <circle cx="24" cy="38" r="4" fill="url(#iwifi1)"/>
        <circle cx="24" cy="38" r="2" fill="white" opacity="0.6"/>
      </svg>
    ),
    hospital: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ihosp1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FCA5A5"/><stop offset="100%" stopColor="#DC2626"/></linearGradient>
          <filter id="fhosp"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#DC2626" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fhosp)">
          <rect x="8" y="10" width="32" height="34" rx="5" fill="white" opacity="0.9"/>
          <rect x="8" y="10" width="32" height="12" rx="5" fill="url(#ihosp1)"/>
          <rect x="21" y="22" width="6" height="16" rx="2" fill="url(#ihosp1)"/>
          <rect x="16" y="27" width="16" height="6" rx="2" fill="url(#ihosp1)"/>
        </g>
        <rect x="18" y="4" width="12" height="8" rx="3" fill="url(#ihosp1)" opacity="0.7"/>
      </svg>
    ),
    nisa: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="inisa1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="100%" stopColor="#059669"/></linearGradient>
          <filter id="fnisa"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#059669" floodOpacity="0.3"/></filter>
        </defs>
        <g filter="url(#fnisa)">
          <polyline points="6,36 16,22 24,28 34,14 42,20" stroke="url(#inisa1)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        <circle cx="42" cy="20" r="5" fill="url(#inisa1)"/>
        <circle cx="42" cy="20" r="2.5" fill="white" opacity="0.7"/>
        <circle cx="34" cy="14" r="4" fill="url(#inisa1)" opacity="0.7"/>
        <circle cx="24" cy="28" r="3.5" fill="url(#inisa1)" opacity="0.6"/>
        <circle cx="16" cy="22" r="3.5" fill="url(#inisa1)" opacity="0.6"/>
      </svg>
    ),
    fork: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ifork1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#EA580C"/></linearGradient>
          <filter id="ffork"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#EA580C" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#ffork)">
          <rect x="21" y="4" width="4" height="40" rx="2" fill="url(#ifork1)"/>
          <rect x="13" y="4" width="3" height="18" rx="1.5" fill="url(#ifork1)" opacity="0.8"/>
          <rect x="32" y="4" width="3" height="18" rx="1.5" fill="url(#ifork1)" opacity="0.8"/>
          <path d="M13 22 Q23 28 35 22" stroke="url(#ifork1)" strokeWidth="3" fill="none" strokeLinecap="round"/>
        </g>
      </svg>
    ),
    basket: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="ibasket1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#D97706"/></linearGradient>
          <filter id="fbasket"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#D97706" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fbasket)">
          <path d="M8 22 H40 L36 40 H12 Z" fill="url(#ibasket1)"/>
          <path d="M8 22 H40 L40 28 H8 Z" fill="white" opacity="0.2"/>
          <path d="M16 22 Q16 12 24 10 Q32 12 32 22" stroke="url(#ibasket1)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        </g>
        <rect x="17" y="28" width="3" height="10" rx="1.5" fill="white" opacity="0.5"/>
        <rect x="24" y="28" width="3" height="10" rx="1.5" fill="white" opacity="0.5"/>
        <rect x="31" y="28" width="3" height="10" rx="1.5" fill="white" opacity="0.5"/>
      </svg>
    ),
    medal: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="imedal1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#B45309"/></linearGradient>
          <linearGradient id="imedal2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#C4B5FD"/><stop offset="100%" stopColor="#7C3AED"/></linearGradient>
          <filter id="fmedal"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#B45309" floodOpacity="0.35"/></filter>
        </defs>
        <g filter="url(#fmedal)">
          <polygon points="24,4 28,14 38,14 30,20 33,30 24,24 15,30 18,20 10,14 20,14" fill="url(#imedal1)"/>
        </g>
        <polygon points="24,4 28,14 38,14" fill="white" opacity="0.25"/>
        <circle cx="24" cy="18" r="5" fill="white" opacity="0.5"/>
        <rect x="18" y="30" width="6" height="14" rx="1" fill="url(#imedal2)" opacity="0.8"/>
        <rect x="24" y="30" width="6" height="14" rx="1" fill="url(#imedal1)" opacity="0.8"/>
      </svg>
    ),
    memo: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="imemo1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#94A3B8"/><stop offset="100%" stopColor="#475569"/></linearGradient>
          <filter id="fmemo"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#475569" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fmemo)">
          <rect x="8" y="6" width="32" height="38" rx="5" fill="white" opacity="0.92"/>
          <rect x="8" y="6" width="32" height="10" rx="5" fill="url(#imemo1)"/>
        </g>
        <rect x="14" y="22" width="20" height="2.5" rx="1.2" fill="url(#imemo1)" opacity="0.5"/>
        <rect x="14" y="28" width="14" height="2.5" rx="1.2" fill="url(#imemo1)" opacity="0.4"/>
        <rect x="14" y="34" width="17" height="2.5" rx="1.2" fill="url(#imemo1)" opacity="0.35"/>
        <circle cx="24" cy="6" r="3" fill="url(#imemo1)" opacity="0.6"/>
      </svg>
    ),
    tshirt: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="itshirt1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F9A8D4"/><stop offset="100%" stopColor="#BE185D"/></linearGradient>
          <filter id="ftshirt"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#BE185D" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#ftshirt)">
          <path d="M16 6 L6 16 L14 20 L14 42 H34 L34 20 L42 16 L32 6 Q28 12 24 12 Q20 12 16 6Z" fill="url(#itshirt1)"/>
          <path d="M16 6 L6 16 L14 20 L14 12Z" fill="white" opacity="0.18"/>
        </g>
        <ellipse cx="24" cy="10" rx="8" ry="4" fill="white" opacity="0.22"/>
      </svg>
    ),
    herb: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="iherb1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="100%" stopColor="#065F46"/></linearGradient>
          <filter id="fherb"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#065F46" floodOpacity="0.28"/></filter>
        </defs>
        <g filter="url(#fherb)">
          <ellipse cx="18" cy="18" rx="10" ry="13" fill="url(#iherb1)" transform="rotate(-20 18 18)"/>
          <ellipse cx="30" cy="18" rx="10" ry="13" fill="url(#iherb1)" transform="rotate(20 30 18)" opacity="0.85"/>
          <ellipse cx="24" cy="14" rx="8" ry="11" fill="url(#iherb1)" opacity="0.7"/>
        </g>
        <rect x="22" y="28" width="4" height="14" rx="2" fill="#047857"/>
        <ellipse cx="18" cy="18" rx="5" ry="7" fill="white" opacity="0.18" transform="rotate(-20 18 18)"/>
      </svg>
    ),
  };
  return map[type] || map["star"];
};

// ─── Category English Names (for receipt) ────────────────────────────────────
const CAT_EN = {
  "給与":"SALARY","賞与":"BONUS","控除":"DEDUCTION","ふるさと納税":"HOMETOWN TAX",
  "家賃":"RENT","電気":"ELECTRICITY","ガス":"GAS","水道":"WATER",
  "携帯":"MOBILE","Wi-Fi":"WI-FI","NISA":"NISA INVESTMENT","サブスク":"SUBSCRIPTION",
  "年金":"PENSION","健康保険":"HEALTH INS.",
  "食費":"FOOD EXPENSES","外食":"DINING OUT","日用品":"DAILY GOODS","衣服":"CLOTHING",
  "交通費":"TRANSPORT","医療費":"MEDICAL","カーシェア":"CAR SHARE",
  "美容":"BEAUTY","趣味":"HOBBIES","えま":"Amōre!","えま(食)":"Emma Food","ゲーム":"GAME","交際":"SOCIAL","バレー":"VOLLEY","教養文化":"CULTURE","デジタル":"DIGITAL","友人":"FRIENDS","特別支出":"SPECIAL","雑収入":"MISC INCOME",
};
const getCatEn = name => CAT_EN[name] || name.toUpperCase();

// ─── Receipt background gradients ───────────────────────────────────────────
// カテゴリ別レシート背景グラデーション
const RECEIPT_BG = {
  // 収入系 — 豊かさ・温かみ
  "給与":         "linear-gradient(145deg, #1a1a2e 0%, #2d4a7a 40%, #4a7a9b 70%, #7fb3c8 100%)",
  "賞与":         "linear-gradient(145deg, #2C1654 0%, #7b2d8b 40%, #c56cd6 70%, #f9d4f0 100%)",
  "控除":         "linear-gradient(145deg, #2d2d2d 0%, #4a4a4a 40%, #757575 70%, #bdbdbd 100%)",
  "ふるさと納税": "linear-gradient(145deg, #1b4332 0%, #2d6a4f 40%, #52b788 70%, #b7e4c7 100%)",
  // 固定費 — 生活インフラ感
  "家賃":         "linear-gradient(145deg, #1a0a2e 0%, #3d1a6e 40%, #7952a0 70%, #c4a0d4 100%)",
  "電気":         "linear-gradient(145deg, #1a1500 0%, #4a3c00 40%, #a08600 70%, #f0d060 100%)",
  "ガス":         "linear-gradient(145deg, #2d0a0a 0%, #7a1a1a 40%, #c04040 70%, #f08080 100%)",
  "水道":         "linear-gradient(145deg, #001a33 0%, #003d6b 40%, #0077b6 70%, #90e0ef 100%)",
  "携帯":         "linear-gradient(145deg, #0d0d1a 0%, #1a2040 40%, #2d4080 70%, #6080c0 100%)",
  "Wi-Fi":        "linear-gradient(145deg, #001233 0%, #023e8a 40%, #0096c7 70%, #90e0ef 100%)",
  "NISA":         "linear-gradient(145deg, #0a2000 0%, #1a4a0a 40%, #2d8020 70%, #70c040 100%)",
  "サブスク":     "linear-gradient(145deg, #1a0030 0%, #4a0080 40%, #8000c0 70%, #c060f0 100%)",
  "年金":         "linear-gradient(145deg, #1a1000 0%, #4a3000 40%, #906000 70%, #d4a020 100%)",
  "健康保険":     "linear-gradient(145deg, #001a0d 0%, #004d29 40%, #00916a 70%, #40c9a2 100%)",
  // 変動費 — 日常生活の色彩
  "食費":         "linear-gradient(145deg, #2d1500 0%, #7a3500 40%, #c06020 70%, #e8a060 100%)",
  "外食":         "linear-gradient(145deg, #1a0505 0%, #5a1010 40%, #a03030 70%, #d07060 100%)",
  "日用品":       "linear-gradient(145deg, #1a1500 0%, #403800 40%, #706400 70%, #b0a050 100%)",
  "衣服":         "linear-gradient(145deg, #200a20 0%, #5a1a5a 40%, #a03090 70%, #d880c0 100%)",
  "交通費":       "linear-gradient(145deg, #001020 0%, #002a50 40%, #004a90 70%, #4080d0 100%)",
  "医療費":       "linear-gradient(145deg, #001a10 0%, #003d26 40%, #007050 70%, #40b090 100%)",
  "カーシェア":   "linear-gradient(145deg, #001520 0%, #003040 40%, #005570 70%, #3090b0 100%)",
  "美容":         "linear-gradient(145deg, #2d0015 0%, #7a003a 40%, #c02060 70%, #f080a0 100%)",
  "趣味":         "linear-gradient(145deg, #0a200a 0%, #1e4d1e 40%, #3a8a3a 70%, #70c070 100%)",
};
// デフォルト（未登録カテゴリ用）
const LANDSCAPES = [
  "linear-gradient(145deg, #0f0c29 0%, #302b63 40%, #24243e 100%)",
  "linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
  "linear-gradient(145deg, #2c1654 0%, #4a0e8f 40%, #7b2d8b 100%)",
  "linear-gradient(145deg, #0d1b2a 0%, #1b2a4a 40%, #2a3f6f 100%)",
  "linear-gradient(145deg, #1a0a2e 0%, #2d1a5e 40%, #4a2d8e 100%)",
  "linear-gradient(145deg, #0a1628 0%, #142744 40%, #1e3860 100%)",
  "linear-gradient(145deg, #1e1428 0%, #352244 40%, #4c3060 100%)",
  "linear-gradient(145deg, #0f1923 0%, #1a2e3d 40%, #254457 100%)",
];
// カテゴリ名からグラデーションを取得
const getReceiptBg = (name) => RECEIPT_BG[name] || LANDSCAPES[Math.floor(Math.random()*LANDSCAPES.length)];

// ─── Icon Picker ────────────────────────────────────────────────────────────
const ICON_LABELS = { coin:"コイン", house:"家", phone:"スマホ", food:"食事", star:"スター", wallet:"財布", pencil:"鉛筆", chart:"グラフ", list:"リスト", gear:"歯車", car:"車", heart:"ハート", book:"本", plane:"旅行", shop:"買物", music:"音楽", gym:"ジム", pet:"ペット", beauty:"美容", gift:"ギフト", water:"水道", electric:"電気", gas:"ガス", subscription:"サブスク", carshare:"カーシェア", hobby:"趣味", cafe:"カフェ", baby:"育児", medicine:"医薬", camera:"カメラ", diamond:"ジュエリー", fire:"ガス", flower:"花", rice:"食材", sake:"お酒", sports:"スポーツ", train:"電車", umbrella:"保険", yoga:"ヨガ", wifi:"Wi-Fi", hospital:"病院", nisa:"NISA", fork:"食費", basket:"日用品", medal:"賞与", memo:"控除", tshirt:"衣服", herb:"趣味" };

function IconPicker({ value, onChange }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8, padding:"4px 0" }}>
      {ICON_KEYS.map(k => (
        <button key={k} onClick={()=>onChange(k)} style={{
          background: value===k ? BG2 : WHITE,
          border:"none", borderRadius:12, padding:"8px 4px",
          display:"flex", flexDirection:"column", alignItems:"center", gap:4,
          cursor:"pointer", fontFamily:FONT,
          boxShadow: value===k ? neuInsetShadow(3) : neuShadow(3),
          transition:"all 0.12s ease",
        }}>
          <Icon3D type={k} size={28}/>
          <span style={{ fontSize:9, color:value===k?TEAL2:GRAY, fontWeight:700 }}>{ICON_LABELS[k]}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Data ───────────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = {
  income: [
    { id:"inc_1", name:"給与",         icon:"coin",    color:"#10B981", subtractFromIncome:false },
    { id:"inc_2", name:"賞与",         icon:"medal",   color:"#F59E0B", subtractFromIncome:false },
    { id:"inc_3", name:"控除",         icon:"memo",    color:"#94A3B8", subtractFromIncome:true  },
    { id:"inc_4", name:"ふるさと納税", icon:"gift",    color:"#E879A0", subtractFromIncome:true  },
    { id:"inc_5", name:"雑収入",       icon:"coin",   color:"#F59E0B" },
  ],
  fixed: [
    { id:"fix_1", name:"家賃",     icon:"house",        color:"#E879A0" },
    { id:"fix_2", name:"電気",     icon:"electric",     color:"#F59E0B" },
    { id:"fix_3", name:"ガス",     icon:"fire",         color:"#FB923C" },
    { id:"fix_4", name:"水道",     icon:"water",        color:"#38BDF8" },
    { id:"fix_5", name:"携帯",     icon:"phone",        color:"#3B82F6" },
    { id:"fix_6", name:"Wi-Fi",    icon:"wifi",         color:"#0EA5E9" },
    { id:"fix_7", name:"NISA",     icon:"nisa",         color:"#10B981" },
    { id:"fix_8", name:"サブスク", icon:"subscription", color:"#8B5CF6" },
    { id:"fix_9", name:"年金",     icon:"coin",         color:"#F472B6" },
    { id:"fix_10",name:"健康保険", icon:"hospital",     color:"#34D399" },
  ],
  variable: [
    { id:"var_1", name:"食費",     icon:"fork",     color:"#F97316" },
    { id:"var_2", name:"外食",     icon:"food",     color:"#FB923C" },
    { id:"var_3", name:"日用品",   icon:"basket",   color:"#FBBF24" },
    { id:"var_4", name:"衣服",     icon:"tshirt",   color:"#F472B6" },
    { id:"var_5", name:"交通費",   icon:"train",    color:"#38BDF8" },
    { id:"var_6", name:"医療費",   icon:"hospital", color:"#34D399" },
    { id:"var_7", name:"カーシェア",icon:"carshare",color:"#2DD4BF" },
    { id:"var_8", name:"美容",     icon:"beauty",   color:"#E879A0" },
    { id:"var_9", name:"趣味",     icon:"herb",     color:"#6EE7B7" },
    { id:"var_10",name:"えま",     icon:"heart",    color:"#FCA5A5" },
    { id:"var_11",name:"えま(食)", icon:"fork",     color:"#FB923C" },
    { id:"var_12",name:"ゲーム",   icon:"hobby",    color:"#8B5CF6" },
    { id:"var_13",name:"交際",     icon:"gift",     color:"#E879A0" },
    { id:"var_14",name:"バレー",   icon:"sports",   color:"#3B82F6" },
    { id:"var_15",name:"教養文化", icon:"book",     color:"#10B981" },
    { id:"var_16",name:"デジタル", icon:"subscription", color:"#6366F1" },
    { id:"var_17",name:"友人",     icon:"heart",    color:"#F472B6" },
    { id:"var_18",name:"特別支出", icon:"diamond",  color:"#F59E0B" },
  ],
};

const SAMPLE_RECORDS = (() => {
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const prev=m===0?11:m-1; const prevY=m===0?y-1:y;
  const p=(n)=>String(n).padStart(2,"0");
  return [
    { id:"r1",  type:"income",   categoryId:"inc_1", amount:320000, date:`${y}-${p(m+1)}-25`, memo:"" },
    { id:"r2",  type:"fixed",    categoryId:"fix_1", amount:85000,  date:`${y}-${p(m+1)}-01`, memo:"" },
    { id:"r3",  type:"fixed",    categoryId:"fix_2", amount:8000,   date:`${y}-${p(m+1)}-05`, memo:"" },
    { id:"r4",  type:"fixed",    categoryId:"fix_3", amount:12000,  date:`${y}-${p(m+1)}-10`, memo:"" },
    { id:"r5",  type:"variable", categoryId:"var_1", amount:35000,  date:`${y}-${p(m+1)}-15`, memo:"" },
    { id:"r6",  type:"variable", categoryId:"var_2", amount:8500,   date:`${y}-${p(m+1)}-18`, memo:"" },
    { id:"r7",  type:"variable", categoryId:"var_5", amount:6000,   date:`${y}-${p(m+1)}-20`, memo:"" },
    { id:"r8",  type:"income",   categoryId:"inc_1", amount:310000, date:`${prevY}-${p(prev+1)}-25`, memo:"" },
    { id:"r9",  type:"fixed",    categoryId:"fix_1", amount:85000,  date:`${prevY}-${p(prev+1)}-01`, memo:"" },
    { id:"r10", type:"variable", categoryId:"var_1", amount:42000,  date:`${prevY}-${p(prev+1)}-14`, memo:"" },
  ];
})();

const fmt = n => "¥"+Math.abs(Math.round(n)).toLocaleString();
const getMonthKey = d => d.slice(0,7);
const monthLabel  = k => { const [y,m]=k.split("-"); return `${y}年${parseInt(m)}月`; };
const addMonths   = (k,d) => { const [y,m]=k.split("-").map(Number); const dt=new Date(y,m-1+d,1); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; };
const currentMonthKey = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };

// ─── Pressable Button ───────────────────────────────────────────────────────
function NeuBtn({ children, onClick, accent, active, style={}, small=false }) {
  const [down, setDown] = useState(false);
  const pressed = down || active;
  return (
    <button
      onMouseDown={()=>setDown(true)} onMouseUp={()=>setDown(false)} onMouseLeave={()=>setDown(false)}
      onTouchStart={()=>setDown(true)} onTouchEnd={()=>setDown(false)}
      onClick={onClick}
      style={{
        background: accent ? NOISE_GRAD : pressed ? WHITE : GLASS_BG,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: accent ? "none" : GLASS_BORDER,
        borderRadius:small?12:16,
        padding: small?"9px 14px":"14px 20px",
        cursor:"pointer", fontFamily:FONT,
        color: accent ? DARKER : DARK,
        fontSize: small?13:15, fontWeight:700, letterSpacing:"0.2px",
        boxShadow: pressed
          ? (accent ? `inset 2px 2px 8px rgba(0,0,0,0.1), 0 0 12px ${TEAL_GLOW}` : neuInsetShadow(4))
          : (accent ? NOISE_SHADOW : neuShadow(5)),
        transition:"all 0.12s ease",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        ...style,
      }}
    >{children}</button>
  );
}

// ─── Calculator ─────────────────────────────────────────────────────────────
function Calculator({ onConfirm }) {
  const [display, setDisplay] = useState("0");
  const press = k => setDisplay(p => {
    if (k==="⌫") return p.length<=1?"0":p.slice(0,-1);
    if (k==="AC") return "0";
    if (k==="00") return p==="0"?"0":p+"00";
    if (p==="0"&&k!==".") return k;
    if (p.replace(".","").length>=9) return p;
    return p+k;
  });
  const keys = [["7","8","9"],["4","5","6"],["1","2","3"],["AC","0","⌫"]];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <div style={{ ...neuInset(6), borderRadius:14, padding:"8px 16px", textAlign:"right", marginBottom:0, border:"1px solid rgba(255,255,255,0.35)" }}>
        <div style={{ fontSize:10, color:GRAY, fontWeight:700, letterSpacing:"1.5px", marginBottom:2 }}>金額</div>
        <div style={{ fontSize:32, fontWeight:900, color:DARK, letterSpacing:"-1px", fontVariantNumeric:"tabular-nums" }}>
          {parseFloat(display||"0").toLocaleString()}
          <span style={{ fontSize:20, color:TEAL2, marginLeft:4, fontWeight:700 }}>円</span>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {keys.flat().map(k => {
          const isAC=k==="AC", isDel=k==="⌫";
          return (
            <button key={k}
              onMouseDown={e=>{e.currentTarget.style.boxShadow=neuInsetShadow(4);e.currentTarget.style.transform="scale(0.96)";}}
              onMouseUp={e=>{e.currentTarget.style.boxShadow=neuShadow(5);e.currentTarget.style.transform="scale(1)";}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow=neuShadow(5);e.currentTarget.style.transform="scale(1)";}}
              onClick={()=>press(k)}
              style={{ background:"rgba(255,255,255,0.18)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.38)", borderRadius:13, padding:"13px 0", fontSize:19, fontWeight:600, fontFamily:FONT, color:isAC?PINK:isDel?TEAL2:DARK, cursor:"pointer", boxShadow:"0 4px 12px rgba(80,40,160,0.12)", transition:"all 0.1s ease" }}
            >{k}</button>
          );
        })}
      </div>
      <button
        onMouseDown={e=>{e.currentTarget.style.transform="scale(0.97)";e.currentTarget.style.boxShadow=`inset 2px 2px 8px rgba(0,0,0,0.2), 0 0 14px ${TEAL_GLOW}`;}}
        onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=ACCENT_SHADOW;}}
        onClick={()=>{ const v=parseFloat(display); if(v>0)onConfirm(v); }}
        style={{ background:NOISE_GRAD, border:"1px solid rgba(255,255,255,0.8)", borderRadius:14, padding:"13px", fontSize:15, fontWeight:800, fontFamily:FONT, color:DARKER, cursor:"pointer", marginTop:4, letterSpacing:"0.5px", boxShadow:NOISE_SHADOW, transition:"all 0.12s ease" }}
      >登録する ✓</button>
    </div>
  );
}

// ─── Category Card ──────────────────────────────────────────────────────────
function CatCard({ cat, onClick }) {
  const [down, setDown] = useState(false);
  return (
    <button
      onMouseDown={()=>setDown(true)} onMouseUp={()=>setDown(false)} onMouseLeave={()=>setDown(false)}
      onTouchStart={()=>setDown(true)} onTouchEnd={()=>setDown(false)}
      onClick={onClick}
      style={{ background:down?GLASS_BG2:GLASS_BG, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:GLASS_BORDER, borderRadius:22, padding:"18px 8px 14px", display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer", fontFamily:FONT, boxShadow:down?neuInsetShadow(4):neuShadow(6), transform:down?"scale(0.96)":"scale(1)", transition:"all 0.12s ease" }}
    >
      <div style={{ width:54, height:54, borderRadius:18, background:cat.color+"1A", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`3px 3px 9px rgba(163,177,198,0.42),-3px -3px 9px rgba(255,255,255,0.9)` }}>
        <Icon3D type={cat.icon||"star"} size={36}/>
      </div>
      <div style={{ fontSize:11, fontWeight:700, color:DARK }}>{cat.name}</div>
    </button>
  );
}

// ─── Opening Animation — Aurora Komorebi ────────────────────────────────────
function Splash({ onDone }) {
  const [phase, setPhase] = useState(0);
  // 0=init 1=letters animate 2=subtitle in 3=hold 4=fade out
  useEffect(()=>{
    const t1 = setTimeout(()=>setPhase(1), 100);
    const t2 = setTimeout(()=>setPhase(2), 1400);
    const t3 = setTimeout(()=>setPhase(3), 2200);
    const t4 = setTimeout(()=>setPhase(4), 3200);
    const t5 = setTimeout(()=>onDone(),    3900);
    return ()=>{ clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4);clearTimeout(t5); };
  },[]);

  const letters = ["K","A","K","E","I","B","O"];

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background: "linear-gradient(160deg, #F8F6FF 0%, #EEF4FF 35%, #F0FAFA 65%, #FFF8F0 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      opacity: phase===4 ? 0 : 1,
      transition: phase===4 ? "opacity 0.7s ease" : "none",
      overflow:"hidden",
    }}>
      {/* Aurora blobs behind text */}
      <style>{`
        @keyframes auroraPulse {
          0%,100% { transform:scale(1) rotate(0deg);   opacity:0.55; }
          33%      { transform:scale(1.12) rotate(8deg);  opacity:0.75; }
          66%      { transform:scale(0.92) rotate(-6deg); opacity:0.5; }
        }
        @keyframes komorebi {
          0%   { transform:translateX(-30%) translateY(-10%) rotate(-15deg) scale(1.1); opacity:0; }
          15%  { opacity:0.7; }
          50%  { transform:translateX(10%) translateY(8%) rotate(5deg) scale(1.3); opacity:0.5; }
          85%  { opacity:0.65; }
          100% { transform:translateX(40%) translateY(-5%) rotate(20deg) scale(1.0); opacity:0; }
        }
        @keyframes letterDrop {
          0%   { opacity:0; transform: translateY(-40px) scaleY(1.4) blur(12px); filter:blur(12px); }
          60%  { opacity:1; transform: translateY(4px)   scaleY(0.95) blur(0px); filter:blur(0px); }
          80%  { transform: translateY(-2px) scaleY(1.02); }
          100% { opacity:1; transform: translateY(0)    scaleY(1);    filter:blur(0px); }
        }
        @keyframes letterGlow {
          0%,100% { text-shadow: 0 0 12px rgba(167,139,250,0.0); }
          50%     { text-shadow: 0 0 40px rgba(167,139,250,0.6), 0 0 80px rgba(45,212,191,0.3); }
        }
        @keyframes holoShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes subIn {
          from { opacity:0; transform:translateY(10px); filter:blur(6px); }
          to   { opacity:1; transform:translateY(0);    filter:blur(0px); }
        }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
      `}</style>

      {/* Komorebi light rays */}
      {[0,1,2,3,4].map(i=>(
        <div key={i} style={{
          position:"absolute",
          top: "-20%", left: `${10+i*18}%`,
          width: `${40+i*10}px`, height:"180%",
          background: `linear-gradient(180deg, transparent 0%, rgba(${[
            "200,180,255","180,220,255","160,240,220","255,230,160","255,180,200"
          ][i]},0.18) 30%, rgba(${[
            "200,180,255","180,220,255","160,240,220","255,230,160","255,180,200"
          ][i]},0.06) 70%, transparent 100%)`,
          transform:`rotate(${-12+i*4}deg)`,
          animation:`komorebi ${5+i*1.2}s ease-in-out ${i*0.6}s infinite`,
          pointerEvents:"none",
        }}/>
      ))}

      {/* Aurora orbs */}
      {[
        {x:"15%",y:"20%",s:180,c:"#E0D7FF,#BAE6FD"},
        {x:"65%",y:"12%",s:220,c:"#BAE6FD,#A7F3D0"},
        {x:"10%",y:"65%",s:160,c:"#FDE68A,#FECDD3"},
        {x:"70%",y:"60%",s:200,c:"#C7B8FF,#F9A8D4"},
      ].map((o,i)=>(
        <div key={i} style={{
          position:"absolute", left:o.x, top:o.y, width:o.s, height:o.s,
          borderRadius:"50%",
          background:`radial-gradient(circle, ${o.c.split(",")[0]}88 0%, ${o.c.split(",")[1]}44 60%, transparent 100%)`,
          filter:"blur(32px)",
          animation:`auroraPulse ${4+i}s ease-in-out ${i*0.7}s infinite`,
          pointerEvents:"none",
        }}/>
      ))}

      {/* Main KAKEIBO letter animation */}
      <div style={{ position:"relative", display:"flex", alignItems:"center", gap:2, marginBottom:8 }}>
        {letters.map((letter, i) => (
          <div key={i} style={{
            fontSize: 52,
            fontWeight: 900,
            fontFamily: FONT,
            letterSpacing:"0.05em",
            lineHeight:1,
            // Holographic gradient on each letter
            background: HOLO_GRAD,
            backgroundSize:"400% 400%",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
            backgroundClip:"text",
            animation: phase>=1
              ? `letterDrop 0.6s cubic-bezier(0.22,1,0.36,1) ${i*0.08}s both, letterGlow 2.5s ease-in-out ${0.6+i*0.08}s infinite, holoShift 4s ease-in-out ${i*0.3}s infinite`
              : "none",
            opacity: phase>=1 ? 1 : 0,
            cursor:"default", userSelect:"none",
          }}>
            {letter}
          </div>
        ))}
        {/* Flare overlay sweeping across */}
        {phase>=1&&(
          <div style={{
            position:"absolute", inset:0,
            background:"linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.7) 50%, transparent 70%)",
            backgroundSize:"200% 100%",
            animation:"holoShift 2s ease-in-out 0.8s 2",
            pointerEvents:"none",
            borderRadius:4,
          }}/>
        )}
      </div>

      {/* 家計簿 subtitle */}
      <div style={{
        fontSize:16, fontWeight:700, color:DARK,
        letterSpacing:"0.25em", marginBottom:6,
        opacity: phase>=2 ? 1 : 0,
        animation: phase>=2 ? "subIn 0.7s ease both" : "none",
        fontFamily:FONT,
      }}>家計簿</div>


      {/* Dots */}
      <div style={{ display:"flex", gap:8, marginTop:40, opacity:phase>=3?1:0, transition:"opacity 0.5s ease" }}>
        {[0,1,2].map(i=>(
          <div key={i} style={{
            width:7, height:7, borderRadius:"50%",
            background:HOLO_GRAD, backgroundSize:"300% 300%",
            boxShadow:`0 2px 8px rgba(167,139,250,0.35)`,
            animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`,
          }}/>
        ))}
      </div>
    </div>
  );
}


// ─── Receipt Modal ────────────────────────────────────────────────────────────
function ReceiptModal({ record, catName, catIcon, onClose }) {
  const bg = getReceiptBg(catName);
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ setTimeout(()=>setVisible(true),30); },[]);

  // Fake barcode from record id
  const barcodeVal = record.id.replace(/[^0-9]/g,"").slice(0,12).padEnd(12,"0");
  const dateStr = record.date;
  const [year,month,day] = dateStr.split("-");
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const dateLabel = `${parseInt(day)} ${months[parseInt(month)-1]} ${year}`;
  const receiptNo = "#"+year+month+day+"-"+barcodeVal.slice(0,4);
  const isIncome = record.type==="income";
  const titleEn = getCatEn(catName);

  // SVG barcode (simple visual bars)
  const bars = Array.from({length:52},(_,i)=>{
    const v = parseInt(barcodeVal[i%12]||"0");
    return { h: 20+((v*i*7)%22), w: i%5===0?2:1 };
  });

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:2000,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"20px",
      background:"rgba(20,20,40,0.55)",
      backdropFilter:"blur(8px)",
      WebkitBackdropFilter:"blur(8px)",
      opacity: visible?1:0,
      transition:"opacity 0.35s ease",
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%", maxWidth:340,
        borderRadius:28,
        overflow:"hidden",
        position:"relative",
        transform: visible?"scale(1) translateY(0)":"scale(0.88) translateY(30px)",
        transition:"transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow:"0 32px 80px rgba(0,0,0,0.45), 0 2px 8px rgba(255,255,255,0.1)",
      }}>
        {/* Background gradient */}
        <div style={{
          position:"absolute", inset:0,
          background:bg,
        }}/>
        {/* Glass overlay */}
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.20) 100%)",
          backdropFilter:"blur(2px)",
        }}/>

        {/* Content */}
        <div style={{ position:"relative", zIndex:1, padding:"36px 28px 28px" }}>
          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{
              fontSize:38, fontWeight:900, color:WHITE, letterSpacing:"-1px",
              fontFamily:FONT, lineHeight:1, marginBottom:6,
              textShadow:"0 2px 20px rgba(0,0,0,0.3)",
            }}>{titleEn.split(" ")[0]}<span style={{ opacity:0.7 }}>.</span></div>
            {titleEn.split(" ").length>1 && (
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:600, letterSpacing:"3px", fontFamily:FONT }}>
                {titleEn.split(" ").slice(1).join(" ")}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.35)", marginBottom:18 }}/>

          {/* Meta row */}
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <div style={{ fontSize:8, color:"rgba(255,255,255,0.6)", letterSpacing:"2px", fontWeight:700, marginBottom:3 }}>RECEIPT</div>
              <div style={{ fontSize:11, color:WHITE, fontWeight:700, fontFamily:FONT }}>{receiptNo}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:8, color:"rgba(255,255,255,0.6)", letterSpacing:"2px", fontWeight:700, marginBottom:3 }}>DATE</div>
              <div style={{ fontSize:11, color:WHITE, fontWeight:700, fontFamily:FONT }}>{dateLabel}</div>
            </div>
          </div>

          {/* Item row */}
          <div style={{ background:"rgba(255,255,255,0.12)", borderRadius:14, padding:"14px 16px", marginBottom:16, border:"1px solid rgba(255,255,255,0.25)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.65)", letterSpacing:"2px", fontWeight:700 }}>ITEM</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.65)", letterSpacing:"2px", fontWeight:700 }}>AMOUNT</div>
            </div>
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.2)", paddingTop:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Icon3D type={catIcon||"star"} size={24}/>
                  <span style={{ fontSize:13, color:WHITE, fontWeight:700, fontFamily:FONT }}>{catName}</span>
                </div>
                <span style={{ fontSize:15, color:WHITE, fontWeight:900, fontFamily:FONT, letterSpacing:"-0.5px" }}>
                  {isIncome?"+":"−"}¥{record.amount.toLocaleString()}
                </span>
              </div>
              {record.memo && (
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.55)", marginTop:6, fontStyle:"italic" }}>{record.memo}</div>
              )}
            </div>
          </div>

          {/* Total */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:20 }}>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontWeight:700, letterSpacing:"2px" }}>TOTAL</span>
            <span style={{ fontSize:22, color:WHITE, fontWeight:900, fontFamily:FONT, letterSpacing:"-0.5px" }}>
              {isIncome?"+":"−"}¥{record.amount.toLocaleString()}
            </span>
          </div>

          {/* Divider */}
          <div style={{ borderTop:"1px dashed rgba(255,255,255,0.3)", marginBottom:20 }}/>

          {/* Barcode */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <div style={{ display:"flex", alignItems:"flex-end", gap:"1px", height:44 }}>
              {bars.map((b,i)=>(
                <div key={i} style={{
                  width:b.w, height:b.h,
                  background:"rgba(255,255,255,0.85)",
                  borderRadius:1,
                }}/>
              ))}
            </div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", letterSpacing:"3px", fontFamily:FONT }}>KAKEIBO STUDIO</div>
          </div>

          {/* Close hint */}
          <div style={{ textAlign:"center", marginTop:20 }}>
            <button onClick={onClose} style={{
              background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.4)",
              borderRadius:99, padding:"8px 24px", color:WHITE, fontSize:11,
              fontWeight:700, cursor:"pointer", letterSpacing:"1.5px", fontFamily:FONT,
              backdropFilter:"blur(8px)",
            }}>CLOSE</button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Input Tab ──────────────────────────────────────────────────────────────
function InputTab({ categories, onAdd }) {
  const [mode, setMode]             = useState("expense");
  const [expenseType, setExpenseType] = useState("fixed");
  const [selectedCat, setSelectedCat] = useState(null);
  const [step, setStep]             = useState("category");
  const [memo, setMemo]             = useState("");
  const [customDate, setCustomDate] = useState("");
  const [toast, setToast]           = useState(null);
  const [receipt, setReceipt]       = useState(null); // {record, catName, catIcon}

  const cats = mode==="income" ? categories.income : expenseType==="fixed" ? categories.fixed : categories.variable;

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null), 2200); };

  const handleConfirm = amount => {
    const today=new Date();
    const todayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
    const date = customDate || todayStr;
    // 控除・ふるさと納税はsubtractFromIncome=trueなのでマイナス金額で保存
    const allIncomeCats = categories.income;
    const catDef = allIncomeCats.find(ct=>ct.id===selectedCat.id);
    const isSubtract = catDef?.subtractFromIncome === true;
    // 控除・ふるさと納税は支出として記録（支出合計に加算）
    const recordType = isSubtract ? "variable" : mode==="income" ? "income" : expenseType;
    const finalAmount = Math.abs(amount); // 常に正の値で保存
    const newRecord = { id:"r"+Date.now(), type:recordType, categoryId:selectedCat.id, amount:finalAmount, date, memo };
    onAdd(newRecord);
    setReceipt({ record:newRecord, catName:selectedCat.name, catIcon:selectedCat.icon||"star" });
    setStep("category"); setSelectedCat(null); setMemo(""); setCustomDate("");
  };

  return (
    <div style={{ paddingBottom:120 }}>
      {receipt && (
        <ReceiptModal
          record={receipt.record}
          catName={receipt.catName}
          catIcon={receipt.catIcon}
          onClose={()=>setReceipt(null)}
        />
      )}
      {toast && (
        <div style={{ position:"fixed", top:24, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg, rgba(167,139,250,0.95), rgba(45,212,191,0.95))", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", color:DARK, borderRadius:99, padding:"12px 24px", fontSize:14, fontWeight:700, zIndex:999, whiteSpace:"nowrap", boxShadow:neuShadow(8) }}>
          {toast}
        </div>
      )}

      {/* Mode toggle — NO emoji */}
      <div style={{ display:"flex", gap:10, marginBottom:22 }}>
        {[["income","収入"],["expense","支出"]].map(([v,l])=>(
          <NeuBtn key={v} onClick={()=>{setMode(v);setStep("category");setSelectedCat(null);}} accent={mode===v} style={{ flex:1, textAlign:"center" }}>{l}</NeuBtn>
        ))}
      </div>

      {mode==="expense" && (
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {[["fixed","固定費"],["variable","変動費"]].map(([v,l])=>(
            <NeuBtn key={v} small onClick={()=>{setExpenseType(v);setStep("category");setSelectedCat(null);}} active={expenseType===v} style={{ flex:1, textAlign:"center", color:expenseType===v?TEAL2:GRAY }}>{l}</NeuBtn>
          ))}
        </div>
      )}

      {step==="category" ? (
        <>
          <div style={{ fontSize:10, color:GRAY, fontWeight:700, letterSpacing:"1.8px", marginBottom:14 }}>カテゴリを選択</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {cats.map(cat=><CatCard key={cat.id} cat={cat} onClick={()=>{setSelectedCat(cat);setStep("amount");}}/>)}
          </div>
        </>
      ) : (
        <>
          <button onClick={()=>setStep("category")} style={{ background:"none", border:"none", color:GRAY, fontSize:13, cursor:"pointer", marginBottom:6, padding:0, fontWeight:600, fontFamily:FONT }}>← 戻る</button>
          <div style={{ ...neuCard, padding:"8px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:12, borderRadius:16 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:selectedCat.color+"1A", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`3px 3px 8px rgba(163,177,198,0.4),-3px -3px 8px rgba(255,255,255,0.9)` }}>
              <Icon3D type={selectedCat.icon||"star"} size={30}/>
            </div>
            <div>
              <div style={{ fontSize:9, color:GRAY, fontWeight:700, letterSpacing:"1px" }}>{mode==="income"?"収入":expenseType==="fixed"?"固定費":"変動費"}</div>
              <div style={{ fontSize:16, fontWeight:800, color:DARK }}>{selectedCat.name}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:4 }}>
            {/* メモ */}
            <div style={{ ...neuInset(4), borderRadius:12, padding:"1px 4px", flex:1 }}>
              <input placeholder="メモをこちらに入力して下さい" value={memo} onChange={e=>setMemo(e.target.value)} style={{ width:"100%", padding:"8px 10px", background:"none", border:"none", outline:"none", fontSize:12, color:DARK, fontFamily:FONT, boxSizing:"border-box" }}/>
            </div>
            {/* 日付 */}
            <div style={{ ...neuInset(4), borderRadius:12, padding:"1px 4px", display:"flex", alignItems:"center" }}>
              <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                {!customDate && (
                  <div style={{ position:"absolute", left:10, fontSize:11, color:GRAY_L, pointerEvents:"none", letterSpacing:"0.5px", fontFamily:FONT }}>YYYY/MM/DD</div>
                )}
                <input type="date" value={customDate} onChange={e=>setCustomDate(e.target.value)}
                  style={{ padding:"8px 8px", background:"none", border:"none", outline:"none", fontSize:12, color:customDate?DARK:"transparent", fontFamily:FONT, cursor:"pointer", width:122 }}
                />
              </div>
            </div>
          </div>
          <Calculator onConfirm={handleConfirm}/>
        </>
      )}
    </div>
  );
}

// ─── Report Tab ─────────────────────────────────────────────────────────────
function ReportTab({ records, categories, monthKey, onMonthChange }) {
  const [selectedDay, setSelectedDay]   = useState(null);
  const [reportView, setReportView]     = useState("overview");
  const [expenseTab, setExpenseTab]     = useState("fixed"); // fixed | variable

  const allCats = [...categories.income, ...categories.fixed, ...categories.variable];
  const getCat  = id => allCats.find(c => c.id === id) || { name:"不明", icon:"star", color:"#94A3B8" };

  const monthRecs    = records.filter(r => getMonthKey(r.date) === monthKey);
  const totalIncome  = monthRecs.filter(r => r.type === "income").reduce((s,r) => s+r.amount, 0);
  const totalExpense = monthRecs.filter(r => r.type !== "income").reduce((s,r) => s+r.amount, 0);
  const balance      = totalIncome - totalExpense;
  const savingRate   = totalIncome > 0 ? Math.round(balance / totalIncome * 100) : 0;
  const isNow        = monthKey === currentMonthKey();

  // 固定費・変動費それぞれのpieData
  const makePieData = (type) => {
    const map = {};
    monthRecs.filter(r => r.type === type).forEach(r => {
      map[r.categoryId] = (map[r.categoryId] || 0) + r.amount;
    });
    return Object.entries(map).map(([id,value]) => {
      const cat = getCat(id);
      return { name:cat.name, value, color:cat.color, icon:cat.icon };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  };
  const fixedPieData    = makePieData("fixed");
  const variablePieData = makePieData("variable");
  const pieData = expenseTab === "fixed" ? fixedPieData : variablePieData;
  const fixedTotal    = monthRecs.filter(r=>r.type==="fixed").reduce((s,r)=>s+r.amount,0);
  const variableTotal = monthRecs.filter(r=>r.type==="variable").reduce((s,r)=>s+r.amount,0);
  const pieTotal = expenseTab === "fixed" ? fixedTotal : variableTotal;

  const lineData = [];
  for (let i = 5; i >= 0; i--) {
    const mk   = addMonths(monthKey, -i);
    const recs = records.filter(r => getMonthKey(r.date) === mk);
    const inc  = recs.filter(r => r.type==="income").reduce((s,r)=>s+r.amount,0);
    const exp  = recs.filter(r => r.type!=="income").reduce((s,r)=>s+r.amount,0);
    const [,m] = mk.split("-");
    lineData.push({ month:parseInt(m)+"月", income:inc, expense:exp });
  }

  // ── カレンダー用データ ──────────────────────────────────────────────────
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth   = new Date(year, month, 0).getDate();
  const firstDow      = new Date(year, month-1, 1).getDay(); // 0=Sun

  // 日別支出合計
  const dayExpMap = {};
  monthRecs.filter(r=>r.type!=="income").forEach(r=>{
    const d = parseInt(r.date.split("-")[2]);
    dayExpMap[d] = (dayExpMap[d]||0) + r.amount;
  });
  const dayIncMap = {};
  monthRecs.filter(r=>r.type==="income").forEach(r=>{
    const d = parseInt(r.date.split("-")[2]);
    dayIncMap[d] = (dayIncMap[d]||0) + r.amount;
  });
  const maxDayExp = Math.max(...Object.values(dayExpMap), 1);

  // 選択日のレコード
  const selectedDayRecs = selectedDay
    ? monthRecs.filter(r => parseInt(r.date.split("-")[2]) === selectedDay)
    : [];

  // ── 週次データ ──────────────────────────────────────────────────────────
  const weeks = [];
  let weekStart = 1;
  let weekNum = 1;
  while (weekStart <= daysInMonth) {
    const weekEnd = Math.min(weekStart + 6, daysInMonth);
    const recs = monthRecs.filter(r => {
      const d = parseInt(r.date.split("-")[2]);
      return d >= weekStart && d <= weekEnd;
    });
    const wInc = recs.filter(r=>r.type==="income").reduce((s,r)=>s+r.amount,0);
    const wExp = recs.filter(r=>r.type!=="income").reduce((s,r)=>s+r.amount,0);
    // カテゴリ別集計
    const wCatMap = {};
    recs.filter(r=>r.type!=="income").forEach(r=>{
      wCatMap[r.categoryId]=(wCatMap[r.categoryId]||0)+r.amount;
    });
    const wCats = Object.entries(wCatMap).map(([id,amt])=>({...getCat(id),amount:amt})).sort((a,b)=>b.amount-a.amount).slice(0,3);
    weeks.push({ num:weekNum, start:weekStart, end:weekEnd, income:wInc, expense:wExp, cats:wCats });
    weekStart += 7;
    weekNum++;
  }

  const srColor = savingRate >= 20 ? "#059669" : savingRate >= 10 ? TEAL2 : savingRate >= 0 ? "#F59E0B" : PINK;

  return (
    <div style={{ paddingBottom:110 }}>
      <style>{`
        @keyframes fillBar { from{width:0} to{width:var(--w)} }
        @keyframes countUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ringPop { from{transform:scale(0.85);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      {/* ── Month Nav ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22, padding:"0 2px" }}>
        <button onClick={()=>onMonthChange(addMonths(monthKey,-1))} style={{
          width:42, height:42, borderRadius:14, cursor:"pointer",
          background:GLASS_BG, backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
          border:GLASS_BORDER, fontSize:20, color:DARK, display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:neuShadow(4),
        }}>‹</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:900, color:DARKER, letterSpacing:"-0.5px" }}>{monthLabel(monthKey)}</div>
          <div style={{ fontSize:10, color:GRAY, letterSpacing:"1.5px", fontWeight:600, marginTop:2 }}>MONTHLY REPORT</div>
        </div>
        <button onClick={()=>!isNow&&onMonthChange(addMonths(monthKey,1))} style={{
          width:42, height:42, borderRadius:14, cursor:isNow?"default":"pointer",
          background:GLASS_BG, backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
          border:GLASS_BORDER, fontSize:20, color:isNow?"#CBD5E1":DARK, display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:neuShadow(4),
        }}>›</button>
      </div>

      {/* ── Hero Card: 収支バランス ── */}
      <div style={{
        borderRadius:28, marginBottom:16, overflow:"hidden", position:"relative",
        background:"linear-gradient(135deg, #F8F6FF 0%, #EEF4FF 50%, #F0FAFA 100%)",
        border:GLASS_BORDER,
        boxShadow:`12px 12px 36px rgba(180,190,220,0.4), -4px -4px 16px rgba(255,255,255,0.95)`,
        padding:"24px 22px 20px",
      }}>
        {/* Holographic accent stripe */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:4,
          background:HOLO_GRAD, backgroundSize:"300% 100%",
          animation:"holoShift 4s ease-in-out infinite",
        }}/>
        {/* 上段: 収入・支出 小さめ */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          {[
            { label:"収入", value:totalIncome,  color:"#059669", sign:"+", bg:"#F0FDF4" },
            { label:"支出", value:totalExpense, color:PINK,      sign:"−", bg:"#FFF0F6" },
          ].map(({label,value,color,sign,bg}) => (
            <div key={label} style={{
              background:bg, borderRadius:16, padding:"10px 14px",
              border:"1px solid rgba(200,215,230,0.5)",
            }}>
              <div style={{ fontSize:9, color:GRAY, fontWeight:700, letterSpacing:"1.5px", marginBottom:5, textTransform:"uppercase" }}>{label}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:3 }}>
                <span style={{ fontSize:14, fontWeight:800, color, fontVariantNumeric:"tabular-nums" }}>
                  {sign}{fmt(value).replace("¥","")}
                </span>
                <span style={{ fontSize:9, color, fontWeight:600 }}>円</span>
              </div>
            </div>
          ))}
        </div>

        {/* 中段: 収支 大きく */}
        <div style={{
          borderRadius:20, padding:"16px 18px", marginBottom:16,
          background: balance>=0
            ? "linear-gradient(135deg,#F0FDF4,#DCFCE7)"
            : "linear-gradient(135deg,#FFF0F6,#FCE7F3)",
          border:`1px solid ${balance>=0?"rgba(16,185,129,0.2)":"rgba(232,121,160,0.2)"}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div>
            <div style={{ fontSize:9, color:GRAY, fontWeight:700, letterSpacing:"1.5px", marginBottom:6, textTransform:"uppercase" }}>収支バランス</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <span style={{ fontSize:32, fontWeight:900, color:balance>=0?"#059669":PINK, letterSpacing:"-1.5px", fontVariantNumeric:"tabular-nums", lineHeight:1 }}>
                {balance>=0?"+":"−"}{fmt(Math.abs(balance)).replace("¥","")}
              </span>
              <span style={{ fontSize:13, color:balance>=0?"#059669":PINK, fontWeight:700 }}>円</span>
            </div>
          </div>
          {/* 貯蓄率 — %のみ大きく */}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:9, color:GRAY, fontWeight:700, letterSpacing:"1px", marginBottom:4 }}>貯蓄率</div>
            <div style={{
              fontSize:28, fontWeight:900, color:srColor, lineHeight:1,
              letterSpacing:"-1px",
              textShadow:`0 0 20px ${srColor}44`,
            }}>{savingRate}<span style={{ fontSize:14, fontWeight:700 }}>%</span></div>
            <div style={{ fontSize:9, color:srColor, fontWeight:700, marginTop:3 }}>
              {savingRate>=20?"◎ 優秀":savingRate>=10?"○ 良好":savingRate>=0?"△ 普通":"✕ 赤字"}
            </div>
          </div>
        </div>

        {/* 貯蓄率バー */}
        <div>
          <div style={{ borderRadius:99, height:8, background:"rgba(200,210,230,0.3)", overflow:"hidden", boxShadow:neuInsetShadow(3) }}>
            <div style={{
              height:"100%", borderRadius:99,
              background:`linear-gradient(90deg,${srColor}55,${srColor})`,
              width:`${Math.max(0,Math.min(100,savingRate))}%`,
              transition:"width 1.1s cubic-bezier(0.34,1.1,0.64,1)",
              boxShadow:`0 0 8px ${srColor}55`,
            }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ fontSize:9, color:GRAY_L }}>0%</span>
            <span style={{ fontSize:9, color:GRAY_L }}>目標 20%</span>
            <span style={{ fontSize:9, color:GRAY_L }}>100%</span>
          </div>
        </div>
      </div>

      {/* ── 支出内訳 Card ── */}
      <div style={{ ...neuCard, padding:"22px 20px 18px", marginBottom:16 }}>
        {/* Section header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:DARKER, letterSpacing:"-0.2px" }}>支出内訳</div>
            <div style={{ fontSize:10, color:GRAY, fontWeight:600, letterSpacing:"0.5px", marginTop:2 }}>BREAKDOWN BY CATEGORY</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:GRAY, fontWeight:600 }}>合計</div>
            <div style={{ fontSize:15, fontWeight:900, color:DARKER }}>{fmt(pieTotal)}</div>
          </div>
        </div>

        {/* 固定費 / 変動費 タブ */}
        <div style={{ display:"flex", gap:8, marginBottom:18 }}>
          {[["fixed","固定費",fixedTotal],["variable","変動費",variableTotal]].map(([v,l,total])=>(
            <button key={v} onClick={()=>setExpenseTab(v)} style={{
              flex:1, padding:"8px 0", borderRadius:12, border:"none", cursor:"pointer",
              fontFamily:FONT, fontSize:12, fontWeight:700,
              background: expenseTab===v ? NOISE_GRAD : "rgba(255,255,255,0.6)",
              color: expenseTab===v ? DARKER : GRAY,
              boxShadow: expenseTab===v ? neuShadow(3) : "none",
              transition:"all 0.18s ease",
            }}>
              {l}
              <span style={{ fontSize:10, marginLeft:4, fontWeight:600, opacity:0.7 }}>{fmt(total)}</span>
            </button>
          ))}
        </div>

        {pieData.length > 0 ? (<>
          {/* Donut — centered, large */}
          <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
            <div style={{ position:"relative", width:240, height:240, animation:"ringPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>
              <div style={{ position:"absolute", inset:0, borderRadius:"50%", ...neuInset(8) }}/>
              <ResponsiveContainer width={240} height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%"
                    innerRadius={76} outerRadius={110}
                    dataKey="value" paddingAngle={2}
                    startAngle={90} endAngle={-270}
                    strokeWidth={0}
                  >
                    {pieData.map((d,i) => (
                      <Cell key={i} fill={d.color}/>
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Centre text */}
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                <div style={{ fontSize:9, color:GRAY, fontWeight:700, letterSpacing:"1.5px", marginBottom:4 }}>
                  {expenseTab==="fixed"?"固定費":"変動費"}
                </div>
                <div style={{ fontSize:24, fontWeight:900, color:DARKER, letterSpacing:"-1px", lineHeight:1, fontVariantNumeric:"tabular-nums" }}>
                  {fmt(pieTotal).replace("¥","")}
                </div>
                <div style={{ fontSize:10, color:GRAY, fontWeight:600, marginTop:3 }}>円</div>
              </div>
            </div>
          </div>

          {/* Legend rows */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {pieData.map((d,i) => {
              const pct = pieTotal ? Math.round(d.value/pieTotal*100) : 0;
              return (
                <div key={d.name} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {/* Icon badge */}
                  <div style={{
                    width:34, height:34, borderRadius:10, flexShrink:0,
                    background:d.color+"18",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:`2px 2px 6px rgba(180,190,220,0.4), -2px -2px 6px rgba(255,255,255,0.9)`,
                  }}>
                    <Icon3D type={d.icon||"star"} size={22}/>
                  </div>
                  {/* Bar + text */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:DARKER }}>{d.name}</span>
                      <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
                        <span style={{ fontSize:10, color:GRAY_L, fontWeight:600 }}>{pct}%</span>
                        <span style={{ fontSize:13, fontWeight:800, color:d.color }}>{fmt(d.value)}</span>
                      </div>
                    </div>
                    <div style={{ borderRadius:99, height:6, background:"rgba(200,210,230,0.3)", overflow:"hidden" }}>
                      <div style={{
                        height:"100%", borderRadius:99,
                        background:`linear-gradient(90deg, ${d.color}77, ${d.color})`,
                        width:`${pct}%`,
                        transition:`width 0.8s cubic-bezier(0.34,1.1,0.64,1) ${i*0.06}s`,
                        boxShadow:`0 0 6px ${d.color}44`,
                      }}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>) : (
          <div style={{ textAlign:"center", color:GRAY, padding:"32px 0", fontSize:13 }}>
            {expenseTab==="fixed"?"固定費":"変動費"}の記録がありません
          </div>
        )}
      </div>

      {/* ── 月別推移 Card ── */}
      <div style={{ ...neuCard, padding:"22px 20px 18px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:DARKER, letterSpacing:"-0.2px" }}>月別推移</div>
            <div style={{ fontSize:10, color:GRAY, fontWeight:600, letterSpacing:"0.5px", marginTop:2 }}>LAST 6 MONTHS</div>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            {[{label:"収入",color:"#059669"},{label:"支出",color:PINK}].map(d=>(
              <div key={d.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:24, height:3, borderRadius:99, background:d.color, boxShadow:`0 0 6px ${d.color}66` }}/>
                <span style={{ fontSize:10, color:GRAY, fontWeight:600 }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={lineData} margin={{left:4,right:4,top:8,bottom:0}}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#059669" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E879A0" stopOpacity="0.20"/>
                <stop offset="100%" stopColor="#E879A0" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{fontSize:10,fill:GRAY}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip
              formatter={v=>fmt(v)}
              contentStyle={{
                background:"rgba(255,255,255,0.92)", border:"1px solid rgba(200,210,230,0.6)",
                borderRadius:14, color:DARK, backdropFilter:"blur(16px)",
                boxShadow:"0 8px 24px rgba(180,190,220,0.35)",
                fontSize:12, fontFamily:FONT,
              }}
              cursor={{ stroke:"rgba(180,190,220,0.4)", strokeWidth:1.5 }}
            />
            <Line type="monotone" dataKey="income" stroke="#059669" strokeWidth={2.5}
              dot={{ r:4, fill:"#059669", strokeWidth:2, stroke:WHITE }}
              activeDot={{ r:6, fill:"#059669", stroke:WHITE, strokeWidth:2 }}
              name="収入"
            />
            <Line type="monotone" dataKey="expense" stroke={PINK} strokeWidth={2.5}
              dot={{ r:4, fill:PINK, strokeWidth:2, stroke:WHITE }}
              activeDot={{ r:6, fill:PINK, stroke:WHITE, strokeWidth:2 }}
              name="支出"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── カレンダー Card ── */}
      <div style={{ ...neuCard, padding:"22px 20px 18px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:DARKER, letterSpacing:"-0.2px" }}>カレンダー</div>
            <div style={{ fontSize:10, color:GRAY, fontWeight:600, letterSpacing:"0.5px", marginTop:2 }}>DAILY VIEW</div>
          </div>
          {selectedDay && (
            <button onClick={()=>setSelectedDay(null)} style={{ background:"none", border:"none", color:GRAY, cursor:"pointer", fontSize:12, fontFamily:FONT }}>× 閉じる</button>
          )}
        </div>
        {/* 曜日ヘッダー */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
          {["日","月","火","水","木","金","土"].map((d,i)=>(
            <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:i===0?"#E879A0":i===6?"#3B82F6":GRAY, paddingBottom:4 }}>{d}</div>
          ))}
        </div>
        {/* カレンダーグリッド */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
          {/* 空白セル */}
          {Array.from({length:firstDow}).map((_,i)=>(
            <div key={"empty"+i}/>
          ))}
          {/* 日付セル */}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const day = i+1;
            const exp = dayExpMap[day]||0;
            const inc = dayIncMap[day]||0;
            const hasData = exp>0||inc>0;
            const isSelected = selectedDay===day;
            const intensity = exp>0 ? Math.min(exp/maxDayExp,1) : 0;
            const dow = (firstDow+i)%7;
            return (
              <button key={day} onClick={()=>setSelectedDay(isSelected?null:day)} style={{
                aspectRatio:"1", borderRadius:10, border:"none", cursor:hasData?"pointer":"default",
                background: isSelected
                  ? `linear-gradient(135deg,${TEAL}44,${PINK}33)`
                  : hasData ? `rgba(232,121,160,${0.08+intensity*0.22})` : "transparent",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                boxShadow: isSelected ? neuShadow(3) : "none",
                transition:"all 0.15s ease", padding:"2px 0",
              }}>
                <div style={{
                  fontSize:11, fontWeight: isSelected?800:hasData?700:500,
                  color: isSelected?PINK : dow===0?"#E879A0":dow===6?"#3B82F6":DARK,
                  lineHeight:1.2,
                }}>{day}</div>
                {exp>0 && (
                  <div style={{ fontSize:8, color:PINK, fontWeight:700, letterSpacing:"-0.3px" }}>
                    {exp>=10000?`${Math.round(exp/1000)}k`:exp>=1000?`${Math.round(exp/100)/10}k`:exp}
                  </div>
                )}
                {inc>0 && (
                  <div style={{ width:4, height:4, borderRadius:99, background:"#059669", marginTop:1 }}/>
                )}
              </button>
            );
          })}
        </div>

        {/* 選択日の内訳 */}
        {selectedDay && selectedDayRecs.length > 0 && (
          <div style={{ marginTop:16, borderTop:"1px solid rgba(200,210,230,0.4)", paddingTop:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:DARK, marginBottom:10, letterSpacing:"0.5px" }}>
              {month}月{selectedDay}日の内訳
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {selectedDayRecs.map(r=>{
                const cat=getCat(r.categoryId);
                const isInc=r.type==="income";
                return (
                  <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:cat.color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon3D type={cat.icon||"star"} size={20}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:DARKER }}>{cat.name}</div>
                      {r.memo && <div style={{ fontSize:10, color:GRAY }}>{r.memo}</div>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:800, color:isInc?"#059669":PINK }}>
                      {isInc?"+":"−"}{fmt(Math.abs(r.amount))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:10, paddingTop:8, borderTop:"1px dashed rgba(200,210,230,0.4)", display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:11, color:GRAY, fontWeight:600 }}>支出合計</span>
              <span style={{ fontSize:13, fontWeight:800, color:PINK }}>{fmt(selectedDayRecs.filter(r=>r.type!=="income").reduce((s,r)=>s+r.amount,0))}</span>
            </div>
          </div>
        )}
        {selectedDay && selectedDayRecs.length === 0 && (
          <div style={{ marginTop:14, textAlign:"center", color:GRAY, fontSize:12, paddingTop:12, borderTop:"1px solid rgba(200,210,230,0.4)" }}>
            {month}月{selectedDay}日の記録はありません
          </div>
        )}
      </div>

      {/* ── ウィークリー集計 Card ── */}
      <div style={{ ...neuCard, padding:"22px 20px 18px" }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:800, color:DARKER, letterSpacing:"-0.2px" }}>週次集計</div>
          <div style={{ fontSize:10, color:GRAY, fontWeight:600, letterSpacing:"0.5px", marginTop:2 }}>WEEKLY SUMMARY</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {weeks.map(w=>(
            <div key={w.num} style={{
              borderRadius:16, padding:"14px 16px",
              background:"linear-gradient(135deg,#F8F6FF,#F0F8FF)",
              border:"1px solid rgba(200,210,230,0.5)",
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div>
                  <span style={{ fontSize:11, fontWeight:800, color:TEAL2 }}>第{w.num}週</span>
                  <span style={{ fontSize:10, color:GRAY, marginLeft:6 }}>{month}/{w.start} 〜 {month}/{w.end}</span>
                </div>
                <div style={{ textAlign:"right" }}>
                  {w.income>0 && <div style={{ fontSize:11, color:"#059669", fontWeight:700 }}>+{fmt(w.income)}</div>}
                  <div style={{ fontSize:13, fontWeight:800, color:PINK }}>−{fmt(w.expense)}</div>
                </div>
              </div>
              {/* 週内カテゴリトップ3 */}
              {w.cats.length>0 && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {w.cats.map(cat=>(
                    <div key={cat.id} style={{
                      display:"flex", alignItems:"center", gap:5,
                      background:cat.color+"18", borderRadius:99, padding:"4px 10px",
                    }}>
                      <Icon3D type={cat.icon||"star"} size={14}/>
                      <span style={{ fontSize:10, fontWeight:700, color:DARK }}>{cat.name}</span>
                      <span style={{ fontSize:10, color:cat.color, fontWeight:800 }}>{fmt(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* 週次バー */}
              {w.expense>0 && (
                <div style={{ marginTop:10, borderRadius:99, height:5, background:"rgba(200,210,230,0.3)", overflow:"hidden" }}>
                  <div style={{
                    height:"100%", borderRadius:99,
                    background:`linear-gradient(90deg,${PINK}66,${PINK})`,
                    width:`${Math.min(100,Math.round(w.expense/totalExpense*100))}%`,
                    transition:"width 0.8s ease",
                  }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
// ─── History Tab ─────────────────────────────────────────────────────────────
function HistoryTab({ records, categories, monthKey, onDelete }) {
  const [filter,setFilter]=useState("all");
  const allCats=[...categories.income,...categories.fixed,...categories.variable];
  const getCat=id=>allCats.find(c=>c.id===id)||{name:"不明",icon:"star",color:GRAY};
  const monthRecs=records.filter(r=>getMonthKey(r.date)===monthKey).filter(r=>filter==="all"||(filter==="income"?r.type==="income":r.type!=="income")).sort((a,b)=>b.date.localeCompare(a.date));

  return (
    <div style={{ paddingBottom:110 }}>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {[["all","すべて"],["income","収入"],["expense","支出"]].map(([v,l])=>(
          <NeuBtn key={v} small onClick={()=>setFilter(v)} accent={filter===v} style={{ flex:1, textAlign:"center" }}>{l}</NeuBtn>
        ))}
      </div>
      {monthRecs.length===0 ? (
        <div style={{ textAlign:"center", color:GRAY, padding:"60px 0" }}>
          <div style={{ fontSize:50, marginBottom:14 }}>📭</div>
          <div style={{ fontSize:14, fontWeight:600, color:GRAY }}>記録がありません</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {monthRecs.map(r=>{
            const cat=getCat(r.categoryId); const isIncome=r.type==="income";
            return (
              <div key={r.id} style={{ ...neuCard, display:"flex", alignItems:"center", gap:12, padding:"14px 16px" }}>
                <div style={{ width:46, height:46, borderRadius:14, background:cat.color+"1A", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`3px 3px 8px rgba(163,177,198,0.4),-3px -3px 8px rgba(255,255,255,0.9)` }}>
                  <Icon3D type={cat.icon||"star"} size={30}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:DARK }}>{cat.name}</div>
                  <div style={{ fontSize:11, color:GRAY_L, marginTop:2 }}>{r.date}{r.memo?` · ${r.memo}`:""}</div>
                </div>
                <div style={{ fontWeight:800, fontSize:15, color:isIncome?"#059669":DARKER }}>{isIncome?"+":"−"}{fmt(r.amount)}</div>
                <button onClick={()=>onDelete(r.id)} style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", borderRadius:10, width:32, height:32, cursor:"pointer", color:PINK, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────────────────────
function SettingsTab({ categories, setCategories }) {
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingCat,   setEditingCat]   = useState(null); // {gkey, cat} for icon edit
  const [newName,      setNewName]      = useState("");
  const [newIcon,      setNewIcon]      = useState("star");
  const [selectedColor,setSelectedColor]= useState("#2DD4BF");
  const COLORS=["#F472B6","#2DD4BF","#34D399","#FBBF24","#A78BFA","#FB923C","#38BDF8","#F87171","#60A5FA","#C084FC","#10B981","#E879A0"];

  const groups=[{key:"income",label:"収入カテゴリ"},{key:"fixed",label:"固定費カテゴリ"},{key:"variable",label:"変動費カテゴリ"}];

  const addCat = gk => {
    if(!newName.trim()) return;
    setCategories(prev=>({...prev,[gk]:[...prev[gk],{id:gk+"_"+Date.now(),name:newName.trim(),icon:newIcon,color:selectedColor}]}));
    setNewName(""); setEditingGroup(null);
  };
  const deleteCat = (gk,id) => setCategories(prev=>({...prev,[gk]:prev[gk].filter(c=>c.id!==id)}));
  const updateCatIcon = (gk, id, icon) => {
    setCategories(prev=>({...prev,[gk]:prev[gk].map(c=>c.id===id?{...c,icon}:c)}));
  };
  const updateCatColor = (gk, id, color) => {
    setCategories(prev=>({...prev,[gk]:prev[gk].map(c=>c.id===id?{...c,color}:c)}));
    // リアルタイムプレビュー：editingCat も更新
    setEditingCat(prev => prev && prev.cat.id===id ? {...prev, cat:{...prev.cat, color}} : prev);
  };
  const updateCatIconLive = (gk, id, icon) => {
    setCategories(prev=>({...prev,[gk]:prev[gk].map(c=>c.id===id?{...c,icon}:c)}));
    setEditingCat(prev => prev && prev.cat.id===id ? {...prev, cat:{...prev.cat, icon}} : prev);
  };

  return (
    <div style={{ paddingBottom:110 }}>
      {/* Icon edit modal */}
      {editingCat && (
        <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(230,234,248,0.88)", backdropFilter:"blur(20px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ ...neuCard, width:"100%", maxWidth:420, padding:"24px 20px" }}>
            {/* リアルタイムプレビュー */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18, padding:"14px 16px", borderRadius:16, background:BG2, boxShadow:neuInsetShadow(4) }}>
              <div style={{ width:56, height:56, borderRadius:18, background:editingCat.cat.color+"22", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`4px 4px 10px rgba(163,177,198,0.4),-4px -4px 10px rgba(255,255,255,0.9)`, transition:"background 0.2s ease", flexShrink:0 }}>
                <Icon3D type={editingCat.cat.icon||"star"} size={38}/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:800, color:DARKER }}>{editingCat.cat.name}</div>
                <div style={{ fontSize:11, color:editingCat.cat.color, fontWeight:700, marginTop:2, transition:"color 0.2s" }}>● {editingCat.cat.color}</div>
              </div>
            </div>
            <div style={{ fontSize:10, color:GRAY, fontWeight:700, letterSpacing:"1.5px", marginBottom:10 }}>アイコン</div>
            <IconPicker value={editingCat.cat.icon} onChange={icon=>updateCatIconLive(editingCat.gkey,editingCat.cat.id,icon)}/>
            <div style={{ fontSize:10, color:GRAY, fontWeight:700, letterSpacing:"1.5px", margin:"14px 0 10px" }}>カラー</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:4 }}>
              {COLORS.map(col=>(
                <div key={col} onClick={()=>updateCatColor(editingCat.gkey,editingCat.cat.id,col)}
                  style={{ width:32, height:32, borderRadius:99, background:col, cursor:"pointer",
                    transform: editingCat.cat.color===col ? "scale(1.25)" : "scale(1)",
                    boxShadow: editingCat.cat.color===col
                      ? `0 0 0 3px ${BG}, 0 0 0 5px ${col}, 3px 3px 8px rgba(163,177,198,0.4)`
                      : neuShadow(2),
                    transition:"transform 0.15s ease, box-shadow 0.15s ease",
                  }}/>
              ))}
            </div>
            <NeuBtn accent onClick={()=>setEditingCat(null)} style={{ width:"100%", textAlign:"center" }}>完了</NeuBtn>
          </div>
        </div>
      )}

      {groups.map(({key,label})=>(
        <div key={key} style={{ ...neuCard, marginBottom:16, padding:"20px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:GRAY, marginBottom:14, letterSpacing:"1px" }}>{label}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {categories[key].map(cat=>(
              <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <button onClick={()=>setEditingCat({gkey:key,cat})} style={{ width:42, height:42, borderRadius:13, background:cat.color+"1A", display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", flexShrink:0, boxShadow:`3px 3px 7px rgba(163,177,198,0.4),-3px -3px 7px rgba(255,255,255,0.9)` }}>
                  <Icon3D type={cat.icon||"star"} size={28}/>
                </button>
                <div style={{ flex:1, fontSize:13, fontWeight:600, color:DARK }}>{cat.name}</div>
                <div style={{ width:10, height:10, borderRadius:99, background:cat.color, flexShrink:0 }}/>
                <button onClick={()=>setEditingCat({gkey:key,cat})} style={{ background:BG, border:"none", borderRadius:9, padding:"5px 10px", cursor:"pointer", color:TEAL2, fontSize:11, fontWeight:700, boxShadow:neuShadow(3) }}>編集</button>
                <button onClick={()=>deleteCat(key,cat.id)} style={{ background:BG, border:"none", borderRadius:9, width:28, height:28, cursor:"pointer", color:PINK, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:neuShadow(3) }}>✕</button>
              </div>
            ))}
          </div>

          {editingGroup===key ? (
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:11, color:GRAY, fontWeight:700, letterSpacing:"1px", marginBottom:10 }}>アイコンを選択</div>
              <IconPicker value={newIcon} onChange={setNewIcon}/>
              <div style={{ ...neuInset(4), borderRadius:10, padding:"2px 4px", margin:"12px 0 10px" }}>
                <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="カテゴリ名" style={{ width:"100%", padding:"10px 12px", background:"none", border:"none", outline:"none", fontSize:14, color:DARK, fontFamily:FONT, boxSizing:"border-box" }}/>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                {COLORS.map(c=><div key={c} onClick={()=>setSelectedColor(c)} style={{ width:22,height:22,borderRadius:99,background:c,cursor:"pointer",boxShadow:selectedColor===c?`0 0 0 3px ${BG},0 0 0 5px ${c},${neuShadow(2)}`:neuShadow(2) }}/>)}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <NeuBtn small onClick={()=>setEditingGroup(null)} style={{ flex:1, textAlign:"center" }}>キャンセル</NeuBtn>
                <NeuBtn small onClick={()=>addCat(key)} accent style={{ flex:2, textAlign:"center" }}>追加する</NeuBtn>
              </div>
            </div>
          ) : (
            <button onClick={()=>{setEditingGroup(key);setNewName("");setNewIcon("star");}} style={{ width:"100%", padding:"12px", borderRadius:12, marginTop:14, background:"none", border:`1.5px dashed rgba(148,163,184,0.5)`, cursor:"pointer", color:GRAY, fontSize:13, fontWeight:600, fontFamily:FONT }}>＋ カテゴリを追加</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [tab,        setTab]        = useState("input");
  const [monthKey,   setMonthKey]   = useState(currentMonthKey());

  // ── カテゴリバージョン：変更時にlocalStorageを強制リセット ──────────
  const CATEGORY_VERSION = "v7-sasami"; // categories updated
 // ← カテゴリ変更のたびに番号を上げる
  // ── カテゴリのマージ更新（ユーザーのカスタムを消さずに新カテゴリを追加）──
  const storedVersion = (() => { try { return localStorage.getItem("kakeibo_cat_version"); } catch { return null; } })();
  if (storedVersion !== CATEGORY_VERSION) {
    try {
      const savedCats = localStorage.getItem("kakeibo_categories");
      if (savedCats) {
        // 既存データにデフォルトの新カテゴリをマージ
        const existing = JSON.parse(savedCats);
        const merged = { ...existing };
        // 各グループ（income/fixed/variable）について
        ["income","fixed","variable"].forEach(group => {
          const existingIds = new Set((existing[group]||[]).map(c=>c.id));
          const newCats = (DEFAULT_CATEGORIES[group]||[]).filter(c=>!existingIds.has(c.id));
          if (newCats.length > 0) {
            merged[group] = [...(existing[group]||[]), ...newCats];
          }
        });
        localStorage.setItem("kakeibo_categories", JSON.stringify(merged));
      }
      // バージョンだけ更新（データは消さない）
      localStorage.setItem("kakeibo_cat_version", CATEGORY_VERSION);
    } catch {}
  }

  // ── 自動保存：localStorage から復元 ──────────────────────────────────
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem("kakeibo_records");
      return saved ? JSON.parse(saved) : SAMPLE_RECORDS;
    } catch { return SAMPLE_RECORDS; }
  });
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("kakeibo_categories");
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch { return DEFAULT_CATEGORIES; }
  });

  // ── 変更のたびに自動保存 ─────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem("kakeibo_records", JSON.stringify(records)); } catch {}
  }, [records]);
  useEffect(() => {
    try { localStorage.setItem("kakeibo_categories", JSON.stringify(categories)); } catch {}
  }, [categories]);

  const addRecord    = useCallback(r=>setRecords(p=>[r,...p]),[]);
  const deleteRecord = useCallback(id=>setRecords(p=>p.filter(r=>r.id!==id)),[]);

  const tabs = [
    { id:"input",    label:"入力",    icon:<Icon3D type="pencil" size={22}/> },
    { id:"report",   label:"レポート",icon:<Icon3D type="chart"  size={22}/> },
    { id:"history",  label:"履歴",    icon:<Icon3D type="list"   size={22}/> },
    { id:"settings", label:"設定",    icon:<Icon3D type="gear"   size={22}/> },
  ];

  return (
    <div style={{ minHeight:"100vh", background:BG_GRAD, fontFamily:FONT, position:"relative", overflow:"hidden", color:DARK }}>
      {/* Blob decorations — like reference image */}
      <div style={blobStyle("2%","55%","320px","#C7B8FF",0.18)}/>
      <div style={blobStyle("35%","-10%","260px","#BAE6FD",0.16)}/>
      <div style={blobStyle("60%","50%","240px","#A7F3D0",0.14)}/>
      <div style={blobStyle("78%","-6%","180px","#FDE68A",0.14)}/>
      <div style={blobStyle("15%","30%","160px","#FECDD3",0.13)}/>
      <style>{`
        @keyframes blobFloat {
          0%   { transform: translate(0,0) scale(1)     rotate(0deg); }
          33%  { transform: translate(12px,-18px) scale(1.06) rotate(8deg); }
          66%  { transform: translate(-8px,10px) scale(0.96) rotate(-5deg); }
          100% { transform: translate(6px,-8px) scale(1.03)  rotate(3deg); }
        }
      `}</style>

      {!splashDone && <Splash onDone={()=>setSplashDone(true)}/>}

      {/* Month header (only on report/history) */}
      {(tab==="report"||tab==="history") && (
        <div style={{ background:"rgba(240,242,250,0.9)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.9)", padding:"20px 24px 14px", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ fontSize:22, fontWeight:900, color:DARKER, letterSpacing:"-0.5px" }}>{monthLabel(monthKey)}</div>
        </div>
      )}

      {/* Content */}
      <div style={{ position:"relative", zIndex:1, padding:"20px 20px 0" }}>
        {tab==="input"    && <InputTab    categories={categories} onAdd={addRecord}/>}
        {tab==="report"   && <ReportTab   records={records} categories={categories} monthKey={monthKey} onMonthChange={setMonthKey}/>}
        {tab==="history"  && <HistoryTab  records={records} categories={categories} monthKey={monthKey} onDelete={deleteRecord}/>}
        {tab==="settings" && <SettingsTab categories={categories} setCategories={setCategories}/>}
      </div>

      {/* Bottom nav — frosted glass */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:100,
        background:"rgba(240,242,250,0.88)",
        backdropFilter:"blur(24px) saturate(1.6)",
        WebkitBackdropFilter:"blur(24px) saturate(1.6)",
        borderTop:"1px solid rgba(255,255,255,0.95)",
        borderRadius:"18px 18px 0 0",
        padding:"8px 4px 16px",
        display:"flex", justifyContent:"space-around",
        boxShadow:"0 -4px 24px rgba(180,190,220,0.35)",
      }}>
        {tabs.map(({id,label,icon})=>{
          const active=tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", cursor:"pointer", padding:"4px 12px", fontFamily:FONT }}>
              <div style={{
                width:44, height:44, borderRadius:14,
                display:"flex", alignItems:"center", justifyContent:"center",
                background: active ? WHITE : "rgba(255,255,255,0.6)",
                border: active ? `1.5px solid rgba(45,212,191,0.5)` : "1px solid rgba(200,210,230,0.6)",
                boxShadow: active ? neuShadow(3) : "none",
                transition:"all 0.22s ease",
              }}>
                {icon}
              </div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.5px", color: active ? TEAL2 : GRAY, transition:"color 0.2s" }}>{label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
