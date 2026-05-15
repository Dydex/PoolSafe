import { useRouter } from "next/router";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { Button } from "../components/button";
import { FigmaPage } from "../components/FigmaPage";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { useWallet } from "../context/WalletContext";
import { factory } from "../lib/contracts";
import { toStroops, CONTRACTS } from "../lib/contracts/config";
import { uploadMetadata } from "../lib/contracts/pinata";

type PoolForm = {
  name: string;
  description: string;
  category: string;
  premium: string;
  maxMembers: string;
  votingThreshold: string;
};

const initialForm: PoolForm = {
  name: "",
  description: "",
  category: "Other",
  premium: "",
  maxMembers: "",
  votingThreshold: "66"
};

export default function CreatePoolPage() {
  const [form, setForm] = useState<PoolForm>(initialForm);
  const [signers, setSigners] = useState<string[]>([""]);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { address, isConnected, isConnecting, error, connect } = useWallet();

  const validSigners = useMemo(
    () => signers.map((signer) => signer.trim()).filter(Boolean),
    [signers]
  );

  function updateField(field: keyof PoolForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateSigner(index: number, value: string) {
    setSigners((current) =>
      current.map((signer, signerIndex) => (signerIndex === index ? value : signer))
    );
  }

  function addSigner() {
    setSigners((current) => [...current, ""]);
  }

  function removeSigner(index: number) {
    setSigners((current) => current.filter((_, signerIndex) => signerIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const connectedAddress = address || (await connect());

    if (!connectedAddress) {
      setStatus("Connect Freighter before creating a pool.");
      return;
    }

    if (!CONTRACTS.factory) {
      setStatus("Factory contract not configured. Set NEXT_PUBLIC_FACTORY_CONTRACT_ID.");
      return;
    }

    setSubmitting(true);
    setStatus("Uploading pool metadata to IPFS...");

    try {
      // Upload metadata to IPFS via backend
      let metadataCid = "";
      try {
        const metadata = {
          name: form.name,
          description: form.description,
          category: form.category,
          signers: validSigners,
          votingThreshold: Number(form.votingThreshold),
          createdBy: connectedAddress,
        };
        const result = await uploadMetadata(metadata);
        metadataCid = result.cid;
      } catch {
        // If Pinata upload fails, continue without metadata CID
        metadataCid = "";
      }

      setStatus("Creating pool on Stellar Testnet...");

      const txHash = await factory.createPool(connectedAddress, {
        name: form.name,
        description: form.description,
        contributionAmount: toStroops(Number(form.premium)),
        maxMembers: Number(form.maxMembers) || 30,
        metadataCid,
      });

      setStatus(`Pool created successfully! TX: ${txHash}`);
      setTimeout(() => router.push("/explore-pools"), 3000);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to create pool.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FigmaPage title="Create Pool">
      <>
        <Header />
        <main className="mx-auto min-h-screen max-w-[1280px] px-container-padding pb-xl pt-[96px]">
          <div className="grid gap-xl lg:grid-cols-[260px_1fr]">
            <aside className="hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm lg:block">
              <div className="mb-lg flex items-center gap-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container">
                  <span className="material-symbols-outlined text-on-primary-container">
                    account_balance
                  </span>
                </div>
                <div>
                  <div className="font-headline-sm text-headline-sm font-bold text-primary">
                    Protocol Manager
                  </div>
                  <div className="font-body-sm text-body-sm text-outline">Risk Management</div>
                </div>
              </div>
              <nav className="flex flex-col gap-xs">
                {[
                  ["/dashboard", "dashboard", "Dashboard"],
                  ["/explore-pools", "account_balance_wallet", "My Pools"],
                  ["/claims/new", "gavel", "My Claims"],
                  ["/create-pool", "add_circle", "Create Pool"],
                  ["/claim-voting", "how_to_vote", "Governance"]
                ].map(([href, icon, label]) => (
                  <a
                    className={`flex items-center gap-md rounded-lg px-md py-sm font-body-sm text-body-sm transition-all ${
                      href === "/create-pool"
                        ? "bg-secondary-container font-bold text-on-secondary-container"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                    href={href}
                    key={href}
                  >
                    <span className="material-symbols-outlined">{icon}</span>
                    {label}
                  </a>
                ))}
              </nav>
            </aside>

            <section>
              <header className="mb-xl">
                <p className="mb-xs font-label-caps text-label-caps uppercase text-secondary">
                  Stellar Testnet
                </p>
                <h1 className="mb-xs font-display-lg text-display-lg text-primary">
                  Start a Coverage Pool
                </h1>
                <p className="max-w-[760px] font-body-lg text-body-lg text-on-surface-variant">
                  Configure pool rules, add trusted signers, and connect Freighter before submitting
                  the pool transaction.
                </p>
              </header>

              <form className="grid grid-cols-1 gap-xl" onSubmit={handleSubmit}>
                <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm">
                  <div className="mb-lg flex items-center gap-md">
                    <div className="rounded-lg bg-secondary-container/30 p-sm">
                      <span className="material-symbols-outlined text-secondary">badge</span>
                    </div>
                    <h2 className="font-headline-md text-headline-md">Pool Identity</h2>
                  </div>

                  <div className="space-y-lg">
                    <label className="block">
                      <span className="mb-xs block font-label-caps text-label-caps text-outline">
                        Pool Name
                      </span>
                      <input
                        className="w-full rounded-lg border border-outline-variant bg-surface p-md font-body-sm outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                        onChange={(event) => updateField("name", event.target.value)}
                        placeholder="e.g. Lagos Device Protection Pool"
                        required
                        type="text"
                        value={form.name}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-xs block font-label-caps text-label-caps text-outline">
                        Description
                      </span>
                      <textarea
                        className="w-full rounded-lg border border-outline-variant bg-surface p-md font-body-sm outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                        onChange={(event) => updateField("description", event.target.value)}
                        placeholder="Coverage for theft and accidental damage for community members."
                        required
                        rows={3}
                        value={form.description}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-xs block font-label-caps text-label-caps text-outline">
                        Category
                      </span>
                      <select
                        className="w-full rounded-lg border border-outline-variant bg-surface p-md font-body-sm outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                        onChange={(event) => updateField("category", event.target.value)}
                        value={form.category}
                      >
                        {["Health", "Crop", "Property", "Vehicle", "Travel", "Business", "Other"].map(
                          (category) => (
                            <option key={category}>{category}</option>
                          )
                        )}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm">
                  <div className="mb-lg flex items-center gap-md">
                    <div className="rounded-lg bg-secondary-container/30 p-sm">
                      <span className="material-symbols-outlined text-secondary">payments</span>
                    </div>
                    <h2 className="font-headline-md text-headline-md">Financial Parameters</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
                    <label className="block">
                      <span className="mb-xs block font-label-caps text-label-caps text-outline">
                        Monthly Premium
                      </span>
                      <div className="relative">
                        <input
                          className="w-full rounded-lg border border-outline-variant bg-surface p-md pr-[72px] font-mono-data outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                          min="1"
                          onChange={(event) => updateField("premium", event.target.value)}
                          placeholder="5"
                          required
                          type="number"
                          value={form.premium}
                        />
                        <span className="absolute right-md top-1/2 -translate-y-1/2 font-mono-data text-outline">
                          USDC
                        </span>
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-xs block font-label-caps text-label-caps text-outline">
                        Max Members
                      </span>
                      <input
                        className="w-full rounded-lg border border-outline-variant bg-surface p-md font-mono-data outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                        max="30"
                        min="1"
                        onChange={(event) => updateField("maxMembers", event.target.value)}
                        placeholder="30"
                        required
                        type="number"
                        value={form.maxMembers}
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm">
                  <div className="mb-lg flex items-center justify-between gap-md">
                    <div className="flex items-center gap-md">
                      <div className="rounded-lg bg-secondary-container/30 p-sm">
                        <span className="material-symbols-outlined text-secondary">group_add</span>
                      </div>
                      <div>
                        <h2 className="font-headline-md text-headline-md">Pool Signers</h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Add Stellar public keys that should review or co-sign pool decisions.
                        </p>
                      </div>
                    </div>
                    <Button onClick={addSigner} variant="outline">
                      Add Signer
                    </Button>
                  </div>

                  <div className="space-y-sm">
                    {signers.map((signer, index) => (
                      <div className="flex flex-col gap-sm md:flex-row" key={index}>
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface p-md font-mono-data text-body-sm outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                          onChange={(event) => updateSigner(index, event.target.value)}
                          placeholder="G..."
                          value={signer}
                        />
                        <Button
                          className="md:w-[112px]"
                          disabled={signers.length === 1}
                          onClick={() => removeSigner(index)}
                          variant="ghost"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm">
                  <div className="mb-lg flex items-center gap-md">
                    <div className="rounded-lg bg-secondary-container/30 p-sm">
                      <span className="material-symbols-outlined text-secondary">rule</span>
                    </div>
                    <h2 className="font-headline-md text-headline-md">Claim Rules</h2>
                  </div>

                  <label className="block">
                    <span className="mb-xs block font-label-caps text-label-caps text-outline">
                      Voting Threshold
                    </span>
                    <div className="flex items-center gap-md">
                      <input
                        className="flex-1 accent-secondary"
                        max="90"
                        min="51"
                        onChange={(event) => updateField("votingThreshold", event.target.value)}
                        type="range"
                        value={form.votingThreshold}
                      />
                      <span className="rounded bg-surface-container-high px-sm py-xs font-mono-data text-body-sm text-primary">
                        {form.votingThreshold}%
                      </span>
                    </div>
                  </label>
                </section>

                <section className="flex flex-col items-start justify-between gap-lg rounded-xl border border-outline-variant/30 bg-surface-container-low p-lg md:flex-row md:items-center">
                  <div>
                    <p className="font-headline-sm text-headline-sm text-primary">
                      {address ? `Connected: ${address.slice(0, 8)}...${address.slice(-8)}` : "Freighter required"}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      The pool can be submitted after Freighter approves access on Stellar testnet.
                    </p>
                    {error ? <p className="mt-xs text-body-sm text-error">{error}</p> : null}
                    {status ? <p className="mt-xs text-body-sm text-secondary">{status}</p> : null}
                  </div>
                  <div className="flex w-full gap-md md:w-auto">
                    <Button className="flex-1 md:min-w-[140px]" type="reset" variant="outline">
                      Cancel
                    </Button>
                    <Button className="flex-1 md:min-w-[160px]" disabled={isConnecting || submitting} type="submit">
                      {submitting ? "Creating..." : isConnecting ? "Connecting..." : "Create Pool"}
                    </Button>
                  </div>
                </section>
              </form>
            </section>
          </div>
        </main>
        <Footer />
      </>
    </FigmaPage>
  );
}
