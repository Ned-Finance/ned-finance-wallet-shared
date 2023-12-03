import {
	Record,
	SNSError,
	createSolRecordInstruction,
	createSubdomain,
	getDomainKeySync,
	getRecordKeySync,
} from "@bonfida/spl-name-service";
import { PublicKey } from "@metaplex-foundation/js";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import axios from "axios";
import _ from "lodash";
import { API_URL } from "../../constants";
import { logException } from "../../logging";
import { Wallet } from "../../types/wallet";
import { getConnection } from "../connection";
import constants from "../constants";
import { keypairFromPrivateKeyString } from "../keypair";
import { SignatureForCreateDomainForWalletResponse } from "./types";
const meta = {
	file: "utils/solana/domains/index.ts",
};

export const domainExists = (domain: string) => {
	console.log("domain --->", domain);
	// return resolve(getConnection(), domain)
	try {
		const result = getDomainKeySync(domain);
		return result.pubkey ? true : false;
	} catch (e) {
		console.log((e as SNSError).message);
		console.log((e as SNSError).name);
		console.log((e as SNSError).stack);
		logException({
			message: "Couldn't determine if domains exists",
			capturedError: e as SNSError,
			meta,
		});
		return false;
	}
};

export const signatureForCreateDomain = async (encodedMessage: number[]) => {
	try {
		const response =
			await axios.post<SignatureForCreateDomainForWalletResponse>(
				`${API_URL}/signature-for-create-domain`,
				{
					encodedMessage,
				}
			);
		return response.data.signature;
	} catch (e) {
		return null;
	}
};

export const getCreateSubdomainWithOwnerTransaction = async (
	domain: string,
	wallet: Wallet
) => {
	const owner = new PublicKey(constants.NED_SOL_DOMAIN_ADDRESS);
	const newOwnerKeypair = (() => {
		if (wallet.selected) {
			return wallet.keypair;
		} else {
			const keypair = keypairFromPrivateKeyString(wallet.privateKey);
			return keypair;
		}
	})();
	const fullDomain = `${domain}.nedfinance.sol`;

	console.log("newOwnerKeypair", newOwnerKeypair);
	console.log("fullDomain", fullDomain);
	console.log("owner", owner);

	const ixCreateSubdomain = await createSubdomain(
		getConnection(),
		fullDomain,
		owner
	);

	// const isParentSigner = true;
	// const ixTransferSubdomain = await transferSubdomain(
	// 	getConnection(),
	// 	fullDomain,
	// 	newOwnerKeypair.publicKey,
	// 	isParentSigner,
	// 	owner
	// );

	const recordKey = getRecordKeySync(fullDomain, Record.SOL);
	const bufferConcat = Buffer.concat([
		newOwnerKeypair.publicKey.toBuffer(),
		recordKey.toBuffer(),
	]);
	const encodedMessage = new TextEncoder().encode(bufferConcat.toString("hex"));

	const signature = await signatureForCreateDomain(Array.from(encodedMessage));

	if (signature) {
		const ixCreateSolRecordInstruction = await createSolRecordInstruction(
			getConnection(),
			fullDomain,
			newOwnerKeypair.publicKey,
			owner,
			Uint8Array.from(signature),
			owner
		);

		const instructions = [
			..._.flatten(ixCreateSubdomain),
			// ixTransferSubdomain,
			...ixCreateSolRecordInstruction,
		];

		const blockhash = (await getConnection().getLatestBlockhash()).blockhash;

		const messageV0 = new TransactionMessage({
			payerKey: owner,
			recentBlockhash: blockhash,
			instructions,
		}).compileToV0Message();

		const transaction = new VersionedTransaction(messageV0);

		// let userSignature = tweetnacl.sign.detached(
		// 	Uint8Array.from(transaction.message.serialize()),
		// 	newOwnerKeypair.secretKey
		// );
		// transaction.addSignature(newOwnerKeypair.publicKey, userSignature);
		const serialized = transaction.serialize();

		const buffer = Buffer.from(serialized.buffer);
		return buffer.toString("base64");
	} else {
		return null;
	}
};
