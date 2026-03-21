# CodeMail Web Client - TODO

## Design Philosophy
- **Aesthetic:** Linear/Raycast/Arc inspired - refined, dense, keyboard-first
- **Colors:** High contrast, dark mode default, monospace for technical feel
- **Feel:** Developer tool, not consumer app

## Status: ✅ COMPLETE (Core Implementation)

All core features implemented with mock data. Ready for Convex integration.

## Implementation Plan

### Phase 1: Foundation ✅
- [x] Next.js 15 app with App Router
- [x] Tailwind v4 configuration  
- [x] shadcn/ui setup (button, input, avatar, scroll-area, separator, tooltip, badge, dialog, command, dropdown-menu)
- [x] Convex client provider
- [x] Clerk auth provider + middleware
- [x] Custom design tokens (colors, typography, dark mode)

### Phase 2: Layout & Navigation ✅
- [x] Root layout with providers (ThemeProvider, Clerk, Convex, Tooltip)
- [x] Mail layout with sidebar
- [x] Sidebar component (folders, labels, user menu, theme toggle)
- [x] Command palette (⌘+K) with navigation & actions
- [x] Keyboard shortcuts hook (useMailShortcuts)

### Phase 3: Core Views ✅
- [x] /mail/inbox - Message list with keyboard nav, actions
- [x] /mail/[id] - Message detail with threading, attachments
- [x] /mail/compose - Rich text compose with Tiptap editor
- [x] /mail/search - Search with filters (from:, has:attachment, etc.)
- [x] /mail/sent, /mail/starred, /mail/archive, /mail/trash - Placeholder pages

### Phase 4: Features ✅
- [x] Keyboard navigation (j/k navigate, e archive, s star, Enter open, c compose)
- [x] Message threading UI (expandable thread messages)
- [x] Dark/light mode toggle
- [x] Attachment upload UI in compose
- [x] Real-time ready (mock data, Convex subscriptions scaffolded)

### Phase 5: Polish (Future)
- [ ] Loading states & skeletons
- [ ] Error boundaries
- [ ] Animations (framer-motion)
- [ ] Mobile responsive

---

## File Structure (Implemented)
```
apps/web/
├── app/
│   ├── layout.tsx              # Root with providers
│   ├── page.tsx                # Redirect to /mail/inbox
│   ├── globals.css             # Tailwind v4 + design tokens
│   └── mail/
│       ├── layout.tsx          # Mail layout with sidebar
│       ├── inbox/page.tsx      # Inbox view
│       ├── [id]/page.tsx       # Message detail
│       ├── compose/page.tsx    # Compose view
│       ├── search/page.tsx     # Search results
│       ├── sent/page.tsx       # Sent folder
│       ├── starred/page.tsx    # Starred folder
│       ├── archive/page.tsx    # Archive folder
│       └── trash/page.tsx      # Trash folder
├── components/
│   ├── ui/                     # shadcn components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── avatar.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   ├── tooltip.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── command.tsx
│   │   └── dropdown-menu.tsx
│   ├── mail/
│   │   ├── sidebar.tsx         # Navigation sidebar
│   │   ├── command-menu.tsx    # ⌘+K command palette
│   │   ├── message-list.tsx    # Message list component
│   │   ├── message-view.tsx    # Message detail + threading
│   │   └── compose-editor.tsx  # Tiptap rich text compose
│   └── providers.tsx           # Clerk, Convex, Theme providers
├── hooks/
│   ├── use-keyboard-shortcuts.ts
│   └── use-command-menu.ts
├── lib/
│   └── utils.ts                # cn(), formatDate, etc.
└── middleware.ts               # Clerk auth middleware
```

## Next Steps (Convex Integration)
1. Create Convex queries: `messages.list`, `messages.get`, `messages.search`
2. Create Convex mutations: `messages.markRead`, `messages.star`, `messages.archive`, `messages.delete`
3. Replace mock data with `useQuery()` subscriptions
4. Implement outbound email via `outboundQueue` mutation + Resend

## Running Locally
```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Add your Convex URL and Clerk keys

# Start dev server
bun run dev
```
