import { useState } from 'react'

export default function Stepper({ label, value, onChange, min = 0, max = 99 }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-lg font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-10 h-10 rounded-full bg-slate-200 active:bg-slate-300 text-xl font-bold flex items-center justify-center"
        >
          -
        </button>
        <span className="w-8 text-center text-xl font-semibold">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-10 h-10 rounded-full bg-blue-600 active:bg-blue-700 text-white text-xl font-bold flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  )
}
