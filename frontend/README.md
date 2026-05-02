# 🎨 Aegis Swarm Frontend

Modern, responsive Security Command Center built with React, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 📦 Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── assets/         # Images, icons
│   ├── components/     # React components
│   │   ├── layout/    # Layout components
│   │   ├── audit/     # Audit-specific components
│   │   ├── ui/        # Reusable UI components
│   │   └── common/    # Common components
│   ├── pages/         # Page components
│   ├── services/      # API and SSE services
│   ├── hooks/         # Custom React hooks
│   ├── types/         # TypeScript types
│   ├── utils/         # Utility functions
│   ├── styles/        # Global styles
│   ├── App.tsx        # Main app component
│   └── main.tsx       # Entry point
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🎨 Design System

### Color Palette

**Dark Theme + Gold Accents**

```css
/* Backgrounds */
--bg-primary: #0a0a0f      /* Deep dark */
--bg-secondary: #13131a    /* Card background */
--bg-tertiary: #1a1a24     /* Hover states */

/* Gold Accents */
--gold: #fbbf24            /* Primary gold */
--gold-dark: #f59e0b       /* Darker gold */
--gold-light: #fef3c7      /* Light gold */

/* Status Colors */
--critical: #ef4444        /* Red */
--high: #f97316           /* Orange */
--medium: #eab308         /* Yellow */
--low: #3b82f6            /* Blue */
--success: #10b981        /* Green */
```

### Typography

- **Font Family**: Inter (sans-serif)
- **Font Sizes**: 12px - 36px (responsive scale)
- **Font Weights**: 300, 400, 500, 600, 700, 800

### Components

All components follow a consistent design pattern:
- Dark backgrounds with subtle borders
- Gold accent highlights on hover/focus
- Smooth transitions (200-300ms)
- Responsive breakpoints (sm, md, lg, xl, 2xl)

## 🔌 API Integration

### Base Configuration

```typescript
// .env
VITE_API_URL=http://localhost:3000
VITE_API_BASE_PATH=/api
```

### API Service

```typescript
import { apiService } from '@/services/api.service';

// Start audit
const response = await apiService.startAudit({
  repoUrl: 'https://github.com/user/repo',
  branch: 'main'
});

// Get audit details
const audit = await apiService.getAudit(auditId);

// Get vulnerabilities
const vulnerabilities = await apiService.getVulnerabilities(auditId);
```

### SSE Service (Real-time Updates)

```typescript
import { sseService } from '@/services/sse.service';

// Connect to audit stream
sseService.connect(auditId);

// Listen to events
sseService.on('vulnerability_found', (event) => {
  console.log('New vulnerability:', event.data);
});

// Listen to all events
sseService.on('all', (event) => {
  console.log('Event:', event.type, event.data);
});

// Disconnect
sseService.disconnect();
```

## 🧩 Key Components

### 1. Repository Form
Submit GitHub repositories for security audits.

```tsx
<RepositoryForm onSubmit={handleSubmit} loading={loading} />
```

### 2. Activity Feed
Real-time agent activity updates via SSE.

```tsx
<ActivityFeed auditId={auditId} onEvent={handleEvent} />
```

### 3. Vulnerability Map
Visual overview of detected vulnerabilities.

```tsx
<VulnerabilityMap 
  vulnerabilities={vulnerabilities}
  onVulnerabilityClick={handleClick}
/>
```

### 4. File Tree
Navigate scanned files with vulnerability indicators.

```tsx
<FileTree 
  files={files}
  selectedFile={selectedFile}
  onFileSelect={handleSelect}
/>
```

### 5. Patch Diff Viewer
Side-by-side code comparison.

```tsx
<PatchDiffViewer patch={patch} language="javascript" />
```

### 6. Sandbox Terminal
Display test execution output.

```tsx
<SandboxTerminal output={output} status={status} />
```

## 🎣 Custom Hooks

### useAudit
Manage audit state and operations.

```typescript
const { audit, vulnerabilities, patches, loading, error, startAudit, refresh } = useAudit(auditId);
```

### useSSE
Handle SSE connections and events.

```typescript
const { connected, events, latestEvent, error } = useSSE(auditId);
```

### useToast
Display notifications.

```typescript
const { success, error, info, warning } = useToast();

success('Audit completed successfully!');
error('Failed to start audit');
```

## 📱 Responsive Design

### Breakpoints

```css
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Mobile-First Approach

All components are designed mobile-first and scale up:
- Single column on mobile
- Two columns on tablet
- Three columns on desktop
- Collapsible sidebar
- Touch-optimized controls

## 🎭 Animations

### Built-in Animations

```css
animate-fade-in      /* Fade in effect */
animate-slide-up     /* Slide up effect */
animate-pulse-slow   /* Slow pulse */
animate-shimmer      /* Shimmer loading */
```

### Usage

```tsx
<div className="animate-fade-in">
  Content appears smoothly
</div>
```

## 🧪 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Functional components with hooks
- Consistent naming conventions
- Comprehensive comments

### Component Template

```tsx
import React from 'react';

interface ComponentProps {
  // Props definition
}

export function Component({ prop }: ComponentProps) {
  // Hooks
  const [state, setState] = React.useState();
  
  // Effects
  React.useEffect(() => {
    // Side effects
  }, []);
  
  // Handlers
  const handleClick = () => {
    // Event handling
  };
  
  // Render
  return (
    <div className="component">
      {/* JSX */}
    </div>
  );
}
```

## 🔐 Security

- Input validation on all forms
- XSS prevention
- CORS configuration
- Secure API communication (HTTPS in production)
- No sensitive data in localStorage

## ⚡ Performance

- Code splitting by route
- Lazy loading for heavy components
- Virtual scrolling for large lists
- Memoization of expensive computations
- Optimized bundle size

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📚 Resources

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for secure code**