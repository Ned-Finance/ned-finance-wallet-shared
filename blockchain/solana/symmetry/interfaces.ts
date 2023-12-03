import { Fund as SymmetryFund } from "@symmetry-hq/funds-sdk";
import { Token } from "../tokens";

export interface Fund {
	address: string;
	tokens: FundCompositionToken[];
	name: string;
	description: string;
	depositFee: number;
	rebalanceThreshold: number;
	fundWorth: number;
	todayStats: { price: number; time: number }[];
	todayVariation: number;
	prices: FundBenchamarkStats[];
	symmetryFund: SymmetryFund;
}

export interface FundDetails {
	name: string;
	description: string;
}

export type FundBenchamarkStats = {
	benchmark: number;
	price: number;
	time: number;
	tvl: number;
};

export type FundToken = Token & { id: number };
export type FundCompositionToken = FundToken & {
	amount: number;
	weight: number;
};

export type FundRule = {
	excludeAssets: [];
	excludeNum: number;
	filterBy: string;
	filterDays: number;
	fixedAsset: string;
	numAssets: number;
	ruleAssets: string[];
	sortBy: string;
	totalWeight: number;
	weightBy: string;
	weightDays: number;
	weightExpo: number;
};

export type FundInfo = {
	_dur_: number;
	activelyManaged: number;
	assetPool: string[];
	burnAmount: number;
	buyVolume: number;
	creationBlockTime: number;
	creationFee: number;
	creationSignature: string;
	creationTime: number;
	currentCompAmount: number[];
	currentCompToken: string[];
	currentCompTokenObject: Token[];
	currentWeight: number[];
	ddbUpdateTime: number;
	description: string;
	fundToken: string;
	hostBuyFee: number;
	hostFee: number;
	hostPubkey: string;
	lastRebalanceTime: number[];
	lastRefilterTime: number;
	lastReweighTime: number;
	lastUpdateTime: number;
	lpOffsetThreshold: number;
	manager: string;
	managerBuyFee: number;
	managerFee: number;
	mintAmount: number;
	name: string;
	nameUpdateTime: number;
	periodicUpdateTime: number;
	price: number;
	primkey: string;
	rebalanceInterval: number;
	rebalanceSlippage: number;
	rebalanceThreshold: number;
	rebalanceVolume: number;
	refilterInterval: number;
	reweighInterval: number;
	ruleTokenWeights: number[];
	ruleTokens: string[];
	rules: FundRule[];
	sellVolume: 196.7947226838432;
	shortHistorical: FundBenchamarkStats[];
	sortkey: string;
	stateTimeSent: number;
	supplyOutstanding: number;
	symbol: string;
	symmetryBuyFee: number;
	symmetryRebalanceFee: number;
	targetWeight: number[];
	totalFees: number;
	totalSymmetryFees: number;
	totalVolume: number;
	tvl: number;
	txTimeSent: number;
};
