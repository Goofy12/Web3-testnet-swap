import * as sdk from '@uniswap/sdk-core';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import * as v3sdk from '@uniswap/v3-sdk';
// import type { ethers.p } from 'ethers';
import { ethers } from 'ethers';

import { fromReadableAmount } from './conversions';

const { Token } = sdk;

async function getPoolConstants(provider: ethers.providers): Promise<{
  token0: string;
  token1: string;
  fee: number;
}> {
  const chainId = sdk.SupportedChainId.GOERLI;

  // Address of NightTestToken on Goreli
  const tokenAddress = '0xc62b062645720808ee49f0df185b3228fa6288df';

  // Create a Token object for NightTestToken
  const token = new Token(chainId, tokenAddress, 18);
  const native = sdk.WETH9[chainId];

  const currentPoolAddress = v3sdk.computePoolAddress({
    factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    tokenA: token,
    tokenB: native,
    fee: v3sdk.FeeAmount.HIGH,
  });

  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    provider
  );
  try {
    const [token0, token1, fee] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
    ]);

    return {
      token0,
      token1,
      fee,
    };
  } catch (err) {
    console.log(err);
    return {
      token0: '',
      token1: '',
      fee: 0,
    };
  }
}

export function getSwapQuote(
  fromEth: boolean,
  provider: ethers.providers,
  amount: number
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const quoterContract = new ethers.Contract(
      '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', // quoter address goreli
      Quoter.abi,
      provider
    );
    if (!quoterContract) reject(err);

    getPoolConstants(provider)
      .then((poolConstants) => {
        if (fromEth) {
          quoterContract.callStatic
            .quoteExactInputSingle(
              poolConstants.token0,
              poolConstants.token1,
              poolConstants.fee,
              fromReadableAmount(amount, 18).toString(),
              0
            )
            .then((quotedAmountOut) => {
              resolve(ethers.utils.formatEther(quotedAmountOut));
            })
            .catch((err) => {
              reject(err);
            });
        }
        quoterContract.callStatic
          .quoteExactInputSingle(
            poolConstants.token1,
            poolConstants.token0,
            poolConstants.fee,
            fromReadableAmount(amount, 18).toString(),
            0
          )
          .then((quotedAmountOut) => {
            resolve(ethers.utils.formatEther(quotedAmountOut));
          })
          .catch((err) => {
            reject(err);
          });
      })
      .catch((err) => {
        reject(err);
      });
  });
}
