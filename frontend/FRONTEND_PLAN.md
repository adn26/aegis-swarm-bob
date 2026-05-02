# 🎨 Aegis Swarm - Frontend Implementation Plan

## 🎯 Overview

A modern, responsive Security Command Center built with React, TypeScript, and Tailwind CSS. Features real-time SSE updates, vulnerability visualization, and an intuitive dark-themed interface with gold accents.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Application (Vite)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    App Router                             │  │
│  │  / (Home) → /audit/:id (Audit Dashboard)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Page Components                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │   Home   │  │  Audit   │  │  About   │               │  │
│  │  │   Page   │  │Dashboard │  │   Page   │               │  │
│  │  └──────────┘  └──────────┘  └──────────┘               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Feature Components                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ Repository   │  │ Activity     │  │ Vulnerability│   │  │
│  │  │ Input Form   │  │ Feed (SSE)   │  │ Map          │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ File Tree    │  │ Patch Diff   │  │ Sandbox      │   │  │
│  │  │ Viewer       │  │ Viewer       │  │ Terminal     │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Services Layer                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │   API    │  │   SSE    │  │  State   │               │  │
│  │  │ Service  │  │ Service  │  │ Manager  │               │  │
│  │  └──────────┘  └──────────┘  └──────────┘               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Shared Components                        │  │
│  │  Button, Card, Badge, Modal, Toast, Spinner, etc.        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Backend API (Express)
```

---

## 📁 Project Structure

```
frontend/
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── assets/
│   │   ├── images/
│   │   └── icons/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   ├── audit/
│   │   │   ├── RepositoryForm.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── VulnerabilityMap.tsx
│   │   │   ├── FileTree.tsx
│   │   │   ├── PatchDiffViewer.tsx
│   │   │   ├── SandboxTerminal.tsx
│   │   │   ├── AuditStats.tsx
│   │   │   └── ReportDownload.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Progress.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── Tooltip.tsx
│   │   └── common/
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingState.tsx
│   │       └── EmptyState.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── AuditDashboard.tsx
│   │   └── About.tsx
│   ├── services/
│   │   ├── api.service.ts
│   │   ├── sse.service.ts
│   │   └── storage.service.ts
│   ├── hooks/
│   │   ├── useAudit.ts
│   │   ├── useSSE.ts
│   │   ├── useToast.ts
│   │   └── useLocalStorage.ts
│   ├── store/
│   │   ├── auditStore.ts
│   │   └── uiStore.ts
│   ├── types/
│   │   ├── audit.types.ts
│   │   ├── vulnerability.types.ts
│   │   └── api.types.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── FRONTEND_PLAN.md
```

---

## 🎨 Design System

### Color Palette (Dark Theme + Gold Accents)

```css
/* Primary Colors */
--bg-primary: #0a0a0f        /* Deep dark background */
--bg-secondary: #13131a      /* Card/panel background */
--bg-tertiary: #1a1a24       /* Hover states */

/* Gold Accents */
--gold-primary: #fbbf24       /* Primary gold */
--gold-secondary: #f59e0b     /* Darker gold */
--gold-tertiary: #fef3c7      /* Light gold */

/* Status Colors */
--critical: #ef4444           /* Red */
--high: #f97316              /* Orange */
--medium: #eab308            /* Yellow */
--low: #3b82f6               /* Blue */
--success: #10b981           /* Green */

/* Text Colors */
--text-primary: #f9fafb       /* White */
--text-secondary: #d1d5db     /* Gray */
--text-tertiary: #9ca3af      /* Muted gray */

