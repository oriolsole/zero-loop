
-- Create agent_reflections table to track autonomous decision making
CREATE TABLE IF NOT EXISTS public.agent_reflections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_message_id UUID NOT NULL,
    follow_up_message_id UUID,
    reflection_reasoning TEXT,
    follow_up_decision BOOLEAN DEFAULT false,
    next_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.agent_reflections ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own reflections
CREATE POLICY "Users can view own reflections" ON public.agent_reflections
    FOR SELECT USING (
        parent_message_id IN (
            SELECT id FROM public.agent_conversations 
            WHERE user_id = auth.uid()
        )
    );

-- Policy to allow service role to insert reflections
CREATE POLICY "Service role can insert reflections" ON public.agent_reflections
    FOR INSERT WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_reflections_parent_message ON public.agent_reflections(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_agent_reflections_created_at ON public.agent_reflections(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_reflections_follow_up_decision ON public.agent_reflections(follow_up_decision);

-- Add foreign key constraint
ALTER TABLE public.agent_reflections 
ADD CONSTRAINT fk_agent_reflections_parent_message 
FOREIGN KEY (parent_message_id) 
REFERENCES public.agent_conversations(id) 
ON DELETE CASCADE;

-- Add trigger to update timestamp
CREATE TRIGGER update_agent_reflections_timestamp
    BEFORE UPDATE ON public.agent_reflections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp();
