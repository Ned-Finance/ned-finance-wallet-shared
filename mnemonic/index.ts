import axios, { AxiosResponse } from "axios";
import { API_URL, EVERVAULT_URL } from "../constants";
import {
	GetPhraseRequest,
	GetPhraseResponse,
	SavePhraseRequest,
	SavePhraseResponse,
} from "./types";

export const saveSecretPhrase = async (data: SavePhraseRequest) => {
	const url = `${EVERVAULT_URL}/save-secret-phrase`;
	try {
		const res = await axios.post<any, AxiosResponse<SavePhraseResponse>>(
			url,
			data
		);
		return res.data.success;
	} catch (e) {
		console.log("e", e, `${EVERVAULT_URL}/save-secret-phrase`);
		return null;
	}
};

export const getSecretPhrase = async (data: GetPhraseRequest) => {
	const url = `${API_URL}/get-secret-phrases`;
	try {
		const res = await axios.post<any, AxiosResponse<GetPhraseResponse>>(
			url,
			data
		);
		return res.data;
	} catch (e) {
		console.log("e", e, `${EVERVAULT_URL}/save-secret-phrase`);
		return null;
	}
};