/* Borders */
--border-primary: #27272a     /* Dark border */
--border-accent: #fbbf24      /* Gold border */
```

### Typography

```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem    /* 12px */
--text-sm: 0.875rem   /* 14px */
--text-base: 1rem     /* 16px */
--text-lg: 1.125rem   /* 18px */
--text-xl: 1.25rem    /* 20px */
--text-2xl: 1.5rem    /* 24px */
--text-3xl: 1.875rem  /* 30px */
--text-4xl: 2.25rem   /* 36px */
```

### Spacing

```css
/* Consistent spacing scale */
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-12: 3rem     /* 48px */
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
--shadow-gold: 0 0 20px rgba(251, 191, 36, 0.3);
```

---

## 🧩 Component Specifications

### 1. Repository Input Form
**Purpose**: Submit GitHub repository for audit

**Features**:
- Repository URL input with validation
- Optional PR number input
- Optional branch selection
- Submit button with loading state
- Recent audits quick access

**Props**:
```typescript
interface RepositoryFormProps {
  onSubmit: (data: AuditRequest) => Promise<void>;
  loading?: boolean;
}
```

---

### 2. Activity Feed (SSE)
**Purpose**: Real-time agent activity updates

**Features**:
- Live SSE connection status indicator
- Scrollable activity timeline
- Event type icons and colors
- Timestamp for each event
- Auto-scroll to latest
- Expandable event details

**Events**:
- Connected
- Audit started
- Repository cloned
- Files scanned
- Red Team analyzing
- Vulnerability found
- Blue Team patching
- Patch generated
- Sandbox testing
- Test results
- Audit completed
- Errors

**Props**:
```typescript
interface ActivityFeedProps {
  auditId: string;
  onEvent?: (event: SSEEvent) => void;
}
```

---

### 3. Vulnerability Map
**Purpose**: Visual overview of vulnerabilities

**Features**:
- Severity distribution chart (pie/donut)
- Category breakdown
- File heatmap
- Interactive filtering
- Severity legend
- Click to navigate to details

**Props**:
```typescript
interface VulnerabilityMapProps {
  vulnerabilities: Vulnerability[];
  onVulnerabilityClick?: (id: string) => void;
}
```

---

### 4. File Tree Viewer
**Purpose**: Navigate scanned files with vulnerability indicators

**Features**:
- Collapsible directory tree
- File icons by type
- Vulnerability count badges
- Severity color coding
- Search/filter files
- Click to view details

**Props**:
```typescript
interface FileTreeProps {
  files: ScannedFile[];
  selectedFile?: string;
  onFileSelect: (path: string) => void;
}
```

---

### 5. Patch Diff Viewer
**Purpose**: Side-by-side code comparison

**Features**:
- Split view (original vs patched)
- Syntax highlighting
- Line numbers
- Diff highlighting (additions/deletions)
- Copy code buttons
- Expand/collapse sections
- Full-screen mode

**Props**:
```typescript
interface PatchDiffViewerProps {
  patch: Patch;
  language?: string;
}
```

---

### 6. Sandbox Terminal
**Purpose**: Display test execution output

**Features**:
- Terminal-style output
- ANSI color support
- Auto-scroll
- Copy output
- Clear button
- Status indicator (running/passed/failed)

**Props**:
```typescript
interface SandboxTerminalProps {
  output: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
}
```

---

### 7. Audit Stats Dashboard
**Purpose**: High-level audit metrics

**Features**:
- Total vulnerabilities count
- Severity breakdown
- Files scanned count
- Patches generated count
- Test pass rate
- Audit duration
- Animated counters

**Props**:
```typescript
interface AuditStatsProps {
  audit: Audit;
}
```

---

### 8. Report Download
**Purpose**: Download PDF report

**Features**:
- Download button
- Report preview
- File size display
- Generation timestamp
- Loading state

**Props**:
```typescript
interface ReportDownloadProps {
  auditId: string;
  available: boolean;
}
```

---

## 🔌 Services

### API Service
```typescript
class ApiService {
  private baseURL: string;
  
  // Audit operations
  startAudit(data: AuditRequest): Promise<AuditResponse>;
  getAudit(id: string): Promise<Audit>;
  getVulnerabilities(auditId: string): Promise<Vulnerability[]>;
  getPatches(auditId: string): Promise<Patch[]>;
  getResults(auditId: string): Promise<AuditResults>;
  downloadReport(auditId: string): Promise<Blob>;
}
```

### SSE Service
```typescript
class SSEService {
  private eventSource: EventSource | null;
  
