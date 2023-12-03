import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { logException } from "../common/logging";

const meta = {
	file: "utils/auth/google.ts",
};

export const loginWithGoogle = async () => {
	try {
		// Check if your device supports Google Play
		await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
		// Get the users ID token
		const { idToken } = await GoogleSignin.signIn();

		// Create a Google credential with the token
		const googleCredential = auth.GoogleAuthProvider.credential(idToken);

		// Sign-in the user with the credential
		return await auth().signInWithCredential(googleCredential);
	} catch (e) {
		logException({
			message: "Exception trying to logging with Google",
			capturedError: e as Error,
			meta,
		});
		return null;
	}
};
