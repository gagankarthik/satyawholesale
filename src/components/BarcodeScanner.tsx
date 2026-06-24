"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "./Icons";

/* The BarcodeDetector API isn't in the TS DOM lib yet — minimal shapes. */
interface DetectedBarcode { rawValue: string }
interface DetectorLike { detect(src: CanvasImageSource): Promise<DetectedBarcode[]> }
type DetectorCtor = new (opts?: { formats?: string[] }) => DetectorLike;

const FORMATS = ["upc_a", "upc_e", "ean_13", "ean_8"];

/**
 * Camera barcode reader for UPC/EAN. Renders a "Scan" button; on phones with a
 * rear camera and the BarcodeDetector API it opens a live scanner and calls
 * `onDetect` with the digits. Falls back to a clear message so manual entry
 * always works.
 */
export function BarcodeScanner({ onDetect, label = "Scan" }: { onDetect: (code: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const stop = () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Ctor) { setErr("This browser can't scan barcodes — type it in manually below."); return stop; }
    if (!navigator.mediaDevices?.getUserMedia) { setErr("No camera available — type the barcode in manually."); return stop; }
    const detector = new Ctor({ formats: FORMATS });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => {}); }

        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            const digits = found[0]?.rawValue?.replace(/\D/g, "");
            if (digits) { onDetect(digits); cancelled = true; stop(); setOpen(false); return; }
          } catch { /* frame not ready — keep scanning */ }
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      } catch {
        setErr("Couldn't access the camera. Allow permission or type it in manually.");
      }
    })();

    return () => { cancelled = true; stop(); };
  }, [open, onDetect]);

  const close = () => setOpen(false);

  return (
    <>
      <button type="button" className="scanbtn" onClick={() => { setErr(""); setOpen(true); }} aria-label="Scan barcode with camera">
        <Camera /> {label}
      </button>
      {open && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal scanmodal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Scan barcode</h3>
            {err ? (
              <p className="modalp">{err}</p>
            ) : (
              <>
                <div className="scanview">
                  <video ref={videoRef} muted playsInline />
                  <span className="scanframe" />
                </div>
                <p className="modalp">Point the rear camera at a UPC or EAN barcode — it fills in automatically.</p>
              </>
            )}
            <div className="modalbtns">
              <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
