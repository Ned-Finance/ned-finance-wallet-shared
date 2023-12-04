import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	Mint,
	NATIVE_MINT,
	TOKEN_2022_PROGRAM_ID,
	TOKEN_PROGRAM_ID,
	createAssociatedTokenAccountInstruction,
	createSyncNativeInstruction,
	getAccount,
	getAssociatedTokenAddress,
	getAssociatedTokenAddressSync,
	getMint,
} from "@solana/spl-token";
import {
	AccountInfo,
	Finality,
	Keypair,
	LAMPORTS_PER_SOL,
	ParsedAccountData,
	PublicKey,
	SignaturesForAddressOptions,
	SystemProgram,
	TransactionMessage,
	VersionedTransaction,
} from "@solana/web3.js";
import _ from "lodash";
import { Cache } from "../../../cache";
import { roundToNDecimals } from "../../../numbers";
import { WalletAccount } from "../../../types/wallet";
import { getConnection } from "../connection";
import constants from "../constants";
import { JupiterManager } from "../jupiter";
import { NftManager } from "../nfts";
import { getNftMetadataFromUri } from "../nfts/metadata";
import { getWalletTotalBalance, mapAccountsWithPrices } from "../prices";
import { TokenExtensions } from "../tokens";
import { getOrCreateTokenAccount } from "../transactions/helpers";
import { getWalletTokensWithPrice } from "../wallet";
import { subscribeToAccountUpdates, unsubscribeToAccountUpdates } from "../ws";

const connection = getConnection();

const meta = {
	file: "utils/solana/accounts/helpers.ts",
};

export type SolanaTokenAccount = {
	address: string;
	mint: string;
	balance: number;
	balanceNonDecimal: string;
	logoURI: string;
	symbol: string;
	name: string;
	decimals: number;
	chainId: number;
	isWrapped: boolean;
	isNative: boolean;
	extensions: TokenExtensions;
	isNFT: boolean;
	programId: string | null;
};

export type AccountsAndBalance = {
	balance: number;
	balanceUSD: number;
	fiatPriceVsUsd: number;
	accounts: WalletAccount[];
	fiatLabel: string;
};

export const getAccountsForAddress = async (
	address: string,
	programId: PublicKey
) => {
	const accounts = await getConnection().getParsedTokenAccountsByOwner(
		new PublicKey(address),
		{
			programId: programId,
		}
	);

	return accounts.value;
};

export const getParsedAccountsForAddress = async (
	address: string
): Promise<SolanaTokenAccount[]> => {
	const accountsPromise = await getAccountsForAddress(
		address,
		TOKEN_PROGRAM_ID
	);
	const accountsToken2022Promise = await getAccountsForAddress(
		address,
		TOKEN_2022_PROGRAM_ID
	);
	await JupiterManager.getInstance().init(getConnection());
	const tokensPromise = JupiterManager.getInstance().tokenList;

	const [accounts, accountsToken2022, tokens] = await Promise.all([
		accountsPromise,
		accountsToken2022Promise,
		tokensPromise,
	]);

	type Account = {
		pubkey: PublicKey;
		account: AccountInfo<ParsedAccountData>;
	};

	const accountsParsed = _.reduce(
		accounts.concat(accountsToken2022),
		(acc: SolanaTokenAccount[], account: Account) => {
			const parsed = account.account.data["parsed"];
			const tokenFromAccount = _.find(tokens, (token) => {
				if (parsed) {
					const mint = parsed["info"]["mint"];
					return mint == token["address"];
				}
				return false;
			});

			console.log("---->", JSON.stringify(parsed));

			const defaultTokenAccountParams: Omit<
				SolanaTokenAccount,
				"name" | "logoURI" | "symbol" | "extensions" | "chainId"
			> = {
				address: account.pubkey.toBase58(),
				mint: parsed["info"]["mint"],
				balance: Number(parsed["info"]["tokenAmount"]["uiAmountString"]),
				balanceNonDecimal: parsed["info"]["tokenAmount"]["amount"],
				decimals: parsed["info"]["tokenAmount"]["decimals"],
				isWrapped: false,
				isNative: false,
				isNFT: parsed["info"]["tokenAmount"]["decimals"] == 0,
				programId: account.account.data.program,
			};

			if (tokenFromAccount) {
				// const pubKey = account.pubkey.toBase58()
				// console.log('pubKey', pubKey)
				const result: SolanaTokenAccount = {
					...defaultTokenAccountParams,
					extensions: tokenFromAccount.extensions,
					logoURI: tokenFromAccount["logoURI"],
					symbol: tokenFromAccount["symbol"],
					name: tokenFromAccount.name || "",
					chainId: tokenFromAccount["chainId"],
				};
				return [result].concat(acc);
			} else {
				const result: SolanaTokenAccount = {
					...defaultTokenAccountParams,
					extensions: {
						coingeckoId: "",
						twitter: "",
						website: "",
						discord: "",
					},
					logoURI: "",
					symbol: "",
					name: "",
					chainId: 101,
				};
				return [result].concat(acc);
			}
		},
		[] as SolanaTokenAccount[]
	);

	const balance = await getConnection().getBalance(new PublicKey(address));
	const nativeSOLAccount: SolanaTokenAccount = {
		...constants.WRAPPED_SOL_TOKEN,
		name: "SOL",
		address: "",
		balance: balance / LAMPORTS_PER_SOL,
		balanceNonDecimal: String(balance),
		mint: constants.WRAPPED_SOL_TOKEN.address,
		isNative: true,
		isWrapped: false,
		chainId: 101,
		isNFT: false,
		programId: null,
	};
	// return [...usdArray, ...euroArray, nativeSOLAccount].concat(others);
	return [nativeSOLAccount].concat(accountsParsed);
};

