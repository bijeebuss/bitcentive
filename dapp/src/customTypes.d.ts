declare module 'truffle-contract' {
  function contract(abi: any): any;
  namespace contract {}

  export = contract;
}
