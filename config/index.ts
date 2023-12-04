export const DEVELOPMENT = "DEVELOPMENT";
export const PRODUCTION = "PRODUCTION";
export const LOCAL = "LOCAL";

export type MeteoraConfig = {
	VAULTS_PROGRAM_ADDRESS: string;
	VAULTS_INFO_URL: string;
};

export type SolanaConfig = {
	HTTP_RPC_ENDPOINT: string;
	WS_RPC_ENDPOINT: string;
	SAVING_VAULTS_ALLOWED_TOKENS: string[];
	VAULT_PROGRAM_ADDRESS: string;
	METEORA: MeteoraConfig;
};

export type NedConfigBlock = {
	name: string;
	solana: SolanaConfig;
};

export type NedConfig = {
	environment: string;
	PRODUCTION: NedConfigBlock;
	DEVELOPMENT: NedConfigBlock;
	LOCAL: NedConfigBlock;
};

export const config: NedConfig = {
	environment: PRODUCTION,
	PRODUCTION: {
		name: PRODUCTION,
		solana: {
			HTTP_RPC_ENDPOINT: "https://rpc.shyft.to/?api_key=TFsuPdurTUD_DuE3",
			// WS_RPC_ENDPOINT: "wss://rpc.shyft.to/?api_key=TFsuPdurTUD_DuE3",
			WS_RPC_ENDPOINT:
				"wss://broken-little-pine.solana-mainnet.discover.quiknode.pro/682559021682f7e5395ee05f43247a8342681d4c/",
			SAVING_VAULTS_ALLOWED_TOKENS: [
				"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
				"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
				"So11111111111111111111111111111111111111112", // SOL
			],
			VAULT_PROGRAM_ADDRESS: "NEDXqFFWdkRYUE9oRRAteiS22tXDvBiSZgNcGn9G5QA",
			METEORA: {
				VAULTS_PROGRAM_ADDRESS: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi", // Affiliate one
				VAULTS_INFO_URL: "https://merv2-api.mercurial.finance/vault_info",
			},
		},
	},
	DEVELOPMENT: {
		name: DEVELOPMENT,
		solana: {
			// HTTP_RPC_ENDPOINT: 'https://devnet.helius-rpc.com/?api-key=be1f775e-5cb5-4e93-8f5d-02a2cf9b2261',
			// WS_RPC_ENDPOINT: 'wss://devnet.helius-rpc.com/?api-key=be1f775e-5cb5-4e93-8f5d-02a2cf9b2261',
			HTTP_RPC_ENDPOINT: "https://api.devnet.solana.com",
			WS_RPC_ENDPOINT: "wss://api.devnet.solana.com",
			SAVING_VAULTS_ALLOWED_TOKENS: [
				"4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // USDC
				"So11111111111111111111111111111111111111112", // SOL
			],
			VAULT_PROGRAM_ADDRESS: "NEDXqFFWdkRYUE9oRRAteiS22tXDvBiSZgNcGn9G5QA",
			METEORA: {
				VAULTS_PROGRAM_ADDRESS: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi", // Affiliate program GacY9YuN16HNRTy7ZWwULPccwvfFSBeNLuAQP7y38Du3
				VAULTS_INFO_URL: "https://dev-keeper.raccoons.dev/vault_info",
			},
		},
	},
	LOCAL: {
		name: LOCAL,
		solana: {
			HTTP_RPC_ENDPOINT: "http://127.0.0.1:8899",
			WS_RPC_ENDPOINT: "ws://127.0.0.1:8900",
			SAVING_VAULTS_ALLOWED_TOKENS: [
				"4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // USDC
				"So11111111111111111111111111111111111111112", // SOL
			],
			VAULT_PROGRAM_ADDRESS: "NEDXqFFWdkRYUE9oRRAteiS22tXDvBiSZgNcGn9G5QA",
			METEORA: {
				VAULTS_PROGRAM_ADDRESS: "GacY9YuN16HNRTy7ZWwULPccwvfFSBeNLuAQP7y38Du3", // Affiliate one
				VAULTS_INFO_URL: "https://dev-keeper.raccoons.dev/vault_info",
			},
		},
	},
};

export const getConfig = (): NedConfigBlock => {
	if (config.environment == LOCAL) return config.LOCAL;
	if (config.environment == DEVELOPMENT) return config.DEVELOPMENT;
	if (config.environment == PRODUCTION) return config.PRODUCTION;
	return config.LOCAL;
};
