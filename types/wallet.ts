import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { generateKeypair } from "../blockchain/solana/keypair";
import { Network } from "../networks";
import { SolanaAccount } from "./accounts";
import { Keypair } from "./keypair";

export type BaseWallet = {
	name: string;
	privateKey: string; //base64
	address: string;
	mnemonic: string;
	selected: boolean;
	icon: string | undefined;
	network: Network;
	keypair: Keypair;
};

export class BaseWalletImpl {
	static default: BaseWallet = {
		name: "",
		address: "",
		mnemonic: "",
		privateKey: "",
		selected: true,
		icon: undefined,
		network: Network.Solana,
		keypair: generateKeypair(),
	};
}

export type SolanWallet<T = SolanaAccount> = {
	accounts?: T[];
	keypair: SolanaKeypair;
} & BaseWallet;

export type Wallet = SolanWallet;
export type WalletAccount = SolanaAccount;
