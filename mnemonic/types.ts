export type SavePhraseRequest = {
	secretPhrase: string;
	providerId: string;
	uid: string;
	token: string;
};

export type GetPhraseRequest = {
	token: string;
};

export type SavePhraseResponse = {
	success: boolean;
};

export type GetPhraseResponse = {
	mnemonics: string[];
	success: boolean;
};
