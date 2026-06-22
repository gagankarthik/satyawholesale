"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ConfirmOpts {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}
type ConfirmFn = (o: ConfirmOpts) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (o) => new Promise<boolean>((resolve) => setState({ ...o, resolve })),
    []
  );
  const close = (v: boolean) => { state?.resolve(v); setState(null); };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div className="modal-overlay" onClick={() => close(false)}>
          <div className="modal confirm" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-ic ${state.danger ? "danger" : ""}`}>{state.danger ? "!" : "?"}</div>
            <h3>{state.title}</h3>
            <p>{state.message}</p>
            <div className="modalactions">
              <button className="btn btn-ghost" onClick={() => close(false)} autoFocus>Cancel</button>
              <button className={`btn ${state.danger ? "btn-danger" : "btn-primary"}`} onClick={() => close(true)}>
                {state.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
