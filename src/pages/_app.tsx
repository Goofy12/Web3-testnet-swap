/* eslint-disable import/no-extraneous-dependencies */
import '../styles/global.css';

import { getDefaultProvider } from 'ethers';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { createClient, WagmiConfig } from 'wagmi';

// Configure wagmi client
const wagmiClient = createClient({
  autoConnect: true,
  provider: getDefaultProvider(),
});

export default function App({ Component, pageProps }: AppProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <>
      {ready ? (
        <WagmiConfig client={wagmiClient}>
          <Component {...pageProps} />
        </WagmiConfig>
      ) : null}
    </>
  );
}
