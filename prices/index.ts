import axios from "axios";
import { API_URL } from "../constants";
import { getCurrency } from "../persistance/currency";
import { CurrencyPriceVsUsdResponse } from "./types";

export const getCurrencyPriceVsUsd = async () => {
	const currency = await getCurrency();

	if (currency.code != "USD") {
		const response = await axios.get<CurrencyPriceVsUsdResponse>(
			`${API_URL}/get-currency-price-vs-usd`,
			{ params: { fiatCurrency: currency.apiCode } }
		);
		return { fiatPriceVsUsd: response.data.price, currency };
	} else {
		return { fiatPriceVsUsd: 1, currency };
	}
};
