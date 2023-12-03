import Aes from "react-native-aes-crypto";
import DeviceInfo from "react-native-device-info";
import EncryptedStorage from "react-native-encrypted-storage";
import { logDebug } from "../common/logging";
import { decrypt, encrypt } from "../encryption";
import { Wallet } from "../types/wallet";

const WALLET_LIST_KEY = "WALLET_LIST";
const IV_WALLET_LIST = "IV_WALLET_LIST";

const MNEMONIC_KEY = "MNEMONIC";
const IV_MNEMONIC = "IV_MNEMONIC";

const meta = {
	file: "utils/persistance/wallet.ts",
};

export const saveWalletsToDisk = async (wallets: Wallet[]) => {
	const iv = await Aes.randomKey(16);
	await EncryptedStorage.setItem(IV_WALLET_LIST, iv);
	const encripted = await encrypt(
		DeviceInfo.getFingerprintSync(),
		JSON.stringify(wallets),
		iv
	);
	await EncryptedStorage.setItem(WALLET_LIST_KEY, encripted);
};

export const getWalletsFromDisk = async (): Promise<Wallet[] | null> => {
	try {
		const iv = await EncryptedStorage.getItem(IV_WALLET_LIST);
		const encrypted = await EncryptedStorage.getItem(WALLET_LIST_KEY);
		// console.log('encrypted', encrypted)
		const decrypted = await decrypt(
			DeviceInfo.getFingerprintSync(),
			encrypted,
			iv
		);
		const wallets = JSON.parse(decrypted) as Wallet[];
		logDebug({
			message: `Wallets obtained from local store ${wallets
				.map((w) => w.address)
				.join(",")}`,
			meta: {
				...meta,
				addresses: (wallets || []).map((x) => x.address).join(""),
			},
		});
		// console.log('decrypted', decrypted)
		return wallets;
	} catch (e) {
		return null;
	}
};

export const setMnemonic = async (pin: string, mnemonic: string) => {
	const iv = await Aes.randomKey(16);
	await EncryptedStorage.setItem(IV_MNEMONIC, iv);
	const encripted = await encrypt(pin, mnemonic, iv);
	await EncryptedStorage.setItem(MNEMONIC_KEY, encripted);
};

export const getMnemonic = async (pin: string): Promise<string | null> => {
	try {
		const iv = await EncryptedStorage.getItem(IV_WALLET_LIST);
		const encrypted = await EncryptedStorage.getItem(WALLET_LIST_KEY);
		const decrypted = await decrypt(pin, encrypted, iv);
		return JSON.parse(decrypted) as string;
	} catch (e) {
		return null;
	}
};
