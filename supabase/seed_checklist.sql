-- ============================================================
-- Espacio-tareas v2 — Seed: Categories + Checklist Templates
-- Migrado desde Tareas-ML/CHECKLIST_SETUP.sql
-- Solo INSERTs — no modifica el schema existente
-- PRE: schema.sql ejecutado + public.clinic con exactamente 1 fila
-- ============================================================

-- ── 1. CATEGORIES ──────────────────────────────────────────
-- 10 categorías únicas deduplicadas del checklist original

WITH clinic AS (SELECT id FROM public.clinic LIMIT 1)
INSERT INTO public.categories (clinic_id, name, color, orden)
SELECT c.id, cat.name, cat.color, cat.orden
FROM clinic c
CROSS JOIN (VALUES
  ('Instalaciones', '#3b82f6',  1),
  ('Salas y orden', '#8b5cf6',  2),
  ('Zona cliente',  '#f59e0b',  3),
  ('Operativa',     '#10b981',  4),
  ('Limpieza',      '#06b6d4',  5),
  ('Comunicación',  '#ef4444',  6),
  ('Gestión',       '#6366f1',  7),
  ('Formación',     '#f97316',  8),
  ('Presencia',     '#ec4899',  9),
  ('Actitud',       '#84cc16', 10)
) AS cat(name, color, orden);


-- ── 2. CHECKLIST TEMPLATES ─────────────────────────────────
-- 58 ítems diarios (apertura: 27, durante_dia: 17, cierre: 14)
-- Tipo 'semanal' excluido → ver sección 3
--
-- Campos con tiene_cantidad = true:
--   • "Anotar efectivo inicial de caja"             → unidad: €
--   • "Anotar número de consentimientos firmados"   → unidad: uds

INSERT INTO public.checklist_templates
  (clinic_id, category_id, nombre, seccion, tiene_cantidad, unidad, orden)
SELECT
  (SELECT id FROM public.clinic LIMIT 1),
  (SELECT id FROM public.categories
     WHERE clinic_id = (SELECT id FROM public.clinic LIMIT 1)
       AND name = t.cat
     LIMIT 1),
  t.nombre,
  t.seccion,
  t.tc::boolean,
  t.unidad,
  t.orden::int
