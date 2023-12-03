import {
	_deleteContact,
	_getContactByAlias,
	_getContacts,
	_getContactsSnapshot,
	_saveContact,
	_updateContact,
} from "../firebase/firestore/contacts";
import { Contact } from "./types";

export const saveContact = async (
	owner: string,
	contact: Omit<Contact, "id" | "date">
) => {
	await _saveContact(owner, { ...contact, date: Date.now() });
};

export const getContacts = async (owner: string, limit: number) =>
	await _getContacts(owner, limit);

export const getContactByAlias = async (owner: string, alias: string) =>
	await _getContactByAlias(owner, alias);

export const getContactsSnapshot = (
	address: string,
	limit: number,
	next: (snapshot: Contact[]) => void,
	error: (error: Error) => void
) => {
	return _getContactsSnapshot(address, limit, next, error);
};

export const deleteContact = (address: string, id: string) => {
	return _deleteContact(address, id);
};

export const updateContact = (
	address: string,
	id: string,
	contactData: Contact
) => {
	return _updateContact(address, id, contactData);
};
