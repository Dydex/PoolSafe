import { useRouter } from "next/router";
import { useRef, useState, type FormEvent } from "react";

import { FigmaPage } from "../../components/FigmaPage";
import { Header } from "../../components/header";
import { Footer } from "../../components/footer";
import { useWallet } from "../../context/WalletContext";
import { pool } from "../../lib/contracts";
import { toStroops, fromStroops } from "../../lib/contracts/config";
import { uploadFile } from "../../lib/contracts/pinata";

export default function SubmitClaimPage() {
  const router = useRouter();
  const poolAddress = (router.query.pool as string) ?? "";
  const { address, isConnected, connect } = useWallet();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [certified, setCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!certified) {
      setStatus("Please certify the information is accurate.");
      return;
    }

    const connectedAddress = address || (await connect());
    if (!connectedAddress) {
      setStatus("Connect your wallet before submitting a claim.");
      return;
    }

    if (!poolAddress) {
      setStatus("No pool address specified. Navigate from a pool details page.");
      return;
    }

    setSubmitting(true);
    setStatus("Uploading evidence to IPFS...");

    try {
      // Upload files to IPFS
      let evidenceCid = "";
      if (files.length > 0) {
        try {
          const uploadResult = await uploadFile(files[0]);
          evidenceCid = uploadResult.cid;
        } catch {
          evidenceCid = "";
        }
      }

      setStatus("Submitting claim to Stellar Testnet...");

      const reviewPeriod = 7 * 24 * 60 * 60; // 7 days
      const txHash = await pool.submitClaim(poolAddress, connectedAddress, {
        amount: toStroops(Number(amount)),
        description,
        evidenceCid,
        reviewPeriodSeconds: reviewPeriod,
      });

      setStatus(`Claim submitted! TX: ${txHash}`);
      setTimeout(() => router.push(`/pool-details?address=${poolAddress}`), 3000);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to submit claim.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FigmaPage title="Submit Claim">
      <>
        <Header />
        <main className="flex-grow pt-24 pb-xl px-container-padding max-w-[1280px] mx-auto w-full grid grid-cols-12 gap-xl">
          {/* Left Sidebar */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-lg">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-lg shadow-sm">
              <div className="flex items-center gap-sm mb-lg">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined">gavel</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-primary">Submit Claim</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Pool: {poolAddress ? `${poolAddress.slice(0, 8)}...` : "Not selected"}
                  </p>
                </div>
              </div>
              <div className="mt-xl pt-lg border-t border-outline-variant/20">
                <h3 className="font-label-caps text-label-caps text-outline uppercase mb-md">Submission Tips</h3>
                <ul className="space-y-sm text-body-sm text-on-surface-variant">
                  <li className="flex gap-xs">
                    <span className="material-symbols-outlined text-secondary scale-75">check_circle</span>
                    Provide evidence files or transaction hashes.
                  </li>
                  <li className="flex gap-xs">
                    <span className="material-symbols-outlined text-secondary scale-75">check_circle</span>
                    Describe the loss event clearly with dates.
                  </li>
                  <li className="flex gap-xs">
                    <span className="material-symbols-outlined text-secondary scale-75">check_circle</span>
                    Claims have a 24h cooldown between submissions.
                  </li>
                </ul>
              </div>
            </div>
            <div className="bg-primary-container text-on-primary-container rounded-xl p-lg flex items-center gap-md">
              <span className="material-symbols-outlined text-[32px]">verified_user</span>
              <div>
                <p className="font-headline-sm text-headline-sm leading-tight">Quorum Voting</p>
                <p className="font-body-sm text-body-sm opacity-80">
                  Your claim will be reviewed by pool members with 60% quorum threshold.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
              <div className="p-xl border-b border-outline-variant/20">
                <h1 className="font-headline-md text-headline-md text-on-surface">Claim Details</h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                  Provide accurate information to expedite the review process.
                </p>
              </div>
              <form className="p-xl space-y-xl" onSubmit={handleSubmit}>
                <div className="space-y-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Claim Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-md py-lg font-mono-data text-headline-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <div className="absolute right-md top-1/2 -translate-y-1/2 flex items-center gap-xs text-outline">
                      <span className="font-bold">USDC</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Incident Description
                  </label>
                  <textarea
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-md py-md font-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                    placeholder="Describe the loss event, include dates and circumstances..."
                    rows={5}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-xs">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Evidence &amp; Documentation
                  </label>
                  <div className="border-2 border-dashed border-outline-variant/50 rounded-xl p-md flex flex-col gap-sm bg-surface-container-low/50">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-sm bg-surface-container-lowest border border-outline-variant/30 rounded-lg">
                        <div className="flex items-center gap-sm">
                          <span className="material-symbols-outlined text-secondary">image</span>
                          <span className="font-body-sm text-on-surface">{f.name}</span>
                          <span className="font-label-caps text-outline">{(f.size / 1024).toFixed(0)} KB</span>
                        </div>
                        <button type="button" onClick={() => removeFile(i)}>
                          <span className="material-symbols-outlined text-outline hover:text-error cursor-pointer text-sm">close</span>
                        </button>
                      </div>
                    ))}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={handleFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-secondary font-label-caps text-label-caps flex items-center gap-xs hover:underline uppercase cursor-pointer justify-center mt-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span> Add Files
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-low/50 rounded-lg p-md space-y-sm">
                  <label className="flex items-start gap-md cursor-pointer">
                    <input
                      className="mt-1 rounded text-secondary focus:ring-secondary border-outline-variant/50"
                      type="checkbox"
                      checked={certified}
                      onChange={(e) => setCertified(e.target.checked)}
                    />
                    <span className="text-body-sm text-on-surface-variant italic">
                      I certify that the information provided is accurate and represents a genuine loss within the scope of my coverage policy.
                    </span>
                  </label>
                </div>

                {status && (
                  <p className={`text-body-sm ${status.includes("!") ? "text-secondary" : "text-error"}`}>
                    {status}
                  </p>
                )}

                <div className="flex flex-col md:flex-row gap-md pt-lg">
                  <button
                    className="flex-1 bg-secondary text-on-secondary px-xl py-lg rounded-lg font-headline-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-sm disabled:opacity-50"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Claim Proposal"}
                    <span className="material-symbols-outlined">send</span>
                  </button>
                  <button
                    className="px-xl py-lg border border-outline-variant text-on-surface-variant rounded-lg font-headline-sm hover:bg-surface-container-high transition-all"
                    type="button"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
        <Footer />
      </>
    </FigmaPage>
  );
}
