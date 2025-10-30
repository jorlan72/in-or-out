import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';

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
  
  // Company settings
  const [editedCompanyName, setEditedCompanyName] = useState('');
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);
  
  // Account settings
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadStatuses();
    setEditedCompanyName(companyName || '');
    setNewEmail(user.email || '');
  }, [user, navigate, companyName]);

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

  const handleUpdateCompanyName = async () => {
    if (!user || !editedCompanyName.trim()) {
      toast.error('Company name cannot be empty');
      return;
    }

    if (editedCompanyName.trim().length > 100) {
      toast.error('Company name must be less than 100 characters');
      return;
    }

    setIsUpdatingCompany(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_name: editedCompanyName.trim() })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Company name updated');
      window.location.reload(); // Reload to update the context
    } catch (error) {
      console.error('Error updating company name:', error);
      toast.error('Failed to update company name');
    } finally {
      setIsUpdatingCompany(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      toast.error('Email cannot be empty');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Invalid email address');
      return;
    }

    if (newEmail.trim().length > 255) {
      toast.error('Email must be less than 255 characters');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

      if (error) throw error;

      toast.success('Email updated successfully. Please check your new email to confirm.');
    } catch (error) {
      console.error('Error updating email:', error);
      toast.error('Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      toast.error('New password cannot be empty');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
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
            <CardTitle>Company Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <div className="flex gap-2">
                <Input
                  id="companyName"
                  value={editedCompanyName}
                  onChange={(e) => setEditedCompanyName(e.target.value)}
                  placeholder="Enter company name"
                />
                <Button
                  onClick={handleUpdateCompanyName}
                  disabled={isUpdatingCompany || editedCompanyName === companyName}
                >
                  {isUpdatingCompany ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter email address"
                />
                <Button
                  onClick={handleUpdateEmail}
                  disabled={isUpdatingEmail || newEmail === user?.email}
                >
                  {isUpdatingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Change Password</h3>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

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
