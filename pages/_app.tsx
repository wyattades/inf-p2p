import { type AppProps } from 'next/app';
import Head from 'next/head';

import 'src/styles/style.scss';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Inf P2P</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
