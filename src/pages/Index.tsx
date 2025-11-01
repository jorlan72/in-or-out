import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Settings } from 'lucide-react';
import { useAdminMode } from '@/contexts/AdminModeContext';
import { useDailyMessageVisibility } from '@/contexts/DailyMessageVisibilityContext';
import EmployeeTable from '@/components/EmployeeTable';
import AddEmployeeDialog from '@/components/AddEmployeeDialog';
import { DailyMessage } from '@/components/DailyMessage';
import { Footer } from '@/components/Footer';

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
  const { user, companyName, signOut, loading } = useAuth();
  const { isAdminMode } = useAdminMode();
  const { isVisible: isDailyMessageVisible } = useDailyMessageVisibility();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      loadEmployees();
    }
  }, [user, loading, navigate]);

  // Set up realtime subscription for employee changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `tenant_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Employee change detected:', payload);
          loadEmployees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadEmployees = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // First, apply recurring statuses based on day of week
      await applyRecurringStatuses();
      
      // Then, check and apply scheduled statuses for today (these override recurring)
      await applyScheduledStatuses();

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error loading employees:', error);
      // Only show error toast if user is still authenticated
      // (prevents error toast on logout/account deletion)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        toast.error('Failed to load employees');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const applyScheduledStatuses = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get all scheduled statuses for today or earlier
      const { data: scheduledStatuses, error: fetchError } = await supabase
        .from('scheduled_statuses')
        .select('*')
        .eq('tenant_id', user.id)
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

      // Delete all past scheduled statuses (before today)
      await supabase
        .from('scheduled_statuses')
        .delete()
        .eq('tenant_id', user.id)
        .lt('scheduled_date', today);

    } catch (error: any) {
      console.error('Error applying scheduled statuses:', error);
      // Silently fail - this is expected during logout/account deletion
    }
  };

  const applyRecurringStatuses = async () => {
    if (!user) return;

    try {
      const currentDayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Get all employees with recurring enabled
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .eq('tenant_id', user.id)
        .eq('recurring_enabled', true);

      if (employeesError) throw employeesError;
      if (!employees || employees.length === 0) return;

      // Get recurring statuses for today's day of week for these employees
      const { data: recurringStatuses, error: recurringError } = await supabase
        .from('recurring_statuses')
        .select('*')
        .eq('tenant_id', user.id)
        .eq('day_of_week', currentDayOfWeek)
        .in('employee_id', employees.map(e => e.id));

      if (recurringError) throw recurringError;
      if (!recurringStatuses || recurringStatuses.length === 0) return;

      // Update employee statuses based on recurring schedule
      for (const recurring of recurringStatuses) {
        await supabase
          .from('employees')
          .update({ status: recurring.status_text })
          .eq('id', recurring.employee_id);
      }

    } catch (error: any) {
      console.error('Error applying recurring statuses:', error);
      // Silently fail - this is expected during logout/account deletion
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
    toast.success('Signed out successfully');
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="InOrOut Logo" className="h-8 w-8" />
            <h1 className="text-3xl font-bold text-foreground">InOrOut</h1>
          </div>
          <p className="text-sm text-muted-foreground">{companyName}</p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-2">
            {employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No team members yet. Add your first person to get started!</p>
              </div>
            ) : (
              <EmployeeTable employees={employees} onEmployeeUpdate={loadEmployees} />
            )}
          </CardContent>
        </Card>

        {isDailyMessageVisible && <DailyMessage tenantId={user?.id || ''} />}

        {isAdminMode && (
          <div className="flex gap-2">
            <AddEmployeeDialog tenantId={user?.id || ''} onEmployeeAdded={loadEmployees} />
            <Button variant="outline" onClick={() => navigate('/options')}>
              <Settings className="mr-2 h-4 w-4" />
              Options
            </Button>
          </div>
        )}
      </div>
      
      <Footer onLogout={handleLogout} />
    </div>
  );
};

export default Index;
