"use client";

import { createContext, useCallback, useContext, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

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
      <Dialog.Root open={!!state} onOpenChange={(o) => { if (!o) close(false); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="uidialog-overlay" />
          <Dialog.Content
            role="alertdialog"
            className="uidialog-viewport"
            onClick={(e) => { if (e.target === e.currentTarget) close(false); }}
          >
            {state && (
              <div className="modal confirm">
                <div className={`confirm-ic ${state.danger ? "danger" : ""}`}>{state.danger ? "!" : "?"}</div>
                <Dialog.Title asChild><h3>{state.title}</h3></Dialog.Title>
                <Dialog.Description asChild><p>{state.message}</p></Dialog.Description>
                <div className="modalactions">
                  <button className="btn btn-ghost" onClick={() => close(false)}>Cancel</button>
                  <button className={`btn ${state.danger ? "btn-danger" : "btn-primary"}`} onClick={() => close(true)}>
                    {state.confirmLabel ?? "Confirm"}
                  </button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmCtx.Provider>
  );
}
