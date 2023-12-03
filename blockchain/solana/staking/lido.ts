import { getStakeApy, SolidoSDK } from "@lidofinance/solido-sdk";
import {
	PublicKey,
	Transaction,
	TransactionMessage,
	TransactionSignature,
	VersionedTransaction,
} from "@solana/web3.js";
import {
	StakeAmount,
	StakeAPY,
	StakeEarning,
	StakingConfig,
	StakingProvider,
} from ".";
import { round2Decimals } from "../../../numbers";
import { sendTransaction } from "../transactions/helpers";

type LidoInitConfig = Readonly<
	StakingConfig & { clusterName: "mainnet-beta"; referralAddress?: string }
>;

type LidoResult =
	| {
			transaction: Transaction;
			stSolAccountAddress: PublicKey;
	  }
	| {
			transaction: Transaction;
			deactivatingSolAccountAddress: PublicKey;
	  };

export class LidoStaking implements StakingProvider {
	private _lidoSdk: SolidoSDK;
	private _config: LidoInitConfig;

	constructor(config: LidoInitConfig) {
		this._config = config;
		this._lidoSdk = new SolidoSDK(
			config.clusterName,
			config.connection,
			config.referralAddress
		);
	}

	private async sendTransaction(
		amount: StakeAmount,
		method: (amount: StakeAmount) => Promise<LidoResult>
	): Promise<TransactionSignature> {
		const { transaction } = await method(amount);

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
		const fn = (amount: StakeAmount) =>
			this._lidoSdk.getStakeTransaction({
				amount: amount,
				payerAddress: this._config.keypair.publicKey,
			});
		return await this.sendTransaction(amount, fn);
	}
	public async unstake(amount: StakeAmount): Promise<TransactionSignature> {
		const fn = (amount: StakeAmount) =>
			this._lidoSdk.getUnStakeTransaction({
				amount: amount,
				payerAddress: this._config.keypair.publicKey,
			});
		return await this.sendTransaction(amount, fn);
	}
	public async getEarnings(): Promise<StakeEarning> {
		return 0 as StakeEarning;
	}
	public async getAPY(): Promise<StakeAPY> {
		const stakeApy = await getStakeApy();
		const apy = stakeApy.max.apy;
		return round2Decimals(apy) as StakeAPY;
	}
	public getSymbol(): string {
		return "stSOL";
	}
	public getProviderName(): string {
		return "Lido";
	}
}
