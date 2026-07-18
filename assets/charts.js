// 申万行业产业链知识图谱 - ECharts 交互逻辑
(function() {
    var style = getComputedStyle(document.documentElement);
    var accent = style.getPropertyValue('--accent').trim();
    var accent2 = style.getPropertyValue('--accent2').trim();
    var ink = style.getPropertyValue('--ink').trim();
    var muted = style.getPropertyValue('--muted').trim();
    var rule = style.getPropertyValue('--rule').trim();
    var bg2 = style.getPropertyValue('--bg2').trim();

    // 从内嵌JSON加载数据
    var rawJson = document.getElementById('graph-data').textContent;
    var DATA = JSON.parse(rawJson);

    // ============ 图1: 行业分类力导向图 ============
    var chartGraph = echarts.init(document.getElementById('chart-graph'), null, { renderer: 'svg' });

    var categories = [
        { name: '一级行业', itemStyle: { color: accent } },
        { name: '二级行业', itemStyle: { color: '#5dade2' } },
    ];

    chartGraph.setOption({
        title: { text: '申万行业(2021) 产业链关系图谱', left: 'center', top: 10, textStyle: { fontSize: 16, color: ink, fontWeight: 700 } },
        tooltip: {
            trigger: 'item', appendToBody: true,
            formatter: function(p) {
                if (p.dataType === 'edge') {
                    return '<b>' + p.data.source + '</b> → <b>' + p.data.target + '</b><br/>' + (p.data.value || '');
                }
                var val = p.data.value || '';
                return '<b>' + p.data.name + '</b><br/>' + val;
            }
        },
        legend: {
            data: categories.map(function(c) { return c.name; }),
            bottom: 10, textStyle: { fontSize: 12, color: muted }
        },
        animationDuration: 1500,
        animationEasingUpdate: 'quinticInOut',
        series: [{
            type: 'graph',
            layout: 'force',
            data: DATA.nodes,
            links: DATA.links,
            categories: categories,
            roam: true,
            draggable: true,
            force: {
                repulsion: 400,
                gravity: 0.15,
                edgeLength: [80, 250],
                friction: 0.6
            },
            emphasis: {
                focus: 'adjacency',
                lineStyle: { width: 4 },
                label: { show: true, fontSize: 13 }
            },
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [0, 8],
            lineStyle: {
                curveness: 0.15
            }
        }]
    });

    window.addEventListener('resize', function() { chartGraph.resize(); });

    // ============ 图2: 行业分布统计 ============
    var chartBar = echarts.init(document.getElementById('chart-bar'), null, { renderer: 'svg' });

    var l1Names = Object.keys(DATA.industries);
    var l2Counts = l1Names.map(function(n) { return Object.keys(DATA.industries[n]).length; });
    var l3Counts = l1Names.map(function(n) {
        var total = 0;
        for (var k in DATA.industries[n]) { total += DATA.industries[n][k].length; }
        return total;
    });

    // 按三级行业数量排序
    var sorted = l1Names.map(function(n, i) { return { name: n, l2: l2Counts[i], l3: l3Counts[i] }; });
    sorted.sort(function(a, b) { return b.l3 - a.l3; });

    chartBar.setOption({
        title: { text: '各一级行业下属细分数量', left: 'center', top: 5, textStyle: { fontSize: 14, color: ink } },
        tooltip: { trigger: 'axis', appendToBody: true, axisPointer: { type: 'shadow' } },
        legend: { data: ['二级行业', '三级行业'], bottom: 0, textStyle: { fontSize: 11, color: muted } },
        grid: { left: 80, right: 20, top: 45, bottom: 40 },
        xAxis: { type: 'value', axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted } },
        yAxis: { type: 'category', data: sorted.map(function(d) { return d.name; }),
                 axisLine: { lineStyle: { color: rule } }, axisLabel: { color: ink, fontSize: 11 } },
        animation: false,
        series: [
            {
                name: '二级行业', type: 'bar', stack: 'total',
                data: sorted.map(function(d) { return d.l2; }),
                itemStyle: { color: accent },
                label: { show: true, position: 'inside', fontSize: 10, color: '#fff' }
            },
            {
                name: '三级行业', type: 'bar', stack: 'total',
                data: sorted.map(function(d) { return d.l3 - d.l2; }),
                itemStyle: { color: accent2 },
                label: { show: true, position: 'inside', fontSize: 10, color: '#fff' }
            }
        ]
    });
    window.addEventListener('resize', function() { chartBar.resize(); });

    // ============ 图3: 产业链桑基图 ============
    var chartSankey = echarts.init(document.getElementById('chart-sankey'), null, { renderer: 'svg' });

    // 构建桑基图数据：以一级行业为主要节点，产业链为关联
    var sankeyNodes = [];
    var sankeyLinks = [];
    var seenNodes = {};

    function ensureNode(name) {
        if (!seenNodes[name]) {
            seenNodes[name] = sankeyNodes.length;
            sankeyNodes.push({ name: name });
        }
        return seenNodes[name];
    }

    // 添加一级行业为桑基节点
    l1Names.forEach(function(n) { ensureNode(n); });

    // 添加产业链连接
    DATA.chain_links.forEach(function(link) {
        var src = link[0], tgt = link[1], desc = link[2];
        if (seenNodes[src] !== undefined && seenNodes[tgt] !== undefined) {
            sankeyLinks.push({ source: src, target: tgt, value: 1, realValue: desc });
        }
    });

    chartSankey.setOption({
        title: { text: '产业链上下游关系图', left: 'center', top: 5, textStyle: { fontSize: 14, color: ink } },
        tooltip: {
            trigger: 'item', appendToBody: true,
            formatter: function(p) {
                if (p.dataType === 'edge') {
                    return '<b>' + p.data.source + '</b> → <b>' + p.data.target + '</b><br/>' + (p.data.realValue || '');
                }
                return '<b>' + p.data.name + '</b>';
            }
        },
        series: [{
            type: 'sankey',
            data: sankeyNodes,
            links: sankeyLinks,
            left: 20, right: 20, top: 45, bottom: 20,
            nodeWidth: 18,
            nodeGap: 10,
            layoutIterations: 64,
            lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.6 },
            itemStyle: { borderWidth: 1, borderColor: '#fff' },
            label: { fontSize: 10, color: ink },
            emphasis: { focus: 'adjacency' },
            animation: false,
        }]
    });
    window.addEventListener('resize', function() { chartSankey.resize(); });

    // ============ 图4: 产业链关系表格 ============
    var tableBody = document.getElementById('chain-table-body');
    if (tableBody) {
        var html = '';
        DATA.chain_links.forEach(function(link, idx) {
            var cls = idx % 2 === 0 ? 'even' : 'odd';
            html += '<tr class="' + cls + '"><td>' + (idx + 1) + '</td><td>' + link[0] + '</td><td class="arrow">→</td><td>' + link[1] + '</td><td class="desc">' + link[2] + '</td></tr>';
        });
        tableBody.innerHTML = html;
    }

    // ============ 搜索功能 ============
    var searchInput = document.getElementById('search-input');
    var searchBtn = document.getElementById('search-btn');
    var searchResult = document.getElementById('search-result');

    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', doSearch);
        searchInput.addEventListener('keyup', function(e) { if (e.key === 'Enter') doSearch(); });
    }

    function doSearch() {
        var query = searchInput.value.trim();
        if (!query) { searchResult.innerHTML = '<p class="hint">请输入行业名称搜索</p>'; return; }
        var results = [];
        l1Names.forEach(function(l1) {
            if (l1.indexOf(query) !== -1) {
                results.push({ type: '一级行业', name: l1, l2Count: Object.keys(DATA.industries[l1]).length });
            }
            for (var l2 in DATA.industries[l1]) {
                if (l2.indexOf(query) !== -1) {
                    results.push({ type: '二级行业', name: l2, parent: l1 });
                }
                DATA.industries[l1][l2].forEach(function(item) {
                    if (item.name.indexOf(query) !== -1) {
                        results.push({ type: '三级行业', name: item.name, code: item.code, parent1: l1, parent2: l2 });
                    }
                });
            }
        });
        // 产业链搜索
        DATA.chain_links.forEach(function(link) {
            if (link[2].indexOf(query) !== -1) {
                results.push({ type: '产业链', name: link[0] + ' → ' + link[1], desc: link[2] });
            }
        });
        if (results.length === 0) {
            searchResult.innerHTML = '<p class="hint">未找到匹配的行业</p>';
        } else {
            var h = '<div class="result-count">找到 ' + results.length + ' 个匹配项</div>';
            results.forEach(function(r) {
                h += '<div class="result-item">';
                h += '<span class="result-type">' + r.type + '</span>';
                h += '<span class="result-name">' + r.name + '</span>';
                if (r.parent) h += '<span class="result-parent">← ' + r.parent + '</span>';
                if (r.parent1) h += '<span class="result-parent">← ' + r.parent1 + ' > ' + r.parent2 + '</span>';
                if (r.code) h += '<span class="result-code">代码: ' + r.code + '</span>';
                if (r.desc) h += '<span class="result-desc">' + r.desc + '</span>';
                h += '</div>';
            });
            searchResult.innerHTML = h;
        }
    }

    // ============ 行业树目录 ============
    var treeContainer = document.getElementById('industry-tree');
    if (treeContainer) {
        var html = '';
        l1Names.forEach(function(l1, idx) {
            var l2s = Object.keys(DATA.industries[l1]);
            var l3Total = 0;
            l2s.forEach(function(l2) { l3Total += DATA.industries[l1][l2].length; });
            html += '<div class="tree-l1" data-idx="' + idx + '">';
            html += '<div class="tree-l1-header" onclick="toggleL1(this)">';
            html += '<span class="tree-toggle">▶</span>';
            html += '<span class="tree-l1-name">' + l1 + '</span>';
            html += '<span class="tree-badge">' + l2s.length + ' / ' + l3Total + '</span>';
            html += '</div>';
            html += '<div class="tree-l2-list">';
            l2s.forEach(function(l2) {
                html += '<div class="tree-l2">';
                html += '<div class="tree-l2-header" onclick="toggleL2(this)">';
                html += '<span class="tree-toggle">▶</span>';
                html += '<span class="tree-l2-name">' + l2 + '</span>';
                html += '<span class="tree-badge-sm">' + DATA.industries[l1][l2].length + '</span>';
                html += '</div>';
                html += '<div class="tree-l3-list">';
                DATA.industries[l1][l2].forEach(function(item) {
                    html += '<div class="tree-l3"><span class="tree-l3-name">' + item.name + '</span><span class="tree-code">' + item.code + '</span></div>';
                });
                html += '</div></div>';
            });
            html += '</div></div>';
        });
        treeContainer.innerHTML = html;
    }

    // 全局展开/折叠
    window.toggleL1 = function(el) {
        var list = el.nextElementSibling;
        var icon = el.querySelector('.tree-toggle');
        if (list.style.display === 'none') { list.style.display = ''; icon.textContent = '▼'; }
        else { list.style.display = 'none'; icon.textContent = '▶'; }
    };
    window.toggleL2 = function(el) {
        var list = el.nextElementSibling;
        var icon = el.querySelector('.tree-toggle');
        if (list.style.display === 'none') { list.style.display = ''; icon.textContent = '▼'; }
        else { list.style.display = 'none'; icon.textContent = '▶'; }
    };

    // Tab 切换
    var tabs = document.querySelectorAll('.tab-btn');
    var panels = document.querySelectorAll('.tab-panel');
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var target = this.dataset.tab;
            tabs.forEach(function(t) { t.classList.remove('active'); });
            panels.forEach(function(p) { p.classList.remove('active'); });
            this.classList.add('active');
            document.getElementById('panel-' + target).classList.add('active');
        });
    });
})();
