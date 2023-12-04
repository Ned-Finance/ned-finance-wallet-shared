import {
	TOKEN_PROGRAM_ID,
	createTransferCheckedInstruction,
	getAssociatedTokenAddress,
	getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {
	AddressLookupTableAccount,
	Keypair,
	LAMPORTS_PER_SOL,
	PublicKey,
	SystemProgram,
	TransactionInstruction,
	TransactionMessage,
	VersionedMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import axios from "axios";
import _ from "lodash";
import { ReadableParsedTransaction } from "ned-transactions-parser/dist/cjs/humanize/types";
import { MEMO_PROGRAM_ID, NED_WALLET_API_URL } from "../../../constants";
import { getConnection } from "../connection";

export const getTransferFee = async (message: VersionedMessage) => {
	const connection = getConnection();
	const response = await connection.getFeeForMessage(message, "confirmed");
	return response.value ? response.value / LAMPORTS_PER_SOL : 0.000005;
	// return 0
};

type SendTransactionParams = {
	fromAddress: string;
	signer: Keypair;
	mint: string;
	decimals: number;
	feePayer: PublicKey;
	toAddress: string;
	amount: number;
	tokenAddress?: string;
	memoMessage?: string;
	tokenProgramId?: string;
};

export const getSendTransaction = async ({
	fromAddress,
	mint,
	decimals,
	signer,
	feePayer,
	toAddress,
	amount,
	tokenAddress,
	memoMessage,
	tokenProgramId = TOKEN_PROGRAM_ID.toBase58(),
}: SendTransactionParams) => {
	const transferInstruction = !tokenAddress
		? [
				SystemProgram.transfer({
					fromPubkey: new PublicKey(fromAddress),
					toPubkey: new PublicKey(toAddress),
					lamports: amount * LAMPORTS_PER_SOL,
				}),
		  ]
		: [
				createTransferCheckedInstruction(
					new PublicKey(fromAddress),
					new PublicKey(mint),
					new PublicKey(toAddress),
					signer.publicKey,
					amount,
					decimals,
					[],
					new PublicKey(tokenProgramId)
				),
		  ];

	const memoInstruction = (() => {
		if (memoMessage) {
			return [
				new TransactionInstruction({
					keys: [{ pubkey: feePayer, isSigner: true, isWritable: true }],
					data: Buffer.from(memoMessage, "utf-8"),
					programId: new PublicKey(MEMO_PROGRAM_ID),
				}),
			];
		} else {
			return [];
		}
	})();

	const instructions = [...transferInstruction, ...memoInstruction];

	console.log("memoMessage ====>", memoMessage);
	console.log("instructions", instructions.length);

	const latestBlockhash = await getConnection().getLatestBlockhash();

	const messageV0 = new TransactionMessage({
		payerKey: feePayer,
		recentBlockhash: latestBlockhash.blockhash,
		instructions,
	}).compileToV0Message();

	const transaction = new VersionedTransaction(messageV0);
	transaction.sign([signer]);

	return transaction;
};

export const getOrCreateTokenAccount = async (
	payer: Keypair,
	tokenMint: string,
	address: string
) => {
	console.log("payer", payer);
	console.log("new PublicKey(tokenMint)", new PublicKey(tokenMint));
	console.log("new PublicKey(address)", new PublicKey(address));
	const tokenAccount = await getOrCreateAssociatedTokenAccount(
		getConnection(),
		payer,
		new PublicKey(tokenMint),
		new PublicKey(address)
	);

	console.log("tokenAccount ===>", tokenAccount);

	return tokenAccount;
};

export const getTokenAccount = async (tokenMint: string, address: string) => {
	const tokenAccount = await getAssociatedTokenAddress(
		new PublicKey(tokenMint),
		new PublicKey(address)
	);

	return tokenAccount;
};

export const sendTransaction = async (transaction: VersionedTransaction) => {
	const connection = getConnection();
	const tx = await connection.sendTransaction(transaction, {
		skipPreflight: true,
	});
	return tx;
};

export const getTransaction = async (signature: string) => {
	const connection = getConnection();
	const tx = await connection.getTransaction(signature, {
		commitment: "confirmed",
		maxSupportedTransactionVersion: undefined,
	});
	return tx;
};

export const getTransactionConfirmed = async (signature: string) => {
	const MAX_REQUESTS = 20;
	const connection = getConnection();
	return new Promise(async (resolve, reject) => {
		const checkStatus = async (counter: number): Promise<string | null> => {
			const { value } = await connection.getSignatureStatus(signature);
			if (counter < MAX_REQUESTS) {
				if (value && value.confirmationStatus == "confirmed") {
					return value.confirmationStatus;
				} else {
					return await checkStatus(counter + 1);
				}
			} else {
				return null;
			}
		};

		const status = await checkStatus(0);

		resolve(status);
	});
};

export const getLookupTableAccounts = (transaction: VersionedTransaction) => {
	return Promise.all(
		transaction.message.addressTableLookups.map(async (lookup) => {
			return new AddressLookupTableAccount({
				key: lookup.accountKey,
				state: AddressLookupTableAccount.deserialize(
					await getConnection()
						.getAccountInfo(lookup.accountKey)
						.then((res) => res!.data)
				),
			});
		})
	);
};

export const getTransactionInstructions = async (
	transactionlist: VersionedTransaction[]
) => {
	return await new Promise<TransactionInstruction[]>(
		async (resolve, reject) => {
			const instructionsUnflatted = await Promise.all(
				transactionlist.map(async (transaction: VersionedTransaction) => {
					const addressLookupTableAccounts =
						await getLookupTableAccounts(transaction);
					return TransactionMessage.decompile(transaction.message, {
						addressLookupTableAccounts,
					}).instructions;
				})
			);

			const instructionsFlattern = _.flatten(instructionsUnflatted);

			resolve(instructionsFlattern);
		}
	);
};

export const getAddressLookupTableAccounts = async (
	transactionlist: VersionedTransaction[]
) => {
	return await new Promise<AddressLookupTableAccount[]>(
		async (resolve, reject) => {
			const lookupTables = await Promise.all(
				transactionlist.flatMap(async (transaction: VersionedTransaction) => {
					return await getLookupTableAccounts(transaction);
				})
			);
			resolve(_.flatten(lookupTables));
		}
	);
};

export const mergeTransactions = async (
	payerKey: PublicKey,
	transactions: VersionedTransaction[]
): Promise<VersionedTransaction> => {
	// console.log("mainTransaction----->", mainTransaction.message);
	// const message = TransactionMessage.decompile(mainTransaction.message);

	const instructions = await getTransactionInstructions(transactions);

	const addressLookupTableAccounts =
		await getAddressLookupTableAccounts(transactions);

	const latestBlockhash = await getConnection().getLatestBlockhash();

	const messageV0 = new TransactionMessage({
		payerKey: payerKey,
		recentBlockhash: latestBlockhash.blockhash,
		instructions: instructions,
	}).compileToV0Message(addressLookupTableAccounts);
	const transaction = new VersionedTransaction(messageV0);

	return transaction;
};

const loadTxPerTxId = async (walletAddress: string, txIdChunk: string[]) => {
	try {
		const url = `${NED_WALLET_API_URL}/transactions`;
		const req = await axios.post(url, { txs: txIdChunk, walletAddress });
		return req.data;
	} catch (e) {
		return [];
	}
};

export const loadParsedTransactions = async (
	walletAddress: string,
	txIds: string[]
) => {
	const result = await Promise.all(
		_.chunk(txIds, 1).map((txIdChunk) =>
			loadTxPerTxId(walletAddress, txIdChunk)
		)
	);

	return _.flatten(result);
};

export const saveTransactionToDisk = async (
	txId: string,
	tx: ReadableParsedTransaction,
	saveFn: (key: string, value: string) => Promise<void>
) => {
	return await saveFn(`${txId}`, JSON.stringify(tx));
};

export const getTransactionFromDisk = async (
	txId: string,
	getFn: (key: string) => Promise<string | null>
) => {
	return await getFn(`${txId}`)
		.then((tx: string | null) => {
			if (tx) {
				return JSON.parse(tx);
			} else {
				return tx;
			}
		})
		.catch((x) => `Error retreiving transaction ${txId} locally`);
};

export const loadParsedTransactionsOptimized = async (
	walletAddress: string,
	txIds: string[],
	getFn: (key: string) => Promise<string | null>,
	saveFn: (key: string, value: string) => Promise<void>
) => {
	const promises = _.chunk(txIds, 1).map((txIdChunk) => {
		return new Promise(async (resolve, _) => {
			const txFromDisk = await Promise.all(
				txIdChunk.map((txId) => getTransactionFromDisk(txId, getFn))
			);

			console.log("txFromDisk", txFromDisk);

			const allTx = await Promise.all(
				txFromDisk.map(async (tx, index) => {
					if (tx) {
						return Promise.resolve(tx);
					} else {
						console.log("ok??");
						const txToSend = txIdChunk[index];
						const loadedTxs = await loadTxPerTxId(walletAddress, [txToSend]);
						await Promise.all(
							loadedTxs.map((tx: ReadableParsedTransaction) =>
								saveTransactionToDisk(txToSend, tx, saveFn)
							)
						);
						return loadedTxs;
					}
				})
			);

			resolve(allTx);
		});
	});

	const result = await Promise.all(promises);

	return _.flatten(result);
};
