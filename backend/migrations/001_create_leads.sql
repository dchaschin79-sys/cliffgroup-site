CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  form_type TEXT NOT NULL CHECK (form_type IN ('demo', 'contact', 'walkthrough')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  role TEXT,
  phone TEXT,
  team_size TEXT,
  message TEXT,
  operational_problem TEXT,
  source_page TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_form_type ON leads (form_type);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
