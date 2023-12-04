import { mnemonicToSeedHex } from "@dreson4/react-native-quick-bip39";
import { ed25519 } from "@noble/curves/ed25519";
import {
	WalletNotConnectedError,
	WalletReadyState,
} from "@solana/wallet-adapter-base";
import {
	SolanaSignInInput,
	SolanaSignInOutput,
} from "@solana/wallet-standard-features";
import { createSignInMessage } from "@solana/wallet-standard-util";
import {
	Keypair,
	PublicKey,
	SendOptions,
	Signer,
	Transaction,
	TransactionSignature,
	VersionedTransaction,
} from "@solana/web3.js";
import _ from "lodash";
import { HDKey } from "micro-ed25519-hdkey";
import { Observable } from "rxjs";
import { ImportedWalletSolana, WalletFromMnemonic } from "../../wallet";
import { getConnection } from "./connection";
import { privateKeyToString } from "./keypair";
import { getTransactionsCountForAddress } from "./transactions";

export const getWalletsFromMnemonic = async (
	mnemonic: string,
	size = 10
): Promise<WalletFromMnemonic<Keypair>[]> => {
	const seed = mnemonicToSeedHex(mnemonic, "");
	const hd = HDKey.fromMasterSeed(seed);

	const wallets = _.map(new Array<number>(size), (v, index) => {
		return new Promise<WalletFromMnemonic<Keypair>>((resolve) => {
			const path = `m/44'/501'/${index}'/0'`;
			const keypair = Keypair.fromSeed(hd.derive(path).privateKey);
			const address = keypair.publicKey.toBase58();
			resolve({
				address: `${address.substring(0, 4)}...${address.substring(
					address.length - 4,
					address.length
				)}`,
				keypair,
			});
		});
	});

	return await Promise.all(wallets);
};

export const getWalletsFromMnemonicObservable = (
	mnemonic: string,
	size = 10,
	onlyWithTransactions = false
): Observable<ImportedWalletSolana | null> => {
	const seed = mnemonicToSeedHex(mnemonic, "");
	const hd = HDKey.fromMasterSeed(seed);

	return new Observable((subscriber) => {
		let count = 0;
		_.forEach(new Array<number>(size), (v, index) => {
			const path = `m/44'/501'/${index}'/0'`;
			const keypair = Keypair.fromSeed(hd.derive(path).privateKey);
			const address = keypair.publicKey.toBase58();

			getTransactionsCountForAddress(keypair.publicKey).then(
				(transactionCount) => {
					const wallet = {
						address: `${address.substring(0, 4)}...${address.substring(
							address.length - 4,
							address.length
						)}`,
						keypair,
					};

					if (onlyWithTransactions) {
						if (transactionCount > 0) {
							count += 1;
							subscriber.next({ wallet, transactionCount, mnemonic });
						} else {
							count += 1;
							subscriber.next(null);
						}
					} else {
						count += 1;
						subscriber.next({ wallet, transactionCount, mnemonic });
					}

					if (count == size) {
						subscriber.complete();
					}
				}
			);
		});
	});
};

export const getWalletsToImport = (
	selectedWalletsIndexes: number[],
	wallets: ImportedWalletSolana[]
) => {
	return _.map(selectedWalletsIndexes, (index) => {
		const secretKeyAsString: string = privateKeyToString(
			wallets[index].wallet.keypair.secretKey
		);
		return { keypair: secretKeyAsString, mnemonic: wallets[index].mnemonic };
	});
};

export const getNextWalletFromMnemonic = async (
	mnemonic: string,
	currentAddresses: string[]
): Promise<WalletFromMnemonic<Keypair> | null> => {
	const walletsFromMnemonic = await getWalletsFromMnemonic(mnemonic, 50);
	if (walletsFromMnemonic) {
		for (let i = 0; i < walletsFromMnemonic.length; i++) {
			const { address, keypair } = walletsFromMnemonic[i];
			const addressExists = _.find(
				currentAddresses,
				(x) => x == keypair.publicKey.toBase58()
			);
			if (addressExists) continue;
			else
				return {
					address: `${address.substring(0, 4)}...${address.substring(
						address.length - 4,
						address.length
					)}`,
					keypair,
				};
		}
	}

	return null;
};

export class Wallet {
	readonly payer: Keypair;

	constructor(payer: Keypair) {
		this.payer = payer;
	}

	async signTransaction(tx: Transaction) {
		tx.partialSign(this.payer);
		return tx;
	}
	async signAllTransactions(txs: Transaction[]) {
		return txs.map((t: Transaction) => {
			t.partialSign(this.payer);
			return t;
		});
	}
	get publicKey() {
		return this.payer.publicKey;
	}
}

export interface NedFinanceEvent {
	connect(...args: unknown[]): unknown;
	disconnect(...args: unknown[]): unknown;
	accountChanged(...args: unknown[]): unknown;
}

