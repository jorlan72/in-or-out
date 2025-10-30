-- Create recurring_statuses table
CREATE TABLE public.recurring_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  status_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.recurring_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Recurring statuses are viewable by everyone"
ON public.recurring_statuses
FOR SELECT
USING (true);

CREATE POLICY "Recurring statuses can be inserted by anyone"
ON public.recurring_statuses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Recurring statuses can be updated by anyone"
ON public.recurring_statuses
FOR UPDATE
USING (true);

CREATE POLICY "Recurring statuses can be deleted by anyone"
ON public.recurring_statuses
FOR DELETE
USING (true);

-- Add recurring_enabled column to employees table
ALTER TABLE public.employees
ADD COLUMN recurring_enabled BOOLEAN DEFAULT false;