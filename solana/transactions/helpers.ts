// import {
//     TokenInstructions,
//   } from '@project-serum/serum';

import AsyncStorage from "@react-native-async-storage/async-storage";
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
import {
	TOKEN_PROGRAM_ID,
	createTransferCheckedInstruction,
	getAssociatedTokenAddress,
	getOrCreateAssociatedTokenAccount,
} from "@top-level/solana/spl-token";
import axios from "axios";
import _ from "lodash";
import { ReadableParsedTransaction } from "ned-transactions-parser/dist/cjs/humanize/types";
import { MEMO_PROGRAM_ID, NED_WALLET_API_URL } from "../../constants";
import { getConnection } from "../connection";

// const INITIALIZE_ACCOUNT_ACCOUNT_INDEX = 0;
// const INITIALIZE_ACCOUNT_MINT_INDEX = 1;
// const INITIALIZE_ACCOUNT_OWNER_INDEX = 2;
// const TRANSFER_SOURCE_INDEX = 0;
// const TRANSFER_DESTINATION_INDEX = 1;
// const TRANSFER_OWNER_INDEX = 2;
// // const CLOSE_ACCOUNT_SOURCE_INDEX = 0;
// // const CLOSE_ACCOUNT_DESTINATION_INDEX = 1;
// // const CLOSE_ACCOUNT_OWNER_INDEX = 2;

// export const getAccountByIndex = (accounts, accountKeys, accountIndex) => {
//     const index = accounts.length > accountIndex && accounts[accountIndex];
//     return accountKeys?.length > index && accountKeys[index];
// };

// export const getCloseAccountData = (publicKey, accounts, accountKeys) => {
//     const sourcePubkey = getAccountByIndex(
//         accounts,
//         accountKeys,
//         TRANSFER_SOURCE_INDEX,
//     );

//     const destinationPubkey = getAccountByIndex(
//         accounts,
//         accountKeys,
//         TRANSFER_DESTINATION_INDEX,
//     );

//     const ownerPubkey = getAccountByIndex(
//         accounts,
//         accountKeys,
//         TRANSFER_OWNER_INDEX,
//     );

//     if (!ownerPubkey || !publicKey.equals(ownerPubkey)) {
//         return;
//     }

//     return { sourcePubkey, destinationPubkey, ownerPubkey };
// };

// export const getTransferData = (publicKey, accounts, accountKeys) => {
//     const sourcePubkey = getAccountByIndex(
//         accounts,
//         accountKeys,
//         TRANSFER_SOURCE_INDEX,
//     );

//     const destinationPubkey = getAccountByIndex(
//         accounts,
//         accountKeys,
//         TRANSFER_DESTINATION_INDEX,
//     );

//     const ownerPubkey = getAccountByIndex(
//         accounts,
//         accountKeys,
//         TRANSFER_OWNER_INDEX,
//     );

//     if (!ownerPubkey || !publicKey.equals(ownerPubkey)) {
//         return;
//     }

//     return { sourcePubkey, destinationPubkey, ownerPubkey };
// };

// export const getInitializeAccountData = (publicKey, accounts, accountKeys) => {
//     const accountPubkey = getAccountByIndex(
//         accounts,
//         accountKeys,
//         INITIALIZE_ACCOUNT_ACCOUNT_INDEX,
//     );

//     const mintPubkey = getAccountByIndex(
//         accounts,
//         accountKeys,
//         INITIALIZE_ACCOUNT_MINT_INDEX,
//     );

//     const ownerPubkey = getAccountByIndex(
//         accounts,
//         accountKeys,
//         INITIALIZE_ACCOUNT_OWNER_INDEX,
//     );

//     if (!ownerPubkey || !publicKey.equals(ownerPubkey)) {
//         return;
//     }

//     return { accountPubkey, mintPubkey, ownerPubkey };
// };

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
	// source: PublicKey,
	// mint: PublicKey,
	// destination: PublicKey,
	// owner: PublicKey,
	// amount: number | bigint,
	// decimals: number,
	// multiSigners: (Signer | PublicKey)[] = [],
	// programId = TOKEN_PROGRAM_ID

	// if (!tokenAddress) {
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
	// } else {

	// }
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

// export const getMint = async (tokenAddress: string) => {
// 	// const connection = getConnection();
// 	return getMintAccount(tokenAddress);
// };

export const sendTransaction = async (transaction: VersionedTransaction) => {
	const connection = getConnection();
	const tx = await connection.sendTransaction(transaction, {
		skipPreflight: false,
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

export const mergeTransactions = async (
	payerKey: PublicKey,
	mainTransaction: VersionedTransaction,
	transactions: VersionedTransaction[]
): Promise<VersionedTransaction> => {
	console.log("mainTransaction----->", mainTransaction.message);
	// const message = TransactionMessage.decompile(mainTransaction.message);

	const getTransactionInstructions = async (
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

				console.log("instructionsUnflatted", instructionsUnflatted);

				const instructionsFlattern = _.flatten(instructionsUnflatted);

				resolve(instructionsFlattern);
			}
		);
	};

	const mainInstructions = await getTransactionInstructions([mainTransaction]);
	const restInstructions = await getTransactionInstructions(transactions);

	const instructions = mainInstructions.concat(restInstructions);

	const getAddressLookupTableAccounts = async (
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

	const mainAddressLookupTableAccounts = await getAddressLookupTableAccounts([
		mainTransaction,
	]);

	const restAddressLookupTableAccounts =
		await getAddressLookupTableAccounts(transactions);

	const addressLookupTableAccounts = mainAddressLookupTableAccounts.concat(
		restAddressLookupTableAccounts
	);

	const latestBlockhash = await getConnection().getLatestBlockhash();

	const messageV0 = new TransactionMessage({
		payerKey: payerKey,
		recentBlockhash: latestBlockhash.blockhash,
		instructions: instructions,
	}).compileToV0Message(addressLookupTableAccounts);
	const transaction = new VersionedTransaction(messageV0);

	// message.instructions.push(...instructions);

	// mainTransaction.message = message.compileToV0Message(
	//     addressLookupTableAccounts
	// );

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
	tx: ReadableParsedTransaction
) => {
	return await AsyncStorage.setItem(`${txId}`, JSON.stringify(tx))
		.then((x) => `Transaction ${txId} stored locally`)
		.catch((x) => `Error storing transaction ${txId} locally`);
};

export const getTransactionFromDisk = async (txId: string) => {
	return await AsyncStorage.getItem(`${txId}`)
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
	txIds: string[]
) => {
	const promises = _.chunk(txIds, 1).map((txIdChunk) => {
		return new Promise(async (resolve, _) => {
			const txFromDisk = await Promise.all(
				txIdChunk.map((txId) => getTransactionFromDisk(txId))
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
								saveTransactionToDisk(txToSend, tx)
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