export const getWSolAddressForAddress = async (address: string) => {
	const ata = await getAssociatedTokenAddress(
		NATIVE_MINT, // wrapped SOL's mint address
		new PublicKey(address),
		false,
		TOKEN_PROGRAM_ID,
		ASSOCIATED_TOKEN_PROGRAM_ID
	);

	return ata.toBase58();
};

export const getTokenProgramId = async (
	address: string
): Promise<string | null> => {
	// const tokenInfo = await connection.getAccountInfo()
	const tokenInfo = await connection.getParsedAccountInfo(
		new PublicKey(address)
	);
	if (tokenInfo.value) {
		const program = (tokenInfo.value.data as ParsedAccountData).program;
		console.log("program", program);
		if (program.toString() == "spl-token-2022") {
			return TOKEN_2022_PROGRAM_ID.toBase58();
		} else return TOKEN_PROGRAM_ID.toBase58();
	} else return null;
};
export const getATAForAddress = (
	mint: string,
	address: string,
	allowOwnerOffCurve = false,
	programId = TOKEN_PROGRAM_ID.toBase58()
) => {
	const ata = getAssociatedTokenAddressSync(
		new PublicKey(mint),
		new PublicKey(address),
		allowOwnerOffCurve,
		new PublicKey(programId)
	);

	return ata.toBase58();
};

export const createAtaAndFundTx = async (
	mainAddress: string,
	tokenAddress: string,
	owner: string,
	amount: number,
	payer: Keypair
): Promise<VersionedTransaction[]> => {
	const { transaction: createAtaTx, ata } = await createAtaTxIfDoesntExist(
		tokenAddress,
		owner,
		payer
	);
	if (createAtaTx) {
		const sendSolTx = await sendSolToWrappedAccount(
			mainAddress,
			ata,
			amount,
			payer
		);
		return [createAtaTx, sendSolTx];
	} else {
		return [];
	}
};

export const createAtaTxIfDoesntExist = async (
	mint: string,
	owner: string,
	payer: Keypair,
	allowOwnerOffCurve = false,
	programId: string = TOKEN_PROGRAM_ID.toBase58()
): Promise<{ transaction: VersionedTransaction | null; ata: string }> => {
	const userATA = await getATAForAddress(
		mint,
		owner,
		allowOwnerOffCurve,
		programId
	);

	console.log("userATA", userATA);

	try {
		await getAccount(connection, new PublicKey(userATA));
		return { transaction: null, ata: userATA };
	} catch (error: unknown) {
		const newAtaOwner = new PublicKey(owner);
		const newAtaMint = new PublicKey(mint);
		// const createAtaIx = getOrCreateAssociatedTokenAccount

		console.log("payer.publicKey", payer.publicKey);
		console.log("new PublicKey(userATA)", new PublicKey(userATA));
		console.log("newAtaOwner", newAtaOwner);
		console.log("newAtaMint", newAtaMint);
		console.log("new PublicKey(programId)", new PublicKey(programId));

		const createAtaIx = createAssociatedTokenAccountInstruction(
			payer.publicKey,
			new PublicKey(userATA),
			newAtaOwner,
			newAtaMint,
			new PublicKey(programId)
		);

		const latestBlockhash = await connection.getLatestBlockhash();

		const messageV0 = new TransactionMessage({
			payerKey: payer.publicKey,
			recentBlockhash: latestBlockhash.blockhash,
			instructions: [createAtaIx],
		}).compileToV0Message();

		const transaction = new VersionedTransaction(messageV0);
		transaction.sign([payer]);

		return { transaction, ata: userATA };
	}
};

