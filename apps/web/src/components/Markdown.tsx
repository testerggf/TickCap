/** 极简 Markdown 渲染（只支持 ##、-、段落——复盘输出的约定子集） */
export function Markdown({ text }: { text: string }) {
  const blocks = text.split('\n')
  return (
    <div className="space-y-1.5 text-[15px] leading-relaxed">
      {blocks.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <h3 key={i} className="t1 pt-2 text-[15px] font-bold">
              {line.slice(3)}
            </h3>
          )
        }
        if (line.startsWith('- ')) {
          return (
            <p key={i} className="t2 pl-3">
              · {line.slice(2)}
            </p>
          )
        }
        if (!line.trim()) return null
        return (
          <p key={i} className="t2">
            {line}
          </p>
        )
      })}
    </div>
  )
}
