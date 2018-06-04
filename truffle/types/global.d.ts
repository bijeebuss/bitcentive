import * as Web3 from 'web3';

declare global {
  var artifacts: {
    require(name: string): any
  }
  var web3: Web3;

  var assert: Chai.AssertStatic;

  function contract(
    name: string,
    tests: ((addresses: string[]) => void),
  ): void;
}
