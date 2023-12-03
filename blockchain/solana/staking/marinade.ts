import {
	BN,
	Marinade,
	MarinadeConfig,
} from "@marinade.finance/marinade-ts-sdk";
import { MarinadeResult } from "@marinade.finance/marinade-ts-sdk/dist/src/marinade.types";
import {
	TransactionMessage,
	TransactionSignature,
	VersionedTransaction,
} from "@solana/web3.js";
import axios from "axios";
import {
	StakeAPY,
	StakeAmount,
	StakeEarning,
	StakingConfig,
	StakingProvider,
} from ".";
import { round2Decimals } from "../../../numbers";
import { getATAForAddress } from "../accounts";
import { getTransactionsForAddress } from "../transactions";
import { sendTransaction } from "../transactions/helpers";

type MarinadeInitConfig = Readonly<StakingConfig & Partial<MarinadeConfig>>;

export class MarinadeStaking implements StakingProvider {
	private _marinade: Marinade;
	private _config: MarinadeInitConfig;

	private _mSOLAddress = {
		"mainnet-beta": "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
		testnet: "",
	};

	constructor(config: MarinadeInitConfig) {
		this._config = config;
		const marinadeConfig = new MarinadeConfig(config);

		this._marinade = new Marinade(marinadeConfig);
	}

	private async sendTransaction(
		amount: StakeAmount,
		method: (
			amount: StakeAmount
		) => Promise<MarinadeResult.Deposit | MarinadeResult.LiquidUnstake>
	): Promise<TransactionSignature> {
		const { associatedMSolTokenAccountAddress, transaction } = await method(
			amount
		);

		const latestBlockhash = await this._config.connection.getLatestBlockhash(
			"finalized"
		);

		const messageV0 = new TransactionMessage({
			payerKey: this._config.keypair.publicKey,
			recentBlockhash: latestBlockhash.blockhash,
			instructions: transaction.instructions,
		}).compileToV0Message();

		const versionedTransaction = new VersionedTransaction(messageV0);
		versionedTransaction.sign([this._config.keypair]);

		const tx = await sendTransaction(versionedTransaction);

		return tx;
	}

	public async stake(amount: StakeAmount): Promise<TransactionSignature> {
		const fn = (amount: StakeAmount) => this._marinade.deposit(new BN(amount));
		return await this.sendTransaction(amount, fn);
	}
	public async unstake(amount: StakeAmount): Promise<TransactionSignature> {
		const fn = (amount: StakeAmount) =>
			this._marinade.liquidUnstake(new BN(amount));
		return await this.sendTransaction(amount, fn);
	}
	public async getEarnings(): Promise<StakeEarning> {
		// TODO: work on an environment setup for tests
		const ata = getATAForAddress(
			this._mSOLAddress["mainnet-beta"],
			this._config.keypair.publicKey.toBase58()
		);

		const { transactions, latestSignature } = await getTransactionsForAddress(
			ata,
			this._config.publicKey!.toBase58(),
			[]
		);

		console.log("latestSignature ==>", latestSignature);
		console.log("transactions ==>", transactions.length);

		// const transactions =
		// console.log('signatures', signatures, signatures.length)
		return 0 as StakeEarning;
	}
	public async getAPY(): Promise<StakeAPY> {
		const response = await axios.get(
			"https://api.marinade.finance/msol/apy/7d"
		);
		const apy = response.data.value * 100;
		return round2Decimals(apy) as StakeAPY;
	}
	public getSymbol(): string {
		return "mSOL";
	}
	public getProviderName(): string {
		return "Marinade";
	}
}
