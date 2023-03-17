import type { Currency } from '@uniswap/sdk-core';
import {
  CurrencyAmount,
  Percent,
  SupportedChainId,
  Token,
  TradeType,
  WETH9,
} from '@uniswap/sdk-core';
import type { SwapOptions } from '@uniswap/v3-sdk';
import {
  FeeAmount,
  Pool,
  Route,
  SwapQuoter,
  SwapRouter,
  Trade,
} from '@uniswap/v3-sdk';
import { ethers } from 'ethers';
import JSBI from 'jsbi';

import {
  ERC20_ABI,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  QUOTER_CONTRACT_ADDRESS,
  SWAP_ROUTER_ADDRESS,
} from './constants';
import { fromReadableAmount } from './conversions';
import { getPoolInfo } from './uni';

export type TokenTrade = Trade<Token, Token, TradeType>;

export enum TransactionState {
  Failed = 'Failed',
  New = 'New',
  Rejected = 'Rejected',
  Sending = 'Sending',
  Sent = 'Sent',
}
const NightTestToken = new Token(
  SupportedChainId.GOERLI,
  '0xc62b062645720808ee49f0df185b3228fa6288df',
  18,
  'NTT',
  'NTT'
);
const native = WETH9[SupportedChainId.GOERLI];

function createBrowserExtensionProvider(): ethers.providers.Web3Provider | null {
  try {
    return new ethers.providers.Web3Provider(window?.ethereum, 'any');
  } catch (e) {
    console.log('No Wallet Extension Found');
    return null;
  }
}

// Transacting with a wallet extension via a Web3 Provider
async function sendTransaction(
  transaction: ethers.providers.TransactionRequest
): Promise<TransactionState> {
  const provider = createBrowserExtensionProvider();

  try {
    const receipt = await provider?.send('eth_sendTransaction', [transaction]);
    if (receipt) {
      return TransactionState.Sent;
    }
    return TransactionState.Failed;
  } catch (e) {
    console.log(e);
    return TransactionState.Rejected;
  }
}

export async function getTokenTransferApproval(
  address: string,
  approval: string
): Promise<TransactionState> {
  const provider = createBrowserExtensionProvider();
  if (!provider || !address) {
    console.log('No Provider Found');
    return TransactionState.Failed;
  }

  try {
    const tokenContract = new ethers.Contract(
      NightTestToken.address,
      ERC20_ABI,
      provider.getSigner()
    );

    const transaction = await tokenContract.approve(
      SWAP_ROUTER_ADDRESS,
      fromReadableAmount(approval, 18).toString()
    );
    const res = await provider.send('eth_sendTransaction', [
      transaction,
      { from: address },
    ]);
    return res;
  } catch (e) {
    console.error(e);
    return TransactionState.Failed;
  }
}

// Helper Quoting and Pool Functions

async function getOutputQuote(
  route: Route<Currency, Currency>,
  fromEth: boolean,
  amountIn: number
) {
  const provider = createBrowserExtensionProvider();
  console.log(provider?.getSigner());
  if (!provider) {
    throw new Error('Provider required to get pool state');
  }
  let tokenIn = NightTestToken;
  if (!fromEth) {
    tokenIn = native;
  }
  const { calldata } = await SwapQuoter.quoteCallParameters(
    route,
    CurrencyAmount.fromRawAmount(
      tokenIn,
      fromReadableAmount(amountIn, 18).toString()
    ),
    TradeType.EXACT_INPUT,
    {
      useQuoterV2: true,
    }
  );

  const quoteCallReturnData = await provider.call({
    to: QUOTER_CONTRACT_ADDRESS,
    data: calldata,
  });

  return ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData);
}
// Trading Functions

export async function createTrade(
  fromEth: boolean,
  currencyIn: number
): Promise<TokenTrade> {
  const provider = createBrowserExtensionProvider();
  const poolInfo = await getPoolInfo(provider);
  let tokenIn = NightTestToken;
  let tokenOut = native;
  if (!fromEth) {
    tokenIn = native;
    tokenOut = NightTestToken;
  }
  const pool = new Pool(
    tokenIn,
    tokenOut,
    FeeAmount.HIGH,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  );

  const swapRoute = new Route([pool], tokenIn, tokenOut);

  const amountOut = await getOutputQuote(swapRoute, fromEth, currencyIn);
  console.log(amountOut[0]);
  const uncheckedTrade = Trade.createUncheckedTrade({
    route: swapRoute,
    inputAmount: CurrencyAmount.fromRawAmount(
      tokenIn,
      fromReadableAmount(currencyIn, tokenIn.decimals).toString()
    ),
    outputAmount: CurrencyAmount.fromRawAmount(
      tokenOut,
      fromReadableAmount(amountOut[0].toNumber(), tokenOut.decimals).toString()
    ),
    tradeType: TradeType.EXACT_INPUT,
  });

  return uncheckedTrade;
}

