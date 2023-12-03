import { P, match } from "ts-pattern";
import { Network } from "../networks";
import { getNftMetadataFromUri } from "../solana/nfts/metadata";

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
