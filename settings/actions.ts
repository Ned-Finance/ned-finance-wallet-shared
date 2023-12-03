import {
	_getSettings,
	_getSettingsSnapshot,
	_saveSettings,
} from "../firebase/firestore/settings";
import { Settings } from "./types";

export const saveSettings = (owner: string, settings: Partial<Settings>) => {
	return _saveSettings(owner, settings);
};

export const getSettings = (owner: string) => {
	return _getSettings(owner);
};
export const getSettingsSnapshot = (
	owner: string,
	next: (snapshot: Partial<Settings>) => void,
	error: (error: Error) => void
) => {
	return _getSettingsSnapshot(owner, next, error);
};
