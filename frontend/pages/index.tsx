import Link from "next/link";
import { useEffect, useState } from "react";

import { FigmaPage } from "../components/FigmaPage";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { factory, pool } from "../lib/contracts";
import { fromStroops, CONTRACTS } from "../lib/contracts/config";

export default function LandingPage() {
  const [poolCount, setPoolCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalFunds, setTotalFunds] = useState(0);

  useEffect(() => {
    async function loadStats() {
      if (!CONTRACTS.factory) return;
      try {
        const pools = await factory.getAllPools();
        setPoolCount(pools.length);

        let members = 0;
        let funds = 0;
        await Promise.all(
          pools.map(async (fp) => {
            try {
              const summary = await pool.getPoolSummary(fp.address);
              if (summary) {
                members += summary.memberCount;
                funds += Number(summary.totalFunds);
              }
            } catch {}
          })
        );
        setTotalMembers(members);
        setTotalFunds(funds);
      } catch {}
    }
    loadStats();
  }, []);

  return (
    <FigmaPage title="Landing Page">
      <>
        <Header />
        <main className="pt-16">
        {/*Hero Section*/}
        <section className="relative overflow-hidden py-xl md:py-[120px] px-container-padding max-w-[1280px] mx-auto">
        <div className="grid md:grid-cols-2 gap-xl items-center">
        <div className="z-10">
        <h1 className="font-display-lg text-display-lg text-primary mb-md">Protection for Life&#39;s Little Hiccups.</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-xl max-w-[480px]">
                                Instant, transparent coverage for the things you use every day—from your phone screen to your car tyres.
                            </p>
        <div className="flex flex-col sm:flex-row gap-md">
        <Link href="/explore-pools" className="bg-primary text-on-primary px-xl py-md rounded-lg font-headline-sm text-headline-sm hover:opacity-90 transition-all flex items-center justify-center gap-xs">
                                    Get Covered
                                    <span className="material-symbols-outlined" data-icon="add_circle">add_circle</span>
        </Link>
        <Link href="/explore-pools" className="border border-outline text-primary px-xl py-md rounded-lg font-headline-sm text-headline-sm hover:bg-surface-container-low transition-all flex items-center justify-center gap-xs">
                                    View Plans
                                    <span className="material-symbols-outlined" data-icon="explore">explore</span>
        </Link>
        </div>
        </div>
        <div className="relative">
        <div className="glass-card rounded-[24px] p-md overflow-hidden shadow-xl transform rotate-2">
        <img alt="Institutional Risk Management Dashboard" className="rounded-xl w-full h-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSERkpe1aWZJRSPaANAQE4nKzoB-kNPPqNTBd1kqvnDh-0WbNEqszR5F3xFPlAf-tXr6yRfAhyGSf4JL0uBanKaySXN3-AnyfDzVopaEiqcDrns8UBIknKxJ-wRUoLkRExTb6L4e4uoP7n1idohjoNBjR4j8nCS6osIViPG6M8CUtt1vtiQqfbC45ZNT1qjY_-c5xdaHladiqKcczeY889_lkWnGrrLiP4IkG-Jr5O4s5DwwwEV9fYtL7P0Gb7wQCGP9DzZhddtVQ"/>
        </div>
        <div className="absolute -bottom-xs -left-xs bg-secondary-container text-on-secondary-container p-md rounded-xl shadow-lg transform -rotate-3 hidden md:block">
        <div className="flex items-center gap-xs mb-xs">
        <span className="material-symbols-outlined text-secondary" data-icon="verified" data-weight="fill">verified</span>
        <span className="font-label-caps text-label-caps uppercase">Protocol Verified</span>
        </div>
        <div className="font-mono-data text-mono-data">100% On-chain Audited</div>
        </div>
        </div>
        </div>
        </section>
        {/*Stats Section — live data from Factory + Pool contracts*/}
        <section className="bg-surface-container-low py-xl">
        <div className="max-w-[1280px] mx-auto px-container-padding">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
        <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/30 flex flex-col items-center text-center">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">Total Value Locked</span>
        <div className="font-display-lg text-[40px] text-primary">
          {totalFunds > 0 ? `${fromStroops(BigInt(totalFunds)).toFixed(2)}` : "—"}
        </div>
        <div className="text-secondary font-body-sm text-body-sm flex items-center gap-xs mt-xs">
        <span className="material-symbols-outlined text-[16px]" data-icon="trending_up">trending_up</span>
                                    USDC across all pools
                                </div>
        </div>
        <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/30 flex flex-col items-center text-center">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">Active Pools</span>
        <div className="font-display-lg text-[40px] text-primary">{poolCount}</div>
        <div className="text-on-surface-variant font-body-sm text-body-sm mt-xs">Live on Stellar Testnet</div>
        </div>
        <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/30 flex flex-col items-center text-center">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">Pool Members</span>
        <div className="font-display-lg text-[40px] text-primary">{totalMembers}</div>
        <div className="text-secondary font-body-sm text-body-sm flex items-center gap-xs mt-xs">
        <span className="material-symbols-outlined text-[16px]" data-icon="check_circle">check_circle</span>
                                    Participating across pools
                                </div>
        </div>
        </div>
        </div>
        </section>
        {/*How It Works*/}
        <section className="py-[80px] px-container-padding max-w-[1280px] mx-auto">
        <div className="text-center mb-[60px]">
        <h2 className="font-headline-md text-headline-md text-primary mb-xs">How NexusGuard Protects You</h2>
        <p className="text-on-surface-variant max-w-[600px] mx-auto">Everyday coverage simplified into four transparent steps.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-lg">
        <div className="flex flex-col gap-md">
        <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
        <span className="material-symbols-outlined" data-icon="account_balance_wallet">account_balance_wallet</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-primary">Pick a Plan</h3>
        <p className="text-body-sm text-on-surface-variant">Choose the perfect microinsurance plan tailored for your specific needs and everyday items.</p>
        </div>
        <div className="flex flex-col gap-md">
        <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
        <span className="material-symbols-outlined" data-icon="search">search</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-primary">Pay Small Monthly Premium</h3>
        <p className="text-body-sm text-on-surface-variant">Keep your coverage active with a tiny, transparent monthly fee that fits your budget.</p>
        </div>
        <div className="flex flex-col gap-md">
        <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
        <span className="material-symbols-outlined" data-icon="security">security</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-primary">Snap a Photo of the Damage</h3>
        <p className="text-body-sm text-on-surface-variant">When accidents happen, simply upload a picture of the damage through our app.</p>
        </div>
        <div className="flex flex-col gap-md">
        <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
        <span className="material-symbols-outlined" data-icon="payments">payments</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-primary">Get Paid Instantly</h3>
        <p className="text-body-sm text-on-surface-variant">Our automated assessment approves valid claims and transfers funds immediately to you.</p>
        </div>
        </div>
        </section>
        {/*CTA Bento Grid*/}
        <section className="pb-xl px-container-padding max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-md h-auto md:h-[400px]">
        <div className="md:col-span-8 bg-primary rounded-[24px] p-xl flex flex-col justify-between text-on-primary overflow-hidden relative">
        <div className="z-10">
        <h2 className="font-display-lg text-[32px] mb-md">Ready to protect what matters?</h2>
        <p className="text-on-primary-container max-w-[400px] mb-lg">Join our members enjoying peace of mind with the world&#39;s most transparent microinsurance platform.</p>
        <Link href="/explore-pools" className="inline-block bg-secondary-container text-on-secondary-container px-xl py-md rounded-lg font-headline-sm text-headline-sm hover:opacity-90 transition-all">
                                    Get Started Now
        </Link>
        </div>
        <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-10 translate-y-10">
        <span className="material-symbols-outlined text-[300px]" data-icon="shield">shield</span>
        </div>
        </div>
        <div className="md:col-span-4 bg-surface-container-high rounded-[24px] p-xl flex flex-col justify-center border border-outline-variant/30">
        <div className="mb-md">
        <span className="material-symbols-outlined text-primary text-[48px]" data-icon="menu_book">menu_book</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-primary mb-xs">Learn the Details</h3>
        <p className="text-body-sm text-on-surface-variant mb-md">Read our policy guidelines to understand exactly how we calculate payouts.</p>
        <a className="text-primary font-bold flex items-center gap-xs hover:gap-md transition-all" href="#">
                                Read Guidelines <span className="material-symbols-outlined">arrow_forward</span>
        </a>
        </div>
        </div>
        </section>
        </main>
        <Footer />
      </>
    </FigmaPage>
  );
}
