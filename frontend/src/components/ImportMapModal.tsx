import React, { useState, useRef, useCallback } from 'react'
import { importMap } from '@/api/import'

interface ImportMapModalProps {
  onClose: () => void
  onSuccess: () => void   // Gọi khi import xong → reload maps
}

type Step = 'form' | 'uploading' | 'success' | 'error'

export function ImportMapModal({ onClose, onSuccess }: ImportMapModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [mapTitle, setMapTitle] = useState('')
  const [mapDesc, setMapDesc] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── File handling ──────────────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.xlsx')) {
      setErrorMsg('Chỉ hỗ trợ file .xlsx. Vui lòng chuyển đổi từ Google Sheets hoặc Excel.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setErrorMsg('File không được vượt quá 10MB.')
      return
    }
    setErrorMsg('')
    setFile(f)
    // Auto-fill tên lộ trình từ tên file nếu chưa có
    if (!mapTitle.trim()) {
      setMapTitle(f.name.replace('.xlsx', '').replace(/_/g, ' '))
    }
  }, [mapTitle])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!file) { setErrorMsg('Vui lòng chọn file .xlsx'); return }
    if (!mapTitle.trim()) { setErrorMsg('Vui lòng nhập tên lộ trình'); return }

    setStep('uploading')
    setProgress(0)

    // Fake progress bar mượt mà
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 85) {
          if (progressRef.current) clearInterval(progressRef.current)
          return 85
        }
        return p + Math.random() * 12
      })
    }, 300)

    try {
      const result = await importMap(file, mapTitle.trim(), mapDesc.trim())
      if (progressRef.current) clearInterval(progressRef.current)
      setProgress(100)
      setSuccessMsg(result.message)
      setStep('success')
    } catch (err: unknown) {
      if (progressRef.current) clearInterval(progressRef.current)
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi import'
      setErrorMsg(msg)
      setStep('error')
    }
  }

  const handleDone = () => {
    onSuccess()
    onClose()
  }

  // ── Render steps ───────────────────────────────────────────────────
  const renderForm = () => (
    <div className="flex flex-col gap-5">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 leading-relaxed">
        <p className="font-bold mb-1.5">📋 Format file Excel yêu cầu:</p>
        <p className="font-mono text-xs bg-blue-100 rounded px-2 py-1.5 mb-2">
          Phase | Week | Day | Title | Check1 | Check2 | Check3 | ...
        </p>
        <p className="text-xs text-blue-500">
          Dùng AI để gen lộ trình nhanh! Xem hướng dẫn trong docs hoặc thử{' '}
          <span className="font-bold">lộ trình mẫu 30 ngày Java Core</span> đã có sẵn.
        </p>
      </div>

      {/* Map Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-gray-700">
          Tên lộ trình <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={mapTitle}
          onChange={e => setMapTitle(e.target.value)}
          placeholder="Ví dụ: Lộ trình Java Core → Spring Boot (60 ngày)"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
        />
      </div>

      {/* Map Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-gray-700">
          Mô tả <span className="text-gray-400 font-normal">(không bắt buộc)</span>
        </label>
        <input
          type="text"
          value={mapDesc}
          onChange={e => setMapDesc(e.target.value)}
          placeholder="Mô tả ngắn về lộ trình học tập..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
        />
      </div>

      {/* Dropzone */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-gray-700">
          File Excel (.xlsx) <span className="text-red-400">*</span>
        </label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-400 bg-blue-50 scale-[1.01]'
              : file
              ? 'border-green-400 bg-green-50'
              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <polyline points="9 15 11 17 15 13"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-green-700 text-sm">{file.name}</p>
                <p className="text-xs text-green-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB • Đã sẵn sàng import</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setFile(null) }}
                className="text-xs text-red-400 hover:text-red-600 mt-1 hover:underline"
              >
                Chọn file khác
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isDragging ? '#3B82F6' : '#9CA3AF'} strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div>
                <p className={`font-bold text-sm ${isDragging ? 'text-blue-600' : 'text-gray-600'}`}>
                  {isDragging ? 'Thả file vào đây!' : 'Kéo thả file hoặc bấm để chọn'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Chỉ hỗ trợ .xlsx • Tối đa 10MB</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errorMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          className="px-5 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
        >
          Hủy
        </button>
        <button
          onClick={handleSubmit}
          disabled={!file || !mapTitle.trim()}
          className={`flex-grow py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            file && mapTitle.trim()
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Import Lộ Trình
        </button>
      </div>
    </div>
  )

  const renderUploading = () => (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      {/* Animated icon */}
      <div className="relative w-20 h-20">
        <svg className="absolute inset-0 w-20 h-20" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35" fill="none" stroke="#EEF2FF" strokeWidth="6"/>
          <circle
            cx="40" cy="40" r="35"
            fill="none" stroke="#6366F1" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 35}
            strokeDashoffset={2 * Math.PI * 35 * (1 - progress / 100)}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px', transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black text-indigo-600">{Math.round(progress)}%</span>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-black text-gray-800 mb-1">Đang import lộ trình...</h3>
        <p className="text-sm text-gray-400">Hệ thống đang phân tích file Excel và tạo dữ liệu</p>
      </div>

      {/* Steps */}
      <div className="w-full max-w-xs flex flex-col gap-2 text-left">
        {[
          { label: 'Kiểm tra format file', done: progress > 20 },
          { label: 'Parse dữ liệu từng ngày học', done: progress > 50 },
          { label: 'Tạo lộ trình trong database', done: progress > 75 },
          { label: 'Unlock ngày học đầu tiên', done: progress >= 100 },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${step.done ? 'bg-green-500' : 'bg-gray-100'}`}>
              {step.done ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <div className="w-2 h-2 bg-gray-300 rounded-full"/>
              )}
            </div>
            <span className={step.done ? 'text-gray-700 font-medium' : 'text-gray-400'}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSuccess = () => (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <div className="text-6xl" style={{ animation: 'bounce 1s ease 3' }}>🎉</div>
      <div>
        <h3 className="text-2xl font-black text-gray-800 mb-2">Import thành công!</h3>
        <p className="text-gray-500 text-sm">{successMsg}</p>
      </div>

      <div className="w-full bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 text-left">
        <p className="font-bold text-green-700 text-sm mb-3">✅ Đã thực hiện:</p>
        <ul className="text-sm text-green-600 flex flex-col gap-2">
          <li className="flex items-center gap-2"><span>🗺️</span> Tạo lộ trình <strong>"{mapTitle}"</strong></li>
          <li className="flex items-center gap-2"><span>📅</span> Tạo đầy đủ các ngày học với checklist</li>
          <li className="flex items-center gap-2"><span>🔓</span> Mở khóa ngày học đầu tiên cho bạn</li>
          <li className="flex items-center gap-2"><span>🌳</span> Cập nhật Tree Map lộ trình</li>
        </ul>
      </div>

      <button
        onClick={handleDone}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm"
      >
        Bắt đầu học ngay! →
      </button>
    </div>
  )

  const renderError = () => (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div className="text-5xl">❌</div>
      <div>
        <h3 className="text-xl font-black text-gray-800 mb-2">Import thất bại</h3>
        <p className="text-sm text-gray-500 max-w-sm">Có lỗi xảy ra trong quá trình import:</p>
        <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 text-left">
          {errorMsg}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700 text-left w-full">
        <p className="font-bold mb-2">💡 Kiểm tra lại:</p>
        <ul className="flex flex-col gap-1.5 text-xs">
          <li>• File có đúng định dạng .xlsx không?</li>
          <li>• Cột C (Day) phải là số nguyên (1, 2, 3...)</li>
          <li>• Không có dòng header trong file</li>
          <li>• Cột A (Phase) và cột D (Title) không được trống</li>
        </ul>
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
        >
          Đóng
        </button>
        <button
          onClick={() => { setStep('form'); setErrorMsg('') }}
          className="flex-1 py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md"
        >
          Thử lại
        </button>
      </div>
    </div>
  )

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ animation: 'fadeIn 0.2s ease-out' }}
      onClick={step === 'uploading' ? undefined : onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col relative"
        style={{ maxHeight: '90vh', animation: 'slideUp 0.25s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-0 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800 leading-none">Import Lộ Trình</h2>
              <p className="text-xs text-gray-400 mt-0.5">Upload file Excel .xlsx</p>
            </div>
          </div>
          {step !== 'uploading' && (
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-full flex items-center justify-center transition-all font-bold text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-7 py-6 overflow-y-auto flex-grow">
          {step === 'form'      && renderForm()}
          {step === 'uploading' && renderUploading()}
          {step === 'success'   && renderSuccess()}
          {step === 'error'     && renderError()}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bounce { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-12px) } }
      `}</style>
    </div>
  )
}
