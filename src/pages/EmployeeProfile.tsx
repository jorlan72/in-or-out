import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminMode } from '@/contexts/AdminModeContext';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Upload, Trash2, Calendar as CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  image_url: string | null;
  recurring_enabled: boolean;
}

interface ScheduledStatus {
  id: string;
  scheduled_date: string;
  status_text: string;
}

interface RecurringStatus {
  id: string;
  day_of_week: number;
  status_text: string;
}

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdminMode } = useAdminMode();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [scheduledStatuses, setScheduledStatuses] = useState<ScheduledStatus[]>([]);
  const [predefinedStatuses, setPredefinedStatuses] = useState<string[]>([]);
  const [newScheduledDate, setNewScheduledDate] = useState<Date | undefined>(undefined);
  const [newScheduledStatus, setNewScheduledStatus] = useState('');
  const [showCustomStatusInput, setShowCustomStatusInput] = useState(false);
  const [recurringStatuses, setRecurringStatuses] = useState<RecurringStatus[]>([]);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [editingRecurringDay, setEditingRecurringDay] = useState<{ [key: number]: string }>({});
  const [showCustomRecurringInput, setShowCustomRecurringInput] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (id) {
      loadEmployee();
      loadScheduledStatuses();
      loadPredefinedStatuses();
      loadRecurringStatuses();
    }
  }, [id, user, navigate]);

  const loadEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', user?.id)
        .single();

      if (error) throw error;

      setEmployee(data);
      setFormData({
        name: data.name,
        phone: data.phone || '',
        email: data.email || '',
      });
      setRecurringEnabled(data.recurring_enabled || false);
    } catch (error) {
      console.error('Error loading employee:', error);
      toast.error('Failed to load employee');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedUpdate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (field: 'name' | 'phone' | 'email', value: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          // Validate name
          if (field === 'name' && !value.trim()) {
            toast.error('Name cannot be empty');
            return;
          }

          // Validate name length
          if (field === 'name' && value.trim().length > 100) {
            toast.error('Name must be less than 100 characters');
            return;
          }

          // Validate email format
          if (field === 'email' && value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value.trim())) {
              toast.error('Invalid email address');
              return;
            }
            if (value.trim().length > 255) {
              toast.error('Email must be less than 255 characters');
              return;
            }
          }

          // Validate phone length
          if (field === 'phone' && value.trim().length > 50) {
            toast.error('Phone number must be less than 50 characters');
            return;
          }

          try {
            const { error } = await supabase
              .from('employees')
              .update({ [field]: value.trim() || null })
              .eq('id', id);

            if (error) throw error;
          } catch (error) {
            console.error('Error updating employee:', error);
            toast.error(`Failed to update ${field}`);
          }
        }, 1000);
      };
    })(),
    [id]
  );

  const handleFieldChange = (field: 'name' | 'phone' | 'email', value: string) => {
    setFormData({ ...formData, [field]: value });
    debouncedUpdate(field, value);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('employees')
        .update({ image_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Image uploaded successfully');
      loadEmployee();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const loadScheduledStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_statuses')
        .select('*')
        .eq('employee_id', id)
        .eq('tenant_id', user?.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      setScheduledStatuses(data || []);
    } catch (error) {
      console.error('Error loading scheduled statuses:', error);
    }
  };

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

  const handleAddScheduledStatus = async () => {
    if (!newScheduledDate || !newScheduledStatus.trim()) {
      toast.error('Please select a date and enter a status');
      return;
    }

    try {
      const { error } = await supabase
        .from('scheduled_statuses')
        .insert({
          employee_id: id,
          tenant_id: user?.id,
          scheduled_date: format(newScheduledDate, 'yyyy-MM-dd'),
          status_text: newScheduledStatus.trim(),
        });

      if (error) throw error;

      toast.success('Scheduled status added');
      setNewScheduledDate(undefined);
      setNewScheduledStatus('');
      loadScheduledStatuses();
    } catch (error) {
      console.error('Error adding scheduled status:', error);
      toast.error('Failed to add scheduled status');
    }
  };

  const handleDeleteScheduledStatus = async (statusId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_statuses')
        .delete()
        .eq('id', statusId);

      if (error) throw error;

      toast.success('Scheduled status removed');
      loadScheduledStatuses();
    } catch (error) {
      console.error('Error deleting scheduled status:', error);
      toast.error('Failed to remove scheduled status');
    }
  };

  const loadRecurringStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_statuses')
        .select('*')
        .eq('employee_id', id)
        .eq('tenant_id', user?.id)
        .order('day_of_week');

      if (error) throw error;

      setRecurringStatuses(data || []);
    } catch (error) {
      console.error('Error loading recurring statuses:', error);
    }
  };

  const handleToggleRecurring = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ recurring_enabled: enabled })
        .eq('id', id);

      if (error) throw error;

      setRecurringEnabled(enabled);
      toast.success(enabled ? 'Recurring statuses enabled' : 'Recurring statuses disabled');
    } catch (error) {
      console.error('Error updating recurring enabled:', error);
      toast.error('Failed to update setting');
    }
  };

  const handleSaveRecurringStatus = async (dayOfWeek: number, statusText: string) => {
    try {
      const existing = recurringStatuses.find(rs => rs.day_of_week === dayOfWeek);
      
      if (statusText.trim() === '') {
        // Delete if empty
        if (existing) {
          const { error } = await supabase
            .from('recurring_statuses')
            .delete()
            .eq('id', existing.id);

          if (error) throw error;
        }
      } else {
        // Insert or update
        const { error } = await supabase
          .from('recurring_statuses')
          .upsert({
            id: existing?.id,
            employee_id: id,
            tenant_id: user?.id,
            day_of_week: dayOfWeek,
            status_text: statusText.trim(),
          });

        if (error) throw error;
      }

      loadRecurringStatuses();
      setEditingRecurringDay({});
    } catch (error) {
      console.error('Error saving recurring status:', error);
      toast.error('Failed to save recurring status');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Employee removed successfully');
      navigate('/');
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to remove employee');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  const initials = employee.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Employee Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={employee.image_url || undefined} />
                <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Label htmlFor="image-upload">
                  <Button
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Picture
                      </>
                    )}
                  </Button>
                </Label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Statuses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !newScheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newScheduledDate ? format(newScheduledDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newScheduledDate}
                      onSelect={setNewScheduledDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                {showCustomStatusInput ? (
                  <Input
                    value={newScheduledStatus}
                    onChange={(e) => setNewScheduledStatus(e.target.value)}
                    placeholder="Enter custom status"
                    className="flex-1"
                  />
                ) : (
                  <Select 
                    value={predefinedStatuses.includes(newScheduledStatus) ? newScheduledStatus : '__placeholder__'} 
                    onValueChange={(value) => {
                      if (value === '__custom__') {
                        setShowCustomStatusInput(true);
                        setNewScheduledStatus('');
                      } else {
                        setNewScheduledStatus(value);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={!predefinedStatuses.includes(newScheduledStatus) && newScheduledStatus ? newScheduledStatus : 'Select status'} />
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

                <Button
                  onClick={() => setShowCustomStatusInput(!showCustomStatusInput)}
                  variant="secondary"
                  size="icon"
                >
                  {showCustomStatusInput ? '☰' : '✎'}
                </Button>

                <Button onClick={handleAddScheduledStatus} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {scheduledStatuses.length > 0 ? (
              <div className="space-y-2">
                {scheduledStatuses.map((scheduled) => (
                  <div
                    key={scheduled.id}
                    className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                  >
                    <div className="flex gap-3">
                      <span className="font-medium">
                        {format(new Date(scheduled.scheduled_date), 'MMM dd, yyyy')}
                      </span>
                      <span className="text-muted-foreground">
                        {scheduled.status_text}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteScheduledStatus(scheduled.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No scheduled statuses
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recurring Statuses</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="recurring-toggle" className="text-sm">
                  {recurringEnabled ? 'Enabled' : 'Disabled'}
                </Label>
                <Switch
                  id="recurring-toggle"
                  checked={recurringEnabled}
                  onCheckedChange={handleToggleRecurring}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { day: 'Monday', dayOfWeek: 1 },
                { day: 'Tuesday', dayOfWeek: 2 },
                { day: 'Wednesday', dayOfWeek: 3 },
                { day: 'Thursday', dayOfWeek: 4 },
                { day: 'Friday', dayOfWeek: 5 },
                { day: 'Saturday', dayOfWeek: 6 },
                { day: 'Sunday', dayOfWeek: 0 },
              ].map(({ day, dayOfWeek }) => {
                const existing = recurringStatuses.find(rs => rs.day_of_week === dayOfWeek);
                const isEditing = editingRecurringDay[dayOfWeek] !== undefined;
                const currentValue = isEditing ? editingRecurringDay[dayOfWeek] : (existing?.status_text || '');
                const showCustom = showCustomRecurringInput[dayOfWeek] || false;

                return (
                  <div key={day} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                    <span className="font-medium w-24">{day}</span>
                    
                    {showCustom ? (
                      <Input
                        value={currentValue}
                        onChange={(e) => setEditingRecurringDay({ ...editingRecurringDay, [dayOfWeek]: e.target.value })}
                        onBlur={() => {
                          if (isEditing) {
                            handleSaveRecurringStatus(dayOfWeek, currentValue);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveRecurringStatus(dayOfWeek, currentValue);
                          }
                        }}
                        placeholder="Enter custom status"
                        className="flex-1"
                      />
                    ) : (
                      <Select
                        value={predefinedStatuses.includes(currentValue) ? currentValue : '__placeholder__'}
                        onValueChange={(value) => {
                          if (value === '__custom__') {
                            setShowCustomRecurringInput({ ...showCustomRecurringInput, [dayOfWeek]: true });
                            setEditingRecurringDay({ ...editingRecurringDay, [dayOfWeek]: '' });
                          } else {
                            handleSaveRecurringStatus(dayOfWeek, value);
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={currentValue || 'Select status'} />
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

                    <Button
                      onClick={() => setShowCustomRecurringInput({ ...showCustomRecurringInput, [dayOfWeek]: !showCustom })}
                      variant="secondary"
                      size="icon"
                    >
                      {showCustom ? '☰' : '✎'}
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              When enabled, these statuses will automatically apply based on the current day of the week.
            </p>
          </CardContent>
        </Card>

        {isAdminMode && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Person
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {employee.name} from your team. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfile;
