import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { LogOut, Loader2 } from 'lucide-react';
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

        <AddEmployeeDialog tenantId={tenantId || ''} onEmployeeAdded={loadEmployees} />
      </div>
    </div>
  );
};

export default Index;
