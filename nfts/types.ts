import {
	SolanaNFTCollection,
	SolanaNFTCollectionItem,
	SolanaNFTCollectionStats,
} from "../solana/nfts";

export type NFTCollectionBase = {
	name: string;
	symbol?: string;
	description?: string;
	address: string;
	image: string;
	items: NFTCollectionItemBase[];
};

export type NFTCollectionStatsBase = {
	uniqueHolders?: number;
	totalSupply?: number;
	floorPrice?: number;
};

export type NFTCollectionItemBase = {
	address: string;
	name?: string;
	symbol?: string;
	uri?: string;
	listed: boolean;
	image: string;
	collection?: string;
	updateAuthority?: string;
};

export type NFTCollection = SolanaNFTCollection;
export type NFTCollectionItem = SolanaNFTCollectionItem;
export type NFTCollectionStats = SolanaNFTCollectionStats;
