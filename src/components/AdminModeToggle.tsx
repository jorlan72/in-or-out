import { Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAdminMode } from '@/contexts/AdminModeContext';

export const AdminModeToggle = () => {
  const { isAdminMode, toggleAdminMode } = useAdminMode();

  return (
    <div className="flex items-center gap-2">
      <Shield className="h-4 w-4 text-muted-foreground" />
      <Switch checked={isAdminMode} onCheckedChange={toggleAdminMode} />
    </div>
  );
};
