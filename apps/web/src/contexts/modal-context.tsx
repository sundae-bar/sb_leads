'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

type ConfirmOptions = {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
}

type ModalContextType = {
  confirm: (options: ConfirmOptions) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    setIsOpen(true)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!options) return
    
    setIsLoading(true)
    try {
      await options.onConfirm()
      setIsOpen(false)
      setOptions(null)
    } catch (error) {
      // Error handling is up to the caller
      console.error('Confirm action error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    setOptions(null)
  }, [])

  return (
    <ModalContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              {options?.cancelText || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isLoading}
              className={cn(
                options?.variant === 'destructive' && 
                '!bg-destructive !text-white hover:!bg-destructive/90 focus-visible:ring-destructive/20'
              )}
            >
              {isLoading ? 'Loading...' : (options?.confirmText || 'Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