FROM (VALUES

  -- ── APERTURA / Instalaciones ─────────────────────────────
  ('Instalaciones', 'apertura', 'Encender luces generales',              'false', NULL,  1),
  ('Instalaciones', 'apertura', 'Encender música',                       'false', NULL,  2),
  ('Instalaciones', 'apertura', 'Encender televisión',                   'false', NULL,  3),
  ('Instalaciones', 'apertura', 'Encender luces de las salas',           'false', NULL,  4),
  ('Instalaciones', 'apertura', 'Comprobar enchufes de las máquinas',    'false', NULL,  5),
  ('Instalaciones', 'apertura', 'Subir persiana',                        'false', NULL,  6),
  ('Instalaciones', 'apertura', 'Revisar luz de la escalera (carga)',    'false', NULL,  7),

  -- ── APERTURA / Salas y orden ─────────────────────────────
  ('Salas y orden', 'apertura', 'Preparación de salas',                              'false', NULL,  8),
  ('Salas y orden', 'apertura', 'Revisar duplicidades en salas/aparatología',        'false', NULL,  9),
  ('Salas y orden', 'apertura', 'Revisar agenda del día y del día siguiente',        'false', NULL, 10),
  ('Salas y orden', 'apertura', 'Repasar papeleras',                                'false', NULL, 11),

  -- ── APERTURA / Zona cliente ──────────────────────────────
  ('Zona cliente',  'apertura', 'Revisar mueble de café y agua',         'false', NULL, 12),

  -- ── APERTURA / Operativa ─────────────────────────────────
  ('Operativa',     'apertura', 'Poner lavadoras y secadoras en marcha', 'false', NULL, 13),
  ('Operativa',     'apertura', 'Comprobar batería de móvil y tablets',  'false', NULL, 14),
  ('Operativa',     'apertura', 'Anotar efectivo inicial de caja',       'true',  '€',  15),

  -- ── APERTURA / Limpieza ──────────────────────────────────
  ('Limpieza',      'apertura', 'Aspirar (pelusas)',                     'false', NULL, 16),
  ('Limpieza',      'apertura', 'Revisar suelo del baño',                'false', NULL, 17),
  ('Limpieza',      'apertura', 'Limpiar espejo del baño',               'false', NULL, 18),
  ('Limpieza',      'apertura', 'Limpieza de espejos',                   'false', NULL, 19),
  ('Limpieza',      'apertura', 'Quitar polvo',                          'false', NULL, 20),
  ('Limpieza',      'apertura', 'Limpieza de carros y máquinas',         'false', NULL, 21),
  ('Limpieza',      'apertura', 'Limpieza de picaportes',                'false', NULL, 22),
  ('Limpieza',      'apertura', 'Mantener orden del almacén',            'false', NULL, 23),

  -- ── APERTURA / Comunicación ──────────────────────────────
  ('Comunicación',  'apertura', 'Responder llamadas (máx. 1-2 horas)',            'false', NULL, 24),
  ('Comunicación',  'apertura', 'Responder WhatsApp (máx. 1-2 horas)',            'false', NULL, 25),
  ('Comunicación',  'apertura', 'Responder emails IONOS (máx. 24 horas)',         'false', NULL, 26),
  ('Comunicación',  'apertura', 'Responder mensajes de Instagram (máx. 12 horas)','false', NULL, 27),

  -- ── DURANTE_DIA / Gestión ────────────────────────────────
  ('Gestión',       'durante_dia', 'Registrar notas de clientes (KOIBOX)',                'false', NULL,  1),
  ('Gestión',       'durante_dia', 'Programas realizados y enviados',                    'false', NULL,  2),
  ('Gestión',       'durante_dia', 'Comprobar respuestas de programas',                  'false', NULL,  3),
  ('Gestión',       'durante_dia', 'Revisar agenda',                                     'false', NULL,  4),
  ('Gestión',       'durante_dia', 'Avisar falta de stock o equipos (Elipse/Adipologie)','false', NULL,  5),
  ('Gestión',       'durante_dia', 'Solicitar reseñas',                                  'false', NULL,  6),
  ('Gestión',       'durante_dia', 'Organizar fotos',                                    'false', NULL,  7),
  ('Gestión',       'durante_dia', 'Anotar número de consentimientos firmados',          'true',  'uds', 8),

  -- ── DURANTE_DIA / Formación ──────────────────────────────
  ('Formación',     'durante_dia', 'Estudio de productos',               'false', NULL,  9),
  ('Formación',     'durante_dia', 'Mejorar discurso comercial',         'false', NULL, 10),

  -- ── DURANTE_DIA / Presencia ──────────────────────────────
  ('Presencia',     'durante_dia', 'Uniforme correcto',                  'false', NULL, 11),
  ('Presencia',     'durante_dia', 'Maquillaje suave',                   'false', NULL, 12),
  ('Presencia',     'durante_dia', 'Pelo recogido',                      'false', NULL, 13),

  -- ── DURANTE_DIA / Actitud ────────────────────────────────
  ('Actitud',       'durante_dia', 'Amabilidad',                         'false', NULL, 14),
  ('Actitud',       'durante_dia', 'Resolver dudas',                     'false', NULL, 15),
  ('Actitud',       'durante_dia', 'Trabajo en equipo',                  'false', NULL, 16),
  ('Actitud',       'durante_dia', 'Mejorar comunicación',               'false', NULL, 17),

  -- ── CIERRE / Instalaciones ───────────────────────────────
  ('Instalaciones', 'cierre', 'Bajar persianas',                         'false', NULL,  1),
  ('Instalaciones', 'cierre', 'Apagar música',                           'false', NULL,  2),
  ('Instalaciones', 'cierre', 'Apagar aire/ventilación',                 'false', NULL,  3),
  ('Instalaciones', 'cierre', 'Cerrar ventanas',                         'false', NULL,  4),
  ('Instalaciones', 'cierre', 'Apagar luces',                            'false', NULL,  5),
  ('Instalaciones', 'cierre', 'Apagar regletas',                         'false', NULL,  6),
  ('Instalaciones', 'cierre', 'Guardar lamparita',                       'false', NULL,  7),

  -- ── CIERRE / Salas y orden ───────────────────────────────
  ('Salas y orden', 'cierre', 'Cabinas ordenadas',                       'false', NULL,  8),
  ('Salas y orden', 'cierre', 'Papeleras vacías',                        'false', NULL,  9),

  -- ── CIERRE / Operativa ───────────────────────────────────
  ('Operativa',     'cierre', 'Apagar lavadora y secadora',              'false', NULL, 10),
  ('Operativa',     'cierre', 'Cerrar caja',                             'false', NULL, 11),
  ('Operativa',     'cierre', 'Anotar incidencias',                      'false', NULL, 12),

  -- ── CIERRE / Limpieza ────────────────────────────────────
  ('Limpieza',      'cierre', 'Tirar basura',                            'false', NULL, 13),
  ('Limpieza',      'cierre', 'Fregar lavabo',                           'false', NULL, 14)

) AS t(cat, seccion, nombre, tc, unidad, orden);


-- ============================================================
-- 3. SEMANALES — Propuesta mínima
-- ============================================================
-- La v2 NO tiene tabla de plantillas semanales.
-- weekly_records almacena registros reales (user_id + fecha),
-- no plantillas reutilizables.
--
-- Los 6 ítems semanales originales son métricas con cantidad:
--   1. Número de programas enviados
--   2. Número de programas aceptados
--   3. Propuestas de productos
--   4. Ventas realizadas
--   5. Logros del equipo
--   6. Incidencias y soluciones
--
-- OPCIÓN A (recomendada): crear tabla weekly_templates opcional
-- OPCIÓN B: documentarlos como valores fijos en la UI (hardcode)
-- ============================================================

-- ── OPCIÓN A: Tabla de plantillas semanales (extensión mínima)

CREATE TABLE IF NOT EXISTS public.weekly_templates (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID    NOT NULL REFERENCES public.clinic(id) ON DELETE CASCADE,
  nombre     TEXT    NOT NULL,
  unidad     TEXT,
  orden      INT     NOT NULL DEFAULT 0,
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_templates: read same clinic"
  ON public.weekly_templates FOR SELECT TO authenticated
  USING (clinic_id = public.my_clinic_id());

CREATE POLICY "weekly_templates: admin write"
  ON public.weekly_templates FOR ALL TO authenticated
  USING (
    clinic_id = public.my_clinic_id() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    clinic_id = public.my_clinic_id() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

INSERT INTO public.weekly_templates (clinic_id, nombre, unidad, orden)
VALUES
  ((SELECT id FROM public.clinic LIMIT 1), 'Número de programas enviados',  'programas', 1),
  ((SELECT id FROM public.clinic LIMIT 1), 'Número de programas aceptados', 'programas', 2),
  ((SELECT id FROM public.clinic LIMIT 1), 'Propuestas de productos',       'propuestas',3),
  ((SELECT id FROM public.clinic LIMIT 1), 'Ventas realizadas',             '€',         4),
  ((SELECT id FROM public.clinic LIMIT 1), 'Logros del equipo',             NULL,        5),
  ((SELECT id FROM public.clinic LIMIT 1), 'Incidencias y soluciones',      NULL,        6);
