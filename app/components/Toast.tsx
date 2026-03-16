"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

const ToastContext = createContext<{
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastItem; onRemove: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 2700);
    const removeTimer = setTimeout(() => onRemove(toast.id), 3000);
    return () => { clearTimeout(timer); clearTimeout(removeTimer); };
  }, [toast.id, onRemove]);

  return (
    <div className={`toast toast--${toast.type}${exiting ? " toast--exit" : ""}`}>
      <span className="toast__icon">
        {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "i"}
      </span>
      {toast.message}
    </div>
  );
}
