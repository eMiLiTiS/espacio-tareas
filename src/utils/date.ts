import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'

/** Returns today's date as YYYY-MM-DD string (local time, not UTC) */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Returns the Monday of the given date's week as YYYY-MM-DD */
export function weekStartISO(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

/** Returns the Sunday of the given date's week as YYYY-MM-DD */
export function weekEndISO(date: Date = new Date()): string {
  return format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

/** Advance/retreat N weeks from a YYYY-MM-DD string */
export function shiftWeek(isoDate: string, delta: number): string {
  const base = parseISO(isoDate)
  const shifted = delta > 0 ? addWeeks(base, delta) : subWeeks(base, Math.abs(delta))
  return weekStartISO(shifted)
}

/** Human-readable week label: "21 – 27 abr 2026" */
export function weekLabel(semanaInicio: string): string {
  const start = parseISO(semanaInicio)
  const end = endOfWeek(start, { weekStartsOn: 1 })
  const startFmt = format(start, 'd MMM', { locale: es })
  const endFmt = format(end, 'd MMM yyyy', { locale: es })
  return `${startFmt} – ${endFmt}`
}

/** "lunes 21 abr" */
export function formatDateLong(isoDate: string): string {
  return format(parseISO(isoDate), "EEEE d MMM", { locale: es })
}

/** "21/04/2026" */
export function formatDateShort(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy')
}

export function isTodayDate(isoDate: string): boolean {
  return isToday(parseISO(isoDate))
}

/** Returns the date N days before today as YYYY-MM-DD */
export function subDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return format(d, 'yyyy-MM-dd')
}
