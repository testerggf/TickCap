import type { SFSymbol } from 'expo-symbols'

export function symbolForTagName(name?: string): SFSymbol {
  switch (name) {
    case '工作':
      return 'briefcase'
    case '学习':
      return 'book'
    case '休息':
      return 'cup.and.saucer'
    case '运动':
      return 'figure.run'
    case '吃饭':
      return 'fork.knife'
    case '通勤':
      return 'tram'
    case '睡眠':
      return 'moon.zzz'
    case '社交':
      return 'person.2'
    case '摸鱼':
      return 'cloud'
    case '发呆/思考':
      return 'brain.head.profile'
    case '生活杂务':
      return 'house'
    case '娱乐':
      return 'gamecontroller'
    default:
      return 'circle'
  }
}
