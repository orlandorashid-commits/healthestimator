"use client";

import { useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "./ui";
import { fileToCompressedDataUrl } from "@/lib/utils";

export default function ImageDrop({
  value,
  onChange,
  label = "Add a photo"
}: {
  value?: string;
  onChange: (dataUrl?: string) => void;
  label?: string;
}) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const dataUrl = await fileToCompressedDataUrl(file);
    onChange(dataUrl);
  }

  if (value) {
    return (
      <div className="relative overflow-hidden rounded-xl2 border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Uploaded preview" className="max-h-72 w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label="Remove photo"
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink/70 text-white"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl2 border-2 border-dashed border-line bg-surface p-6 text-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void handleFiles(e.dataTransfer.files);
      }}
    >
      <p className="text-sm font-semibold text-muted">{label}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="secondary" onClick={() => cameraRef.current?.click()}>
          <Camera size={16} /> Take photo
        </Button>
        <Button type="button" variant="ghost" onClick={() => libraryRef.current?.click()}>
          <ImagePlus size={16} /> Choose image
        </Button>
      </div>
      <p className="text-xs text-faint">Photos are compressed and stored only on this device.</p>
      <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
    </div>
  );
}
