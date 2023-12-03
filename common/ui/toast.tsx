import { BaseToast, ErrorToast, InfoToast } from "react-native-toast-message";
import { primaryColor, redColor, secondaryColor } from "../../styles";

export const toastConfig = {
	/*
  Overwrite 'success' type,
  by modifying the existing `BaseToast` component
*/
	success: (props: any) => (
		<BaseToast
			{...props}
			style={{ borderLeftWidth: 0, backgroundColor: primaryColor }}
			text1NumberOfLines={0}
			text2NumberOfLines={0}
			text1Style={{
				fontSize: 15,
				fontWeight: "500",
				color: "black",
			}}
			text2Style={{
				fontSize: 13,
				color: "black",
			}}
			contentContainerStyle={{}}
		/>
	),
	/*
  Overwrite 'error' type,
  by modifying the existing `ErrorToast` component
*/
	error: (props: any) => (
		<ErrorToast
			{...props}
			style={{ borderLeftWidth: 0, backgroundColor: redColor }}
			text1NumberOfLines={0}
			text2NumberOfLines={0}
			text1Style={{
				fontSize: 15,
				fontWeight: "500",
				color: "black",
			}}
			text2Style={{
				fontSize: 13,
				color: "black",
			}}
		/>
	),
	/*
  Overwrite 'info' type,
  by modifying the existing `ErrorToast` component
*/
	info: (props: any) => (
		<InfoToast
			{...props}
			style={{ borderLeftWidth: 0, backgroundColor: secondaryColor }}
			text1NumberOfLines={0}
			text2NumberOfLines={0}
			text1Style={{
				fontSize: 15,
				fontWeight: "500",
				color: "black",
			}}
			text2Style={{
				fontSize: 13,
				color: "black",
			}}
		/>
	),
};
