# 11 · iOS 开发计划（已批准，执行中）

> 状态：**2026-08-12 个人本地版最小 MVP 已通过真机用户验收，进入 14 天稳定性观察**
> 制定日期：2026-07-29
> 依据：[02-功能设计](02-功能设计.md)、[04-路线图](04-路线图.md)、[05-技术架构](05-技术架构.md)、[06-UI设计规范](06-UI设计规范.md)、[07-详细技术设计](07-详细技术设计.md)、[08-AI复盘技术设计](08-AI复盘技术设计.md)、[09-埋点与数据指标](09-埋点与数据指标.md)

## 1. 结论

### 1.1 可行性结论

**可行，建议采用 Expo React Native 做 iOS-first 客户端，并保留未来 Android 复用能力。**

项目已有三项关键基础：

1. `@tickcap/core` 已实现归属日、时间推断、空隙、Streak 等平台无关领域规则；
2. `@tickcap/tokens` 已沉淀视觉令牌，可继续生成 React Native 可消费的令牌；
3. 数据模型已预留 UUID、`updated_at`、软删除等离线同步基础。

但当前不是“把 Web 页面打包成 App”即可完成。Web M1 使用 `localStorage`，多数交互和 UI 仍是浏览器实现，`@tickcap/api` 与独立 server 尚未落地。iOS 客户端需要新建原生 UI 层、本地 SQLite 数据层、同步队列、通知能力和真机发布链路。

### 1.2 优先级变化的性质

现有路线图是“Web H5 → 小程序 → App”，本计划响应新的业务优先级，建议调整为：

> **保留现有 Web M1 → iOS-first → 共享后端与同步 → 小程序/Android 后续复用**

这是路线图级决策。方案批准后先同步修改 04/05/07/09，再开始业务代码；G0 期间只做权威文档与契约对齐。

### 1.3 交付节奏判断

- 可交互技术样机：约 1–2 周；
- 本地模式 iOS 内部 Alpha：累计约 4–5 周；
- 含账号、可靠同步、通知快捷记录的 TestFlight Beta：累计约 8–12 周；
- 工作量估算：约 40–59 个有效工程日，未计 Apple 审核、云资源采购和外部 API 等待时间。

时间估算用于排期，不作为牺牲测试或范围边界的承诺。

## 2. 当前基础与缺口

### 2.1 可直接复用

| 资产 | 复用方式 | 现状 |
|------|----------|------|
| `@tickcap/core` | iOS 与 Web 直接调用同一套领域规则 | 已有 34 个单测 |
| `@tickcap/tokens` | 生成 RN 颜色、字号、间距、圆角、动效参数 | 基础可用，需去除 CSS 专属表达 |
| PRD 与 UI 图纸 | 作为 iOS 页面、交互和文案的验收基准 | 已升级为双主题：时间琥珀默认、果冻玻璃可选 |
| Web M1 | 作为行为参考与回归基线 | 主链路已跑通 |
| 数据模型 | 作为 SQLite、API、Postgres 的共同语义 | 已有字段设计，尚无正式迁移 |

### 2.2 必须补齐

| 缺口 | 影响 |
|------|------|
| `@tickcap/api` 只有包声明，尚无可用 schema/client | 无法形成移动端与服务端稳定契约 |
| `apps/server` 尚未形成可运行后端 | 账号、跨设备同步、远程 AI、远程推送不可交付 |
| Web 状态层绑定 `localStorage` | 不能直接用于 RN，也不是离线优先数据库 |
| 复盘打包、格式化、标签解析部分仍在 `apps/web` | 行为可能在 Web/iOS 间漂移，需抽回共享层 |
| tokens 含 CSS gradient/aurora 字符串 | RN 不能直接消费，需要平台中立的原始令牌 |
| 当前 Web 删除是物理过滤，且 UUID 不是明确 v7 | 与同步所需 tombstone/幂等语义仍有差距 |
| 未建立 iOS 工程、原生扩展、签名和 TestFlight 流程 | 无法完成真机与分发验收 |

### 2.3 本机环境实测

2026-07-29 的只读检查结果：

- Xcode 26.3（Build 17C529）；
- Swift 6.2.4；
- iOS 26.3 Simulator runtime 已安装，iPhone 17 Pro 模拟器可用；
- iPhone 14 真机已连接、配对，系统为 iOS 18.7.1，Developer Mode 已开启；
- Node.js 22.22.1、pnpm 9.15.0；
- 当前未检测到有效 code-signing identity。

