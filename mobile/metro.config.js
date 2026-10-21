const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Support 3D asset formats
const defaultAssetExts = config.resolver.assetExts || [];
config.resolver.assetExts = Array.from(
  new Set([...defaultAssetExts, 'glb', 'gltf', 'obj', 'mtl', 'bin'])
);

module.exports = config;
