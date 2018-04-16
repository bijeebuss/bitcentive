const digix = require('@digix/tempo');
import {BigNumber} from 'bignumber.js';

const tempo = digix(web3);

type NumberLike = string | number | BigNumber;

const ETH_DECIMALS = 18;
const DEFAULT_ACCEPTABLE_ERROR = web3.toWei(1, 'finney');


export function assertInvalidOpcode(error: Error) {
  assert(
    error.message.indexOf('invalid opcode') !== -1 ||
    error.message.indexOf('VM Exception while processing transaction: revert') !== -1,
    'Expected invalid opcode but got ' + error.message);
}


export function assertNumberEqual(
  actual: NumberLike, expect: NumberLike, decimals?: number, details?: string,
) {
  const actualNum = new BigNumber(actual);
  const expectNum = new BigNumber(expect);
  if (!actualNum.eq(expectNum)) {
    const div = decimals ? Math.pow(10, decimals) : 1;

    const valuesMsg = `${actualNum.div(div).toFixed()} == ${expectNum.div(div).toFixed()}`;
    const message = details ? `${details}\n${valuesMsg}` : valuesMsg;

    assert.fail(
      actualNum.toFixed(),
      expectNum.toFixed(),
      message,
      '=',
    );
  }
}


export function assertEtherEqual(
  actual: NumberLike, expect: NumberLike, details?: string,
) {
  return assertNumberEqual(actual, expect, ETH_DECIMALS, details);
}


export function assertNumberAlmostEqual(
  actual: NumberLike, expect: NumberLike, epsilon: NumberLike, decimals: number,
  details?: string,
) {
  const actualNum = new BigNumber(actual);
  const expectNum = new BigNumber(expect);
  const epsilonNum = new BigNumber(epsilon);
  if (
    actualNum.lessThan(expectNum.sub(epsilonNum)) ||
    actualNum.greaterThan(expectNum.add(epsilonNum))
  ) {
    const div = decimals ? Math.pow(10, decimals) : 1;
    assert.fail(
      actualNum.toFixed(),
      expectNum.toFixed(),
      `${actualNum.div(div).toFixed()} == ${expectNum
        .div(div)
        .toFixed()} (precision ${epsilonNum.div(div).toFixed()})`,
      '=',
    );
  }
}


export function assertEtherAlmostEqual(
  actual: NumberLike, expect: NumberLike, epsilon?: NumberLike,
) {
  epsilon = epsilon || DEFAULT_ACCEPTABLE_ERROR;

  return assertNumberAlmostEqual(
    actual,
    expect,
    epsilon,
    ETH_DECIMALS,
  );
}


export function assertNumberAbove(actual: NumberLike, expect: NumberLike) {
  const actualNum = new BigNumber(actual);
  const expectNum = new BigNumber(expect);
  if (!actualNum.greaterThan(expectNum)) {
    assert.fail(
      actualNum.toFixed(),
      expectNum.toFixed(),
      `${actualNum.toFixed()} > ${expectNum.toFixed()}`,
      '>',
    );
  }
}


export function assertNumberBelow(actual: NumberLike, expect: NumberLike) {
  const actualNum = new BigNumber(actual);
  const expectNum = new BigNumber(expect);
  if (!actualNum.lessThan(expectNum)) {
    assert.fail(
      actualNum.toFixed(),
      expectNum.toFixed(),
      `${actualNum.toFixed()} < ${expectNum.toFixed()}`,
      '<',
    );
  }
}


export function wait(seconds: number): Promise<void> {
  return tempo.wait(seconds);
}
