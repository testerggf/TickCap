import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

export type ExportKind = 'markdown' | 'json' | 'backup'

export async function shareExportFile(
  kind: ExportKind,
  content: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('当前设备暂不支持系统分享')
  }
  const extension = kind === 'markdown' ? 'md' : 'json'
  const basename = kind === 'backup' ? 'tickcap-backup' : 'tickcap-export'
  const file = new File(Paths.cache, `${basename}.${extension}`)
  file.create({ overwrite: true, intermediates: true })
  file.write(content)
  await Sharing.shareAsync(file.uri, {
    dialogTitle:
      kind === 'markdown'
        ? '导出 Markdown'
        : kind === 'backup'
          ? '备份 TickCap 数据'
          : '导出 JSON',
    mimeType:
      kind === 'markdown'
        ? 'text/markdown'
        : 'application/json',
    UTI:
      kind === 'markdown'
        ? 'net.daringfireball.markdown'
        : 'public.json',
  })
}
