import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAdminMode } from '@/contexts/AdminModeContext';

interface DailyMessageProps {
  tenantId: string;
}

export const DailyMessage = ({ tenantId }: DailyMessageProps) => {
  const [message, setMessage] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isAdminMode } = useAdminMode();

  useEffect(() => {
    loadMessage();
  }, [tenantId]);

  const loadMessage = async () => {
    const { data, error } = await supabase
      .from('daily_messages')
      .select('message_text')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading message:', error);
      return;
    }

    setMessage(data?.message_text || '');
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('daily_messages')
      .upsert({
        tenant_id: tenantId,
        message_text: editedMessage,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id'
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save message',
        variant: 'destructive',
      });
      console.error('Error saving message:', error);
    } else {
      setMessage(editedMessage);
      setIsOpen(false);
      toast({
        title: 'Success',
        description: 'Message updated',
      });
    }
    setIsSaving(false);
  };

  const handleOpenDialog = () => {
    setEditedMessage(message);
    setIsOpen(true);
  };

  if (!message && !isAdminMode) {
    return null;
  }

  return (
    <div className="relative overflow-hidden bg-accent/50 border rounded-lg py-3 px-4 flex items-center gap-3">
      <div className="flex-1 overflow-hidden">
        {message ? (
          <div className="ticker-container">
            <div className="ticker-text">
              {message}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No message set</p>
        )}
      </div>
      
      {isAdminMode && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="shrink-0"
              onClick={handleOpenDialog}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Today's Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                placeholder="Enter the rolling message..."
                className="min-h-[120px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <style>{`
        .ticker-container {
          overflow: hidden;
          white-space: nowrap;
        }
        
        .ticker-text {
          display: inline-block;
          padding-left: 100%;
          animation: ticker 30s linear infinite;
        }
        
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        .ticker-container:hover .ticker-text {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};