export const sendSolToWrappedAccount = async (
	mainAddress: string,
	associatedTokenAccount: string,
	amount: number,
	payer: Keypair,
	programId = TOKEN_PROGRAM_ID
) => {
	console.log("amount --------->", amount * LAMPORTS_PER_SOL);
	// createTransferCheckedInstruction(
	// 	new PublicKey(mainAddress),
	// 	new PublicKey(mint),
	// 	new PublicKey(toAddress),
	// 	signer.publicKey,
	// 	amount,
	// 	decimals,
	// 	[],
	// 	new PublicKey(tokenProgramId)
	// ),

	// const transferIx = createTransferInstruction(
	// 	new PublicKey(mainAddress),
	// 	new PublicKey(associatedTokenAccount),
	// 	new PublicKey(mainAddress),
	// 	amount * LAMPORTS_PER_SOL,
	// 	[],
	// 	programId
	// );

	const transferIx = SystemProgram.transfer({
		fromPubkey: new PublicKey(mainAddress),
		toPubkey: new PublicKey(associatedTokenAccount),
		lamports: amount * LAMPORTS_PER_SOL,
	});

	const latestBlockhash = await connection.getLatestBlockhash();

	const messageV0 = new TransactionMessage({
		payerKey: payer.publicKey,
		recentBlockhash: latestBlockhash.blockhash,
		instructions: [
			transferIx,
			createSyncNativeInstruction(new PublicKey(associatedTokenAccount)),
		],
	}).compileToV0Message();

	const transaction = new VersionedTransaction(messageV0);
	transaction.sign([payer]);

	return transaction;
};

export const getSignaturesForAddress = async (
	address: string,
	options?: SignaturesForAddressOptions,
	commitment?: Finality
) => {
	const signatures = await connection.getSignaturesForAddress(
		new PublicKey(address),
		options,
		commitment
	);
	// console.log('signatures', signatures, connection)
	return signatures;

	// return ata.toBase58()
};

export const getMintAccount = async (tokenAddress: string): Promise<Mint> => {
	return getMint(getConnection(), new PublicKey(tokenAddress));
};

const fillImagesFromMetaplex = async (
	accounts: SolanaTokenAccount[],
	keypair: Keypair
) => {
	const accountsWithoutLogo: SolanaTokenAccount[] = _.filter(
		_.filter(
			accounts,
			(SolanaTokenAccount: SolanaTokenAccount) => !SolanaTokenAccount.isNFT
		),
		(account: SolanaTokenAccount) => _.isEmpty(account.logoURI)
	) as SolanaTokenAccount[];

	const nftManager = new NftManager(getConnection(), keypair);

	const imagesFromMetaplex: (string | undefined)[] = await Promise.all(
		accountsWithoutLogo.map((SolanaTokenAccount: SolanaTokenAccount) => {
			return nftManager.metaplex
				.nfts()
				.findByMint({ mintAddress: new PublicKey(SolanaTokenAccount.mint) })
				.then((result) => getNftMetadataFromUri(result.uri))
				.then((result) => result.image)
				.catch((e) => undefined);
		})
	);

	const tokenAccountsWithMissingImages = _.zip(
		imagesFromMetaplex,
		accountsWithoutLogo
	)
		.filter((value) => !_.isUndefined(value[0]))
		.map((value) => {
			return {
				...value[1],
				logoURI: value[0],
			};
		}) as SolanaTokenAccount[];

	return _.reduce(
		accounts,
		(acc, SolanaTokenAccount, index) => {
			const tokenAccountFound = _.find(
				tokenAccountsWithMissingImages,
				(tokenAccountWithImage) =>
					SolanaTokenAccount.address == tokenAccountWithImage.address
			);
			if (tokenAccountFound) {
				acc.push(tokenAccountFound);
			} else {
				acc.push(SolanaTokenAccount);
			}
			return acc;
		},
		[] as SolanaTokenAccount[]
	);
};

