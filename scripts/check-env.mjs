#!/usr/bin/env node
/**
 * 本地量化看板自检 —— 环境变量 + 后端连通性
 *
 *   node scripts/check-env.mjs
 *
 * 登录与邮件功能已移除，因此不再需要 MONGODB_URI / BETTER_AUTH_* / INNGEST_* / NODEMAILER_*。
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const envPath = path.join(root, '.env.local');

function readEnv(file) {
    const out = {};
    if (!fs.existsSync(file)) return out;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
    return out;
}

const env = { ...readEnv(envPath), ...process.env };
const mask = (v) => (!v ? '' : v.length <= 8 ? '****' : `${v.slice(0, 4)}****${v.slice(-2)}`);

console.log('=== 量化看板自检 ===\n');

const required = [
    ['NEXT_PUBLIC_FINNHUB_API_KEY', 'Finnhub API key（搜索 / 报价 / 公司新闻）'],
];
const optional = [
    ['QUANT_API_BASE', '本地 Python 控制台地址', 'http://127.0.0.1:6901'],
    ['APP_STATE_PATH', '自选股 / 预警状态文件', './data/app_state.json'],
    ['TA_REPORTS_DIR', 'TradingAgents 报告目录', './data/reports'],
    ['QLIB_UNIVERSE_PATH', 'qlib 股票池 universe.txt', './data/universe.txt'],
    ['DASH_PROXY', '浏览器代理（TradingView 直连不通时才需要）', '（不设置）'],
];

let bad = 0;
console.log('[配置项]');
for (const [k, desc] of required) {
    const v = env[k];
    console.log(`  ${v ? 'OK' : '缺失'}  ${k.padEnd(30)} ${v ? mask(v) : ''}  ${desc}`);
    if (!v) bad++;
}
for (const [k, desc, dflt] of optional) {
    const v = env[k];
    console.log(`  --    ${k.padEnd(30)} ${v || `(默认 ${dflt})`}  ${desc}`);
}
console.log(`  配置文件：${envPath} ${fs.existsSync(envPath) ? '' : '（不存在）'}`);

const base = (env.QUANT_API_BASE || 'http://127.0.0.1:6901').replace(/\/$/, '');
console.log(`\n[后端连通性] ${base}`);
try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const h = await res.json();
    console.log('  OK  /api/health 正常');
    console.log(`      数据源：${JSON.stringify(h.data_vendors ?? {})}`);
    console.log(`      LLM：${h.llm_provider} / ${h.llm_model}（可达：${h.ollama_reachable}）`);
    console.log(`      报告目录：${h.reports_dir}`);
    if (Array.isArray(h.disabled_sources) && h.disabled_sources.length) {
        console.log(`      已禁用数据源：${h.disabled_sources.join(', ')}`);
    }
} catch (err) {
    console.log(`  失败  连接失败：${err.message}`);
    console.log('      → 先启动本地 Python 控制台（见 README「可选：量化后端」），或运行 .\\scripts\\start_all.ps1');
    bad++;
}

console.log('\n[量化接口]');
for (const p of ['/api/quant/signals', '/api/qlib/universe', '/api/quant/decisions?limit=1']) {
    try {
        const res = await fetch(`${base}${p}`, { signal: AbortSignal.timeout(8000) });
        console.log(`  ${res.ok ? 'OK  ' : '失败'} ${p} → ${res.status}`);
        if (!res.ok) bad++;
    } catch (err) {
        console.log(`  失败 ${p} → ${err.message}`);
        bad++;
    }
}

console.log(`\n${bad === 0 ? '全部通过。' : `有 ${bad} 项需要处理。`}`);
process.exit(bad === 0 ? 0 : 1);
