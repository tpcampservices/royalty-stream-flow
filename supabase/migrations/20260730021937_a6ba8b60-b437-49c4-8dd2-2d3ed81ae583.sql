CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code text,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'writer',
  email text,
  phone text,
  ipi_number text,
  address text,
  bank_name text,
  bank_account text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO anon, authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sound_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_code text,
  isrc text,
  title text NOT NULL,
  alternate_title text,
  artist text,
  album text,
  label text,
  duration_seconds integer,
  release_year integer,
  genre text,
  status text NOT NULL DEFAULT 'registered',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sound_recordings TO anon, authenticated;
GRANT ALL ON public.sound_recordings TO service_role;
ALTER TABLE public.sound_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to sound_recordings" ON public.sound_recordings FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER sound_recordings_updated_at BEFORE UPDATE ON public.sound_recordings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recording_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL REFERENCES public.sound_recordings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Composer',
  percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recording_shares TO anon, authenticated;
GRANT ALL ON public.recording_shares TO service_role;
ALTER TABLE public.recording_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to recording_shares" ON public.recording_shares FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.licensees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL DEFAULT 'radio',
  licence_type text,
  licence_number text,
  status text NOT NULL DEFAULT 'active',
  licence_fee numeric NOT NULL DEFAULT 0,
  contact_email text,
  contact_phone text,
  address text,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licensees TO anon, authenticated;
GRANT ALL ON public.licensees TO service_role;
ALTER TABLE public.licensees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to licensees" ON public.licensees FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER licensees_updated_at BEFORE UPDATE ON public.licensees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.weighting_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  source_type text NOT NULL DEFAULT 'event',
  diffusion_type text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weighting_rules TO anon, authenticated;
GRANT ALL ON public.weighting_rules TO service_role;
ALTER TABLE public.weighting_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to weighting_rules" ON public.weighting_rules FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER weighting_rules_updated_at BEFORE UPDATE ON public.weighting_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  source_type text NOT NULL DEFAULT 'event',
  period text NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  total_weighted_points numeric NOT NULL DEFAULT 0,
  point_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pools TO anon, authenticated;
GRANT ALL ON public.pools TO service_role;
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to pools" ON public.pools FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER pools_updated_at BEFORE UPDATE ON public.pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid REFERENCES public.pools(id) ON DELETE SET NULL,
  licensee_id uuid REFERENCES public.licensees(id) ON DELETE SET NULL,
  source text,
  usage_date date,
  recording_id uuid REFERENCES public.sound_recordings(id) ON DELETE SET NULL,
  isrc text,
  recording_code text,
  song_title text,
  performing_artist text,
  original_performer text,
  diffusion_type text,
  usage_code text,
  quantity integer NOT NULL DEFAULT 1,
  weight numeric NOT NULL DEFAULT 0,
  matched boolean NOT NULL DEFAULT false,
  allocation numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_logs TO anon, authenticated;
GRANT ALL ON public.usage_logs TO service_role;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to usage_logs" ON public.usage_logs FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER usage_logs_updated_at BEFORE UPDATE ON public.usage_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  pool_id uuid REFERENCES public.pools(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  method text,
  reference text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO anon, authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_usage_logs_pool ON public.usage_logs(pool_id);
CREATE INDEX idx_usage_logs_recording ON public.usage_logs(recording_id);
CREATE INDEX idx_recording_shares_recording ON public.recording_shares(recording_id);
CREATE INDEX idx_payments_member ON public.payments(member_id);