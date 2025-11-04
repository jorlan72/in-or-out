import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Settings, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { useAdminMode } from '@/contexts/AdminModeContext';
import { useDailyMessageVisibility } from '@/contexts/DailyMessageVisibilityContext';
import EmployeeTable from '@/components/EmployeeTable';
import EmployeeCardView from '@/components/EmployeeCardView';
import AddEmployeeDialog from '@/components/AddEmployeeDialog';
import { DailyMessage } from '@/components/DailyMessage';
import { Footer } from '@/components/Footer';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    const saved = localStorage.getItem('viewMode');
    return (saved === 'cards' || saved === 'table') ? saved : 'table';
  });

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

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
        async (payload) => {
          console.log('Employee change detected:', payload);
          // Only refetch data, don't reapply status logic
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('tenant_id', user.id)
            .order('created_at', { ascending: true });

          if (!error) {
            setEmployees(data || []);
          }
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
      const today = new Date().toISOString().split('T')[0];

      // Step 1: Get employees that haven't been processed today
      const { data: allEmployees, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', user.id);

      if (fetchError) throw fetchError;

      const employeesToProcess = allEmployees?.filter(emp => 
        !emp.already_applied || emp.applied_date !== today
      ) || [];

      // Step 2 & 3: Apply statuses for employees that need processing
      if (employeesToProcess.length > 0) {
        await applyRecurringStatuses(employeesToProcess.map(e => e.id), today);
        await applyScheduledStatuses(employeesToProcess.map(e => e.id), today);
      }

      // Fetch updated employee data
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error loading employees:', error);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        toast.error('Failed to load employees');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const applyScheduledStatuses = async (employeeIds: string[], today: string) => {
    if (!user) return;

    try {
      // Get scheduled statuses for today for the specified employees
      const { data: scheduledStatuses, error: fetchError } = await supabase
        .from('scheduled_statuses')
        .select('*')
        .eq('tenant_id', user.id)
        .eq('scheduled_date', today)
        .in('employee_id', employeeIds);

      if (fetchError) throw fetchError;
      if (!scheduledStatuses || scheduledStatuses.length === 0) return;

      // Step 3: Update employee statuses with scheduled status
      for (const status of scheduledStatuses) {
        await supabase
          .from('employees')
          .update({ 
            status: status.status_text,
            already_applied: true,
            applied_date: today
          })
          .eq('id', status.employee_id);
      }

    // Delete only past scheduled statuses (before today)
    await supabase
      .from('scheduled_statuses')
      .delete()
      .eq('tenant_id', user.id)
      .lt('scheduled_date', today);

    } catch (error: any) {
      console.error('Error applying scheduled statuses:', error);
    }
  };

  const applyRecurringStatuses = async (employeeIds: string[], today: string) => {
    if (!user) return;

    try {
      const currentDayOfWeek = new Date().getDay();

      // Get recurring statuses for today's day of week for the specified employees
      const { data: recurringStatuses, error: recurringError } = await supabase
        .from('recurring_statuses')
        .select('*')
        .eq('tenant_id', user.id)
        .eq('day_of_week', currentDayOfWeek)
        .in('employee_id', employeeIds);

      if (recurringError) throw recurringError;
      if (!recurringStatuses || recurringStatuses.length === 0) return;

      // Get scheduled statuses for today to avoid overwriting them
      const { data: scheduledToday } = await supabase
        .from('scheduled_statuses')
        .select('employee_id')
        .eq('tenant_id', user.id)
        .eq('scheduled_date', today)
        .in('employee_id', employeeIds);

      const employeesWithScheduled = new Set(scheduledToday?.map(s => s.employee_id) || []);

      // Step 2: Apply recurring statuses (only if no scheduled status exists)
      for (const recurring of recurringStatuses) {
        if (!employeesWithScheduled.has(recurring.employee_id)) {
          await supabase
            .from('employees')
            .update({ 
              status: recurring.status_text,
              already_applied: true,
              applied_date: today
            })
            .eq('id', recurring.employee_id);
        }
      }

    } catch (error: any) {
      console.error('Error applying recurring statuses:', error);
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="InOrOut Logo" className="h-8 w-8" />
            <h1 className="text-3xl font-bold text-foreground">InOrOut</h1>
          </div>
          <p className="text-sm text-muted-foreground">{companyName}</p>
        </div>

        <div className="flex items-center justify-between">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as 'table' | 'cards')}
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <TableIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

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

        <Card>
          <CardContent className="p-4">
            {employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No team members yet. Add your first person to get started!</p>
              </div>
            ) : viewMode === 'table' ? (
              <EmployeeTable employees={employees} onEmployeeUpdate={loadEmployees} />
            ) : (
              <EmployeeCardView employees={employees} onEmployeeUpdate={loadEmployees} />
            )}
          </CardContent>
        </Card>

        {isDailyMessageVisible && <DailyMessage tenantId={user?.id || ''} />}
      </div>
      
      <Footer onLogout={handleLogout} />
    </div>
  );
};

export default Index;
