
-- Create Row Level Security (RLS) policies for the domains table
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Domains are either owned by a specific user or are public (user_id is null)
CREATE POLICY "Users can view their own domains" 
  ON public.domains 
  FOR SELECT 
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own domains" 
  ON public.domains 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains" 
  ON public.domains 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains" 
  ON public.domains 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for the learning_loops table
ALTER TABLE public.learning_loops ENABLE ROW LEVEL SECURITY;

-- Learning loops are associated with a domain, which is either public or owned by a user
CREATE POLICY "Users can view loops for their domains" 
  ON public.learning_loops 
  FOR SELECT 
  USING (
    user_id IS NULL 
    OR auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.domains 
      WHERE domains.id = learning_loops.domain_id 
      AND (domains.user_id = auth.uid() OR domains.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert loops" 
  ON public.learning_loops 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loops" 
  ON public.learning_loops 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loops" 
  ON public.learning_loops 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for the knowledge_nodes table
ALTER TABLE public.knowledge_nodes ENABLE ROW LEVEL SECURITY;

-- Knowledge nodes are associated with a domain, which is either public or owned by a user
CREATE POLICY "Users can view nodes for their domains" 
  ON public.knowledge_nodes 
  FOR SELECT 
  USING (
    user_id IS NULL 
    OR auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.domains 
      WHERE domains.id = knowledge_nodes.domain_id 
      AND (domains.user_id = auth.uid() OR domains.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert nodes" 
  ON public.knowledge_nodes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nodes" 
  ON public.knowledge_nodes 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nodes" 
  ON public.knowledge_nodes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for the knowledge_edges table
ALTER TABLE public.knowledge_edges ENABLE ROW LEVEL SECURITY;

-- Knowledge edges are associated with nodes, which are associated with domains
CREATE POLICY "Users can view edges for their nodes" 
  ON public.knowledge_edges 
  FOR SELECT 
  USING (
    user_id IS NULL 
    OR auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.knowledge_nodes 
      WHERE knowledge_nodes.id = knowledge_edges.source_id 
      AND (knowledge_nodes.user_id = auth.uid() OR knowledge_nodes.user_id IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.knowledge_nodes 
      WHERE knowledge_nodes.id = knowledge_edges.target_id 
      AND (knowledge_nodes.user_id = auth.uid() OR knowledge_nodes.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert edges" 
  ON public.knowledge_edges 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own edges" 
  ON public.knowledge_edges 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own edges" 
  ON public.knowledge_edges 
  FOR DELETE 
  USING (auth.uid() = user_id);
