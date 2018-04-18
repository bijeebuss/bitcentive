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

interface CampaignTestData extends CampaignInitData {
  stake: BigNumber;
  user: string;
}

// tslint:disable-next-line:no-debugger
debugger;

contract('BitCentive', (accounts) => {
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  let bitCentive: any;

  const campaignData: CampaignTestData[] = [
    {
      nonce: 1,
      length: 1,
      frequency: 3,
      cooldown: 16,
      stake: oneEther.dividedBy(100).times(3), // 1/100 of an ether times total tasks
      user: accounts[1],
    },
    {
      nonce: 2,
      length: 10,
      frequency: 5,
      cooldown: 24,
      stake: oneEther.times(2).dividedBy(100).times(10).times(5), // 2/100 of an ether times total tasks
      user: accounts[1],
    },
  ];

  const createCampaign = async (data: CampaignTestData) => {
    const campaign = new Campaign(data);
    const tx = await bitCentive.createCampaign(campaign.toString(), '0x0', {from: data.user, value: data.stake});
    console.log(tx.receipt.gasUsed);
  };

  beforeEach(async () => {
    bitCentive = await BitCentive.new({from: owner});
  });

  context('After fresh deploy.', () => {

    it('should have the correct owner', async () => {
      assert.equal(await bitCentive.owner.call(), owner);
    });

    it('should not let a campaign be created with a decimal number of szabo', async () => {
      try {
        const campaign = new Campaign(campaignData[0]);
        await bitCentive.createCampaign(
          campaign.toString(),
          '0x0',
          { from: campaignData[0].user, value: oneSzabo.dividedBy(2) },
        );
      } catch (error) {assertInvalidOpcode(error); return; }
      throw new Error('Expected error to be thrown');
    });

    it('should not let a task be completed for a campaign that doesnt exist', async () => {
      try {
        const campaign = new Campaign(campaignData[0]);
        await bitCentive.completeTask(1, { from: campaignData[0].user, value: oneEther });
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
          assert(campaign.started !== 0);
        }

      });

      it('should not let the same campaign be created again', async () => {
        try {
          await createCampaign(campaignData[0]);
        } catch (error) {assertInvalidOpcode(error); return; }
        throw new Error('Expected error to be thrown');
      });

      context('After completing a task', () => {
        let startingBalance: BigNumber;
        let endingBalance: BigNumber;
        const data = campaignData[0];

        beforeEach(async () => {
          startingBalance = await promiseIfy(web3.eth.getBalance, data.user);
          await bitCentive.completeTask(data.nonce, { from: data.user });
          endingBalance = await promiseIfy(web3.eth.getBalance, data.user);
        });

        it('should update the completed count', async () => {
          const campaign = new Campaign(await bitCentive.campaigns.call(data.user, data.nonce));
          assert.equal(campaign.completed, 1);
        });

        it('should return the correct amount of ether', async () => {
          const totalTasks = data.length * data.frequency;
          const ethPerTask = data.stake.dividedBy(totalTasks);
          assertEtherEqual(endingBalance.minus(startingBalance), ethPerTask);
        });

      });
    });
  });
});
