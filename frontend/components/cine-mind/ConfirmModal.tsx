'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export default function ConfirmModal({ 
  isOpen, 
  title, 
  description, 
  onConfirm, 
  onCancel,
  isLoading = false 
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md glass-panel border border-white/10 bg-slate-900/90 shadow-2xl overflow-hidden rounded-2xl"
          >
            {/* Header Glow */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
            
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-black tracking-tight text-white">{title}</h3>
                    <button 
                      onClick={onCancel}
                      className="p-1 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-8">
                <Button 
                  variant="ghost" 
                  onClick={onCancel}
                  className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={isLoading}
                  onClick={onConfirm}
                  className="bg-red-500 hover:bg-red-600 text-white border-none text-xs font-bold uppercase tracking-widest px-6"
                >
                  {isLoading ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
