import _ from "lodash";
import Aes from "react-native-aes-crypto";
import EncryptedStorage from "react-native-encrypted-storage";
import { decrypt, encrypt } from "../encryption";

const PIN_KEY = "pin";
const IV_PIN = "iv_pin";

export const setPin = async (pin: string) => {
	const iv = await Aes.randomKey(16);
	await EncryptedStorage.setItem(IV_PIN, iv);
	const encriptedPin = await encrypt(pin, pin, iv);
	await EncryptedStorage.setItem(PIN_KEY, encriptedPin);
	return encriptedPin;
};

export const getPin = async (pin: string) => {
	try {
		const iv = await EncryptedStorage.getItem(IV_PIN);
		const encryptedPin = await EncryptedStorage.getItem(PIN_KEY);
		const decryptedPin = await decrypt(pin, encryptedPin, iv);
		return decryptedPin;
	} catch (e) {
		return null;
	}
};

export const removePin = async (pin: string) => {
	await EncryptedStorage.removeItem(PIN_KEY);
};

export const isPinSet = async () => {
	const exists = await EncryptedStorage.getItem(PIN_KEY);
	return !_.isNil(exists);
};
