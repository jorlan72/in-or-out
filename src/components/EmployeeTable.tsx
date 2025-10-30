import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface EmployeeTableProps {
  employees: Employee[];
  onEmployeeUpdate: () => void;
}

const EmployeeTable = ({ employees, onEmployeeUpdate }: EmployeeTableProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [predefinedStatuses, setPredefinedStatuses] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);

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
    setShowCustomInput(false); // Always start with dropdown
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
    <div className="space-y-2">
      {employees.map((employee) => (
        <div
          key={employee.id}
          className="grid grid-cols-[auto_auto_1fr] items-center gap-3 p-2 bg-card rounded-lg border border-border hover:border-primary/50 transition-all"
        >
          <Avatar
            className="h-10 w-10 cursor-pointer"
            onClick={() => navigate(`/employee/${employee.id}`)}
          >
            <AvatarImage src={employee.image_url || undefined} />
            <AvatarFallback className="text-sm">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          
          <button
            onClick={() => navigate(`/employee/${employee.id}`)}
            className="text-left font-medium text-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            {employee.name}
          </button>
          
          {editingId === employee.id ? (
            <div className="flex gap-2 min-w-0">
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
              className="text-left text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded hover:bg-accent min-w-0"
            >
              {employee.status}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default EmployeeTable;
