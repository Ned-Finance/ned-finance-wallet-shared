export * from "./lido";
export * from "./marinade";

import { Connection, Keypair, TransactionSignature } from "@solana/web3.js";

export type StakeAmount = Readonly<number> & { readonly __tag: unique symbol };
export type StakeEarning = Readonly<number> & { readonly __tag: unique symbol };
export type StakeAPY = Readonly<number> & { readonly __tag: unique symbol };

export interface StakingConfig {
	connection: Connection;
	keypair: Keypair;
}

export interface StakingProvider {
	stake: (amount: StakeAmount) => Promise<TransactionSignature>;
	unstake: (amount: StakeAmount) => Promise<TransactionSignature>;
	getEarnings: () => Promise<StakeEarning>;
	getAPY: () => Promise<StakeAPY>;
	getSymbol: () => string;
	getProviderName: () => string;
}
