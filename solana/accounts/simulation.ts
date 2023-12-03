import { AccountLayout, RawAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
	SimulatedTransactionAccountInfo,
	SystemProgram,
} from "@solana/web3.js";
import _ from "lodash";
import { logDebug, logError } from "../../common/logging";
import { roundToNDecimals } from "../../numbers";
import { getConnection } from "../connection";
import { tokenFromMetaplex } from "../nfts/utils";
import { Token } from "../tokens";
import { TokenAccount } from "./helpers";

const connection = getConnection();

const meta = {
	file: "utils/solana/accounts/simulation.ts",
};

export const decodeAccountData = (data: Buffer): RawAccount | null => {
	// TODO: Review Fail silently because sometimes is not an account to decode
	try {
		return AccountLayout.decode(data);
	} catch (e) {
		logError({
			message: "Error decoding account ",
			meta,
		});
		return null;
	}
};

export type ChangedAccount = SimulatedTransactionAccountInfo & {
	address: string;
};
export type ChangedAccountResponse = {
	address: string;
	mint: string;
	decimals: number;
	change: number;
	symbol: string;
	logoURI?: string;
	isNFT: boolean;
};
export const getChangedAccounts = async (
	accounts: TokenAccount[],
	modifiedAccounts: ChangedAccount[],
	ownerAddress: string
): Promise<ChangedAccountResponse[]> => {
	type DecodedChangedAccount = ChangedAccount & {
		decodedData: RawAccount | null;
	};

	logDebug({
		message: `Getting changed accounts with modified accounts ${JSON.stringify(
			modifiedAccounts
		)}`,
		meta,
	});

	const modifiedAccountsDecoded: DecodedChangedAccount[] = modifiedAccounts
		.map((account) => {
			const [data, encoding] = account.data;
			return {
				...account,
				decodedData: !_.isEmpty(data)
					? decodeAccountData(Buffer.from(data, encoding as BufferEncoding))
					: null,
			};
		})
		.filter((account, index) => {
			if (account.address == ownerAddress) return true;
			else {
				// console.log("owner?", account.decodedData?.owner.toBase58(), ownerAddress)
				return account.decodedData?.owner.toBase58() == ownerAddress;
			}
		});

	logDebug({
		message: `Modified accounts decoded ${JSON.stringify(
			modifiedAccountsDecoded
		)}`,
		meta,
	});

	const diffs = await modifiedAccountsDecoded.map(
		(current: DecodedChangedAccount) => {
			const tokenAccount = accounts.find((a) => a.address == current.address);

			logDebug({
				message: `Modified account ${
					current.address
				} token account ${JSON.stringify(tokenAccount)}`,
				meta,
			});

			return new Promise<ChangedAccountResponse>(async (resolve) => {
				const getNFTokenAccount = async () => {
					const defaultTokenAccount = {
						...Token.default(),
						mint: current.decodedData!.mint.toBase58(),
						balance: 0,
						balanceNonDecimal: "0",
						isNFT: false,
					} as TokenAccount;
					const token = await tokenFromMetaplex(
						connection,
						current.decodedData!.mint.toBase58()
					);
					if (token)
						return {
							...token,
							isNFT: true,
							mint: current.decodedData!.mint.toBase58(),
							balance: tokenAccount ? tokenAccount.balance : 0,
							balanceNonDecimal: tokenAccount
								? tokenAccount.balanceNonDecimal
								: 0,
						};
					else return defaultTokenAccount;
				};
				const getToken = async () => {
					if (tokenAccount && tokenAccount.isNFT == false) {
						return tokenAccount;
					} else {
						return await getNFTokenAccount();
					}
				};

				const token = await getToken();

				logDebug({
					message: `Modified account ${current.address} token ${JSON.stringify(
						token
					)}`,
					meta,
				});

				const getChange = () => {
					if (current.owner == TOKEN_PROGRAM_ID.toBase58()) {
						logDebug({
							message: `Modified account ${current.address} changed amount ${current.decodedData?.amount} vs account balance ${token.balanceNonDecimal}`,
							meta,
						});
						const amount =
							BigInt(current.decodedData?.amount || 0) -
							BigInt(token.balanceNonDecimal);
						const amountWithDecimals =
							Number(amount) / Math.pow(10, token.decimals);

						return roundToNDecimals(amountWithDecimals, 5);
					}
					if (current.owner == SystemProgram.programId.toBase58()) {
						const amount = Number(
							current.lamports / Math.pow(10, token.decimals)
						);
						// console.log('amount ===>', current.lamports, amount, token.balance, (amount - token.balance), parseFloat((amount - token.balance).toString()))
						return roundToNDecimals(amount - token.balance, 5);
					}
					return 0;
				};
				const change = getChange();

				logDebug({
					message: `Modified account ${current.address} change ${JSON.stringify(
						change
					)}`,
					meta,
				});

				resolve({
					...token!,
					change,
				});
			});
		},
		[] as Promise<ChangedAccountResponse>[]
	);

	return await Promise.all(diffs);
};
