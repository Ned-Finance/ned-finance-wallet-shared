import { Prism } from "@prism-hq/prism-ag";
import {
	Connection,
	Keypair,
	PublicKey,
	TransactionSignature,
} from "@solana/web3.js";
import { BuyState, FundsSDK } from "@symmetry-hq/funds-sdk";
import axios from "axios";
import _ from "lodash";
import { Wallet } from "../wallets";
import { fundsList } from "./funds";
import { Fund, FundInfo, FundToken } from "./interfaces";
import {
	getFundInfo as _getFundInfo,
	getFundStats,
	parseAssetsPool,
} from "./utils";

export class FundsManager {
	private static instance: FundsManager;

	private _funds!: FundsSDK;
	private _prism!: Prism;
	private _keypair!: Keypair;
	private _connection!: Connection;

	private constructor() {}

	public static getInstance(): FundsManager {
		if (!FundsManager.instance) {
			FundsManager.instance = new FundsManager();
		}

		return FundsManager.instance;
	}

	public async init(connection: Connection) {
		this._connection = connection;
		this._funds = await FundsSDK.init(this._connection);
		return this._funds;
	}

	public async getFundInfo(fundAddress: string): Promise<FundInfo> {
		const tokens = await this.getTokenInfoData();
		const tokensAsObjects = _.reduce(
			tokens,
			(acc, curr) => {
				acc[curr.address] = curr;
				return acc;
			},
			{} as { [key: string]: FundToken }
		);
		const fundInfo = await _getFundInfo(fundAddress);
		const currentCompTokenObject = fundInfo.currentCompToken.map(
			(token, index) => {
				return tokensAsObjects[token];
			}
		);

		return { currentCompTokenObject, ...fundInfo };
	}
	public async getStatsForFund(fund: Partial<Fund>, days: number) {
		return new Promise<Fund>(async (resolve, reject) => {
			const fundStats = await getFundStats(fund.address!, days);
			console.log("fundStats ==>", fundStats.data);

			const prices = fundStats.data.fund;
			const todayVariation =
				100 - (prices[0].price / prices[prices.length - 1].price) * 100;
			resolve({ ...fund, todayVariation, prices } as Fund);
		});
	}

	public async loadFundsFromAddress(address: string): Promise<Fund[]> {
		const funds = await this._funds.findFunds([
			{
				filterType: "manager",
				filterPubkey: new PublicKey(address),
			},
		]);

		const tokens = await this.getTokenInfoData();

		const fundsParsed = funds.map((fund) => {
			const fundTokens = parseAssetsPool(
				fund.data.currentCompToken,
				fund.data.currentCompAmount,
				fund.data.currentWeight,
				tokens
			);
			const fundAddress = fund.ownAddress.toBase58();
			const fundDetails = fundsList[fundAddress];
			return {
				address: fundAddress,
				tokens: fundTokens,
				name: fundDetails.name,
				description: fundDetails.description,
				depositFee: fund.data.managerFee.toNumber(),
				rebalanceThreshold: fund.data.rebalanceThreshold.toNumber(),
				fundWorth: fund.data.fundWorth.toNumber(),
				symmetryFund: fund,
			} as Partial<Fund>;
		});

		const fundsWithStats = await Promise.all(
			fundsParsed.map((fund) => this.getStatsForFund(fund, 1))
		);

		return fundsWithStats;
	}

	public async buyFund(fund: Fund, usdcAmount: number) {
		let buyState: BuyState = await this._funds.buyFund(
			fund.symmetryFund,
			usdcAmount
		);
		console.log("buyState", buyState);
		let txs: TransactionSignature[] = await this._funds.rebalanceBuyState(
			buyState
		);
		console.log("txs", txs);
		let tx: TransactionSignature = await this._funds.mintFund(buyState);
		console.log("tx", tx);
		return tx;
	}

	public async getFromBuyState() {
		let buyStates: BuyState[] = await this._funds.findActiveBuyStates(
			this._keypair.publicKey
		);
		console.log("buyStates", buyStates);
		for (let index = 0; index < buyStates.length; index++) {
			const buyState = buyStates[index];
			let txs: TransactionSignature[] = await this._funds.rebalanceBuyState(
				buyState
			);
			console.log("txs", txs);
			let tx: TransactionSignature = await this._funds.mintFund(buyState);
			console.log("tx", tx);
			return tx;
		}
	}

	public async getTokenInfoData(): Promise<FundToken[]> {
		const fundTokens = this._funds.getTokenListData();
		const tokensList = await this.getTokenList();

		const tokens = _.reduce(
			tokensList,
			(acc, item) => {
				const { address } = item;
				const found = _.find(fundTokens, (x) => x.tokenMint == address);
				if (found) return acc.concat([{ ...item, id: found.id } as never]);
				else return acc;
			},
			[]
		);

		return tokens;
	}

	public async getTokenList(): Promise<any[]> {
		const req = await axios.get("https://cache.prism.ag/tokenlist.json");
		return req.data.tokens;
	}

	public async setUser(user: Keypair) {
		const wallet = new Wallet(user);
		console.log("???");
		this._keypair = user;
		await this._funds.setWallet(wallet);
	}
}
