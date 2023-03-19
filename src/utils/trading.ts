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
import { Pool, Route, SwapQuoter, SwapRouter, Trade } from '@uniswap/v3-sdk';
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

const {
  abi: SwapRouterABI,
} = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');

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
    amountIn: string;
    poolFee: number;
  };
  slippage: string;
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
  address: string
): Promise<TransactionState> {
  const provider = getProvider();

  if (!provider || !address) {
    console.log('No Provider Found');
    return TransactionState.Failed;
  }

  try {
    const tokenContract = new ethers.Contract(
      NightTestToken.address,
      ERC20_ABI,
      provider
    );
    if (
      !tokenContract ||
      !tokenContract.populateTransaction ||
      !tokenContract.populateTransaction.approve
    )
      return TransactionState.Failed;

    const transaction = await tokenContract.populateTransaction.approve(
      SWAP_ROUTER_ADDRESS,
      fromReadableAmount(
        TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
        NightTestToken.decimals
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
  // CurrentConfig: TradingConfig,
  walletAddress: string
): Promise<TransactionState> {
  const provider = getProvider();

  if (!walletAddress || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet');
  }

  const options: SwapOptions = {
    slippageTolerance: new Percent(500, 10_000), // 50 bips, or 0.50%
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    recipient: walletAddress,
  };
  console.log(trade);
  // Manual routing to try and avoid the Bug in SwapRouter
  // const { route, inputAmount, outputAmount } = trade.swaps[0];
  // const amountIn: string = toHex(
  //   trade.maximumAmountIn(options.slippageTolerance, inputAmount).quotient
  // );
  // const amountOut: string = toHex(
  //   trade.minimumAmountOut(options.slippageTolerance, outputAmount).quotient
  // );

  // const exactInputSingleParams = {
  //   tokenIn: route.tokenPath[0].address,
  //   tokenOut: route.tokenPath[1].address,
  //   fee: route.pools[0].fee,
  //   recipient,
  //   deadline,
  //   amountIn,
  //   amountOutMinimum: amountOut,
  //   sqrtPriceLimitX96: toHex(options.sqrtPriceLimitX96 ?? 0),
  // };

  // const tx = {
  //   data: SwapRouter.INTERFACE.encodeFunctionData('exactInputSingle', [
  //     exactInputSingleParams,
  //   ]),
  //   to: SWAP_ROUTER_ADDRESS,
  //   value: toHex(10000000000000000),
  //   from: walletAddress,
  //   maxFeePerGas: MAX_FEE_PER_GAS,
  //   maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  // };

  const methodParameters = SwapRouter.swapCallParameters([trade], options);

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

// connectedWallet swapRouterAddress, SwapRouterABI
export async function executeDirtySwap(CurrentConfig: TradingConfig) {
  const provider = getProvider();

  if (!provider) {
    throw new Error('Cannot execute a trade without a connected wallet');
  }
  const signer = provider.getSigner();
  const walletAddress = await signer.getAddress();
  if (!walletAddress) {
    throw new Error('Cannot execute a trade without a connected wallet');
  }
  const swapRouterContract = new ethers.Contract(
    SWAP_ROUTER_ADDRESS,
    SwapRouterABI,
    provider
  );

  const params = {
    tokenIn: CurrentConfig.tokens.in.address,
    tokenOut: CurrentConfig.tokens.out.address,
    fee: CurrentConfig.tokens.poolFee,
    recipient: walletAddress,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    amountIn: CurrentConfig.tokens.amountIn,
    amountOutMinimum: ethers.utils.parseUnits('1', 'ether').toString(),
    sqrtPriceLimitX96: 0,
  };
  console.log(JSON.stringify(params), params);
  console.log(swapRouterContract.connect(signer));
  const swapRouterContractWithSigner = swapRouterContract.connect(signer);

  if (
    !swapRouterContractWithSigner ||
    !swapRouterContractWithSigner.callStatic ||
    !swapRouterContractWithSigner.callStatic.exactInputSingle
  ) {
    throw new Error('Cannot execute a trade without a connected wallet');
  }

  swapRouterContractWithSigner?.callStatic
    ?.exactInputSingle(params, {
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    })
    .then((transaction) => {
      console.log(transaction);
    })
    .catch((err) => {
      console.log(params, MAX_PRIORITY_FEE_PER_GAS, MAX_FEE_PER_GAS);
      console.log(err);
    });
}
