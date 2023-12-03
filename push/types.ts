export type RequestTokenTransferPushMessage = {
	amount: string;
	symbol: string;
	mint: string;
	alias: string;
	address: string;
	isContact: "yes" | "no";
};
