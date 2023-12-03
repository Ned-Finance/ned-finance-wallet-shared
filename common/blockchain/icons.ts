import { P, match } from "ts-pattern";
import { solanaIcon } from "../../icons";
import { Network } from "../../networks";

export const getNetworkIcon = (network: Network) => {
	return match({ network })
		.with(
			{ network: P.when((network) => network == Network.Solana) },
			() => solanaIcon
		)
		.run();
};
