import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Notification, NotificationType } from '../types';
import path from 'path';
import fs from 'fs';

const CTX = 'NotificationService';

export class NotificationService {
  private db: Database.Database;

  constructor() {
    const dbDir = path.dirname(config.sqlite.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new Database(config.sqlite.dbPath);
    this.initializeTable();
  }

  private initializeTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        recipient_address TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient
        ON notifications(recipient_address);
      CREATE INDEX IF NOT EXISTS idx_notifications_read
        ON notifications(recipient_address, read);
    `);
    logger.info(CTX, 'Notifications table initialized');
  }

  create(
    recipientAddress: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ): Notification {
    const notification: Notification = {
      id: uuidv4(),
      recipientAddress,
      type,
      title,
      message,
      metadata,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      INSERT INTO notifications (id, recipient_address, type, title, message, metadata, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `);
    stmt.run(
      notification.id,
      notification.recipientAddress,
      notification.type,
      notification.title,
      notification.message,
      JSON.stringify(notification.metadata),
      notification.createdAt
    );

    logger.debug(CTX, `Notification created for ${recipientAddress.slice(0, 8)}...`, { type, title });
    return notification;
  }

  getByRecipient(recipientAddress: string, limit = 50, unreadOnly = false): Notification[] {
    const query = unreadOnly
      ? `SELECT * FROM notifications WHERE recipient_address = ? AND read = 0 ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM notifications WHERE recipient_address = ? ORDER BY created_at DESC LIMIT ?`;

    const rows = this.db.prepare(query).all(recipientAddress, limit) as Array<{
      id: string; recipient_address: string; type: string; title: string;
      message: string; metadata: string; read: number; created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      recipientAddress: row.recipient_address,
      type: row.type as NotificationType,
      title: row.title,
      message: row.message,
      metadata: JSON.parse(row.metadata),
      read: row.read === 1,
      createdAt: row.created_at,
    }));
  }

  markAsRead(notificationId: string): boolean {
    const result = this.db.prepare(`UPDATE notifications SET read = 1 WHERE id = ?`).run(notificationId);
    return result.changes > 0;
  }

  markAllAsRead(recipientAddress: string): number {
    const result = this.db.prepare(
      `UPDATE notifications SET read = 1 WHERE recipient_address = ? AND read = 0`
    ).run(recipientAddress);
    return result.changes;
  }

  getUnreadCount(recipientAddress: string): number {
    const row = this.db.prepare(
      `SELECT COUNT(*) as count FROM notifications WHERE recipient_address = ? AND read = 0`
    ).get(recipientAddress) as { count: number };
    return row.count;
  }

  delete(notificationId: string): boolean {
    const result = this.db.prepare(`DELETE FROM notifications WHERE id = ?`).run(notificationId);
    return result.changes > 0;
  }

  // Convenience methods for common notification types

  notifyContributionReminder(recipientAddress: string, poolName: string, amount: string, cycle: number): Notification {
    return this.create(recipientAddress, 'contribution_reminder',
      'Monthly Contribution Due',
      `Your monthly contribution of ${amount} USDC to "${poolName}" is due for cycle #${cycle}.`,
      { poolName, amount, cycle }
    );
  }

  notifyClaimSubmitted(recipientAddress: string, claimId: number): Notification {
    return this.create(recipientAddress, 'claim_submitted',
      'Claim Submitted Successfully',
      `Your claim #${claimId} has been submitted and is awaiting peer review.`,
      { claimId }
    );
  }

  notifyClaimStatusUpdate(recipientAddress: string, claimId: number, newStatus: string): Notification {
    return this.create(recipientAddress, 'claim_status_update',
      `Claim #${claimId} Status Update`,
      `Your claim has been updated to: ${newStatus}`,
      { claimId, newStatus }
    );
  }

  notifyVoteRequest(recipientAddress: string, claimId: number, poolAddress: string): Notification {
    return this.create(recipientAddress, 'vote_request',
      'Claim Review Required',
      `You have been selected to review claim #${claimId}. Cast your vote before the deadline.`,
      { claimId, poolAddress }
    );
  }

  notifyPayoutConfirmation(recipientAddress: string, claimId: number, amount: string): Notification {
    return this.create(recipientAddress, 'payout_confirmation',
      'Payout Received!',
      `Your claim #${claimId} payout of ${amount} has been disbursed to your wallet.`,
      { claimId, amount }
    );
  }

  notifyFraudAlert(recipientAddress: string, claimId: number, riskLevel: string): Notification {
    return this.create(recipientAddress, 'fraud_alert',
      'Fraud Alert — Review Required',
      `Claim #${claimId} has been flagged with a ${riskLevel} risk level and requires review.`,
      { claimId, riskLevel }
    );
  }

  notifyPoolActivated(poolAddress: string, recipientAddress: string, poolName: string): Notification {
    return this.create(recipientAddress, 'pool_activated',
      'Pool Activated!',
      `"${poolName}" has reached the minimum members and is now Active. Your 60-day waiting period has begun.`,
      { poolAddress, poolName }
    );
  }

  notifySignerSelected(recipientAddress: string, poolAddress: string, poolName: string): Notification {
    return this.create(recipientAddress, 'signer_selected',
      'You are a Claim Reviewer',
      `You have been selected as a claim reviewer for "${poolName}". You can now vote on pending claims.`,
      { poolAddress, poolName }
    );
  }

  notifySignerRotation(poolAddress: string): void {
    logger.info(CTX, `Signer rotation completed for pool ${poolAddress.slice(0, 8)}`);
  }
}

export const notificationService = new NotificationService();
