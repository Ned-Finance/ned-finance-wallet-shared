import {
	_getConnectedDappsSnapshot,
	_getDappsSnapshot,
} from "../firebase/firestore/dapps";
import {
	_deleteConnectedDapp,
	_getConnectedDappByUrl,
	_getConnectedDapps,
	_saveConnectedDapp,
} from "../persistance/dapps";
import { ConnectedDapp, Dapp } from "./types";

export const getDappsSnapshot = (
	next: (snapshot: Dapp[]) => void,
	error: (error: Error) => void
) => {
	return _getDappsSnapshot(next, error);
};

export const getConnectedDappByUrl = (user: string, url: string) => {
	return _getConnectedDappByUrl(user, url);
};

export const getConnectedDapps = (user: string) => {
	return _getConnectedDapps(user);
};

export const saveConnectedDapp = (
	user: string,
	connectedDapp: Omit<
		ConnectedDapp,
		"id" | "updatedAt" | "deleted" | "deletedAt"
	> & {
		id?: string;
		date?: number;
	}
) => {
	return _saveConnectedDapp(user, connectedDapp);
};

export const deleteConnectedDapp = (user: string, connectedDappId: string) => {
	return _deleteConnectedDapp(user, connectedDappId);
};

export const getConnectedDappsSnapshot = (
	user: string,
	next: (snapshot: ConnectedDapp[]) => void,
	error: (error: Error) => void
) => {
	return _getConnectedDappsSnapshot(user, next, error);
};
