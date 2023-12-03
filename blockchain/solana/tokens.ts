export interface TokenExtensions {
	coingeckoId: string;
	twitter: string;
	website: string;
	discord: string;
}

export interface Token {
	chainId: number;
	address: string;
	symbol: string;
	name: string;
	decimals: number;
	logoURI: string;
	extensions: TokenExtensions;
}

export class Token {
	static default(): Token {
		return {
			address: "",
			symbol: "UNKNOWN",
			decimals: 0,
			logoURI: "",
			extensions: {
				coingeckoId: "",
				twitter: "",
				website: "",
				discord: "",
			},
			name: "",
			chainId: 101,
		};
	}
}

import axios from "axios";
import _ from "lodash";

export const getJupiterTokens = async () => {
	try {
		const req = await axios.get<Token[]>(
			process.env.SOLANA_TOKENS_LIST_JUPITER || ""
		);
		return req.data;
	} catch (e) {
		return [];
	}
};

export const getPrismTokens = async () => {
	try {
		const req = await axios.get<Token[]>(
			process.env.SOLANA_TOKENS_LIST_PRISM || ""
		);
		return (req.data as any).tokens;
	} catch (e) {
		return [];
	}
};

export const getAllTokens = async () => {
	try {
		const [tokensJupiter, tokensPrism] = await Promise.all([
			getJupiterTokens(),
			getPrismTokens(),
		]);
		// return [...tokensJupiter, ...tokensPrism];
		return _.uniqBy([...tokensJupiter, ...tokensPrism], "address");
	} catch (e) {
		return null;
	}
};

export const getTokenByAddress = async (address: string) => {
	try {
		const tokens = await getAllTokens();
		if (tokens) {
			const found = tokens.find((t) => t.address == address);
			if (found) return found;
		}

		return null;
	} catch (e) {
		return null;
	}
};

export const getTokenSymbol = async (address: string) => {
	try {
		const token = await getTokenByAddress(address);
		if (token) return token.symbol;
		return "UNKNOWN";
	} catch (e) {
		return null;
	}
};
