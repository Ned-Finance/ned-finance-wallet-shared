import { PublicKey } from "@metaplex-foundation/js";
import { AccountLayout } from "@solana/spl-token";
import { AccountInfo, Context } from "@solana/web3.js";
import { logException } from "../../../logging";
import { getConnection } from "../connection";

const meta = {
	file: "utils/solana/ws/index.ts",
};

export const subscribeToAccountUpdates = (
	address: string,
	callback: () => void
): number => {
	try {
		return getConnection().onAccountChange(
			new PublicKey(address),
			(accountInfo: AccountInfo<Buffer>, context: Context) => {
				const data = AccountLayout.decode(accountInfo.data);
				console.log("address===>", data, address);
				callback();
			},
			"confirmed"
		);
	} catch (e) {
		logException({
			message: `Error registering for real-time updates for wallet ${address}`,
			capturedError: e as Error,
			meta,
		});
		return -1;
	}
};

export const unsubscribeToAccountUpdates = async (subscriptionId: number) => {
	return getConnection().removeAccountChangeListener(subscriptionId);
};
