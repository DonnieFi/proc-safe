import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { WindowsJob } from "../src/windows-job.js";

const mocks = vi.hoisted(() => {
  const child = { pid: 123, readStdout: vi.fn(), readStderr: vi.fn(), exitCode: vi.fn(), writeStdin: vi.fn(), closeStdin: vi.fn(), close: vi.fn() };
  const job = { spawn: vi.fn(() => child), close: vi.fn() };
  return { child, job, binding: { createWindowsJob: () => job, openWindowsJob: vi.fn(), openPinnedProcess: vi.fn(), isCurrentProcessInJob: vi.fn() } };
});
vi.mock("../src/native.js", () => ({ getNativeBinding: () => mocks.binding, validatePid: vi.fn() }));
const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
const arch = Object.getOwnPropertyDescriptor(process, "arch")!;
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(process, "platform", { value: "win32" });
  Object.defineProperty(process, "arch", { value: "x64" });
});
afterEach(() => {
  Object.defineProperty(process, "platform", platform);
  Object.defineProperty(process, "arch", arch);
});
const options = { executable: "example.exe", commandLine: "example.exe" };

test("stdin defaults to NUL and opt-in creates a pipe without sending bytes", () => {
  const job = WindowsJob.create();
  for (const stdin of [undefined, "null", "pipe"] as const) {
    const child = job.spawn({ ...options, stdin });
    expect(mocks.job.spawn).toHaveBeenLastCalledWith(options.executable, options.commandLine, undefined, undefined, stdin === "pipe");
    expect(mocks.child.writeStdin).not.toHaveBeenCalled();
    expect(Object.isFrozen(child)).toBe(true);
  }
  // @ts-expect-error runtime validation for JavaScript callers
  expect(() => job.spawn({ ...options, stdin: "inherit" })).toThrow(expect.objectContaining({ code: "invalid-argument" }));
  expect(mocks.job.spawn).toHaveBeenCalledTimes(3);
});

test("empty and non-Buffer inputs fail before reaching native code, without echoing input", () => {
  const child = WindowsJob.create().spawn({ ...options, stdin: "pipe" });
  for (const bytes of [Buffer.alloc(0), "synthetic-private-value", new Uint8Array([1]), null, undefined]) {
    try {
      // @ts-expect-error runtime validation for JavaScript callers
      child.writeStdin(bytes);
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({ code: "invalid-argument" });
      expect(String(error)).not.toContain("synthetic-private-value");
    }
  }
  expect(mocks.child.writeStdin).not.toHaveBeenCalled();
});

test("input close forwards idempotent native closure; child close rejects further operations", () => {
  const child = WindowsJob.create().spawn({ ...options, stdin: "pipe" });
  child.closeStdin(); child.closeStdin();
  expect(mocks.child.closeStdin).toHaveBeenCalledTimes(2);
  child.close(); child.close();
  expect(mocks.child.close).toHaveBeenCalledTimes(1);
  for (const operation of [() => child.closeStdin(), () => child.writeStdin(Buffer.from([1]))]) {
    expect(operation).toThrow(expect.objectContaining({ code: "invalid-argument" }));
  }
  expect(mocks.child.writeStdin).not.toHaveBeenCalled();
});
