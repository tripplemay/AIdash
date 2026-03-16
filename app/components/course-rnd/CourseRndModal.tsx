"use client";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, message, confirmLabel = "确认", danger, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal__title">{title}</h3>
        <div className="modal__body" style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
          {message}
        </div>
        <div className="modal__actions">
          <button className="btn btn--soft" onClick={onCancel}>取消</button>
          <button className={danger ? "btn btn--danger-fill" : "btn"} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

interface AlertModalProps {
  title: string;
  message: string;
  onClose: () => void;
}

export function AlertModal({ title, message, onClose }: AlertModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal__title">{title}</h3>
        <div className="modal__body" style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
          {message}
        </div>
        <div className="modal__actions">
          <button className="btn" onClick={onClose}>确定</button>
        </div>
      </div>
    </div>
  );
}
