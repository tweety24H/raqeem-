import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import { cn } from "cn"
import Button from "./Button"

// AlertDialog: نفس ثيم dialog.jsx (slate/gold/nili) لكن بدون إغلاق بالنقر
// على الخلفية — مخصص لتأكيدات الحذف والإجراءات التي لا يمكن التراجع عنها.
function AlertDialog({ ...props }) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({ ...props }) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal({ ...props }) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogBackdrop({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({ className, children, ...props }) {
  return (
    <AlertDialogPortal>
      <AlertDialogBackdrop />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-lg transition-all duration-200 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:border-slate-800 dark:bg-slate-900 dark:text-white",
          className
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }) {
  return <div data-slot="alert-dialog-header" className={cn("flex flex-col gap-1.5 text-right", className)} {...props} />
}

function AlertDialogFooter({ className, ...props }) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-start", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("font-display text-lg font-bold text-nili dark:text-nili-light", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-slate-500 dark:text-slate-400", className)}
      {...props}
    />
  )
}

// Cancel/Action تُبنى فوق زر التطبيق الأصلي (Button.jsx) — نفس أزرار باقي
// التطبيق (نيلي/ذهبي)، بدل أزرار shadcn الغريبة، وبدون أي تعديل على Button.jsx.
function AlertDialogCancel({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Close
      render={<Button type="button" variant="secondary" magnetic={false} className={className} {...props} />}
    />
  )
}

function AlertDialogAction({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Close
      render={
        <Button
          type="button"
          variant="primary"
          magnetic={false}
          className={cn("!bg-danger hover:!bg-danger/90", className)}
          {...props}
        />
      }
    />
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
}
