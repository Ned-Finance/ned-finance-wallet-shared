import {
	TransferRequestURL,
	encodeURL as encodeURLSolanaPay,
	parseURL as parseURLSolanaPay,
} from "@solana/pay";

import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { ParsedQR } from "./types";

export const encodeURL = (
	recipient: string,
	amount: number,
	splToken?: string,
	memo?: string
) => {
	const url = encodeURLSolanaPay({
		recipient: new PublicKey(recipient),
		amount: new BigNumber(amount),
		label: recipient,
		splToken: splToken ? new PublicKey(splToken) : undefined,
		memo: memo,
	});

	return url;
};

export const parseURL = (url: string): ParsedQR => {
	const result = parseURLSolanaPay(url) as TransferRequestURL;

	return {
		recipient: result.recipient.toBase58(),
		amount: Number(result.amount),
		label: result.label,
		tokenAddress: result.splToken?.toBase58(),
		memo: result.memo,
	};
};
