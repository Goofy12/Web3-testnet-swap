import { ethers } from 'ethers';
import React from 'react';
import { useAccount, useNetwork, useProvider, useSwitchNetwork } from 'wagmi';

import { Meta } from '@/layouts/Meta';
import { Main } from '@/templates/Main';

import NightTestToken from '../../public/NightTestToken.json';
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
            props.setInput(parseFloat(`${result}`));
          }}
          onBlur={(evt: { target: { value: number | string } }) => {
            console.log('>>> on blur event:', { evt });
            if (evt.target.value === '') {
              props.setInput(0);
            }
            const result = parseFloat(`${evt.target.value}`);
            console.log('>>> on blur event result:', { result });
            if (props.balance && result > props.balance) {
              props.setInput(
                parseFloat(parseFloat(`${props.balance}`).toFixed(6)) - 0.000001
              );
            } else if (result < 0) {
              props.setInput(0);
            } else if (Number.isNaN(result)) {
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
          Balance: {props.balance}{' '}
          <span
            className="text-primary-300"
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
  const [tokenInput, setTokenInput] = React.useState(0);
  const [tokenBalance, setTokenBalance] = React.useState(0);

  const [nativeInput, setNativeInput] = React.useState(0);
  const [balance, setBalance] = React.useState(0);
  const [fromEth, setFromETH] = React.useState(true);
  // Async data

  React.useEffect(() => {
    provider
      .getBalance(address)
      .then((currentBalance) => {
        console.log(
          'Ether Balance Found: ',
          ethers.utils.formatEther(currentBalance)
        );
        setBalance(ethers.utils.formatEther(currentBalance));
      })
      .catch((err) => {
        console.log(err);
      });
    if (chain.id === 5) {
      // get the ERC20 balance
      const NightTestTokenContract = new ethers.Contract(
        '0xc62b062645720808ee49f0df185b3228fa6288df',
        NightTestToken.abi,
        provider
      );
      NightTestTokenContract.balanceOf(address)
        .then((newTokenBalance) => {
          console.log(ethers.utils.formatEther(newTokenBalance));
          setTokenBalance(ethers.utils.formatEther(newTokenBalance));
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, []);

  React.useEffect(() => {
    if (chain && chain.id === 5) {
      // get estimate
      if (fromEth && nativeInput > 0) {
        console.log('swap from ETH: ', nativeInput);
        getSwapQuote(fromEth, provider, nativeInput)
          .then((quote) => {
            setTokenInput(quote);
          })
          .catch((err) => {
            console.log('price estimate error:', err);
          });
      } else if (tokenInput > 0) {
        console.log('swap from token: ', tokenInput);
        getSwapQuote(fromEth, provider, tokenInput)
          .then((quote) => {
            setNativeInput(quote);
          })
          .catch((err) => {
            console.log('price estimate error:', err);
          });
      }
    }
  }, [chain, nativeInput, tokenInput, fromEth]);

  // input handlers

  const bigButtonHandler = async () => {
    if (isDisconnected) return;
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
      getSwapQuote(true, provider, 0.024);
    }
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
              className="group my-2 flex items-center justify-center rounded border-2 border-primary-200 bg-primary-200 px-4 py-2 hover:bg-gray-300"
              onClick={bigButtonHandler}
            >
              <div
                className="text-lg text-black group-hover:text-primary-200"
                onClick={bigButtonHandler}
              >
                {chain && chain.id === 5
                  ? 'Swap Now'
                  : 'Switch Network to Gorelli'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Main>
  );
};

export default Index;
