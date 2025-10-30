-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile for existing user
INSERT INTO public.profiles (id, company_name)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'company_name', 'My Company')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, company_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'company_name', 'My Company'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Update foreign keys
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_tenant_id_fkey;
ALTER TABLE public.employees
ADD CONSTRAINT employees_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.predefined_statuses DROP CONSTRAINT IF EXISTS predefined_statuses_tenant_id_fkey;
ALTER TABLE public.predefined_statuses
ADD CONSTRAINT predefined_statuses_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.scheduled_statuses DROP CONSTRAINT IF EXISTS scheduled_statuses_tenant_id_fkey;
ALTER TABLE public.scheduled_statuses
ADD CONSTRAINT scheduled_statuses_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.recurring_statuses DROP CONSTRAINT IF EXISTS recurring_statuses_tenant_id_fkey;
ALTER TABLE public.recurring_statuses
ADD CONSTRAINT recurring_statuses_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update RLS policies
DROP POLICY IF EXISTS "Employees are viewable by everyone" ON public.employees;
DROP POLICY IF EXISTS "Users can view their own employees" ON public.employees;
CREATE POLICY "Users can view their own employees"
ON public.employees FOR SELECT
USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Employees can be inserted by anyone" ON public.employees;
DROP POLICY IF EXISTS "Users can insert their own employees" ON public.employees;
CREATE POLICY "Users can insert their own employees"
ON public.employees FOR INSERT
WITH CHECK (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Employees can be updated by anyone" ON public.employees;
DROP POLICY IF EXISTS "Users can update their own employees" ON public.employees;
CREATE POLICY "Users can update their own employees"
ON public.employees FOR UPDATE
USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Employees can be deleted by anyone" ON public.employees;
DROP POLICY IF EXISTS "Users can delete their own employees" ON public.employees;
CREATE POLICY "Users can delete their own employees"
ON public.employees FOR DELETE
USING (auth.uid() = tenant_id);

-- Similar for other tables
DROP POLICY IF EXISTS "Predefined statuses are viewable by everyone" ON public.predefined_statuses;
DROP POLICY IF EXISTS "Users can view their own predefined statuses" ON public.predefined_statuses;
CREATE POLICY "Users can view their own predefined statuses"
ON public.predefined_statuses FOR SELECT USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Predefined statuses can be inserted by anyone" ON public.predefined_statuses;
DROP POLICY IF EXISTS "Users can insert their own predefined statuses" ON public.predefined_statuses;
CREATE POLICY "Users can insert their own predefined statuses"
ON public.predefined_statuses FOR INSERT WITH CHECK (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Predefined statuses can be updated by anyone" ON public.predefined_statuses;
DROP POLICY IF EXISTS "Users can update their own predefined statuses" ON public.predefined_statuses;
CREATE POLICY "Users can update their own predefined statuses"
ON public.predefined_statuses FOR UPDATE USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Predefined statuses can be deleted by anyone" ON public.predefined_statuses;
DROP POLICY IF EXISTS "Users can delete their own predefined statuses" ON public.predefined_statuses;
CREATE POLICY "Users can delete their own predefined statuses"
ON public.predefined_statuses FOR DELETE USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Scheduled statuses are viewable by everyone" ON public.scheduled_statuses;
DROP POLICY IF EXISTS "Users can view their own scheduled statuses" ON public.scheduled_statuses;
CREATE POLICY "Users can view their own scheduled statuses"
ON public.scheduled_statuses FOR SELECT USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Scheduled statuses can be inserted by anyone" ON public.scheduled_statuses;
DROP POLICY IF EXISTS "Users can insert their own scheduled statuses" ON public.scheduled_statuses;
CREATE POLICY "Users can insert their own scheduled statuses"
ON public.scheduled_statuses FOR INSERT WITH CHECK (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Scheduled statuses can be updated by anyone" ON public.scheduled_statuses;
DROP POLICY IF EXISTS "Users can update their own scheduled statuses" ON public.scheduled_statuses;
CREATE POLICY "Users can update their own scheduled statuses"
ON public.scheduled_statuses FOR UPDATE USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Scheduled statuses can be deleted by anyone" ON public.scheduled_statuses;
DROP POLICY IF EXISTS "Users can delete their own scheduled statuses" ON public.scheduled_statuses;
CREATE POLICY "Users can delete their own scheduled statuses"
ON public.scheduled_statuses FOR DELETE USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Recurring statuses are viewable by everyone" ON public.recurring_statuses;
DROP POLICY IF EXISTS "Users can view their own recurring statuses" ON public.recurring_statuses;
CREATE POLICY "Users can view their own recurring statuses"
ON public.recurring_statuses FOR SELECT USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Recurring statuses can be inserted by anyone" ON public.recurring_statuses;
DROP POLICY IF EXISTS "Users can insert their own recurring statuses" ON public.recurring_statuses;
CREATE POLICY "Users can insert their own recurring statuses"
ON public.recurring_statuses FOR INSERT WITH CHECK (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Recurring statuses can be updated by anyone" ON public.recurring_statuses;
DROP POLICY IF EXISTS "Users can update their own recurring statuses" ON public.recurring_statuses;
CREATE POLICY "Users can update their own recurring statuses"
ON public.recurring_statuses FOR UPDATE USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Recurring statuses can be deleted by anyone" ON public.recurring_statuses;
DROP POLICY IF EXISTS "Users can delete their own recurring statuses" ON public.recurring_statuses;
CREATE POLICY "Users can delete their own recurring statuses"
ON public.recurring_statuses FOR DELETE USING (auth.uid() = tenant_id);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';