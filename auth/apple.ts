import { appleAuth } from "@invertase/react-native-apple-authentication";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { logException } from "../common/logging";

const meta = {
	file: "utils/auth/apple.ts",
};

export const loginWithApple =
	async (): Promise<FirebaseAuthTypes.UserCredential | null> => {
		try {
			// Start the sign-in request
			const appleAuthRequestResponse = await appleAuth.performRequest({
				requestedOperation: appleAuth.Operation.LOGIN,
				// As per the FAQ of react-native-apple-authentication, the name should come first in the following array.
				// See: https://github.com/invertase/react-native-apple-authentication#faqs
				requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
			});

			// Ensure Apple returned a user identityToken
			if (!appleAuthRequestResponse.identityToken) {
				throw new Error("Apple Sign-In failed - no identify token returned");
			}

			// Create a Firebase credential from the response
			const { identityToken, nonce } = appleAuthRequestResponse;
			const appleCredential = auth.AppleAuthProvider.credential(
				identityToken,
				nonce
			);

			// Sign the user in with the credential
			return await auth().signInWithCredential(appleCredential);
		} catch (e) {
			logException({
				message: "Exception trying to logging with Apple",
				capturedError: e as Error,
				meta,
			});
			return null;
		}
	};
