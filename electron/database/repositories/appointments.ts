import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { Appointment } from '@shared/types'

export class AppointmentsRepository {
  constructor(private db: Database.Database) {}

  list(dateFilter?: string): Appointment[] {
    let sql = 'SELECT * FROM appointments WHERE 1=1'
    const params: any[] = []
    if (dateFilter) {
      sql += ' AND date LIKE ?'
      params.push(`${dateFilter}%`)
    }
    sql += ' ORDER BY date ASC, start_time ASC'
    return this.db.prepare(sql).all(...params) as Appointment[]
  }

  getById(id: string): Appointment | null {
    const row = this.db.prepare('SELECT * FROM appointments WHERE id = ?').get(id)
    return (row as Appointment) || null
  }

  checkOverlap(date: string, startTime: string, endTime: string, excludeId?: string): Appointment | null {
    let sql = `
      SELECT * FROM appointments
      WHERE date = ?
        AND status NOT IN ('cancelled', 'completed')
        AND (
          (start_time < ? AND end_time > ?) OR
          (start_time >= ? AND start_time < ?) OR
          (end_time > ? AND end_time <= ?)
        )
    `
    const params = [date, endTime, startTime, startTime, endTime, startTime, endTime]
    if (excludeId) {
      sql += ' AND id != ?'
      params.push(excludeId)
    }
    const row = this.db.prepare(sql).get(...params)
    return (row as Appointment) || null
  }

  create(data: Omit<Appointment, 'id' | 'created_at'>): Appointment {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db
      .prepare(`
        INSERT INTO appointments (
          id, customer_id, customer_name, phone, vehicle_info,
          service_requested, date, start_time, end_time, status, notes, technician_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        data.customer_id || null,
        data.customer_name.trim(),
        data.phone.trim(),
        data.vehicle_info || '',
        data.service_requested.trim(),
        data.date,
        data.start_time,
        data.end_time,
        data.status || 'scheduled',
        data.notes || '',
        data.technician_name || '',
        now
      )
    return this.getById(id)!
  }

  update(id: string, data: Partial<Appointment>): Appointment {
    const existing = this.getById(id)
    if (!existing) throw new Error('Rendez-vous introuvable')
    const updated = { ...existing, ...data }
    this.db
      .prepare(`
        UPDATE appointments SET
          customer_id = ?, customer_name = ?, phone = ?, vehicle_info = ?,
          service_requested = ?, date = ?, start_time = ?, end_time = ?,
          status = ?, notes = ?, technician_name = ?
        WHERE id = ?
      `)
      .run(
        updated.customer_id,
        updated.customer_name,
        updated.phone,
        updated.vehicle_info,
        updated.service_requested,
        updated.date,
        updated.start_time,
        updated.end_time,
        updated.status,
        updated.notes,
        updated.technician_name,
        id
      )
    return this.getById(id)!
  }

  delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM appointments WHERE id = ?').run(id)
    return res.changes > 0
  }
}
