// lib/formStyles.ts
// Shared Tailwind class strings for form elements.
// Replaces duplicated inputClass/selectClass/textareaClass/btnPrimary in 3+ files.

export const inputClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400'

export const selectClass = (disabled = false) =>
  `w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`

export const textareaClass = (disabled = false) =>
  `${inputClass} resize-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`

export const btnPrimary =
  'bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:bg-slate-300 disabled:shadow-none'

export const labelClass =
  'block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5'
