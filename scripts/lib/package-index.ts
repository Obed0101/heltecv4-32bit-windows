import type { ArchiveInfo } from "./files";
import type { SourcesConfig } from "./config";

interface ToolSystem {
  host: string;
  url: string;
  archiveFileName: string;
  checksum: string;
  size: string;
}

interface Tool {
  name: string;
  version: string;
  systems: ToolSystem[];
}

interface ToolDependency {
  packager: string;
  name: string;
  version: string;
}

interface Platform {
  name: string;
  version: string;
  url: string;
  archiveFileName: string;
  checksum: string;
  size: string;
  toolsDependencies: ToolDependency[];
  [key: string]: unknown;
}

interface Package {
  name: string;
  maintainer: string;
  platforms: Platform[];
  tools: Tool[];
  [key: string]: unknown;
}

export interface PackageIndex {
  packages: Package[];
}

export interface UpstreamPlatform {
  upstreamPackage: Package;
  platform: Platform;
}

export function findUpstreamPlatform(index: PackageIndex, { upstream }: SourcesConfig): UpstreamPlatform {
  const upstreamPackage = index.packages.find((entry) => entry.name === upstream.packageName);
  const platform = upstreamPackage?.platforms.find((entry) => entry.version === upstream.platformVersion);
  if (!upstreamPackage || !platform) {
    throw new RangeError(
      `[INDEX]: ${upstream.packageName} ${upstream.platformVersion} is not in ${upstream.indexUrl}`,
    );
  }
  if (platform.checksum !== `SHA-256:${upstream.platformSha256}`) {
    throw new RangeError(`[INDEX]: upstream platform checksum changed to ${platform.checksum}`);
  }
  return { upstreamPackage, platform };
}

function archiveSystem(host: string, baseUrl: string, fileName: string, archive: ArchiveInfo): ToolSystem {
  return {
    host,
    url: `${baseUrl}/${fileName}`,
    archiveFileName: fileName,
    checksum: `SHA-256:${archive.sha256}`,
    size: String(archive.size),
  };
}

/** Offer the upstream 32-bit Windows archive of a tool to every Windows host. */
function win32OnlyTool(upstreamPackage: Package, dependency: ToolDependency, sources: SourcesConfig): Tool {
  const tool = upstreamPackage.tools.find(
    (entry) => entry.name === dependency.name && entry.version === dependency.version,
  );
  const system = tool?.systems.find((entry) => entry.host === sources.upstream.win32Host);
  if (!tool || !system) {
    throw new RangeError(`[INDEX]: upstream has no ${sources.upstream.win32Host} build of ${dependency.name}`);
  }
  return { ...tool, systems: sources.package.hosts.map((host) => ({ ...system, host })) };
}

export interface BuildIndexInput {
  sources: SourcesConfig;
  upstream: UpstreamPlatform;
  baseUrl: string;
  coreArchive: ArchiveInfo;
  esptoolArchive: ArchiveInfo;
}

export function buildIndex({ sources, upstream, baseUrl, coreArchive, esptoolArchive }: BuildIndexInput): PackageIndex {
  const { upstreamPackage, platform } = upstream;
  const { package: target, esptool, core } = sources;
  const upstreamDependencies = platform.toolsDependencies;

  const keptDependencies = upstreamDependencies.filter(
    (dependency) =>
      dependency.packager === sources.upstream.packageName && sources.upstream.keptTools.includes(dependency.name),
  );
  const foreignDependencies = upstreamDependencies.filter((dependency) =>
    sources.upstream.keptForeignTools.some(
      (kept) => kept.packager === dependency.packager && kept.name === dependency.name,
    ),
  );
  const missing = [
    ...sources.upstream.keptTools.filter((name) => !keptDependencies.some((dependency) => dependency.name === name)),
    ...sources.upstream.keptForeignTools
      .filter((kept) => !foreignDependencies.some((dependency) => dependency.name === kept.name))
      .map((kept) => kept.name),
  ];
  if (missing.length > 0) throw new RangeError(`[INDEX]: upstream no longer depends on ${missing.join(", ")}`);

  const esptoolTool: Tool = {
    name: esptool.toolName,
    version: esptool.toolVersion,
    systems: target.hosts.map((host) => archiveSystem(host, baseUrl, esptool.archiveFileName, esptoolArchive)),
  };

  const { tools: _upstreamTools, platforms: _upstreamPlatforms, ...packageInfo } = upstreamPackage;
  return {
    packages: [
      {
        ...packageInfo,
        name: target.name,
        maintainer: target.maintainer,
        platforms: [
          {
            ...platform,
            name: target.platformName,
            url: `${baseUrl}/${core.archiveFileName}`,
            archiveFileName: core.archiveFileName,
            checksum: `SHA-256:${coreArchive.sha256}`,
            size: String(coreArchive.size),
            toolsDependencies: [
              ...keptDependencies.map((dependency) => ({ ...dependency, packager: target.name })),
              { packager: target.name, name: esptool.toolName, version: esptool.toolVersion },
              ...foreignDependencies,
            ],
          },
        ],
        tools: [
          ...keptDependencies.map((dependency) => win32OnlyTool(upstreamPackage, dependency, sources)),
          esptoolTool,
        ],
      },
    ],
  };
}
