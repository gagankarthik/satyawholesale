"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "./Icons";

/* The BarcodeDetector API isn't in the TS DOM lib yet — minimal shapes. */
interface DetectedBarcode { rawValue: string }
interface DetectorLike { detect(src: CanvasImageSource): Promise<DetectedBarcode[]> }
type DetectorCtor = new (opts?: { formats?: string[] }) => DetectorLike;

const FORMATS = ["upc_a", "upc_e", "ean_13", "ean_8"];

/**
 * Camera barcode reader for UPC/EAN. Renders a "Scan" button; on any browser
 * with camera access it opens a live scanner and calls `onDetect` with the
 * digits. Uses the native BarcodeDetector API where available (Chrome/Edge/
 * Android) and falls back to the ZXing decoder everywhere else (Firefox,
 * Safari, …). A clear message keeps manual entry working if no camera exists.
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
    let zxingControls: { stop: () => void } | null = null;

    const stop = () => {
      cancelAnimationFrame(rafRef.current);
      zxingControls?.stop();
      zxingControls = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    const done = (raw: string | undefined) => {
      const digits = raw?.replace(/\D/g, "");
      if (digits) { onDetect(digits); cancelled = true; stop(); setOpen(false); }
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("No camera available. Type the barcode in manually.");
      return stop;
    }

    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => {}); }

        if (Ctor) {
          // Fast path — native detector.
          const detector = new Ctor({ formats: FORMATS });
          const scan = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const found = await detector.detect(videoRef.current);
              if (found[0]?.rawValue) { done(found[0].rawValue); return; }
            } catch { /* frame not ready — keep scanning */ }
            rafRef.current = requestAnimationFrame(scan);
          };
          rafRef.current = requestAnimationFrame(scan);
          return;
        }

        // Fallback — ZXing decoder (works on browsers without BarcodeDetector).
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;
        const reader = new BrowserMultiFormatReader();
        zxingControls = await reader.decodeFromStream(stream, videoRef.current!, (result) => {
          if (result) done(result.getText());
        });
      } catch {
        if (!cancelled) setErr("Couldn't access the camera. Allow permission or type it in manually.");
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
                <p className="modalp">Point the rear camera at a UPC or EAN barcode and it fills in automatically.</p>
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
