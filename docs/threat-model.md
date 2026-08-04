# Threat model

This document is descriptive, not marketing. It states what the goPrivate protocol and reference implementations aim to protect against — and what they do not.

## We protect against

| Threat                                   | Notes                                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Curious relay operators (post-handshake) | Chat payloads are AES-GCM ciphertext; the relay forwards opaque packets                                    |
| Server compromise of the relay store     | No durable message database; sessions are in-memory and short-lived                                        |
| Cloud providers hosting the relay        | Same as above for message content after handshake; operators still see metadata (IPs, timing, session ids) |
| Network interception of ciphertext       | TLS/`wss` plus application-layer encryption after ECDH                                                     |
| Long-term message storage on the server  | Design forbids server-side history                                                                         |

## We do NOT protect against

| Threat                                      | Notes                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Malware on the endpoint                     | Compromised device can read plaintext                                                       |
| Screen recording / screenshots              | OS-level capture is out of scope                                                            |
| Compromised browsers                        | Extensions or modified browsers can exfiltrate keys or plaintext                            |
| Malicious browser extensions                | Same as above                                                                               |
| Shoulder surfing                            | PIN pad and on-screen text are visible                                                      |
| Malicious relay during key exchange (TOFU)  | Public keys are exchanged before a shared secret exists; an active MITM relay can swap keys |
| Offline brute-force of a 4-digit reveal PIN | Small PIN space; mitigated by PBKDF2 cost and session lifetime, not eliminated              |

## Honest summary

Trust the share link and, for handshake integrity, an honest relay (or your own self-hosted relay). After both peers complete ECDH, a passive relay cannot read chat text. Device PIN protects masked local history during the session; it is not a substitute for endpoint security.

Related: [Architecture overview](./architecture/overview.md), [Handshake](./protocol/handshake.md).
