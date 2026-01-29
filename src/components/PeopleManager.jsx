import { useState } from 'react'

export default function PeopleManager({ people, onAdd, onUpdate, onDelete }) {
  const [name, setName] = useState('')
  const [percentage, setPercentage] = useState('')
  const [editingId, setEditingId] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !percentage) return

    if (editingId) {
      onUpdate(editingId, { name: name.trim(), percentage: Number(percentage) })
      setEditingId(null)
    } else {
      onAdd({ name: name.trim(), percentage: Number(percentage), type: 'other' })
    }
    setName('')
    setPercentage('')
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setName(p.name)
    setPercentage(String(p.percentage))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setName('')
    setPercentage('')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Manage People</h2>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name"
          className="flex-1 px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="number"
          value={percentage}
          onChange={e => setPercentage(e.target.value)}
          placeholder="%"
          className="w-20 px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
          {editingId ? 'Save' : 'Add'}
        </button>
        {editingId && (
          <button type="button" onClick={cancelEdit} className="px-3 py-2 bg-slate-200 rounded-lg">
            Cancel
          </button>
        )}
      </form>

      <div className="bg-white rounded-xl shadow divide-y">
        {people.map(p => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="font-medium">{p.name}</span>
              <span className="ml-2 text-sm text-slate-500">{p.percentage}%</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(p)} className="text-sm text-blue-600 font-medium">
                Edit
              </button>
              <button onClick={() => onDelete(p.id)} className="text-sm text-red-600 font-medium">
                Delete
              </button>
            </div>
          </div>
        ))}
        {!people.length && (
          <div className="px-4 py-6 text-center text-slate-400">No people added yet</div>
        )}
      </div>
    </div>
  )
}
