-- Create tenants table for company credentials
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'Available',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants (read-only for checking credentials)
CREATE POLICY "Tenants are viewable by anyone"
  ON public.tenants
  FOR SELECT
  USING (true);

-- RLS Policies for employees (full access for now, we'll validate tenant in app logic)
CREATE POLICY "Employees are viewable by everyone"
  ON public.employees
  FOR SELECT
  USING (true);

CREATE POLICY "Employees can be inserted by anyone"
  ON public.employees
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Employees can be updated by anyone"
  ON public.employees
  FOR UPDATE
  USING (true);

CREATE POLICY "Employees can be deleted by anyone"
  ON public.employees
  FOR DELETE
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a demo tenant for testing (password: "demo123")
-- Password hash generated with bcrypt for "demo123"
INSERT INTO public.tenants (tenant_name, password_hash)
VALUES ('demo', '$2a$10$rXKX8tXQF5LqM5M6yP3qH.J7g8eXKvO8pZ4pK9yN1jX7L1vC8uY.G');

-- Create storage bucket for employee images
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-images', 'employee-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee images
CREATE POLICY "Employee images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'employee-images');

CREATE POLICY "Anyone can upload employee images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'employee-images');

CREATE POLICY "Anyone can update employee images"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'employee-images');

CREATE POLICY "Anyone can delete employee images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'employee-images');