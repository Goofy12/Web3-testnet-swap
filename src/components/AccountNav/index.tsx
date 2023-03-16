import React from 'react';
import { useAccount, useConnect, useNetwork } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';

import Text from '../../utils/text';
import ButtonBright from '../ButtonBright';
import Eth from '../EthSymbol';

const AccountNav = () => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();

  const { connect } = useConnect({
    connector: new InjectedConnector(),
  });

  if (isConnected && chain)
    return (
      <div className="group m-2 flex items-center justify-evenly rounded border-2 border-slate-200 p-2 hover:border-primary-200">
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
