import { useEffect, useRef } from 'react';

export default function ModalDialog({
  open,
  onDismiss,
  labelledBy,
  describedBy,
  initialFocusRef,
  focusKey,
  overlayClassName = 'bg-black/60 backdrop-blur-sm',
  paddingClassName = 'p-4',
  children,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
    initialFocusRef?.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (open && dialogRef.current?.open) initialFocusRef?.current?.focus();
  }, [open, focusKey, initialFocusRef]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss?.();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-inherit"
    >
      <div className={`fixed inset-0 overflow-y-auto overscroll-contain ${overlayClassName}`}>
        <div className={`flex min-h-full items-center justify-center ${paddingClassName}`}>
          {children}
        </div>
      </div>
    </dialog>
  );
}
