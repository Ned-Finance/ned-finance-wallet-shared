import { AnchorProvider, BN, Idl, Program, web3 } from "@coral-xyz/anchor";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	TokenAccountNotFoundError,
	getAccount,
	getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {
	Connection,
	Keypair,
	PublicKey,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import _ from "lodash";
import * as shortuuid from "short-uuid";
import { match } from "ts-pattern";
import { SolanaConfig } from "../../../config";
import { appLogger, logDebug, logException, logInfo } from "../../../logging";
import { roundToNDecimals } from "../../../numbers";
import {
	createAtaAndFundTx,
	createAtaTxIfDoesntExist,
	getATAForAddress,
	getMintAccount,
} from "../accounts";
import { JupiterManager, SwapResponse } from "../jupiter";
import { Token } from "../tokens";
import { getTransactionsForAddress } from "../transactions";
import {
	getSendTransaction,
	mergeTransactions,
	sendTransaction,
} from "../transactions/helpers";
import { Wallet } from "../wallets";
import { MeteoraManager, MeteoraVaultInfo } from "./meteora";

export type SavingsManagerConfig = {
	connection: Connection;
	keypair: Keypair;
	solanaConfig: SolanaConfig;
	tokens: Token[];
};

export type CreateVaultSuccess = {
	tx: string;
};

export type UpdateVaultSuccess = CreateVaultSuccess;
export type FundVaultSuccess = CreateVaultSuccess;
export type WithdrawVaultSuccess = CreateVaultSuccess;
export type DeleteVaultSuccess = CreateVaultSuccess;

export type VaultError = {
	error: true;
	message: string;
};

export type Vault = {
	name: string;
	tokenAddress: string;
	ownerAddress: string;
	accountAddress: string;
	tokenDecimals: number;
	logoURI: string;
	symbol: string;
	spare: number;
	balance: number;
	identifier: string;
	earningsEnabled: boolean;
	earningsData?: VaultEarningsData;
	vaultInfo: MeteoraVaultInfo;
};

export type VaultEarningsData = {
	amountInTokens: number;
	amountLpTokens: number;
	lpTokenDecimals: number;
	virtualPrice: number;
	oneHourAPY: number;
	averageAPY: number;
	sevenDaysAPY: number;
};

export type VaultEarningsDataError = {
	error: true;
	message: string;
	type: "vault_not_loaded" | "user_not_active" | "unknown";
};

export type VaultTransaction = {
	tx: string;
	type: "deposit" | "withdraw";
	amount: bigint;
	amountParsed: number;
};

export class ProvideLiquidityError extends Error {}

const meta = {
	file: "blockchain/solana/vaults/program.ts",
};

export class VaultsManager {
	private _connection: Connection;
	private _keypair: Keypair;
	private _tokens: Token[];
	private _solanaConfig: SolanaConfig;
	private _wallet: Wallet;
	private _programId: PublicKey;
	private _provider: AnchorProvider;
	private _idl!: Idl | null;
	private _anchorProgram!: Program;
	private _dataAccount!: PublicKey;
	private readonly _VAULTS_PDA_DATA = Buffer.from("VAULTS_PDA_DATA");
	private readonly _VAULTS_PDA_ACCOUNT = Buffer.from("VAULTS_PDA_ACCOUNT");
	private readonly _VAULTS_PDA_ACCOUNT_OWNER = Buffer.from(
		"VAULTS_PDA_ACCOUNT_OWNER"
	);
	private readonly _LEDGER_PDA_DATA = Buffer.from("LEDGER_PDA_DATA");

	private _meteoraManager: MeteoraManager;

	constructor(config: SavingsManagerConfig) {
		this._connection = config.connection;
		this._keypair = config.keypair;
		this._solanaConfig = config.solanaConfig;
		this._tokens = config.tokens;
		this._wallet = new Wallet(this._keypair);
		this._programId = new PublicKey(this._solanaConfig.VAULT_PROGRAM_ADDRESS);
		this._provider = new AnchorProvider(this._connection, this._wallet, {
			preflightCommitment: "recent",
		});
		this._meteoraManager = new MeteoraManager(config);
	}

	get tokens(): Token[] {
		return this._tokens.filter(
			(token) =>
				this._solanaConfig.SAVING_VAULTS_ALLOWED_TOKENS.find(
					(allowedToken) => token.address == allowedToken
				) != undefined
		);
	}

	async sync() {
		this._idl = await Program.fetchIdl(this._programId, this._provider);
		if (!this._idl) {
			console.log("No idl found");
			return false;
		}
		this._anchorProgram = new Program(
			this._idl!,
			this._programId,
			this._provider
		);
		const [dataAccount] = PublicKey.findProgramAddressSync(
			[this._VAULTS_PDA_DATA, this._keypair.publicKey.toBuffer()],
			this._programId
		);
		this._dataAccount = dataAccount;

		return true;
	}

	getSpareObject(spare: number) {
		return match(spare)
			.when(
				(value) => value == 0,
				(value) => {
					return { none: {} };
				}
			)
			.when(
				(value) => value == 1,
				(value) => {
					return { spare: {} };
				}
			)
			.when(
				(value) => value == 2,
				(value) => {
					return { spare2X: {} };
				}
			)
			.when(
				(value) => value == 3,
				(value) => {
					return { spare3X: {} };
				}
			)
			.run();
	}

	getVaultAccount(identifierBuffer: Buffer) {
		const [vaultAccount] = PublicKey.findProgramAddressSync(
			[
				this._VAULTS_PDA_ACCOUNT,
				this._keypair.publicKey.toBuffer(),
				identifierBuffer,
			],
			this._programId
		);

		return vaultAccount;
	}

	getVaultAccountOwner(identifierBuffer: Buffer) {
		const [vaultAccountOwner] = PublicKey.findProgramAddressSync(
			[
				this._VAULTS_PDA_ACCOUNT_OWNER,
				this._keypair.publicKey.toBuffer(),
				identifierBuffer,
			],
			this._programId
		);
		return vaultAccountOwner;
	}

	getLedgerAccount() {
		const [ledgerData] = PublicKey.findProgramAddressSync(
			[this._LEDGER_PDA_DATA, this._keypair.publicKey.toBuffer()],
			this._programId
		);

		return ledgerData;
	}

	async createVault(
		name: string,
		tokenAddress: string,
		spare: number,
		earningsEnabled: boolean
	): Promise<CreateVaultSuccess | VaultError> {
		await this.sync();

		const accountNameBuffer = Buffer.from(name);
		const identifierBuffer = Buffer.from(shortuuid.generate());
		const spareEnum = this.getSpareObject(spare);
		const vaultAccount = this.getVaultAccount(identifierBuffer);
		const vaultAccountOwner = this.getVaultAccountOwner(identifierBuffer);

		try {
			const tx = await this._anchorProgram.methods
				.createVault(
					accountNameBuffer,
					identifierBuffer,
					spareEnum,
					earningsEnabled
				)
				.accounts({
					owner: this._keypair.publicKey,
					dataAccount: this._dataAccount,
					vaultAccount: vaultAccount,
					vaultAccountOwner,
					mint: new PublicKey(tokenAddress),
					systemProgram: web3.SystemProgram.programId,
					tokenProgram: TOKEN_PROGRAM_ID,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
					rent: web3.SYSVAR_RENT_PUBKEY,
				})
				.signers([this._keypair])
				.rpc();
			return { tx };
		} catch (error) {
			console.log("error", error);
			const unknowErrorMessage = "Unexpected error. Code: E0";
			if (error instanceof Error) {
				if (error.message.indexOf("no record of a prior credit") > -1)
					return { error: true, message: "No SOL funds to deposit" };
			}
			return { error: true, message: unknowErrorMessage };
		}
	}

	async updateVaultTx(
		vault: Vault,
		name: string,
		tokenAddress: string,
		spare: number,
		earningsEnabled: boolean
	): Promise<VersionedTransaction> {
		await this.sync();
		const accountNameBuffer = Buffer.from(name.toString());
		const identifierBuffer = Buffer.from(vault.identifier);
		const spareEnum = this.getSpareObject(spare);
		const vaultAccount = this.getVaultAccount(identifierBuffer);
		const vaultAccountOwner = this.getVaultAccountOwner(identifierBuffer);

		const instruction = await this._anchorProgram.methods
			.updateVault(
				identifierBuffer,
				accountNameBuffer,
				spareEnum,
				earningsEnabled
			)
			.accounts({
				owner: this._keypair.publicKey,
				dataAccount: this._dataAccount,
				vaultAccount: vaultAccount,
				vaultAccountOwner,
				mint: new PublicKey(tokenAddress),
			})
			.signers([this._keypair])
			.instruction();

		const latestBlockhash = await this._connection.getLatestBlockhash();

		const messageV0 = new TransactionMessage({
			payerKey: this._keypair.publicKey,
			recentBlockhash: latestBlockhash.blockhash,
			instructions: [instruction],
		}).compileToV0Message();

		const transaction = new VersionedTransaction(messageV0);
		transaction.sign([this._keypair]);

		return transaction;
	}

	async updateVault(
		vault: Vault,
		name: string,
		tokenAddress: string,
		spare: number,
		earningsEnabled: boolean
	): Promise<UpdateVaultSuccess | VaultError> {
		await this.sync();

		const accountNameBuffer = Buffer.from(name.toString());
		const identifierBuffer = Buffer.from(vault.identifier);
		const spareEnum = this.getSpareObject(spare);
		const vaultAccount = this.getVaultAccount(identifierBuffer);
		const vaultAccountOwner = this.getVaultAccountOwner(identifierBuffer);

		try {
			const tx = await this._anchorProgram.methods
				.updateVault(
					identifierBuffer,
					accountNameBuffer,
					spareEnum,
					earningsEnabled
				)
				.accounts({
					owner: this._keypair.publicKey,
					dataAccount: this._dataAccount,
					vaultAccount: vaultAccount,
					vaultAccountOwner,
					mint: new PublicKey(tokenAddress),
				})
				.signers([this._keypair])
				.rpc();
			return { tx };
		} catch (error) {
			console.log("error", error);
			const unknowErrorMessage = "Unexpected error. Code: E0";
			if (error instanceof Error) {
				if (error.message.indexOf("no record of a prior credit") > -1)
					return { error: true, message: "No SOL funds to deposit" };
			}
			return { error: true, message: unknowErrorMessage };
		}
	}

	async deleteVault(vault: Vault): Promise<DeleteVaultSuccess | VaultError> {
		await this.sync();

		const identifierBuffer = Buffer.from(vault.identifier);
		const vaultAccount = this.getVaultAccount(identifierBuffer);
		const vaultAccountOwner = this.getVaultAccountOwner(identifierBuffer);

		const mint = new PublicKey(vault.tokenAddress);
		const mintAta = await getOrCreateAssociatedTokenAccount(
			this._connection,
			this._keypair,
			mint,
			this._keypair.publicKey
		);

		try {
			const tx = await this._anchorProgram.methods
				.deleteVault(identifierBuffer)
				.accounts({
					owner: this._keypair.publicKey,
					dataAccount: this._dataAccount,
					vaultAccount,
					vaultAccountOwner,
					mint,
					userTokenAccount: mintAta.address,
				})
				.signers([this._keypair])
				.rpc();
			return { tx };
		} catch (error) {
			console.log("error", error);
			const unknowErrorMessage = "Unexpected error. Code: E0";
			if (error instanceof Error) {
				if (error.message.indexOf("no record of a prior credit") > -1)
					return { error: true, message: "No SOL funds to deposit" };
			}
			return { error: true, message: unknowErrorMessage };
		}
	}

	async loadVaults(): Promise<Vault[]> {
		await this.sync();
		try {
			const account = await this._anchorProgram.account.vaultManager.fetch(
				this._dataAccount
			);

			const vaults = (account.accounts as any[])
				.filter((loadedVault) => {
					return loadedVault.nameLength > 0;
				})
				.map((loadedVault) => {
					return {
						name: Buffer.from(
							loadedVault.name.slice(0, loadedVault.nameLength)
						).toString(),
						tokenAddress: loadedVault.tokenPubKey.toString(),
						accountAddress: loadedVault.pubKey.toString(),
						spare: loadedVault.spareType,
						identifier: Buffer.from(loadedVault.identifier).toString(),
						balance: 0,
						earningsEnabled: loadedVault.earningsEnabled,
						ownerAddress: loadedVault.ownerPubKey.toString(),
					} as Vault;
				});

			const vaultsWithBalance = await Promise.all(
				vaults.map((vault) => {
					return new Promise<Vault>(async (resolve, reject) => {
						const account = await getAccount(
							this._connection,
							new PublicKey(vault.accountAddress)
						);
						const mint = await getMintAccount(vault.tokenAddress);
						resolve({
							...vault,
							balance: Number(account.amount),
							tokenDecimals: mint.decimals,
						});
					});
				})
			);

			const vaultsWithTokenLogo = vaultsWithBalance.map((vault) => {
				const token = _.find(
					this.tokens,
					(token: Token) => token.address == vault.tokenAddress
				);
				if (token)
					return { ...vault, symbol: token.symbol, logoURI: token.logoURI };
				else return vault;
			});

			const getVaultsData = async () => {
				const vaultsUniqueTokens = _.uniq(
					vaultsWithTokenLogo.map((vault) => vault.tokenAddress)
				);
				const vaultInfoPromises: MeteoraVaultInfo[] = (
					await Promise.all(
						vaultsUniqueTokens.map((tokenAddress) => {
							return this._meteoraManager.getMeteoraVaultInfo(tokenAddress);
						})
					)
				).filter((vaultInfo) => vaultInfo != undefined) as MeteoraVaultInfo[];
				const vaultsData = await Promise.all(
					vaultsWithTokenLogo.map((vault) => {
						const vaultInfo = vaultInfoPromises.find(
							(vaultInfo) => vaultInfo.token_address == vault.tokenAddress
						);
						if (vaultInfo) {
							if (vault.earningsEnabled) {
								return this._calculateVaultInvestmentData(vault, vaultInfo);
							} else {
								return Promise.resolve({
									amountInTokens: 0,
									amountLpTokens: 0,
									lpTokenDecimals: 0,
									virtualPrice: Number(vaultInfo.virtual_price),
									oneHourAPY: vaultInfo.closest_apy,
									averageAPY: vaultInfo.average_apy,
									sevenDaysAPY: vaultInfo.long_apy,
								} as VaultEarningsData);
							}
						} else {
							return Promise.resolve(undefined);
						}
					})
				);

				return vaultsData;
			};

			const vaultsData = await getVaultsData();
			// console.log('vaultsData', vaultsData)

			const vaultsWithInvestmentData = vaultsWithTokenLogo.map(
				(vault: Vault, index: number) => {
					const vaultData = vaultsData[index];
					const vaultDataOrUndefined = !_.isUndefined(vaultData)
						? !("error" in vaultData)
							? vaultData
							: undefined
						: undefined;

					const getBalance = () => {
						if (vault.earningsEnabled) {
							if (vaultDataOrUndefined) {
								return vaultDataOrUndefined?.amountInTokens ?? 0;
							} else {
								return 0;
							}
						} else {
							return roundToNDecimals(
								vault.balance / Math.pow(10, vault.tokenDecimals),
								2
							);
						}
					};

					return {
						...vault,
						earningsData: vaultDataOrUndefined,
						balance: getBalance(),
					};
				}
			);

			return vaultsWithInvestmentData;
		} catch (e) {
			console.log("e- aca?-->", e);
			return [];
		}
	}

	async saveOnLedgerTx(
		vault: Vault,
		userTokenAccount: PublicKey
	): Promise<VersionedTransaction> {
		const ledgerData = this.getLedgerAccount();
		const mint = new PublicKey(vault.tokenAddress);

		const accounts = {
			owner: this._keypair.publicKey,
			mint,
			userTokenAccount,
			ledgerData,
			systemProgram: web3.SystemProgram.programId,
			rent: web3.SYSVAR_RENT_PUBKEY,
		};

		const instruction = await this._anchorProgram.methods
			.saveAccountBalance()
			.accounts(accounts)
			.signers([this._keypair])
			.instruction();
		const latestBlockhash = await this._connection.getLatestBlockhash();

		const messageV0 = new TransactionMessage({
			payerKey: this._keypair.publicKey,
			recentBlockhash: latestBlockhash.blockhash,
			instructions: [instruction],
		}).compileToV0Message();

		const transaction = new VersionedTransaction(messageV0);
		transaction.sign([this._keypair]);

		return transaction;
	}

	async provideLiquidityTx(
		vault: Vault,
		amount: number
	): Promise<VersionedTransaction> {
		const identifierBuffer = Buffer.from(vault.identifier);
		const vaultAccount = this.getVaultAccount(identifierBuffer);
		const vaultAccountOwner = this.getVaultAccountOwner(identifierBuffer);
		const mint = new PublicKey(vault.tokenAddress);

		const meteoraAccounts = await this._meteoraManager.getMeteoraAccounts(
			vault.tokenAddress,
			vaultAccountOwner
		);

		if (meteoraAccounts) {
			const accounts = {
				...{
					owner: this._keypair.publicKey,
					dataAccount: this._dataAccount,
					vaultAccount: vaultAccount,
					vaultAccountOwner: vaultAccountOwner,
					mint,
					user: vaultAccountOwner,
					userToken: vaultAccount,
					tokenProgram: TOKEN_PROGRAM_ID,
				},
				...meteoraAccounts,
			};

			const instruction = await this._anchorProgram.methods
				.depositLiquidity(identifierBuffer, new BN(amount))
				.accounts(accounts)
				.signers([this._keypair])
				.instruction();

			const latestBlockhash = await this._connection.getLatestBlockhash();

			const messageV0 = new TransactionMessage({
				payerKey: this._keypair.publicKey,
				recentBlockhash: latestBlockhash.blockhash,
				instructions: [instruction],
			}).compileToV0Message();

			const transaction = new VersionedTransaction(messageV0);
			transaction.sign([this._keypair]);

			return transaction;
		} else {
			throw new ProvideLiquidityError();
		}
	}

	async provideLiquidityWithDiffBalanceTx(
		vault: Vault
	): Promise<VersionedTransaction> {
		const identifierBuffer = Buffer.from(vault.identifier);
		const vaultAccount = this.getVaultAccount(identifierBuffer);
		const vaultAccountOwner = this.getVaultAccountOwner(identifierBuffer);
		const ledgerData = this.getLedgerAccount();
		const mint = new PublicKey(vault.tokenAddress);

		const meteoraAccounts = await this._meteoraManager.getMeteoraAccounts(
			vault.tokenAddress,
			vaultAccountOwner
		);

		if (meteoraAccounts) {
			const accounts = {
				...{
					owner: this._keypair.publicKey,
					dataAccount: this._dataAccount,
					vaultAccount: vaultAccount,
					vaultAccountOwner: vaultAccountOwner,
					mint,
					user: vaultAccountOwner,
					userToken: vaultAccount,
					tokenProgram: TOKEN_PROGRAM_ID,
					ledgerData,
				},
				...meteoraAccounts,
			};

			const instruction = await this._anchorProgram.methods
				.depositLiquidityWithDiffBalance(identifierBuffer)
				.accounts(accounts)
				.signers([this._keypair])
				.instruction();

			const latestBlockhash = await this._connection.getLatestBlockhash();

			const messageV0 = new TransactionMessage({
				payerKey: this._keypair.publicKey,
				recentBlockhash: latestBlockhash.blockhash,
				instructions: [instruction],
			}).compileToV0Message();

			const transaction = new VersionedTransaction(messageV0);
			transaction.sign([this._keypair]);

			return transaction;
		} else {
			throw new ProvideLiquidityError();
		}
	}

	async provideLiquidity(
		vault: Vault,
		amount: number
	): Promise<FundVaultSuccess | VaultError> {
		try {
			await this.sync();
			const amountWithDecimals = amount * Math.pow(10, vault.tokenDecimals);
			const provideLiquidityTx = await this.provideLiquidityTx(
				vault,
				amountWithDecimals
			);

			const tx = await sendTransaction(provideLiquidityTx);

			return { tx };
		} catch (error) {
			console.log("error", error);
			const unknowErrorMessage = "Unexpected error. Code: E0";
			return { error: true, message: unknowErrorMessage };
		}
	}

	async fundWithDiffBalanceTx(
		vault: Vault,
		userTokenAccount: PublicKey
	): Promise<VersionedTransaction> {
		const identifierBuffer = Buffer.from(vault.identifier);
		const vaultAccount = this.getVaultAccount(identifierBuffer);
		const vaultAccountOwner = this.getVaultAccountOwner(identifierBuffer);
		const ledgerData = this.getLedgerAccount();
		const mint = new PublicKey(vault.tokenAddress);

		const accounts = {
			owner: this._keypair.publicKey,
			dataAccount: this._dataAccount,
			mint,
			vaultAccountOwner: vaultAccountOwner,
			vaultAccount: vaultAccount,
			userTokenAccount,
			ledgerData,
			tokenProgram: TOKEN_PROGRAM_ID,
		};

		const instruction = await this._anchorProgram.methods
			.depositToVaultWithDiffBalance(identifierBuffer)
			.accounts(accounts)
			.signers([this._keypair])
			.instruction();

		const latestBlockhash = await this._connection.getLatestBlockhash();

		const messageV0 = new TransactionMessage({
			payerKey: this._keypair.publicKey,
			recentBlockhash: latestBlockhash.blockhash,
			instructions: [instruction],
		}).compileToV0Message();

		const transaction = new VersionedTransaction(messageV0);
		transaction.sign([this._keypair]);

		return transaction;
	}

	async fundTx(
		fromAddress: string,
		vault: Vault,
		amount: number
	): Promise<VersionedTransaction> {
		const transactionTransfer = await getSendTransaction({
			fromAddress,
			mint: vault.tokenAddress,
			decimals: vault.tokenDecimals,
			signer: this._keypair,
			feePayer: this._keypair.publicKey,
			toAddress: vault.accountAddress,
			amount,
			tokenAddress: vault.tokenAddress,
		});

		return transactionTransfer;
	}

	async fund(
		fromAddress: string,
		vault: Vault,
		amount: number
	): Promise<FundVaultSuccess | VaultError> {
		try {
			const amountWithDecimals = amount * Math.pow(10, vault.tokenDecimals);
			const transactionTransfer = await this.fundTx(
				fromAddress,
				vault,
				amountWithDecimals
			);

			const tx = await sendTransaction(transactionTransfer);

			return { tx };
		} catch (error) {
			console.log("error", error);
			const unknowErrorMessage = "Unexpected error. Code: E0";
			return { error: true, message: unknowErrorMessage };
		}
	}

	async fundAndProvideLiquidityWithDiffBalanceTx(
		vault: Vault,
		userTokenAccount: PublicKey
	): Promise<VersionedTransaction> {
		await this.sync();

		const fundTx = await this.fundWithDiffBalanceTx(vault, userTokenAccount);

		const provideLiquidityTx = await this.provideLiquidityWithDiffBalanceTx(
			vault
		);

		console.log("provideLiquidityTx", provideLiquidityTx);

		const mergedTransaction = await mergeTransactions(this._keypair.publicKey, [
			fundTx,
			provideLiquidityTx,
		]);
		mergedTransaction.sign([this._keypair]);
		console.log("mergedTransaction", mergedTransaction);

		return mergedTransaction;
	}

	async fundAndProvideLiquidityTx(
		fromAddress: string,
		vault: Vault,
		amount: number
	): Promise<VersionedTransaction> {
		await this.sync();

		const fundTx = await this.fundTx(fromAddress, vault, amount);

		console.log("fundTx", fundTx);

		const provideLiquidityTx = await this.provideLiquidityTx(vault, amount);

		console.log("provideLiquidityTx", provideLiquidityTx);

		const mergedTransaction = await mergeTransactions(this._keypair.publicKey, [
			fundTx,
			provideLiquidityTx,
		]);
		mergedTransaction.sign([this._keypair]);
		console.log("mergedTransaction", mergedTransaction);

		return mergedTransaction;
	}

	async fundAndProvideLiquidity(
		fromAddress: string,
		vault: Vault,
		amount: number
	): Promise<FundVaultSuccess | VaultError> {
		try {
			const amountWithDecimals = amount * Math.pow(10, vault.tokenDecimals);
			const mergedTransaction = await this.fundAndProvideLiquidityTx(
				fromAddress,
				vault,
				amountWithDecimals
			);

			const final = await sendTransaction(mergedTransaction);

			return { tx: final };
		} catch (error) {
			console.log("error", error);
			const unknowErrorMessage = "Unexpected error. Code: E0";
			return { error: true, message: unknowErrorMessage };
		}
	}

	async withdrawTx(
		toAddress: string,
		vault: Vault,
		amount: number
	): Promise<VersionedTransaction> {
		const identifierBuffer = Buffer.from(vault.identifier);
		const vaultAccount = this.getVaultAccount(identifierBuffer);
		const vaultAccountOwner = this.getVaultAccountOwner(identifierBuffer);

		const mint = new PublicKey(vault.tokenAddress);

		const instruction = await this._anchorProgram.methods
			.withdrawFromVault(identifierBuffer, new BN(amount))
			.accounts({
				owner: this._keypair.publicKey,
				dataAccount: this._dataAccount,
				vaultAccount,
				vaultAccountOwner,
				mint,
				userTokenAccount: toAddress,
				tokenProgram: TOKEN_PROGRAM_ID,
			})
			.signers([this._keypair])
			.instruction();

		const latestBlockhash = await this._connection.getLatestBlockhash();

		const messageV0 = new TransactionMessage({
			payerKey: this._keypair.publicKey,
			recentBlockhash: latestBlockhash.blockhash,
			instructions: [instruction],
		}).compileToV0Message();

		const transaction = new VersionedTransaction(messageV0);
		transaction.sign([this._keypair]);

		return transaction;
	}

	async withdraw(
		toAddress: string,
		vault: Vault,
		amount: number,
		isNative: boolean
	): Promise<WithdrawVaultSuccess | VaultError> {
		await this.sync();

		try {
			const transactionTransfer = await this.withdrawTx(
				toAddress,
				vault,
				amount
			);

			const tx = await sendTransaction(transactionTransfer);

			return { tx };
		} catch (error) {
			console.log("error", error);
			const unknowErrorMessage = "Unexpected error. Code: E0";
			return { error: true, message: unknowErrorMessage };
		}
	}

	async withdrawLiquidityTx(
		vault: Vault,
		amount: number
	): Promise<VersionedTransaction> {
		await this.sync();

		const identifierBuffer = Buffer.from(vault.identifier);
		const vaultAccount = this.getVaultAccount(identifierBuffer);
		const vaultAccountOwner = this.getVaultAccountOwner(identifierBuffer);
		const mint = new PublicKey(vault.tokenAddress);

		const meteoraAccounts = await this._meteoraManager.getMeteoraAccounts(
			vault.tokenAddress,
			vaultAccountOwner
		);

		if (meteoraAccounts) {
			const accounts = {
				...{
					owner: this._keypair.publicKey,
					dataAccount: this._dataAccount,
					vaultAccount: vaultAccount,
					vaultAccountOwner,
					mint,
					user: vaultAccountOwner,
					userToken: vaultAccount,
					tokenProgram: TOKEN_PROGRAM_ID,
				},
				...meteoraAccounts,
			};

			const instruction = await this._anchorProgram.methods
				.withdrawLiquidity(identifierBuffer, new BN(amount))
				.accounts(accounts)
				.signers([this._keypair])
				.instruction();

			const latestBlockhash = await this._connection.getLatestBlockhash();

			const messageV0 = new TransactionMessage({
				payerKey: this._keypair.publicKey,
				recentBlockhash: latestBlockhash.blockhash,
				instructions: [instruction],
			}).compileToV0Message();

			const transaction = new VersionedTransaction(messageV0);
			transaction.sign([this._keypair]);

			return transaction;
		} else {
			throw new ProvideLiquidityError();
		}
	}

	async withdrawLiquidity(
		vault: Vault,
		amount: number
	): Promise<WithdrawVaultSuccess | VaultError> {
		try {
			await this.sync();
			const withdrawLiquidityTx = await this.withdrawLiquidityTx(vault, amount);

			const tx = await sendTransaction(withdrawLiquidityTx);

			return { tx };
		} catch (error) {
			console.log("error", error);
			const unknowErrorMessage = "Unexpected error. Code: E0";
			return { error: true, message: unknowErrorMessage };
		}
	}

	async withdrawLiquidityAndWithdraw(
		mainAddress: string,
		toAddress: string,
		vault: Vault,
		amountInLpTokens: number,
		amount: number,
		isNative: boolean = false
	): Promise<WithdrawVaultSuccess | VaultError> {
		try {
			logInfo({
				message: `Requesting withdraw (liquidity enabled) of ${amount}`,
				meta,
			});

			await this.sync();
			const amountWithDecimals = amount * Math.pow(10, vault.tokenDecimals);

			const preTransactions = await createAtaAndFundTx(
				mainAddress,
				vault.tokenAddress,
				mainAddress,
				amount,
				this._keypair
			);

			const withdrawLiquidityTx = await this.withdrawLiquidityTx(
				vault,
				amountInLpTokens
			);

			console.log("withdrawLiquidityTx", withdrawLiquidityTx, amountInLpTokens);

			const withdrawTx = await this.withdrawTx(
				toAddress,
				vault,
				amountWithDecimals
			);

			console.log("withdrawTx ===>", withdrawTx);

			const mergedTransaction = await mergeTransactions(
				this._keypair.publicKey,
				[...preTransactions, withdrawLiquidityTx, withdrawTx]
			);
			mergedTransaction.sign([this._keypair]);
			console.log("mergedTransaction", mergedTransaction);

			const final = await sendTransaction(mergedTransaction);

			return { tx: final };
		} catch (error) {
			console.log("error ===>", error);
			logException({
				message: "Error sending withdraw with liquidity",
				capturedError: error as Error,
				meta,
			});
			const unknowErrorMessage = "Unexpected error. Code: E0";
			return { error: true, message: unknowErrorMessage };
		}
	}

	async updateVaultAndMoveAllToLiquidity(
		vault: Vault,
		name: string,
		tokenAddress: string,
		spare: number,
		earningsEnabled: boolean
	): Promise<UpdateVaultSuccess | VaultError> {
		try {
			await this.sync();
			// const amountWithDecimals = amount * Math.pow(10, vault.tokenDecimals)
			const updateVaultTx = await this.updateVaultTx(
				vault,
				name,
				tokenAddress,
				spare,
				earningsEnabled
			);

			const vaultAccount = await getAccount(
				this._connection,
				new PublicKey(vault.accountAddress)
			);

			console.log("updateVaultTx", updateVaultTx, vaultAccount);

			const provideLiquidityTx = await this.provideLiquidityTx(
				vault,
				Number(vaultAccount.amount)
			);

			console.log("provideLiquidityTx", provideLiquidityTx);

			const mergedTransaction = await mergeTransactions(
				this._keypair.publicKey,
				[updateVaultTx, provideLiquidityTx]
			);
			mergedTransaction.sign([this._keypair]);

			const final = await sendTransaction(mergedTransaction);

			return { tx: final };
		} catch (error) {
			console.log("error", error);
			const unknowErrorMessage = "Unexpected error. Code: E0";
			return { error: true, message: unknowErrorMessage };
		}
	}

	async updateVaultAndWithdrawAllFromLiquidity(
		vault: Vault,
		name: string,
		tokenAddress: string,
		spare: number,
		earningsEnabled: boolean
	): Promise<UpdateVaultSuccess | VaultError> {
		try {
			await this.sync();

			const meteoraVaultInfo = await this._meteoraManager.getMeteoraVaultInfo(
				vault.tokenAddress
			);

			const meteoraVaultLpMint = new PublicKey(meteoraVaultInfo!.lp_mint);
			const userLPTokenAddress = getATAForAddress(
				meteoraVaultLpMint.toBase58(),
				vault.ownerAddress,
				true
			);

			const userLPTokenAccount = await getAccount(
				this._connection,
				new PublicKey(userLPTokenAddress)
			);

			const withdrawLiquidity = await this.withdrawLiquidityTx(
				vault,
				Number(userLPTokenAccount.amount)
			);
			console.log("withdrawLiquidity", withdrawLiquidity);

			const updateVaultTx = await this.updateVaultTx(
				vault,
				name,
				tokenAddress,
				spare,
				earningsEnabled
			);

			const mergedTransaction = await mergeTransactions(
				this._keypair.publicKey,
				[withdrawLiquidity, updateVaultTx]
			);
			mergedTransaction.sign([this._keypair]);

			const final = await sendTransaction(mergedTransaction);

			return { tx: final };
		} catch (error) {
			console.log("error", error);
			const unknowErrorMessage = "Unexpected error. Code: E0";
			return { error: true, message: unknowErrorMessage };
		}
	}

	async _calculateVaultInvestmentData(
		vault: Vault,
		meteoraVaultInfo: MeteoraVaultInfo
	): Promise<VaultEarningsData | VaultEarningsDataError> {
		const identifierBuffer = Buffer.from(vault.identifier);
		const meteoraVaultLpMint = new PublicKey(meteoraVaultInfo.lp_mint);
		const vaultAccountOwner = this.getVaultAccountOwner(identifierBuffer);

		const userLPTokenAddress = getATAForAddress(
			meteoraVaultLpMint.toBase58(),
			vaultAccountOwner.toBase58(),
			true
		);

		try {
			const userLPTokenAccount = await getAccount(
				this._connection,
				new PublicKey(userLPTokenAddress)
			);
			console.log("userLPTokenAccount", userLPTokenAccount);
			if (userLPTokenAccount.isInitialized) {
				const meteoraUserLpTokenPromise = getOrCreateAssociatedTokenAccount(
					this._connection,
					this._keypair,
					meteoraVaultLpMint,
					vaultAccountOwner,
					true
				);

				const meteoraVaultLpMintAccountPromise = getMintAccount(
					meteoraVaultLpMint.toBase58()
				);

				const [meteoraUserLpToken, meteoraVaultLpMintAccount] =
					await Promise.all([
						meteoraUserLpTokenPromise,
						meteoraVaultLpMintAccountPromise,
					]);

				const amountInLpTokens =
					Number(meteoraUserLpToken.amount) / Math.pow(10, vault.tokenDecimals);
				const virtualPrice = Number(meteoraVaultInfo.virtual_price);
				const amountInTokens = roundToNDecimals(
					amountInLpTokens * virtualPrice,
					2
				);

				const oneHourAPY = meteoraVaultInfo.closest_apy;
				const averageAPY = meteoraVaultInfo.average_apy;
				const sevenDaysAPY = meteoraVaultInfo.long_apy;
				const amountLpTokens = Number(meteoraUserLpToken.amount);

				return {
					amountInTokens: amountInTokens,
					amountLpTokens,
					lpTokenDecimals: meteoraVaultLpMintAccount.decimals,
					virtualPrice,
					oneHourAPY,
					averageAPY,
					sevenDaysAPY,
				};
			} else {
				return {
					error: true,
					message: "Vault not initialized",
					type: "user_not_active",
				};
			}
		} catch (error) {
			console.log("error", error);
			if (TokenAccountNotFoundError instanceof TokenAccountNotFoundError) {
				return {
					error: true,
					message: "Vault not initialized",
					type: "user_not_active",
				};
			} else {
				return {
					error: true,
					message: "Unknown error",
					type: "unknown",
				};
			}
		}
	}

	async getInvestmentsData(
		vault: Vault
	): Promise<VaultEarningsData | VaultEarningsDataError> {
		await this.sync();

		const meteoraVaultInfo = await this._meteoraManager.getMeteoraVaultInfo(
			vault.tokenAddress
		);

		if (meteoraVaultInfo) {
			const result = await this._calculateVaultInvestmentData(
				vault,
				meteoraVaultInfo
			);

			return result;
		} else {
			return {
				error: true,
				message: "Couldn't load data from vault",
				type: "vault_not_loaded",
			};
		}
	}

	async getTokenAPY(tokenAddress: string) {
		const meteoraVaultInfo = await this._meteoraManager.getMeteoraVaultInfo(
			tokenAddress
		);
		return meteoraVaultInfo?.average_apy;
	}

	async getUpdatedBalance(vault: Vault) {
		if (vault.earningsEnabled) {
			const investmentData = await this.getInvestmentsData(vault);
			if (!("error" in investmentData)) {
				return investmentData.amountInTokens;
			} else {
				return null;
			}
		} else {
			const vaultAccount = await getAccount(
				this._connection,
				new PublicKey(vault.accountAddress)
			);
			return roundToNDecimals(
				Number(
					(vaultAccount.amount * BigInt(100)) /
						BigInt(Math.pow(10, vault.tokenDecimals))
				) / 100,
				2
			);
		}
	}

	async getTransactions(
		vault: Vault,
		walletAddress: string,
		latestSignature?: string
	): Promise<{
		transactions: VaultTransaction[];
		latestSignature?: string;
	}> {
		appLogger.info(
			`Loading transactions of vault address ${vault.accountAddress}`
		);

		const before = _.isEmpty(latestSignature)
			? {}
			: { before: latestSignature };
		//     const connection = getConnection()
		// const signatures = await this._connection.getSignaturesForAddress(
		// 	new PublicKey(vault.accountAddress),
		// 	{ ...before, limit: 20 }
		// );

		const tokens = JupiterManager.getInstance().tokenList;

		const transactions = await getTransactionsForAddress(
			vault.accountAddress,
			walletAddress,
			tokens,
			latestSignature
		);

		return {
			transactions: [] as VaultTransaction[],
			latestSignature: transactions.latestSignature,
		};

		// const transactions = await this._connection.getParsedTransactions(
		// 	_.map(signatures, (x) => x.signature),
		// 	{ maxSupportedTransactionVersion: 0 }
		// );

		// type Instruction = ParsedInstruction | PartiallyDecodedInstruction;

		// const parseTransferTransaction = async (
		// 	transaction: ParsedInstruction
		// ): Promise<Partial<VaultTransaction> | null> => {
		// 	appLogger.debug("Parsing Transfer transaction : ", transaction);
		// 	const { parsed } = transaction;
		// 	const { info } = parsed;
		// 	const userTokenAddress = getATAForAddress(
		// 		vault.tokenAddress,
		// 		this._keypair.publicKey.toBase58(),
		// 		true
		// 	);
		// 	const vaultAddress = vault.accountAddress;

		// 	if (info.source == userTokenAddress && info.destination == vaultAddress) {
		// 		appLogger.debug("User deposit");
		// 		return {
		// 			type: "deposit",
		// 			amount: info.amount,
		// 			amountParsed: roundToNDecimals(
		// 				info.amount / Math.pow(10, vault.tokenDecimals),
		// 				2
		// 			),
		// 		};
		// 	}

		// 	return null;
		// };

		// const parseNedTransaction = async (
		// 	transaction: Instruction,
		// 	innerInstructions: ParsedInnerInstruction
		// ): Promise<Partial<VaultTransaction> | null> => {
		// 	appLogger.info("Parsing NED transaction");

		// 	const userTokenAddress = getATAForAddress(
		// 		vault.tokenAddress,
		// 		this._keypair.publicKey.toBase58(),
		// 		true
		// 	);
		// 	const vaultAddress = vault.accountAddress;

		// 	const withdraw = innerInstructions?.instructions.reduce<
		// 		Partial<VaultTransaction>
		// 	>((acc, instruction) => {
		// 		const parsedInstruction = instruction as ParsedInstruction;
		// 		if (parsedInstruction) {
		// 			const { parsed } = parsedInstruction;
		// 			if (parsed) {
		// 				const { info } = parsed;
		// 				if (
		// 					info &&
		// 					info.source == vaultAddress &&
		// 					info.destination == userTokenAddress
		// 				) {
		// 					appLogger.info("User withdraw");
		// 					acc = {
		// 						type: "withdraw",
		// 						amount: info.amount,
		// 						amountParsed: roundToNDecimals(
		// 							info.amount / Math.pow(10, vault.tokenDecimals),
		// 							2
		// 						),
		// 					};
		// 				}
		// 			}
		// 		}

		// 		return acc;
		// 	}, {});

		// 	if (!_.isEmpty(withdraw)) {
		// 		return withdraw;
		// 	} else {
		// 		return Promise.resolve(null);
		// 	}
		// };

		// //TODO: Filter null or undefined from parsed first
		// const allParsedTransactions = await Promise.all(
		// 	_.flatMap(transactions, async (element) => {
		// 		const meta = element?.meta;
		// 		if (meta) {
		// 			const innerInstructions: ParsedInnerInstruction[] | null | undefined =
		// 				meta.innerInstructions;
		// 			const transaction = element!.transaction;
		// 			const message = transaction?.message;
		// 			// console.log('message', JSON.stringify(message, undefined, 2))
		// 			const instructions = message?.instructions;
		// 			const parsedTransactions = await Promise.all(
		// 				_.map(
		// 					instructions,
		// 					async (instruction: Instruction, index: number) => {
		// 						console.log("instruction-->", instruction);

		// 						if (instruction.programId.equals(this._programId)) {
		// 							const parsedInstructions: ParsedInnerInstruction[] = match(
		// 								innerInstructions
		// 							)
		// 								.when(
		// 									(_innerInstructions) =>
		// 										_.isNil(_innerInstructions) == true,
		// 									(_) => []
		// 								)
		// 								.when(
		// 									(_innerInstructions) =>
		// 										_.isNil(_innerInstructions) == false,
		// 									(_) => innerInstructions!
		// 								)
		// 								.run();

		// 							const nedInstructions = parsedInstructions.find(
		// 								(instruction) => instruction.index == index
		// 							);
		// 							const nedTransaction = await parseNedTransaction(
		// 								instruction,
		// 								nedInstructions!
		// 							);
		// 							// console.log('nedTransaction', nedTransaction)
		// 							if (nedTransaction)
		// 								return {
		// 									tx: transaction.signatures[0],
		// 									...nedTransaction, // Ned transactions always have inner instructions
		// 								};
		// 							else return null;
		// 						}

		// 						if (instruction.programId.equals(TOKEN_PROGRAM_ID)) {
		// 							const tokenTransaction = await parseTransferTransaction(
		// 								instruction as ParsedInstruction
		// 							);
		// 							if (tokenTransaction)
		// 								return {
		// 									tx: transaction.signatures[0],
		// 									...tokenTransaction, // Ned transactions always have inner instructions
		// 								};
		// 							else return null;
		// 						}
		// 					}
		// 				)
		// 			);

		// 			console.log(
		// 				"parsedTransactions",
		// 				parsedTransactions,
		// 				parsedTransactions.filter((x) => !_.isNull(x))
		// 			);

		// 			return parsedTransactions;
		// 		}
		// 	})
		// );
		// const transactionsLoaded = _.flatten(allParsedTransactions).filter(
		// 	(t) => t != null
		// ) as VaultTransaction[];
		// appLogger.debug("Vault transactions loaded", transactionsLoaded);

		// return transactionsLoaded;
	}

	private async swapAndSendTokenToVaultWithSpareTx(
		vault: Vault,
		amount: number,
		mint: string
	): Promise<VersionedTransaction | null> {
		const jupiter = JupiterManager.getInstance();
		jupiter.setKeypair(this._keypair);

		logInfo({
			message: `Trying to swap tokens for mint ${mint} and vault ${vault.name} with address ${vault.accountAddress}`,
			meta,
		});

		const quote: SwapResponse | null = await jupiter.getQuote(
			mint,
			vault.tokenAddress,
			amount,
			100
		);

		logDebug({
			message: `Trying to swap tokens for mint ${mint} and vault ${
				vault.name
			} with address ${vault.accountAddress}. Quote = ${JSON.stringify(quote)}`,
			meta,
		});

		if (quote) {
			logDebug({
				message: `Trying to swap tokens for mint ${mint} and vault ${
					vault.name
				} with address ${vault.accountAddress}. Found route ${JSON.stringify(
					quote
				)}`,
				meta,
			});

			const swapTx = await jupiter.getVaultsSwapTransaction(quote);

			if (swapTx) {
				const { transaction: createAtaTx, ata: userATA } =
					await createAtaTxIfDoesntExist(
						vault.tokenAddress,
						this._keypair.publicKey.toBase58(),
						this._keypair
					);

				const saveBalanceTx = await this.saveOnLedgerTx(
					vault,
					new PublicKey(userATA)
				);

				const firstTx = createAtaTx ? createAtaTx : saveBalanceTx;
				const secondTx = createAtaTx ? [saveBalanceTx] : [];
				// return transaction;
				// const swapTransaction = await jupiter.getSwapTransaction(quote, false);

				logDebug({
					message: `Trying to swap tokens for mint ${mint} and vault ${vault.name} with address ${vault.accountAddress}.`,
					meta,
				});
				// console.log("amountFromSwap2", roundToNDecimals(amountFromSwap, 5));
				// console.log(
				// 	"amountFromSwap3",
				// 	roundToNDecimals(amountFromSwap, 5) *
				// 		Math.pow(10, vault.tokenDecimals)
				// );

				const fn = vault.earningsEnabled
					? this.fundAndProvideLiquidityWithDiffBalanceTx.bind(this)
					: this.fundWithDiffBalanceTx.bind(this);

				const vaultTx = await fn(vault, new PublicKey(userATA));

				return await mergeTransactions(this._keypair.publicKey, [
					firstTx,
					...secondTx,
					swapTx,
					vaultTx,
				]);
			} else {
				return null;
			}
		} else {
			return null;
		}
	}

	async sendTokenToVaultWithSpare(
		tokenAmount: number,
		tokenMint: string,
		tokenDecimals: number,
		tokenAccountAddress: string
	): Promise<VersionedTransaction | null> {
		logInfo({
			message: `Sending token ${tokenMint} to vaults with spare for token account address ${tokenAccountAddress}`,
			meta,
		});
		// Takes only the first because it's not allowed to have more than vault with the same token
		const vaultWithSpare = _.first(
			(await this.loadVaults()).filter((vault: Vault) => vault.spare > 0)
		);
		logInfo({
			message: `Vault found for ${tokenMint} = ${vaultWithSpare}`,
			meta,
		});
		if (vaultWithSpare) {
			if (vaultWithSpare?.tokenAddress == tokenMint) {
				const fn = vaultWithSpare.earningsEnabled
					? this.fundAndProvideLiquidityTx.bind(this)
					: this.fundTx.bind(this);

				const result = await fn(
					tokenAccountAddress,
					vaultWithSpare,
					tokenAmount / Math.pow(tokenDecimals, 10)
				);
				if (!("error" in result)) {
					return result;
				} else {
					return null;
				}
			} else {
				return this.swapAndSendTokenToVaultWithSpareTx(
					vaultWithSpare,
					tokenAmount,
					tokenMint
				);
			}
		} else {
			return null;
		}
	}
}
