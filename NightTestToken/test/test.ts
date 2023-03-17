import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('NightTestToken', function () {
  it('Test contract', async function () {
    const ContractFactory = await ethers.getContractFactory('NightTestToken');

    const instance = await ContractFactory.deploy();
    await instance.deployed();

    expect(await instance.name()).to.equal('NightTestToken');
  });
});
