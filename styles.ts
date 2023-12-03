import { StyleSheet } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";

export const primaryColor = "#00EFD1";
export const secondaryColor = "#0CD4F8";
export const decreasingColor = "#E55381";
export const greyDark1 = "#17181C";
export const greyDark2 = "#242530";
export const greyLight1 = "#363743";
export const greyLight2 = "#6F6F75";
export const greyLight3 = "#BEBEBE";
export const redColor = "#E55381";
export const pinkColor = "#FAA6FF";
export const yellowColor = "#FFAD60";
export const purpleColor = "#B658FF";

export const general = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: greyDark1,
	},
	page: {
		paddingHorizontal: "5%",
		flex: 1,
	},
});

export const texts = StyleSheet.create({
	title: {
		fontSize: RFValue(36),
		lineHeight: RFValue(36),
		color: "white",
		fontWeight: "400",
	},
	subtitle: {
		color: greyLight2,
		fontSize: RFValue(14),
		fontWeight: "400",
		textAlign: "left",
	},
	common: {
		color: "white",
		fontSize: RFValue(14),
	},
	commonSmall: {
		color: "white",
		fontSize: RFValue(12),
	},
	balance: {
		color: "white",
		fontSize: RFValue(48),
		fontWeight: "700",
	},
	usdPrice: {
		color: primaryColor,
		fontSize: RFValue(14),
		fontWeight: "300",
	},
	sectionTitle: {
		fontSize: RFValue(16),
		color: "#6F6F75",
	},
	inputGreyLight: {
		padding: 10,
		height: 50,
		width: "100%",
		backgroundColor: greyDark2,
		color: greyLight2,
		borderRadius: 10,
		fontSize: RFValue(14),
		lineHeight: RFValue(16),
	},
	inputGreyDark: {
		padding: 10,
		height: 50,
		width: "100%",
		backgroundColor: greyDark1,
		color: greyLight2,
		borderRadius: 10,
	},
	inputLightDark: {
		padding: 10,
		height: 50,
		width: "100%",
		backgroundColor: greyDark2,
		color: "white",
		borderRadius: 10,
	},
	body: {
		fontSize: RFValue(16),
	},
	header2: {
		fontSize: RFValue(28),
		fontWeight: "400",
	},
	header3: {
		fontSize: RFValue(28),
		fontWeight: "400",
	},
	header4: {
		fontSize: RFValue(18),
		fontWeight: "400",
	},
	header5: {
		fontSize: RFValue(14),
		fontWeight: "400",
	},
});

export const alignments = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-end",
	},
	row_space: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	row_end: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
	},
	row_start: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-start",
	},
});

export const modalize = {
	modalize__content: {
		zIndex: 5,

		marginTop: "auto",

		backgroundColor: greyDark1,
		borderTopLeftRadius: 30,
		borderTopRightRadius: 30,

		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.1,
		shadowRadius: 30,

		elevation: 4,
	},
	handle__shape: {
		top: 8,

		width: 90,
		height: 5,

		borderRadius: 5,
		backgroundColor: greyLight2,
	},
};

export const bottomSheet = StyleSheet.create({
	sheet: {
		marginHorizontal: 24,
	},
	sheetBackground: {
		backgroundColor: greyDark2,
	},
	sheetContainer: {},
	bottomSheetTitleWithClose: {
		alignItems: "center",
		justifyContent: "space-between",
		flexDirection: "row",
		width: "100%",
	},
});

const tabBarStyle = {
	default: {
		borderTopColor: "transparent",
		position: "absolute",
		height: 70,
	},
	visible: {
		display: "flex",
	},
	hidden: {
		display: "none",
	},
};

export const tabBarStyleVisible = {
	...tabBarStyle.default,
	...tabBarStyle.visible,
};
export const tabBarStyleHidden = {
	...tabBarStyle.default,
	...tabBarStyle.hidden,
};
