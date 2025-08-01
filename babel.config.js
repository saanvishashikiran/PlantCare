module.exports = {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        allowlist: null,
        blocklist: null,
        safe: false,
        allowUndefined: true,
        verbose: false,
      }]
    ]
  };
  