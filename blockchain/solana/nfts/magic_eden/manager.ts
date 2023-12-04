import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import {
	Connection,
	Keypair,
	PublicKey,
	VersionedTransaction,
} from "@solana/web3.js";
import axios from "axios";
import * as _ from "lodash";
import {
	NFTMetaplex,
	SolanaNFTCollectionItem,
	SolanaNFTCollectionStats,
} from "..";
import {
	default as constants,
	default as solana,
} from "../../../solana/constants";
import {
	getOrCreateTokenAccount,
	getTokenAccount,
} from "../../transactions/helpers";
import { METokenMetadata, NFTListingDetails } from "./interfaces";

export class MagicEdenManager {
	private static _instance: MagicEdenManager;
	private _connection!: Connection;
	private _keypair!: Keypair;
	private _metaplex!: Metaplex;
	private _headers = {
		authorization: `Bearer ${solana.MAGIC_EDEN_API_KEY}`,
		accept: "application/json",
	};

	private constructor() {}

	public static getInstance(): MagicEdenManager {
		if (!MagicEdenManager._instance) {
			MagicEdenManager._instance = new MagicEdenManager();
		}

		return MagicEdenManager._instance;
	}

	public async init(connection: Connection) {
		this._connection = connection;
	}

	public setKeypair(keypair: Keypair) {
		this._keypair = keypair;
		this.initializeMetaplex();
	}

	private initializeMetaplex() {
		this._metaplex = new Metaplex(this._connection).use(
			keypairIdentity(this._keypair)
		);
	}

	public async getTokenMetadata(
		mintAddress: string
	): Promise<METokenMetadata | null> {
		try {
			const responseMetadata = await axios.get(
				`${solana.MAGIC_EDEN_API_URL}/tokens/${mintAddress}`
			);
			return responseMetadata.data;
		} catch (err) {
			return null;
		}
	}

	public async getCollectionStats(
		collectionName: string
	): Promise<SolanaNFTCollectionStats | null> {
		try {
			const [responseHolderStats, responseStats] = await Promise.all([
				axios.get(
					`${solana.MAGIC_EDEN_API_URL}/collections/${collectionName}/holder_stats/`
				),
				axios.get(
					`${solana.MAGIC_EDEN_API_URL}/collections/${collectionName}/stats/`
				),
			]);

			return {
				uniqueHolders: responseHolderStats.data.uniqueHolders,
				totalSupply: responseHolderStats.data.totalSupply,
				floorPrice: responseStats.data.floorPrice / Math.pow(10, 9),
			};
		} catch (err) {
			console.log("??", err);
			return null;
		}
	}

	public async getListInstructions(
		walletAddress: string,
		tokenMint: string,
		price: number
	): Promise<VersionedTransaction | null> {
		try {
			const tokenAccount = await getOrCreateTokenAccount(
				this._keypair,
				tokenMint,
				walletAddress
			);

			const { data } = await axios.get(
				`${solana.MAGIC_EDEN_API_URL}/instructions/sell`,
				{
					params: {
						seller: walletAddress,
						auctionHouseAddress: solana.MAGIC_EDEN_AUCTION_HOUSE_URL,
						tokenMint,
						tokenAccount: tokenAccount.address.toBase58(),
						price,
					},
					headers: this._headers,
				}
			);

			const txBuffer = Buffer.from(data.txSigned.data, "base64");
			const transaction = VersionedTransaction.deserialize(txBuffer);
			transaction.sign([this._keypair]);

			return transaction;
		} catch (err) {
			console.log("getListInstructions ---->", err);
			return null;
		}
	}

	public async getUpdateListingPriceInstructions(
		walletAddress: string,
		tokenMint: string,
		currentPrice: number,
		price: number
	): Promise<VersionedTransaction | null> {
		try {
			const tokenAccount = await getTokenAccount(tokenMint, walletAddress);

			const { data } = await axios.get(
				`${solana.MAGIC_EDEN_API_URL}/instructions/sell_change_price`,
				{
					params: {
						seller: walletAddress,
						auctionHouseAddress: solana.MAGIC_EDEN_AUCTION_HOUSE_URL,
						tokenMint,
						tokenAccount: tokenAccount.toBase58(),
						price: currentPrice,
						newPrice: price,
					},
					headers: this._headers,
				}
			);

			const txBuffer = Buffer.from(data.txSigned.data, "base64");
			const transaction = VersionedTransaction.deserialize(txBuffer);
			transaction.sign([this._keypair]);

			return transaction;
		} catch (err) {
			console.log("getUpdateListingPriceInstructions --->", err);
			return null;
		}
	}

	public async getRemoveListInstructions(
		walletAddress: string,
		tokenMint: string,
		price: number
	): Promise<VersionedTransaction | null> {
		try {
			console.log(walletAddress, tokenMint);
			const tokenAccount = await getTokenAccount(tokenMint, walletAddress);

			console.log({
				seller: walletAddress,
				auctionHouseAddress: solana.MAGIC_EDEN_AUCTION_HOUSE_URL,
				tokenMint,
				tokenAccount: tokenAccount.toBase58(),
				price,
			});

			const { data } = await axios.get(
				`${solana.MAGIC_EDEN_API_URL}/instructions/sell_cancel`,
				{
					params: {
						seller: walletAddress,
						auctionHouseAddress: solana.MAGIC_EDEN_AUCTION_HOUSE_URL,
						tokenMint,
						tokenAccount: tokenAccount.toBase58(),
						price,
					},
					headers: this._headers,
				}
			);

			const txBuffer = Buffer.from(data.txSigned.data, "base64");
			const transaction = VersionedTransaction.deserialize(txBuffer);
			transaction.sign([this._keypair]);

			return transaction;
		} catch (err) {
			console.log("getRemoveListInstructions ---->", err);
			return null;
		}
	}

	public async getListingForToken(
		address: string
	): Promise<NFTListingDetails | null> {
		try {
			const { data }: { data: NFTListingDetails[] } = await axios.get(
				`https://api-mainnet.magiceden.dev/v2/tokens/${address}/listings`
			);
			const listing = _.find(
				data,
				(listing: NFTListingDetails) =>
					listing.auctionHouse == solana.MAGIC_EDEN_AUCTION_HOUSE_URL
			);
			return listing ? listing : null;
		} catch (err) {
			return null;
		}
	}

	private parseAssetToNFTItemCollection(
		nft: NFTMetaplex
	): SolanaNFTCollectionItem {
		const { collection } = nft;

		return {
			address: nft.address.toBase58(),
			image: nft.json?.image || "",
			name: nft.name,
			symbol: nft.symbol,
			uri: nft.uri,
			listed: true,
			collection: collection ? collection.address.toBase58() : undefined,
			updateAuthority: nft.updateAuthorityAddress.toBase58(),
		};
	}

	public async getListedNFTsForWallet(
		address: string
	): Promise<SolanaNFTCollectionItem[]> {
		try {
			const { data } = await axios.get(
				`${constants.MAGIC_EDEN_API_URL}/wallets/${address}/tokens`,
				{
					params: { listStatus: "listed" },
				}
			);
			const items = data.map(async (x: any) => {
				const nft = this._metaplex.nfts().findByMint({
					mintAddress: new PublicKey(x.mintAddress),
				});
				return nft;
			});

			const results = await Promise.all(items);

			console.log("results", JSON.stringify(results, undefined, 2));

			return results.map(this.parseAssetToNFTItemCollection);
		} catch (err) {
			console.log("getListedNFTsForWallet: err ===>", err);
			return []; // Promise.resolve([])
		}
	}
}
