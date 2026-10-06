import { join, resolve } from "node:path";

export interface PinnedDownload {
  url: string;
  sha256: string;
}

export interface PythonPackage extends PinnedDownload {
  format: "sdist" | "wheel";
  sourceRoot: string;
  modules: string[];
}

export interface ForeignTool {
  packager: string;
  name: string;
}

export interface SourcesConfig {
  package: {
    name: string;
    maintainer: string;
    indexFileName: string;
    platformName: string;
    hosts: string[];
  };
  upstream: {
    indexUrl: string;
    packageName: string;
    platformVersion: string;
    platformSha256: string;
    win32Host: string;
    keptTools: string[];
    keptForeignTools: ForeignTool[];
  };
  core: {
    archiveFileName: string;
    rootDir: string;
    overlayDir: string;
    removedFiles: string[];
  };
  installer: {
    archiveFileName: string;
    rootDir: string;
    sourceDir: string;
  };
  esptool: {
    toolName: string;
    toolVersion: string;
    archiveFileName: string;
    rootDir: string;
    overlayDir: string;
    sitePackagesDir: string;
    python: PinnedDownload;
    pythonPackages: PythonPackage[];
  };
}

export const repoRoot = resolve(import.meta.dir, "..", "..");
export const cacheDir = join(repoRoot, ".cache");
export const stageDir = join(repoRoot, ".cache", "stage");
export const distDir = join(repoRoot, "dist");

export async function loadSources(): Promise<SourcesConfig> {
  return (await Bun.file(join(repoRoot, "config", "sources.json")).json()) as SourcesConfig;
}
