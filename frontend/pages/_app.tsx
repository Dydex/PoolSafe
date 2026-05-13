import type { AppProps } from "next/app";
import Head from "next/head";
import { WalletProvider } from "@/lib/wallet";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <Head>
        <title>Nexus Guard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </WalletProvider>
  );
}
