// const authForDefaultApp = firebaseAuth

import auth from "@react-native-firebase/auth";
import axios from "axios";
import { logDebug, logException } from "../../common/logging";
import { API_URL } from "../../constants";
import { AuthResponse } from "./types";

const meta = {
	file: "utils/firebase/auth/index.ts",
};

export const loginWithSignedMessage = async (
	signedMessage: number[],
	publicKey: number[],
	address: string
): Promise<boolean> => {
	logDebug({
		message: `Requesting token for login to server for address ${address} and signed message ${signedMessage}`,
		meta,
	});
	return new Promise<boolean>((resolve, reject) => {
		axios
			.post<AuthResponse>(`${API_URL}/generate-token`, {
				signedMessage,
				publicKey,
				address,
			})
			.then((res) => {
				logDebug({
					message: `Response token ${res.data
						.token!} for login to server for address ${address} and signed message ${signedMessage}`,
					meta,
				});
				auth()
					.signInWithCustomToken(res.data.token!)
					.then((r) => {
						resolve(true);
					})
					.catch((e) => {
						logException({
							message: `Couldn't get sign in custom token for user address ${address} with signed message ${signedMessage.toString()}`,
							capturedError: e as Error,
							meta,
						});
						resolve(false);
					});
			})
			.catch((e) => {
				logException({
					message: `Couldn't getnerate token for sign in for user address ${address} with signed message ${signedMessage.toString()}`,
					capturedError: e as Error,
					meta,
				});
				resolve(false);
			});
	});
};

export const logout = async (address: string): Promise<boolean> => {
	logDebug({
		message: `Logging out from firebase ${address}`,
		meta,
	});

	return await auth()
		.signOut()
		.then((e) => true)
		.catch((e) => false);
};
