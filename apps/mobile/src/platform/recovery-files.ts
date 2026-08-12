import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

function recoveryDirectory(): Directory {
  return new Directory(Paths.document, 'recovery')
}

export function listRecoveryBackupFiles(): File[] {
  const directory = recoveryDirectory()
  if (!directory.exists) return []
  return directory
    .list()
    .filter(
      (entry): entry is File =>
        entry instanceof File &&
        entry.name.startsWith('tickcap-before-restore-') &&
        entry.extension === '.json',
    )
    .sort((left, right) => right.name.localeCompare(left.name))
}

export async function shareLatestRecoveryBackup(): Promise<void> {
  const latest = listRecoveryBackupFiles()[0]
  if (!latest) throw new Error('本机还没有导入前恢复点')
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('当前设备暂不支持系统分享')
  }
  // iOS 的分享扩展可能无法直接取得 App Documents 中的文件提供器句柄。
  // 保留原恢复点不动，改用 cache 中的稳定副本交给系统分享。
  const shareFile = new File(Paths.cache, 'tickcap-recovery-point.json')
  shareFile.create({ overwrite: true, intermediates: true })
  shareFile.write(await latest.text())
  await Sharing.shareAsync(shareFile.uri, {
    dialogTitle: '导出最近恢复点',
    mimeType: 'application/json',
    UTI: 'public.json',
  })
}
