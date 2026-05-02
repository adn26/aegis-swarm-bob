import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col cc-body">
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

export default Layout;
