import { createContext, useCallback, useContext, useRef, useState } from 'react';

interface ToastContextValue {
  showToast: (msg: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>(null!);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string, duration = 2400) => {
    setMessage(msg);
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div id="toast" style={{ display: visible ? 'block' : 'none' }}>
        {message}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
