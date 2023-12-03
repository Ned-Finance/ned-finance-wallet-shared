import { PublicKey } from "@metaplex-foundation/js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { Connection, Keypair } from "@solana/web3.js";
import axios from "axios";
import { SolanaConfig } from "../../../utils/config";
import { SavingsManagerConfig } from "./program";

type MeteoraVaultInfoStrategy = {
	pubkey: string;
	reserve: string;
	strategy_type: string;
	strategy_name: string;
	liquidity: number;
	max_allocation: number;
	isolated: boolean;
	disabled: boolean;
	safe_utilization_threshold: number;
};

export type MeteoraVaultInfo = {
	symbol: string;
	token_address: string;
	pubkey: string;
	is_monitoring: boolean;
	vault_order: number;
	usd_rate: number;
	closest_apy: number;
	average_apy: number;
	long_apy: number;
	earned_amount: number;
	virtual_price: string;
	enabled: 1;
	lp_mint: string;
	fee_pubkey: string;
	total_amount: number;
	total_amount_with_profit: number;
	token_amount: number;
	fee_amount: number;
	lp_supply: number;
	earned_usd_amount: number;
	strategies: MeteoraVaultInfoStrategy[];
};

export class MeteoraManager {
	private _connection: Connection;
	private _keypair: Keypair;
	private _solanaConfig: SolanaConfig;
	private _meteoraVaultProgram: PublicKey;

	constructor(config: SavingsManagerConfig) {
		this._connection = config.connection;
		this._keypair = config.keypair;
		this._solanaConfig = config.solanaConfig;
		this._meteoraVaultProgram = new PublicKey(
			this._solanaConfig.METEORA.VAULTS_PROGRAM_ADDRESS
		);
	}

	get vaultProgram() {
		return this._meteoraVaultProgram;
	}

	async getMeteoraVaultInfo(
		tokenAddress: string
	): Promise<MeteoraVaultInfo | undefined> {
		const { data } = await axios.get(
			this._solanaConfig.METEORA.VAULTS_INFO_URL
		);
		const vault = data.find(
			(x: MeteoraVaultInfo) => x.token_address == tokenAddress
		);
		return vault;
	}

	getTokenVault(vaultAddress: string) {
		const [tokenVault] = PublicKey.findProgramAddressSync(
			[Buffer.from("token_vault"), new PublicKey(vaultAddress).toBuffer()],
			this._meteoraVaultProgram
		);

		return tokenVault;
	}

	async getMeteoraAccounts(
		vaultTokenAddress: string,
		account: PublicKey
	): Promise<{ [key: string]: PublicKey } | null> {
		const meteoraVaultInfo = await this.getMeteoraVaultInfo(vaultTokenAddress);
		if (meteoraVaultInfo) {
			const meteoraVaultLpMint = new PublicKey(meteoraVaultInfo.lp_mint);
			const meteoraVault = new PublicKey(meteoraVaultInfo.pubkey);
			const meteoraProgram = this.vaultProgram;
			const meteoraTokenVault = this.getTokenVault(meteoraVault.toBase58());
			const meteoraUserLpToken = await getOrCreateAssociatedTokenAccount(
				this._connection,
				this._keypair,
				meteoraVaultLpMint,
				account,
				true
			);
			return {
				vaultProgram: meteoraProgram,
				vault: meteoraVault,
				tokenVault: meteoraTokenVault,
				vaultLpMint: meteoraVaultLpMint,
				userLp: meteoraUserLpToken.address,
			};
		} else {
			return null;
		}
	}
}
