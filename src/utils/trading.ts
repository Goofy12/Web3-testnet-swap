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
  Pool,
  Route,
  SwapQuoter,
  SwapRouter,
  toHex,
  Trade,
} from '@uniswap/v3-sdk';
import { ethers } from 'ethers';

import {
  ERC20_ABI,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  QUOTER_CONTRACT_ADDRESS,
  SWAP_ROUTER_ADDRESS,
  TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
} from './constants';
import { fromReadableAmount } from './conversions';
import { getPoolInfo } from './pool';
import { getProvider, sendTransaction, TransactionState } from './providers';

export type TokenTrade = Trade<Token, Token, TradeType>;

export const NightTestToken = new Token(
  SupportedChainId.GOERLI,
  '0xc62b062645720808ee49f0df185b3228fa6288df',
  18
);
export const Native = WETH9[SupportedChainId.GOERLI];

export type TradingConfig = {
  tokens: {
    in: Token;
    out: Token;
    amountIn: number;
    poolFee: number;
  };
};
// Helper Quoting and Pool Functions

async function getOutputQuote(
  route: Route<Currency, Currency>,
  CurrentConfig: TradingConfig
) {
  const provider = getProvider();

  if (!provider) {
    throw new Error('Provider required to get pool state');
  }

  const { calldata } = await SwapQuoter.quoteCallParameters(
    route,
    CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.in,
      fromReadableAmount(
        CurrentConfig.tokens.amountIn,
        CurrentConfig.tokens.in.decimals
      ).toString()
    ),
    TradeType.EXACT_OUTPUT,
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

export async function getTokenTransferApproval(
  token: Token,
  address: string
): Promise<TransactionState> {
  const provider = getProvider();

  if (!provider || !address) {
    console.log('No Provider Found');
    return TransactionState.Failed;
  }

  try {
    const tokenContract = new ethers.Contract(
      token.address,
      ERC20_ABI,
      provider
    );

    const transaction = await tokenContract.populateTransaction.approve(
      SWAP_ROUTER_ADDRESS,
      fromReadableAmount(
        TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
        token.decimals
      ).toString()
    );

    return await sendTransaction({
      ...transaction,
      from: address,
    });
  } catch (e) {
    console.error(e);
    return TransactionState.Failed;
  }
}

// Trading Functions

export async function createTrade(
  CurrentConfig: TradingConfig
): Promise<TokenTrade> {
  console.log(CurrentConfig, CurrentConfig.tokens.in, CurrentConfig.tokens.out);

  const poolInfo = await getPoolInfo(CurrentConfig);

  const pool = new Pool(
    CurrentConfig.tokens.in,
    CurrentConfig.tokens.out,
    CurrentConfig.tokens.poolFee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  );

  const swapRoute = new Route(
    [pool],
    CurrentConfig.tokens.in,
    CurrentConfig.tokens.out
  );

  const amountOut = await getOutputQuote(swapRoute, CurrentConfig);
  const uncheckedTrade = Trade.createUncheckedTrade({
    route: swapRoute,
    inputAmount: CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.in,
      fromReadableAmount(
        CurrentConfig.tokens.amountIn,
        CurrentConfig.tokens.in.decimals
      ).toString()
    ),
    outputAmount: CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.out,
      amountOut.toString()
    ),
    tradeType: TradeType.EXACT_INPUT,
  });

  return uncheckedTrade;
}

export async function executeTrade(
  trade: TokenTrade,
  CurrentConfig: TradingConfig,
  walletAddress: string
): Promise<TransactionState> {
  const provider = getProvider();

  if (!walletAddress || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet');
  }

  // // Give approval to the router to spend the token
  // const tokenApproval = await getTokenTransferApproval(
  //   CurrentConfig.tokens.in,
  //   walletAddress
  // );

  // // Fail if transfer approvals do not go through
  // if (tokenApproval !== TransactionState.Sent) {
  //   return TransactionState.Failed;
  // }
  const options: SwapOptions = {
    slippageTolerance: new Percent(500, 10_000), // 50 bips, or 0.50%
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    recipient: walletAddress,
  };
  console.log(trade);
  const { route, inputAmount, outputAmount } = trade.swaps[0];
  const amountIn: string = toHex(
    trade.maximumAmountIn(options.slippageTolerance, inputAmount).quotient
  );
  const amountOut: string = toHex(
    trade.minimumAmountOut(options.slippageTolerance, outputAmount).quotient
  );

  const exactInputSingleParams = {
    tokenIn: route.tokenPath[0].address,
    tokenOut: route.tokenPath[1].address,
    fee: route.pools[0].fee,
    recipient,
    deadline,
    amountIn,
    amountOutMinimum: amountOut,
    sqrtPriceLimitX96: toHex(options.sqrtPriceLimitX96 ?? 0),
  };

  const tx = {
    data: SwapRouter.INTERFACE.encodeFunctionData('exactInputSingle', [
      exactInputSingleParams,
    ]),
    to: SWAP_ROUTER_ADDRESS,
    value: toHex(10000000000000000),
    from: walletAddress,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  };

  const res = await sendTransaction(tx);

  return res;
}