export interface NedFinanceEventEmitter {
	on<E extends keyof NedFinanceEvent>(
		event: E,
		listener: NedFinanceEvent[E],
		context?: any
	): void;
	off<E extends keyof NedFinanceEvent>(
		event: E,
		listener: NedFinanceEvent[E],
		context?: any
	): void;
}

export interface NedFinance extends NedFinanceEventEmitter {
	publicKey: PublicKey | null;
	isConnected: boolean;
	connect(options?: {
		onlyIfTrusted?: boolean;
	}): Promise<{ publicKey: PublicKey }>;
	disconnect(): Promise<void>;
	signAndSendTransaction<T extends Transaction | VersionedTransaction>(
		transaction: T,
		options?: SendOptions
	): Promise<{ signature: TransactionSignature }>;
	signTransaction<T extends Transaction | VersionedTransaction>(
		transaction: T
	): Promise<T>;
	signAllTransactions<T extends Transaction | VersionedTransaction>(
		transactions: T[]
	): Promise<T[]>;
	signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
	signIn(input?: SolanaSignInInput): Promise<SolanaSignInOutput>;
}

export class NedWallet implements NedFinance {
	// supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set([
	// 	"legacy",
	// 	0,
	// ]);

	private _keypair: Keypair;
	isConnected = false;

	constructor(keypair: Keypair) {
		this._keypair = keypair;
	}
	on<E extends keyof NedFinanceEvent>(
		event: E,
		listener: NedFinanceEvent[E],
		context?: any
	): void {
		throw new Error("Method not implemented.");
	}
	off<E extends keyof NedFinanceEvent>(
		event: E,
		listener: NedFinanceEvent[E],
		context?: any
	): void {
		throw new Error("Method not implemented.");
	}

	get connecting() {
		return false;
	}

	get publicKey() {
		return this._keypair && this._keypair.publicKey;
	}

	get readyState() {
		return WalletReadyState.Loadable;
	}

	async signAndSendTransaction<T extends Transaction | VersionedTransaction>(
		transaction: T,
		options?: SendOptions | undefined
	): Promise<{
		signature: string; //
	}> {
		// throw new Error("Method not implemented.");
		const connection = getConnection();
		const sendTx = async () => {
			if (transaction instanceof Transaction) {
				return await connection.sendTransaction(transaction, [], options);
			} else if (transaction instanceof VersionedTransaction) {
				return await connection.sendTransaction(transaction, options);
			}
		};

		const signature = await sendTx();
		if (signature) {
			return { signature };
		} else {
			throw new Error("Error sending transaction.");
		}

		// else const result2 = await connection.sendTransaction(transaction, options);
	}

	signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }> {
		if (!this._keypair) throw new WalletNotConnectedError();

		const signature = ed25519.sign(
			message,
			this._keypair.secretKey.slice(0, 32)
		);
		return Promise.resolve({ signature });
	}

	signIn(input: SolanaSignInInput): Promise<SolanaSignInOutput> {
		const domain = input.domain || window.location.host;
		const address = input.address || this._keypair!.publicKey.toBase58();

		if (!this._keypair) throw new WalletNotConnectedError();

		const signedMessage = createSignInMessage({
			...input,
			domain,
			address,
		});
		const signature = ed25519.sign(
			signedMessage,
			this._keypair.secretKey.slice(0, 32)
		);

		const result = {
			account: {
				address: this._keypair.publicKey.toBase58(),
				publicKey: this._keypair.publicKey.toBytes(),
				chains: [],
				features: [],
			},
			signedMessage,
			signature,
		};

		return Promise.resolve(result);
	}

	// on<E extends keyof NedFinanceEvent>(event: E, listener: NedFinanceEvent[E], context?: any): void {

	// }
	// off<E extends keyof NedFinanceEvent>(event: E, listener: NedFinanceEvent[E], context?: any): void {

	// }

	connect(options?: {
		onlyIfTrusted?: boolean;
	}): Promise<{ publicKey: PublicKey }> {
		// throw new Error('connect Method not implemented.');
		return Promise.resolve({ publicKey: this._keypair!.publicKey });
	}

	disconnect(): Promise<void> {
		return Promise.resolve();
	}

	signTransaction<T extends Transaction | VersionedTransaction>(
		transaction: T
	): Promise<T> {
		const signer = this._keypair! as Signer;
		if (transaction instanceof VersionedTransaction) {
			// console.log('transaction ===>', transaction.signatures)
			transaction.sign([signer]);
		} else {
			transaction.sign(signer);
		}
		return Promise.resolve(transaction);
	}

	signAllTransactions<T extends Transaction | VersionedTransaction>(
		transactions: T[]
	): Promise<T[]> {
		throw new Error("disconnect Method not implemented.");
	}
}
