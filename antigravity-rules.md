# Antigravity Agent UI/UX Guidelines

This ruleset forces Antigravity Browser-in-the-Loop Agents to bypass generic, cliché AI-generated designs ("AI Slop") and build premium, human-grade, production-ready interfaces.

## ❌ Prompt Bans (Forbidden AI Patterns)
- **Colors:** No default purple, indigo, or bright violet primary color schemes. No heavy, saturated gradient backgrounds.
- **Typography:** Do not use `Inter` or `Roboto`. Avoid generic 14px text sizes everywhere.
- **Layouts:** Never generate the classic 3-card grid feature section or center-aligned hero page template.
- **Components:** Avoid unstyled `<button>` tags, heavy stark `box-shadow` values, and unpadded input boxes.

## ✅ Design System Requirements
- **Typography:** Inject a premium typography engine. Use `Geist Sans`, `Plus Jakarta Sans`, or `Satoshi` for headers, and a highly readable monospaced font like `Geist Mono` or `SF Mono` for technical data elements.
- **Color Palette:** Adopt a high-contrast minimalist or clean industrial aesthetic (zinc, slate, or monochromatic bases). Use a maximum of **one** vibrant accent color (e.g., emerald green, safety orange, or cobalt blue) strictly for primary call-to-actions.
- **Spacing & Layout:** Prioritize negative space. Increase padding scales globally (use `p-8` / `gap-6` over `p-4` / `gap-4`). Use asymmetric grids and clean multi-layered layouts.
- **Borders & Radius:** Prefer ultra-sharp corners (`rounded-none` or `rounded-sm`) or soft, highly precise pill shapes depending on the theme. Maintain minimal, thin `border-zinc-200/50` or dark-mode equivalents.

## 🤖 Browser-in-the-Loop Instructions
1. Run a headless browser instance after every significant layout modification.
2. Inspect for visual layout shifts, lack of hierarchy, or cramped elements.
3. If an element looks reminiscent of standard bootstrap templates, automatically refactor using utility classes from the configured component library (e.g., Shadcn UI).