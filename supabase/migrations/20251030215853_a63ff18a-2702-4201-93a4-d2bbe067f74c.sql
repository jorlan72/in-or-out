-- Create table for scheduled statuses
CREATE TABLE public.scheduled_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  scheduled_date DATE NOT NULL,
  status_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scheduled_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduled statuses
CREATE POLICY "Scheduled statuses are viewable by everyone" 
ON public.scheduled_statuses 
FOR SELECT 
USING (true);

CREATE POLICY "Scheduled statuses can be inserted by anyone" 
ON public.scheduled_statuses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Scheduled statuses can be updated by anyone" 
ON public.scheduled_statuses 
FOR UPDATE 
USING (true);

CREATE POLICY "Scheduled statuses can be deleted by anyone" 
ON public.scheduled_statuses 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_scheduled_statuses_employee ON public.scheduled_statuses(employee_id);
CREATE INDEX idx_scheduled_statuses_date ON public.scheduled_statuses(scheduled_date);