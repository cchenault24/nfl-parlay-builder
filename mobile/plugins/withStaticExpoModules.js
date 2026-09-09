const { withPodfileProperties } = require('@expo/config-plugins')

// Expo SDK 57 ships its modules as precompiled dynamic frameworks that link
// against @rpath/React.framework/React. This app links React Native
// statically, so that framework is never embedded and the app dies at launch
// with `dyld: Library not loaded`. Building the modules from source instead
// links them against the static React.
module.exports = function withStaticExpoModules(config) {
  return withPodfileProperties(config, (cfg) => {
    cfg.modResults.EXPO_USE_PRECOMPILED_MODULES = 'false'
    return cfg
  })
}
