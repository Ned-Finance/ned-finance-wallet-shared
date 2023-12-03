export type Currency = {
	code: string;
	label: string;
	apiCode: string;
};

export class CurrencyImpl {
	static default = { code: "USD", label: "$", apiCode: "USD" };
}
