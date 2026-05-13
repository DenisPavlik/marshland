"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faTrash,
  faInbox,
} from "@fortawesome/free-solid-svg-icons";
import type { Job } from "@/models/Job";
import TimeAgo from "./TimeAgo";
import Link from "next/link";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getLogoUrl } from "@/lib/logoUtils";

export default function JobRow({ jobDoc }: { jobDoc: Job }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const logoUrl = getLogoUrl(jobDoc.orgName);
  const initial = jobDoc.orgName?.charAt(0).toUpperCase() || "?";

  async function handleDelete() {
    setError(null);
    try {
      await axios.delete("/api/jobs?id=" + jobDoc._id);
      setConfirmOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to delete");
    }
  }

  return (
    <article className="group relative card p-5 hover:shadow-card-hover hover:ring-swamp-200">
      <div className="flex gap-4">
        <div className="shrink-0 transition-transform duration-300 group-hover:scale-[1.04]">
          {jobDoc.jobIcon ? (
            <Image
              src={jobDoc.jobIcon}
              alt={`${jobDoc.title} icon`}
              width={500}
              height={500}
              className="size-14 rounded-xl object-cover ring-1 ring-gray-200"
            />
          ) : logoUrl && !logoError ? (
            <Image
              src={logoUrl}
              alt={`${jobDoc.orgName} logo`}
              width={128}
              height={128}
              onError={() => setLogoError(true)}
              className="size-14 rounded-xl object-contain ring-1 ring-gray-200 bg-white"
            />
          ) : (
            <div className="size-14 rounded-xl bg-swamp-50 ring-1 ring-swamp-100 flex items-center justify-center font-mono text-lg text-swamp-700 font-medium">
              {initial}
            </div>
          )}
        </div>

        <div className="grow min-w-0">
          <Link
            href={`/jobs/${jobDoc.orgId}`}
            className="font-mono text-xs uppercase tracking-wider text-gray-500 hover:text-swamp-600 transition-colors"
          >
            {jobDoc.orgName || "—"}
          </Link>

          <h3 className="mt-1 font-serif text-xl text-gray-900 leading-tight">
            <Link
              href={`/show/${jobDoc._id}`}
              className="hover:text-swamp-600 transition-colors"
            >
              {jobDoc.title}
            </Link>
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-gray-500 capitalize">
            <span>{jobDoc.remote}</span>
            <span aria-hidden>·</span>
            <span>
              {jobDoc.city}, {jobDoc.country}
            </span>
            <span aria-hidden>·</span>
            <span>{jobDoc.type}-time</span>
            {jobDoc.salary > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="text-swamp-600">${jobDoc.salary}k</span>
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {jobDoc.isAdmin && (
                <>
                  <Link
                    href={`/jobs/${jobDoc.orgId}/applications/${jobDoc._id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full text-sm font-mono text-swamp-700 bg-swamp-50 ring-1 ring-swamp-200 hover:bg-swamp-100 hover:ring-swamp-300 transition-colors"
                  >
                    <FontAwesomeIcon icon={faInbox} className="size-3.5" />
                    Applications
                  </Link>
                  <Link
                    href={"/jobs/edit/" + jobDoc._id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full text-sm font-mono text-gray-600 bg-gray-50 ring-1 ring-gray-200 hover:text-swamp-600 hover:ring-swamp-300 transition-colors"
                  >
                    <FontAwesomeIcon icon={faPenToSquare} className="size-3.5" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full text-sm font-mono text-red-600 bg-red-50 ring-1 ring-red-100 hover:bg-red-100 transition-colors"
                  >
                    <FontAwesomeIcon icon={faTrash} className="size-3.5" />
                    Delete
                  </button>
                </>
              )}
            </div>
            {jobDoc.createdAt && (
              <div className="ml-auto font-mono text-xs text-gray-400">
                <TimeAgo createdAt={jobDoc.createdAt} />
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
          className="absolute inset-0 z-10 rounded-2xl bg-white/95 backdrop-blur-sm flex items-center justify-center p-5 motion-safe:animate-fade-in"
        >
          <div className="text-center max-w-sm motion-safe:animate-pop-in">
            <p className="text-gray-900 mb-1 font-medium">Delete this job?</p>
            <p className="text-xs text-gray-500 mb-4">
              This action cannot be undone.
            </p>
            {error && (
              <p className="text-xs text-red-600 mb-3 font-mono">{error}</p>
            )}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setError(null);
                }}
                className="btn-ghost"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-medium text-white bg-red-500 hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
