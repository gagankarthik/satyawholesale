"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { uploadFile } from "@/lib/api";

export interface ImageUploadProps {
  /** Current image URL (an S3 URL saved on the record). */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Preview shape. */
  aspect?: "square" | "wide";
  /** Max file size (MB). Oversized/non-image files are rejected via onError. */
  maxMB?: number;
  onError?: (message: string) => void;
  hint?: string;
  /** S3 folder the image lands in (products | categories | promos). */
  folder?: string;
}

/**
 * Reusable image picker: shows a preview, uploads the chosen file to S3 and
 * stores the returned URL, and supports clear/replace. Used by the product,
 * category and promotion forms.
 */
export function ImageUpload({ value, onChange, label = "Image", aspect = "square", maxMB = 5, onError, hint, folder = "products" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { onError?.("Please choose an image file."); return; }
    if (f.size > maxMB * 1024 * 1024) { onError?.(`Image must be under ${maxMB}MB.`); return; }
    setBusy(true);
    try {
      const url = await uploadFile(f, f.type, folder);
      onChange(url);
    } catch (err) {
      onError?.((err as Error).message || "The upload didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="imgup">
      {label && <span className="imgup-label">{label}</span>}
      <div className={`imgup-box ${aspect}`}>
        {busy ? (
          <div className="imgup-drop" aria-busy="true"><span className="spinner" /><span>Uploading…</span></div>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="imgup-preview" />
        ) : (
          <button type="button" className="imgup-drop" onClick={() => inputRef.current?.click()}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0L8 8m4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
            <span>Upload image</span>
          </button>
        )}
        {value && !busy && (
          <button type="button" className="imgup-remove" onClick={() => onChange("")} aria-label="Remove image">×</button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="imgup-input" onChange={onFile} disabled={busy} />
      </div>
      <div className="imgup-foot">
        {value && !busy && <button type="button" className="imgup-change" onClick={() => inputRef.current?.click()}>Replace</button>}
        {hint && <span className="imgup-hint">{hint}</span>}
      </div>
    </div>
  );
}
