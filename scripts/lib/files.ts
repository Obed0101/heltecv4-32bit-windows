import { createHash } from "node:crypto";
import { cp, mkdir, rm, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { cacheDir, type PinnedDownload } from "./config";

export interface ArchiveInfo {
  path: string;
  sha256: string;
  size: number;
}

export async function sha256Of(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of Bun.file(path).stream()) hash.update(chunk);
  return hash.digest("hex");
}

export async function describeArchive(path: string): Promise<ArchiveInfo> {
  return { path, sha256: await sha256Of(path), size: (await stat(path)).size };
}

function run(command: string[], cwd?: string): void {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) {
    throw new Error(`[BUILD]: ${command.join(" ")} failed: ${result.stderr.toString().trim()}`);
  }
}

/** Download into the cache (once) and refuse any file whose SHA-256 is not the pinned one. */
export async function fetchPinned({ url, sha256 }: PinnedDownload): Promise<string> {
  await mkdir(cacheDir, { recursive: true });
  const target = join(cacheDir, basename(new URL(url).pathname));
  if (!(await Bun.file(target).exists())) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`[BUILD]: ${url} answered HTTP ${response.status}`);
    await Bun.write(target, await response.arrayBuffer());
  }
  const actual = await sha256Of(target);
  if (actual !== sha256) {
    await rm(target);
    throw new RangeError(`[BUILD]: ${url} has SHA-256 ${actual}, expected ${sha256}`);
  }
  return target;
}

export async function emptyDir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
  await mkdir(path, { recursive: true });
}

export function unzipInto(archive: string, destination: string): void {
  run(["unzip", "-q", "-o", archive, "-d", destination]);
}

export function untarInto(archive: string, destination: string): void {
  run(["tar", "-xzf", archive, "-C", destination]);
}

export async function copyTree(source: string, destination: string): Promise<void> {
  await cp(source, destination, {
    recursive: true,
    force: true,
    filter: (entry) => basename(entry) !== "__pycache__" && basename(entry) !== ".DS_Store",
  });
}

/** Zip `rootDir` (a folder inside `parentDir`) so the archive has that single top-level folder. */
export async function zipFolder(parentDir: string, rootDir: string, archive: string): Promise<ArchiveInfo> {
  await rm(archive, { force: true });
  run(["zip", "-q", "-r", "-X", archive, rootDir], parentDir);
  return describeArchive(archive);
}