  connect(auditId: string): void;
  disconnect(): void;
  on(event: string, callback: (data: any) => void): void;
  off(event: string): void;
}
```

### Storage Service
```typescript
class StorageService {
  // Local storage for recent audits
  saveRecentAudit(audit: Audit): void;
  getRecentAudits(): Audit[];
  clearRecentAudits(): void;
}
```

---

## 🎣 Custom Hooks

### useAudit
```typescript
function useAudit(auditId?: string) {
  return {
    audit: Audit | null,
    vulnerabilities: Vulnerability[],
    patches: Patch[],
    loading: boolean,
    error: Error | null,
    startAudit: (data: AuditRequest) => Promise<void>,
    refresh: () => Promise<void>
  };
}
```

### useSSE
```typescript
function useSSE(auditId: string) {
  return {
    connected: boolean,
    events: SSEEvent[],
    latestEvent: SSEEvent | null,
    error: Error | null
  };
}
```

### useToast
```typescript
function useToast() {
  return {
    success: (message: string) => void,
    error: (message: string) => void,
    info: (message: string) => void,
    warning: (message: string) => void
  };
}
```

---

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Layout Adaptations

**Mobile (< 768px)**:
- Single column layout
- Collapsible sidebar
- Stacked components
- Bottom navigation
- Simplified visualizations

**Tablet (768px - 1024px)**:
- Two column layout
- Slide-out sidebar
- Responsive grid
- Touch-optimized controls

**Desktop (> 1024px)**:
- Three column layout
- Persistent sidebar
- Full feature set
- Keyboard shortcuts

---

## 🎭 Animations & Transitions

### Principles
- Smooth, purposeful animations
- 200-300ms duration for most transitions
- Ease-in-out timing function
- Respect `prefers-reduced-motion`

### Key Animations
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Pulse (for loading) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Shimmer (for skeleton loading) */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

---

## 🔐 Security Considerations

### Input Validation
- Sanitize all user inputs
- Validate GitHub URLs
- Prevent XSS attacks
- Rate limiting on API calls

### Data Handling
- No sensitive data in localStorage
- Secure API communication (HTTPS)
- Token-based authentication (future)
- CORS configuration

---

## ⚡ Performance Optimization

### Code Splitting
- Route-based code splitting
- Lazy load heavy components
- Dynamic imports for charts

### Caching
- Cache API responses
- Memoize expensive computations
- Virtual scrolling for large lists

### Bundle Optimization
- Tree shaking
- Minification
- Compression (gzip/brotli)
- CDN for static assets

---

## 🧪 Testing Strategy

### Unit Tests
- Component rendering
- Hook behavior
- Utility functions
- Service methods

### Integration Tests
- API integration
- SSE connection
- User workflows

### E2E Tests
- Complete audit flow
- Navigation
- Responsive behavior

---

## 📦 Dependencies

### Core
- `react` ^18.2.0
- `react-dom` ^18.2.0
- `react-router-dom` ^6.20.0
- `typescript` ^5.3.0

### UI & Styling
- `tailwindcss` ^3.4.0
- `@headlessui/react` ^1.7.0
- `lucide-react` ^0.300.0 (icons)
- `clsx` ^2.0.0
- `tailwind-merge` ^2.2.0

### Data Visualization
- `recharts` ^2.10.0
- `react-syntax-highlighter` ^15.5.0
- `react-diff-view` ^3.2.0

### State Management
- `zustand` ^4.4.0

### HTTP & SSE
- `axios` ^1.6.0

### Utilities
- `date-fns` ^3.0.0
- `zod` ^3.22.0 (validation)

### Development
- `vite` ^5.0.0
- `@vitejs/plugin-react` ^4.2.0
- `eslint` ^8.55.0
- `prettier` ^3.1.0
- `@types/react` ^18.2.0
- `@types/react-dom` ^18.2.0

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)
- [x] Project setup (Vite + React + TypeScript)
- [ ] Tailwind CSS configuration
- [ ] Design system implementation
- [ ] Routing setup
- [ ] Basic layout components

### Phase 2: Core Components (Week 2)
- [ ] Repository input form
- [ ] API service integration
- [ ] Basic audit dashboard
- [ ] Loading and error states

### Phase 3: Real-time Features (Week 3)
- [ ] SSE service implementation
- [ ] Activity feed component
- [ ] Real-time updates
- [ ] Connection status handling

### Phase 4: Visualization (Week 4)
- [ ] Vulnerability map
- [ ] File tree viewer
- [ ] Audit statistics
- [ ] Charts and graphs

### Phase 5: Advanced Features (Week 5)
- [ ] Patch diff viewer
- [ ] Sandbox terminal
- [ ] Report download
- [ ] Search and filtering

### Phase 6: Polish & Optimization (Week 6)
- [ ] Responsive design refinement
- [ ] Animations and transitions
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Testing and bug fixes

---

## 🎯 Success Criteria

- ✅ Responsive on all screen sizes (mobile, tablet, desktop)
- ✅ Real-time updates with SSE working smoothly
- ✅ Intuitive navigation and user flow
- ✅ Fast load times (< 3s initial load)
- ✅ Accessible (WCAG 2.1 AA compliance)
- ✅ Beautiful dark theme with gold accents
- ✅ Smooth animations and transitions
- ✅ Error handling and user feedback
- ✅ Cross-browser compatibility

---

## 📝 Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Functional components with hooks
- Consistent naming conventions
- Comprehensive comments

### Component Structure
```typescript
// 1. Imports
import React from 'react';

// 2. Types
interface ComponentProps {
  // ...
}

// 3. Component
export function Component({ prop }: ComponentProps) {
  // 4. Hooks
  const [state, setState] = useState();
  
  // 5. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 6. Handlers
  const handleClick = () => {
    // ...
  };
  
  // 7. Render
  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

### Git Workflow
- Feature branches: `feature/component-name`
- Commit messages: `feat: add component description`
- Pull requests with descriptions
- Code review before merge

---

## 🔮 Future Enhancements

- [ ] Dark/Light theme toggle
- [ ] User authentication
- [ ] Audit history and comparison
- [ ] Custom vulnerability rules
- [ ] Export to multiple formats (JSON, CSV)
- [ ] Collaborative features
- [ ] Webhook notifications
- [ ] Advanced filtering and search
- [ ] Keyboard shortcuts
- [ ] Internationalization (i18n)

---

**Last Updated**: 2026-05-02
**Version**: 1.0.0
**Status**: Planning Complete - Ready for Implementation