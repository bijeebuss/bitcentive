import { BigNumber } from 'bignumber.js';
import { promiseIfy } from '../src/lib/utils';
import { Campaign, CampaignInitData } from '../src/models/campaign';
import {
  assertEtherAlmostEqual,
  assertEtherEqual,
  assertInvalidOpcode,
  assertNumberEqual,
  wait,
} from './helpers';
const BitCentive = artifacts.require('BitCentive');
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

  let bitCentive: any;

  const campaignData: CampaignTestData[] = [
    {
      nonce: 1,
      length: 2,
      frequency: 2,
      cooldown: 16,
      charityPercentage: 50,
      trainerPercentage: 0,
      stake: oneEther.dividedBy(100).times(2), // 1/100 of an ether times total checkins
      user: user1,
    },
    {
      nonce: 2,
      length: 10,
      frequency: 5,
      cooldown: 24,
      charityPercentage: 25,
      trainerPercentage: 50,
      stake: oneEther.times(2).dividedBy(100).times(10).times(5), // 2/100 of an ether times total checkins
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
    });
  });
});
// tslint:disable-next-line:no-debugger
debugger;
