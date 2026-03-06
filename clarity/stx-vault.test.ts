import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;

// Helper to deposit STX into the vault
function depositSTX(amount: number, lockBlocks: number, user: string) {
  return simnet.callPublicFn(
    "stx-vault",
    "deposit-stx",
    [Cl.uint(amount), Cl.uint(lockBlocks)],
    user
  );
}

// Helper to withdraw STX from the vault
function withdrawSTX(user: string) {
  return simnet.callPublicFn(
    "stx-vault",
    "withdraw-stx",
    [],
    user
  );
}

// Helper to fetch user deposit from the vault map
function getUserDeposit(user: string) {
  return simnet.getMapEntry(
    "stx-vault",
    "deposits",
    Cl.tuple({ owner: Cl.principal(user), unlock_block: Cl.uint(0) }) // unlock_block placeholder; actual test will replace
  );
}

describe("STX Vault Tests", () => {
  it("allows a user to deposit STX with a lock period", () => {
    const { result, events } = depositSTX(1000, 10, alice);
    expect(result).toBeOk(Cl.bool(true));
    expect(events.length).toBe(1); // ft_transfer_event
  });

  it("does not allow deposit with zero lock period", () => {
    const { result } = depositSTX(1000, 0, alice);
    expect(result).toBeErr(Cl.uint(103)); // err-lock-period-not-met
  });

  it("allows user to withdraw after lock period", () => {
    depositSTX(500, 0, bob); // instant unlock for testing

    const { result, events } = withdrawSTX(bob);
    expect(result).toBeOk(Cl.bool(true));
    expect(events.length).toBe(1); // ft_transfer_event
  });

  it("does not allow withdrawal before lock period ends", () => {
    depositSTX(500, 100, alice);

    const { result } = withdrawSTX(alice);
    expect(result).toBeErr(Cl.uint(101)); // err-lock-period-not-met
  });

  it("does not allow withdrawal if no deposit exists", () => {
    const { result } = withdrawSTX(bob);
    expect(result).toBeErr(Cl.uint(102)); // err-no-deposit-found
  });

  it("stores deposit correctly in the map", () => {
    depositSTX(1000, 10, alice);
    const depositEntry = simnet.getMapEntries("stx-vault", "deposits");
    expect(depositEntry.length).toBeGreaterThan(0);

    const stored = depositEntry.find((e: any) => e.key.owner === alice);
    expect(stored.value.amount).toBe(1000);
    expect(stored.value.unlock_block).toBeGreaterThan(0);
  });
});
