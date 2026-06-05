# AgentMark Design System Documentation

## Design Philosophy

**"Dark Luxury Tech"** — A premium AI SaaS aesthetic combining deep dark backgrounds, sharp white text, electric accent colors, and surgical precision in spacing. Zero clutter. Every element should feel expensive and intentional.

---

## Color Palette

### CSS Variables (Add to `index.css`)

```css
:root {
  /* Backgrounds */
  --bg-base: #0A0A0F;           /* deepest background — page root */
  --bg-surface: #111118;        /* cards, panels */
  --bg-elevated: #1A1A24;       /* modals, dropdowns, hover states */
  --bg-border: #2A2A38;         /* all borders */

  /* Brand Accent — Electric Indigo */
  --accent-primary: #6366F1;    /* primary buttons, active states, links */
  --accent-primary-hover: #4F46E5;
  --accent-glow: rgba(99, 102, 241, 0.15);

  /* Secondary Accents */
  --accent-success: #10B981;
  --accent-success-bg: rgba(16, 185, 129, 0.1);
  --accent-warning: #F59E0B;
  --accent-warning-bg: rgba(245, 158, 11, 0.1);
  --accent-danger: #F43F5E;
  --accent-danger-bg: rgba(244, 63, 94, 0.1);

  /* Text */
  --text-primary: #F1F1F3;      /* headings, important content */
  --text-secondary: #8B8B9E;    /* subtext, labels, descriptions */
  --text-muted: #4A4A5E;        /* placeholders, disabled */
  --text-inverse: #0A0A0F;      /* text on bright buttons */

  /* Agent Status Colors */
  --status-pending: #4A4A5E;
  --status-running: #6366F1;
  --status-completed: #10B981;
  --status-failed: #F43F5E;
  --status-retrying: #F59E0B;
}
```

### Tailwind Config Extension

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        base: '#0A0A0F',
        surface: '#111118',
        elevated: '#1A1A24',
        border: '#2A2A38',
        accent: '#6366F1',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#F43F5E',
      },
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-dot': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
      }
    }
  }
}
```

---

## Typography

### Font Setup

**Add to `index.html` `<head>`:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Add to `index.css`:**

```css
* { 
  font-family: 'Sora', sans-serif; 
}

