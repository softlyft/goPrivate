import { beforeEach, describe, expect, it } from 'vitest';
import { configureVaultForTests, messageVault, resetVaultTestConfig } from './vault.js';

describe('messageVault', () => {
  beforeEach(() => {
    messageVault.lock();
    configureVaultForTests({ iterations: 1_000 });
  });

  it('sets up, encrypts, and decrypts', async () => {
    const meta = await messageVault.setup('1234');
    expect(meta.salt).toBeTruthy();
    expect(meta.wrappedKey).toBeTruthy();
    expect(messageVault.isUnlocked).toBe(true);

    const cipher = await messageVault.encrypt('hello');
    expect(cipher).not.toContain('hello');
    expect(await messageVault.decrypt(cipher)).toBe('hello');
  });

  it('rejects invalid PIN shapes on setup', async () => {
    await expect(messageVault.setup('12')).rejects.toThrow(/4 digits/i);
  });

  it('unlocks with correct PIN and rejects wrong PIN', async () => {
    const meta = await messageVault.setup('4321');
    messageVault.lock();
    expect(messageVault.isUnlocked).toBe(false);

    expect(await messageVault.unlock('0000', meta)).toBe(false);
    expect(await messageVault.unlock('4321', meta)).toBe(true);
    expect(messageVault.isUnlocked).toBe(true);
  });

  it('verifies PIN without requiring unlock state change failure path', async () => {
    await messageVault.setup('9999');
    expect(await messageVault.verifyPin('9999')).toBe(true);
    expect(await messageVault.verifyPin('1111')).toBe(false);
  });

  it('locks after too many failed unlock attempts', async () => {
    const meta = await messageVault.setup('5555');
    messageVault.lock();
    for (let i = 0; i < 5; i++) {
      expect(await messageVault.unlock('0000', meta)).toBe(false);
    }
    await expect(messageVault.unlock('5555', meta)).rejects.toThrow(/too many attempts/i);
  });

  it('throws when encrypting while locked', async () => {
    await expect(messageVault.encrypt('x')).rejects.toThrow(/locked/i);
  });

  it('exposes meta helpers', async () => {
    expect(messageVault.hasVault).toBe(false);
    await messageVault.setup('7777');
    expect(messageVault.hasVault).toBe(true);
    expect(messageVault.getMeta()?.salt).toBeTruthy();
    resetVaultTestConfig();
  });
});
