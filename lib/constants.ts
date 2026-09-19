export const NAV_ITEMS = [
    { href: '/', label: 'Dashboard' },
    { href: '/quant', label: '量化' },
    { href: '/analysis', label: '分析' },
    { href: '/decisions', label: '决策融合' },
    { href: '/search', label: 'Search' },
    { href: '/watchlist', label: 'Watchlist' },
    { href: '/api-docs', label: 'API Docs' },
];

// Sign-up form select options
export const INVESTMENT_GOALS = [
    { value: 'Growth', label: 'Growth' },
    { value: 'Income', label: 'Income' },
    { value: 'Balanced', label: 'Balanced' },
    { value: 'Conservative', label: 'Conservative' },
];

export const RISK_TOLERANCE_OPTIONS = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
];

export const PREFERRED_INDUSTRIES = [
    { value: 'Technology', label: 'Technology' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Energy', label: 'Energy' },
    { value: 'Consumer Goods', label: 'Consumer Goods' },
];

export const ALERT_TYPE_OPTIONS = [
    { value: 'upper', label: 'Upper' },
    { value: 'lower', label: 'Lower' },
];

export const CONDITION_OPTIONS = [
    { value: 'greater', label: 'Greater than (>)' },
    { value: 'less', label: 'Less than (<)' },
];

// TradingView Charts
export const MARKET_OVERVIEW_WIDGET_CONFIG = {
    colorTheme: 'dark', // dark mode
    dateRange: '12M', // last 12 months
    locale: 'zh_CN', // language
    largeChartUrl: '', // link to a large chart if needed
    isTransparent: true, // makes background transparent
    showFloatingTooltip: true, // show tooltip on hover
    plotLineColorGrowing: '#0FEDBE', // line color when price goes up
    plotLineColorFalling: '#0FEDBE', // line color when price falls
    gridLineColor: 'rgba(240, 243, 250, 0)', // grid line color
    scaleFontColor: '#DBDBDB', // font color for scale
    belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)', // fill under line when growing
    belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)', // fill under line when falling
    belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)',
    belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
    symbolActiveColor: 'rgba(15, 237, 190, 0.05)', // highlight color for active symbol
    tabs: [
        {
            title: '美国',
            symbols: [
                { s: 'SP:SPX', d: '标普500' },
                { s: 'NASDAQ:NDX', d: '纳斯达克100' },
                { s: 'DJ:DJI', d: '道琼斯工业指数' },
            ],
        },
        {
            title: '中国',
            symbols: [
                { s: 'SSE:000001', d: '上证指数' },
            ],
        },
        {
            title: '香港',
            symbols: [
                { s: 'HKEX:HSI', d: '恒生指数' },
            ],
        },
        {
            title: '日韩',
            symbols: [
                { s: 'DJ:N225', d: '日经225' },
                { s: 'KRX:KOSPI', d: '韩国KOSPI' },
            ],
        },
    ],
    support_host: 'https://www.tradingview.com', // TradingView host
    backgroundColor: '#0e0e11', // background color
    width: '100%', // full width
    height: 600, // height in px
    showSymbolLogo: true, // show logo next to symbols
    showChart: true, // display mini chart
};

export const HEATMAP_WIDGET_CONFIG = {
    dataSource: 'SPX500',
    blockSize: 'market_cap_basic',
    blockColor: 'change',
    grouping: 'sector',
    isTransparent: true,
    locale: 'zh_CN',
    symbolUrl: '',
    colorTheme: 'dark',
    exchanges: [],
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: '100%',
    height: '600',
};

export const TOP_STORIES_WIDGET_CONFIG = {
    displayMode: 'regular',
    feedMode: 'market',
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'zh_CN',
    market: 'stock',
    width: '100%',
    height: '600',
};

