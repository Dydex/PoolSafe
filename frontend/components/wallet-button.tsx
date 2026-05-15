import { useWallet } from "../context/WalletContext";
import { shortenAddress } from "../lib/contracts/config";
import { Button } from "./button";

export function WalletButton() {
  const { address, isConnected, isConnecting, error, connect, disconnect } =
    useWallet();

  return (
    <div className="flex flex-col items-end gap-xs">
      {isConnected ? (
        <Button onClick={disconnect} variant="outline">
          {shortenAddress(address)}
        </Button>
      ) : (
        <Button disabled={isConnecting} onClick={connect}>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      )}
      {error ? (
        <span className="max-w-[220px] text-right text-xs text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export default WalletButton;
