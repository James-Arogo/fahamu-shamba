// Market Trends JavaScript
const API_BASE = 'http://localhost:5000';

// Market data with historical trends (simulated real-time data)
const marketHistory = {
    beans: generateHistoricalData(85, 90),
    maize: generateHistoricalData(65, 70),
    rice: generateHistoricalData(120, 130),
    sorghum: generateHistoricalData(95, 105),
    millet: generateHistoricalData(110, 115)
};

// Chart instances
let trendChart = null;
let comparisonChart = null;
let marketShareChart = null;
let volatilityChart = null;
let seasonalChart = null;
let marketUpdateInterval = null;
let currentTrendPeriod = '7d';

// Initialize market trends page
function initMarketTrends() {
    loadMarketOverview();
    loadMarketData();
    loadMarketTrends();
    loadMarketComparison();
    loadMarketAnalysis();
    startMarketUpdates();
}

// Generate realistic historical price data
function generateHistoricalData(basePrice, maxPrice) {
    const data = [];
    const today = new Date();
    
    for (let i = 90; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        
        // Simulate price fluctuations with seasonal patterns
        const seasonal = Math.sin(i / 30 * Math.PI) * 8; // Seasonal pattern
        const fluctuation = (Math.random() - 0.5) * 6; // Random fluctuation
        const trend = (i / 90) * (maxPrice - basePrice); // Long-term trend
        
        const price = Math.max(basePrice - 10, Math.min(maxPrice + 10, basePrice + trend + seasonal + fluctuation));
        
        data.push({
            date: date.toISOString().split('T')[0],
            price: Math.round(price),
            bondo: Math.round(price + (Math.random() - 0.5) * 8),
            ugunja: Math.round(price + (Math.random() - 0.5) * 6),
            yala: Math.round(price + (Math.random() - 0.5) * 10),
            volume: Math.round(1000 + Math.random() * 2000) // Simulated trading volume
        });
    }
    
    return data;
}

