import { useState } from 'react'
import { useStaffContext } from '../StaffContext'
import { DEFAULT_PERCENTAGES } from '../utils/constants'

export default function StaffManager() {
  const { staff, addEmployee, removeEmployee, updateEmployee, graduateTrainee } = useStaffContext()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('server')
  const [newPercent, setNewPercent] = useState(DEFAULT_PERCENTAGES.server)
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmGraduateId, setConfirmGraduateId] = useState(null)

  const handleRoleChange = (role) => {
    setNewRole(role)
    setNewPercent(DEFAULT_PERCENTAGES[role] ?? 100)
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    const id = newName.trim().toLowerCase().replace(/\s+/g, '-')
    if (staff.some(s => s.id === id)) return
    addEmployee({ id, name: newName.trim(), percentage: newPercent, role: newRole })
    setNewName('')
    setNewRole('server')
    setNewPercent(DEFAULT_PERCENTAGES.server)
    setShowAdd(false)
  }

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      removeEmployee(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000)
    }
  }

  const handleGraduate = (id) => {
    if (confirmGraduateId === id) {
      graduateTrainee(id)
      setConfirmGraduateId(null)
    } else {
      setConfirmGraduateId(id)
      setTimeout(() => setConfirmGraduateId(prev => prev === id ? null : prev), 3000)
    }
  }

  const startEdit = (emp) => {
    setEditingId(emp.id)
    setEditData({ name: emp.name, percentage: emp.percentage })
  }

  const saveEdit = (id) => {
    if (editData.name?.trim() && editData.percentage > 0) {
      updateEmployee(id, { name: editData.name.trim(), percentage: editData.percentage })
    }
    setEditingId(null)
    setEditData({})
  }

  const isTraineelike = (s) => s.role === 'trainee' || (s.role === 'server' && s.percentage < 100 && !s.modifiers?.altPercentage)

  // Servers card: full servers + trainees (sub-100%)
  const fullServers = staff.filter(s => s.role === 'server' && s.active !== false && s.percentage >= 100 && !s.modifiers?.altPercentage)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const traineeMembers = staff.filter(s => s.active !== false && isTraineelike(s))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))

  // Bussers card: modifier servers (Paola) + busboys + other (Maria)
  const modifierMembers = staff.filter(s => s.active !== false && s.role === 'server' && s.modifiers?.altPercentage)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const busboyMembers = staff.filter(s => s.active !== false && s.role === 'busboy')
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const otherMembers = staff.filter(s => s.active !== false && s.role === 'other')
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))

  const renderRow = (emp) => (
    <div key={emp.id} className="py-3 flex items-center justify-between gap-2" style={{ borderColor: 'var(--border)' }}>
      {editingId === emp.id ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editData.name}
            onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
            className="flex-1 px-2 py-1 rounded-lg border text-sm focus:outline-none"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            autoFocus
          />
          <input
            type="number"
            value={editData.percentage}
            onChange={e => setEditData(d => ({ ...d, percentage: Number(e.target.value) }))}
            className="w-16 px-2 py-1 rounded-lg border text-sm text-center focus:outline-none"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            min={1} max={100}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>%</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{emp.name}</span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{emp.percentage}%</span>
          {emp.modifiers?.altLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
              style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent-light)' }}>
              {emp.modifiers.altLabel} {emp.modifiers.altPercentage}%
            </span>
          )}
        </div>
      )}
      <div className="flex gap-1.5 shrink-0">
        {isTraineelike(emp) && editingId !== emp.id && (
          <button
            onClick={() => handleGraduate(emp.id)}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all active:scale-95"
            style={{
              color: confirmGraduateId === emp.id ? 'var(--btn-text)' : 'var(--green)',
              background: confirmGraduateId === emp.id ? 'var(--green)' : 'transparent',
              borderColor: confirmGraduateId === emp.id ? 'var(--green)' : 'color-mix(in srgb, var(--green) 30%, transparent)',
            }}
          >
            {confirmGraduateId === emp.id ? 'Confirm?' : 'Graduate'}
          </button>
        )}
        {editingId === emp.id ? (
          <button
            onClick={() => saveEdit(emp.id)}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all active:scale-95"
            style={{ color: 'var(--green)', background: 'color-mix(in srgb, var(--green) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--green) 30%, transparent)' }}
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => startEdit(emp)}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all active:scale-95"
            style={{ color: 'var(--accent-light)', background: 'transparent', borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}
          >
            Edit
          </button>
        )}
        <button
          onClick={() => handleDelete(emp.id)}
          className="text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all active:scale-95"
          style={{
            color: confirmDeleteId === emp.id ? 'var(--btn-text)' : 'var(--red)',
            background: confirmDeleteId === emp.id ? 'var(--red)' : 'transparent',
            borderColor: confirmDeleteId === emp.id ? 'var(--red)' : 'color-mix(in srgb, var(--red) 30%, transparent)',
          }}
        >
          {confirmDeleteId === emp.id ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider px-1"
        style={{ color: 'var(--text-secondary)' }}>
        Staff Management
      </h2>

      {/* Servers card */}
      <div className="fun-card rounded-2xl border overflow-hidden transition-all duration-400"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
        <div className="px-4 pt-3 pb-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Servers ({fullServers.length + traineeMembers.length})
          </h3>
        </div>
        <div className="px-4 pb-2">
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {fullServers.map(renderRow)}
          </div>
          {traineeMembers.length > 0 && (
            <>
              <div className="my-1 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Trainees
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {traineeMembers.map(renderRow)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bussers card */}
      {(modifierMembers.length > 0 || busboyMembers.length > 0 || otherMembers.length > 0) && (
        <div className="fun-card rounded-2xl border overflow-hidden transition-all duration-400"
          style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
          <div className="px-4 pt-3 pb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Bussers ({modifierMembers.length + busboyMembers.length + otherMembers.length})
            </h3>
          </div>
          <div className="px-4 pb-2">
            {modifierMembers.length > 0 && (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {modifierMembers.map(renderRow)}
              </div>
            )}
            {busboyMembers.length > 0 && modifierMembers.length > 0 && (
              <div className="my-1 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Busboys
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
              </div>
            )}
            {busboyMembers.length > 0 && (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {busboyMembers.map(renderRow)}
              </div>
            )}
            {otherMembers.length > 0 && (busboyMembers.length > 0 || modifierMembers.length > 0) && (
              <div className="my-1 flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Other
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--accent-glow)' }} />
              </div>
            )}
            {otherMembers.length > 0 && (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {otherMembers.map(renderRow)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Employee */}
      <button
        onClick={() => setShowAdd(!showAdd)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-sm font-semibold transition-all active:scale-[0.98]"
        style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)', color: 'var(--accent-light)' }}
      >
        {showAdd ? 'Cancel' : 'Add Employee'}
      </button>
      {showAdd && (
        <div className="fun-card rounded-2xl border p-4 space-y-3"
          style={{ background: 'var(--surface-flat, var(--surface))', borderColor: 'var(--border)' }}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Employee name"
            className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newRole}
              onChange={e => handleRoleChange(e.target.value)}
              className="px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="server">Server</option>
              <option value="trainee">Trainee</option>
              <option value="busboy">Busboy</option>
              <option value="other">Other</option>
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={newPercent}
                onChange={e => setNewPercent(Number(e.target.value))}
                className="flex-1 px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                min={1} max={100}
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>%</span>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-30"
            style={{ background: 'var(--accent)', color: 'var(--btn-text)' }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
