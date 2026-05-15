import { Router, Request, Response, NextFunction } from "express";
import { sorobanService } from "../services/soroban.service";
import { keeperService } from "../services/keeper.service";
import { ApiResponse } from "../types";

const router = Router();

/**
 * GET /api/pools/stats
 * Get aggregate pool statistics from on-chain data.
 */
router.get(
  "/stats",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [totals, memberCount] = await Promise.all([
        sorobanService.getProtocolPoolTotals(),
        sorobanService.getPoolMemberCount(),
      ]);

      const response: ApiResponse<{
        totalDeposits: string;
        memberCount: number;
        totalPaidClaimAmount: string;
        totalBalanceAllPools: string;
        totalApprovedClaimAmount: string;
        activePoolCount: number;
        totalClaimsSubmitted: number;
      }> = {
        success: true,
        data: {
          totalDeposits: totals.totalBalanceAllPools.toString(),
          memberCount,
          totalPaidClaimAmount: totals.totalPaidClaimAmount.toString(),
          totalBalanceAllPools: totals.totalBalanceAllPools.toString(),
          totalApprovedClaimAmount: totals.totalApprovedClaimAmount.toString(),
          activePoolCount: totals.activePoolCount,
          totalClaimsSubmitted: totals.totalClaimsSubmitted,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/pools/member/:address
 * Check if an address is a pool member and get their balance.
 */
router.get(
  "/member/:address",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = Array.isArray(req.params.address)
        ? req.params.address[0]
        : req.params.address;
      const isMember = await sorobanService.isPoolMember(address);

      res.json({
        success: true,
        data: { address, isMember },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/pools/keeper/logs
 * Get recent keeper service execution logs.
 */
router.get("/keeper/logs", (_req: Request, res: Response) => {
  const logs = keeperService.getRecentLogs(50);

  res.json({
    success: true,
    data: { logs, count: logs.length },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/pools/keeper/trigger
 * Manually trigger a keeper cycle (admin/debug).
 */
router.post(
  "/keeper/trigger",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await keeperService.runCycle();

      res.json({
        success: true,
        data: { message: "Keeper cycle triggered" },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
