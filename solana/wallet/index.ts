import { Keypair } from "@solana/web3.js";
import axios from "axios";
import { API_URL } from "../../constants";
import { keyPairFromPrivateKey, privateKeyFromString } from "../keypair";
import { GetWalletTokensWithPriceResponse } from "./types";

export const getKeypair = (encryptedKey: string): Keypair => {
	const privateKey = privateKeyFromString(encryptedKey);
	const keypair = keyPairFromPrivateKey(privateKey);
	return keypair;
};

export const getWalletTokensWithPrice = async (
	address: string,
	fiatCurrency?: string
) => {
	const response = await axios.get<GetWalletTokensWithPriceResponse>(
		`${API_URL}/get-wallet-tokens-with-price`,
		{ params: { address, fiatCurrency } }
	);
	return response.data;
};
