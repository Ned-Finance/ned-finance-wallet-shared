import _ from "lodash";
import { WalletAccount } from "../../../types/wallet";
import { JupiterManager } from "../jupiter";

export const getTokenToTransferFromMint = (
	accounts: WalletAccount[],
	mint: string
) => {
	const account = _.find(
		accounts,
		(account) => account.tokenAccount.mint == mint
	);

	if (account) {
		return account.tokenAccount;
	} else {
		const tokenFound = _.find(
			JupiterManager.getInstance().tokenList,
			(x) => x.address == mint
		);
		if (tokenFound) {
			return {
				...tokenFound,
				balance: 0,
				isWrapped: false,
				mint: tokenFound.address,
			};
		} else return null;
	}
};