export async function executeTrade(
  trade: TokenTrade,
  walletAddress: string
): Promise<TransactionState> {
  const provider = createBrowserExtensionProvider();

  if (!walletAddress || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet');
  }

  const options: SwapOptions = {
    slippageTolerance: new Percent(500, 10000), // 50 bips, or 0.50%
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    recipient: walletAddress,
  };

  const methodParameters = SwapRouter.swapCallParameters(
    [await trade],
    options
  );

  const tx = {
    data: methodParameters.calldata,
    to: SWAP_ROUTER_ADDRESS,
    value: methodParameters.value,
    from: walletAddress,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  };

  const res = await sendTransaction(tx);

  return res;
}

// Function to swap Goerli ETH for NightTestToken
export async function swapEthForToken(
  EthIn: string,
  fromEth: boolean
): Promise<void> {
  // Set up provider
  const provider = createBrowserExtensionProvider();

  // Get the address of the user's account
  const signer = provider.getSigner();
  const account = await signer.getAddress();
  // Get the amount of Goerli ETH to swap (in wei)
  const amountIn = ethers.utils.parseEther('1');
  const poolInfo = await getPoolInfo(provider);

  let pool = new Pool(
    native,
    NightTestToken,
    FeeAmount.HIGH,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  );
  let swapRoute = new Route([pool], native, NightTestToken);
  let quotePromise = SwapQuoter.quoteCallParameters(
    swapRoute,
    CurrencyAmount.fromRawAmount(native, amountIn),
    TradeType.EXACT_INPUT,
    {
      useQuoterV2: true,
    }
  );
  if (!fromEth) {
    pool = new Pool(
      NightTestToken,
      native,
      FeeAmount.HIGH,
      poolInfo.sqrtPriceX96.toString(),
      poolInfo.liquidity.toString(),
      poolInfo.tick
    );
    swapRoute = new Route([pool], NightTestToken, native);

    quotePromise = SwapQuoter.quoteCallParameters(
      swapRoute,
      CurrencyAmount.fromRawAmount(NightTestToken, amountIn),
      TradeType.EXACT_INPUT,
      {
        useQuoterV2: true,
      }
    );
  }

  const { calldata } = await quotePromise;
  const quoteCallReturnData = await provider.call({
    to: QUOTER_CONTRACT_ADDRESS,
    data: calldata,
  });
  const finalizedQuote = ethers.utils.defaultAbiCoder.decode(
    ['uint256'],
    quoteCallReturnData
  );

  // const quoteInEther = ethers.utils.formatEther(finalizedQuote);
  let uncheckedTrade;
  if (fromEth) {
    uncheckedTrade = Trade.createUncheckedTrade({
      route: swapRoute,
      inputAmount: CurrencyAmount.fromRawAmount(native, amountIn.toString()),
      outputAmount: CurrencyAmount.fromRawAmount(
        NightTestToken,
        JSBI.BigInt(finalizedQuote)
      ),
      tradeType: TradeType.EXACT_INPUT,
    });
  } else {
    // const uncheckedTrade = Trade.createUncheckedTrade({
    //   route: swapRoute,
    //   inputAmount: CurrencyAmount.fromRawAmount(
    //     NightTestToken,
    //     amountIn.toString()
    //   ),
    //   outputAmount: CurrencyAmount.fromRawAmount(
    //     native,
    //     fromReadableAmount(parseFloat(finalizedQuote.toString()))
    //   ),
    //   tradeType: TradeType.EXACT_INPUT,
    // });
  }

  const options: SwapOptions = {
    slippageTolerance: new Percent(50, 10_000), // 50 bips, or 0.50%
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    recipient: account,
  };

  const methodParameters = SwapRouter.swapCallParameters(
    [uncheckedTrade],
    options
  );

  const tx = {
    data: methodParameters.calldata,
    to: SWAP_ROUTER_ADDRESS,
    value: methodParameters.value,
    from: account,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  };

  const res = await sendTransaction(tx);
  return res;
}
