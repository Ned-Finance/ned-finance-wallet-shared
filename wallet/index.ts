import { Keypair } from "@solana/web3.js";
import _ from "lodash";
import { match } from "ts-pattern";
import { logDebug } from "../logging";
import { Network } from "../networks";
import { getKeypair } from "../solana/wallet";
import { Wallet } from "../types/wallet";

const meta = {
	file: "utils/wallet/index.ts",
};

export const loadKeypair = (encryptedKey: string, network: Network) =>
	match(network)
		.with(Network.Solana, () => getKeypair(encryptedKey))
		.run();

export const getActiveWallet = (wallets: Wallet[]): Wallet | undefined => {
	logDebug({
		message: `Current wallets in state ${JSON.stringify(wallets)}`,
		meta,
	});
	const found = wallets.find((x) => x.selected == true);

	logDebug({
		message: `Selected wallet value ${found ? found.address : "NOT FOUND"}`,
		meta,
	});
	if (found) {
		const keypair = loadKeypair(found.privateKey, found.network);
		console.log("keypair", keypair);
		return { ...found, keypair };
	} else {
		logDebug({
			message: `Returning first wallet in the list because there was no selected wallet`,
			meta,
		});
		return _.first(wallets);
	}
};

export interface WalletFromMnemonic<T> {
	address: string;
	keypair: T;
}
interface ImportedWallet<T> {
	wallet: WalletFromMnemonic<T>; // TODO: Modify for other chains
	transactionCount: number;
}

export type KeypairAndMnemonic = {
	keypair: string;
	mnemonic: string;
};

export type ImportedWalletSolana = ImportedWallet<Keypair> & {
	wallet: WalletFromMnemonic<Keypair>;
	mnemonic: string;
};
