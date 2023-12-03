import * as bip39 from "@medardm/react-native-bip39";
import * as ed from "@noble/ed25519";
import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { decodeUTF8 } from "tweetnacl-util";
import { NED_FINANCE_SIGN_MESSAGE } from "../constants";
import { logDebug } from "../logging";

const meta = {
	file: "utils/solana/keypair.ts",
};

export const getMnemonic = () => {
	return bip39.generateMnemonic();
};

export const privateKeyToString = (privateKey: Uint8Array): string => {
	return Buffer.from(privateKey).toString("base64");
};

export const privateKeyFromString = (privateKeyStr: string): Uint8Array => {
	return new Uint8Array(Buffer.from(privateKeyStr, "base64"));
};

export const keyPairFromPrivateKey = (secretKey: Uint8Array): Keypair => {
	const publicKey = secretKey.slice(32, 64);
	const privateScalar = secretKey.slice(0, 32);
	const computedPublicKey = ed.getPublicKey(privateScalar);
	for (let ii = 0; ii < 32; ii++) {
		if (publicKey[ii] !== computedPublicKey[ii]) {
			throw new Error("provided secretKey is invalid");
		}
	}
	return new Keypair({ publicKey, secretKey });
};

export const keypairFromPrivateKeyString = (
	privateKeyString: string
): Keypair => {
	const privateKey = privateKeyFromString(privateKeyString);
	return keyPairFromPrivateKey(privateKey);
};

export const getPublicKeyFromAddress = (address: string): PublicKey => {
	return new PublicKey(address);
};

export const generateKeypair = (): Keypair => {
	const privateScalar = ed.utils.randomPrivateKey();
	const publicKey = ed.getPublicKey(privateScalar);
	const secretKey = new Uint8Array(64);
	secretKey.set(privateScalar);
	secretKey.set(publicKey, 32);
	return new Keypair({
		publicKey,
		secretKey,
	});
};

// export const getKeypair = (wallet: Wallet) => {
//     // console.log('wallet ===?', wallet, wallet.privateKey!)
//     const privateKey = privateKeyFromString(wallet.privateKey!);
//     // console.log('privateKey', privateKey)
//     const keypair = keyPairFromPrivateKey(privateKey);
//     return keypair
// }

export const signMessageForLogin = (keypair: Keypair): Promise<Uint8Array> => {
	const signature = nacl.sign.detached(
		Uint8Array.from(decodeUTF8(NED_FINANCE_SIGN_MESSAGE)),
		keypair.secretKey
	);

	logDebug({
		message: `Signature for login ${signature}`,
		meta,
	});
	return Promise.resolve(signature);
};
