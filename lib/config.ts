/**
 * 本地数据路径统一出口（开源中性）。
 *
 * 全部可用环境变量覆盖（见 .env.example）；未设置时回退到项目内 ./data 相对目录，
 * 保证任何人 clone 后零配置可跑。若设置了 APP_STATE_PATH（老部署），
 * 缓存类文件继续落在它的同目录，实现无缝迁移。
 */
import path from 'node:path';

const statePath = process.env.APP_STATE_PATH || '';

/** 本地数据根目录：缓存、名称表、默认状态文件都放这里 */
export const DATA_DIR =
    process.env.APP_DATA_DIR ||
    (statePath ? path.dirname(statePath) : path.join(process.cwd(), 'data'));

/** 自选股 / 预警状态文件 */
export const STATE_PATH = statePath || path.join(DATA_DIR, 'app_state.json');

/** TradingAgents 报告目录（complete_report.pdf 所在父目录） */
export const REPORTS_DIR =
    process.env.TA_REPORTS_DIR || path.join(DATA_DIR, 'reports');

/** qlib 股票池 universe.txt */
export const UNIVERSE_PATH =
    process.env.QLIB_UNIVERSE_PATH || path.join(DATA_DIR, 'universe.txt');
