import { ethers } from 'hardhat';

async function main() {
  const ContractFactory = await ethers.getContractFactory('NightTestToken');

  const instance = await ContractFactory.deploy();
  await instance.deployed();

  console.log(`Contract deployed to ${instance.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// https://goerli.etherscan.io/tx/0x92eb2a75c6729273b146dae2e56860aeb1ece97ea2920fc3f756841e430b4a02
//  deployed

// uni V3 pool https://goerli.etherscan.io/tx/0x9d659d47f87935f0aa82716b8d845659c0df2b1e5465e34bdb8e606e23377318
