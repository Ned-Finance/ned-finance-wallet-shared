import remoteConfig, {
	FirebaseRemoteConfigTypes,
} from "@react-native-firebase/remote-config";

export const fetchAndActivate = (
	defaults: FirebaseRemoteConfigTypes.ConfigDefaults
): Promise<boolean> => {
	return new Promise<boolean>((resolve, reject) => {
		remoteConfig()
			.setDefaults(defaults)
			.then((r) => {
				remoteConfig()
					.fetchAndActivate()
					.then((result) => resolve(result))
					.catch((e) => reject(e));
			})
			.catch((e) => reject(e));
	});
};

export const onConfigUpdated = async (
	onKeysUpdate: (event?: { updatedKeys: string[] }) => void
) => {
	return await remoteConfig().onConfigUpdated((event, error) => {
		console.log("---->", event, error);
		if (error === null) {
			remoteConfig().activate();
			onKeysUpdate(event);
		}
	});
};

export const getConfigValue = (key: string) => {
	// console.log("-------------->", remoteConfig().getAll());
	return remoteConfig().getValue(key);
};

export const getAllConfigValues = () => {
	// console.log("-------------->", remoteConfig().getAll());
	return remoteConfig().getAll();
};
