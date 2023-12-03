import AsyncStorage from "@react-native-async-storage/async-storage";
import { CURRENCY_KEY } from "../constants";
import { Currency, CurrencyImpl } from "../currencies/types";

export const saveCurrency = (currency: Currency) => {
	AsyncStorage.setItem(CURRENCY_KEY, JSON.stringify(currency));
};

export const getCurrency = async (): Promise<Currency> => {
	const currencyString = await AsyncStorage.getItem(CURRENCY_KEY);
	if (currencyString) {
		return JSON.parse(currencyString) as Currency;
	} else return CurrencyImpl.default;
};
