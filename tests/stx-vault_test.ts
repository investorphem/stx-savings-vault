import { describe, expect, it, beforeEach } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const user1 = accounts.get("wallet_1")!;
const user2 = accounts.get("wallet_2")!;
const user3 = accounts.get("wallet_3")!;

describe("STX Savings Vault Contract", () => {
  beforeEach(() => {
    // Reset contract state for each test
    // Note: In Clarinet, state is automatically reset between tests
  });

  describe("Deposit Functionality", () => {
    it("should allow users to deposit STX with a valid lock period", () => {
      const depositAmount = 1000000; // 1 STX in microSTX
      const lockBlocks = 100;

      const { result } = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [depositAmount, lockBlocks],
        user1
      );

      expect(result).toBeOk(true);

      // Verify the deposit was recorded
      const unlockBlock = simnet.blockHeight + lockBlocks;
      const depositKey = { owner: user1, "unlock-block": unlockBlock };
      const storedDeposit = simnet.getMapEntry("stx-vault", "deposits", depositKey);

      expect(storedDeposit).toEqual({ amount: depositAmount });
    });

    it("should reject deposits with zero lock period", () => {
      const depositAmount = 1000000;
      const lockBlocks = 0; // Invalid - zero lock period

      const { result } = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [depositAmount, lockBlocks],
        user1
      );

      expect(result).toBeErr(103); // err-lock-period-not-met or similar
    });

    it("should handle multiple deposits from the same user with different lock periods", () => {
      const deposit1 = { amount: 500000, lockBlocks: 50 };
      const deposit2 = { amount: 750000, lockBlocks: 100 };

      // First deposit
      const result1 = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [deposit1.amount, deposit1.lockBlocks],
        user1
      );
      expect(result1.result).toBeOk(true);

      // Second deposit
      const result2 = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [deposit2.amount, deposit2.lockBlocks],
        user1
      );
      expect(result2.result).toBeOk(true);

      // Verify both deposits are stored
      const unlockBlock1 = simnet.blockHeight + deposit1.lockBlocks;
      const unlockBlock2 = simnet.blockHeight + deposit2.lockBlocks;

      const deposit1Key = { owner: user1, "unlock-block": unlockBlock1 };
      const deposit2Key = { owner: user1, "unlock-block": unlockBlock2 };

      const storedDeposit1 = simnet.getMapEntry("stx-vault", "deposits", deposit1Key);
      const storedDeposit2 = simnet.getMapEntry("stx-vault", "deposits", deposit2Key);

      expect(storedDeposit1).toEqual({ amount: deposit1.amount });
      expect(storedDeposit2).toEqual({ amount: deposit2.amount });
    });

    it("should handle deposits from multiple users", () => {
      const depositAmount = 1000000;
      const lockBlocks = 50;

      // User 1 deposits
      const result1 = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [depositAmount, lockBlocks],
        user1
      );
      expect(result1.result).toBeOk(true);

      // User 2 deposits
      const result2 = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [depositAmount, lockBlocks],
        user2
      );
      expect(result2.result).toBeOk(true);

      // User 3 deposits
      const result3 = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [depositAmount, lockBlocks],
        user3
      );
      expect(result3.result).toBeOk(true);

      // Verify all deposits are stored separately
      const unlockBlock = simnet.blockHeight + lockBlocks;

      const deposits = [
        simnet.getMapEntry("stx-vault", "deposits", { owner: user1, "unlock-block": unlockBlock }),
        simnet.getMapEntry("stx-vault", "deposits", { owner: user2, "unlock-block": unlockBlock }),
        simnet.getMapEntry("stx-vault", "deposits", { owner: user3, "unlock-block": unlockBlock })
      ];

      deposits.forEach(deposit => {
        expect(deposit).toEqual({ amount: depositAmount });
      });
    });

    it("should handle very large deposit amounts", () => {
      const largeAmount = 1000000000000; // 1 million STX
      const lockBlocks = 1000;

      const { result } = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [largeAmount, lockBlocks],
        user1
      );

      expect(result).toBeOk(true);

      const unlockBlock = simnet.blockHeight + lockBlocks;
      const depositKey = { owner: user1, "unlock-block": unlockBlock };
      const storedDeposit = simnet.getMapEntry("stx-vault", "deposits", depositKey);

      expect(storedDeposit).toEqual({ amount: largeAmount });
    });

    it("should handle minimum deposit amounts", () => {
      const minAmount = 1; // Minimum possible amount
      const lockBlocks = 10;

      const { result } = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [minAmount, lockBlocks],
        user1
      );

      expect(result).toBeOk(true);

      const unlockBlock = simnet.blockHeight + lockBlocks;
      const depositKey = { owner: user1, "unlock-block": unlockBlock };
      const storedDeposit = simnet.getMapEntry("stx-vault", "deposits", depositKey);

      expect(storedDeposit).toEqual({ amount: minAmount });
    });
  });

  describe("Withdrawal Functionality", () => {
    beforeEach(() => {
      // Set up deposits for withdrawal tests
      simnet.callPublicFn("stx-vault", "deposit-stx", [1000000, 10], user1);
      simnet.callPublicFn("stx-vault", "deposit-stx", [500000, 5], user2);
    });

    it("should allow withdrawals after lock period expires", () => {
      // Advance blocks to after lock period
      const initialBlock = simnet.blockHeight;
      simnet.mineEmptyBlocks(11); // Lock period was 10 blocks

      const { result } = simnet.callPublicFn(
        "stx-vault",
        "withdraw-stx",
        [],
        user1
      );

      expect(result).toBeOk(true);

      // Verify deposit was removed
      const unlockBlock = initialBlock + 10;
      const depositKey = { owner: user1, "unlock-block": unlockBlock };
      const storedDeposit = simnet.getMapEntry("stx-vault", "deposits", depositKey);

      expect(storedDeposit).toBeNull(); // Should be deleted after withdrawal
    });

    it("should reject withdrawals before lock period expires", () => {
      // Try to withdraw immediately (before lock period)
      const { result } = simnet.callPublicFn(
        "stx-vault",
        "withdraw-stx",
        [],
        user1
      );

      expect(result).toBeErr(101); // err-lock-period-not-met
    });

    it("should reject withdrawals for users with no deposits", () => {
      // Try to withdraw as user3 who has no deposits
      const { result } = simnet.callPublicFn(
        "stx-vault",
        "withdraw-stx",
        [],
        user3
      );

      expect(result).toBeErr(102); // err-no-deposit-found
    });

    it("should handle multiple withdrawals from the same user with different lock periods", () => {
      // User1 has two deposits with different lock periods
      simnet.callPublicFn("stx-vault", "deposit-stx", [200000, 20], user1);

      const initialBlock = simnet.blockHeight;

      // Advance past first lock period but not second
      simnet.mineEmptyBlocks(15);

      // Should be able to withdraw first deposit
      const result1 = simnet.callPublicFn("stx-vault", "withdraw-stx", [], user1);
      expect(result1.result).toBeOk(true);

      // First deposit should be gone
      const unlockBlock1 = initialBlock + 10;
      const depositKey1 = { owner: user1, "unlock-block": unlockBlock1 };
      const storedDeposit1 = simnet.getMapEntry("stx-vault", "deposits", depositKey1);
      expect(storedDeposit1).toBeNull();

      // Second deposit should still exist
      const unlockBlock2 = initialBlock + 20;
      const depositKey2 = { owner: user1, "unlock-block": unlockBlock2 };
      const storedDeposit2 = simnet.getMapEntry("stx-vault", "deposits", depositKey2);
      expect(storedDeposit2).toEqual({ amount: 200000 });

      // Advance past second lock period
      simnet.mineEmptyBlocks(10);

      // Should be able to withdraw second deposit
      const result2 = simnet.callPublicFn("stx-vault", "withdraw-stx", [], user1);
      expect(result2.result).toBeOk(true);

      // Second deposit should now be gone
      const storedDeposit2After = simnet.getMapEntry("stx-vault", "deposits", depositKey2);
      expect(storedDeposit2After).toBeNull();
    });

    it("should handle withdrawals at exact lock expiration block", () => {
      const initialBlock = simnet.blockHeight;
      const lockBlocks = 10;

      // Advance to exact expiration block
      simnet.mineEmptyBlocks(lockBlocks);

      const { result } = simnet.callPublicFn(
        "stx-vault",
        "withdraw-stx",
        [],
        user1
      );

      expect(result).toBeOk(true);

      // Verify deposit was removed
      const unlockBlock = initialBlock + lockBlocks;
      const depositKey = { owner: user1, "unlock-block": unlockBlock };
      const storedDeposit = simnet.getMapEntry("stx-vault", "deposits", depositKey);

      expect(storedDeposit).toBeNull();
    });
  });

  describe("Multi-User Scenarios", () => {
    it("should handle complex multi-user deposit and withdrawal patterns", () => {
      const users = [user1, user2, user3];
      const deposits = [
        { amount: 1000000, lockBlocks: 5 },
        { amount: 2000000, lockBlocks: 10 },
        { amount: 500000, lockBlocks: 15 }
      ];

      // All users make deposits
      users.forEach((user, index) => {
        const { result } = simnet.callPublicFn(
          "stx-vault",
          "deposit-stx",
          [deposits[index].amount, deposits[index].lockBlocks],
          user
        );
        expect(result).toBeOk(true);
      });

      const initialBlock = simnet.blockHeight;

      // Advance past first lock period
      simnet.mineEmptyBlocks(6);

      // First user can withdraw
      const withdraw1 = simnet.callPublicFn("stx-vault", "withdraw-stx", [], users[0]);
      expect(withdraw1.result).toBeOk(true);

      // Others cannot yet withdraw
      const withdraw2 = simnet.callPublicFn("stx-vault", "withdraw-stx", [], users[1]);
      expect(withdraw2.result).toBeErr(101); // Lock period not met

      const withdraw3 = simnet.callPublicFn("stx-vault", "withdraw-stx", [], users[2]);
      expect(withdraw3.result).toBeErr(101); // Lock period not met

      // Advance past second lock period
      simnet.mineEmptyBlocks(6);

      // Second user can now withdraw
      const withdraw2Again = simnet.callPublicFn("stx-vault", "withdraw-stx", [], users[1]);
      expect(withdraw2Again.result).toBeOk(true);

      // Third user still cannot
      const withdraw3Again = simnet.callPublicFn("stx-vault", "withdraw-stx", [], users[2]);
      expect(withdraw3Again.result).toBeErr(101);

      // Advance past third lock period
      simnet.mineEmptyBlocks(10);

      // Third user can now withdraw
      const withdraw3Final = simnet.callPublicFn("stx-vault", "withdraw-stx", [], users[2]);
      expect(withdraw3Final.result).toBeOk(true);
    });

    it("should maintain isolation between user deposits", () => {
      // User1 deposits
      simnet.callPublicFn("stx-vault", "deposit-stx", [1000000, 10], user1);

      // User2 deposits with same amount and lock period
      simnet.callPublicFn("stx-vault", "deposit-stx", [1000000, 10], user2);

      const unlockBlock = simnet.blockHeight + 10;

      // Verify both deposits exist separately
      const deposit1 = simnet.getMapEntry("stx-vault", "deposits", { owner: user1, "unlock-block": unlockBlock });
      const deposit2 = simnet.getMapEntry("stx-vault", "deposits", { owner: user2, "unlock-block": unlockBlock });

      expect(deposit1).toEqual({ amount: 1000000 });
      expect(deposit2).toEqual({ amount: 1000000 });

      // Advance to unlock time
      simnet.mineEmptyBlocks(11);

      // User1 withdraws
      simnet.callPublicFn("stx-vault", "withdraw-stx", [], user1);

      // User1's deposit should be gone, User2's should remain
      const deposit1After = simnet.getMapEntry("stx-vault", "deposits", { owner: user1, "unlock-block": unlockBlock });
      const deposit2After = simnet.getMapEntry("stx-vault", "deposits", { owner: user2, "unlock-block": unlockBlock });

      expect(deposit1After).toBeNull();
      expect(deposit2After).toEqual({ amount: 1000000 });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle very short lock periods", () => {
      const { result } = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [500000, 1], // 1 block lock
        user1
      );

      expect(result).toBeOk(true);

      // Advance 1 block
      simnet.mineEmptyBlocks(2);

      // Should be able to withdraw immediately
      const withdrawResult = simnet.callPublicFn("stx-vault", "withdraw-stx", [], user1);
      expect(withdrawResult.result).toBeOk(true);
    });

    it("should handle very long lock periods", () => {
      const longLock = 10000; // Very long lock period
      const { result } = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [1000000, longLock],
        user1
      );

      expect(result).toBeOk(true);

      // Verify unlock block is set correctly
      const unlockBlock = simnet.blockHeight + longLock;
      const depositKey = { owner: user1, "unlock-block": unlockBlock };
      const storedDeposit = simnet.getMapEntry("stx-vault", "deposits", depositKey);

      expect(storedDeposit).toEqual({ amount: 1000000 });
    });

    it("should handle maximum possible lock periods", () => {
      const maxLock = 4294967295; // uint max
      const { result } = simnet.callPublicFn(
        "stx-vault",
        "deposit-stx",
        [1000000, maxLock],
        user1
      );

      expect(result).toBeOk(true);
    });

    it("should handle concurrent deposits at the same block", () => {
      // Multiple deposits in the same block (simulated)
      const deposits = [
        simnet.callPublicFn("stx-vault", "deposit-stx", [100000, 10], user1),
        simnet.callPublicFn("stx-vault", "deposit-stx", [200000, 10], user2),
        simnet.callPublicFn("stx-vault", "deposit-stx", [300000, 10], user3)
      ];

      deposits.forEach(deposit => {
        expect(deposit.result).toBeOk(true);
      });

      // Verify all deposits are stored
      const unlockBlock = simnet.blockHeight + 10;
      const storedDeposits = [
        simnet.getMapEntry("stx-vault", "deposits", { owner: user1, "unlock-block": unlockBlock }),
        simnet.getMapEntry("stx-vault", "deposits", { owner: user2, "unlock-block": unlockBlock }),
        simnet.getMapEntry("stx-vault", "deposits", { owner: user3, "unlock-block": unlockBlock })
      ];

      expect(storedDeposits[0]).toEqual({ amount: 100000 });
      expect(storedDeposits[1]).toEqual({ amount: 200000 });
      expect(storedDeposits[2]).toEqual({ amount: 300000 });
    });

    it("should validate error codes correctly", () => {
      // Test ERR_NOT_OWNER (though not easily triggered in this contract)
      // Test ERR_LOCK_PERIOD_NOT_MET
      simnet.callPublicFn("stx-vault", "deposit-stx", [1000000, 10], user1);
      const earlyWithdraw = simnet.callPublicFn("stx-vault", "withdraw-stx", [], user1);
      expect(earlyWithdraw.result).toBeErr(101);

      // Test ERR_NO_DEPOSIT_FOUND
      const noDepositWithdraw = simnet.callPublicFn("stx-vault", "withdraw-stx", [], user3);
      expect(noDepositWithdraw.result).toBeErr(102);

      // Test lock period validation (ERR from assert!)
      const zeroLockDeposit = simnet.callPublicFn("stx-vault", "deposit-stx", [1000000, 0], user1);
      expect(zeroLockDeposit.result).toBeErr(103);
    });
  });

  describe("State Persistence and Data Integrity", () => {
    it("should maintain state across multiple operations", () => {
      // Complex sequence of operations
      const operations = [
        () => simnet.callPublicFn("stx-vault", "deposit-stx", [1000000, 5], user1),
        () => simnet.callPublicFn("stx-vault", "deposit-stx", [500000, 10], user2),
        () => simnet.mineEmptyBlocks(6),
        () => simnet.callPublicFn("stx-vault", "withdraw-stx", [], user1),
        () => simnet.callPublicFn("stx-vault", "deposit-stx", [750000, 15], user3),
        () => simnet.mineEmptyBlocks(10),
        () => simnet.callPublicFn("stx-vault", "withdraw-stx", [], user2)
      ];

      // Execute all operations
      operations.forEach(op => op());

      // Verify final state
      const unlockBlock3 = simnet.blockHeight + 15 - 16; // Account for blocks mined
      const deposit3 = simnet.getMapEntry("stx-vault", "deposits", { owner: user3, "unlock-block": unlockBlock3 });

      expect(deposit3).toEqual({ amount: 750000 });

      // Users 1 and 2 should have no deposits left
      // (This is a simplified check - in practice we'd need to calculate exact block heights)
    });

    it("should handle contract owner functionality", () => {
      // Test that contract owner is set correctly
      const ownerVar = simnet.getDataVar("stx-vault", "contract-owner");
      expect(ownerVar).toBe(deployer);
    });

    it("should properly handle fungible token transfers", () => {
      const initialBalance = simnet.getAssetsMap().get(`${deployer}.stx-vault::stx-token`)?.get(user1) || 0;

      simnet.callPublicFn("stx-vault", "deposit-stx", [500000, 5], user1);

      // Contract should now hold the tokens
      const contractBalance = simnet.getAssetsMap().get(`${deployer}.stx-vault::stx-token`)?.get(`${deployer}.stx-vault`) || 0;
      expect(contractBalance).toBe(500000);

      // User balance should be reduced
      const userBalance = simnet.getAssetsMap().get(`${deployer}.stx-vault::stx-token`)?.get(user1) || 0;
      expect(userBalance).toBe(initialBalance - 500000);
    });
  });

  describe("Performance and Scalability Testing", () => {
    it("should handle multiple deposits efficiently", () => {
      const numDeposits = 20;
      const baseAmount = 100000;

      // Create multiple deposits
      for (let i = 0; i < numDeposits; i++) {
        const { result } = simnet.callPublicFn(
          "stx-vault",
          "deposit-stx",
          [baseAmount + i * 10000, 10 + i],
          user1
        );
        expect(result).toBeOk(true);
      }

      // Verify all deposits are stored correctly
      for (let i = 0; i < numDeposits; i++) {
        const unlockBlock = simnet.blockHeight + 10 + i;
        const depositKey = { owner: user1, "unlock-block": unlockBlock };
        const storedDeposit = simnet.getMapEntry("stx-vault", "deposits", depositKey);

        expect(storedDeposit).toEqual({ amount: baseAmount + i * 10000 });
      }
    });

    it("should handle multiple users with varying lock periods", () => {
      const users = [user1, user2, user3];
      const lockPeriods = [5, 15, 25];

      // Each user deposits with different lock period
      users.forEach((user, index) => {
        const { result } = simnet.callPublicFn(
          "stx-vault",
          "deposit-stx",
          [1000000, lockPeriods[index]],
          user
        );
        expect(result).toBeOk(true);
      });

      const initialBlock = simnet.blockHeight;

      // Test withdrawals at different times
      const testPoints = [
        { blocksToAdvance: 6, canWithdraw: [true, false, false] },
        { blocksToAdvance: 11, canWithdraw: [true, true, false] },
        { blocksToAdvance: 16, canWithdraw: [true, true, true] }
      ];

      testPoints.forEach(testPoint => {
        simnet.mineEmptyBlocks(testPoint.blocksToAdvance);

        users.forEach((user, index) => {
          const { result } = simnet.callPublicFn("stx-vault", "withdraw-stx", [], user);

          if (testPoint.canWithdraw[index]) {
            expect(result).toBeOk(true);
          } else {
            expect(result).toBeErr(101); // Lock period not met
          }
        });
      });
    });
  });
});
