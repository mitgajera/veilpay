import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProgram } from '../utils/anchor'; // Adjust import path
import { encryptAmount, generateCommitmentHash, generateEncryptedTag } from '../utils/encryption';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    balancePda: PublicKey;
    onSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, balancePda, onSuccess }) => {
    const wallet = useWallet();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTransfer = async () => {
        if (!wallet.publicKey) return;
        setLoading(true);
        setError(null);

        try {
            const rpcUrl = import.meta.env.VITE_RPC_URL || "https://api.devnet.solana.com";
            const program = getProgram(new anchor.web3.Connection(rpcUrl), wallet);

            // 1. Process inputs
            const recipientPubkey = new PublicKey(recipient);
            const transferAmount = parseInt(amount);

            // 2. Encryption (Client-side privacy)
            const encryptedAmount = encryptAmount(transferAmount);
            // In a real app, this secret would be managed securely or derived
            const senderSecret = new TextEncoder().encode("sender_secret_32_bytes_long_!!");
            const encryptedTag = generateEncryptedTag(recipientPubkey, senderSecret);

            const balanceAccountClient = (program.account as any).ConfidentialBalance
                ?? (program.account as any).confidentialBalance;
            if (!balanceAccountClient) {
                throw new Error("ConfidentialBalance account client not found in IDL.");
            }
            const balanceAccount = await balanceAccountClient.fetch(balancePda);
            const currentNonce = balanceAccount.nonce.toNumber();

            const commitmentHash = generateCommitmentHash(
                encryptedAmount,
                currentNonce,
                recipientPubkey
            );

            // 3. Find recipient balance account
            const [receiverBalancePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("balance"), recipientPubkey.toBuffer()],
                program.programId
            );

            // 3.1. Check if receiver account exists, if not initialize it
            try {
                await balanceAccountClient.fetch(receiverBalancePda);
            } catch (err) {
                // Account doesn't exist - recipient needs to initialize their account first
                setError("The recipient hasn't initialized their VeilPay account yet. They need to connect their wallet and click 'Initialize Balance' first.");
                setLoading(false);
                return;
            }

            // 4. Send Transaction
            await program.methods
                .privateTransfer(
                    encryptedAmount,
                    new anchor.BN(currentNonce),
                    commitmentHash,
                    encryptedTag
                )
                .accounts({
                    senderBalance: balancePda,
                    receiverBalance: receiverBalancePda,
                    sender: wallet.publicKey,
                    // systemProgram is inferred usually, but good to check IDL
                })
                .rpc();

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Transfer failed");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
            <div className="absolute inset-0 bg-rose-950/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>
            <div className="bg-white/95 backdrop-blur-xl p-8 w-full max-w-md relative z-10 transform transition-all scale-100 animate-fadeIn shadow-2xl border border-rose-200 rounded-2xl">
                <div className="flex justify-center mb-6">
                    <h2 className="text-xl font-bold text-white bg-rose-600 py-2 px-8 rounded-full shadow-lg tracking-wide uppercase">
                        Private Transfer
                    </h2>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 transition-colors hover:bg-rose-50 focus-within:bg-white focus-within:border-rose-300 focus-within:shadow-md">
                        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-rose-800/70 mb-2 pl-1">Recipient Address</label>
                        <input
                            type="text"
                            className="w-full bg-transparent text-rose-900 placeholder-rose-300/50 font-mono text-sm focus:outline-none"
                            placeholder="Paste Solana Public Key"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                        />
                    </div>

                    <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 transition-colors hover:bg-rose-50 focus-within:bg-white focus-within:border-rose-300 focus-within:shadow-md">
                        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-rose-800/70 mb-2 pl-1">Amount</label>
                        <div className="flex items-center">
                            <input
                                type="number"
                                className="w-full bg-transparent text-2xl font-bold text-rose-900 placeholder-rose-200 focus:outline-none"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider ml-2 bg-rose-100 px-2 py-1 rounded">SOL</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8 pt-4">
                        <button
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleTransfer}
                            disabled={loading || !recipient || !amount}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    processing
                                </span>
                            ) : 'Send Private'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
