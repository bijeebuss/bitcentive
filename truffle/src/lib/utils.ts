
type asyncFunc0<T> = (callback: (err: any, result: T ) => void ) => void;
type asyncFunc1<T> = (arg1: any, callback: (err: any, result: T ) => void ) => void;
type asyncFunc2<T> = (arg1: any, arg2: any, callback: (err: any, result: T ) => void ) => void;
type AsyncFunc<T> = asyncFunc0<T> | asyncFunc1<T> | asyncFunc2<T>;

function callFunc<T>(func: any, resolve: any, reject: any, ...args: any[]): void {
  func(...args, (err: any, result: T) => {if (err) {reject(err); } else { resolve(result); }} );
}

export function promiseIfy<T>(func: AsyncFunc<T>, ...args: any[] ): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      callFunc<T>(func, resolve, reject, ...args);
    } catch (err) {
      reject(err);
    }
  });
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}

