import axios, { AxiosResponse } from "axios";
import { API_URL } from "../constants";
import { SendSerializedPaymentResponse } from "./types";

export const sendSerializedPayment = async (serializedMessage: string) => {
	const url = `${API_URL}/payment-transfer`;
	try {
		const res = await axios.post<
			any,
			AxiosResponse<SendSerializedPaymentResponse>
		>(url, {
			serializedMessage,
		});
		return res.data;
	} catch (e) {
		console.log("e");
		return null;
	}
};
