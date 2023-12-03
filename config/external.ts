import { FirebaseRemoteConfigTypes } from "@react-native-firebase/remote-config";
import { logDebug } from "../common/logging";
import { REMOTE_CONFIG } from "../constants";
import * as firebaseConfig from "../firebase/config";

const meta = {
	file: "utils/config/index.ts",
};

export const initializeRemoteConfig = (): Promise<boolean> => {
	return new Promise<boolean>((resolve, reject) => {
		firebaseConfig
			.fetchAndActivate({
				[REMOTE_CONFIG.giphyApiKey]: "",
			})
			.then((r) => {
				console.log("carga?", r);
				logDebug({
					message: "Firebase config fetched successfully",
					meta,
				});
				resolve(true);
			})
			.catch((e) => {
				console.log("error?", e);
				logDebug({
					message: `Firebase config error ${e}`,
					meta,
				});
				resolve(false);
			});
	});
};

export const registerForConfigUpdates = async (
	onKeyUpdate: (event?: { updatedKeys: string[] }) => void
) => {
	return await firebaseConfig.onConfigUpdated(onKeyUpdate);
};

// type ConfigItemType = string | number | boolean;
class ConfigItem {
	private value: FirebaseRemoteConfigTypes.ConfigValue;

	constructor(value: FirebaseRemoteConfigTypes.ConfigValue) {
		this.value = value;
	}

	asString() {
		return this.value.asString();
	}

	asNumber() {
		return this.value.asNumber();
	}

	asBoolean() {
		return this.value.asBoolean();
	}
}

export const getConfigValue = (key: string): ConfigItem => {
	// const type = typeof
	// const all = firebaseConfig.getAllConfigValues();
	// console.log("all", all);
	return new ConfigItem(firebaseConfig.getConfigValue(key));
};
