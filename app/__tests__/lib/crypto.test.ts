import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/crypto";

describe("encryptApiKey / decryptApiKey", () => {
  it("round-trips a simple API key", () => {
    const original = "sk-test-1234567890";
    const encrypted = encryptApiKey(original);
    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe(original);
  });

  it("encrypting an empty string produces ciphertext that fails validation", () => {
    // AES-GCM with empty plaintext produces empty encrypted portion,
    // which triggers the format validation in decryptApiKey
    const encrypted = encryptApiKey("");
    const parts = encrypted.split(":");
    expect(parts[2]).toBe(""); // empty encrypted data
    expect(() => decryptApiKey(encrypted)).toThrow("Invalid ciphertext format");
  });

  it("round-trips a long key with special characters", () => {
    const original = "sk-proj_abc123!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const encrypted = encryptApiKey(original);
    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe(original);
  });

  it("round-trips unicode content", () => {
    const original = "密钥-测试-key-2024";
    const encrypted = encryptApiKey(original);
    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const original = "sk-same-key";
    const enc1 = encryptApiKey(original);
    const enc2 = encryptApiKey(original);
    expect(enc1).not.toBe(enc2);
    // Both should still decrypt to the same value
    expect(decryptApiKey(enc1)).toBe(original);
    expect(decryptApiKey(enc2)).toBe(original);
  });

  it("ciphertext has expected format (iv:authTag:data)", () => {
    const encrypted = encryptApiKey("test");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Encrypted data is non-empty
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("throws on invalid ciphertext format", () => {
    expect(() => decryptApiKey("invalid")).toThrow("Invalid ciphertext format");
    expect(() => decryptApiKey("a:b")).toThrow("Invalid ciphertext format");
  });

  it("throws on tampered ciphertext (authentication failure)", () => {
    const encrypted = encryptApiKey("real-key");
    const parts = encrypted.split(":");
    // Tamper with the encrypted data
    const tampered = parts[0] + ":" + parts[1] + ":ff" + parts[2].slice(2);
    expect(() => decryptApiKey(tampered)).toThrow();
  });
});

describe("maskApiKey", () => {
  it("masks a normal length key", () => {
    const result = maskApiKey("sk-1234567890abcdef");
    expect(result).toBe("sk-123****cdef");
  });

  it("returns **** for short keys (8 chars or less)", () => {
    expect(maskApiKey("12345678")).toBe("****");
    expect(maskApiKey("short")).toBe("****");
    expect(maskApiKey("")).toBe("****");
  });

  it("shows first 6 and last 4 chars for longer keys", () => {
    const result = maskApiKey("abcdefghij");
    expect(result).toBe("abcdef****ghij");
  });

  it("handles exactly 9 character key (boundary)", () => {
    const result = maskApiKey("123456789");
    expect(result).toBe("123456****6789");
  });
});
