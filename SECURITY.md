# Security Policy

## 设计定位：本地单用户工具

本项目**只为单机本地使用设计**，默认且推荐的运行方式是 `next start -H 127.0.0.1`
（`npm start` 已内置该参数）。请**不要**把本应用直接暴露到公网或不受信任的局域网。

## 无鉴权端点（有意为之，仅限本机）

| 端点 | 说明 |
|---|---|
| `127.0.0.1:6901`（外部 Python 控制台） | 零鉴权，只应绑定回环地址 |
| `/api/report/{name}` | 读取本地报告 PDF；已做目录穿越防护（白名单字符集 + 根目录校验） |
| `/api/logo/{symbol}` | 代理 Finnhub logo，内存缓存 |
| Server Actions（自选股/预警/分析启停/qlib 任务） | 可触发本地计算任务 |

若你修改部署方式使其可被网络访问，**必须自行在前层加鉴权**（反向代理 basic auth 等），
否则等同于把上述能力开放给任意访问者。

## 密钥管理

- 所有第三方 API key 只放在 `.env.local`（已 gitignore），仓库内不含任何密钥。
- `.env.example` 列出了全部变量与免费申请入口。
- 浏览器端只使用 `NEXT_PUBLIC_*` 前缀的 key（Finnhub 免费档本身允许前端直调）。

## 报告漏洞

请通过 GitHub Issues / Security Advisories 私信维护者，勿在公开 issue 中附漏洞细节。
