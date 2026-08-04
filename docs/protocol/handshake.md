# Handshake

## Goal

Establish a shared AES-GCM key between exactly two peers without giving the relay the plaintext of later chat messages.

## Mechanism (reference)

1. Both peers generate ECDH P-256 key pairs (Web Crypto in the reference client)
2. After `PARTNER_JOINED` (or equivalent readiness), each peer sends a `SEND_MESSAGE` whose `encryptedPayload` is **JSON** describing a public-key handshake (`AppMessageKind.PUBLIC_KEY`) — not yet AES ciphertext
3. Each peer imports the other’s public key, derives a shared secret, and switches to AES-GCM for chat payloads (`AppMessageKind.CHAT`)

## TOFU limitation

Public keys travel as readable JSON inside the relay envelope **before** a shared secret exists. A **malicious relay** can perform an active MITM during this window.

Mitigations under consideration for future RFCs (not required by the current MVP): authenticated out-of-band verification, relay pinning, or alternative handshake designs.

See [Threat model](../threat-model.md).
