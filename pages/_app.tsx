import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, ToastOptions, ToastPosition } from 'react-hot-toast';
import {HeroUIProvider} from "@heroui/react";
import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import { ServersProvider } from '../context/ServersContext';

const queryClient = new QueryClient();

const toastOptions: ToastOptions = {
  duration: 2000,
  position: 'bottom-right' as ToastPosition,
  style: {
    cursor: 'pointer'
  },
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <ServersProvider>
          <HeroUIProvider>
            <Component {...pageProps} />
          </HeroUIProvider>
        </ServersProvider>
      </QueryClientProvider>
      <Toaster toastOptions={toastOptions} />
    </div>
  );
}

export default MyApp;