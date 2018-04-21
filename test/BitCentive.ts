import { BigNumber } from 'bignumber.js';
import { hashCheckin } from '../src/lib/campaign';
import { signHash } from '../src/lib/eth';
import { now, promiseIfy } from '../src/lib/utils';
import { Campaign, CampaignInitData } from '../src/models/campaign';
import {
  assertEtherAlmostEqual,
  assertEtherEqual,
  assertInvalidOpcode,
  assertNumberEqual,
  wait,
} from './helpers';
import { timingSafeEqual } from 'crypto';

const BitCentive = artifacts.require('BitCentive');
const Clock = artifacts.require('Clock');

const oneEther = new BigNumber(web3.toWei(1, 'ether'));
const oneSzabo = new BigNumber(web3.toWei(1, 'szabo'));
const zeroAddress = '0x0000000000000000000000000000000000000000';
const hours = 60 * 60;
const days = hours * 24;
const weeks = days * 7;

interface CampaignTestData extends CampaignInitData {
  stake: BigNumber;
  user: string;
  trainer?: string;
}

contract('BitCentive', (accounts) => {
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const trainer = accounts[3];
  const charity = accounts[4];

  let bitCentive: any;
  let clock: any;

  // these cannot be changed arbitrarily without messing up the tests
  const campaignData: CampaignTestData[] = [
    {
      nonce: 1,
      length: 2,
      frequency: 2,
      cooldown: 16,
      charityPercentage: 50,
      trainerPercentage: 0,
      stake: oneEther.dividedBy(100).times(4), // 1/100 of an ether per checkin
      user: user1,
    },
    {
      nonce: 2,
      length: 2,
      frequency: 5,
      cooldown: 8,
      charityPercentage: 25,
      trainerPercentage: 75,
      stake: oneEther.dividedBy(100).times(50), // 1/100 of an ether per checkin
      user: user2,
      trainer,
    },
  ];

  const createCampaign = async (data: CampaignTestData) => {
    const campaign = new Campaign(data);
    const tx = await bitCentive.createCampaign(
      campaign.toString(),
      data.trainer || '0x0',
      {from: data.user, value: data.stake},
    );
  };

  const checkinTrainer = async (data: CampaignTestData, billable: boolean) => {
    const timestamp = await clock.time.call() as BigNumber;
    const hash = hashCheckin(bitCentive.address, data.user, data.nonce, timestamp.toNumber(), billable);
    const sig = await signHash(hash, data.trainer as string, false);
    const tx = await bitCentive.checkinTrainer(
      data.nonce,
      timestamp,
      billable,
      sig.v,
      sig.r,
      sig.s,
      { from: data.user, gasPrice: 0 },
    );
  };

  before(async () => {
    clock = await Clock.new({from: owner});
  });

  beforeEach(async () => {
    BitCentive.defaults({from: accounts[0], gasPrice: 0, gas: 3000000});
    bitCentive = await BitCentive.new({from: owner});
  });

  context('After fresh deploy.', () => {

    it('should have the correct owner', async () => {
      assert.equal(await bitCentive.owner.call(), owner);
    });

    it('should not let a campaign be created with a decimal number of szabo', async () => {
      try {
        const data = {} as CampaignTestData;
        Object.assign(data, campaignData[0]);
        data.stake = oneSzabo.dividedBy(2);
        await createCampaign(data);
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a campaign be created 0 frequency', async () => {
      try {
        const data = {} as CampaignTestData;
        Object.assign(data, campaignData[0]);
        data.frequency = 0;
        await createCampaign(data);
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a campaign be created 0 stake', async () => {
      try {
        const data = {} as CampaignTestData;
        Object.assign(data, campaignData[0]);
        data.stake = new BigNumber(0);
        await createCampaign(data);
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a campaign be created that is impossible to complete', async () => {
      try {
        const data = {} as CampaignTestData;
        Object.assign(data, campaignData[0]);
        data.frequency = 200;
        await createCampaign(data);
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it(
      'should not let a campaign be created with a stake that is not divisible by the number of checkins', async () => {
      try {
        const data = {} as CampaignTestData;
        Object.assign(data, campaignData[0]);
        data.stake = oneEther.plus(1);
        await createCampaign(data);
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a campaign be created with a stake so large it could overflow two bytes of szabo', async () => {
      try {
        const data = {} as CampaignTestData;
        Object.assign(data, campaignData[0]);
        data.stake = oneEther.times(5000);
        await createCampaign(data);
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a campaign be created with 0 length', async () => {
      try {
        const data = {} as CampaignTestData;
        Object.assign(data, campaignData[0]);
        data.length = 0;
        await createCampaign(data);
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a campaign be created with charity percentage over 100', async () => {
      try {
        const data = {} as CampaignTestData;
        Object.assign(data, campaignData[0]);
        data.charityPercentage = 101;
        await createCampaign(data);
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a campaign be created with trainer percentage over 100', async () => {
      try {
        const data = {} as CampaignTestData;
        Object.assign(data, campaignData[1]);
        data.trainerPercentage = 101;
        await createCampaign(data);
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a campaign be created with trainer percentage if there is no trainer', async () => {
      try {
        const data = {} as CampaignTestData;
        Object.assign(data, campaignData[0]);
        data.trainerPercentage = 50;
        await createCampaign(data);
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a checkin be completed for a campaign that doesnt exist', async () => {
      try {
        const campaign = new Campaign(campaignData[0]);
        await bitCentive.checkinSelf(1, { from: campaignData[0].user });
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    context('After creating some campaigns', () => {
      beforeEach(async () => {
        for (const data of campaignData) {
          await createCampaign(data);
        }
      });

      it('should appear in the data', async () => {
        for (const data of campaignData) {
          const result = await bitCentive.campaigns.call(data.user, data.nonce);
          const campaign = new Campaign(result[0]);
          assert.equal(campaign.nonce, data.nonce);
          assert.equal(campaign.length, data.length);
          assert.equal(campaign.frequency, data.frequency);
          assert.equal(campaign.cooldown, data.cooldown);
          assert.equal(campaign.completed, 0);
          assert.equal(campaign.bonus, 0);
          assert.equal(campaign.missed, 0);
          assert.equal(campaign.lastCompleted, 0);
          assert.equal(campaign.charityPercentage, data.charityPercentage);
          assert.equal(campaign.trainerPercentage, data.trainerPercentage);
          assert(campaign.started !== 0);
          if (data.trainer !== undefined) {
            assert(result[1] === data.trainer);
          } else {
            assert.equal(result[1], zeroAddress);
          }
        }
      });

      it('should not let the same campaign be created again', async () => {
        try {
          await createCampaign(campaignData[0]);
        } catch (error) {assertInvalidOpcode(error); return; }
        throw new Error('Expected error to be thrown');
      });

      it('should not let a checkin be self completed if he picked a trainer', async () => {
        try {
          const data = campaignData[1];
          await bitCentive.checkinSelf(data.nonce, { from: data.user, gasPrice: 0 });
        } catch (error) {assertInvalidOpcode(error); return; }
        throw new Error('Expected error to be thrown');
      });

      it('should not let a checkin be completed by the user if he picked a trainer', async () => {
        try {
          const data = campaignData[1];
          await bitCentive.checkinSelf(data.nonce, { from: data.user, gasPrice: 0 });
        } catch (error) {assertInvalidOpcode(error); return; }
        throw new Error('Expected error to be thrown');
      });

      it('should not let a campaign be ended before it is over', async () => {
        try {
          const campaign = new Campaign(campaignData[0]);
          await bitCentive.endCampaign(campaignData[0].user, campaign.nonce, { from: owner });
        } catch (error) {assertInvalidOpcode(error); return; }
        throw new Error('Expected error to be thrown');
      });

      context('After completing a self checkin', () => {
        let startingBalance: BigNumber;
        let endingBalance: BigNumber;
        const data = campaignData[0];

        beforeEach(async () => {
          startingBalance = await promiseIfy(web3.eth.getBalance, data.user);
          const tx = await bitCentive.checkinSelf(data.nonce, { from: data.user, gasPrice: 0 });
          endingBalance = await promiseIfy(web3.eth.getBalance, data.user);
        });

        it('should not let a checkin be completed again before the cooldown is over', async () => {
          try {
            await bitCentive.checkinSelf(data.nonce, { from: data.user, gasPrice: 0 });
          } catch (error) {assertInvalidOpcode(error); return; }
          throw new Error('Expected error to be thrown');
        });

        it('should update the completed count', async () => {
          const result = await bitCentive.campaigns.call(data.user, data.nonce);
          const campaign = new Campaign(result[0]);
          assert.equal(campaign.completed, 1);
          assert(campaign.lastCompleted !== 0);
        });

        it('should return the correct amount of ether', async () => {
          const totalCheckins = data.length * data.frequency;
          const ethPerCheckin = data.stake.dividedBy(totalCheckins);
          assertEtherEqual(endingBalance.minus(startingBalance), ethPerCheckin);
        });

        context('After completing another self checkin', () => {

          beforeEach(async () => {
            await wait(data.cooldown * 1.1 * hours);
            startingBalance = await promiseIfy(web3.eth.getBalance, data.user);
            const tx = await bitCentive.checkinSelf(data.nonce, { from: data.user, gasPrice: 0 });
            endingBalance = await promiseIfy(web3.eth.getBalance, data.user);
          });

          it('should update the completed count', async () => {
            const result = await bitCentive.campaigns.call(data.user, data.nonce);
            const campaign = new Campaign(result[0]);
            assert.equal(campaign.completed, 2);
          });

          it('should not let more checkins be completed if they are done for the week', async () => {
            try {
              await wait(data.cooldown * 1.1 * hours);
              await bitCentive.checkinSelf(data.nonce, { from: data.user, gasPrice: 0 });
            } catch (error) {assertInvalidOpcode(error); return; }
            throw new Error('Expected error to be thrown');
          });

          it('should return the correct amount of ether', async () => {
            const totalCheckins = data.length * data.frequency;
            const ethPerCheckin = data.stake.dividedBy(totalCheckins);
            assertEtherEqual(endingBalance.minus(startingBalance), ethPerCheckin);
          });

          context('After self completing all checkins', () => {

            beforeEach(async () => {
              await wait(1 * weeks);
              startingBalance = await promiseIfy(web3.eth.getBalance, data.user);
              let tx = await bitCentive.checkinSelf(data.nonce, { from: data.user });
              await wait(data.cooldown * 1.1 * hours);
              tx = await bitCentive.checkinSelf(data.nonce, { from: data.user });
              endingBalance = await promiseIfy(web3.eth.getBalance, data.user);
            });

            it('should update the completed count', async () => {
              const result = await bitCentive.campaigns.call(data.user, data.nonce);
              const campaign = new Campaign(result[0]);
              assert.equal(campaign.completed, 4);
              assert.equal(campaign.missed, 0);
            });

            it('should return the correct amount of ether', async () => {
              const totalCheckins = data.length * data.frequency;
              const ethPerCheckin = data.stake.dividedBy(totalCheckins);
              assertEtherEqual(endingBalance.minus(startingBalance), ethPerCheckin.times(2));
            });

            it('should have only the ether from other campaigns', async () => {
              assertEtherEqual(await promiseIfy(web3.eth.getBalance, bitCentive.address), campaignData[1].stake);
            });

            it('should not let more checkins be completed', async () => {
              try {
                await wait(1 * weeks);
                await bitCentive.checkinSelf(data.nonce, { from: data.user, gasPrice: 0 });
              } catch (error) {assertInvalidOpcode(error); return; }
              throw new Error('Expected error to be thrown');
            });

          });

        });

      });

      it('should not let a timestamp from the future be used to do a checkin', async () => {
        try {
          const data = campaignData[1];
          let timestamp = await clock.time.call() as BigNumber;
          timestamp = timestamp.plus(data.cooldown * 1 * hours);
          const hash = hashCheckin(bitCentive.address, data.user, data.nonce, timestamp.toNumber(), true);
          const sig = await signHash(hash, data.trainer as string, false);
          const tx = await bitCentive.checkinTrainer(
            data.nonce,
            timestamp,
            true,
            sig.v,
            sig.r,
            sig.s,
            { from: data.user, gasPrice: 0 },
          );
        } catch (error) {assertInvalidOpcode(error); return; }
        throw new Error('Expected error to be thrown');
      });

      it('should not let a timestamp from the past be used to do a checkin', async () => {
        try {
          const data = campaignData[1];
          let timestamp = await clock.time.call() as BigNumber;
          timestamp = timestamp.minus(data.cooldown * 1 * hours);
          const hash = hashCheckin(bitCentive.address, data.user, data.nonce, timestamp.toNumber(), true);
          const sig = await signHash(hash, data.trainer as string, false);
          const tx = await bitCentive.checkinTrainer(
            data.nonce,
            timestamp,
            true,
            sig.v,
            sig.r,
            sig.s,
            { from: data.user, gasPrice: 0 },
          );
        } catch (error) {assertInvalidOpcode(error); return; }
        throw new Error('Expected error to be thrown');
      });

      it('should not let an invalid signature be used to do a checkin', async () => {
        try {
          const data = campaignData[1];
          const timestamp = await clock.time.call() as BigNumber;
          const hash = hashCheckin(bitCentive.address, data.user, data.nonce, timestamp.toNumber(), true);
          const sig = await signHash(hash, data.trainer as string, false);
          // changed billable to false
          const tx = await bitCentive.checkinTrainer(
            data.nonce,
            timestamp,
            false,
            sig.v,
            sig.r,
            sig.s,
            { from: data.user, gasPrice: 0 },
          );
        } catch (error) {assertInvalidOpcode(error); return; }
        throw new Error('Expected error to be thrown');
      });

      context('After completing a billable trainer checkin', () => {
        let userStarting: BigNumber;
        let userEnding: BigNumber;
        let trainerStarting: BigNumber;
        let trainerEnding: BigNumber;
        const sponsorAmount = oneEther.times(5);

        const data = campaignData[1];

        beforeEach(async () => {
          userStarting = await promiseIfy(web3.eth.getBalance, data.user);
          trainerStarting = await promiseIfy(web3.eth.getBalance, data.trainer as string);
          await checkinTrainer(data, true);
          userEnding = await promiseIfy(web3.eth.getBalance, data.user);
          trainerEnding = await promiseIfy(web3.eth.getBalance, data.trainer as string);
        });

        it('should update the completed count', async () => {
          const result = await bitCentive.campaigns.call(data.user, data.nonce);
          const campaign = new Campaign(result[0]);
          assert.equal(campaign.completed, 1);
          assert(campaign.lastCompleted !== 0);
        });

        it('should return the correct amount of ether to the user', async () => {
          const totalCheckins = data.length * data.frequency;
          const ethPerCheckin = data.stake.dividedBy(totalCheckins);
          const trainerPayout = ethPerCheckin.times(data.trainerPercentage).dividedBy(100);
          const userPayout    = ethPerCheckin.minus(trainerPayout);
          assertEtherEqual(userEnding.minus(userStarting), userPayout);
        });

        it('should return the correct amount of ether to the trainer', async () => {
          const totalCheckins = data.length * data.frequency;
          const ethPerCheckin = data.stake.dividedBy(totalCheckins);
          const trainerPayout = ethPerCheckin.times(data.trainerPercentage).dividedBy(100);
          assertEtherEqual(trainerEnding.minus(trainerStarting), trainerPayout);
        });

        context('After completing a non billable trainer checkin', () => {

          beforeEach(async () => {
            await wait(data.cooldown * 1.1 * hours);
            userStarting = await promiseIfy(web3.eth.getBalance, data.user);
            trainerStarting = await promiseIfy(web3.eth.getBalance, data.trainer as string);
            await checkinTrainer(data, false);
            userEnding = await promiseIfy(web3.eth.getBalance, data.user);
            trainerEnding = await promiseIfy(web3.eth.getBalance, data.trainer as string);
          });

          it('should return the correct amount of ether to the user', async () => {
            const totalCheckins = data.length * data.frequency;
            const ethPerCheckin = data.stake.dividedBy(totalCheckins);
            assertEtherEqual(userEnding.minus(userStarting), ethPerCheckin);
          });

          it('should return the correct amount of ether to the trainer', async () => {
            assertEtherEqual(trainerEnding.minus(trainerStarting), 0);
          });

          it('should not let a non existant campaign be sponsored', async () => {
            try {
              await bitCentive.sponsor(data.user, data.nonce + 1, {value: sponsorAmount, from: owner});
            } catch (error) {assertInvalidOpcode(error); return; }
            throw new Error('Expected error to be thrown');
          });

          it('should not let a campaign be sponsored with a decimal number of szabo', async () => {
            try {
              await bitCentive.sponsor(data.user, data.nonce, {value: sponsorAmount.plus(1), from: owner});
            } catch (error) {assertInvalidOpcode(error); return; }
            throw new Error('Expected error to be thrown');
          });

          context('After being sponsored', () => {

            beforeEach(async () => {
              await bitCentive.sponsor(data.user, data.nonce, {value: sponsorAmount, from: owner});
            });

            it('should update the bonus', async () => {
              const result = await bitCentive.campaigns.call(data.user, data.nonce);
              const campaign = new Campaign(result[0]);
              assertEtherEqual(oneSzabo.times(campaign.bonus), sponsorAmount);
            });

            context('After being sponsored again', () => {
              beforeEach(async () => {
                await bitCentive.sponsor(data.user, data.nonce, {value: sponsorAmount, from: owner});
              });

              it('should update the bonus', async () => {
                const result = await bitCentive.campaigns.call(data.user, data.nonce);
                const campaign = new Campaign(result[0]);
                assertEtherEqual(oneSzabo.times(campaign.bonus), sponsorAmount.times(2));
              });

              context('after checking in a week later', () => {
                beforeEach(async () => {
                  await wait(1 * weeks);
                  userStarting = await promiseIfy(web3.eth.getBalance, data.user);
                  await checkinTrainer(data, false);
                  userEnding = await promiseIfy(web3.eth.getBalance, data.user);
                });

                it('should update the missed count and completed count', async () => {
                  const result = await bitCentive.campaigns.call(data.user, data.nonce);
                  const campaign = new Campaign(result[0]);
                  assert.equal(campaign.missed, 3);
                  assert.equal(campaign.completed, 3);
                });

                it('should return the correct amount of ether to the user', async () => {
                  const totalCheckins = data.length * data.frequency;
                  const ethPerCheckin = data.stake.dividedBy(totalCheckins);
                  assertEtherEqual(userEnding.minus(userStarting), ethPerCheckin);
                });

                context('after completing the rest of the checkins', () => {
                  let ownerStarting: BigNumber;
                  let ownerEnding: BigNumber;
                  let charityStarting: BigNumber;
                  let charityEnding: BigNumber;

                  beforeEach(async () => {
                    userStarting = await promiseIfy(web3.eth.getBalance, data.user);
                    trainerStarting = await promiseIfy(web3.eth.getBalance, data.trainer as string);
                    ownerStarting = await promiseIfy(web3.eth.getBalance, owner);
                    charityStarting = await promiseIfy(web3.eth.getBalance, charity);

                    for (let i = 0; i < 4; i++) {
                      await wait(1.1 * data.cooldown);
                      await checkinTrainer(data, true);
                    }

                    userEnding = await promiseIfy(web3.eth.getBalance, data.user);
                    trainerEnding = await promiseIfy(web3.eth.getBalance, data.trainer as string);
                    ownerEnding = await promiseIfy(web3.eth.getBalance, owner);
                    charityEnding = await promiseIfy(web3.eth.getBalance, charity);
                  });

                  it('work', async () => {
                    assert(1===1);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
// tslint:disable-next-line:no-debugger
debugger;
