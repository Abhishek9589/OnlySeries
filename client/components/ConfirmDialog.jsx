import { X } from "lucide-react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({
  isOpen,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const dialog = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl w-[90%] max-w-md shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <div className="text-sm text-muted-foreground mt-1">{message}</div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-secondary/50 rounded-xl transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-card border border-border text-foreground hover:bg-card/80"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-destructive/90 hover:bg-destructive text-destructive-foreground"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  // Render modal as portal to document.body so it centers regardless of parent transforms
  return createPortal(dialog, document.body);
}
