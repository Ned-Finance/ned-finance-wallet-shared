import { Metaplex, PublicKey } from "@metaplex-foundation/js";
import { Connection } from "@solana/web3.js";
import { Token } from "../tokens";
import { getNftMetadataFromUri } from "./metadata";

export const tokenFromMetaplex = async (
	connection: Connection,
	tokenMint: string
): Promise<Token | null> => {
	const metaplex = new Metaplex(connection);

	try {
		const token = await metaplex
			.nfts()
			.findByMint({ mintAddress: new PublicKey(tokenMint) });
		if (token) {
			console.log("token.uri ===>", token.uri);
			const detailsFromUri = await getNftMetadataFromUri(token.uri);
			return {
				chainId: 101,
				name: token.name,
				address: token.address.toBase58(),
				symbol: token.symbol,
				decimals: token.mint.decimals,
				logoURI: detailsFromUri.image,
				extensions: { coingeckoId: "", twitter: "", website: "", discord: "" },
			};
		} else {
			return null;
		}
	} catch (e) {
		return null;
	}
};
