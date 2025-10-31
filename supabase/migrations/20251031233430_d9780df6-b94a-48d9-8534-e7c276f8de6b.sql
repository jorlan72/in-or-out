-- Create daily_messages table
CREATE TABLE public.daily_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  message_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable Row Level Security
ALTER TABLE public.daily_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own daily messages"
ON public.daily_messages
FOR SELECT
USING (auth.uid() = tenant_id);

CREATE POLICY "Users can insert their own daily messages"
ON public.daily_messages
FOR INSERT
WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can update their own daily messages"
ON public.daily_messages
FOR UPDATE
USING (auth.uid() = tenant_id);

CREATE POLICY "Users can delete their own daily messages"
ON public.daily_messages
FOR DELETE
USING (auth.uid() = tenant_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_messages_updated_at
BEFORE UPDATE ON public.daily_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();