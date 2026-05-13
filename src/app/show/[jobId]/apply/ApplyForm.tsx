"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudArrowUp,
  faFilePdf,
  faRocket,
  faSpinner,
  faXmark,
  faCheck,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { submitApplication } from "@/app/actions/applicationActions";
import {
  parseResumeAction,
  type ParsedResume,
} from "@/app/actions/parseResumeAction";

type AutofillState = "idle" | "parsing" | "success" | "error";

const YEARS_FROM_API: Record<
  NonNullable<ParsedResume["yearsOfExperience"]>,
  string
> = {
  less_than_1: "<1",
  "1_2": "1-2",
  "3_5": "3-5",
  "5_10": "5-10",
  "10_plus": "10+",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary px-10 py-3"
    >
      {pending ? (
        <>
          <span className="inline-block size-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Submitting…
        </>
      ) : (
        "Submit application"
      )}
    </button>
  );
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-mono text-xs uppercase tracking-wider text-gray-500 mb-2"
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-2xl text-gray-900 mb-5">{children}</h2>
  );
}

type RadioOption = { value: string; label: string };

function RadioPills({
  name,
  options,
  required,
}: {
  name: string;
  options: RadioOption[];
  required?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="cursor-pointer flex items-center justify-center text-center rounded-xl px-4 py-3 min-h-[44px] bg-white ring-1 ring-gray-300 hover:ring-swamp-400 transition-all has-[:checked]:bg-swamp-50 has-[:checked]:ring-swamp-500"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            required={required}
            className="sr-only"
          />
          <span className="text-sm text-gray-700">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function ApplyForm({ jobId }: { jobId: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");

  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [whyText, setWhyText] = useState("");

  const [autofillState, setAutofillState] = useState<AutofillState>("idle");
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [justFilled, setJustFilled] = useState<Set<string>>(new Set());

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice(
      window.matchMedia("(hover: none) and (pointer: coarse)").matches
    );
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const autofillInputRef = useRef<HTMLInputElement>(null);

  async function uploadResume(file: File) {
    setUploadError(null);
    if (file.type !== "application/pdf") {
      setUploadError("PDF only");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File too large. Max 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const res = await axios.post("/api/upload-resume", data);
      setResumeUrl(res.data.url);
      setResumeName(res.data.fileName || file.name);
    } catch (e: any) {
      setUploadError(e?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (file) uploadResume(file);
  }

  function handleDrop(ev: DragEvent<HTMLDivElement>) {
    ev.preventDefault();
    setDragOver(false);
    const file = ev.dataTransfer.files?.[0];
    if (file) uploadResume(file);
  }

  function clearResume() {
    setResumeUrl("");
    setResumeName("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAutofill(file: File) {
    setAutofillError(null);

    if (file.type !== "application/pdf") {
      setAutofillError("PDF only");
      setAutofillState("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAutofillError("File too large. Max 10 MB.");
      setAutofillState("error");
      return;
    }

    setAutofillState("parsing");

    try {
      const base64 = await fileToBase64(file);
      const [parsed] = await Promise.all([
        parseResumeAction(base64),
        uploadResume(file),
      ]);

      const filled = new Set<string>();
      if (parsed.fullName) {
        setFullName(parsed.fullName);
        filled.add("fullName");
      }
      if (parsed.email) {
        setEmail(parsed.email);
        filled.add("email");
      }
      if (parsed.phone) {
        setPhone(parsed.phone);
        filled.add("phone");
      }
      if (
        typeof parsed.linkedinUrl === "string" &&
        parsed.linkedinUrl.trim() &&
        parsed.linkedinUrl.toLowerCase().includes("linkedin.com")
      ) {
        setLinkedinUrl(parsed.linkedinUrl);
        filled.add("linkedinUrl");
      }
      if (parsed.yearsOfExperience) {
        setYearsOfExperience(YEARS_FROM_API[parsed.yearsOfExperience] || "");
        filled.add("yearsOfExperience");
      }

      setJustFilled(filled);
      setAutofillState("success");
      setTimeout(() => setJustFilled(new Set()), 1500);
    } catch (e: any) {
      setAutofillError(e?.message || "Failed to parse resume");
      setAutofillState("error");
    }
  }

  function handleAutofillInput(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (file) handleAutofill(file);
  }

  return (
    <form action={submitApplication} className="space-y-12">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="resumeUrl" value={resumeUrl} />

      <div className="rounded-2xl bg-gradient-to-br from-swamp-50 to-white ring-1 ring-swamp-200 p-5 opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:50ms]">
        <div className="flex items-start gap-4">
          <div
            className={`size-10 shrink-0 rounded-xl bg-white ring-1 ring-swamp-200 flex items-center justify-center motion-safe:transition-transform motion-safe:duration-300 ${
              autofillState === "success" ? "motion-safe:scale-110" : ""
            }`}
          >
            <div key={autofillState} className="motion-safe:animate-fade-in">
              <FontAwesomeIcon
                icon={
                  autofillState === "parsing"
                    ? faSpinner
                    : autofillState === "success"
                    ? faCheck
                    : autofillState === "error"
                    ? faTriangleExclamation
                    : faRocket
                }
                className={`text-swamp-500 ${
                  autofillState === "parsing" ? "animate-spin" : ""
                } ${autofillState === "error" ? "text-red-500" : ""}`}
              />
            </div>
          </div>
          <div className="grow">
            <p className="font-serif text-lg text-gray-900">
              {autofillState === "idle" && "Autofill from resume"}
              {autofillState === "parsing" && "Parsing resume…"}
              {autofillState === "success" &&
                "Fields filled from your resume ✓"}
              {autofillState === "error" && "Couldn't parse resume"}
            </p>
            <p
              className={`text-sm mt-0.5 ${
                autofillState === "error" ? "text-red-600" : "text-gray-600"
              }`}
            >
              {autofillState === "idle" &&
                "We'll parse your resume with AI and fill these fields for you."}
              {autofillState === "parsing" &&
                "This usually takes a few seconds."}
              {autofillState === "success" &&
                "Review and edit anything below before submitting."}
              {autofillState === "error" &&
                (autofillError || "Something went wrong. Try again.")}
            </p>
          </div>
          {autofillState !== "parsing" && (
            <button
              type="button"
              onClick={() => autofillInputRef.current?.click()}
              className={`shrink-0 self-center inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-full text-sm font-medium transition-colors ${
                autofillState === "success"
                  ? "text-swamp-700 bg-white ring-1 ring-swamp-200 hover:bg-swamp-50"
                  : "text-white bg-swamp-500 hover:bg-swamp-600"
              }`}
            >
              {autofillState === "idle" && "Upload & autofill"}
              {autofillState === "success" && "Try another"}
              {autofillState === "error" && "Try again"}
            </button>
          )}
        </div>
        <input
          ref={autofillInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleAutofillInput}
        />
      </div>

      <section className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:130ms]">
        <SectionTitle>Personal info</SectionTitle>
        <div className="space-y-5">
          <div>
            <FieldLabel htmlFor="fullName" required>
              Full name
            </FieldLabel>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              maxLength={200}
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`input-base ${
                justFilled.has("fullName")
                  ? "ring-swamp-400 motion-safe:animate-pulse"
                  : ""
              }`}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel htmlFor="email" required>
                Email
              </FieldLabel>
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={200}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-base ${
                  justFilled.has("email")
                    ? "ring-swamp-400 motion-safe:animate-pulse"
                    : ""
                }`}
              />
            </div>
            <div>
              <FieldLabel htmlFor="phone" required>
                Phone
              </FieldLabel>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                maxLength={50}
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`input-base ${
                  justFilled.has("phone")
                    ? "ring-swamp-400 motion-safe:animate-pulse"
                    : ""
                }`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:210ms]">
        <SectionTitle>Resume</SectionTitle>
        <FieldLabel required>Upload your resume (PDF)</FieldLabel>
        <div
          onDragOver={
            isTouchDevice
              ? undefined
              : (e) => {
                  e.preventDefault();
                  setDragOver(true);
                }
          }
          onDragLeave={isTouchDevice ? undefined : () => setDragOver(false)}
          onDrop={isTouchDevice ? undefined : handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 min-h-[120px] ${
            dragOver
              ? "border-swamp-500 bg-swamp-50 motion-safe:scale-[1.01]"
              : "border-gray-300 hover:border-swamp-400 hover:bg-gray-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileInput}
          />

          {uploading && (
            <div className="text-gray-500 flex flex-col items-center gap-2">
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-swamp-500 text-2xl animate-spin"
              />
              <p className="text-sm">Uploading…</p>
            </div>
          )}

          {!uploading && resumeUrl && (
            <div className="flex items-center justify-center gap-3">
              <FontAwesomeIcon
                icon={faFilePdf}
                className="text-swamp-500 text-2xl"
              />
              <div className="text-left">
                <p className="text-gray-900 font-medium text-sm">
                  {resumeName}
                </p>
                <p className="text-xs text-gray-500">
                  Click to replace, or
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearResume();
                }}
                className="size-11 rounded-full bg-white ring-1 ring-gray-300 hover:ring-red-300 hover:text-red-500 flex items-center justify-center text-gray-500 transition-colors"
                aria-label="Remove resume"
              >
                <FontAwesomeIcon icon={faXmark} className="size-4" />
              </button>
            </div>
          )}

          {!uploading && !resumeUrl && (
            <div className="flex flex-col items-center gap-2">
              <FontAwesomeIcon
                icon={faCloudArrowUp}
                className={`text-3xl transition-colors ${
                  dragOver
                    ? "text-swamp-500 motion-safe:animate-bounce"
                    : "text-gray-400"
                }`}
              />
              <p className="text-gray-900 font-medium">
                {isTouchDevice ? (
                  <>
                    Tap to upload your resume
                  </>
                ) : (
                  <>
                    Drop your resume here, or{" "}
                    <span className="text-swamp-600">browse</span>
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500">PDF only · max 10 MB</p>
            </div>
          )}
        </div>
        {uploadError && (
          <p className="mt-2 font-mono text-xs text-red-600">{uploadError}</p>
        )}
      </section>

      <section className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:290ms]">
        <SectionTitle>Profile</SectionTitle>
        <div className="space-y-5">
          <div>
            <FieldLabel htmlFor="linkedinUrl">LinkedIn URL</FieldLabel>
            <input
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              maxLength={500}
              placeholder="https://linkedin.com/in/yourname"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className={`input-base ${
                justFilled.has("linkedinUrl")
                  ? "ring-swamp-400 motion-safe:animate-pulse"
                  : ""
              }`}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Autofill may miss this — paste your full URL if needed.
            </p>
          </div>
          <div>
            <FieldLabel required>
              Do you have the right to work in this location?
            </FieldLabel>
            <RadioPills
              name="workAuthorization"
              required
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </div>
          <div>
            <FieldLabel htmlFor="whyJoin" required>
              Why do you want to work here?
            </FieldLabel>
            <textarea
              id="whyJoin"
              name="whyJoin"
              required
              rows={5}
              maxLength={500}
              value={whyText}
              onChange={(e) => setWhyText(e.target.value)}
              placeholder="Tell us what excites you about this role…"
              className="input-base resize-y leading-relaxed"
            />
            <div
              className={`mt-1 text-right font-mono text-xs transition-colors ${
                whyText.length >= 500
                  ? "text-red-500"
                  : whyText.length >= 400
                  ? "text-amber-500"
                  : "text-gray-400"
              }`}
            >
              {whyText.length}/500
            </div>
          </div>
        </div>
      </section>

      <section className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:370ms]">
        <SectionTitle>Experience</SectionTitle>
        <div>
          <FieldLabel htmlFor="yearsOfExperience" required>
            Years of experience
          </FieldLabel>
          <select
            id="yearsOfExperience"
            name="yearsOfExperience"
            required
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(e.target.value)}
            className={`input-base appearance-none bg-no-repeat bg-[length:1em] bg-[right_1rem_center] bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20320%20512%22%3E%3Cpath%20fill=%22%239ca3af%22%20d=%22M137.4%20374.6c12.5%2012.5%2032.8%2012.5%2045.3%200l128-128c9.2-9.2%2011.9-22.9%206.9-34.9s-16.6-19.8-29.6-19.8L32%20192c-12.9%200-24.6%207.8-29.6%2019.8s-2.2%2025.7%206.9%2034.9l128%20128z%22/%3E%3C/svg%3E')] pr-10 ${
              justFilled.has("yearsOfExperience")
                ? "ring-swamp-400 motion-safe:animate-pulse"
                : ""
            }`}
          >
            <option value="" disabled>
              Select an option
            </option>
            <option value="<1">Less than 1 year</option>
            <option value="1-2">1–2 years</option>
            <option value="3-5">3–5 years</option>
            <option value="5-10">5–10 years</option>
            <option value="10+">10+ years</option>
          </select>
        </div>
      </section>

      <section className="opacity-0 motion-safe:animate-fade-up motion-reduce:opacity-100 [animation-delay:450ms]">
        <SectionTitle>Voluntary disclosures</SectionTitle>
        <p className="text-sm text-gray-500 -mt-3 mb-6 max-w-prose">
          These questions help us measure our progress on equal opportunity.
          Your answers do not affect your application.
        </p>
        <div className="space-y-5">
          <div>
            <FieldLabel required>Gender</FieldLabel>
            <RadioPills
              name="gender"
              required
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "decline", label: "Decline to self-identify" },
              ]}
            />
          </div>
          <div>
            <FieldLabel required>Veteran status</FieldLabel>
            <RadioPills
              name="veteranStatus"
              required
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
                { value: "decline", label: "Decline to self-identify" },
              ]}
            />
          </div>
          <div>
            <FieldLabel required>Disability status</FieldLabel>
            <RadioPills
              name="disabilityStatus"
              required
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
                { value: "decline", label: "Decline to self-identify" },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