[Expo SDK 官方兼容表](https://docs.expo.dev/versions/latest/)显示：SDK 57 需要 Xcode 26.4+；SDK 55 支持 Xcode 26.2+ 且最低 iOS 15.1。开工时的推荐选择是：

1. **优先升级 Xcode 到 26.4+，使用当时最新稳定 Expo SDK 57；**
2. 若必须立即开始，用 Expo SDK 55 完成技术样机，升级工具链后再锁定正式基线；
3. TickCap 自身的 deployment target 定为 **iOS 18.0**，用户的 iOS 18.7.1 真机属于覆盖范围。

正式开工当天必须再次核对 Expo/Xcode/App Store 要求，并将版本锁入仓库。

## 3. 技术路线选择

| 方案 | 优点 | 主要问题 | 结论 |
|------|------|----------|------|
| Expo React Native + 必要的 Swift 扩展 | 直接复用 TS 领域层；iOS-first 后可复用 Android；通知、SQLite、原生扩展均有路径 | Widget/App Intent 等仍需少量 Swift；需维护 prebuild/dev client | **推荐** |
| 全量 SwiftUI | 原生能力与系统一致性最高 | `core/api/tokens` 无法自然复用，领域规则容易双写；未来 Android 成本高 | 不选 |
| Capacitor/WebView 包装现有 H5 | 最快看到页面 | 原生手感、离线数据库、通知快捷记录和性能上限不足 | 不选 |
| React Native bare | 原生控制完整 | 初期工程维护面比 Expo 大，当前没有必要 | 仅在 Expo 能力被真实验证阻塞时降级采用 |

推荐采用 **Expo Development Build + Continuous Native Generation**，而不是把 Expo Go 作为正式开发载体。需要原生配置或扩展的能力必须能在本地 Xcode 工程和 CI 中重复生成。

## 4. 目标架构

```text
apps/mobile (Expo React Native, iOS-first)
├── app/                    Expo Router 页面与深链
├── src/ui/                 iOS 原生手感组件，只消费 tokens
├── src/features/           today/archive/reports/settings/onboarding
├── src/data/
│   ├── db/                 SQLite schema + 版本迁移
│   ├── repositories/       胶囊/封存/报告/设置读写
│   ├── outbox/             离线写队列与幂等重试
│   └── sync/               push/pull、冲突处理、checkpoint
├── src/platform/           notifications/secure-store/haptics/deeplink
└── ios-extensions/         必要时的 WidgetKit/App Intents Swift 扩展

packages/core               领域规则、同步冲突规则、复盘 Context、隐私过滤
packages/tokens             平台中立令牌 + Web/RN 适配输出
packages/api                Zod 契约、DTO、类型安全 client
apps/server                 认证、同步、AI、提醒、导出、埋点
```

### 4.1 数据原则

1. SQLite 是 iOS 的本地事实来源；界面永远先读写本地，不等待网络。
2. 每次写入同一事务更新业务表并写入 outbox。
3. 服务端按客户端生成的 UUID 幂等处理；成功后推进同步 checkpoint。
4. 删除使用 tombstone，不在同步完成前物理清除。
5. 普通字段采用最后写入胜；`detail` 冲突保留双版本并提示用户选择。
6. 服务端仍按 `@tickcap/core` 重算归属日，客户端结果只用于即时显示。
7. 未登录也可完整使用本地模式；登录后采取显式、可回滚的“合并到账号”流程。
8. 现有 Web `localStorage` 数据不自动覆盖、不静默清空；后续通过一次性导入/合并迁移接入账号。

### 4.2 安全与隐私

- access/refresh token 存 Keychain（Expo SecureStore），不存 AsyncStorage；
- 私密胶囊的 `summary/detail/mood` 在共享 Context Builder 中物理剔除后才允许发往 AI；
- 埋点 outbox 永不携带正文；
- SQLite 首版依赖 iOS Data Protection；是否启用 SQLCipher 在安全评审后决定，不在未验证性能和密钥恢复方案前贸然开启；
- 调试日志不得打印正文、token、邮箱验证码或推送凭据。

### 4.3 UI 与 iOS 18.7 兼容

- 以 06 的双主题体系为唯一视觉依据：`chronoAmber` 时间琥珀为默认，`jellyGlass` 果冻玻璃完整保留为可选主题；
- `visualTheme` 与 `colorScheme` 是两个独立维度，必须覆盖时间琥珀/果冻玻璃 × Light/Dark 四种组合；
- 两套主题共享页面、业务组件、文案、图标语义与交互，只通过 `@tickcap/tokens` 的语义令牌改变材质和视觉气质；
- iOS 18 使用 BlurView、渐变和半透明 surface 实现；系统支持更高阶材质时做 availability 增强；
- 系统预置标签、Tab、封存和滴答等功能图标按 06 §14 使用 SF Symbols；不得使用三角形、字符或 emoji 临时占位；
- 开启“降低透明度”时自动降级为不透明 surface；
- 支持深浅模式、Dynamic Type、VoiceOver、Reduce Motion、Safe Area、键盘避让；
- 所有视觉数值来自 `@tickcap/tokens`，不在组件内硬编码。

## 5. iOS v1 范围

### 5.1 必须交付

1. Onboarding 三屏与 30 秒首记；
2. 今日时间轴、快速滴答、展开滴答、空隙补记、编辑/删除/星标/敏感；
3. 封存三幕、Streak、本地降级复盘；
4. 档案馆、日复盘列表、当日回看；
5. 设置：日界、起床时间、标签、提醒、主题、阅读导出与完整备份/恢复；
6. SQLite 离线优先，杀进程/重启不丢数据；
7. 带版本与 SHA-256 校验的本地完整备份，保存到“文件”或 iCloud Drive；
8. 本地提醒、智能节流、通知深链；
9. 通知快捷操作至少完成“高频标签一键滴答”；文本快捷回复以技术样机验证结果决定是否纳入 v1；
10. 09 事件字典中与 iOS v1 有关的事件；
11. iPhone 14 / iOS 18.7.1 个人签名安装、升级与长期自用基线。

### 5.2 明确不进入 iOS v1

- Android 与微信小程序；
- 周报/月报/年报、会员体系；
- 语音滴答、日历导入、正在进行模式；
- 桌面/锁屏小组件、灵动岛 Live Activity；
- 端到端加密、AI 对话检索；
- 邮箱账号、服务端、云同步、远程推送、在线 AI 与多人 TestFlight（个人版稳定后进入 v1.1 评审）；
- 为未来功能预埋未被 07 定义的半成品业务代码。

小组件、App Shortcuts、Action Button、Live Activity 放入 iOS v1.1 专项。原因是它们需要 WidgetKit/App Intents 原生扩展、App Group 数据共享和独立验收，不应阻塞核心习惯闭环的首个 TestFlight。

实现依据以 [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)、[Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) 和 [Apple Widget/App Intents](https://developer.apple.com/documentation/appintents/widgets-and-live-activities) 的官方文档为准。

## 6. 分阶段实施计划

### G0 · 方案批准与契约对齐（2–3 日）

**工作：**

- 审核并批准本计划中的平台优先级、技术栈、v1 范围和阶段顺序；
- 修改 04 的路线图顺序、05 的 iOS-first 架构描述；
- 在 07 增加 mobile 章节、SQLite schema、同步 API、冲突规则和 iOS 验收标准；
- 在 09 现有闭集内补充确有必要的 iOS 属性；若需新事件，先改字典；
- 定义 bundle identifier、URL scheme、Associated Domains、环境命名。

**出口标准：**

- 04/05/07/09 无互相冲突；
- API/同步契约先于实现冻结；
- 本轮仍不写业务代码。

### G1 · 原生能力风险样机（3–4 日）

**工作：**

- 建立最小 Expo Development Build；
- 先在当前 iOS Simulator 验证 SQLite、Blur、深链与本地通知生命周期；
- 通知分类按钮、冷启动/后台/杀进程三种状态下的真机响应后移至 G6 发布门禁；
- 验证本地数据库与未来 App Group/Widget 扩展的共享可行性；
- 识别签名、真机安装与最小 TestFlight 上传链路的前置条件。

**出口标准：**

- 模拟器能写入并跨进程重启持久化 SQLite 记录；
- 通知点击可准确深链到滴答栏；
- 明确“一键通知滴答”的剩余真机验证项，不将未执行的 action 宣称通过；
- 形成风险样机记录，不把样机代码直接当生产架构。

> 2026-07-29 用户决定先完成模拟器开发，最终再安装到 iOS 18.7.1 真机验证。因此真机安装、通知 action 与 TestFlight 不再阻塞 G2/G3，但仍是 G6 不可跳过的发布门禁。

### G2 · 共享基础层（4–6 日）

**工作：**

- 将 tokens 拆为平台中立原始值和 Web/RN 输出；
- 把复盘 Context Builder、隐私过滤、通用格式/标签规则迁入正确共享层；
- 落地 `@tickcap/api` Zod schema 与 client；
- 补齐 UUID v7、软删除、schema version、同步状态等数据契约；
- 现有 Web 行为保持兼容，所有迁移增量且可回滚。

**出口标准：**

- `core/tokens/api` 全部 typecheck；
- core/tokens 单测全绿并增加移动端相关边界；
- Web M1 原有 24 项 E2E 不回归；
- 隐私过滤只有一套权威实现。

### G3 · iOS 本地模式完整主链路（10–14 日）

> 2026-07-30 模拟器开发与预验收通过：新用户 2 次点击完成首颗胶囊；最近 30 次快速标签记录 3 秒达成率 100%；50 颗时间轴加载时 Expo 性能监视器 UI/JS 均为 60fps；可访问性树已覆盖 onboarding、快速记录、时间轴、设置与四入口导航。深浅色、Dynamic Type、VoiceOver、Reduce Motion 与 iOS 18.7.1 真机复验仍按既定决策保留到 G6。

**工作顺序：**

1. SQLite schema、迁移、repository、Zustand 视图状态；
2. App Shell、底部导航、主题、无障碍基础；
3. Onboarding 与快速滴答；
4. 时间轴、空隙、编辑弹层；
5. 封存、降级复盘、档案馆、报告、设置、导出；
6. 本地事件 outbox 与诊断页。

**出口标准：**

- 真机冷启动到完成快速滴答 ≤3 次交互；
- 3 秒达成率在 30 次人工样本中 ≥70%，直点标签路径目标 >90%；
- 飞行模式可连续记录、编辑、封存；杀进程后数据仍在；
- 凌晨 01:00 归昨日、跨零点、重叠、次日 11:59 补封等边界通过；
- 时间轴典型 8 颗和压力 50 颗场景稳定 60fps，无明显掉帧；
- 深浅色、Dynamic Type、VoiceOver、Reduce Motion 完成一轮真机验收。

### G3-UI · 双主题视觉升级（G4 前优先，5–8 日）

> G3 已完成业务闭环与模拟器功能出口，但当时界面仍是功能型 Alpha，不代表 06 双主题视觉验收通过。2026-07-30 用户批准先按 06 完成默认时间琥珀，并保留果冻玻璃可选主题。
>
> **2026-07-30 模拟器出口通过：** 四种主题/明暗组合完成实时切换与持久化验收；今日、档案馆、报告、设置、Onboarding、编辑与封存共用同一主题数据流。原生 iOS Development Build 编译安装成功，整仓 typecheck 与 108 项测试全绿；8/50 颗性能沿用 G3 已通过的同组件数据路径基线，完整真机辅助功能矩阵仍留 G6。

**工作顺序：**

1. 扩展 `@tickcap/tokens` 为 `visualTheme × colorScheme` 四种组合；
2. App Shell 正式 SF Symbols、主题持久化与外观设置；
3. 今日页时间轴、时长比例胶囊、现在线和底部滴答岛；
4. 胶囊详情即时保存，移除功能型“保存”页结构；
5. 档案馆月历、报告材质、封存动画、Onboarding 视觉统一；
6. 8/50 颗性能、四组合截图、模拟器无障碍回归。

**出口标准：**

- 新用户默认进入时间琥珀，设置中可切换果冻玻璃，切换不重启、不丢草稿和业务状态；
- 今日页的文字和图标与 06 §14 一致，不保留临时三角形、缺字 emoji 或系统表单式大标题；
- 两主题共用同一页面组件和数据流，不复制业务实现；
- 时间轴是“时间列 + 轨道 + 节点 + 时长比例胶囊”，不再是等高白卡列表；
- 底部滴答岛保持快速标签直点路径，30 次 3 秒指标不得低于 G3 基线；
- 时间琥珀/果冻玻璃 × Light/Dark 四种组合通过对比度、截图与 8/50 颗 60fps 目标预验收；
- Dynamic Type、VoiceOver、Reduce Motion/Transparency 和 iOS 18.7.1 真机最终验收仍由 G6 统一把关。

### G4 · 账号、后端与离线同步（10–15 日）

**工作：**

- Hono/Drizzle server、邮箱验证码、token 旋转；
- Postgres 迁移与 `@tickcap/api` 集成测试；
- 增量 push/pull、checkpoint、outbox 重试、tombstone；
- 本地匿名数据登录后合并；
- detail 冲突双版本保留；
- AI SSE、失败降级、导出与注销冷静期；
- Web M1 数据的非破坏迁移/导入路径。

**出口标准：**

- 断网创建 20 颗，恢复后服务端恰好 20 颗；
- 同一 outbox 重放不产生重复；
- 两设备编辑普通字段按契约收敛；
- `detail` 冲突不丢任一版本；
- 私密正文不进入任何 AI 请求 fixture；
- AI 失败不阻塞封存，`edited_md` 不被重新生成覆盖；
- 注销与 7 天撤回流程通过集成测试。

### G5 · iOS 提醒与通知快捷记录（6–9 日）

**工作：**

- 首次封存后再申请通知权限；
- 本地提醒作为离线兜底，服务端/APNs 作为可靠远程调度；
- 间隔、时段、刚记录/刚打开跳过、连续 3 次未响应降频；
- 通知分类：高频标签按钮、打开滴答栏、可行时加入文本回复；
- 处理前台、后台、杀进程、锁屏、重复 action 与网络失败；
- `source=notification` 与提醒事件全链路入库。

**出口标准：**

- 已记录间隔内不再提醒；
- 3 次未响应后自动降频且 App 内可见说明；
- 通知 action 重复投递不产生重复胶囊；
- 无网 action 先落本地，恢复后只同步一次；
- 权限拒绝后不反复骚扰，设置页给出中性说明；
- `reminder_sent/click` 不包含正文。

### G6 · 稳定性、TestFlight 与内测（5–8 日）

**工作：**

- 单元、API 集成、移动端 E2E、真机验收矩阵；
- 启动耗时、内存、SQLite 查询、时间轴 FPS、崩溃率检查；
- App Store 隐私清单、权限文案、AI 标识、账号注销、导出；
- TestFlight 分组、构建编号、回滚包、内测反馈模板；
- 先 5–10 人封闭测试，再扩大至 20–50 人。

**出口标准：**

- CI 的 lint/typecheck/core tests/API integration/mobile E2E 全绿；
- iOS 18.7.1 真机主链路连续跑 3 轮；
- 无 P0/P1 缺陷，P2 有明确记录；
- TestFlight 安装、升级、数据迁移、回滚预案均通过；
- 09 的北极星及先导指标可查询。

## 7. 测试矩阵

| 维度 | 最低覆盖 |
|------|----------|
| 系统 | iOS 18.7.1 真机；当前/最新 Simulator；发布前补一个最新正式 iOS 真机或云真机 |
| 生命周期 | 前台、后台、被系统回收、用户杀进程、重启手机 |
| 网络 | 在线、飞行模式、弱网、请求超时、重复响应、服务端 5xx |
| 时间 | 日界前后、跨零点、DST 时区、手动改时区、次日宽限边界 |
| 数据 | 首装、升级、schema migration、匿名转登录、双设备冲突、删除同步 |
| UI | 深浅色、字体放大、VoiceOver、降低透明度、减少动态效果 |
| 隐私 | 私密胶囊、日志脱敏、埋点无正文、Keychain、注销/导出 |
| 性能 | 冷启动、快速滴答延迟、8/50 颗时间轴、长详情、月历 |

移动端 E2E 工具在 G1 后根据稳定性选定，优先轻量方案；不为测试框架引入重型运行时依赖。

## 8. 主要风险与对策

| 风险 | 等级 | 对策 |
|------|------|------|
| iOS 提前导致后端与同步成为关键路径 | 高 | 先交付本地 Alpha，随后并行完成 server/sync；不让云依赖阻塞 UI 验证 |
| Web 逻辑散落在 UI 层，双端行为漂移 | 高 | G2 先抽共享规则，再大规模写 iOS 页面 |
| 通知 action 在杀进程状态行为不稳定 | 高 | G1 真机 spike；必要时用 Swift 原生模块，不靠假设承诺 0 秒记录 |
| tokens 的 Web 表达不能直接用于 RN | 中 | 保留平台中立 token source，由适配器生成 Web/RN 产物 |
| Expo SDK 与 Xcode 版本不匹配 | 中 | 开工日锁版本；优先升级 Xcode 26.4+，CI 与本机使用同一基线 |
| 无签名身份阻塞真机/TestFlight | 中 | G1 前配置 Apple Developer Team 与自动签名，先做最小上传验证 |
| iOS 18 无新系统材质能力 | 低 | Blur/solid surface 分级降级，不把核心视觉绑定在 iOS 26 API |
| 范围膨胀到 Widget/Live Activity | 高 | v1 明确排除；核心习惯闭环通过后再进入 v1.1 |

## 9. 开工前需要用户确认/准备

### 9.1 已批准的方案项

1. 平台优先级调整为“Web M1 保留 → iOS-first → 小程序/Android 后续”；
2. 技术栈采用 Expo React Native + 必要 Swift 扩展；
3. deployment target 为 iOS 18.0，iOS 18.7.1 真机作为首要验收设备；
4. iOS v1 按 §5 范围，小组件/灵动岛延后到 v1.1；
5. 先本地 Alpha，再账号同步，再通知与 TestFlight 的阶段顺序；
6. 40–59 个有效工程日的质量优先估算。

### 9.2 人工依赖

- Apple Developer Team；当前 Personal Team 可做普通真机开发，但不支持 Push Notifications capability；
- 唯一 bundle identifier（建议形如 `com.<主体>.tickcap`，需用户确认主体）；
- Xcode 登录 Apple ID 并生成有效签名身份；
- App Store Connect 中创建 App 记录；
- APNs/EAS 推送凭据；
- 云服务器、域名/备案与数据库；
- DeepSeek/通义等服务端 API key，仅放 `.env`/密钥系统；
- 隐私政策、用户协议、支持邮箱与上架主体信息。

## 10. 审核通过后的第一步

审核通过后不直接从页面堆叠开始，而按以下顺序执行：

1. 修改 04/05/07/09 并完成交叉评审；
2. 建立 G1 模拟器风险样机，记录真机门禁；
3. 根据样机结果冻结 Expo/Xcode/通知实现方案；
4. 再进入 G2/G3 的生产代码。

用户已明确批准方案并要求使用新分支开发；G0 与 G1 模拟器风险样机已完成，后续每个阶段仍以本节出口标准作为进入下一阶段的门禁，真机相关项目统一在 G6 关闭。

## 11. G4–G6 后续执行计划（2026-08-10）

> 本节是 G3/G3-UI 完成后的执行版计划；与前文章节冲突时，以本节的切片顺序和阶段门禁为准，但不改变 07/08/09 已确定的产品契约与隐私红线。本轮只冻结方案，不开始业务编码。

### 11.1 当前基线与执行原则

- 当前分支为 `codex/ios-first`；G0–G3-UI 已通过模拟器出口，整仓 typecheck 与 108 项共享层测试全绿；
- `apps/server` 当前只有空骨架，G4 从服务端基础设施开始，不把 Web 临时代码当成云端实现迁移；
- 匿名本地模式永久可用，账号是同步增强而不是记录前置条件；登录、同步、AI 任一失败均不得阻塞本地记录与封存；
- 所有数据库变更只允许新增 Drizzle migration，不修改历史 migration，不清空 SQLite/PostgreSQL 自愈；
- 每个切片都先更新 07/08/09 契约，再更新 `@tickcap/api`，最后实现 server/iOS；共享领域规则只进入 `@tickcap/core`；
- 每个切片单独验收并更新 `WORK.md`，未通过当前门禁不进入下一切片；不把 mock、Simulator 或开发邮箱结果宣称为生产环境通过；
- 当前本机没有 Docker/PostgreSQL，仅有 Homebrew。G4A 开工前单独确认使用 Homebrew PostgreSQL（推荐，最轻）或 Docker Desktop；本计划阶段不执行安装。

### 11.2 总体排期与依赖关系

| 阶段 | 预计有效工程日 | 可在本机独立完成 | 外部依赖 | 阶段结果 |
|------|----------------|------------------|----------|----------|
| G4A–G4F | 14–20 日 | A–D、E 的 mock、F 的本地集成 | 真实邮箱、AI key、云数据库/域名用于最终 staging | 账号、同步、AI、数据生命周期闭环 |
| G5A–G5D | 7–10 日 | 本地调度、权限、action 幂等大部 | APNs/远程推送需要支持 Push capability 的 Team | 提醒与通知快捷记录闭环 |
| G6A–G6D | 7–10 日 | 自动化、性能与合规预检 | iPhone 14、App Store Connect、TestFlight、隐私/协议资料 | 可控范围内测发布 |

剩余总量预计 28–40 个有效工程日，不包含 ICP 备案、Apple/邮箱/云资源审核等待。G4 本地工程验收通过后可先进入 G5A/G5B；G4 staging 与 G5C 的外部依赖可随后补齐，但全部必须在 G6 发布门禁前关闭。

### 11.3 G4 · 账号、后端、AI 与离线同步

#### G4A · 服务端骨架与 PostgreSQL（2–3 日）

**范围：**

1. 冻结环境变量、错误包、JWT/刷新令牌、同步游标的最终契约；
2. 建立 Hono、Drizzle、配置校验、request-id、错误处理中间件与 `/health/live`、`/health/ready`；
3. 将 07 §3 DDL 落为只前进 migration，并加入 12 个稳定 UUID 系统标签 seed；
4. 建立 Vitest + 独立测试数据库；CI 使用 PostgreSQL service，本机运行方式不写入业务代码；
5. 只补基础设施，不提前实现业务路由。

**验收：** 空数据库和已有上一版数据库均能幂等迁移；重复 seed 不增行；ready 检查真实验证数据库；配置缺失快速失败且日志不泄漏密钥；schema 与 07 一致。

#### G4B · 邮箱认证与 iOS 会话（2–3 日）

**范围：**

1. 邮箱验证码申请/验证、频率限制、错误 5 次作废和哈希存储；
2. access token + 旋转式 refresh token、登出撤销、重复 refresh 检测；
3. 邮件发送采用 provider 接口；开发环境仅把验证码写入安全测试 sink，生产环境禁止该出口；
4. iOS token 只存 SecureStore/Keychain，SQLite、日志与埋点不得保存 token；
5. 登录入口置于“我的”，不打断匿名 onboarding 和快速记录。

**验收：** 1 分钟/5 次日限流、过期码、错误次数、refresh 旋转/重放、logout 全部有 API 集成测试；杀进程后可恢复会话；Keychain 不可用时保持匿名本地模式并给中性提示。

#### G4C · 单设备增量同步主链路（4–5 日）

**范围：**

1. 按 `tags → capsules → day_seals → ai_reports/settings` 顺序打通 push/pull；
2. operation 收据、change log 与业务实体在同一 PostgreSQL 事务；
3. iOS runner 实现单实例、批量 push、循环 pull、checkpoint、指数退避和回前台/网络恢复触发；
4. 每批 pull 与 cursor 在同一 SQLite 事务应用；只有应用成功后才删除本地 outbox；
5. tombstone、服务端时间偏差、401 单次 refresh 与 5xx 重试纳入状态机。

**验收：** 飞行模式创建 20 颗，联网后服务端恰好 20 颗；同一 `op_id` 重放 3 次仍只有一条实体/change；push 成功后杀进程可安全续传；pull 中断从最后已提交 cursor 恢复；现有匿名 SQLite 数据始终保留。

#### G4D · 匿名合并、双设备与冲突（2–3 日）

**范围：**

1. 首次登录将匿名数据作为幂等 operation 上传，不改本地实体 ID，不做破坏性“搬库”；
2. 普通非重叠字段按契约合并，同字段按服务端顺序收敛；
3. `detail` 冲突写入 `sync_conflicts`，同时保留 local/server 两版并提供明确选择；
4. 构造第二设备测试客户端，覆盖编辑、删除、解封重封和游标追赶；
5. 退出账号只停止云同步，不删除本地已下载数据；是否清除设备数据必须是独立显式操作。

**验收：** 匿名合并重复执行不重复；两设备普通字段最终一致；`detail` 两版均可恢复；软删除不会被旧设备复活；解封重封的 `first_sealed_at/streak` 不漂移。

#### G4E · AI SSE 与本地降级（2–3 日）

**范围：**

1. prompt 只进入 `apps/server/prompts/` 的版本文件，报告记录 `model/prompt_version/token`；
2. 复用 core 的 Context Builder 和隐私过滤，server 不复制过滤规则；
3. provider adapter 先用确定性 fixture/mock 验证 SSE `delta/done/failed`，再接真实供应商；
4. 超时/5xx 重试后展示现有本地复盘；封存事务不等待 AI；
5. 编辑版与生成原文分列，重新生成插新行，永不覆盖 `edited_md`。

**验收：** 私密胶囊正文在请求 fixture 中物理缺失；流中断可重连/读取最终状态；AI 失败仍完成封存和 streak；真实 key 验收只在 staging 执行，测试禁止调用真实模型。

#### G4F · 数据生命周期、Web 导入与 staging（2–4 日）

**范围：**

1. 云端导出、注销申请、7 天撤回与到期清理 job；
2. Web M1 `localStorage` 提供一次性“预览 → 合并 → 报告”导入，不静默覆盖云端/手机数据；
3. event outbox 批量上报与 09 闭集校验，失败不影响业务同步；
4. staging 接真实 HTTPS、邮箱 provider、PostgreSQL 与 AI key，完成端到端冒烟；
5. 输出迁移、备份、恢复和关闭云功能的回滚手册。

**验收：** 导入可重复执行且给出新增/跳过/冲突统计；注销 7 天内可撤回、到期测试时钟可清理；导出包含完整用户数据；staging 从注册到双端同步再到 AI 复盘跑通。外部资源未就绪时只标记“本地工程通过”，G4 不宣称整体完成。

### 11.4 G5 · 原生提醒与通知快捷记录

#### G5A · 权限与本地调度（2 日）

- 仅在首次封存后的价值时刻或用户主动开启时请求权限；
- 按间隔、活跃时段、weekday、封存时间生成本地提醒；刚记录/刚打开则跳过；
- 权限拒绝后不重复弹窗，设置页显示系统设置入口和中性说明；
- 验收 30/60/120 分钟、跨日界、时区变化、重启后的调度重建。

#### G5B · 通知 action 与幂等落库（2–3 日）

- 高频标签、打开滴答栏为必做 action；文本回复仅在真机 spike 稳定时启用；
- `notification_id + action_id + tag_id` 生成确定性 operation key；
- action 先落 SQLite/outbox，再尝试同步；无网和重复回调不得丢失/重复；
- 覆盖前台、后台、锁屏、系统回收和用户杀进程，无法可靠 0 秒记录时降级为打开 App 聚焦滴答栏。

#### G5C · APNs/Expo 远程调度（2–3 日，外部依赖）

- 注册/更新/删除设备 token，区分 development/production；
- 服务端调度与本地兜底共享 `notification_id` 去重；
- 连续 3 次未响应提高 `snooze_level`，响应后逐步恢复；
- Personal Team 不具备 Push capability 时不伪造通过，可先完成 G5A/G5B，本切片等待支持推送的 Team。

#### G5D · 提醒全链路验收（1–2 日）

- 真机矩阵覆盖网络失败、重复推送、时区变化、权限变更、重装与 token 轮换；
- `reminder_sent/click` 只含 09 允许的标量字段，不含正文；
- 形成可关闭远程推送、只保留本地提醒的运行开关与回滚步骤。

### 11.5 G6 · 稳定性、TestFlight 与内测

#### G6A · 自动化与性能门禁（2–3 日）

- CI 固定 lint/typecheck/core/tokens/api tests、PostgreSQL 集成测试、Web E2E、iOS 构建和移动端关键流；
- 测冷启动、快速滴答 p50/p95、8/50 颗时间轴 FPS、SQLite 慢查询、内存与崩溃；
- migration、匿名转登录、离线 20 颗、双设备冲突成为发布前固定回归集。

#### G6B · iPhone 14 / iOS 18.7.1 真机矩阵（2–3 日）

- 主链路连续 3 轮：安装/升级 → 匿名记录 → 登录合并 → 离线同步 → 封存/AI 降级 → 通知 action；
- 四主题组合、Dynamic Type、VoiceOver、Reduce Motion/Transparency、深浅色和键盘逐项验收；
- Personal Team 先完成普通真机构建；远程推送和 TestFlight 以正式 Team 为最终证据。

#### G6C · 合规与 TestFlight 候选包（2 日）

- 锁定 bundle identifier、版本/构建号、签名、隐私清单、权限文案、AI 标识、注销、导出与支持入口；
- 准备隐私政策、用户协议、支持邮箱、App Store Connect 记录和内测说明；
- 保存上一可用构建、migration 兼容说明和服务端 feature rollback，不做数据库降级回滚。

#### G6D · 分批内测（1–2 日发布准备，观察期另计）

- 先 5–10 人封闭组，稳定后扩大到 20–50 人；
- P0 立即停发，P1 修复后重发，P2 进入清单；
- 每周观察次周留存、日均胶囊、封存率、3 秒达成率、同步失败率、提醒响应率和 AI 降级率；
- 达到“无 P0/P1、迁移可升级、服务端可回滚、核心指标可查询”后才结束 iOS v1 内测里程碑。

### 11.6 阶段门禁与用户依赖

| 门禁 | 进入条件 | 需要用户提供/确认 | 未满足时的处理 |
|------|----------|------------------|----------------|
| 开始 G4A | 本计划审核通过 | 本地 PostgreSQL 选择：Homebrew（推荐）或 Docker Desktop | 停在方案阶段，不安装依赖 |
| G4 staging | G4A–E 本地测试通过 | 云数据库/服务器、HTTPS 域名、真实邮箱 provider、AI key | 保持本地工程通过，不虚报 G4 完成 |
| 开始 G5C | G5A/B 通过 | 支持 Push Notifications 的 Apple Developer Team、APNs/EAS 凭据 | 仅交付本地提醒与可降级 action |
| 开始 G6C | G4/G5 全门禁关闭 | bundle id、App Store Connect、隐私政策/协议、支持邮箱、上架主体 | 不上传 TestFlight |
| 扩大到 20–50 人 | 5–10 人组无 P0/P1 | 内测名单与反馈渠道 | 延长小组观察，不带病扩量 |

### 11.7 每个切片的交付证据

每个 G4–G6 切片结束必须同时交付：变更范围、契约/迁移清单、自动化测试结果、真实运行证据、数据与隐私核验、已知限制、回滚路径、`WORK.md` 更新。只有 mock 的项目明确标记 mock；只有 Simulator 的项目明确标记 Simulator；未经用户明确要求不 commit、不 push。

### 11.8 本轮明确不做

- G4 不加入微信/手机号登录、付费订阅、团队空间、管理后台或实时协作；只完成邮箱轻账号和个人多设备同步；
- G5 不做 Widget、Live Activity、灵动岛常驻、地理围栏或后台持续定位；文本回复 action 不稳定时直接降级，不扩大原生扩展范围；
- G6 目标是 TestFlight 可控内测，不等同于 App Store 正式公开发布；公开发布需根据内测数据另做 go/no-go；
- 本轮不启动小程序、Android 或 Web Push 新开发；共享契约保持可复用，但不预埋无验收入口的半成品；
- 不为赶进度降低隐私过滤、离线可用、数据可导出、注销可撤回和 `edited_md` 不覆盖等产品红线。

## 12. 个人本地版执行计划（2026-08-10，当前有效）

> 用户已确认先作为个人 App 使用。本节取代 §11 的云端执行顺序；G4A–F、G5C 和多人 TestFlight 保留为 v1.1 候选，不在当前版本安装 PostgreSQL 或建设半成品云入口。

### 12.1 G4-L · 数据安全闭环

#### G4-L1 · 完整备份（当前）

> 2026-08-10 已完成并通过 Simulator 实测；下一切片为 G4-L2 导入恢复。

- 冻结 `tickcap-local-backup` v1 契约，携带 App/SQLite schema 版本和 canonical payload SHA-256；
- 包含 time/onboarding/appearance 偏好以及 tags/capsules/day_seals/ai_reports 的 active + soft-deleted 行；
- 排除 device/sync cursor/outbox/conflicts/event outbox；
- 设置页将 Markdown/JSON 阅读导出与“完整备份”分开，继续使用系统分享保存到可信位置；
- 出口：API/core 测试、移动端 typecheck 全绿，备份文件通过 schema 与哈希复算。

#### G4-L2 · 导入恢复

> 2026-08-10 已完成并通过 Simulator 实库验收；下一切片为 G4-L3 备份可见性。

- 选择文件后先做格式、版本、schema 与 SHA-256 校验，再展示实体数量和时间范围预览；
- 导入前自动创建当前状态完整备份；默认按稳定 UUID 幂等合并，包含 tombstone，不静默覆盖较新本地行；
- 偏好变更在预览中单列；整个写入使用 SQLite 独占事务，任一失败全部回滚；
- 出口：同一备份重复导入两次不增行，损坏/未来版本文件零写入，失败后原库与自动备份一致。

#### G4-L3 · 备份可见性

> 2026-08-10 已完成并通过 Simulator 实库与系统分享验收；G4-L 个人数据安全闭环整体完成，下一阶段为 G5-L 本地提醒。

- 设置页显示最近成功备份时间与内容计数；提供中性的周期备份提醒；
- 首版仍由用户通过系统“文件”选择本机或 iCloud Drive，不把 App 沙盒快照当唯一保障；
- 不实现后台静默上传，不读取用户 iCloud 目录，不引入云账号。
- 实际出口：只记录“最近生成”而不误称已保存到 iCloud；7/14/30 天或关闭的 App 内提醒可持久化；导入前恢复点显示数量并可分享最近一份；界面明确卸载 App 的沙盒丢失风险与长期另存路径。

### 12.2 G5-L · 本地提醒与通知快捷记录

> 2026-08-10 已完成并通过 Simulator 工程出口；真实通知 action 按钮在后台/杀进程状态下的 iPhone 14 行为仍由 G6-P 关闭。

- 只接本地通知：首次封存后或用户主动开启时申请权限；支持 30/60/120 分钟与晚间封存提醒；
- 刚记录/刚打开跳过，权限拒绝后不反复申请；时区、日界和提醒偏好变化时重建计划；
- 高频标签 action 使用确定性 operation key 幂等写 SQLite；不依赖网络，失败降级为打开 App 聚焦滴答栏；
- APNs、远程调度与服务端降频移至 v1.1。
- 实际出口：只取消 TickCap 自己保存的通知 ID；启动/回前台/记录/封存/设置变更按数据库实例串行重建，避免并发重复调度；连续三次错过后降为 2×，再次连续三次升为 4×，完成记录、点击通知或修改偏好后恢复；action 的 operation key、胶囊、outbox 和事件在同一事务内幂等写入。
- Simulator 已验证三秒通知进入系统通知 UI、30/60/120 偏好和开关持久化、同一 action 执行两次仅产生 1 胶囊与 1 outbox、第三次错过后显示 2× 降频且改偏好恢复；测试数据已清理，最终状态为本地提醒开启、30 分钟、降频等级 0。

### 12.3 G6-P · 个人真机使用门禁

> 2026-08-12 Simulator 总回归已通过；`xiaoge`（iPhone 14 / iOS 18.7.1）Development Build 和独立 Release 均完成 Personal Team 构建、签名与安装。Release 内置 JS/资源并在 Metro 未运行时由系统成功启动；用户已完成手动验收并确认最小 MVP 功能可用，G6-P 剩余门禁为 14 天稳定性观察、备份恢复演练与 P0/P1 清零。

- 先在 Simulator 完成恢复、提醒和生命周期回归，再用个人签名安装到 iPhone 14 / iOS 18.7.1；
- 连续三轮验证安装/升级、记录/编辑/删除、封存/复盘、备份/恢复、通知 action 与杀进程持久化；
- 开始不少于 14 天个人使用观察，记录 P0/P1、备份频率、恢复演练和 3 秒达成率；
- 当前完成定义是“个人数据可安全长期使用”，不是多人 TestFlight 或 App Store 发布。
- Personal Team 构建不携带 `aps-environment`：`with-local-notifications-only` config plugin 在 Expo Notifications 生成 entitlement 后移除 APNs 能力，保留本地通知、category 和 action；远程推送仍在 v1.1。
- 真机 Development Build 的 Metro 服务显式绑定 Mac 局域网地址；本轮自动路由得到的 `198.18.0.1` 会被 ATS 拒绝，`127.0.0.1` 冷启动也不可达，绑定 `192.168.0.110` 后 Simulator 可稳定发现服务。IP 变化时重新读取当前 `en0` 地址，不把该地址写入 App 配置。
- 个人 Release 显示名为 `TickCap`，Hermes JS bundle 和资源随 App 内置，不使用 Metro。免费 profile 已占满三个 App 名额，因此沿用开发包标识 `com.tickcap.mobile.dev` 做覆盖升级，避免删除其他个人签名应用并保留 TickCap 本机 SQLite 数据；未来切换正式付费 Team/分发渠道时再迁移生产 bundle id。

### 12.4 当前顺序

1. G4-L1 完整备份；
2. G4-L2 可验证、可回滚恢复；
3. G4-L3 备份可见性；
4. G5-L 本地提醒/action；
5. G6-P 模拟器复验、个人签名真机安装与 14 天自用。
