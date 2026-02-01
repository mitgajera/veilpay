import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as web3 from '@solana/web3.js';
import { getProgram, PROGRAM_ID } from '../utils/anchor';
import { TransferModal } from './TransferModal';

export const Dashboard: React.FC = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [balanceAccount, setBalanceAccount] = useState<any>(null);
    const [balancePda, setBalancePda] = useState<PublicKey | null>(null);
    const [loading, setLoading] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    useEffect(() => {
        if (wallet.publicKey) {
            const [pda] = PublicKey.findProgramAddressSync(
                [Buffer.from("balance"), wallet.publicKey.toBuffer()],
                PROGRAM_ID
            );
            setBalancePda(pda);
            fetchBalance(pda);
        }
    }, [wallet.publicKey]);

    const fetchBalance = async (pda: PublicKey) => {
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);
            // @ts-ignore
            const account = await program.account.confidentialBalance.fetch(pda);
            setBalanceAccount(account);
        } catch (err) {
            console.log("Account not initialized or error fetching");
            setBalanceAccount(null);
        } finally {
            setLoading(false);
        }
    };

    const initBalance = async () => {
        if (!wallet.publicKey) return;
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);
            await program.methods
                .initBalance()
                .accounts({
                    confidentialBalance: balancePda!,
                    owner: wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();

            // Wait a sec for confirmation
            setTimeout(() => {
                if (balancePda) fetchBalance(balancePda);
            }, 1000);
        } catch (err: any) {
            console.error("Initialization error:", err);
            // Log full error logs if available
            if (err.logs) {
                console.error("Transaction Logs:", err.logs);
            }
            alert("Failed to initialize balance: " + (err.message || err.toString()));
        } finally {
            setLoading(false);
        }
    };

    if (!wallet.connected) {
        return (
            <div className="glass-panel p-8 text-center">
                <h2 className="text-xl mb-4">Welcome to VeilPay</h2>
                <p className="text-gray-400">Connect your wallet to manage your private assets.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 text-center w-full">
            <div className="glass-panel p-8 md:p-10 shadow-2xl">
                <h2 className="text-3xl font-bold mb-8 text-rose-900 tracking-tight">Your Private Balance</h2>

                {loading && <p className="font-medium text-lg animate-pulse text-rose-500">Processing secure transaction...</p>}

                {!loading && !balanceAccount && (
                    <div className="text-center py-6">
                        <p className="mb-6" style={{ color: '#9f1239' }}>Account not initialized.</p>
                        <button className="btn-primary" onClick={initBalance}>
                            Initialize Account
                        </button>
                    </div>
                )}

                {!loading && balanceAccount && (
                    <div className="grid gap-6">
                        <div className="inner-card flex flex-col items-center justify-center p-6 hover:scale-[1.02] transition-transform duration-300">
                            <label className="text-xs font-bold uppercase tracking-widest text-rose-900 mb-3 text-center">Encrypted Balance</label>
                            <div className="font-mono text-[10px] leading-relaxed bg-white/80 p-4 rounded-lg border border-rose-100 shadow-inner break-all text-center w-full text-rose-600">
                                {Buffer.from(balanceAccount.encryptedBalance).toString('hex')}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="inner-card flex flex-col items-center justify-center p-4 hover:scale-[1.02] transition-transform duration-300">
                                <label className="text-xs font-bold uppercase tracking-widest text-rose-900 mb-2 text-center">Owner Hash</label>
                                <div className="font-mono text-[10px] bg-white/80 px-4 py-2 rounded-lg border border-rose-100 text-rose-800 break-all text-center w-full">
                                    {Buffer.from(balanceAccount.ownerCommitment).toString('hex')}
                                </div>
                            </div>
                            <div className="inner-card flex flex-col items-center justify-center p-4 hover:scale-[1.02] transition-transform duration-300">
                                <label className="text-xs font-bold uppercase tracking-widest text-rose-900 mb-2 text-center">Nonce</label>
                                <div className="text-3xl font-extrabold text-rose-700 text-center w-full">
                                    {balanceAccount.nonce.toString()}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center mt-6">
                            <button className="btn-primary w-full text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all" onClick={() => setIsTransferModalOpen(true)}>
                                Send Private Transfer
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {
                balancePda && (
                    <TransferModal
                        isOpen={isTransferModalOpen}
                        onClose={() => setIsTransferModalOpen(false)}
                        balancePda={balancePda}
                        onSuccess={() => fetchBalance(balancePda)}
                    />
                )
            }
        </div>
    );
};
