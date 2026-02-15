import React, { useEffect, useState } from 'react';
import { X, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastProps {
    id: string;
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type = 'info', duration = 3000, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const startTime = Date.now();
        const endTime = startTime + duration;

        const timer = setInterval(() => {
            const remaining = endTime - Date.now();
            const newProgress = Math.max(0, (remaining / duration) * 100);
            setProgress(newProgress);

            if (remaining <= 0) {
                handleClose();
            }
        }, 16); // ~60fps

        return () => clearInterval(timer);
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        // Wait for exit animation
        setTimeout(() => onClose(id), 300);
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={18} className="text-green-500" />;
            case 'warning': return <AlertTriangle size={18} className="text-yellow-500" />;
            case 'error': return <AlertCircle size={18} className="text-red-500" />;
            default: return <Info size={18} className="text-blue-500" />;
        }
    };

    // Import AlertCircle locally if needed or rely on icon map
    const AlertCircle = Info; // Fallback or import from lucide-react if strictly needed

    return (
        <div
            className={`
        relative flex items-center w-full max-w-sm p-4 mb-4 rounded-lg shadow-lg border
        transition-all duration-300 ease-in-out transform
        ${isExiting ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0'}
      `}
            style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
            }}
            role="alert"
        >
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg">
                {getIcon()}
            </div>
            <div className="ml-3 text-sm font-normal" style={{ color: 'var(--text-primary)' }}>{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onClick={handleClose}
                aria-label="Close"
            >
                <span className="sr-only">Close</span>
                <X size={16} />
            </button>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1 w-full rounded-b-lg overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                <div
                    className={`h-full transition-all duration-75 ease-linear ${type === 'success' ? 'bg-green-500' :
                        type === 'warning' ? 'bg-yellow-500' :
                            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default Toast;
