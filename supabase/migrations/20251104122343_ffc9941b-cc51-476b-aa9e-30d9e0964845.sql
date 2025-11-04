-- Add last_applied_date column to recurring_statuses table
ALTER TABLE public.recurring_statuses 
ADD COLUMN last_applied_date DATE;