import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/query-client'
import { useAuth } from '@/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import type {
  ChecklistTemplate,
  Category,
  Seccion,
} from '@/types/domain'
import { SECCIONES } from '@/types/domain'

export function AjustesPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile */}
      <ProfileSection />

      {/* Admin sections */}
      {isAdmin ? (
        <>
          <CategoriesSection />
          <TemplatesSection />
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 justify-center text-brand-400">
            <Lock size={18} />
            <span className="text-sm">Solo los administradores pueden gestionar plantillas y categorías</span>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ── Profile ─────────────────────────────────────────────────────────── */

function ProfileSection() {
  const { profile, user } = useAuth()
  const qc = useQueryClient()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', profile.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    qc.invalidateQueries({ queryKey: qk.profile(profile.id) })
    toast.success('Nombre actualizado')
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-brand-900">Mi perfil</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1">Nombre completo</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1">Email</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full px-3 py-2 text-sm border border-brand-100 rounded-xl bg-brand-50 text-brand-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={profile?.role === 'admin' ? 'default' : 'neutral'}>
              {profile?.role === 'admin' ? 'Administrador' : 'Worker'}
            </Badge>
            <Button type="submit" size="sm" loading={saving}>Guardar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/* ── Categories ──────────────────────────────────────────────────────── */

function CategoriesSection() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const { data: categories = [] } = useQuery({
    queryKey: qk.categories(profile?.clinic_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('clinic_id', profile!.clinic_id)
        .order('orden')
      if (error) throw error
      return data as Category[]
    },
    enabled: !!profile,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categories(profile!.clinic_id) })
      toast.success('Categoría eliminada')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-900">Categorías</h2>
          <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={14} /> Nueva
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-brand-400 text-center py-4">Sin categorías</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 py-1.5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="flex-1 text-sm text-brand-800">{cat.name}</span>
                <button
                  onClick={() => { setEditing(cat); setModalOpen(true) }}
                  className="text-brand-400 hover:text-brand-700 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(cat.id)}
                  className="text-brand-400 hover:text-danger-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        category={editing}
        clinicId={profile?.clinic_id ?? ''}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: qk.categories(profile!.clinic_id) })
          setModalOpen(false)
        }}
      />
    </Card>
  )
}

