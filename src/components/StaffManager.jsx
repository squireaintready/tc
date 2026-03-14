import { useState } from 'react'
import { useStaffContext } from '../StaffContext'
import { DEFAULT_PERCENTAGES } from '../utils/constants'

function Divider({ label }) {
  return (
    <div className="my-1.5 flex items-center gap-2">
      <div className="flex-1 h-px" style={{ background: 'var(--surface-light)' }} />
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--surface-light)' }} />
    </div>
  )
}

function StaffChip({ emp, selected, onTap }) {
  return (
    <button
      onClick={onTap}
      className="px-2.5 py-1 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 select-none"
      style={{
        background: selected ? 'var(--accent)' : 'var(--surface-lighter)',
        color: selected ? 'var(--btn-text)' : 'var(--text-secondary)',
      }}
    >
      {emp.name}
      <span className="ml-1 text-xs opacity-70">{emp.percentage}%</span>
    </button>
  )
}

export default function StaffManager() {
  const { staff, addEmployee, removeEmployee, updateEmployee, graduateTrainee } = useStaffContext()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('server')
  const [newPercent, setNewPercent] = useState(DEFAULT_PERCENTAGES.server)
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmGraduateId, setConfirmGraduateId] = useState(null)
  const [confirmSaveId, setConfirmSaveId] = useState(null)

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
      setSelectedId(null)
    } else {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000)
    }
  }

  const handleGraduate = (id) => {
    if (confirmGraduateId === id) {
      graduateTrainee(id)
      setConfirmGraduateId(null)
      setSelectedId(null)
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
    if (confirmSaveId === id) {
      if (editData.name?.trim() && editData.percentage > 0) {
        updateEmployee(id, { name: editData.name.trim(), percentage: editData.percentage })
      }
      setConfirmSaveId(null)
      setEditingId(null)
      setEditData({})
      setSelectedId(null)
    } else {
      setConfirmSaveId(id)
      setTimeout(() => setConfirmSaveId(prev => prev === id ? null : prev), 3000)
    }
  }

  const isTraineelike = (s) => s.role === 'trainee' || (s.role === 'server' && s.percentage < 100)

  const fullServers = staff.filter(s => s.role === 'server' && s.active !== false && s.percentage >= 100)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const traineeMembers = staff.filter(s => s.active !== false && isTraineelike(s))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const busboyMembers = staff.filter(s => s.active !== false && s.role === 'busboy')
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const otherMembers = staff.filter(s => s.active !== false && s.role === 'other')
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))

  const allStaff = [...fullServers, ...traineeMembers, ...busboyMembers, ...otherMembers]
  const selectedEmp = allStaff.find(s => s.id === selectedId)

  const handleChipTap = (id) => {
    if (selectedId === id) {
      setSelectedId(null)
      setEditingId(null)
    } else {
      setSelectedId(id)
      setEditingId(null)
      setConfirmDeleteId(null)
      setConfirmGraduateId(null)
    }
  }

  const renderChips = (members) => (
    <div className="flex flex-wrap gap-1.5">
      {members.map(emp => (
        <StaffChip key={emp.id} emp={emp} selected={selectedId === emp.id} onTap={() => handleChipTap(emp.id)} />
      ))}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Servers */}
      <Divider label={`Servers (${fullServers.length})`} />
      {renderChips(fullServers)}

      {traineeMembers.length > 0 && (
        <>
          <Divider label="Trainees" />
          {renderChips(traineeMembers)}
        </>
      )}

      {/* Bussers */}
      {(busboyMembers.length > 0 || otherMembers.length > 0) && (
        <>
          <Divider label="Bussers" />
          {busboyMembers.length > 0 && renderChips(busboyMembers)}
          {otherMembers.length > 0 && busboyMembers.length > 0 && <Divider label="Other" />}
          {otherMembers.length > 0 && renderChips(otherMembers)}
        </>
      )}

      {/* Selected employee actions */}
      {selectedEmp && !editingId && (
        <div className="rounded-lg px-3 py-2 space-y-2" style={{ background: 'var(--surface-lighter)' }}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selectedEmp.name}</span>
              <span className="text-xs ml-1.5" style={{ color: 'var(--text-secondary)' }}>{selectedEmp.percentage}%</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => startEdit(selectedEmp)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{ color: 'var(--accent-light)', background: 'var(--surface-light)' }}>
              Edit
            </button>
            <button onClick={() => handleDelete(selectedEmp.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{
                color: confirmDeleteId === selectedEmp.id ? 'var(--btn-text)' : 'var(--red)',
                background: confirmDeleteId === selectedEmp.id ? 'var(--red)' : 'var(--surface-light)',
              }}>
              {confirmDeleteId === selectedEmp.id ? 'Confirm?' : 'Delete'}
            </button>
            {isTraineelike(selectedEmp) && (
              <button onClick={() => handleGraduate(selectedEmp.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                style={{
                  color: confirmGraduateId === selectedEmp.id ? 'var(--btn-text)' : 'var(--green)',
                  background: confirmGraduateId === selectedEmp.id ? 'var(--green)' : 'var(--surface-light)',
                }}>
                {confirmGraduateId === selectedEmp.id ? 'Confirm?' : 'Graduate'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit form */}
      {editingId && (
        <div className="rounded-lg px-3 py-2 space-y-2" style={{ background: 'var(--surface-lighter)' }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editData.name}
              onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
              className="flex-1 px-2 py-1.5 rounded-lg text-sm focus:outline-none"
              style={{ background: 'var(--surface-light)', color: 'var(--text-primary)' }}
              autoFocus
            />
            <input
              type="number"
              value={editData.percentage}
              onChange={e => setEditData(d => ({ ...d, percentage: Number(e.target.value) }))}
              className="w-16 px-2 py-1.5 rounded-lg text-sm text-center focus:outline-none"
              style={{ background: 'var(--surface-light)', color: 'var(--text-primary)' }}
              min={1} max={100}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>%</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => saveEdit(editingId)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{
                color: confirmSaveId === editingId ? 'var(--btn-text)' : 'var(--green)',
                background: confirmSaveId === editingId ? 'var(--green)' : 'var(--surface-light)',
              }}>
              {confirmSaveId === editingId ? 'Confirm?' : 'Save'}
            </button>
            <button onClick={() => { setEditingId(null); setSelectedId(null) }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface-light)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Employee */}
      <button
        onClick={() => { setShowAdd(!showAdd); setSelectedId(null); setEditingId(null) }}
        className="w-full flex items-center justify-center py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]"
        style={{ background: 'var(--surface-lighter)', color: 'var(--accent-light)' }}
      >
        {showAdd ? 'Cancel' : '+ Add Employee'}
      </button>
      {showAdd && (
        <div className="rounded-lg px-3 space-y-2 py-2" style={{ background: 'var(--surface-lighter)' }}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Name"
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ background: 'var(--surface-light)', color: 'var(--text-primary)' }}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newRole}
              onChange={e => handleRoleChange(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: 'var(--surface-light)', color: 'var(--text-primary)' }}
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
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{ background: 'var(--surface-light)', color: 'var(--text-primary)' }}
                min={1} max={100}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>%</span>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="w-full py-2 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-30"
            style={{ background: 'var(--accent)', color: 'var(--btn-text)' }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
