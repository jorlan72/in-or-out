import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Employee {
  id: string;
  name: string;
  status: string;
  image_url: string | null;
}

interface EmployeeCardViewProps {
  employees: Employee[];
  onEmployeeUpdate: () => void;
}

const EmployeeCardView = ({ employees, onEmployeeUpdate }: EmployeeCardViewProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [predefinedStatuses, setPredefinedStatuses] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const sortedEmployees = [...employees].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  useEffect(() => {
    loadPredefinedStatuses();
  }, [user]);

  const loadPredefinedStatuses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('predefined_statuses')
        .select('status_text')
        .eq('tenant_id', user.id)
        .order('created_at');

      if (error) throw error;

      setPredefinedStatuses(data?.map(s => s.status_text) || []);
    } catch (error) {
      console.error('Error loading predefined statuses:', error);
    }
  };

  const handleStartEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setEditValue(employee.status);
    setShowCustomInput(false);
  };

  const handleSaveStatus = async (employeeId: string, statusValue?: string) => {
    const valueToSave = statusValue || editValue;
    try {
      const { error } = await supabase
        .from('employees')
        .update({ status: valueToSave })
        .eq('id', employeeId);

      if (error) throw error;

      setEditingId(null);
      setShowCustomInput(false);
      onEmployeeUpdate();
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleSelectChange = async (value: string, employeeId: string) => {
    if (value === '__custom__') {
      setShowCustomInput(true);
      setEditValue('');
    } else {
      await handleSaveStatus(employeeId, value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, employeeId: string) => {
    if (e.key === 'Enter') {
      handleSaveStatus(employeeId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedEmployees.map((employee) => (
        <Card key={employee.id} className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4 space-y-3">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate(`/employee/${employee.id}`)}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={employee.image_url || undefined} />
                <AvatarFallback className="text-sm">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="font-medium text-foreground hover:text-primary transition-colors">
                {employee.name}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Status</div>
              {editingId === employee.id ? (
                <div className="flex gap-2">
                  {showCustomInput ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleSaveStatus(employee.id)}
                      onKeyDown={(e) => handleKeyDown(e, employee.id)}
                      autoFocus
                      className="h-8 flex-1"
                      placeholder="Enter custom status"
                    />
                  ) : (
                    <Select
                      value={predefinedStatuses.includes(editValue) ? editValue : '__placeholder__'}
                      onValueChange={(value) => handleSelectChange(value, employee.id)}
                    >
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue placeholder={!predefinedStatuses.includes(editValue) ? editValue : 'Select status'} />
                      </SelectTrigger>
                      <SelectContent>
                        {predefinedStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <button
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className="text-xs px-2 py-1 h-8 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >
                    {showCustomInput ? '☰' : '✎'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleStartEdit(employee)}
                  className="text-left text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded hover:bg-accent w-full text-left"
                >
                  {employee.status}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EmployeeCardView;
