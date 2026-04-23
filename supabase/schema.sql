-- ============================================================
-- Espacio-tareas – Schema completo
-- Ejecutar en Supabase SQL Editor (Settings > SQL Editor)
-- ============================================================

-- ── 1. clinic (fila única) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinic (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantiza que sólo exista UNA clínica
CREATE UNIQUE INDEX IF NOT EXISTS clinic_singleton ON public.clinic ((true));

-- ── 2. profiles (linked to auth.users) ─────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id  UUID NOT NULL REFERENCES public.clinic(id),
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'worker'
               CHECK (role IN ('admin', 'worker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. categories ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES public.clinic(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#64748b',
  orden      INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. checklist_templates ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES public.clinic(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  nombre         TEXT NOT NULL,
  seccion        TEXT NOT NULL
                   CHECK (seccion IN ('apertura', 'durante_dia', 'cierre')),
  tiene_cantidad BOOLEAN NOT NULL DEFAULT false,
  unidad         TEXT,
  orden          INT     NOT NULL DEFAULT 0,
  activo         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. checklist_completions ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checklist_completions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES public.clinic(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,
  cantidad    NUMERIC,
  observacion TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, fecha, clinic_id)
);

-- ── 6. weekly_records ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weekly_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES public.clinic(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semana_inicio  DATE NOT NULL,  -- Lunes de la semana
  dia            TEXT NOT NULL
                   CHECK (dia IN ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
  actividad      TEXT NOT NULL,
  cantidad       NUMERIC,
  observacion    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Índices de rendimiento ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_checklist_completions_fecha
  ON public.checklist_completions (clinic_id, fecha);

CREATE INDEX IF NOT EXISTS idx_weekly_records_semana
  ON public.weekly_records (clinic_id, semana_inicio);

CREATE INDEX IF NOT EXISTS idx_weekly_records_user
  ON public.weekly_records (user_id, semana_inicio);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE public.clinic              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_records      ENABLE ROW LEVEL SECURITY;

-- Helper: obtiene clinic_id del usuario actual
CREATE OR REPLACE FUNCTION public.my_clinic_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ── clinic ──────────────────────────────────────────────────
CREATE POLICY "clinic: authenticated read"
  ON public.clinic FOR SELECT
  TO authenticated
  USING (true);

-- ── profiles ────────────────────────────────────────────────
CREATE POLICY "profiles: read same clinic"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (clinic_id = public.my_clinic_id());

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── categories ──────────────────────────────────────────────
CREATE POLICY "categories: read same clinic"
  ON public.categories FOR SELECT
  TO authenticated
  USING (clinic_id = public.my_clinic_id());

CREATE POLICY "categories: admin write"
  ON public.categories FOR ALL
  TO authenticated
  USING (
    clinic_id = public.my_clinic_id() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    clinic_id = public.my_clinic_id() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── checklist_templates ─────────────────────────────────────
CREATE POLICY "templates: read same clinic"
  ON public.checklist_templates FOR SELECT
  TO authenticated
  USING (clinic_id = public.my_clinic_id());

CREATE POLICY "templates: admin write"
  ON public.checklist_templates FOR ALL
  TO authenticated
  USING (
    clinic_id = public.my_clinic_id() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    clinic_id = public.my_clinic_id() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── checklist_completions ───────────────────────────────────
CREATE POLICY "completions: read same clinic"
  ON public.checklist_completions FOR SELECT
  TO authenticated
  USING (clinic_id = public.my_clinic_id());

CREATE POLICY "completions: own write"
  ON public.checklist_completions FOR ALL
  TO authenticated
  USING (clinic_id = public.my_clinic_id() AND user_id = auth.uid())
  WITH CHECK (clinic_id = public.my_clinic_id() AND user_id = auth.uid());

-- ── weekly_records ──────────────────────────────────────────
-- Workers ven solo sus propios registros
CREATE POLICY "weekly: own read"
  ON public.weekly_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "weekly: own write"
  ON public.weekly_records FOR ALL
  TO authenticated
  USING (clinic_id = public.my_clinic_id() AND user_id = auth.uid())
  WITH CHECK (clinic_id = public.my_clinic_id() AND user_id = auth.uid());

-- ============================================================
-- Trigger: crear perfil automático al registrar usuario
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_clinic_id UUID;
BEGIN
  -- Obtiene la única clínica existente
  SELECT id INTO v_clinic_id FROM public.clinic LIMIT 1;

  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'No clinic row found. Create one in the clinic table first.';
  END IF;

  INSERT INTO public.profiles (id, clinic_id, full_name, email, role)
  VALUES (
    NEW.id,
    v_clinic_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RPC: actividad global semanal (bypass RLS con SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_global_weekly_activity(p_semana_inicio DATE)
RETURNS TABLE (
  id            UUID,
  clinic_id     UUID,
  user_id       UUID,
  semana_inicio DATE,
  dia           TEXT,
  actividad     TEXT,
  cantidad      NUMERIC,
  observacion   TEXT,
  created_at    TIMESTAMPTZ,
  full_name     TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    wr.id,
    wr.clinic_id,
    wr.user_id,
    wr.semana_inicio,
    wr.dia,
    wr.actividad,
    wr.cantidad,
    wr.observacion,
    wr.created_at,
    p.full_name
  FROM public.weekly_records wr
  JOIN public.profiles p ON p.id = wr.user_id
  WHERE wr.semana_inicio = p_semana_inicio
    AND wr.clinic_id = public.my_clinic_id()
  ORDER BY wr.dia, p.full_name, wr.created_at;
$$;
