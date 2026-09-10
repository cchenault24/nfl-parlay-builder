// Expo's own flat config, unmodified. It is the only lint config in the repo
// that understands React Native and the Expo plugins — notably
// expo/no-dynamic-env-var, which catches env reads that resolve in the
// emulator and are undefined in a release build.
const expoConfig = require('eslint-config-expo/flat')

module.exports = [...expoConfig, { ignores: ['dist/*', '.expo/*'] }]
