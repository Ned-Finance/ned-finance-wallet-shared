export interface METokenMetadata {
	mintAddress: string;
	owner: string;
	supply: number;
	collection: string;
	name: string;
	updateAuthority: string;
	primarySaleHappened: boolean;
	sellerFeeBasisPoints: number;
	image: string;
	attributes: { [key: string]: any };
	tokenStandard: number;
}

export interface NFTListingDetails {
	pdaAddress: string;
	auctionHouse: string;
	tokenAddress: string;
	tokenMint: string;
	seller: string;
	sellerReferral: string;
	tokenSize: number;
	price: number;
	rarity: any;
	expiry: number;
}
