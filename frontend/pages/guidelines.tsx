import Link from "next/link";

import { FigmaPage } from "../components/FigmaPage";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

const SECTIONS = [
  {
    icon: "group",
    title: "Pool Formation & Activation",
    items: [
      "A pool starts in Formation phase. It requires a minimum of 15 members to activate.",
      "Maximum pool size is 30 members. Once full, the pool auto-activates.",
      "The creator pays the first monthly contribution on pool creation and is registered as member #1.",
      "Each new member pays the fixed monthly contribution to join. Contributions go directly into the shared pool balance.",
      "Once activated, a 60-day waiting period begins before any claims can be filed.",
    ],
  },
  {
    icon: "payments",
    title: "Monthly Contributions",
    items: [
      "Contributions are due once per cycle. Cycles advance on the 8th of every month (via keeper automation).",
      "Missing a contribution plus the 7-day grace period marks you as inactive and suspends your coverage.",
      "Inactive members cannot submit claims. A pool creator or manager can remove defaulting members.",
      "All contributions remain in the pool balance until paid out as a claim or distributed at pool close.",
    ],
  },
  {
    icon: "assignment_late",
    title: "Submitting a Claim",
    items: [
      "You must be an active member in the Active phase with the 60-day waiting period elapsed.",
      "Only one claim per cycle is permitted per member.",
      "Single claim cap: 10% of total pool balance. Monthly total payout cap: 25% of pool balance.",
      "Upload evidence to IPFS and provide a clear description of the loss event.",
      "Claims have a 7-day voting window. After the deadline, un-resolved claims are auto-expired by the keeper.",
    ],
  },
  {
    icon: "how_to_vote",
    title: "Peer Review & Voting",
    items: [
      "Each cycle, 30% of members are pseudo-randomly selected as Reviewers (Signers).",
      "Only selected Reviewers can vote on claims — other members cannot vote.",
      "Approval requires 60% quorum of the Reviewer set (e.g. 5 of 9 reviewers).",
      "Vote options are Approve or Reject. Votes are immutable once submitted on-chain.",
      "Once quorum is reached for Approval, the claim payout is executable.",
    ],
  },
  {
    icon: "account_balance",
    title: "Payouts",
    items: [
      "Approved claims can be resolved (paid out) by any member after quorum is confirmed.",
      "Funds are transferred directly from the pool contract to the claimant's wallet.",
      "The pool balance is updated immediately after each payout.",
      "Monthly payout limit is enforced on-chain — if exceeded, new claims will be rejected.",
    ],
  },
  {
    icon: "manage_accounts",
    title: "Signer Rotation",
    items: [
      "Reviewer sets rotate every 60 days to prevent long-term capture or bias.",
      "Rotation is permissionless — anyone can trigger it once 60 days have elapsed.",
      "The keeper service automatically rotates Reviewers every 60 days.",
      "New Reviewers are selected pseudo-randomly using the ledger sequence number.",
    ],
  },
  {
    icon: "lock",
    title: "Pool Closure",
    items: [
      "A pool enters Closed phase when its expiry timestamp is reached.",
      "On close, the remaining pool balance is distributed proportionally to all active members.",
      "Inactive members (missed contributions) do not receive any distribution.",
      "No new claims or contributions are accepted once a pool is closed.",
    ],
  },
];

export default function GuidelinesPage() {
  return (
    <FigmaPage title="Protocol Guidelines">
      <>
        <Header />
        <main className="pt-24 pb-xl px-container-padding max-w-[1280px] mx-auto">
          {/* Hero */}
          <header className="mb-[60px] text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-container mb-lg">
              <span className="material-symbols-outlined text-[32px] text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                menu_book
              </span>
            </div>
            <h1 className="font-display-lg text-display-lg text-primary mb-sm">Protocol Guidelines</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              NexusGuard is a peer-to-peer microinsurance protocol on Stellar. All rules are enforced by smart contracts — no intermediaries, no hidden terms.
            </p>
          </header>

          {/* Key numbers banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-[60px]">
            {[
              { value: "15–30", label: "Members per Pool" },
              { value: "60 days", label: "Waiting Period" },
              { value: "60%", label: "Approval Quorum" },
              { value: "10% / 25%", label: "Claim Cap (Single / Monthly)" },
            ].map((stat) => (
              <div key={stat.label} className="bg-secondary-container text-on-secondary-container rounded-xl p-lg text-center">
                <div className="font-headline-md text-headline-md font-bold">{stat.value}</div>
                <div className="font-label-caps text-label-caps opacity-80 mt-xs">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Sections */}
          <div className="flex flex-col gap-xl">
            {SECTIONS.map((section) => (
              <section
                key={section.title}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-xl shadow-sm"
              >
                <div className="flex items-center gap-md mb-lg">
                  <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
                    <span className="material-symbols-outlined">{section.icon}</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-primary">{section.title}</h2>
                </div>
                <ul className="space-y-sm">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-md">
                      <span className="material-symbols-outlined text-secondary text-[18px] mt-[2px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{item}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-[60px] bg-primary rounded-2xl p-xl flex flex-col md:flex-row items-center justify-between gap-lg">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-primary mb-xs">Ready to get covered?</h3>
              <p className="font-body-sm text-on-primary/80">Join or create a pool on Stellar Testnet today.</p>
            </div>
            <div className="flex gap-md">
              <Link
                href="/explore-pools"
                className="bg-on-primary text-primary px-xl py-md rounded-lg font-bold hover:brightness-105 transition-all"
              >
                Explore Pools
              </Link>
              <Link
                href="/create-pool"
                className="border border-on-primary/40 text-on-primary px-xl py-md rounded-lg font-bold hover:bg-on-primary/10 transition-all"
              >
                Create Pool
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    </FigmaPage>
  );
}
