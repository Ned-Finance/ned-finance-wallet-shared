import axios from "axios";
import _ from "lodash";
import { round2Decimals, roundToNDecimals } from "../../../utils/numbers";
import { logException } from "../../logging";
import { WalletAccount } from "../../types/wallet";
import { SolanaTokenAccount } from "../accounts";

const meta = {
	file: "utils/solana/prices/index.ts",
};

export const getPriceFromAddresses = async (addresses: string[]) => {
	return await getTokenPriceByAddressesCoinGecko("solana", addresses);
};

export const getPriceFromAddressesJupiter = async (addresses: string[]) => {
	const endpoint = "https://price.jup.ag/v6/price";
	const url = `${endpoint}?ids=${addresses.join(",")}`;

	try {
		const response = await axios.get(url);
		console.log("RESPONDE ok");
		if (response.status == 200) {
			return response.data.data;
		} else {
			return Array(addresses.length).fill(undefined);
		}
	} catch (e) {
		console.log("getPriceFromAddressesJupiter error", e);
		return Array(addresses.length).fill(undefined);
	}
};

// export const getPriceFromBirdEye = async (
// 	addresses: string[],
// 	abortController?: AbortController
// ) => {
// 	const endpoint = "https://public-api.birdeye.so/public/multi_price";
// 	const url = `${endpoint}?list_address=${addresses.join(",")}`;

// 	try {
// 		const response = await axios.get(url, { signal: abortController?.signal });
// 		if (response.status == 200) {
// 			return response.data;
// 		} else {
// 			return Array(addresses.length).fill(undefined);
// 		}
// 	} catch (e) {
// 		return Array(addresses.length).fill(undefined);
// 	}
// };

export const getTokenVariation = async (coingeckoId: string, days: number) => {
	const URL = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}`;
	const response = await axios.get(URL);
	if (response.status == 200) {
		return response.data;
	} else return null;
};

export const getTokenPrice = async (
	coingeckoId: string,
	abortController?: AbortController
) => {
	const URL = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=USD`;
	try {
		const response = await axios.get(URL, { signal: abortController?.signal });
		const data = response.data;
		// console.log('response.status coingecko ==>', response.status)
		if (response.status == 200) {
			if (data[coingeckoId]) {
				return data[coingeckoId]["usd"];
			} else {
				return null;
			}
		} else return null;
	} catch (e) {
		return null;
	}
};

export const getTokenPriceByAddressesCoinGecko = async (
	network: string,
	addresses: string[]
) => {
	const URL = `https://api.coingecko.com/api/v3/simple/token_price/${network}?contract_addresses=${addresses.join(
		","
	)}&vs_currencies=usd`;
	const response = await axios.get(URL);
	const data = response.data;
	if (response.status == 200) {
		return _.map(_.clone(addresses), (address) => {
			return data[address] ? data[address]["usd"] : 0;
		});
	} else return Array(addresses.length).fill(0);
};

export const getPriceFromMultipleSources = async (
	addresses: string[]
): Promise<number[]> => {
	// Called like this to process more than one price provider
	const jupiterPrice = await getPriceFromAddressesJupiter(addresses)
		.then((data) => {
			return addresses.map((address) => {
				// console.log("---->---->---->---->", data);
				// console.log("address", address);
				// console.log("data[address]", data[address]);
				return data[address] ? data[address]["price"] : 0;
			});
		})
		.catch((e) => {
			logException({
				message: "Failed to load coingecko prices from jupiter api",
				capturedError: e as Error,
				meta,
			});
			return addresses.map((address) => 0);
		});
	return jupiterPrice;
};

export const mapAccountsWithPrices = async (
	accounts: SolanaTokenAccount[]
): Promise<WalletAccount[]> => {
	const addresses = _.map(accounts, (x) => x.mint);
	const data = await getPriceFromMultipleSources(addresses);
	const mappedAccount = _.map(accounts, (account, index) => {
		const price: number = data[index];
		return {
			tokenAccount: account,
			priceInfo: {
				price,
				mintAddress: account.mint,
				symbol: account.symbol,
			},
			calculatedValue: price ? caculatedPrice(account.balance, price) : 0,
		};
	});

	const [sol, rest] = _.partition(
		mappedAccount,
		(x) => x.tokenAccount.symbol == "SOL"
	);
	const sorted = _.orderBy(rest, ["calculatedValue"], ["desc"]);
	return [...sol, ...sorted];
};

export const getWalletTotalBalance = (accounts: WalletAccount[]): number => {
	return _.reduce(
		accounts,
		(acc, account, index) => {
			const price = account.priceInfo.price ? account.priceInfo.price : 0;
			const quantity = account.tokenAccount.balance;
			const value = parseFloat((quantity * price).toPrecision(3));
			return acc + value;
		},
		0
	);
};

export const formattedPrice = (quantity: number, value: number) => {
	const calc = round2Decimals(quantity * value);
	if (_.isUndefined(value)) return "-";
	if (calc < 0.01) {
		return "<0.01";
	} else {
		return calc.toString();
	}
};

export const caculatedPrice = (quantity: number, value: number) => {
	if (_.isUndefined(value)) return 0;
	return roundToNDecimals(quantity * value, 2);
};
