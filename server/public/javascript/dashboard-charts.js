(function () {
    const CATEGORY_COLORS = ['#F97316', '#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6', '#22C55E', '#EF4444', '#14B8A6'];

    function getAnalytics() {
        return window.__DASHBOARD_ANALYTICS__ || {
            revenueToday: 0,
            ordersToday: 0,
            revenueTrend: { direction: 'flat', pct: 0 },
            ordersTrend: { direction: 'flat', pct: 0 },
            revenueByDay: [],
            ordersByDay: [],
            revenueWeekTotal: 0,
            ordersWeekTotal: 0,
            topItems: [],
            categoryDistribution: [],
        };
    }

    function trendIcon(direction) {
        if (direction === 'up') return 'fa-arrow-up';
        if (direction === 'down') return 'fa-arrow-down';
        return 'fa-minus';
    }

    function applyTrend(el, trend) {
        if (!el || !trend) return;
        el.classList.remove('is-up', 'is-down', 'is-flat');
        el.classList.add(`is-${trend.direction}`);
        el.innerHTML = `<i class="fa-solid ${trendIcon(trend.direction)}"></i><span>${trend.direction === 'down' ? '-' : '+'}${trend.pct}%</span>`;
    }

    function renderMetric(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    function renderRevenueChart(analytics) {
        const canvas = document.getElementById('revenueChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 180);
        gradient.addColorStop(0, 'rgba(249, 115, 22, 0.25)');
        gradient.addColorStop(1, 'rgba(249, 115, 22, 0.0)');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: analytics.revenueByDay.map((entry) => entry.day),
                datasets: [{
                    data: analytics.revenueByDay.map((entry) => entry.total),
                    borderColor: '#F97316',
                    borderWidth: 2.5,
                    fill: true,
                    backgroundColor: gradient,
                    tension: 0.4,
                    pointBackgroundColor: '#F97316',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 10 } } },
                    y: {
                        grid: { color: '#F1F5F9' },
                        ticks: { color: '#94A3B8', font: { size: 10 }, callback: (v) => (v >= 1000 ? `${v / 1000}k` : v) },
                    },
                },
            },
        });
    }

    function renderOrdersChart(analytics) {
        const canvas = document.getElementById('ordersChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: analytics.ordersByDay.map((entry) => entry.day),
                datasets: [{
                    data: analytics.ordersByDay.map((entry) => entry.count),
                    backgroundColor: '#C084FC',
                    borderRadius: 4,
                    barThickness: 8,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 10 } } },
                    y: { grid: { color: '#F1F5F9' }, ticks: { color: '#94A3B8', font: { size: 10 }, precision: 0 } },
                },
            },
        });
    }

    function renderCategoryChart(analytics) {
        const canvas = document.getElementById('categoryChart');
        const legend = document.getElementById('categoryLegend');
        const distribution = analytics.categoryDistribution || [];

        if (canvas && typeof Chart !== 'undefined' && distribution.length > 0) {
            const ctx = canvas.getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: distribution.map((entry) => entry.category),
                    datasets: [{
                        data: distribution.map((entry) => entry.count),
                        backgroundColor: distribution.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
                        borderWidth: 0,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '72%',
                    plugins: { legend: { display: false } },
                },
            });
        }

        if (legend) {
            legend.innerHTML = distribution.length === 0
                ? '<p class="admin-subtitle" style="font-size:12px;">Aucune categorie pour le moment.</p>'
                : distribution.map((entry, i) => `
                    <div class="legend-item">
                        <div><span class="legend-dot" style="background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]};"></span><span class="legend-label">${entry.category}</span></div>
                        <span class="legend-value">${entry.pct}%</span>
                    </div>
                `).join('');
        }
    }

    function renderTopItems(analytics) {
        const list = document.getElementById('topItemsList');
        if (!list) return;

        const items = (analytics.topItems || []).slice(0, 5);
        if (items.length === 0) {
            list.innerHTML = '<p class="admin-subtitle" style="font-size:12px;">Aucune vente pour le moment.</p>';
            return;
        }

        const maxCount = items[0].count || 1;
        list.innerHTML = items.map((item, index) => `
            <div class="top-item-row">
                <div class="top-item-info">
                    <span class="top-item-rank">${index + 1}.</span>
                    <span class="top-item-name">${item.name}</span>
                    <span class="top-item-count">${item.count}</span>
                </div>
                <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${Math.round((item.count / maxCount) * 100)}%;"></div></div>
            </div>
        `).join('');
    }

    function renderHeaderMetrics(analytics) {
        renderMetric('revenueWeekMetric', `${analytics.revenueWeekTotal} DNT`);
        renderMetric('ordersWeekMetric', analytics.ordersWeekTotal);
        applyTrend(document.getElementById('revenueWeekTrend'), analytics.revenueTrend);
        applyTrend(document.getElementById('ordersWeekTrend'), analytics.ordersTrend);
    }

    function renderStatTrends(analytics) {
        applyTrend(document.getElementById('orderStatTrend'), analytics.ordersTrend);
        applyTrend(document.getElementById('revenueStatTrend'), analytics.revenueTrend);
    }

    function initDashboardCharts() {
        const analytics = getAnalytics();
        renderRevenueChart(analytics);
        renderOrdersChart(analytics);
        renderCategoryChart(analytics);
        renderTopItems(analytics);
        renderHeaderMetrics(analytics);
        renderStatTrends(analytics);
    }

    window.initDashboardCharts = initDashboardCharts;
})();
