# Project charter

## Why the project exists

goPrivate provides an **open protocol for ephemeral communication** and reference implementations so people can talk privately without accounts, cloud message stores, or durable server-side history.

## What success looks like

- Independent clients and relays implement the protocol
- Self-hosting remains easy and documented
- Threat model and protocol docs are honest and complete enough for external review
- The community can propose changes via RFCs without forking away from a shared standard

## Who the project serves

- People who need short-lived, private 1:1 conversations
- Operators who want to self-host a relay and/or client
- Developers building interoperable clients

## Problems we intentionally do NOT solve

- Long-term message archival or searchable history
- Identity, contacts, or social graphs
- Group chat (MVP / current protocol is 1:1)
- Protection against malware, compromised browsers, screenshots, or shoulder surfing
- Guaranteeing safety against a malicious relay during TOFU key exchange (documented limitation)

## How major decisions are made

See `governance/DECISION_PROCESS.md` (BDFL after public discussion; RFCs for protocol; ADRs for architecture).

## Long-term goals

Stabilize the protocol, invite security review, enable native clients and eventual federation, and keep the stack free and AGPL-licensed without a paid “enterprise” split.
