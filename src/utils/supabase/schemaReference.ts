
/**
 * Schema definition for reference (matches the tables created in Supabase)
 */
export const supabaseSchema = {
  tables: {
    learning_loops: `
      id uuid primary key,
      domain_id text not null,
      task text not null,
      solution text not null,
      verification text not null, 
      reflection text not null,
      success boolean not null,
      score integer not null,
      created_at timestamp with time zone default now(),
      metadata jsonb,
      user_id uuid references auth.users
    `,
    knowledge_nodes: `
      id uuid primary key,
      title text not null,
      description text not null,
      type text not null,
      domain_id text not null,
      discovered_in_loop integer not null,
      confidence numeric not null,
      created_at timestamp with time zone default now(),
      metadata jsonb,
      user_id uuid references auth.users
    `,
    knowledge_edges: `
      id uuid primary key,
      source_id uuid references knowledge_nodes(id) not null,
      target_id uuid references knowledge_nodes(id) not null,
      type text not null,
      strength numeric not null,
      label text,
      created_at timestamp with time zone default now(),
      user_id uuid references auth.users
    `,
    domains: `
      id uuid primary key,
      name text not null,
      short_desc text,
      description text,
      total_loops integer default 0,
      created_at timestamp with time zone default now(),
      updated_at timestamp with time zone default now(),
      user_id uuid references auth.users,
      metadata jsonb
    `
  }
};
