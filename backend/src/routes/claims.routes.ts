import { Router, Request, Response, NextFunction } from "express";
import { claimVerificationService } from "../services/claim-verification.service";
import { fraudDetectionService } from "../services/fraud-detection.service";
import { notificationService } from "../services/notification.service";
import { sorobanService } from "../services/soroban.service";
import { authMiddleware } from "../middleware/auth.middleware";
import { x402PaymentGate } from "../middleware/x402.middleware";
import { createHttpError } from "../middleware/error.middleware";
import { ApiResponse, VerificationReport, FraudReport } from "../types";

const router = Router();

/**
 * POST /api/claims/precheck
 * Pre-submission validation — checks membership, active status, evidence CID.
 * Body: { poolAddress, amount, evidenceCid }
 */
router.post(
  "/precheck",
  authMiddleware,
  x402PaymentGate({
    amount: "0.01",
    asset: "USDC",
    description: "Anti-spam fee for claim submission",
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { poolAddress, amount, evidenceCid } = req.body;
      const claimantAddress = req.stellarAddress!;

      if (!poolAddress || !amount || !evidenceCid) {
        throw createHttpError(400, "Missing required fields: poolAddress, amount, evidenceCid");
      }

      const preCheck = await claimVerificationService.preSubmissionCheck(
        poolAddress,
        claimantAddress,
        BigInt(amount),
        evidenceCid,
      );

      if (!preCheck.valid) {
        res.status(400).json({
          success: false,
          data: { errors: preCheck.errors },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const fraudReport = await fraudDetectionService.analyzeClaim(
        poolAddress,
        -1,
        claimantAddress,
        BigInt(amount),
      );

      notificationService.notifyClaimSubmitted(claimantAddress, -1);

      const response: ApiResponse<{ preCheck: typeof preCheck; fraudReport: FraudReport }> = {
        success: true,
        data: { preCheck, fraudReport },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/claims/:poolAddress/:id
 * Get a single claim from a specific pool.
 */
router.get("/:poolAddress/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const poolAddress = Array.isArray(req.params.poolAddress) ? req.params.poolAddress[0] : req.params.poolAddress;
    const claimId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(claimId)) throw createHttpError(400, "Invalid claim ID");

    const claim = await sorobanService.getPoolClaim(poolAddress, claimId);
    if (!claim) throw createHttpError(404, `Claim #${claimId} not found in pool ${poolAddress}`);

    res.json({
      success: true,
      data: { ...claim, amount: claim.amount.toString() },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/claims/:poolAddress/:id/verify
 * Run verification on a specific claim — x402 gated.
 */
router.get(
  "/:poolAddress/:id/verify",
  x402PaymentGate({ amount: "0.001", asset: "USDC", description: "Claim verification report fee" }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const poolAddress = Array.isArray(req.params.poolAddress) ? req.params.poolAddress[0] : req.params.poolAddress;
      const claimId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      if (isNaN(claimId)) throw createHttpError(400, "Invalid claim ID");

      const report = await claimVerificationService.verifyClaim(poolAddress, claimId);

      const response: ApiResponse<VerificationReport> = {
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/claims/:poolAddress/:id/fraud-report
 * Run fraud analysis on a specific claim.
 */
router.get(
  "/:poolAddress/:id/fraud-report",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const poolAddress = Array.isArray(req.params.poolAddress) ? req.params.poolAddress[0] : req.params.poolAddress;
      const claimId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      if (isNaN(claimId)) throw createHttpError(400, "Invalid claim ID");

      const claim = await sorobanService.getPoolClaim(poolAddress, claimId);
      if (!claim) throw createHttpError(404, `Claim #${claimId} not found`);

      const report = await fraudDetectionService.analyzeClaim(poolAddress, claimId, claim.claimant, claim.amount);

      const response: ApiResponse<FraudReport> = {
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
