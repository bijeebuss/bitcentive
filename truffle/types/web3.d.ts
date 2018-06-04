declare module 'web3' {
  type NumberLike = number | string | BigNumber;
  import { BigNumber } from "bignumber.js";

  type Callback<T> = (err: Error | null, value: T) => void;

  class Web3 {
    public static providers: typeof providers;

    public version: {
      network: string;
      getNetwork(callback: Callback<string>): void;
      getNode(callback: Callback<string>): void;
    };

    public eth: {
      estimateGas: any;
      getGasPrice: any;
      accounts: string[];
      coinbase: string;
      defaultAccount: string;
      blockNumber: number;
      sign(
        address: string,
        message: string,
        callback?: Callback<string>,
      ): string;
      getBlock(
        blockHashOrBlockNumber: string | number,
        returnTransactionObjects: boolean,
        callback: Callback<Web3.Block>,
      ): void;
      getBlockNumber(callback: Callback<number>): void;
      contract<A>(abi: Web3.ContractAbi): Web3.Contract<A>;
      getBalance(
        addressHexString: string,
        callback?: Callback<BigNumber>,
      ): BigNumber;
      getCode(addressHexString: string, callback?: Callback<string>): string;
      filter(value: 'pending'): Web3.FilterPendingResult;
      filter(value: string | Web3.FilterObject): Web3.FilterResult;
      getAccounts(callback: Callback<any>): string[];
      sendTransaction(txData: Web3.TxData, callback: Callback<string>): void;
      getTransactionReceipt(txHash: string, callback?: Callback<any>): Web3.TransactionReceipt;
      getTransactionCount(
        addressHexString: string,
        defaultBlock: number | string,
        callback: Callback<number>,
      ): number;
      getTransactionCount(
        addressHexString: string,
        callback: Callback<number>,
      ): number;
      getTransaction(
        txHash: string,
        callback: Callback<Web3.TransactionDescription>,
      ): void;
    };

    public currentProvider: Web3.Provider;

    constructor(provider?: Web3.Provider)

    public setProvider(provider: Web3.Provider): void;
    public fromWei(amount: number | BigNumber, unit: string): BigNumber;
    public toWei(amount: BigNumber, unit: string): BigNumber;
    public toWei(amount: number, unit: string): number;
    public toWei(amount: string, unit: string): string;
    public isAddress(address: string): boolean;
  }

  namespace providers {
    class HttpProvider extends Web3.Provider {
      constructor(url?: string | null);
    }
  }

  namespace Web3 {
    type ContractAbi = AbiDefinition[];

    type AbiDefinition = FunctionDescription | EventDescription;

    interface TxData {
      to: string;
      from?: string;
      value?: NumberLike;
      gas?: NumberLike;
      gasPrice?: NumberLike;
      data?: string;
      nonce?: number;
    }

    interface TransactionDescription {
      hash: string;
      nonce: number,
      blockHash: string | null,
      blockNumber: number | null,
      transactionIndex: number | null,
      from: string,
      to: string | null,
      value: BigNumber,
      gas: number,
      gasPrice: BigNumber,
      input: string
    }

    interface TransactionReceipt {
      blockHash: string;
      blockNumber: number;
      transactionHash: string;
      transactionIndex: number;
      from: string;
      to: string;
      cumulativeGasUsed: number;
      gasUsed: number;
      contractAddress: string | null;
      logs: any[];
    }

    interface FunctionDescription {
      type: "function" | "constructor" | "fallback";
      name?: string;
      inputs: FunctionParameter[];
      outputs?: FunctionParameter[];
      constant?: boolean;
      payable?: boolean;
    }

    interface EventParameter {
      name: string;
      type: string;
      indexed: boolean;
    }

    interface EventDescription {
      type: "event";
      name: string;
      inputs: EventParameter[];
      anonymous: boolean;
    }

    interface FunctionParameter {
      name: string;
      type: string;
    }

    interface Contract<A> {
      at(address: string): A;
      new: any;
    }

    interface FilterObject {
      fromBlock: number | string;
      toBlock: number | string;
      address: string;
      topics: string[];
    }

    interface SolidityEvent<A> {
      event: string;
      address: string;
      args: A;
    }

    interface FilterResult {
      get<T>(callback: Callback<Array<SolidityEvent<T>>>): void;
      watch<T>(callback: Callback<Array<SolidityEvent<T>>>): void;
      stopWatching(): void;
    }

    interface FilterPendingResult {
      get(callback: Callback<string[]>): void;
      watch(callback: Callback<string>): void;
    }

    interface Block {
      author: string;
      difficulty: BigNumber;
      extraData: string;
      gasLimit: number;
      gasUsed: number;
      hash: string;
      logsBloom: string;
      miner: string;
      number: number;
      parentHash: string;
      receiptsRoot: string;
      sealFields: string[];
      sha3Uncles: string;
      signature: string;
      size: number;
      stateRoot: string;
      step: string;
      timestamp: number;
      totalDifficulty: BigNumber;
      transactions: string[];
      transactionsRoot: string;
      uncles: string[];
    }
    class Provider {
      public sendAsync(data: any, callback: Callback<any>): void;
    }
  }
  export = Web3;
  /* tslint:enable */
}


declare module 'web3/lib/web3/allevents' {
  class AllSolidityEvents {
    constructor(something: any, events: any);
    public decode(data: any): any;
  }
  namespace AllSolidityEvents {}

  export = AllSolidityEvents;
}

