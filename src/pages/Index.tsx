import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { LogOut, Loader2, Settings } from 'lucide-react';
import EmployeeTable from '@/components/EmployeeTable';
import AddEmployeeDialog from '@/components/AddEmployeeDialog';

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  image_url: string | null;
}

const Index = () => {
  const navigate = useNavigate();
  const { tenantId, tenantName, clearTenant } = useTenant();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      navigate('/auth');
      return;
    }

    loadEmployees();
  }, [tenantId, navigate]);

  const loadEmployees = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      // First, check and apply scheduled statuses for today
      await applyScheduledStatuses();

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;

      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const applyScheduledStatuses = async () => {
    if (!tenantId) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get all scheduled statuses for today or earlier
      const { data: scheduledStatuses, error: fetchError } = await supabase
        .from('scheduled_statuses')
        .select('*')
        .eq('tenant_id', tenantId)
        .lte('scheduled_date', today);

      if (fetchError) throw fetchError;

      if (!scheduledStatuses || scheduledStatuses.length === 0) return;

      // Group by employee_id and get the most recent scheduled status for each
      const statusesByEmployee = scheduledStatuses.reduce((acc, status) => {
        const existing = acc[status.employee_id];
        if (!existing || status.scheduled_date > existing.scheduled_date) {
          acc[status.employee_id] = status;
        }
        return acc;
      }, {} as Record<string, typeof scheduledStatuses[0]>);

      // Update employee statuses
      for (const employeeId in statusesByEmployee) {
        const status = statusesByEmployee[employeeId];
        await supabase
          .from('employees')
          .update({ status: status.status_text })
          .eq('id', employeeId);
      }

      // Delete all past scheduled statuses (including today)
      await supabase
        .from('scheduled_statuses')
        .delete()
        .eq('tenant_id', tenantId)
        .lte('scheduled_date', today);

    } catch (error) {
      console.error('Error applying scheduled statuses:', error);
    }
  };

  const handleLogout = () => {
    clearTenant();
    navigate('/auth');
    toast.success('Signed out successfully');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">InOrOut</h1>
            <p className="text-sm text-muted-foreground">{tenantName}</p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No team members yet. Add your first person to get started!</p>
              </div>
            ) : (
              <EmployeeTable employees={employees} onEmployeeUpdate={loadEmployees} />
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <AddEmployeeDialog tenantId={tenantId || ''} onEmployeeAdded={loadEmployees} />
          <Button variant="outline" onClick={() => navigate('/options')}>
            <Settings className="mr-2 h-4 w-4" />
            Options
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
