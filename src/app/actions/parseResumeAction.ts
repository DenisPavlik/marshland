"use server";

import Anthropic from "@anthropic-ai/sdk";

export type ParsedResume = {
  fullName?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  yearsOfExperience?:
    | "less_than_1"
    | "1_2"
    | "3_5"
    | "5_10"
    | "10_plus";
};

export async function parseResumeAction(
  base64Pdf: string
): Promise<ParsedResume> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Resume parsing is not configured");
  }
  if (!base64Pdf) {
    throw new Error("No PDF provided");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system:
      "You are a precise resume parser. Extract the requested fields from the attached PDF resume. If a field is not clearly present, omit it — never invent or guess.",
    tools: [
      {
        name: "save_parsed_resume",
        description:
          "Save the structured fields extracted from the candidate's resume.",
        input_schema: {
          type: "object",
          properties: {
            fullName: {
              type: "string",
              description: "Candidate's full name as printed on the resume.",
            },
            email: {
              type: "string",
              description: "Primary email address.",
            },
            phone: {
              type: "string",
              description:
                "Primary phone number, preserving original formatting.",
            },
            linkedinUrl: {
              type: "string",
              description:
                "Extract the full LinkedIn profile URL. Include the complete URL exactly as shown including any numeric ID. Must contain 'linkedin.com/in/' — if no such URL exists in the document, return null. Never use email address as LinkedIn URL.",
            },
            yearsOfExperience: {
              type: "string",
              enum: ["less_than_1", "1_2", "3_5", "5_10", "10_plus"],
              description:
                "Bucket of total professional working experience based on dates of employment listed.",
            },
          },
        },
      },
    ],
    tool_choice: { type: "tool", name: "save_parsed_resume" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Pdf,
            },
          },
          {
            type: "text",
            text: "Extract fullName, email, phone, linkedinUrl, and yearsOfExperience from this resume. Pick ONE yearsOfExperience bucket based on the candidate's total professional working years. Omit any field you cannot extract with high confidence.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (toolUse && toolUse.type === "tool_use") {
    const parsed = toolUse.input as ParsedResume;
    console.log("[parseResumeAction] raw tool result:", parsed);
    if (parsed.linkedinUrl) {
      parsed.linkedinUrl = normalizeLinkedinUrl(parsed.linkedinUrl);
    }
    return parsed;
  }
  console.log("[parseResumeAction] no tool_use block returned");
  return {};
}

function normalizeLinkedinUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}
