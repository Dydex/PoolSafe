import { useCallback, useEffect, useState } from "react";

type FreighterWalletState = {
  address: string;
  error: string;
  isConnecting: boolean;
  isInstalled: boolean;
};

const initialState: FreighterWalletState = {
  address: "",
  error: "",
  isConnecting: false,
  isInstalled: false
};

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to connect Freighter.";
}

export function useFreighterWallet() {
  const [wallet, setWallet] = useState<FreighterWalletState>(initialState);

  const refreshWallet = useCallback(async () => {
    try {
      const freighter = await import("@stellar/freighter-api");
      const connection = await freighter.isConnected();

      if (connection.error || !connection.isConnected) {
        setWallet((current) => ({ ...current, isInstalled: false }));
        return;
      }

      const allowed = await freighter.isAllowed();
      const addressResult = allowed.isAllowed ? await freighter.getAddress() : { address: "" };

      setWallet((current) => ({
        ...current,
        address: addressResult.address,
        error: "",
        isInstalled: true
      }));
    } catch (error) {
      setWallet((current) => ({
        ...current,
        error: errorMessage(error),
        isInstalled: false
      }));
    }
  }, []);

  const connect = useCallback(async () => {
    setWallet((current) => ({ ...current, error: "", isConnecting: true }));

    try {
      const freighter = await import("@stellar/freighter-api");
      const result = await freighter.requestAccess();

      if (result.address && !result.error) {
        setWallet({
          address: result.address,
          error: "",
          isConnecting: false,
          isInstalled: true
        });
        return result.address;
      }

      const allowed = await freighter.setAllowed();
      const addressResult = allowed.isAllowed ? await freighter.getAddress() : { address: "" };

      if (addressResult.address && !addressResult.error) {
        setWallet({
          address: addressResult.address,
          error: "",
          isConnecting: false,
          isInstalled: true
        });
        return addressResult.address;
      }

      if (result.error || allowed.error || addressResult.error) {
        setWallet((current) => ({
          ...current,
          error:
            result.error?.message ||
            allowed.error?.message ||
            addressResult.error?.message ||
            "Freighter access was not approved.",
          isConnecting: false,
          isInstalled: true
        }));
        return "";
      }

      setWallet((current) => ({
        ...current,
        error: "Freighter is not installed, locked, or access was not approved.",
        isConnecting: false,
        isInstalled: false
      }));
      return "";
    } catch (error) {
      setWallet((current) => ({
        ...current,
        error: errorMessage(error),
        isConnecting: false
      }));
      return "";
    }
  }, []);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  return {
    ...wallet,
    connect,
    refreshWallet
  };
}
