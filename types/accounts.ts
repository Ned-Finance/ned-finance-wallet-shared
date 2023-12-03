import { SolanaTokenAccount } from "../solana/accounts";

export interface TokenPriceInfo {
	price: number;
}

export type BaseTokenAccount = {
	address: string;
	mint: string;
	balance: number;
	balanceNonDecimal: string;
	logoURI: string;
	symbol: string;
	name: string;
	decimals: number;
	chainId: number;
	isWrapped: boolean;
	isNative: boolean;
};

export type TokenAccount<T extends BaseTokenAccount> = {
	tokenAccount: T;
	priceInfo: TokenPriceInfo;
	calculatedValue: number;
};

export type SolanaAccount = TokenAccount<SolanaTokenAccount>;
