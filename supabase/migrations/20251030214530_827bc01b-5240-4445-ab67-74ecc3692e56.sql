-- Create predefined_statuses table for storing status choices per tenant
CREATE TABLE public.predefined_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.predefined_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies for predefined_statuses
CREATE POLICY "Predefined statuses are viewable by everyone" 
ON public.predefined_statuses 
FOR SELECT 
USING (true);

CREATE POLICY "Predefined statuses can be inserted by anyone" 
ON public.predefined_statuses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Predefined statuses can be updated by anyone" 
ON public.predefined_statuses 
FOR UPDATE 
USING (true);

CREATE POLICY "Predefined statuses can be deleted by anyone" 
ON public.predefined_statuses 
FOR DELETE 
USING (true);

-- Insert default statuses (In and Out)
-- Note: These will be added per tenant when they first access options
CREATE INDEX idx_predefined_statuses_tenant_id ON public.predefined_statuses(tenant_id);