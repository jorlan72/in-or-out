-- Add tracking fields to employees table to prevent duplicate status applications
ALTER TABLE employees 
ADD COLUMN already_applied boolean DEFAULT false,
ADD COLUMN applied_date date;