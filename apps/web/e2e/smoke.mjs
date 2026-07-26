/**
 * TickCap MVP 冒烟 E2E（07 §7.1 主链路）：
 * onboarding → 首颗胶囊 → 今日页快速滴答 → 展开滴答(带概括/心情) → 封存 → 复盘 → 档案馆回看
 */
import puppeteer from 'puppeteer-core'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100'
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = new URL('.', import.meta.url).pathname

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, text, tag = 'button') {
  const ok = await page.evaluate(
    ({ text, tag }) => {
      const els = [...document.querySelectorAll(tag)]
      const el = els.find((e) => e.textContent && e.textContent.trim().includes(text))
      if (!el) return false
      el.click()
      return true
    },
    { text, tag },
  )
  if (!ok) throw new Error(`找不到可点击元素: ${text}`)
}

async function hasText(page, text) {
  return page.evaluate((t) => document.body.innerText.includes(t), text)
}

async function expectText(page, text, label) {
  for (let i = 0; i < 20; i++) {
    if (await hasText(page, text)) {
      console.log(`✓ ${label ?? text}`)
      return
    }
    await sleep(300)
  }
  throw new Error(`断言失败：页面上没有出现「${text}」`)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message))

  // ---- Onboarding ----
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await expectText(page, '把每一刻装进胶囊', 'onboarding 第 1 屏')
  await page.screenshot({ path: OUT + 'shot-1-onboarding.png' })
  await clickText(page, '开始')
  await expectText(page, '你现在在做什么', 'onboarding 第 2 屏')
  await clickText(page, '正在摸鱼')
  await expectText(page, '已挂上你的时间轴', '第一颗胶囊完成')
  await expectText(page, '每晚几点提醒你封存', 'onboarding 第 3 屏')
  await clickText(page, '进入 TickCap')

  // ---- 今日页 ----
  await sleep(800)
  await expectText(page, '摸鱼', '今日页出现第一颗胶囊')
  await expectText(page, '已滴答 1 次', '计数正确')

  // 快速滴答：点高频标签
  await clickText(page, '工作')
  await sleep(500)
  await expectText(page, '已滴答 2 次', '快速滴答成功（2 次交互内完成）')

  // 展开滴答：概括 + 心情
  await clickText(page, '这段时间在做什么…')
  await sleep(400)
  await page.type('input[placeholder="一句话概括（可不填）"]', '写 TickCap 的 MVP')
  await clickText(page, '学习')
  await clickText(page, '🤩')
  const fabClicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[aria-label="滴答"]')]
    if (!btns.length) return false
    btns[0].click()
    return true
  })
  if (!fabClicked) throw new Error('找不到滴答按钮')
  await sleep(500)
  await expectText(page, '已滴答 3 次', '展开滴答成功')
  await expectText(page, '写 TickCap 的 MVP', '概括显示在胶囊上')
  await page.screenshot({ path: OUT + 'shot-2-today.png' })

  // ---- 封存流程 ----
  await clickText(page, '封存')
  await expectText(page, '这是你的', '封存第一幕：回放')
  await sleep(2600) // 回放自动结束
  await expectText(page, '复盘', '封存第二幕：复盘')
  await expectText(page, '一日纵览', '复盘内容生成（本地降级版，无 AI key）')
  await expectText(page, '时间账单', '时间账单存在')
  await expectText(page, '明日一问', '明日一问存在')
  await page.screenshot({ path: OUT + 'shot-3-review.png' })
  await page.type('textarea[placeholder^="补一笔"]', '第一天用自己的产品，很奇妙。')
  await clickText(page, '封存今日')
  await expectText(page, '封存完毕', '封存完成')
  await expectText(page, '连续第 1 天', 'streak = 1')
  await page.screenshot({ path: OUT + 'shot-4-sealed.png' })
  await sleep(2300) // 等自动关闭

  await expectText(page, '已封存 ✓', '今日页显示已封存')

  // ---- 档案馆 ----
  await page.goto(BASE + '/archive', { waitUntil: 'networkidle0' })
  await sleep(600)
  await expectText(page, '档案馆', '档案馆打开')
  await expectText(page, '封存 1 天', '档案馆统计正确')
  await page.screenshot({ path: OUT + 'shot-5-archive.png' })

  // 回看当日：点今天的日期格
  const today = await page.evaluate(() => {
    const s = localStorage.getItem('tickcap-store')
    const data = JSON.parse(s)
    return Object.keys(data.state.seals)[0]
  })
  await page.goto(BASE + '/archive/' + today, { waitUntil: 'networkidle0' })
  await sleep(600)
  await expectText(page, '已封存 · 连续第 1 天', '当日详情显示封存状态')
  await expectText(page, '当日复盘', '复盘可回看')
  await expectText(page, '第一天用自己的产品', '手写"补一笔"已保存')
  await page.screenshot({ path: OUT + 'shot-6-day-detail.png' })

  // ---- 报告页 ----
  await page.goto(BASE + '/reports', { waitUntil: 'networkidle0' })
  await sleep(600)
  await expectText(page, '一日纵览', '报告列表出现日复盘')

  // ---- 刷新持久化 ----
  await page.goto(BASE + '/today', { waitUntil: 'networkidle0' })
  await sleep(800)
  await expectText(page, '已滴答 3 次', '刷新后数据持久化 ✓')

  console.log('\n🎉 E2E 全部通过')
} finally {
  await browser.close()
}
