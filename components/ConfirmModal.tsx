"use client";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Bevestigen",
  message = "Weet je het zeker?",
  confirmText = "Bevestigen",
  cancelText = "Annuleren",
  confirmButtonClass = "bg-red-600 hover:bg-red-700 text-white"
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}) {
  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
