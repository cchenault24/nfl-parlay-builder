// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const repoRoot = path.resolve(projectRoot, '..')
// Cross-client source lives outside this package and is compiled from source
// by both Vite (web) and Metro (here), so Metro has to watch it explicitly.
const sharedRoot = path.resolve(repoRoot, 'shared')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [sharedRoot]
config.resolver.alias = {
  ...config.resolver.alias,
  '@shared': sharedRoot,
}
// Without this Metro walks up and resolves a second copy of React from the
// web app's node_modules at the repo root.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')]
config.resolver.disableHierarchicalLookup = true

module.exports = config
