"use client";

import { IconDefinition, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChangeEvent, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";

export default function ImageUpload({
  name,
  icon,
  defaultValue = "",
}: {
  name: string;
  icon: IconDefinition;
  defaultValue: string;
}) {
  const fileInRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(ev: ChangeEvent) {
    setError(null);
    const input = ev.target as HTMLInputElement;
    if (!input?.files?.length) return;

    setIsUploading(true);
    try {
      const file = input.files[0];
      const data = new FormData();
      data.set("file", file);
      const response = await axios.post("/api/upload", data);
      if (response.data.url) {
        setUrl(response.data.url);
        setIsImageLoading(true);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-start">
      <div className="relative size-24 rounded-2xl bg-gray-50 ring-1 ring-gray-200 flex items-center justify-center overflow-hidden">
        {(isUploading || isImageLoading) && (
          <FontAwesomeIcon
            icon={faSpinner}
            className="absolute text-swamp-500 animate-spin"
          />
        )}
        {!isUploading && url && (
          <Image
            src={url}
            alt="upload preview"
            width={1024}
            height={1024}
            onLoad={() => setIsImageLoading(false)}
            className={`size-full object-cover transition-opacity duration-300 motion-safe:animate-fade-in ${
              isImageLoading ? "opacity-0" : "opacity-100"
            }`}
          />
        )}
        {!(isUploading || isImageLoading) && !url && (
          <FontAwesomeIcon icon={icon} className="text-gray-400 text-xl" />
        )}
      </div>

      <input type="hidden" name={name} value={url} />

      <div className="mt-2">
        <input
          type="file"
          ref={fileInRef}
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={upload}
        />
        <button
          type="button"
          onClick={() => fileInRef.current?.click()}
          disabled={isUploading}
          className="btn-ghost text-sm px-4"
        >
          {isUploading ? "Uploading…" : url ? "Replace" : "Select file"}
        </button>
      </div>

      {error && (
        <p className="mt-1 font-mono text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
