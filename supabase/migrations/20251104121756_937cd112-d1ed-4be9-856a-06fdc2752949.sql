-- Add last_applied_date column to scheduled_statuses table
ALTER TABLE public.scheduled_statuses 
ADD COLUMN last_applied_date DATE;