export const MARKET_DATA_WIDGET_CONFIG = {
    title: '全球市场概览',
    width: '100%',
    height: 600,
    locale: 'zh_CN',
    showSymbolLogo: true,
    colorTheme: 'dark',
    isTransparent: false,
    backgroundColor: '#0e0e11',
    symbolsGroups: [
        {
            name: '美国 ETF',
            symbols: [
                { name: 'AMEX:VOO', displayName: 'Vanguard 标普500 ETF' },
                { name: 'NASDAQ:QQQ', displayName: 'Invesco 纳指100 ETF' },
                { name: 'NASDAQ:SOXX', displayName: 'iShares 半导体 ETF' },
            ],
        },
        {
            name: '加密货币',
            symbols: [
                { name: 'BITSTAMP:BTCUSD', displayName: '比特币 BTC' },
            ],
        },
        {
            name: '贵金属',
            symbols: [
                { name: 'OANDA:XAUUSD', displayName: '黄金 XAUUSD' },
                { name: 'OANDA:XAGUSD', displayName: '白银 XAGUSD' },
            ],
        },
        {
            name: '能源',
            symbols: [
                { name: 'TVC:USOIL', displayName: 'WTI 原油主连' },
            ],
        },
        {
            name: '外汇',
            symbols: [
                { name: 'FX_IDC:USDCNY', displayName: '美元/人民币' },
                { name: 'FX_IDC:CNYHKD', displayName: '人民币/港币' },
            ],
        },
        {
            name: '中国 A 股',
            symbols: [
                { name: 'SSE:000001', displayName: '上证指数' },
            ],
        },
    ],
}

export const SYMBOL_INFO_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'zh_CN',
    width: '100%',
    height: 170,
});

export const CANDLE_CHART_WIDGET_CONFIG = (symbol: string) => ({
    allow_symbol_change: false,
    calendar: false,
    details: true,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale: 'zh_CN',
    save_image: false,
    style: 1,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'exchange',
    backgroundColor: '#0e0e11',
    gridColor: '#0e0e11',
    watchlist: [],
    withdateranges: false,
    compareSymbols: [],
    studies: [],
    width: '100%',
    height: 600,
});

export const BASELINE_WIDGET_CONFIG = (symbol: string) => ({
    allow_symbol_change: false,
    calendar: false,
    details: false,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale: 'zh_CN',
    save_image: false,
    style: 10,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'exchange',
    backgroundColor: '#0e0e11',
    gridColor: '#0e0e11',
    watchlist: [],
    withdateranges: false,
    compareSymbols: [],
    studies: [],
    width: '100%',
    height: 600,
});

export const TECHNICAL_ANALYSIS_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'zh_CN',
    width: '100%',
    height: 400,
    interval: '1h',
    largeChartUrl: '',
});

export const COMPANY_PROFILE_WIDGET_CONFIG = (symbol: string) => ({
    // 注意：正确的 TV 组件脚本是 embed-widget-symbol-profile.js（company-profile.js 已 403）
    symbol: symbol.toUpperCase(),
    logo: true,
    type: 'summary',
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'zh_CN',
    width: '100%',
    height: 440,
});

export const COMPANY_FINANCIALS_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'zh_CN',
    width: '100%',
    height: 464,
    displayMode: 'regular',
    largeChartUrl: '',
});

export const NO_MARKET_NEWS =
    '<p class="mobile-text" style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#4b5563;">No market news available today. Please check back tomorrow.</p>';

export const WATCHLIST_TABLE_HEADER = [
    'Company',
    'Symbol',
    'Price',
    'Change',
    'Market Cap',
    'P/E Ratio',
    'Alert',
    'Action',
];

export const PASSWORD_RULES = [
    { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
    { label: 'At least 1 uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: 'At least 1 lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
    { label: 'At least 1 number', test: (pw: string) => /[0-9]/.test(pw) },
] as const;

export const PASSWORD_VALIDATION = {
    required: 'Password is required',
    minLength: { value: 8, message: 'Password must be at least 8 characters' },
    pattern: {
        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        message: 'Password must include uppercase, lowercase, and a number',
    },
};
