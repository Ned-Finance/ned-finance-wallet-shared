import Aes from 'react-native-aes-crypto'
import { getUniqueId } from 'react-native-device-info';


const ITERATIONS = 5000
const LENGTH = 256
const ALGORITHM = 'aes-256-cbc'

const getSalt = async () => {
    return getUniqueId()
}

export const encrypt = async (password, string, iv) => {
    const key = await generateKey(password)
    const cipher =  await Aes.encrypt(string, key, iv, ALGORITHM)
    return cipher
}

export const decrypt = async (password, cipher, iv) => {
    const key = await generateKey(password)
    const decrypted = await Aes.decrypt(cipher, key, iv, ALGORITHM)
    return decrypted
}

const generateKey = async (password) => {
    const salt = await getSalt()
    const key = await Aes.pbkdf2(password, salt, ITERATIONS, LENGTH)
    return key
}



export default {
    encrypt, decrypt
}