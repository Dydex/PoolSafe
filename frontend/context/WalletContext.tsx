import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type WalletState = {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string;
};

type WalletContextValue = WalletState & {
  connect: () => Promise<string>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue>({
  address: "",
  isConnected: false,
  isConnecting: false,
  error: "",
  connect: async () => "",
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: "",
    isConnected: false,
    isConnecting: false,
    error: "",
  });

  const refreshWallet = useCallback(async () => {
    try {
      const freighter = await import("@stellar/freighter-api");
      const connection = await freighter.isConnected();
      if (!connection.isConnected) return;

      const allowed = await freighter.isAllowed();
      if (!allowed.isAllowed) return;

      const result = await freighter.getAddress();
      if (result.address) {
        setState({
          address: result.address,
          isConnected: true,
          isConnecting: false,
          error: "",
        });
      }
    } catch {
      // Freighter not installed or error — silent
    }
  }, []);

  const connect = useCallback(async (): Promise<string> => {
    setState((s) => ({ ...s, isConnecting: true, error: "" }));
    try {
      const freighter = await import("@stellar/freighter-api");
      const result = await freighter.requestAccess();

      if (result.address && !result.error) {
        setState({
          address: result.address,
          isConnected: true,
          isConnecting: false,
          error: "",
        });
        return result.address;
      }

      // Fallback — try setAllowed
      const allowed = await freighter.setAllowed();
      if (allowed.isAllowed) {
        const addr = await freighter.getAddress();
        if (addr.address) {
          setState({
            address: addr.address,
            isConnected: true,
            isConnecting: false,
            error: "",
          });
          return addr.address;
        }
      }

      const errorMsg =
        result.error?.message ?? "Wallet connection was not approved.";
      setState((s) => ({ ...s, isConnecting: false, error: errorMsg }));
      return "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to connect wallet.";
      setState((s) => ({ ...s, isConnecting: false, error: msg }));
      return "";
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: "",
      isConnected: false,
      isConnecting: false,
      error: "",
    });
  }, []);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
