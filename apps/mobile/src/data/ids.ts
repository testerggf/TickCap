import * as Crypto from 'expo-crypto'
import { uuidV7 } from '@tickcap/core'

export async function createUuidV7(now = Date.now()): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(10)
  return uuidV7(now, randomBytes)
}
