import { PublicKey } from "@metaplex-foundation/js";
import {
	AccountMeta,
	AddressLookupTableAccount,
	Connection,
	Keypair,
	TransactionInstruction,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import axios from "axios";
import _ from "lodash";
import { NedConfigBlock, PRODUCTION } from "../../../config";
import { logDebug, logException, logInfo } from "../../../logging";
import solana from "../constants";
import { Token } from "../tokens";
import { list } from "./devTokensList";

export interface LpFee {
	amount: string;
	mint: string;
	pct: number;
}

export interface PlatformFee {
	amount: string;
	mint: string;
	pct: number;
}

export interface MarketInfo {
	id: string;
	label: string;
	inputMint: string;
	outputMint: string;
	notEnoughLiquidity: false;
	inAmount: string;
	outAmount: string;
	priceImpactPct: number;
	lpFee: LpFee;
	platformFee: PlatformFee;
}

export interface SwapResponseRoutePlan {
	swapInfo: {
		ammKey: string;
		label: string;
		inputMint: string;
		outputMint: string;
		inAmount: string;
		outAmount: string;
		feeAmount: string;
		feeMint: string;
	};
	percent: number;
}

export interface SwapResponse {
	routePlan: SwapResponseRoutePlan[];
	timeTaken: number;
	contextSlot: number;
	inputMint: string;
	inAmount: string;
	outputMint: string;
	outAmount: string;
	priceImpactPct: number;
	marketInfos: MarketInfo[];
	amount: string;
	slippageBps: number;
	otherAmountThreshold: string;
	swapMode: "ExactIn" | "ExactOut";
}

type Routes = { [x: string]: string[] };

const meta = {
	file: "utils/solana/jupiter/index.ts",
};

type IndexedRouteMap = {
	mintKeys: string[];
	indexedRouteMap: { [key: string]: number[] };
};

export class JupiterManager {
	private static instance: JupiterManager;

	private _routes!: Routes;
	private _tokenList!: Token[];
	private _keypair!: Keypair;
	private _connection!: Connection;
	private _nedConfig?: NedConfigBlock;

	private constructor() {}

	public static getInstance(): JupiterManager {
		if (!JupiterManager.instance) {
			JupiterManager.instance = new JupiterManager();
		}

		return JupiterManager.instance;
	}

	public async init(connection: Connection, nedConfig?: NedConfigBlock) {
		this._connection = connection;
		this._nedConfig = nedConfig;
		const promises = await Promise.all([
			this.loadRoutes(),
			this.getTokenList(),
		]);
		this._routes = promises[0];
		this._tokenList = promises[1];
	}

	public get routes(): Routes {
		return this._routes;
	}

	public get tokenList(): Token[] {
		return this._tokenList;
	}

	public setKeypair(keypair: Keypair) {
		this._keypair = keypair;
	}

	public async loadRoutes(): Promise<{ [x: string]: string[] }> {
		const indexedRouteMap: IndexedRouteMap = (await (
			await fetch(`${solana.JUPITER_API_URL}/indexed-route-map`)
		).json()) as IndexedRouteMap;
		const getMint = (index: number) =>
			indexedRouteMap["mintKeys"][index] as string;

		return _.transform(
			indexedRouteMap["indexedRouteMap"],
			(acc: { [x: string]: string[] }, value: number[], key: string) => {
				const mint = getMint(parseInt(key));
				const newKey = mint.toString();
				acc[newKey] = indexedRouteMap["indexedRouteMap"][key].map(
					(index: number) => getMint(index)
				);
				return acc;
			},
			{}
		);
	}

	public getAvailableSwaps(inputMint: string) {
		return this._routes[inputMint];
	}

	public async getQuote(
		inputMint: string,
		outputMint: string,
		amount: number,
		slippageBps?: number
	): Promise<SwapResponse | null> {
		logInfo({
			message: `Getting routes for input token ${inputMint}, outputToken ${outputMint} and amount ${amount} started`,
			meta,
		});

		try {
			const url = `${solana.JUPITER_API_URL}/quote`;
			const { data }: { data: SwapResponse } = await axios.get(url, {
				params: {
					inputMint: inputMint,
					outputMint: outputMint,
					amount: amount,
					slippageBps: slippageBps || 50,
					swapMode: "ExactIn",
				},
			});

			logDebug({
				message: `Result routes for input token ${inputMint}, outputToken ${outputMint} and amount ${amount} = ${JSON.stringify(
					data
				)}`,
				meta,
			});
			logInfo({
				message: `Getting routes for input token ${inputMint}, outputToken ${outputMint} and amount ${amount} finished with ${data.routePlan.length} routes`,
				meta,
			});
			return data;
		} catch (e) {
			logException({
				message: `Error obtaining routes for input token ${inputMint}, outputToken ${outputMint} and amount ${amount}`,
				capturedError: e as Error,
				meta,
			});
			console.log("Error from Jupiter.getRoutes", e);
			return null;
		}
	}

	public async getSwapTransaction(
		quoteResponse: SwapResponse,
		wrapAndUnwrapSol = true
	) {
		const body = {
			quoteResponse: quoteResponse,
			// user public key to be used for the swap
			userPublicKey: this._keypair.publicKey.toString(),
			// auto wrap and unwrap SOL. default is true
			wrapAndUnwrapSol,
			// feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
			// This is the ATA account for the output token where the fee will be sent to. If you are swapping from SOL->USDC then this would be the USDC ATA you want to collect the fee.
			// feeAccount: "fee_account_public_key"
		};
		logInfo({
			message: `Getting swap transaction for quote ${JSON.stringify(body)}`,
			meta,
		});
		try {
			const url = `${solana.JUPITER_API_URL}/swap`;
			const { data } = await axios.post(url, body);

			logInfo({
				message: `Response swap transaction for quote ${JSON.stringify(
					quoteResponse
				)}. Result = ${data}`,
				meta,
			});
			const swapTransactionBuf = Buffer.from(data.swapTransaction, "base64");
			const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

			transaction.sign([this._keypair]);
			return transaction;
		} catch (e) {
			console.log("Jupiter error ------->", e);
			return null;
		}
	}

	public async getVaultsSwapTransaction(quoteResponse: SwapResponse) {
		const body = {
			quoteResponse: quoteResponse,
			userPublicKey: this._keypair.publicKey.toString(),
			// user public key to be used for the swap
			maxAccounts: 30,
			// feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
			// This is the ATA account for the output token where the fee will be sent to. If you are swapping from SOL->USDC then this would be the USDC ATA you want to collect the fee.
			// feeAccount: "fee_account_public_key"
		};
		logInfo({
			message: `Getting vaults swap transaction for quote ${JSON.stringify(
				body
			)}`,
			meta,
		});
		try {
			const url = `${solana.JUPITER_API_URL}/swap-instructions`;
			const { data } = await axios.post(url, body);

			logInfo({
				message: `Response swap transaction for quote ${JSON.stringify(
					quoteResponse
				)}. Result = ${JSON.stringify(data)}`,
				meta,
			});

			const {
				tokenLedgerInstruction: tokenLedgerPayload, // If you are using `useTokenLedger = true`.
				swapInstruction: swapInstructionPayload, // The actual swap instruction.
				addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
			} = data;

			console.log("tokenLedgerInstruction", tokenLedgerPayload);
			console.log("swapInstruction", swapInstructionPayload);
			console.log("addressLookupTableAddresses", addressLookupTableAddresses);

			// const messageV0 = new TransactionMessage({
			// 	payerKey: this._keypair.publicKey,
			// 	recentBlockhash: latestBlockhash.blockhash,
			// 	instructions: swapInstructionPayload,
			// }).compileToV0Message(addressLookupTableAddresses);

			// const transaction = new VersionedTransaction(messageV0);
			// return transaction;

			const swapInstruction = new TransactionInstruction({
				programId: new PublicKey(swapInstructionPayload.programId),
				keys: swapInstructionPayload.accounts.map((key: AccountMeta) => ({
					pubkey: new PublicKey(key.pubkey),
					isSigner: key.isSigner,
					isWritable: key.isWritable,
				})),
				data: Buffer.from(swapInstructionPayload.data, "base64"),
			});

			const getAdressLookupTableAccounts = async (
				keys: string[]
			): Promise<AddressLookupTableAccount[]> => {
				const addressLookupTableAccountInfos =
					await this._connection.getMultipleAccountsInfo(
						keys.map((key) => new PublicKey(key))
					);

				return addressLookupTableAccountInfos.reduce(
					(acc, accountInfo, index) => {
						const addressLookupTableAddress = keys[index];
						if (accountInfo) {
							const addressLookupTableAccount = new AddressLookupTableAccount({
								key: new PublicKey(addressLookupTableAddress),
								state: AddressLookupTableAccount.deserialize(accountInfo.data),
							});
							acc.push(addressLookupTableAccount);
						}

						return acc;
					},
					new Array<AddressLookupTableAccount>()
				);
			};

			const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

			addressLookupTableAccounts.push(
				...(await getAdressLookupTableAccounts(addressLookupTableAddresses))
			);

			const latestBlockhash = await this._connection.getLatestBlockhash();
			const messageV0 = new TransactionMessage({
				payerKey: this._keypair.publicKey,
				recentBlockhash: latestBlockhash.blockhash,
				instructions: [swapInstruction],
			}).compileToV0Message(addressLookupTableAccounts);
			const transaction = new VersionedTransaction(messageV0);
			return transaction;
		} catch (e) {
			console.log("Jupiter error ------->", e);
			// console.log("Jupiter error ------->", (e as AxiosError).toJSON());
			return null;
		}
	}

	public async swap(transaction: VersionedTransaction) {
		logInfo({
			message: `Starting swap transaction ${transaction.signatures}`,
			meta,
		});
		const rawTransaction = transaction.serialize();
		const signature = await this._connection.sendRawTransaction(
			rawTransaction,
			{
				skipPreflight: true,
				maxRetries: 2,
			}
		);
		const latestBlockhash = await this._connection.getLatestBlockhash();
		logDebug({
			message: `Latest blockhash for swap transaction ${transaction.signatures}`,
			meta,
		});
		const result = await this._connection.confirmTransaction(
			{ signature, ...latestBlockhash },
			"confirmed"
		);
		logDebug({
			message: `Swap transaction result = ${JSON.stringify(
				result.value
			)} for signatures ${transaction.signatures}`,
			meta,
		});
		logInfo({
			message: `Finished swap transaction for signatures ${
				transaction.signatures
			} with result ${_.isNil(result.value.err) ? "success" : "error"}`,
			meta,
		});
		return {
			response: result.value,
			signature,
		};
	}

	public async getTokenList(): Promise<any[]> {
		if (this._nedConfig && this._nedConfig.name != PRODUCTION) {
			return Promise.resolve(list);
		} else {
			const req = await axios.get("https://token.jup.ag/all"); // https://token.jup.ag/all
			return req.data;
		}
	}
}
