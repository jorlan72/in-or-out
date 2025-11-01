import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminMode } from '@/contexts/AdminModeContext';

export const AdminModeToggle = () => {
  const { isAdminMode, toggleAdminMode } = useAdminMode();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Switch checked={isAdminMode} onCheckedChange={toggleAdminMode} />
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
