import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const Auth = () => {
  const [tenantName, setTenantName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setTenant } = useTenant();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantName.trim() || !password.trim()) {
      toast.error('Please enter both company name and password');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, tenant_name, password_hash')
        .eq('tenant_name', tenantName.trim())
        .single();

      if (error) {
        toast.error('Invalid credentials');
        return;
      }

      // For demo purposes, we accept "demo123" for the demo tenant
      // In production, implement proper password hashing verification
      if (data.tenant_name === 'demo' && password === 'demo123') {
        setTenant(data.id, data.tenant_name);
        toast.success('Welcome to InOrOut!');
        navigate('/');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">InOrOut</CardTitle>
          <CardDescription className="text-center">
            Track your team's status in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Company Name</Label>
              <Input
                id="tenantName"
                placeholder="Enter your company name"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Demo credentials: <span className="font-semibold">demo</span> / <span className="font-semibold">demo123</span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
