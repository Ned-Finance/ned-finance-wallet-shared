import { P, match } from "ts-pattern";
import { getNftMetadataFromUri } from "../blockchain/solana/nfts/metadata";
import { Network } from "../networks";

export const getMetadata = (data: any, network: Network) => {
	return match({ network })
		.with(
			{ network: P.when((network) => network == Network.Solana) },
			async () => {
				const metadata = await getNftMetadataFromUri(data as string);
				return metadata;
			}
		)
		.run();
};
