// TODO: updateCharityPercentage
import { BigNumber } from 'bignumber.js';
import { timingSafeEqual } from 'crypto';
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
  const unimportant = accounts[5];

  let user1Starting: BigNumber;
  let user1Ending: BigNumber;
  let user2Starting: BigNumber;
  let user2Ending: BigNumber;
  let trainerStarting: BigNumber;
  let trainerEnding: BigNumber;
  let ownerStarting: BigNumber;
  let ownerEnding: BigNumber;
  let charityStarting: BigNumber;
  let charityEnding: BigNumber;

  const user1Delta = () => user1Ending.minus(user1Starting);
  const user2Delta = () => user2Ending.minus(user2Starting);
  const trainerDelta = () => trainerEnding.minus(trainerStarting);
  const ownerDelta = () => ownerEnding.minus(ownerStarting);
  const charityDelta = () => charityEnding.minus(charityStarting);
  const setStarting = async () => {
    user1Starting = await promiseIfy(web3.eth.getBalance, user1);
    user2Starting = await promiseIfy(web3.eth.getBalance, user2);
    trainerStarting = await promiseIfy(web3.eth.getBalance, trainer as string);
    ownerStarting = await promiseIfy(web3.eth.getBalance, owner);
    charityStarting = await promiseIfy(web3.eth.getBalance, charity);
  };
  const setEnding = async () => {
    user1Ending = await promiseIfy(web3.eth.getBalance, user1);
    user2Ending = await promiseIfy(web3.eth.getBalance, user2);
    trainerEnding = await promiseIfy(web3.eth.getBalance, trainer as string);
    ownerEnding = await promiseIfy(web3.eth.getBalance, owner);
    charityEnding = await promiseIfy(web3.eth.getBalance, charity);
  };

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
      stake: oneEther.dividedBy(100).times(10), // 1/100 of an ether per checkin
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

  beforeEach(async () => {
    clock = await Clock.new({from: owner});
    BitCentive.defaults({from: accounts[0], gasPrice: 0, gas: 3000000});
    bitCentive = await BitCentive.new({from: owner});
    await bitCentive.setCharity(charity);
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

    it('should not let a donation be made with a charity percentage that is not a vlid percentage', async () => {
      try {
        await bitCentive.updateCharityPercentage(campaignData[0].nonce, 101, { from: campaignData[1].user });
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a charity percentage be updated for a campaign that doesnt exist', async () => {
      try {
        await bitCentive.updateCharityPercentage(campaignData[0].nonce, 10, { from: campaignData[1].user });
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    context('After making a donation', () => {
      const donationCharityPercentage = 45;
      const donationAmount = oneEther;
      beforeEach(async () => {
        await setStarting();
        const data = new Campaign();
        data.charityPercentage = donationCharityPercentage;
        await bitCentive.donate(data.toString(), {value: donationAmount, from: unimportant});
        await setEnding();
      });

      it('should have sent the correct amounts to the charity and developer.', async () => {
        const charityPayout = donationAmount.times(donationCharityPercentage).dividedBy(100).floor();
        assertEtherEqual(charityDelta(), charityPayout);

        const ownerPayout = donationAmount.minus(charityPayout);
        assertEtherEqual(ownerDelta(), ownerPayout);
      });
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

      it('should not let a change their charity percentage to an invalid percentage', async () => {
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
        const sponsorAmount = oneEther.dividedBy(10);

        const data = campaignData[1];

        beforeEach(async () => {
          await setStarting();
          await checkinTrainer(data, true);
          await setEnding();
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
          assertEtherEqual(user2Delta(), userPayout);
        });

        it('should return the correct amount of ether to the trainer', async () => {
          const totalCheckins = data.length * data.frequency;
          const ethPerCheckin = data.stake.dividedBy(totalCheckins);
          const trainerPayout = ethPerCheckin.times(data.trainerPercentage).dividedBy(100);
          assertEtherEqual(trainerDelta(), trainerPayout);
        });

        context('After completing a non billable trainer checkin', () => {

          beforeEach(async () => {
            await wait(data.cooldown * 1.1 * hours);
            await setStarting();
            await checkinTrainer(data, false);
            await setEnding();
          });

          it('should return the correct amount of ether to the user', async () => {
            const totalCheckins = data.length * data.frequency;
            const ethPerCheckin = data.stake.dividedBy(totalCheckins);
            assertEtherEqual(user2Delta(), ethPerCheckin);
          });

          it('should return the correct amount of ether to the trainer', async () => {
            assertEtherEqual(trainerDelta(), 0);
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

                function validateFinishedCampaign(
                  campaign: Campaign,
                  completed: number,
                  missed: number,
                  newCompleted: number,
                  charityPercentage?: number,
                ) {
                  assert.equal(campaign.completed, completed);
                  assert.equal(campaign.missed, missed);

                  const totalCheckins = data.length * data.frequency;
                  const ethPerCheckin = data.stake.dividedBy(totalCheckins);
                  // two sponsors
                  const totalBonus = sponsorAmount.times(2);
                  const achievedBonus = totalBonus.times(completed).dividedBy(totalCheckins);
                  const trainerPayout = ethPerCheckin.times(data.trainerPercentage).dividedBy(100).floor();
                  const trainerRefund = trainerPayout.times(missed);

                  if (newCompleted > 0) {
                    const totalTrainerPayout = trainerPayout.times(newCompleted);
                    assertEtherEqual(trainerDelta(), totalTrainerPayout);
                    const totalCheckinPayout = ethPerCheckin.times(newCompleted);
                    const userPayout = totalCheckinPayout.minus(totalTrainerPayout);
                    // trainer refund for missed
                    assertEtherEqual(user2Delta(), userPayout.plus(achievedBonus).plus(trainerRefund));
                  }

                  const totalMissedPayouts = ethPerCheckin.times(missed).minus(trainerRefund);
                  const penalty = totalBonus.minus(achievedBonus).plus(totalMissedPayouts);
                  const totalCharity = penalty.times(charityPercentage || data.charityPercentage)
                    .dividedBy(100).floor();
                  assertEtherEqual(charityDelta(), totalCharity);

                  const totalDeveloper = penalty.minus(totalCharity);
                  assertEtherEqual(ownerDelta(), totalDeveloper);
                }

                beforeEach(async () => {
                  await wait(1 * weeks);
                  await setStarting();
                  await checkinTrainer(data, false);
                  await setEnding();
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
                  assertEtherEqual(user2Delta(), ethPerCheckin);
                });

                context('after user changes charity percentage', () => {
                  const updatedCharityPercentage = 50;
                  beforeEach(async () => {
                    await bitCentive.updateCharityPercentage(data.nonce, updatedCharityPercentage, { from: data.user });
                  });

                  it('should show the updated percentage', async () => {
                    const result = await bitCentive.campaigns.call(data.user, data.nonce);
                    const campaign = new Campaign(result[0]);
                    assert.equal(campaign.charityPercentage, updatedCharityPercentage);
                  });

                  context('after admin ends an expired campaign', () => {
                    beforeEach(async () => {
                      await setStarting();
                      await wait(1.1 * data.length * weeks);
                      await bitCentive.endCampaign(data.user, data.nonce, { from: owner });
                      await setEnding();
                    });

                    it('should return the correct amount of ether to the user, trainer, charity, dev', async () => {
                      const result = await bitCentive.campaigns.call(data.user, data.nonce);
                      const campaign = new Campaign(result[0]);

                      validateFinishedCampaign(campaign, 3, 7, 0, updatedCharityPercentage);
                    });
                  });
                });

                context('after completing the rest of the checkins', () => {
                  beforeEach(async () => {
                    await setStarting();
                    for (let i = 0; i < 4; i++) {
                      await wait(1.1 * data.cooldown * hours);
                      await checkinTrainer(data, true);
                    }
                    await setEnding();
                  });

                  it('should update the completed count', async () => {
                    const result = await bitCentive.campaigns.call(data.user, data.nonce);
                    const campaign = new Campaign(result[0]);
                    assert.equal(campaign.completed, 7);
                  });

                  it('should return the correct amount of ether to the user, trainer, charity, developer', async () => {
                    const result = await bitCentive.campaigns.call(data.user, data.nonce);
                    const campaign = new Campaign(result[0]);
                    validateFinishedCampaign(campaign, 7, 3, 4);
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