code, pre, .mono { 
  font-family: 'JetBrains Mono', monospace; 
}
```

### Type Scale

| Use Case | Font | Weight | Size | Tailwind Class |
|----------|------|--------|------|----------------|
| Page title / Hero H1 | Sora | 700 | 72px / 48px (mobile) | `text-7xl md:text-5xl font-bold` |
| Page heading H1 | Sora | 700 | 28px | `text-[28px] font-bold` |
| Section heading H2 | Sora | 600 | 18px | `text-lg font-semibold` |
| Card title H3 | Sora | 600 | 16px | `text-base font-semibold` |
| Body text | Sora | 400 | 14px | `text-sm` |
| Small text / Labels | Sora | 400 | 13px | `text-[13px]` |
| Captions | Sora | 400 | 12px | `text-xs` |
| Code / Agent output | JetBrains Mono | 400 | 13px | `font-mono text-[13px]` |
| Button text | Sora | 500 | 14px | `text-sm font-medium` |
| Nav items | Sora | 500 | 14px | `text-sm font-medium` |
| Large stat numbers | Sora | 700 | 36px | `text-4xl font-bold` |

### Text Colors

```css
/* Tailwind classes */
.text-primary    { color: #F1F1F3; }  /* text-[#F1F1F3] */
.text-secondary  { color: #8B8B9E; }  /* text-[#8B8B9E] */
.text-muted      { color: #4A4A5E; }  /* text-[#4A4A5E] */
```

---

## Spacing System

```
4px  = gap-1, p-1, m-1
8px  = gap-2, p-2, m-2
12px = gap-3, p-3, m-3
16px = gap-4, p-4, m-4
20px = gap-5, p-5, m-5
24px = gap-6, p-6, m-6
32px = gap-8, p-8, m-8
40px = gap-10, p-10, m-10
48px = gap-12, p-12, m-12
64px = gap-16, p-16, m-16
```

**Common Patterns:**
- Content max-width: `max-w-7xl mx-auto` (1280px)
- Card padding: `p-6` (24px)
- Section gaps: `gap-6` between cards
- Page padding: `py-8` (vertical), `px-8` (horizontal)

---

## Borders & Shadows

### Border Styles

```css
/* Standard card border */
border: 1px solid #2A2A38;
/* Tailwind: border border-[#2A2A38] */

/* Accent border (active/hover) */
border: 1px solid rgba(99, 102, 241, 0.4);
/* Tailwind: border border-[rgba(99,102,241,0.4)] */
```

### Shadow Styles

```css
/* Card shadow */
box-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03);

/* Accent glow (active/hover) */
box-shadow: 0 0 0 1px var(--accent-primary), 0 0 20px var(--accent-glow);

/* Elevated (modal) */
box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
```

### Border Radius

```
Cards: rounded-xl (12px)
Buttons: rounded-lg (8px)
Inputs: rounded-lg (8px)
Badges: rounded-full
Modals: rounded-2xl (16px)
```

---

## Button Styles

### Primary Button

**Use for:** Main actions (Submit, Start, Approve)

```tsx
<button className="
  bg-[#6366F1] hover:bg-[#4F46E5] 
  text-white font-medium text-sm 
  px-5 py-2.5 rounded-lg 
  flex items-center gap-2
  transition-all duration-200
  hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]
">
  <Icon size={16} />
  Button Text
</button>
```

### Secondary Button

**Use for:** Cancel, back, secondary actions

```tsx
<button className="
  bg-transparent border border-[#2A2A38]
  text-[#8B8B9E] hover:text-[#F1F1F3]
  hover:bg-[#1A1A24]
  px-5 py-2.5 rounded-lg
  text-sm font-medium
  transition-all duration-200
">
  Button Text
</button>
```

### Danger Button

**Use for:** Reject, delete actions

```tsx
<button className="
  bg-transparent border border-[#F43F5E]
  text-[#F43F5E]
  hover:bg-[rgba(244,63,94,0.1)]
  px-5 py-2.5 rounded-lg
  text-sm font-medium
  transition-all duration-200
">
  Delete
</button>
```

### Ghost Button

**Use for:** Subtle actions inside cards

```tsx
<button className="
  bg-transparent
  text-[#8B8B9E] hover:text-[#F1F1F3]
  hover:bg-[#1A1A24]
  px-3 py-2 rounded-lg
  text-sm
  transition-all duration-200
">
  Action
</button>
```

---

## Form Elements

### Input Field

```tsx
<div className="space-y-2">
  <label className="
    block text-xs font-medium text-[#8B8B9E] 
    uppercase tracking-wider
  ">
    Field Label
  </label>
  <input
    type="text"
    className="
      w-full px-4 py-3 
      bg-[#111118] border border-[#2A2A38] rounded-lg
      text-sm text-[#F1F1F3] placeholder:text-[#4A4A5E]
      focus:border-[#6366F1] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)] focus:outline-none
      transition-all duration-200
    "
    placeholder="Enter text..."
  />
</div>
```

### Textarea

```tsx
<textarea
  rows={3}
  className="
    w-full px-4 py-3 
    bg-[#111118] border border-[#2A2A38] rounded-lg
    text-sm text-[#F1F1F3] placeholder:text-[#4A4A5E]
    focus:border-[#6366F1] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)] focus:outline-none
    resize-y
    transition-all duration-200
  "
  placeholder="Enter description..."
/>
```

### Select Dropdown

```tsx
<select className="
  w-full px-4 py-3 
  bg-[#111118] border border-[#2A2A38] rounded-lg
  text-sm text-[#F1F1F3]
  focus:border-[#6366F1] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)] focus:outline-none
  appearance-none
  transition-all duration-200
">
  <option value="">Select option</option>
  <option value="1">Option 1</option>
</select>
```

### Error State

```tsx
<input className="
  border-[#F43F5E] 
  focus:ring-[rgba(244,63,94,0.1)]
" />
<p className="text-xs text-[#F43F5E] mt-1">Error message here</p>
```

---

## Badge / Status Pills

### Status Badge Component

```tsx
interface StatusBadgeProps {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  children: React.ReactNode;
}

const statusStyles = {
  pending: {
    bg: 'bg-[#1A1A24]',
    text: 'text-[#4A4A5E]',
    border: 'border-[#2A2A38]',
    dot: 'bg-[#4A4A5E]'
  },
  running: {
    bg: 'bg-[rgba(99,102,241,0.1)]',
    text: 'text-[#6366F1]',
    border: 'border-[rgba(99,102,241,0.3)]',
    dot: 'bg-[#6366F1] animate-pulse'
  },
  completed: {
    bg: 'bg-[rgba(16,185,129,0.1)]',
    text: 'text-[#10B981]',
    border: 'border-[rgba(16,185,129,0.3)]',
    dot: 'bg-[#10B981]'
  },
  failed: {
    bg: 'bg-[rgba(244,63,94,0.1)]',
    text: 'text-[#F43F5E]',
    border: 'border-[rgba(244,63,94,0.3)]',
    dot: 'bg-[#F43F5E]'
  },
  retrying: {
    bg: 'bg-[rgba(245,158,11,0.1)]',
    text: 'text-[#F59E0B]',
    border: 'border-[rgba(245,158,11,0.3)]',
    dot: 'bg-[#F59E0B]'
  }
};

const StatusBadge = ({ status, children }: StatusBadgeProps) => {
  const styles = statusStyles[status];
  return (
    <span className={`
      inline-flex items-center gap-1.5
      px-3 py-1 rounded-full border
      text-xs font-medium
      ${styles.bg} ${styles.text} ${styles.border}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {children}
    </span>
  );
};
```

---

## Card Components

### Standard Card

```tsx
<div className="
  bg-[#111118] border border-[#2A2A38] rounded-xl p-6
  hover:border-[rgba(99,102,241,0.4)] hover:bg-[#1A1A24]
  transition-all duration-200
">
  Card content
</div>
```

### Elevated Card (Modal)

```tsx
<div className="
  bg-[#111118] border border-[#2A2A38] rounded-2xl p-8
  shadow-[0_24px_64px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)]
">
  Modal content
</div>
```

### Accent Card

```tsx
<div className="
  bg-[rgba(99,102,241,0.05)] 
  border border-[rgba(99,102,241,0.2)] 
  rounded-xl p-6
">
  Accent content
</div>
```

---

## Icons (Lucide React)

### Icon Sizes

```tsx
// Inline/button icons
<Icon size={16} />

// Nav icons
<Icon size={18} />

// Section header icons
<Icon size={20} />

// Large decorative icons
<Icon size={24} />
```

### Icon Colors

```tsx
// Always match text color context
<Icon className="text-[#6366F1]" size={16} /> // Primary
<Icon className="text-[#8B8B9E]" size={16} /> // Secondary
<Icon className="text-[#10B981]" size={16} /> // Success
<Icon className="text-[#F43F5E]" size={16} /> // Danger
```

---

## Toast Notifications

### React Hot Toast Configuration

```tsx
// In main.tsx or App.tsx
import { Toaster } from 'react-hot-toast';

<Toaster
  position="top-right"
  toastOptions={{
    duration: 4000,
    style: {
      background: '#111118',
      border: '1px solid #2A2A38',
      color: '#F1F1F3',
      fontFamily: 'Sora',
      fontSize: '13px',
      borderRadius: '10px',
      padding: '12px 16px',
    },
    success: {
      iconTheme: { 
        primary: '#10B981', 
        secondary: '#111118' 
      }
    },
    error: {
      iconTheme: { 
        primary: '#F43F5E', 
        secondary: '#111118' 
      }
    }
  }}
/>
```

### Usage

```tsx
import toast from 'react-hot-toast';

// Success
toast.success('Campaign launched successfully!');

// Error
toast.error('Failed to load campaign');

// Loading
const loadingToast = toast.loading('Processing...');
// Later:
toast.success('Done!', { id: loadingToast });
```

---

## Navigation Components

### Navbar (Landing Page)

```tsx
<nav className="
  fixed top-0 left-0 right-0 z-50
  h-16
  bg-[rgba(10,10,15,0.85)] backdrop-blur-xl
  border-b border-[#2A2A38]
">
  <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-2">
      <Zap size={20} className="text-[#6366F1]" />
      <span className="text-lg font-bold text-[#F1F1F3]">AgentMark</span>
    </div>
    
    {/* Nav Links */}
    <div className="hidden md:flex items-center gap-8">
      <a href="#" className="text-sm text-[#8B8B9E] hover:text-[#F1F1F3] transition">
        Features
      </a>
    </div>
    
    {/* Actions */}
    <div className="flex items-center gap-3">
      <button className="text-sm text-[#8B8B9E] px-4 py-2 hover:text-white transition">
        Sign In
      </button>
      <button className="bg-[#6366F1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4F46E5] transition">
        Get Started
      </button>
    </div>
  </div>
</nav>
```

### Sidebar (App Layout)

```tsx
<aside className="
  fixed left-0 top-0 bottom-0
  w-60 h-screen
  bg-[#111118] border-r border-[#2A2A38]
  flex flex-col
  z-40
">
  {/* Logo Area */}
  <div className="h-16 flex items-center px-5 border-b border-[#2A2A38]">
    <Zap size={18} className="text-[#6366F1]" />
    <span className="text-base font-bold text-[#F1F1F3] ml-2">AgentMark</span>
  </div>
  
  {/* Nav Items */}
  <nav className="flex-1 py-4 px-3 space-y-1">
    <a href="#" className="
      flex items-center gap-3 h-9 px-3 rounded-lg
      text-sm font-medium
      bg-[rgba(99,102,241,0.1)] text-[#6366F1] border-r-2 border-[#6366F1]
    ">
      <LayoutDashboard size={16} />
      Dashboard
    </a>
    
    <a href="#" className="
      flex items-center gap-3 h-9 px-3 rounded-lg
      text-sm font-medium text-[#8B8B9E]
      hover:bg-[#1A1A24] hover:text-[#F1F1F3]
      transition
    ">
      <History size={16} />
      History
    </a>
  </nav>
  
  {/* User Profile */}
  <div className="py-4 px-3 border-t border-[#2A2A38]">
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1A1A24]">
      <div className="w-8 h-8 rounded-full bg-[#2A2A38] flex items-center justify-center">
        <span className="text-sm font-semibold text-[#F1F1F3]">U</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#F1F1F3] truncate">User Name</p>
        <p className="text-[11px] text-[#4A4A5E] truncate">user@email.com</p>
      </div>
      <LogOut size={14} className="text-[#4A4A5E] hover:text-[#F43F5E]" />
    </div>
  </div>
</aside>
```

---

## Footer

```tsx
<footer className="bg-[#0A0A0F] border-t border-[#2A2A38] py-12">
  <div className="max-w-7xl mx-auto px-8">
    <div className="flex justify-between items-center">
      {/* Logo */}
      <div>
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-[#6366F1]" />
          <span className="text-base font-bold text-[#F1F1F3]">AgentMark</span>
        </div>
        <p className="text-xs text-[#4A4A5E] mt-2">
          An Advanced Agentic AI Project
        </p>
      </div>
      
      {/* Links */}
      <div className="flex items-center gap-6">
        <a href="#" className="text-[13px] text-[#4A4A5E] hover:text-[#8B8B9E]">Privacy</a>
        <a href="#" className="text-[13px] text-[#4A4A5E] hover:text-[#8B8B9E]">Terms</a>
        <a href="#" className="text-[13px] text-[#4A4A5E] hover:text-[#8B8B9E]">GitHub</a>
      </div>
    </div>
    
    <div className="border-t border-[#2A2A38] mt-8 pt-6 text-center">
      <p className="text-xs text-[#4A4A5E]">
        © 2025 Novateches Software Pvt Ltd. Built with LangGraph + GPT-4o.
      </p>
    </div>
  </div>
</footer>
```

---

## Loading States

### Full Page Loader

```tsx
<div className="fixed inset-0 bg-[#0A0A0F] flex flex-col items-center justify-center z-50">
  <Loader2 size={28} className="text-[#6366F1] animate-spin" />
  <p className="text-sm text-[#4A4A5E] mt-3">Loading...</p>
</div>
```

### Inline Button Loader

```tsx
<button disabled className="flex items-center gap-2">
  <Loader2 size={14} className="animate-spin" />
  Processing...
</button>
```

---

## Empty States

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Inbox size={48} className="text-[#2A2A38]" />
  <h3 className="text-[15px] font-medium text-[#4A4A5E] mt-4">
    No campaigns yet
  </h3>
  <p className="text-[13px] text-[#4A4A5E] mt-1">
    Start your first campaign to see results here.
  </p>
  <button className="mt-6 bg-[#6366F1] text-white px-5 py-2.5 rounded-lg text-sm font-medium">
    Start First Campaign
  </button>
</div>
```

---

## Responsive Breakpoints

```css
/* Mobile (<768px) */
- Sidebar: Hidden (hamburger menu)
- Grids: grid-cols-1
- Hero: text-5xl
- Auth: Single panel

/* Tablet (768px-1024px) */
- Sidebar: Icon-only (no labels)
- Grids: max grid-cols-2
- Reduced padding

/* Desktop (1024px+) */
- Full layout as designed
```

---

## Animations

```css
/* Add to index.css */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(10px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease forwards;
}

.animate-slide-up {
  animation: slideUp 0.4s ease forwards;
}
```

---

## Quality Checklist

Before submitting any page:

- [ ] Font: Sora loaded and applied globally
- [ ] Background: Page bg `#0A0A0F`, cards bg `#111118`
- [ ] Borders: All borders use `#2A2A38`
- [ ] Accent: Primary accent `#6366F1` used correctly
- [ ] Icons: Lucide React with correct sizes
- [ ] Buttons: Follow variant specs exactly
- [ ] Inputs: Correct focus ring and states
- [ ] Hover: All interactive elements have hover states
- [ ] Loading: Spinners during async operations
- [ ] Empty: Empty states for lists/tables
- [ ] Error: Form errors styled correctly
- [ ] Responsive: Works on 375px mobile
- [ ] No console errors
- [ ] No Lorem Ipsum text

---

**Document Version:** 1.0  
**Last Updated:** 2025  
**Organization:** Novateches Software Pvt Ltd
