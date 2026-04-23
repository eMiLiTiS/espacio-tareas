-- ============================================================
-- Espacio-tareas – Seed data
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- ── 1. Insertar clínica ─────────────────────────────────────
INSERT INTO public.clinic (name)
VALUES ('Mi Clínica')
ON CONFLICT DO NOTHING;

-- ── 2. Categorías de ejemplo ────────────────────────────────
DO $$
DECLARE
  v_clinic_id UUID;
BEGIN
  SELECT id INTO v_clinic_id FROM public.clinic LIMIT 1;

  INSERT INTO public.categories (clinic_id, name, color, orden) VALUES
    (v_clinic_id, 'Limpieza',    '#22c55e', 1),
    (v_clinic_id, 'Materiales',  '#3b82f6', 2),
    (v_clinic_id, 'Equipos',     '#f59e0b', 3),
    (v_clinic_id, 'Seguridad',   '#ef4444', 4)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ── 3. Plantillas de checklist de ejemplo ──────────────────
DO $$
DECLARE
  v_clinic_id    UUID;
  v_cat_limpieza UUID;
  v_cat_mat      UUID;
  v_cat_equipo   UUID;
  v_cat_seg      UUID;
BEGIN
  SELECT id INTO v_clinic_id FROM public.clinic LIMIT 1;
  SELECT id INTO v_cat_limpieza FROM public.categories WHERE clinic_id = v_clinic_id AND name = 'Limpieza';
  SELECT id INTO v_cat_mat      FROM public.categories WHERE clinic_id = v_clinic_id AND name = 'Materiales';
  SELECT id INTO v_cat_equipo   FROM public.categories WHERE clinic_id = v_clinic_id AND name = 'Equipos';
  SELECT id INTO v_cat_seg      FROM public.categories WHERE clinic_id = v_clinic_id AND name = 'Seguridad';

  -- Apertura
  INSERT INTO public.checklist_templates (clinic_id, category_id, nombre, seccion, orden) VALUES
    (v_clinic_id, v_cat_limpieza, 'Limpiar recepción',          'apertura', 1),
    (v_clinic_id, v_cat_limpieza, 'Limpiar sala de espera',     'apertura', 2),
    (v_clinic_id, v_cat_equipo,   'Encender equipos',           'apertura', 3),
    (v_clinic_id, v_cat_mat,      'Revisar stock de materiales','apertura', 4),
    (v_clinic_id, v_cat_seg,      'Verificar extintores',       'apertura', 5);

  -- Durante el día
  INSERT INTO public.checklist_templates (clinic_id, category_id, nombre, seccion, tiene_cantidad, unidad, orden) VALUES
    (v_clinic_id, v_cat_limpieza, 'Limpiar sala entre pacientes', 'durante_dia', false, null, 1),
    (v_clinic_id, v_cat_mat,      'Registrar materiales usados',  'durante_dia', true,  'unidades', 2),
    (v_clinic_id, null,           'Actualizar fichas',            'durante_dia', false, null, 3);

  -- Cierre
  INSERT INTO public.checklist_templates (clinic_id, category_id, nombre, seccion, orden) VALUES
    (v_clinic_id, v_cat_limpieza, 'Limpiar instrumental',    'cierre', 1),
    (v_clinic_id, v_cat_limpieza, 'Desinfectar superficies', 'cierre', 2),
    (v_clinic_id, v_cat_equipo,   'Apagar todos los equipos','cierre', 3),
    (v_clinic_id, v_cat_seg,      'Cerrar y asegurar local', 'cierre', 4);
END;
$$;
