import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';

interface PredefinedStatus {
  id: string;
  status_text: string;
}

const Options = () => {
  const navigate = useNavigate();
  const { user, companyName } = useAuth();
  const [statuses, setStatuses] = useState<PredefinedStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadStatuses();
  }, [user, navigate]);

  const loadStatuses = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('predefined_statuses')
        .select('*')
        .eq('tenant_id', user.id)
        .order('created_at');

      if (error) throw error;

      // If no statuses exist, create default ones
      if (!data || data.length === 0) {
        await createDefaultStatuses();
      } else {
        setStatuses(data);
      }
    } catch (error) {
      console.error('Error loading statuses:', error);
      toast.error('Failed to load status options');
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultStatuses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('predefined_statuses')
        .insert([
          { tenant_id: user.id, status_text: 'In' },
          { tenant_id: user.id, status_text: 'Out' },
        ])
        .select();

      if (error) throw error;

      setStatuses(data || []);
      toast.success('Default statuses created');
    } catch (error) {
      console.error('Error creating default statuses:', error);
      toast.error('Failed to create default statuses');
    }
  };

  const handleAddStatus = async () => {
    if (!user || !newStatus.trim()) return;

    setIsAdding(true);
    try {
      const { data, error } = await supabase
        .from('predefined_statuses')
        .insert({ tenant_id: user.id, status_text: newStatus.trim() })
        .select()
        .single();

      if (error) throw error;

      setStatuses([...statuses, data]);
      setNewStatus('');
      toast.success('Status added');
    } catch (error) {
      console.error('Error adding status:', error);
      toast.error('Failed to add status');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from('predefined_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStatuses(statuses.filter((s) => s.id !== id));
      toast.success('Status removed');
    } catch (error) {
      console.error('Error deleting status:', error);
      toast.error('Failed to remove status');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newStatus.trim()) {
      handleAddStatus();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Options</h1>
            <p className="text-sm text-muted-foreground">{companyName}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Predefined Status Choices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add new status option..."
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                onClick={handleAddStatus}
                disabled={!newStatus.trim() || isAdding}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                >
                  <span className="text-foreground">{status.status_text}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteStatus(status.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {statuses.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">
                No status options yet. Add your first one above!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Options;
