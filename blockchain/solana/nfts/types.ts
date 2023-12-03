import { Metadata, Nft, Sft } from "@metaplex-foundation/js";
import {
	NFTCollectionBase,
	NFTCollectionItemBase,
	NFTCollectionStatsBase,
} from "../../nfts/types";

export type NFTCompression = {
	eligible: boolean;
	compressed: boolean;
	data_hash: string;
	creator_hash: string;
	asset_hash: string;
	tree: string;
	seq: number;
	leaf_id: number;
};

export type SolanaNFTCollection = NFTCollectionBase & {
	items: SolanaNFTCollectionItem[];
};

export type SolanaNFTCollectionStats = NFTCollectionStatsBase;

export type SolanaNFTCollectionItem = NFTCollectionItemBase & {
	compression?: NFTCompression;
};

export type NFTMetaplex = Metadata | Nft | Sft;
