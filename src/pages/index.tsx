import { FeeAmount } from '@uniswap/v3-sdk';
import { ethers } from 'ethers';
import React from 'react';
import { useAccount, useNetwork, useProvider, useSwitchNetwork } from 'wagmi';

import { Meta } from '@/layouts/Meta';
import { Main } from '@/templates/Main';

import NightTestTokenJSON from '../../public/NightTestToken.json';
import { SWAP_ROUTER_ADDRESS } from '../utils/constants';
import type { TradingConfig } from '../utils/trading';
import {
  executeDirtySwap,
  getTokenTransferApproval,
  Native,
  NightTestToken,
} from '../utils/trading';
import { getSwapQuote } from '../utils/uni';

type SwapProps = {
  setInput: (value: any) => void;
  input: string;
  balance: string;
  tokenName: string;
};

const SwapComponent = (props: SwapProps) => {
  return (
    <div className=" my-2 mx-4 flex h-32 justify-between rounded bg-gray-100">
      <div className="flex flex-col items-center justify-evenly px-4 py-2">
        {/* <div className="text-4xl"> 125.024</div> */}
        <input
          className={
            'w-full bg-gray-100 text-4xl focus:outline-none active:border-0'
          }
          type="text"
          value={props.input}
          onChange={(evt: { target: { value: number | string } }) => {
            const result = evt.target.value;
            // props.setInput(parseFloat(`${result}`));
            props.setInput(result);
          }}
          onBlur={(evt: { target: { value: number | string } }) => {
            if (evt.target.value === '') {
              props.setInput(0);
            }
            const result = parseFloat(`${evt.target.value}`);
            if (props.balance && result > parseFloat(props.balance)) {
              props.setInput(
                parseFloat(parseFloat(`${props.balance}`).toFixed(6)) - 0.000001
              );
            } else if (result < 0) {
              props.setInput(0);
            } else if (Number.isNaN(result)) {
              console.log('NaN');
              props.setInput(0);
            } else {
              props.setInput(parseFloat(result.toFixed(6)));
            }
          }}
        />
      </div>
      <div className="flex min-w-[192px] flex-col items-start justify-evenly">
        <div className="p-2"> {props.tokenName}</div>
        <div className="p-2">
          Balance: {props.balance.slice(0, 8)}
          {'... '}
          <span
            className="cursor-pointer text-primary-300"
            onClick={() => {
              props.setInput(props.balance);
            }}
          >
            Max
          </span>
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  // blockchain hooks
  const { address, isDisconnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const provider = useProvider({ chainId: 5 });
  // display state managment
  const [tokenInput, setTokenInput] = React.useState('0');
  const [tokenBalance, setTokenBalance] = React.useState('0');
  const [tokenSwapAllowance, setTokenSwapAllowance] = React.useState('0');
  const [nativeInput, setNativeInput] = React.useState('0');
  const [balance, setBalance] = React.useState('0');
  const [fromEth, setFromETH] = React.useState(true);

  // Async data
  React.useEffect(() => {
    if (!address) return;
    provider
      .getBalance(address)
      .then((currentBalance) => {
        setBalance(ethers.utils.formatEther(currentBalance));
      })
      .catch((err: Error) => {
        console.log(err);
      });
    if (chain && chain.id === 5) {
      // get the ERC20 balance
      const NightTestTokenContract = new ethers.Contract(
        '0xc62b062645720808ee49f0df185b3228fa6288df',
        NightTestTokenJSON.abi,
        provider
      );
      NightTestTokenContract.balanceOf(address)
        .then((newTokenBalance: string) => {
          setTokenBalance(ethers.utils.formatEther(newTokenBalance));
        })
        .catch((err: Error) => {
          console.log(err);
        });
      NightTestTokenContract.allowance(address, SWAP_ROUTER_ADDRESS)
        .then((allowance: string) => {
          setTokenSwapAllowance(allowance);
        })
        .catch((err: Error) => {
          console.log(err);
        });
    }
  }, [address]);

  React.useEffect(() => {
    if (chain && chain.id === 5) {
      // get estimate
      if (fromEth && parseFloat(nativeInput) > 0) {
        getSwapQuote(fromEth, nativeInput)
          .then((quote) => {
            setTokenInput(quote);
          })
          .catch((err: Error) => {
            console.log('price estimate error:', err);
          });
      } else if (parseFloat(tokenInput) > 0) {
        getSwapQuote(fromEth, tokenInput)
          .then((quote) => {
            setNativeInput(quote);
          })
          .catch((err: Error) => {
            console.log('price estimate error:', err);
          });
      }
    }
  }, [chain, nativeInput, tokenInput, fromEth]);

  // input handlers

  const bigButtonHandler = async () => {
    if (isDisconnected || !address) return;
    if (chain && chain.id !== 5) {
      // handle switching networks
      try {
        if (switchNetwork) await switchNetwork(5);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err);
      }
    }
    if (chain && chain.id === 5) {
      if (
        parseInt(tokenSwapAllowance, 10) === 0 ||
        parseInt(tokenSwapAllowance, 10) < parseFloat(tokenInput)
      ) {
        getTokenTransferApproval(address);
        return;
      }
      if (!Native || !NightTestToken) return;
      const TradeConfig: TradingConfig = {
        // 0.00111
        tokens: {
          in: Native,
          out: NightTestToken,
          amountIn: ethers.utils
            .parseUnits(nativeInput.toString(), 'ether')
            .toString(), // convert value to a string before and after to avoid errors from value conversion
          poolFee: FeeAmount.HIGH,
        },
        slippage: '500',
        fromEth,
      };
      if (!fromEth) {
        TradeConfig.tokens = {
          in: NightTestToken,
          out: Native,
          amountIn: ethers.utils
            .parseUnits(tokenInput.toString(), 'ether')
            .toString(), // convert value to a string before and after to avoid errors from value conversion
          poolFee: FeeAmount.HIGH,
        };
      }

      try {
        executeDirtySwap(TradeConfig).then(
          async (tx: ethers.providers.TransactionResponse) => {
            console.log(tx, typeof tx);

            tx.wait().then((receipt: ethers.providers.TransactionReceipt) => {
              console.log(
                `Transaction confirmed in block ${receipt.blockNumber}`
              );
            });
          }
        );
      } catch (err) {
        console.log('error making trade', err);
      }
    }
  };

  const getBigButtonText = () => {
    if (chain && chain.id === 5) {
      if (
        parseInt(tokenSwapAllowance, 10) === 0 ||
        parseInt(tokenSwapAllowance, 10) < parseFloat(tokenInput)
      ) {
        return ' Approve NTT Swap';
      }
      return 'Swap Tokens';
    }
    return 'Switch to Goreli Network';
  };
  return (
    <Main
      meta={
        <Meta title="Toke swap page" description="I simple uniswap clone" />
      }
    >
      <div className="mt-12 flex w-full flex-col justify-around rounded bg-gray-300 py-2">
        <div className="flex justify-start px-4">
          <div className="text-primary-300">Swap Tokens</div>
        </div>
        <div className="relative flex h-auto w-full flex-col rounded">
          <div
            className="group absolute left-24 top-1/3 flex h-12 w-12 items-center justify-center rounded bg-gray-300 hover:bg-gray-300"
            onClick={() => {
              setFromETH(!fromEth);
            }}
          >
            <div className=" rounded bg-gray-200 px-3 py-1 text-gray-300 group-hover:text-gray-100 ">
              ^
            </div>
          </div>
          {fromEth ? (
            <>
              {' '}
              <SwapComponent
                input={nativeInput}
                setInput={setNativeInput}
                balance={balance}
                tokenName={'GoreliETH'}
              />
              <SwapComponent
                input={tokenInput}
                setInput={setTokenInput}
                balance={tokenBalance}
                tokenName={'NTT'}
              />
            </>
          ) : (
            <>
              {' '}
              <SwapComponent
                input={tokenInput}
                setInput={setTokenInput}
                balance={tokenBalance}
                tokenName={'NTT'}
              />
              <SwapComponent
                input={nativeInput}
                setInput={setNativeInput}
                balance={balance}
                tokenName={'GoreliETH'}
              />
            </>
          )}

          <div className="my-2 w-full px-4">
            <div
              className="group my-2 flex cursor-pointer items-center justify-center rounded border-2 border-primary-200 bg-primary-200 px-4 py-2 hover:bg-gray-300"
              onClick={bigButtonHandler}
            >
              <div
                className="text-lg text-black group-hover:text-primary-200"
                onClick={bigButtonHandler}
              >
                {getBigButtonText()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Main>
  );
};

export default Index;
