import { Router, Request, Response, NextFunction } from "express";
import { sorobanService } from "../services/soroban.service";
import { keeperService } from "../services/keeper.service";
import { createHttpError } from "../middleware/error.middleware";

const router = Router();

/**
 * GET /api/pools
 * List all pools from the factory with their summaries.
 */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pools = await sorobanService.getAllFactoryPools();
    const withSummaries = await Promise.allSettled(
      pools.map(async (p) => ({
        ...p,
        summary: await sorobanService.getPoolSummary(p.address),
      }))
    );
    const data = withSummaries
      .filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer V> ? V : never> => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<unknown>).value);
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pools/stats
 * Protocol-wide aggregate statistics.
 */
router.get("/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await sorobanService.getProtocolStats();
    res.json({
      success: true,
      data: {
        ...stats,
        totalBalance: stats.totalBalance.toString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pools/:address
 * Get a single pool's summary.
 */
router.get("/:address", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
    const summary = await sorobanService.getPoolSummary(address);
    if (!summary) throw createHttpError(404, `Pool ${address} not found`);
    res.json({
      success: true,
      data: { ...summary, balance: summary.balance.toString(), fixedContribution: summary.fixedContribution.toString() },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pools/:address/claims
 * Get all claims for a pool.
 */
router.get("/:address/claims", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
    const claims = await sorobanService.getPoolAllClaims(address);
    const serialized = claims.map((c) => ({ ...c, amount: c.amount.toString() }));
    res.json({ success: true, data: serialized, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pools/:address/member/:memberAddress
 * Check membership and active status for an address in a specific pool.
 */
router.get("/:address/member/:memberAddress", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const poolAddress = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
    const memberAddress = Array.isArray(req.params.memberAddress) ? req.params.memberAddress[0] : req.params.memberAddress;
    const [isMember, isActive] = await Promise.all([
      sorobanService.isPoolMember(poolAddress, memberAddress),
      sorobanService.isPoolMemberActive(poolAddress, memberAddress),
    ]);
    res.json({
      success: true,
      data: { poolAddress, memberAddress, isMember, isActive },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pools/keeper/logs
 * Get recent keeper execution logs.
 */
router.get("/keeper/logs", (_req: Request, res: Response) => {
  const logs = keeperService.getRecentLogs(50);
  res.json({ success: true, data: { logs, count: logs.length }, timestamp: new Date().toISOString() });
});

/**
 * POST /api/pools/keeper/trigger
 * Manually trigger a keeper cycle.
 */
router.post("/keeper/trigger", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await keeperService.runCycle();
    res.json({ success: true, data: { message: "Keeper cycle triggered" }, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

export default router;
