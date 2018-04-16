const BigNumber = require('bignumber.js');
import {
  assertEtherAlmostEqual, assertInvalidOpcode,  assertNumberEqual, wait } from './helpers';
const BitCentive = artifacts.require('BitCentive');

console.log('asdf');
const oneEther = new BigNumber(web3.toWei(2, 'ether'));

contract('BitCentive', (accounts) => {
  const owner = accounts[0];
  let bitCentive: any;

  beforeEach(async () => {
    // deploy tokens
    bitCentive = await BitCentive.new({from: owner});
  });


  context('After fresh deploy.', () => {
    it('should have the correct owner', async () => {
      assert.equal(await bitCentive.owner.call(), owner);
    });

    it('should work', async () => {
      try {
        await bitCentive.test();
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });
  });
});
