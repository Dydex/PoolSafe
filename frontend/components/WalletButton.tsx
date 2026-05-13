import { useWallet } from "@/lib/wallet";
import { Wallet, X } from "lucide-react";
import clsx from "clsx";


function shortenAddress(address: string) {
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
}

export default function WalletButton({ compact = false }: { compact?: boolean }) {
  const { address, connect, disconnect, error, network, status } = useWallet();
  const isBusy = status === "checking" || status === "connecting";

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <button
          className={clsx(
            "flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm font-semibold text-on-surface shadow-sm transition hover:bg-surface-container-low",
            compact && "text-label-caps"
          )}
          title={`${address}${network ? ` on ${network}` : ""}`}
          type="button"
        >
          <Wallet size={18} />
          <span className="font-mono">{shortenAddress(address)}</span>
          {network && <span className="hidden text-xs text-on-surface-variant sm:inline">{network}</span>}
        </button>
        <button
          aria-label="Disconnect wallet"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-white text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
          onClick={disconnect}
          title="Disconnect wallet"
          type="button"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className={clsx(
          "flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70",
          compact ? "text-label-caps" : "text-sm"
        )}
        disabled={isBusy}
        onClick={connect}
        type="button"
      >
        <Wallet size={18} />
        {status === "connecting" ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <p className="max-w-64 text-right text-xs leading-snug text-amber-800">{error}</p>}
    </div>
  );
}