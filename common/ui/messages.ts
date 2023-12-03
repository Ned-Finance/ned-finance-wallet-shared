import Clipboard from "@react-native-clipboard/clipboard";
import { Toast } from "react-native-toast-message/lib/src/Toast";

export const copyToClipboardToast = (message: string, stringToCopy: string) => {
    Clipboard.setString(stringToCopy);
    Toast.show({
        type: "info",
        text1: message,
    });
}