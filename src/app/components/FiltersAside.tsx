"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSliders,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";

const REMOTE_OPTIONS = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Fully remote" },
];

const TYPE_OPTIONS = [
  { value: "full", label: "Full-time" },
  { value: "part", label: "Part-time" },
  { value: "project", label: "Project" },
];

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-2">
      {children}
    </p>
  );
}

export default function FiltersAside() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [remote, setRemote] = useState<string[]>(
    searchParams.getAll("remote")
  );
  const [type, setType] = useState<string[]>(searchParams.getAll("type"));
  const [salaryMin, setSalaryMin] = useState(
    searchParams.get("salaryMin") ?? ""
  );
  const [salaryMax, setSalaryMax] = useState(
    searchParams.get("salaryMax") ?? ""
  );

  const activeCount =
    (q.trim() ? 1 : 0) +
    remote.length +
    type.length +
    (salaryMin.trim() ? 1 : 0) +
    (salaryMax.trim() ? 1 : 0);

  const hasFilters = activeCount > 0;

  function toggleArrayValue(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    remote.forEach((v) => params.append("remote", v));
    type.forEach((v) => params.append("type", v));
    if (salaryMin.trim()) params.set("salaryMin", salaryMin.trim());
    if (salaryMax.trim()) params.set("salaryMax", salaryMax.trim());
    const query = params.toString();
    router.push(query ? `/jobs?${query}` : "/jobs");
    setOpen(false);
  }

  function handleClear() {
    setQ("");
    setRemote([]);
    setType([]);
    setSalaryMin("");
    setSalaryMax("");
    router.push("/jobs");
    setOpen(false);
  }

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="filters-panel"
        className="lg:hidden w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white ring-1 ring-gray-200 shadow-card hover:ring-swamp-300 transition-all"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <FontAwesomeIcon icon={faSliders} className="size-4 text-swamp-500" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-swamp-500 text-white text-xs font-mono">
              {activeCount}
            </span>
          )}
        </span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`size-3.5 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        id="filters-panel"
        aria-hidden={open ? undefined : true}
        className={`grid lg:!grid-rows-[1fr] lg:!opacity-100 lg:mt-0 transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out motion-reduce:transition-none ${
          open
            ? "grid-rows-[1fr] opacity-100 mt-3"
            : "grid-rows-[0fr] opacity-0 mt-0 lg:mt-0"
        }`}
      >
        <div className="overflow-hidden lg:overflow-visible">
          <form
            onSubmit={handleApply}
            className={`card p-5 space-y-6 ${
              open ? "motion-safe:animate-slide-down lg:animate-none" : ""
            }`}
          >
          <div>
            <FilterLabel>Search</FilterLabel>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, skill, company…"
              className="input-base text-sm"
            />
          </div>

          <div>
            <FilterLabel>Work mode</FilterLabel>
            <div className="space-y-1">
              {REMOTE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 hover:text-gray-900 py-2.5 min-h-[44px]"
                >
                  <input
                    type="checkbox"
                    checked={remote.includes(opt.value)}
                    onChange={() => toggleArrayValue(setRemote, opt.value)}
                    className="size-5 rounded accent-swamp-500 cursor-pointer"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <FilterLabel>Employment</FilterLabel>
            <div className="space-y-1">
              {TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 hover:text-gray-900 py-2.5 min-h-[44px]"
                >
                  <input
                    type="checkbox"
                    checked={type.includes(opt.value)}
                    onChange={() => toggleArrayValue(setType, opt.value)}
                    className="size-5 rounded accent-swamp-500 cursor-pointer"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <FilterLabel>Salary (k/year)</FilterLabel>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="Min"
                className="input-base text-sm font-mono"
              />
              <span className="text-gray-400">–</span>
              <input
                type="number"
                min={0}
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="Max"
                className="input-base text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {hasFilters ? (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center min-h-[44px] text-sm text-gray-500 hover:text-swamp-600 transition-colors"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="btn-primary text-sm px-5 py-2 min-h-[44px]"
            >
              Apply
            </button>
          </div>
        </form>
        </div>
      </div>
    </aside>
  );
}
