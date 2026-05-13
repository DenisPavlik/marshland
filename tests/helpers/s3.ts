import { vi } from "vitest";

export type S3Mocks = {
  send: ReturnType<typeof vi.fn>;
  getSignedUrl: ReturnType<typeof vi.fn>;
};

export function makeS3Mocks(): S3Mocks {
  return {
    send: vi.fn().mockResolvedValue({}),
    getSignedUrl: vi
      .fn()
      .mockResolvedValue("https://signed.example.com/resume.pdf?sig=abc"),
  };
}

export function installS3Mock(mocks: S3Mocks) {
  vi.doMock("@aws-sdk/client-s3", () => {
    class FakeS3Client {
      send = mocks.send;
    }
    class PutObjectCommand {
      input: unknown;
      constructor(input: unknown) {
        this.input = input;
      }
    }
    class GetObjectCommand {
      input: unknown;
      constructor(input: unknown) {
        this.input = input;
      }
    }
    return {
      S3Client: FakeS3Client,
      PutObjectCommand,
      GetObjectCommand,
    };
  });
  vi.doMock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: mocks.getSignedUrl,
  }));
}
