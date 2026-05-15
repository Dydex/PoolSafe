---
name: Emerald Protocol
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#404944'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#707974'
  outline-variant: '#bfc9c3'
  surface-tint: '#2b6954'
  primary: '#003527'
  on-primary: '#ffffff'
  primary-container: '#064e3b'
  on-primary-container: '#80bea6'
  inverse-primary: '#95d3ba'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#4f1f19'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b342d'
  on-tertiary-container: '#ea9e93'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b0f0d6'
  primary-fixed-dim: '#95d3ba'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#0b513d'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4a9'
  on-tertiary-fixed: '#380d08'
  on-tertiary-fixed-variant: '#6e372f'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 40px
  gutter: 20px
---

## Brand & Style
The brand personality is rooted in institutional-grade reliability and cryptographic transparency. It targets sophisticated DeFi users and risk managers who prioritize clarity over hype. The design style is **Modern Corporate Minimalism** with subtle **Glassmorphism** accents.

The interface should feel architectural and calm, using generous whitespace to reduce the cognitive load associated with complex risk data. The visual narrative emphasizes "The Safety of the Pool" through stable, structured layouts and high-clarity data visualization. It avoids flashy gradients in favor of solid, meaningful color applications and refined textures.

## Colors
The palette is dominated by a range of neutral grays and off-whites to establish a clean, surgical environment. 
- **Primary:** A Deep Emerald Green (#064E3B) is used for core branding, primary actions, and representing "Protected" status. 
- **Secondary:** A lighter Mint Green (#10B981) serves as a success indicator and accent for growth metrics.
- **Neutrals:** A spectrum of Cool Grays manages the information hierarchy, with Slate-900 for primary text and Gray-500 for secondary metadata.
- **Functional:** Transparent tints of the primary emerald are used for highlighting active states without overwhelming the layout.

## Typography
This design system utilizes **Inter** for all applications to ensure maximum legibility in data-dense environments. 

The typographic hierarchy relies on weight and spacing rather than drastic size changes. For financial figures and wallet addresses, enable "tabular numerals" (tnum) to ensure columns of numbers align perfectly. Use the `label-caps` style for table headers and small metadata tags to differentiate them from actionable body text.

## Layout & Spacing
The layout follows a **Fixed 12-Column Grid** for the main content area (max-width: 1280px) to ensure consistency across high-resolution displays. 

A strict 4px baseline shift is applied to all spacing decisions. Large dashboard modules should be separated by `xl` (32px) spacing to maintain the "minimalist" feel, while internal card elements should use `md` (16px) or `sm` (12px) padding. Generous side margins of `container-padding` ensure the content feels centered and prestigious.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Ambient Shadows**. 
1. **Base Layer:** The background uses a soft off-white (#F9FAFB).
2. **Surface Layer:** Main cards use a pure white background with a 1px border (#E5E7EB) and a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.03)).
3. **Overlay Layer:** Modals and tooltips utilize a glassmorphic effect with a 12px backdrop blur and 80% opacity white fill, edged with a subtle inner highlight to simulate a glass rim.

Avoid high-contrast black shadows; instead, use shadows tinted with a hint of the primary emerald or neutral slate to keep the UI feeling organic.

## Shapes
The shape language is defined by **Soft Geometric** forms. 
- **Standard Elements:** Buttons and input fields use an 8px radius.
- **Main Containers:** Dashboard cards and modular blocks use a 12px or 16px radius (`rounded-lg` or `rounded-xl`) to create a welcoming, professional aesthetic.
- **Status Indicators:** Pills and badges should be fully rounded (9999px) to distinguish them from structural elements.

## Components
- **Buttons:** Primary buttons use the Deep Emerald fill with white text. Secondary buttons use a transparent background with a 1px slate border.
- **Cards:** White containers with 12px radius. Content is separated by thin 1px horizontal dividers (#F3F4F6) rather than heavy borders.
- **Status Indicators:** For claims, use a "dot + label" system. A pulsing emerald dot for "Active," a gold dot for "Pending Review," and a slate dot for "Closed."
- **Data Tables:** High-density with `body-sm` text. Use alternating row highlights only on hover to maintain cleanliness.
- **Glass Overlays:** Used for "Transaction Pending" states, blurring the background to focus user attention on the cryptographic confirmation.
- **Input Fields:** Minimalist design with a focus on the active state; when focused, the border color shifts to the primary emerald with a subtle 2px outer glow.