import { Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminMode } from '@/contexts/AdminModeContext';

export const AdminModeToggle = () => {
  const { isAdminMode, toggleAdminMode } = useAdminMode();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <Switch checked={isAdminMode} onCheckedChange={toggleAdminMode} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isAdminMode ? 'Admin mode on' : 'Admin mode off'}</p>
        <p className="text-xs text-muted-foreground">
          {isAdminMode ? 'Hide admin controls' : 'Show admin controls'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