function CategoryModal({
  open, onClose, category, clinicId, onSaved,
}: {
  open: boolean
  onClose: () => void
  category: Category | null
  clinicId: string
  onSaved: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? '#64748b')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(category?.name ?? '')
    setColor(category?.color ?? '#64748b')
  }, [category])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { name: name.trim(), color, clinic_id: clinicId }
    const { error } = category
      ? await supabase.from('categories').update({ name: payload.name, color }).eq('id', category.id)
      : await supabase.from('categories').insert(payload)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(category ? 'Categoría actualizada' : 'Categoría creada')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={category ? 'Editar categoría' : 'Nueva categoría'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-brand-700 mb-1.5">Nombre</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-700 mb-1.5">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-9 rounded-xl border border-brand-200 cursor-pointer"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ── Templates ───────────────────────────────────────────────────────── */

function TemplatesSection() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null)
  const [filterSeccion, setFilterSeccion] = useState<Seccion | 'all'>('all')

  const { data: templates = [] } = useQuery({
    queryKey: qk.checklistTemplates(profile?.clinic_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('clinic_id', profile!.clinic_id)
        .order('orden')
      if (error) throw error
      return data as ChecklistTemplate[]
    },
    enabled: !!profile,
  })

  const { data: categories = [] } = useQuery({
    queryKey: qk.categories(profile?.clinic_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('clinic_id', profile!.clinic_id)
        .order('orden')
      if (error) throw error
      return data as Category[]
    },
    enabled: !!profile,
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from('checklist_templates').update({ activo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.checklistTemplates(profile!.clinic_id) }),
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.checklistTemplates(profile!.clinic_id) })
      toast.success('Plantilla eliminada')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const catMap = new Map(categories.map((c) => [c.id, c]))
  const filtered = filterSeccion === 'all' ? templates : templates.filter((t) => t.seccion === filterSeccion)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-brand-900">Plantillas de checklist</h2>
          <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={14} /> Nueva
          </Button>
        </div>
        {/* Filter */}
        <div className="flex gap-1 bg-brand-50 p-1 rounded-xl">
          <button
            onClick={() => setFilterSeccion('all')}
            className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-colors ${filterSeccion === 'all' ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-500'}`}
          >
            Todas
          </button>
          {(Object.entries(SECCIONES) as [Seccion, string][]).map(([s, label]) => (
            <button
              key={s}
              onClick={() => setFilterSeccion(s)}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-colors ${filterSeccion === s ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-brand-400 text-center py-4">Sin plantillas</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((tpl) => {
              const cat = tpl.category_id ? catMap.get(tpl.category_id) : null
              return (
                <div key={tpl.id} className="flex items-center gap-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${tpl.activo ? 'text-brand-800' : 'text-brand-400 line-through'}`}>
                      {tpl.nombre}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-brand-400">{SECCIONES[tpl.seccion]}</span>
                      {cat && (
                        <span className="flex items-center gap-1 text-xs text-brand-400">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </span>
                      )}
                      {tpl.tiene_cantidad && tpl.unidad && (
                        <span className="text-xs text-brand-400">· {tpl.unidad}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: tpl.id, activo: !tpl.activo })}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      tpl.activo
                        ? 'border-accent-200 text-accent-600 hover:bg-accent-50'
                        : 'border-brand-200 text-brand-400 hover:bg-brand-50'
                    }`}
                  >
                    {tpl.activo ? 'Activa' : 'Inactiva'}
                  </button>
                  <button
                    onClick={() => { setEditing(tpl); setModalOpen(true) }}
                    className="text-brand-400 hover:text-brand-700 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(tpl.id)}
                    className="text-brand-400 hover:text-danger-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <TemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        template={editing}
        categories={categories}
        clinicId={profile?.clinic_id ?? ''}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: qk.checklistTemplates(profile!.clinic_id) })
          setModalOpen(false)
        }}
      />
    </Card>
  )
}

function TemplateModal({
  open, onClose, template, categories, clinicId, onSaved,
}: {
  open: boolean
  onClose: () => void
  template: ChecklistTemplate | null
  categories: Category[]
  clinicId: string
  onSaved: () => void
}) {
  const [nombre, setNombre] = useState(template?.nombre ?? '')
  const [seccion, setSeccion] = useState<Seccion>(template?.seccion ?? 'apertura')
  const [categoryId, setCategoryId] = useState(template?.category_id ?? '')
  const [tieneCantidad, setTieneCantidad] = useState(template?.tiene_cantidad ?? false)
  const [unidad, setUnidad] = useState(template?.unidad ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      clinic_id: clinicId,
      nombre: nombre.trim(),
      seccion,
      category_id: categoryId || null,
      tiene_cantidad: tieneCantidad,
      unidad: tieneCantidad && unidad.trim() ? unidad.trim() : null,
    }
    const { error } = template
      ? await supabase.from('checklist_templates').update(payload).eq('id', template.id)
      : await supabase.from('checklist_templates').insert(payload)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(template ? 'Plantilla actualizada' : 'Plantilla creada')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={template ? 'Editar plantilla' : 'Nueva plantilla'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-brand-700 mb-1.5">Nombre *</label>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1.5">Sección</label>
            <select
              value={seccion}
              onChange={(e) => setSeccion(e.target.value as Seccion)}
              className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {(Object.entries(SECCIONES) as [Seccion, string][]).map(([s, label]) => (
                <option key={s} value={s}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1.5">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="tiene_cantidad"
            checked={tieneCantidad}
            onChange={(e) => setTieneCantidad(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="tiene_cantidad" className="text-sm text-brand-700">
            Requiere cantidad
          </label>
        </div>

        {tieneCantidad && (
          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1.5">Unidad (ej: kg, piezas)</label>
            <input
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Opcional"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}
