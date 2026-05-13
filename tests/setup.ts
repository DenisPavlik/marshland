import { config } from "dotenv";
import { vi } from "vitest";

config({ path: ".env.test" });

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    const err = new Error(`NEXT_REDIRECT:${path}`);
    (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;${path}`;
    throw err;
  }),
}));

vi.mock("@workos-inc/authkit-nextjs", () => ({
  getUser: vi.fn(),
  handleAuth: vi.fn(),
  authkitMiddleware: vi.fn(),
}));
