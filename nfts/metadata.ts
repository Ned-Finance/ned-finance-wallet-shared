import { P, match } from "ts-pattern";
import { getNftMetadataFromUri } from "../blockchain/solana/nfts/metadata";
import { Network } from "../networks";

export const getMetadata = (url: string, network: Network) => {
	return match({ network })
		.with(
			{ network: P.when((network) => network == Network.Solana) },
			async () => {
				/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
				const metadata = await getNftMetadataFromUri(url);
				/* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
				return metadata;
			}
		)
		.run();
};
