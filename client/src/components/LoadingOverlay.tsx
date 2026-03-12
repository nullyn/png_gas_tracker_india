import { Flame } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = 'Loading real-time data...' }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-2xl text-center max-w-sm">
        <div className="flex justify-center mb-4">
          <div 
            className="w-16 h-16 rounded-lg flex items-center justify-center animate-pulse"
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7c3aed 100%)' }}
          >
            <Flame className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">PNG LNG Gas Tracker</h2>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
