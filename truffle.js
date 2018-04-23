module.exports = {
  test_file_extension_regexp: /.*\.(js|ts|es|es6|jsx|sol)$/,
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // Match any network id
      gasPrice: 0,
    }
  },
  mocha: {
    grep: 'after completing the rest of the checkins'
  }
};
