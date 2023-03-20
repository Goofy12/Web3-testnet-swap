/* eslint-disable import/no-extraneous-dependencies */
import '../styles/global.css';

import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import {
  configureChains,
  createClient,
  goerli,
  mainnet,
  WagmiConfig,
} from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

import { store } from '../utils/redux';

const { provider, webSocketProvider } = configureChains(
  [mainnet, goerli],
  [publicProvider()]
);

const client = createClient({
  autoConnect: true,
  provider,
  webSocketProvider,
});

export default function App({ Component, pageProps }: AppProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <>
      {ready ? (
        <WagmiConfig client={client}>
          <Provider store={store}>
            <Component {...pageProps} />
          </Provider>
        </WagmiConfig>
      ) : null}
    </>
  );
}
