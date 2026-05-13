"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faPhone,
  faStar,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import {
  CitySelect,
  CountrySelect,
  StateSelect,
  //@ts-ignore
} from "react-country-state-city";
import "react-country-state-city/dist/react-country-state-city.css";
import ImageUpload from "./ImageUpload";
import { saveJobAction } from "../actions/jobActions";
import { redirect } from "next/navigation";
import type { Job } from "@/models/Job";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary px-12 py-3 group active:scale-[0.98] transition-transform"
    >
      {pending ? (
        <>
          <span className="inline-block size-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Saving…
        </>
      ) : (
        "Publish job"
      )}
    </button>
  );
}

type RadioOption = { value: string; label: string };

function RadioCardGroup({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: RadioOption[];
  defaultValue: string;
}) {
  return (
    <div className="grid gap-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="group cursor-pointer flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl bg-white ring-1 ring-gray-200 hover:ring-swamp-300 transition-all active:scale-[0.98] has-[:checked]:bg-swamp-50 has-[:checked]:ring-swamp-500"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={defaultValue === opt.value}
            className="size-4 accent-swamp-500 cursor-pointer"
          />
          <span className="text-sm text-gray-700 transition-colors group-has-[:checked]:text-swamp-700 group-has-[:checked]:font-medium">
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-mono text-xs uppercase tracking-wider text-gray-400 mb-2"
    >
      {children}
    </label>
  );
}

export default function JobForm({
  orgId,
  jobDoc,
}: {
  orgId: string;
  jobDoc?: Job;
}) {
  const [countryId, setCountryId] = useState(jobDoc?.countryId || 0);
  const [stateId, setStateId] = useState(jobDoc?.stateId || 0);
  const [cityId, setCityId] = useState(jobDoc?.cityId || 0);

  const [countryName, setCountryName] = useState(jobDoc?.country || "");
  const [stateName, setStateName] = useState(jobDoc?.state || "");
  const [cityName, setCityName] = useState(jobDoc?.city || "");

  async function handleSave(data: FormData) {
    data.set("country", countryName);
    data.set("state", stateName);
    data.set("city", cityName);
    data.set("orgId", orgId);
    data.set("countryId", countryId.toString());
    data.set("stateId", stateId.toString());
    data.set("cityId", cityId.toString());
    const saved = await saveJobAction(data);
    redirect(`/jobs/${saved.orgId}`);
  }

  return (
    <form action={handleSave} className="container max-w-3xl py-12 space-y-10">
      <header className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]">
        <h1 className="font-serif text-4xl text-gray-900">
          {jobDoc ? "Edit role" : "Post a role"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Tell candidates what makes this position worth their time.
        </p>
      </header>

      {jobDoc && <input type="hidden" name="id" value={jobDoc._id} />}

      <div className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:120ms]">
        <FieldLabel htmlFor="title">Job title</FieldLabel>
        <input
          id="title"
          name="title"
          required
          defaultValue={jobDoc?.title || ""}
          placeholder="Senior Backend Engineer"
          className="input-base text-lg"
        />
      </div>

      <div className="grid sm:grid-cols-[auto_1fr] gap-8 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:200ms]">
        <div>
          <FieldLabel>Icon</FieldLabel>
          <ImageUpload
            name="jobIcon"
            icon={faStar}
            defaultValue={jobDoc?.jobIcon || ""}
          />
        </div>

        <div>
          <FieldLabel>Contact person</FieldLabel>
          <div className="flex gap-4">
            <ImageUpload
              name="contactPhoto"
              icon={faUser}
              defaultValue={jobDoc?.contactPhoto || ""}
            />
            <div className="grow flex flex-col gap-2">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faUser}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
                />
                <input
                  type="text"
                  name="contactName"
                  required
                  defaultValue={jobDoc?.contactName || ""}
                  placeholder="Full name"
                  aria-label="Contact full name"
                  className="input-base pl-10"
                />
              </div>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faPhone}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
                />
                <input
                  type="tel"
                  name="contactPhone"
                  required
                  defaultValue={jobDoc?.contactPhone || ""}
                  placeholder="Phone"
                  aria-label="Contact phone"
                  className="input-base pl-10"
                />
              </div>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
                />
                <input
                  type="email"
                  name="contactEmail"
                  required
                  defaultValue={jobDoc?.contactEmail || ""}
                  placeholder="Email"
                  aria-label="Contact email"
                  className="input-base pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:280ms]">
        <div>
          <FieldLabel>Work mode</FieldLabel>
          <RadioCardGroup
            name="remote"
            defaultValue={jobDoc?.remote || "onsite"}
            options={[
              { value: "onsite", label: "On-site" },
              { value: "hybrid", label: "Hybrid" },
              { value: "remote", label: "Fully remote" },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Engagement</FieldLabel>
          <RadioCardGroup
            name="type"
            defaultValue={jobDoc?.type || "full"}
            options={[
              { value: "project", label: "Project" },
              { value: "part", label: "Part-time" },
              { value: "full", label: "Full-time" },
            ]}
          />
        </div>
        <div>
          <FieldLabel htmlFor="salary">Salary</FieldLabel>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono">
              $
            </span>
            <input
              id="salary"
              type="number"
              name="salary"
              min={0}
              defaultValue={jobDoc?.salary || ""}
              placeholder="120"
              className="input-base pl-7 pr-16 font-mono"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">
              k/year
            </span>
          </div>
        </div>
      </div>

      <div className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:360ms]">
        <FieldLabel>Location</FieldLabel>
        <div className="grid sm:grid-cols-3 gap-3">
          <CountrySelect
            defaultValue={countryId ? { id: countryId, name: countryName } : ""}
            onChange={(e: any) => {
              setCountryId(e.id);
              setCountryName(e.name);
            }}
            placeHolder="Country"
          />
          <StateSelect
            defaultValue={stateId ? { id: stateId, name: stateName } : ""}
            countryid={countryId}
            onChange={(e: any) => {
              setStateId(e.id);
              setStateName(e.name);
            }}
            placeHolder="State"
          />
          <CitySelect
            defaultValue={cityId ? { id: cityId, name: cityName } : ""}
            countryid={countryId}
            stateid={stateId}
            onChange={(e: any) => {
              setCityId(e.id);
              setCityName(e.name);
            }}
            placeHolder="City"
          />
        </div>
      </div>

      <div className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:440ms]">
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <textarea
          id="description"
          name="description"
          required
          rows={8}
          defaultValue={jobDoc?.description || ""}
          placeholder="What will the candidate work on? What does success look like?"
          className="input-base resize-y leading-relaxed"
        />
      </div>

      <div className="flex justify-end pt-2 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:520ms]">
        <SubmitButton />
      </div>
    </form>
  );
}
