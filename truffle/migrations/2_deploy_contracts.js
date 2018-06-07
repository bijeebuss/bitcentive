var BitCentive = artifacts.require('BitCentive');

module.exports = function(deployer, network, accounts) {
  return deployer.deploy(BitCentive)
  .then(() => BitCentive.deployed())
  .then(bitcentive => {
    return bitcentive.setCharity(accounts[1]);
  });
};
