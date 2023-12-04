export type ParsedQR = {
	recipient: string;
	amount: number;
	label: string | undefined;
	tokenAddress: string | undefined;
	memo: string | undefined;
};
