/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/veilpay.json`.
 */
export type Veilpay = {
  "address": "6pYu5mRNehST4KkwUzcEKt47Km9qNAvmCtdRtTjEanDG",
  "metadata": {
    "name": "veilpay",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initBalance",
      "discriminator": [
        174,
        51,
        4,
        34,
        196,
        72,
        204,
        66
      ],
      "accounts": [
        {
          "name": "confidentialBalance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  108,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeMint",
      "discriminator": [
        209,
        42,
        195,
        4,
        129,
        85,
        209,
        44
      ],
      "accounts": [
        {
          "name": "veilpayMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "csplConfig",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        }
      ]
    },
    {
      "name": "privateTransfer",
      "discriminator": [
        107,
        20,
        177,
        94,
        33,
        119,
        16,
        110
      ],
      "accounts": [
        {
          "name": "senderBalance",
          "writable": true
        },
        {
          "name": "receiverBalance",
          "writable": true
        },
        {
          "name": "sender",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "encryptedAmount",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "expectedNonce",
          "type": "u64"
        },
        {
          "name": "commitmentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "encryptedTag",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "confidentialBalance",
      "discriminator": [
        42,
        231,
        174,
        201,
        132,
        195,
        163,
        181
      ]
    },
    {
      "name": "veilPayMint",
      "discriminator": [
        171,
        171,
        69,
        66,
        40,
        194,
        184,
        45
      ]
    }
  ],
  "events": [
    {
      "name": "balanceInitializedEvent",
      "discriminator": [
        72,
        141,
        0,
        110,
        54,
        69,
        241,
        45
      ]
    },
    {
      "name": "privateTransferEvent",
      "discriminator": [
        157,
        106,
        106,
        6,
        146,
        15,
        183,
        251
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorizedSender",
      "msg": "Unauthorized sender for this operation."
    },
    {
      "code": 6001,
      "name": "insufficientBalance",
      "msg": "Insufficient balance for the transaction."
    },
    {
      "code": 6002,
      "name": "unauthorizedAccess",
      "msg": "Unauthorized access to the account."
    },
    {
      "code": 6003,
      "name": "transactionLimitExceeded",
      "msg": "Transaction amount exceeds the limit."
    },
    {
      "code": 6004,
      "name": "accountNotFound",
      "msg": "Account not found."
    },
    {
      "code": 6005,
      "name": "invalidTransactionType",
      "msg": "Invalid transaction type."
    },
    {
      "code": 6006,
      "name": "invalidNonce",
      "msg": "Invalid nonce (reply detected)."
    }
  ],
  "types": [
    {
      "name": "balanceInitializedEvent",
      "docs": [
        "Event emitted when a new confidential balance account is created",
        "Indexed by Helius for tracking new wallet initializations"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ownerCommitment",
            "docs": [
              "Owner commitment hash (privacy-preserving identifier)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "slot",
            "docs": [
              "Slot number when account was initialized"
            ],
            "type": "u64"
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp of initialization (Unix timestamp)"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "confidentialBalance",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ownerCommitment",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "encryptedBalance",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "privateTransferEvent",
      "docs": [
        "Event emitted for private transfers",
        "This event is indexed by Helius webhooks for activity feed",
        "",
        "Privacy Design:",
        "- Only non-sensitive metadata is included",
        "- No amounts, sender, or receiver identities exposed",
        "- encrypted_tag allows recipient to detect their transactions locally",
        "- commitment_hash enables transaction verification without revealing details"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commitmentHash",
            "docs": [
              "Commitment hash for transaction verification (non-sensitive)",
              "Used for proof generation and audit trails without revealing amounts"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "encryptedTag",
            "docs": [
              "Encrypted tag for recipient detection (only recipient can decrypt)",
              "Generated via ECDH key derivation - only intended recipient can match"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "slot",
            "docs": [
              "Slot number when transaction was processed",
              "Used by Helius for indexing and ordering"
            ],
            "type": "u64"
          },
          {
            "name": "timestamp",
            "docs": [
              "Timestamp of the transfer (Unix timestamp)"
            ],
            "type": "i64"
          },
          {
            "name": "eventType",
            "docs": [
              "Event type identifier for filtering",
              "0 = transfer, 1 = mint, 2 = burn, 3 = deposit"
            ],
            "type": "u8"
          },
          {
            "name": "senderBump",
            "docs": [
              "Program-derived address bump (for account identification)"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "veilPayMint",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "csplConfig",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
