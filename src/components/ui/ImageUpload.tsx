"use client";

import { useRef, type ChangeEvent } from "react";

export interface ImageUploadProps {
  /** Current image — a data URL (from upload) or a remote URL. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Preview shape. */
  aspect?: "square" | "wide";
  /** Max file size (MB). Oversized/non-image files are rejected via onError. */
  maxMB?: number;
  onError?: (message: string) => void;
  hint?: string;
}

/**
 * Reusable image picker: shows a preview, uploads a local file (stored as a
 * data URL), and supports clear/replace. Used by category & promotion forms.
 */
export function ImageUpload({ value, onChange, label = "Image", aspect = "square", maxMB = 2, onError, hint }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { onError?.("Please choose an image file."); return; }
    if (f.size > maxMB * 1024 * 1024) { onError?.(`Image must be under ${maxMB}MB.`); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(f);
  };

  return (
    <div className="imgup">
      {label && <span className="imgup-label">{label}</span>}
      <div className={`imgup-box ${aspect}`}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="imgup-preview" />
        ) : (
          <button type="button" className="imgup-drop" onClick={() => inputRef.current?.click()}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0L8 8m4-4 4 4" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
            <span>Upload image</span>
          </button>
        )}
        {value && (
          <button type="button" className="imgup-remove" onClick={() => onChange("")} aria-label="Remove image">×</button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="imgup-input" onChange={onFile} />
      </div>
      <div className="imgup-foot">
        {value && <button type="button" className="imgup-change" onClick={() => inputRef.current?.click()}>Replace</button>}
        {hint && <span className="imgup-hint">{hint}</span>}
      </div>
    </div>
  );
}
