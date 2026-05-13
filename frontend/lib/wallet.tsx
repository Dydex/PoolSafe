import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type React from "react";

type WalletStatus = "idle" | "checking" | "connecting" | "connected" | "error";

type WalletContextValue = {
  address: string | null;
  error: string | null;
  isFreighterAvailable: boolean | null;
  network: string | null;
  status: WalletStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
};

type FreighterError = {
  message?: string;
};

type FreighterApi = {
  getAddress: () => Promise<{ address: string; error?: FreighterError }>;
  getNetwork: () => Promise<{ network: string; networkPassphrase: string; error?: FreighterError }>;
  isConnected: () => Promise<{ isConnected: boolean; error?: FreighterError }>;
  requestAccess: () => Promise<{ address: string; error?: FreighterError }>;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) return message;
  }

  return fallback;
}

async function loadFreighter(): Promise<FreighterApi> {
  return import("@stellar/freighter-api");
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFreighterAvailable, setIsFreighterAvailable] = useState<boolean | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>("idle");

  const readNetwork = useCallback(async (freighter: FreighterApi) => {
    const networkResult = await freighter.getNetwork();
    if (!networkResult.error) setNetwork(networkResult.network);
  }, []);

  useEffect(() => {
    let active = true;

    async function checkExistingConnection() {
      setStatus("checking");

      try {
        const freighter = await loadFreighter();
        const connection = await freighter.isConnected();

        if (!active) return;

        if (connection.error || !connection.isConnected) {
          setIsFreighterAvailable(false);
          setStatus("idle");
          return;
        }

        setIsFreighterAvailable(true);

        const access = await freighter.getAddress();
        if (!active) return;

        if (access.address) {
          setAddress(access.address);
          await readNetwork(freighter);
          if (active) setStatus("connected");
        } else {
          setStatus("idle");
        }
      } catch (caughtError) {
        if (!active) return;
        setIsFreighterAvailable(false);
        setError(getErrorMessage(caughtError, "Unable to check Freighter."));
        setStatus("idle");
      }
    }

    checkExistingConnection();

    return () => {
      active = false;
    };
  }, [readNetwork]);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      const freighter = await loadFreighter();
      const connection = await freighter.isConnected();

      if (connection.error || !connection.isConnected) {
        setIsFreighterAvailable(false);
        setStatus("error");
        setError("Freighter is not installed or is unavailable in this browser.");
        return;
      }

      setIsFreighterAvailable(true);

      const access = await freighter.requestAccess();
      if (access.error || !access.address) {
        setStatus("error");
        setError(access.error?.message || "Freighter did not return a wallet address.");
        return;
      }

      setAddress(access.address);
      await readNetwork(freighter);
      setStatus("connected");
    } catch (caughtError) {
      setStatus("error");
      setError(getErrorMessage(caughtError, "Unable to connect Freighter."));
    }
  }, [readNetwork]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
    setNetwork(null);
    setStatus("idle");
  }, []);

  const value = useMemo(
    () => ({
      address,
      connect,
      disconnect,
      error,
      isFreighterAvailable,
      network,
      status
    }),
    [address, connect, disconnect, error, isFreighterAvailable, network, status]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const wallet = useContext(WalletContext);

  if (!wallet) {
    throw new Error("useWallet must be used inside WalletProvider.");
  }

  return wallet;
}
