import {BigNumber} from 'bignumber.js';



export interface CampaignInitData {
  nonce: number;
  length: number;
  frequency: number;
  cooldown: number;
  charityPercentage: number;
  trainerPercentage: number;
}

export interface CampaignData extends CampaignInitData {
  completed: number;
  started: number;
  stake: number;
  bonus: number;
  missed: number;
  lastCompleted: number;
}

type DataPositions<T> = {
  [P in keyof T]: {start: number, end: number};
};

const dataPositions: DataPositions<CampaignData> = {
  nonce:  {start: 0, end: 4},
  length: {start: 4, end: 6},
  frequency: {start: 6, end: 8},
  cooldown: {start: 8, end: 10},
  stake: {start: 10, end: 18},
  completed: {start: 18, end: 22},
  started: {start: 22, end: 30},
  bonus: {start: 30, end: 38},
  missed: {start: 38, end: 42},
  lastCompleted: {start: 42, end: 50},
  charityPercentage: {start: 50, end: 52},
  trainerPercentage: {start: 52, end: 54},
};

export class Campaign {

  public static numberToUint(value: number, size: number): string {
    if (value % 1 !== 0) { throw new Error('value must be a whole number'); }
    if (value < 0) { throw new Error('value must be a greater than 0'); }
    if (size % 1 !== 0) { throw new Error('size must be a whole number'); }
    if (size < 0 || size > 32) { throw new Error('size must be between 0 and 32 bytes'); }

    if (new BigNumber(2).pow(size * 8).minus(1).lessThan(value)) {
      throw new Error('value must be less than ' + size + 'bytes');
    }

    let values = new BigNumber(value).toString(16).replace('0x', '');
    while (values.length < size * 2) {
      values = '0' + values;
    }
    return values;
  }

  public static isFullCampaignData(values: CampaignData | CampaignInitData): values is CampaignData {
    return 1 === 1
      && (values as CampaignData).stake !== undefined
      && (values as CampaignData).completed !== undefined
      && (values as CampaignData).started !== undefined
      && (values as CampaignData).bonus !== undefined
      && (values as CampaignData).missed !== undefined
      && (values as CampaignData).lastCompleted !== undefined;
  }

  private raw: string = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor(values?: string | CampaignData | CampaignInitData) {
    if (values === undefined) {
      values = this.raw;
    }

    // parse string
    if (typeof values === 'string') {
      values = values.replace('0x', '');

      if (values.length !== 64) {
        throw new Error('campaign data must be 32 bytes');
      }
      try {
        const bn = new BigNumber(values, 16);
      } catch (err) {
        throw new Error('could not parse campaign data: ' + err.message);
      }
      this.raw = values;
      return;
    }

    // object data
    this.nonce = values.nonce;
    this.length = values.length;
    this.frequency = values.frequency;
    this.cooldown = values.cooldown;
    this.charityPercentage = values.charityPercentage;
    this.trainerPercentage = values.trainerPercentage;

    if (Campaign.isFullCampaignData(values)) {
      this.completed = values.completed;
      this.started = values.started;
      this.stake = values.stake;
      this.bonus = values.bonus;
      this.missed = values.missed;
      this.lastCompleted = values.lastCompleted;
    }
  }

  public toString() {
    return '0x' + this.raw;
  }

  private getNumber<T extends keyof CampaignData>(parameter: T): number {
    return Number(
      '0x' + this.raw.slice(
        dataPositions[parameter].start,
        dataPositions[parameter].end),
    );
  }

  private setNumber<T extends keyof CampaignData>(parameter: T, value: number): void {
    const start = dataPositions[parameter].start;
    const length = dataPositions[parameter].end - start;
    const uintString = Campaign.numberToUint(value, length / 2);
    const newData = this.raw.split('');
    newData.splice(start, length, uintString);
    this.raw = newData.join('');
  }


  public get nonce(): number {return this.getNumber('nonce'); }
  public set nonce(value: number) { this.setNumber('nonce', value); }

  public get length(): number {return this.getNumber('length'); }
  public set length(value: number) { this.setNumber('length', value); }

  public get frequency(): number {return this.getNumber('frequency'); }
  public set frequency(value: number) { this.setNumber('frequency', value); }

  public get cooldown(): number {return this.getNumber('cooldown'); }
  public set cooldown(value: number) { this.setNumber('cooldown', value); }

  public get completed(): number {return this.getNumber('completed'); }
  public set completed(value: number) { this.setNumber('completed', value); }

  public get started(): number {return this.getNumber('started'); }
  public set started(value: number) { this.setNumber('started', value); }

  public get stake(): number {return this.getNumber('stake'); }
  public set stake(value: number) { this.setNumber('stake', value); }

  public get bonus(): number {return this.getNumber('bonus'); }
  public set bonus(value: number) { this.setNumber('bonus', value); }

  public get missed(): number {return this.getNumber('missed'); }
  public set missed(value: number) { this.setNumber('missed', value); }

  public get lastCompleted(): number {return this.getNumber('lastCompleted'); }
  public set lastCompleted(value: number) { this.setNumber('lastCompleted', value); }

  public get charityPercentage(): number {return this.getNumber('charityPercentage'); }
  public set charityPercentage(value: number) { this.setNumber('charityPercentage', value); }

  public get trainerPercentage(): number {return this.getNumber('trainerPercentage'); }
  public set trainerPercentage(value: number) { this.setNumber('trainerPercentage', value); }
}
