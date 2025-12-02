import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto-close after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in max-w-md`}>
      {icons[type]}
      <p className="flex-1 font-medium">{message}</p>
      <button onClick={onClose} className="hover:bg-white/20 rounded p-1 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
