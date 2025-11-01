import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDailyMessageVisibility } from '@/contexts/DailyMessageVisibilityContext';

export const DailyMessageToggle = () => {
  const { isVisible, toggleVisibility } = useDailyMessageVisibility();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Message</span>
          <Switch checked={isVisible} onCheckedChange={toggleVisibility} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isVisible ? 'Hide message of the day' : 'Show message of the day'}</p>
      </TooltipContent>
    </Tooltip>
  );
};
