import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminModeToggle } from '@/components/AdminModeToggle';
import { DailyMessageToggle } from '@/components/DailyMessageToggle';

interface FooterProps {
  onLogout: () => void;
}

export const Footer = ({ onLogout }: FooterProps) => {
  return (
    <footer className="border-t border-border bg-background mt-8">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <DailyMessageToggle />
            <AdminModeToggle />
            <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Created by J. Lanesskog - 2025
          </p>
        </div>
      </div>
    </footer>
  );
};
