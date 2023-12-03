import { SolanaTokenAccount } from "../accounts";

export type GetWalletTokensWithPriceResponse = {
	accounts: SolanaTokenAccount[];
	fiatPriceVsUsd: number;
	success: boolean;
};
