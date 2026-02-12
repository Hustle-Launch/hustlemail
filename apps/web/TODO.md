# CodeMail Web Client - TODO

## Design Philosophy
- **Aesthetic:** Linear/Raycast/Arc inspired - refined, dense, keyboard-first
- **Colors:** High contrast, dark mode default, monospace for technical feel
- **Feel:** Developer tool, not consumer app

## Implementation Plan

### Phase 1: Foundation
- [x] Next.js 15 app with App Router
- [x] Tailwind v4 configuration
- [x] shadcn/ui setup
- [x] Convex client provider
- [x] Clerk auth provider
- [x] Custom design tokens (colors, typography)

### Phase 2: Layout & Navigation
- [x] Root layout with providers
- [x] Mail layout with sidebar
- [x] Sidebar component (folders, labels, quick actions)
- [x] Command palette (cmd+k)
- [x] Keyboard shortcuts hook

### Phase 3: Core Views
- [x] /mail/inbox - Message list with real-time updates
- [x] /mail/[id] - Message detail with threading
- [x] /mail/compose - Rich text compose
- [x] /mail/search - Search results

### Phase 4: Features
- [x] Real-time Convex subscriptions
- [x] Keyboard navigation (j/k, e, r, c)
- [x] Message threading display
- [x] Dark/light mode toggle
- [x] Attachment upload UI

### Phase 5: Polish
- [ ] Loading states & skeletons
- [ ] Error boundaries
- [ ] Empty states
- [ ] Animations (framer-motion)

---

## File Structure
```
apps/web/
├── app/
│   ├── layout.tsx          # Root with providers
│   ├── page.tsx             # Redirect to /mail/inbox
│   └── mail/
│       ├── layout.tsx       # Mail layout with sidebar
│       ├── inbox/page.tsx   # Inbox view
│       ├── [id]/page.tsx    # Message detail
│       ├── compose/page.tsx # Compose view
│       └── search/page.tsx  # Search results
├── components/
│   ├── ui/                  # shadcn components
│   ├── mail/                # Mail-specific components
│   └── layout/              # Layout components
├── hooks/                   # Custom hooks
├── lib/                     # Utilities
└── convex/                  # Convex client setup
```
