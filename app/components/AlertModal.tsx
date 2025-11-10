'use client';

interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'alert' | 'confirm';
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function AlertModal({
  isOpen,
  title,
  message,
  type = 'alert',
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel'
}: AlertModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl max-w-md w-full">
        <div className="p-8">
          {/* Title */}
          {title && (
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
          )}
          
          {/* Message */}
          <p className="text-base text-gray-700 mb-6">{message}</p>

          {/* Buttons */}
          {type === 'confirm' ? (
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 bg-secondary text-gray-900 py-3 rounded-full text-base font-medium hover:bg-secondary-2 transition-colors cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-black text-white py-3 rounded-full text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer"
              >
                {confirmText}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConfirm}
              className="w-full bg-black text-white py-3 rounded-full text-base font-medium hover:bg-gray-800 transition-colors cursor-pointer"
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

