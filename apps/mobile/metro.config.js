const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { jsImportToTsCandidates } = require('./metro-resolve');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// Workspace packages use TypeScript ESM imports (`./foo.js` → `foo.ts`).
// Resolve platform-specific files first — rewriting straight to `.ts` skips
// `platform.native.ts` and the mobile app then loads Web Crypto.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const candidate of jsImportToTsCandidates(moduleName, platform)) {
    try {
      return context.resolveRequest(context, candidate, platform);
    } catch {
      // try next candidate
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
