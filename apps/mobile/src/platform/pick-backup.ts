import { File } from 'expo-file-system'

export async function pickBackupText(): Promise<string | null> {
  try {
    const selected = await File.pickFileAsync(undefined, 'application/json')
    const file = Array.isArray(selected) ? selected[0] : selected
    if (!file) return null
    if (file.size !== null && file.size > 50 * 1024 * 1024) {
      throw new Error('备份文件超过 50 MB，未进行任何写入')
    }
    return await file.text()
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) return null
    throw error
  }
}
