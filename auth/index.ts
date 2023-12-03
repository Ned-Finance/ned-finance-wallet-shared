import AsyncStorage from "@react-native-async-storage/async-storage";
import EncryptedStorage from "react-native-encrypted-storage";
import {
	loginWithSignedMessage,
	logout as logoutFirebase,
} from "../firebase/auth";
import { getWalletsFromDisk, saveWalletsToDisk } from "../persistance";
import { Wallet } from "../types/wallet";

export const login = async (
	signature: number[],
	publicKey: number[],
	address: string
): Promise<boolean> => {
	return await loginWithSignedMessage(
		Array.from(signature),
		Array.from(publicKey),
		address
	);
};

export const logoutAll = async (completed: () => void): void => {
	const wallets = await getWalletsFromDisk();

	await Promise.all(
		((wallets || []) as Wallet[]).map((wallet) => logout(wallet.address))
	);

	await saveWalletsToDisk([]);
	await EncryptedStorage.clear();
	await AsyncStorage.clear();
	completed();
};

export const logout = (address: string): Promise<boolean> => {
	return logoutFirebase(address);
};
