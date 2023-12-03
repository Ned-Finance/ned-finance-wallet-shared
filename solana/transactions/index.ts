import {
	LAMPORTS_PER_SOL,
	PublicKey,
	RpcResponseAndContext,
	SimulatedTransactionResponse,
	TransactionSignature,
	VersionedTransaction,
} from "@solana/web3.js";
import _ from "lodash";
import { ReadableParsedTransaction } from "ned-transactions-parser/dist/cjs/humanize/types";
import { logDebug } from "../../logging";
import { getConnection } from "../connection";
import { loadParsedTransactionsOptimized } from "./helpers";

const meta = {
	file: "utils/solana/transactions/index.ts",
};

interface TransactionListResult {
	transactions: ReadableParsedTransaction[];
	// transactions: ReadableTransaction[],
	latestSignature?: string;
}

export const getTransactionsCountForAddress = async (pubKey: PublicKey) => {
	const connection = getConnection();
	const signatures = await connection.getSignaturesForAddress(pubKey, {
		limit: 1,
	});
	return signatures.length;
};

export const getFeeForMessage = async (
	transaction: VersionedTransaction
): Promise<number | null> => {
	const connection = getConnection();
	const response = await connection.getFeeForMessage(
		transaction.message,
		"confirmed"
	);
	if (response.value) {
		const feeInLamports = response.value / LAMPORTS_PER_SOL;
		return feeInLamports;
	} else {
		return null;
	}
};

export const getSimulation = async (
	transaction: VersionedTransaction,
	accounts: string[]
): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> => {
	const connection = getConnection();
	const response = await connection.simulateTransaction(transaction, {
		accounts: {
			encoding: "base64",
			addresses: accounts,
		},
		replaceRecentBlockhash: true,
		commitment: "finalized",
	});
	logDebug({
		message: `Simulation with accounts ${accounts} for signatures ${
			transaction.signatures
		} has responded with ${JSON.stringify(response)}`,
		meta,
	});
	return response;
};

export const getTransactionsForAddress = async (
	address: string,
	walletAddress: string,
	tokenList: any[],
	latestSignature?: TransactionSignature
): Promise<TransactionListResult> => {
	const before = _.isEmpty(latestSignature) ? {} : { before: latestSignature };
	const connection = getConnection();
	const signatures = (
		await connection.getSignaturesForAddress(new PublicKey(address), {
			...before,
			limit: 10,
		})
	).map((x) => x.signature);

	console.log("address", address);
	console.log("signatures", signatures);

	const lastSignature = _.last(signatures);

	const transactions = await loadParsedTransactionsOptimized(
		walletAddress,
		signatures
	);

	console.log("transactions ==>", transactions);

	return {
		transactions: _.flatten(transactions) as ReadableParsedTransaction[],
		latestSignature: lastSignature ? lastSignature : undefined,
	};
};