export const loadAccountsAndTotalBalance = async (
	keypair: Keypair,
	fiatCurrency?: string,
	fiatLabel?: string
): Promise<AccountsAndBalance> => {
	// const tokens = JupiterManager.getInstance().tokenList;
	// const accountsPromise = getParsedAccountsForAddress(
	// 	keypair.publicKey.toBase58(),
	// 	tokens
	// );
	// const priceDataPromise = async () => {
	// 	const pythClient = new PythHttpClient(
	// 		connection,
	// 		getPythProgramKeyForCluster("pythnet")
	// 	);
	// 	const data = await pythClient.getData();
	// 	return data;
	// };

	// const [accounts, priceData] = await Promise.all([
	// 	accountsPromise,
	// 	priceDataPromise(),
	// ]);

	const { accounts, fiatPriceVsUsd, success } = await getWalletTokensWithPrice(
		keypair.publicKey.toBase58(),
		fiatCurrency
	);

	// console.log("accounts", accounts);
	console.log("fiatPriceVsUsd", fiatPriceVsUsd);

	const accountsWithBalance = _.filter(accounts, (x) => x.balance > 0);

	const accountsWithImagesFromMetaplex = await fillImagesFromMetaplex(
		accountsWithBalance,
		keypair
	);

	if (accountsWithImagesFromMetaplex.length) {
		const tokensWithPrice = await mapAccountsWithPrices(
			accountsWithImagesFromMetaplex
		);
		const balanceUSD = getWalletTotalBalance(tokensWithPrice);
		const walletAmount = async () => {
			if (fiatCurrency) {
				if (fiatPriceVsUsd)
					if (fiatPriceVsUsd)
						return roundToNDecimals(balanceUSD / fiatPriceVsUsd, 2);
					else return 0;
				else return 0; // This is just for alerting the user this is not working.
			} else {
				return roundToNDecimals(balanceUSD, 2);
			}
		};

		const balance = await walletAmount();

		return {
			balanceUSD: balanceUSD,
			balance: Number(balance),
			fiatLabel: fiatLabel || "$",
			accounts: tokensWithPrice,
			fiatPriceVsUsd,
		};
	} else
		return {
			balanceUSD: 0,
			balance: 0,
			fiatLabel: fiatLabel || "$",
			accounts: [],
			fiatPriceVsUsd,
		};

	// const chunks = _.chunk(accountsWithBalance, 5);
	// if (chunks.length) {
	//   const tokensWithPrice = await mapAccountsWithPrices(chunks[0]);
	//   const walletAmount = getWalletTotalBalance(tokensWithPrice);
	//   return { balance: walletAmount, accounts: tokensWithPrice }
	// } else {
	//   return { balance: 0, accounts: [] }
	// }
};

const subscribeForAccountsUpdates = async (
	accounts: SolanaTokenAccount[],
	callback: () => void
) => {
	const cacheKey = "solana-accounts";
	const subscriptionsIds = Cache.ref().get<number[]>(cacheKey);
	subscriptionsIds.map((id) => unsubscribeToAccountUpdates(id));

	const subscribe = async (
		accounts: SolanaTokenAccount[],
		acc: number[],
		counter: number
	): Promise<number[]> => {
		console.log("Calling subscribe", counter);
		if (counter > accounts.length - 1) {
			return acc;
		} else {
			const account = accounts[counter];
			const id = subscribeToAccountUpdates(account.address, () => {
				console.log("an account has been updated");
				callback();
			});
			// console.log("id", id);
			// await new Promise((res) => setTimeout(() => res(null), 500));
			return await subscribe(accounts, acc.concat([counter]), counter + 1);
		}
	};

	if (accounts.length) {
		const subscriptionIdsFromAccounts = await subscribe(accounts, [], 0);
		console.log("subscriptionIdsFromAccounts", subscriptionIdsFromAccounts);
		Cache.ref().set(cacheKey, subscriptionIdsFromAccounts);
	}
};

export const getNonNFTAccounts = (accounts: WalletAccount[]) => {
	return _.orderBy(
		accounts.filter(
			(account) =>
				account.tokenAccount.isNFT == false &&
				!_.isEmpty(account.tokenAccount.logoURI)
		),
		["price"],
		["desc"]
	);
};

export const getAccountsWithBalance = (accounts: WalletAccount[]) => {
	return _.filter(accounts, (x) => x.tokenAccount.balance > 0);
};

export const getAccountBalance = async (
	address: string
): Promise<number | undefined> => {
	try {
		const account = await getAccount(connection, new PublicKey(address));
		return Number(account.amount);
	} catch (e) {
		return undefined;
	}
};

export const isValidAddress = (address: string) => {
	const isBase58 = /^[A-HJ-NP-Za-km-z1-9]*$/.test(address);
	return isBase58 && address.length >= 32 && address.length <= 44;
};

export const getAccountAddress = async (
	mainAddress: string,
	mint: string,
	keypair: Keypair
) => {
	const SolanaTokenAccount = await getOrCreateTokenAccount(
		keypair,
		mint,
		mainAddress
	);
	return SolanaTokenAccount.address.toBase58();
};
