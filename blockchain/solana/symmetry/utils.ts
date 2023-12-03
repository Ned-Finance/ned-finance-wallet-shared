import axios from "axios";
import BN from "bn.js";
import { camelizeDeep } from "../../../encoders";
import { FundCompositionToken, FundInfo, FundToken } from "./interfaces";

export const parseAssetsPool = (
	currentCompToken: BN[],
	currentCompAmount: BN[],
	currentCompWeight: BN[],
	tokens: FundToken[]
): FundCompositionToken[] => {
	return currentCompToken
		.filter((x) => x.toNumber() > 0)
		.map((id) => tokens.find((x) => x.id == id.toNumber()))
		.map((token, index) => ({
			...token,
			amount: currentCompAmount[index].toNumber(),
			weight: currentCompWeight[index].toNumber(),
		}))
		.filter((x) => x != undefined) as FundCompositionToken[];
};

export const getFundStats = async (fundAddress: string, days: number) => {
	const request = await axios.post("https://api.symmetry.fi/v1/funds-getter", {
		request: "get_history",
		params: {
			target: "fund_stats",
			pubkey: fundAddress,
			start: `${days}d`,
			benchmark: "current_target_weights",
			attributes: ["price", "tvl", "time", "benchmark"],
		},
	});

	return request.data;
};

export const getFundInfo = async (
	fundAddress: string
): Promise<Omit<FundInfo, "currentCompTokenObject">> => {
	const request = await axios.post("https://api.symmetry.fi/v1/funds-getter", {
		request: "get_fund",
		params: {
			pubkey: fundAddress,
		},
	});

	return camelizeDeep(request.data) as Omit<FundInfo, "currentCompTokenObject">;
};
