// app/lib/iconRules.ts — reference constants, import wherever icons are used

export const ICON_STROKE_WIDTH = 1.5;

export const ICON_SIZES = {
  inline: 16, // inline with text (metadata rows, tags)
  action: 20, // buttons, nav items, form controls
  section: 24, // section headers, hero elements
} as const;

// Semantic color helper classes:
// Icons default to currentColor — never hardcode a fill/stroke color.
// The ONLY icons permitted to carry semantic color:
//   - BadgeCheck (verified)      -> text-[#0E9F6E] (emerald)
//   - AlertTriangle (warning)    -> text-[#D97B0A] / text-amber-500 (amber)
//   - CircleX / XCircle (error)  -> text-[#D9534F] / text-red-500 (coral)
//   - Crown (founder badge)      -> text-amber-500 / text-[#2B4EE6] (distinct founder accent)
// Every other icon: color inherits from its surrounding text (ink navy / slate grey).