// Show different market views
function showMarketView(view) {
    // Hide all views
    document.querySelectorAll('.market-view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.market-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected view and activate tab
    document.getElementById('market' + view.charAt(0).toUpperCase() + view.slice(1) + 'View').style.display = 'block';
    event.target.classList.add('active');
    
    // Update charts for the selected view
    switch(view) {
        case 'trends':
            loadMarketTrends();
            break;
        case 'comparison':
            loadMarketComparison();
            break;
        case 'analysis':
            loadMarketAnalysis();
            break;
    }
}

// Load market overview stats
function loadMarketOverview() {
    const container = document.getElementById('marketOverview');
    const crops = Object.keys(marketHistory);
    
    let html = '';
    crops.forEach(crop => {
        const data = marketHistory[crop];
        const current = data[data.length - 1];
        const yesterday = data[data.length - 2];
        const change = ((current.price - yesterday.price) / yesterday.price * 100).toFixed(1);
        const trendIcon = change >= 0 ? '📈' : '📉';
        const trendClass = change >= 0 ? 'price-up' : 'price-down';
        
        html += `
            <div class="stat-card">
                <div class="stat-number">KES ${current.price}</div>
                <div class="stat-label">${crop.charAt(0).toUpperCase() + crop.slice(1)}</div>
                <div class="${trendClass}" style="font-size: 12px; margin-top: 5px;">
                    ${trendIcon} ${Math.abs(change)}%
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Load market data table
async function loadMarketData() {
    const container = document.getElementById('marketData');
    
    const data = await apiCall('/api/market');
    
    if (data.success) {
        let tableHtml = `
            <table class="price-table">
                <thead>
                    <tr>
                        <th>Crop</th>
                        <th>Bondo Market</th>
                        <th>Ugunja Market</th>
                        <th>Yala Market</th>
                        <th>7-Day Trend</th>
                        <th>30-Day Trend</th>
                        <th>Volume</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.marketData.forEach(item => {
            const cropData = marketHistory[item.crop.toLowerCase()];
            const current = cropData[cropData.length - 1];
            const weekAgo = cropData[cropData.length - 7];
            const monthAgo = cropData[cropData.length - 30];
            
            const weekTrend = ((current.price - weekAgo.price) / weekAgo.price * 100).toFixed(1);
            const monthTrend = ((current.price - monthAgo.price) / monthAgo.price * 100).toFixed(1);
            
            const weekTrendIcon = weekTrend >= 0 ? '📈' : '📉';
            const monthTrendIcon = monthTrend >= 0 ? '📈' : '📉';
            
            const weekTrendClass = weekTrend >= 0 ? 'price-up' : 'price-down';
            const monthTrendClass = monthTrend >= 0 ? 'price-up' : 'price-down';
            
            tableHtml += `
                <tr>
                    <td><strong>${item.crop}</strong></td>
                    <td>KES ${current.bondo}/kg</td>
                    <td>KES ${current.ugunja}/kg</td>
                    <td>KES ${current.yala}/kg</td>
                    <td class="${weekTrendClass}">
                        ${weekTrendIcon} ${Math.abs(weekTrend)}%
                    </td>
                    <td class="${monthTrendClass}">
                        ${monthTrendIcon} ${Math.abs(monthTrend)}%
                    </td>
                    <td>${current.volume.toLocaleString()} kg</td>
                </tr>
            `;
        });
        
        tableHtml += `
                </tbody>
            </table>
            <div class="update-info">
                Real-time data • Prices update every 30 seconds • Last updated: <span id="tableLastUpdated">${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        
        container.innerHTML = tableHtml;
    } else {
        container.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 20px;">Failed to load market data</div>`;
    }
}

// Load market trends chart
function loadMarketTrends() {
    const crop = document.getElementById('trendCropSelect').value;
    const data = marketHistory[crop];
    const periodData = getDataForPeriod(data, currentTrendPeriod);
    
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: periodData.map(d => formatDate(d.date, currentTrendPeriod)),
            datasets: [
                {
                    label: 'Bondo Market',
                    data: periodData.map(d => d.bondo),
                    borderColor: '#2E8B57',
                    backgroundColor: 'rgba(46, 139, 87, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Ugunja Market',
                    data: periodData.map(d => d.ugunja),
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                },
                {
                    label: 'Yala Market',
                    data: periodData.map(d => d.yala),
                    borderColor: '#17a2b8',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Price Trends - ${getPeriodLabel(currentTrendPeriod)}`,
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: KES ${context.parsed.y}/kg`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price (KES/kg)',
                        font: { weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date',
                        font: { weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            }
        }
    });
    
    updateLastUpdated();
}

// Load market comparison charts
function loadMarketComparison() {
    const crop = document.getElementById('compareCropSelect').value;
    const currentData = marketHistory[crop][marketHistory[crop].length - 1];
    const markets = ['bondo', 'ugunja', 'yala'];
    const prices = markets.map(market => currentData[market]);
    const total = prices.reduce((sum, price) => sum + price, 0);
    const percentages = prices.map(price => ((price / total) * 100).toFixed(1));
    
    // Price Comparison Chart (Bar)
    const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    comparisonChart = new Chart(comparisonCtx, {
        type: 'bar',
        data: {
            labels: ['Bondo', 'Ugunja', 'Yala'],
            datasets: [{
                label: 'Current Price (KES/kg)',
                data: prices,
                backgroundColor: ['#2E8B57', '#FFD700', '#17a2b8'],
                borderColor: ['#26734d', '#e6c200', '#148a9c'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Current ${crop.charAt(0).toUpperCase() + crop.slice(1)} Prices by Market`,
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `KES ${context.parsed.y}/kg`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Price (KES/kg)',
                        font: { weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Market Share Chart (Doughnut)
    const shareCtx = document.getElementById('marketShareChart').getContext('2d');
    if (marketShareChart) {
        marketShareChart.destroy();
    }
    
    marketShareChart = new Chart(shareCtx, {
        type: 'doughnut',
        data: {
            labels: ['Bondo', 'Ugunja', 'Yala'],
            datasets: [{
                data: percentages,
                backgroundColor: ['#2E8B57', '#FFD700', '#17a2b8'],
                borderWidth: 2,
                borderColor: 'white'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Market Price Distribution',
                    font: { size: 16, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed}% (KES ${prices[context.dataIndex]}/kg)`;
                        }
                    }
                }
            }
        }
    });
}

// Load market analysis
function loadMarketAnalysis() {
    const crop = document.getElementById('analysisCropSelect').value;
    const data = marketHistory[crop];
    
    // Load volatility chart
    loadVolatilityChart(crop, data);
    
    // Load seasonal trends
    loadSeasonalChart(crop, data);
    
    // Load analysis stats
    loadAnalysisStats(crop, data);
}

// Load volatility chart
function loadVolatilityChart(crop, data) {
    const volatilityData = calculateVolatility(data);
    const ctx = document.getElementById('volatilityChart').getContext('2d');
    
    if (volatilityChart) {
        volatilityChart.destroy();
    }
    
    volatilityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bondo', 'Ugunja', 'Yala'],
            datasets: [{
                label: 'Price Volatility (%)',
                data: [volatilityData.bondo, volatilityData.ugunja, volatilityData.yala],
                backgroundColor: ['#2E8B57', '#FFD700', '#17a2b8'],
                borderColor: ['#26734d', '#e6c200', '#148a9c'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Price Volatility by Market`,
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Volatility (%)',
                        font: { weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Load seasonal chart
function loadSeasonalChart(crop, data) {
    const seasonalData = calculateSeasonalTrends(data);
    const ctx = document.getElementById('seasonalChart').getContext('2d');
    
    if (seasonalChart) {
        seasonalChart.destroy();
    }
    
    seasonalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Average Price (KES/kg)',
                data: seasonalData,
                borderColor: '#2E8B57',
                backgroundColor: 'rgba(46, 139, 87, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Seasonal Price Trends`,
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price (KES/kg)',
                        font: { weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Load analysis statistics
function loadAnalysisStats(crop, data) {
    const stats = calculateMarketStats(data);
    const container = document.getElementById('analysisStats');
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${stats.avgPrice}</div>
            <div class="stat-label">Average Price</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.highestMarket}</div>
            <div class="stat-label">Highest Market</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.lowestMarket}</div>
            <div class="stat-label">Lowest Market</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.volatility}%</div>
            <div class="stat-label">Avg Volatility</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.trend}</div>
            <div class="stat-label">30-Day Trend</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.recommendation}</div>
            <div class="stat-label">Recommendation</div>
        </div>
    `;
}

// Utility functions
function calculateVolatility(data) {
    const markets = ['bondo', 'ugunja', 'yala'];
    const volatility = {};
    
    markets.forEach(market => {
        const prices = data.map(d => d[market]);
        const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
        volatility[market] = (Math.sqrt(variance) / avg * 100).toFixed(1);
    });
    
    return volatility;
}

function calculateSeasonalTrends(data) {
    const monthlyAverages = Array(12).fill(0);
    const monthlyCounts = Array(12).fill(0);
    
    data.forEach(day => {
        const month = new Date(day.date).getMonth();
        monthlyAverages[month] += day.price;
        monthlyCounts[month]++;
    });
    
    return monthlyAverages.map((sum, index) => 
        monthlyCounts[index] > 0 ? Math.round(sum / monthlyCounts[index]) : 0
    );
}

function calculateMarketStats(data) {
    const current = data[data.length - 1];
    const monthAgo = data[data.length - 30];
    const trend = ((current.price - monthAgo.price) / monthAgo.price * 100).toFixed(1);
    
    const markets = ['bondo', 'ugunja', 'yala'];
    const marketPrices = markets.map(market => current[market]);
    const highestMarket = markets[marketPrices.indexOf(Math.max(...marketPrices))];
    const lowestMarket = markets[marketPrices.indexOf(Math.min(...marketPrices))];
    
    const volatility = calculateVolatility(data);
    const avgVolatility = (Object.values(volatility).reduce((a, b) => a + parseFloat(b), 0) / 3).toFixed(1);
    
    let recommendation = 'Hold';
    if (parseFloat(trend) > 5) recommendation = 'Buy';
    if (parseFloat(trend) < -5) recommendation = 'Sell';
    
    return {
        avgPrice: `KES ${Math.round(data.reduce((sum, day) => sum + day.price, 0) / data.length)}`,
        highestMarket: highestMarket.charAt(0).toUpperCase() + highestMarket.slice(1),
        lowestMarket: lowestMarket.charAt(0).toUpperCase() + lowestMarket.slice(1),
        volatility: avgVolatility,
        trend: `${trend}%`,
        recommendation: recommendation
    };
}

function changeTrendPeriod(period) {
    currentTrendPeriod = period;
    
    // Update button states
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Reload trends
    loadMarketTrends();
}

function getDataForPeriod(data, period) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return data.slice(-days);
}

function formatDate(dateString, period) {
    const date = new Date(dateString);
    if (period === '7d') {
        return date.toLocaleDateString('en', { weekday: 'short' });
    } else if (period === '30d') {
        return date.toLocaleDateString('en', { day: 'numeric', month: 'short' });
    } else {
        return date.toLocaleDateString('en', { month: 'short' });
    }
}

function getPeriodLabel(period) {
    return period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'Last 90 Days';
}

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = now.toLocaleTimeString();
}

// Simulate real-time market updates
function startMarketUpdates() {
    marketUpdateInterval = setInterval(() => {
        updateMarketData();
    }, 30000);
}

function updateMarketData() {
    Object.keys(marketHistory).forEach(crop => {
        const lastData = marketHistory[crop][marketHistory[crop].length - 1];
        const newData = {
            date: new Date().toISOString().split('T')[0],
            price: Math.max(50, lastData.price + (Math.random() - 0.5) * 4),
            bondo: Math.max(50, lastData.bondo + (Math.random() - 0.5) * 4),
            ugunja: Math.max(50, lastData.ugunja + (Math.random() - 0.5) * 4),
            yala: Math.max(50, lastData.yala + (Math.random() - 0.5) * 4),
            volume: Math.round(1000 + Math.random() * 2000)
        };
        
        marketHistory[crop].push(newData);
        if (marketHistory[crop].length > 90) {
            marketHistory[crop].shift();
        }
    });
    
    // Update all visible components
    loadMarketOverview();
    if (document.getElementById('marketPricesView').style.display !== 'none') {
        loadMarketData();
    }
    if (document.getElementById('marketTrendsView').style.display !== 'none') {
        loadMarketTrends();
    }
    if (document.getElementById('marketComparisonView').style.display !== 'none') {
        loadMarketComparison();
    }
    if (document.getElementById('marketAnalysisView').style.display !== 'none') {
        loadMarketAnalysis();
    }
    
    updateLastUpdated();
}

// API call function
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(API_BASE + endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        return { success: false, error: 'Connection failed' };
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initMarketTrends();
});

// Clean up when leaving the page
window.addEventListener('beforeunload', () => {
    if (marketUpdateInterval) {
        clearInterval(marketUpdateInterval);
    }
});