import React from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import { useAccount, useConnect, useNetwork } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';

import type { RootState } from '../../utils/redux';
import Text from '../../utils/text';
import ButtonBright from '../ButtonBright';
import Eth from '../EthSymbol';

const AccountNav = () => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();

  const { connect } = useConnect({
    connector: new InjectedConnector(),
  });
  const { txOrder } = useSelector(
    (state: RootState): any => ({
      txOrder: state.txOrder,
    }),
    shallowEqual
  );

  if (isConnected && chain)
    return (
      <div className="group">
        <div className=" m-2 flex cursor-pointer items-center justify-evenly rounded border-2 border-slate-200 p-2 group-hover:border-primary-200">
          <Eth
            classes="fill-slate-200 group-hover:fill-primary-200 "
            width="32px"
            height="32px"
          />
          <div className="px-2 font-pixel text-slate-200 group-hover:text-primary-200">
            {Text.prettyChainName(chain.id || 1)}
          </div>
          <div className="px-2 font-pixel text-slate-200 group-hover:text-primary-200">
            {Text.prettyEthAccount(address || '0x000000000000', 6)}
          </div>
        </div>
        <div className="relative">
          <div className=" hidden flex-col items-end justify-evenly px-2 font-pixel text-base group-hover:flex">
            {txOrder.map((txHash: string, i: number) => {
              if (i < 4 && txHash !== '') {
                return (
                  <div key={i}>
                    <a
                      className="text-primary-200"
                      href={`https://goerli.etherscan.io/tx/${txHash}`}
                      target="_blank"
                    >
                      {Text.prettyEthAccount(
                        txHash ||
                          '0x9931f3c28448f9048e68f46ef8dd91cba06fd1a4b4749745a4f2328a398e3721',
                        6
                      )}
                    </a>
                  </div>
                );
              }
              return <div key={i}></div>;
            })}
          </div>
        </div>
      </div>
    );
  return (
    <div>
      <ButtonBright
        title="Connect Wallet"
        onClick={async () => {
          connect();
        }}
      />
    </div>
  );
};

export default AccountNav;
