// Build the 32-bit Windows / Windows 7 Arduino package for the Heltec ESP32 core.
// Usage: bun scripts/build.ts --base-url <URL of the folder that will host the dist/ files>
import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { distDir, loadSources, repoRoot, stageDir, type SourcesConfig } from "./lib/config";
import { copyTree, emptyDir, fetchPinned, untarInto, unzipInto, zipFolder, type ArchiveInfo } from "./lib/files";
import { buildIndex, findUpstreamPlatform, type PackageIndex } from "./lib/package-index";

function readBaseUrl(): string {
  const { values } = parseArgs({ options: { "base-url": { type: "string" } } });
  const baseUrl = values["base-url"]?.replace(/\/+$/, "");
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    throw new TypeError("[BUILD]: --base-url must be the http(s) URL that will serve the files in dist/");
  }
  return baseUrl;
}

async function fetchUpstreamIndex(url: string): Promise<PackageIndex> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`[BUILD]: ${url} answered HTTP ${response.status}`);
  return (await response.json()) as PackageIndex;
}

async function buildCoreArchive({ core, upstream }: SourcesConfig, coreUrl: string): Promise<ArchiveInfo> {
  const stage = join(stageDir, "core");
  await emptyDir(stage);
  unzipInto(await fetchPinned({ url: coreUrl, sha256: upstream.platformSha256 }), stage);
  const root = join(stage, core.rootDir);
  for (const file of core.removedFiles) await rm(join(root, file));
  await copyTree(join(repoRoot, core.overlayDir), root);
  return zipFolder(stage, core.rootDir, join(distDir, core.archiveFileName));
}

async function buildEsptoolArchive({ esptool }: SourcesConfig): Promise<ArchiveInfo> {
  const stage = join(stageDir, "esptool");
  await emptyDir(stage);
  const root = join(stage, esptool.rootDir);
  unzipInto(await fetchPinned(esptool.python), root);

  const sitePackages = join(root, esptool.sitePackagesDir);
  await mkdir(sitePackages, { recursive: true });
  for (const pythonPackage of esptool.pythonPackages) {
    const unpacked = join(stageDir, "python-packages", pythonPackage.modules[0]);
    await emptyDir(unpacked);
    const archive = await fetchPinned(pythonPackage);
    if (pythonPackage.format === "sdist") untarInto(archive, unpacked);
    else unzipInto(archive, unpacked);
    for (const module of pythonPackage.modules) {
      await copyTree(join(unpacked, pythonPackage.sourceRoot, module), join(sitePackages, module));
    }
  }

  await copyTree(join(repoRoot, esptool.overlayDir), root);
  return zipFolder(stage, esptool.rootDir, join(distDir, esptool.archiveFileName));
}

/** Windows cmd.exe misreads labels in .bat files with LF endings, so the installer is written with CRLF. */
async function buildInstallerArchive({ installer }: SourcesConfig): Promise<ArchiveInfo> {
  const stage = join(stageDir, "installer");
  await emptyDir(stage);
  const sourceDir = join(repoRoot, installer.sourceDir);
  for (const file of await readdir(sourceDir)) {
    const text = await Bun.file(join(sourceDir, file)).text();
    await Bun.write(join(stage, installer.rootDir, file), text.replace(/\r?\n/g, "\r\n"));
  }
  return zipFolder(stage, installer.rootDir, join(distDir, installer.archiveFileName));
}

const baseUrl = readBaseUrl();
const sources = await loadSources();
const upstream = findUpstreamPlatform(await fetchUpstreamIndex(sources.upstream.indexUrl), sources);

await emptyDir(distDir);
const coreArchive = await buildCoreArchive(sources, upstream.platform.url);
const esptoolArchive = await buildEsptoolArchive(sources);
const index = buildIndex({ sources, upstream, baseUrl, coreArchive, esptoolArchive });
const indexPath = join(distDir, sources.package.indexFileName);
await Bun.write(indexPath, `${JSON.stringify(index, null, 2)}\n`);

const installerArchive = await buildInstallerArchive(sources);
for (const archive of [coreArchive, esptoolArchive, installerArchive]) {
  console.log(`${archive.path}  ${archive.size} bytes  SHA-256:${archive.sha256}`);
}
console.log(`${indexPath}  -> ${baseUrl}/${sources.package.indexFileName}`);
