import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LogOut, Loader2, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminModeToggle } from '@/components/AdminModeToggle';
import { useAdminMode } from '@/contexts/AdminModeContext';
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
  const { user, companyName, signOut, loading } = useAuth();
  const { isAdminMode } = useAdminMode();
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
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">InOrOut</h1>
            <p className="text-sm text-muted-foreground">{companyName}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AdminModeToggle />
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
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

        {isAdminMode && (
          <div className="flex gap-2">
            <AddEmployeeDialog tenantId={user?.id || ''} onEmployeeAdded={loadEmployees} />
            <Button variant="outline" onClick={() => navigate('/options')}>
              <Settings className="mr-2 h-4 w-4" />
              Options
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pt-8">
          Created by J. Lanesskog - 2025
        </p>
      </div>
    </div>
  );
};

export default Index;
