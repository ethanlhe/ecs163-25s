(function() {
    const margin = {top: 60, right: 30, bottom: 60, left: 100},
        width = document.getElementById('stackedbar').offsetWidth - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    d3.select('#stackedbar').selectAll('*').remove();

    const svg = d3.select('#stackedbar')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select('#stackedbar')
        .append('div')
        .style('position', 'absolute')
        .style('background', 'rgba(255,255,255,0.95)')
        .style('border', '1px solid #ccc')
        .style('padding', '8px 12px')
        .style('border-radius', '6px')
        .style('pointer-events', 'none')
        .style('font-size', '14px')
        .style('color', '#222')
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.08)')
        .style('display', 'none');

    d3.csv('data/StudentMentalhealth.csv').then(data => {
        const color = d3.scaleOrdinal()
            .domain(["Female", "Male"])
            .range(["#aa0076", "#0e1e7d"]);
        data.forEach(d => {
            d["Choose your gender"] = d["Choose your gender"].trim().toLowerCase();
            if (d["Choose your gender"].startsWith("f")) d["Choose your gender"] = "Female";
            else if (d["Choose your gender"].startsWith("m")) d["Choose your gender"] = "Male";
            else d["Choose your gender"] = "Other";
        });
        const conditions = [
            { key: "Do you have Depression?", label: "Depression" },
            { key: "Do you have Anxiety?", label: "Anxiety" },
            { key: "Do you have Panic attack?", label: "Panic Attack" }
        ];
        const genders = ["Female", "Male"];

        let counts = {};
        let genderTotals = { Female: 0, Male: 0 };
        genders.forEach(gender => {
            counts[gender] = {};
            conditions.forEach(cond => {
                counts[gender][cond.label] = 0;
            });
        });
        data.forEach(d => {
            const gender = genders.includes(d["Choose your gender"]) ? d["Choose your gender"] : null;
            if (!gender) return;
            genderTotals[gender]++;
            conditions.forEach(cond => {
                if (d[cond.key] && d[cond.key].trim().toLowerCase() === "yes") {
                    counts[gender][cond.label]++;
                }
            });
        });
        let chartData = conditions.map(cond => {
            let entry = { condition: cond.label };
            genders.forEach(gender => {
                entry[gender] = (counts[gender][cond.label] / genderTotals[gender]) * 100;
            });
            return entry;
        });

        const x0 = d3.scaleBand()
            .domain(conditions.map(d => d.label))
            .range([0, width])
            .paddingInner(0.25);
        const x1 = d3.scaleBand()
            .domain(genders)
            .range([0, x0.bandwidth()])
            .padding(0.18);
        const y = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => Math.max(d.Female, d.Male)) * 1.15])
            .nice()
            .range([height, 0]);

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x0))
            .selectAll('text')
            .style('font-size', '15px');

        svg.append('g')
            .call(d3.axisLeft(y).ticks(8).tickFormat(d => d + '%'))
            .selectAll('text')
            .style('font-size', '15px');

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('x', width/2)
            .attr('y', height + 55)
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text('Condition Type');

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', `rotate(-90)`)
            .attr('x', -height/2)
            .attr('y', -55)
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text('% of Students');

        svg.append('text')
            .attr('x', width/2)
            .attr('y', -25)
            .attr('text-anchor', 'middle')
            .style('font-size', '22px')
            .style('font-weight', 'bold')
            .style('fill', '#222')
            .text('Mental Health Challenges Faced by Students');

        svg.selectAll('g.bar-group')
            .data(chartData)
            .enter()
            .append('g')
            .attr('class', 'bar-group')
            .attr('transform', d => `translate(${x0(d.condition)},0)`)
            .selectAll('rect')
            .data(d => genders.map(gender => ({gender, value: d[gender], condition: d.condition})))
            .enter()
            .append('rect')
            .attr('x', d => x1(d.gender))
            .attr('y', d => y(d.value))
            .attr('width', x1.bandwidth())
            .attr('height', d => height - y(d.value))
            .attr('fill', d => color(d.gender))
            .attr('rx', 7)
            .attr('ry', 7)
            .on('mousemove', function(event, d) {
                tooltip.style('display', 'block')
                    .html(`<strong>${d.condition}</strong><br>${d.gender}: ${d.value.toFixed(1)}%`)
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
                d3.select(this).attr('fill', d3.rgb(color(d.gender)).darker(0.7));
            })
            .on('mouseleave', function(event, d) {
                tooltip.style('display', 'none');
                d3.select(this).attr('fill', color(d.gender));
            });

        const legend = svg.append('g')
            .attr('transform', `translate(${width - 120}, 0)`);
        genders.forEach((gender, i) => {
            legend.append('rect')
                .attr('x', 0)
                .attr('y', i * 28)
                .attr('width', 22)
                .attr('height', 22)
                .attr('fill', color(gender))
                .attr('rx', 5);
            legend.append('text')
                .attr('x', 32)
                .attr('y', i * 28 + 16)
                .text(gender)
                .style('font-size', '16px')
                .style('alignment-baseline', 'middle');
        });

        const brush = d3.brushX()
            .extent([[0, 0], [width, height]])
            .on('end', brushed);
        svg.append('g')
            .attr('class', 'brush')
            .call(brush);


        d3.select('#stackedbar').selectAll('#bar-summary').data([0]).enter()
            .append('div')
            .attr('id', 'bar-summary')
            .style('margin', '10px 0')
            .style('font-size', '15px');


        if (d3.select('#stackedbar #brush-indicator').empty()) {
            d3.select('#stackedbar').insert('div', ':first-child')
                .attr('id', 'brush-indicator')
                .style('font-size', '15px')
                .style('color', '#555')
                .style('margin-bottom', '4px')
                .html('Tip: Drag horizontally on the chart to select bars');
        }

        d3.select('#stackedbar svg').style('cursor', 'crosshair');

        function brushed(event) {
            let summaryDiv = d3.select('#bar-summary');
            if (!event.selection) {
                svg.selectAll('.bar-group rect')
                    .transition()
                    .duration(500)
                    .attr('opacity', 1);
                summaryDiv.html(""); // Clear summary
                return;
            }
            const [selX0, selX1] = event.selection;
            let selectedData = [];
            svg.selectAll('.bar-group rect')
                .transition()
                .duration(500)
                .attr('opacity', function(d) {
                    const barCenter = x0(d.condition) + x1(d.gender) + x1.bandwidth() / 2;
                    const selected = (barCenter >= selX0 && barCenter <= selX1);
                    if (selected) selectedData.push(d);
                    return selected ? 1 : 0.3;
                });
            if (selectedData.length > 0) {
                let html = "<b>Selected Bars:</b><ul>";
                selectedData.forEach(d => {
                    html += `<li>${d.condition} (${d.gender}): ${d.value.toFixed(1)}%</li>`;
                });
                html += "</ul>";
                summaryDiv.html(html);
            } else {
                summaryDiv.html("<i>No bars selected</i>");
            }
        }
    });
})();

(function() {
    const margin = {top: 100, right: 30, bottom: 30, left: 30},
        width = Math.max(350, document.getElementById('pie').offsetWidth - margin.left - margin.right),
        height = 510 - margin.top - margin.bottom,
        radius = Math.min(width, height) / 2;

    d3.select('#pie').selectAll('*').remove();

    const svg = d3.select('#pie')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${(width + margin.left + margin.right) / 2},${(height + margin.top + margin.bottom) / 2})`)

    const tooltip = d3.select('#pie')
        .append('div')
        .style('position', 'absolute')
        .style('background', 'rgba(255,255,255,0.97)')
        .style('border', '1px solid #ccc')
        .style('padding', '8px 12px')
        .style('border-radius', '6px')
        .style('pointer-events', 'none')
        .style('font-size', '14px')
        .style('color', '#222')
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.08)')
        .style('display', 'none');

    d3.csv('data/StudentMentalhealth.csv').then(data => {
        const conditions = [
            { key: "Do you have Depression?", label: "Depression" },
            { key: "Do you have Anxiety?", label: "Anxiety" },
            { key: "Do you have Panic attack?", label: "Panic Attack" }
        ];

        let allData = { Yes: 0, No: 0 };
        let conditionData = {};
        
        conditions.forEach(cond => {
            conditionData[cond.label] = { Yes: 0, No: 0 };
        });

        data.forEach(d => {
            const val = d['Did you seek any specialist for a treatment?'] ? d['Did you seek any specialist for a treatment?'].trim().toLowerCase() : '';
            if (val === 'yes') allData.Yes++;
            else if (val === 'no') allData.No++;

            conditions.forEach(cond => {
                if (d[cond.key] && d[cond.key].trim().toLowerCase() === 'yes') {
                    if (val === 'yes') conditionData[cond.label].Yes++;
                    else if (val === 'no') conditionData[cond.label].No++;
                }
            });
        });

        const color = d3.scaleOrdinal()
            .domain(['Yes', 'No'])
            .range(['#23007d', '#da0055']);

        const pie = d3.pie()
            .sort(null)
            .value(d => d.value);

        const arc = d3.arc()
            .innerRadius(radius * 0.6)
            .outerRadius(radius * 0.95);

        let currentData = [
            { label: 'Yes', value: allData.Yes },
            { label: 'No', value: allData.No }
        ];

        let currentTitle = 'Most Students Do Not Seek Help for Their Mental Health';
        let currentSubtitle = 'Help-Seeking';

        function updatePieChart(newData, title, subtitle) {
            const total = newData.reduce((sum, d) => sum + d.value, 0);
            
            svg.selectAll('.title').remove();
            svg.append('text')
                .attr('class', 'title')
                .attr('x', 0)
                .attr('y', -radius - 40)
                .attr('text-anchor', 'middle')
                .style('font-size', '20px')
                .style('font-weight', 'bold')
                .style('fill', '#222')
                .text(title);

            svg.selectAll('.subtitle').remove();
            svg.append('text')
                .attr('class', 'subtitle')
                .attr('text-anchor', 'middle')
                .attr('y', radius + 60)
                .style('font-size', '18px')
                .style('font-weight', 'bold')
                .style('fill', '#333')
                .text(subtitle);

            svg.selectAll('.center-text').remove();
            svg.append('text')
                .attr('class', 'center-text')
                .attr('text-anchor', 'middle')
                .attr('y', 8)
                .style('font-size', '22px')
                .style('font-weight', 'bold')
                .style('fill', '#222')
                .text(`${Math.round((newData[1].value / total) * 100)}%`);
            svg.append('text')
                .attr('class', 'center-text')
                .attr('text-anchor', 'middle')
                .attr('y', 32)
                .style('font-size', '15px')
                .style('fill', '#666')
                .text('Did Not Seek Help');

            const path = svg.selectAll('path')
                .data(pie(newData));

            path.exit().remove();

            path.enter()
                .append('path')
                .attr('fill', d => color(d.data.label))
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .on('mousemove', function(event, d) {
                    const percent = ((d.data.value / total) * 100).toFixed(1);
                    tooltip.style('display', 'block')
                        .html(`<strong>${d.data.label}</strong>: ${d.data.value} students (${percent}%)`)
                        .style('left', (event.pageX + 15) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                    d3.select(this).attr('fill', d3.rgb(color(d.data.label)).darker(0.7));
                })
                .on('mouseleave', function(event, d) {
                    tooltip.style('display', 'none');
                    d3.select(this).attr('fill', color(d.data.label));
                })
                .merge(path)
                .transition()
                .duration(750)
                .attrTween('d', function(d) {
                    const current = d3.select(this);
                    const previous = current.datum();
                    const interpolate = d3.interpolate(previous, d);
                    return function(t) {
                        return arc(interpolate(t));
                    };
                });
        }

        updatePieChart(currentData, currentTitle, currentSubtitle);

        const buttonContainer = d3.select('#pie')
            .insert('div', ':first-child')
            .style('display', 'flex')
            .style('gap', '10px')
            .style('margin-bottom', '10px');

        buttonContainer.append('button')
            .text('All Conditions')
            .style('padding', '8px 16px')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('background', '#23007d')
            .style('color', 'white')
            .style('cursor', 'pointer')
            .style('font-size', '14px')
            .on('click', () => {
                currentData = [
                    { label: 'Yes', value: allData.Yes },
                    { label: 'No', value: allData.No }
                ];
                currentTitle = 'Most Students Do Not Seek Help for Their Mental Health';
                currentSubtitle = 'Help-Seeking';
                updatePieChart(currentData, currentTitle, currentSubtitle);
            });

        conditions.forEach(cond => {
            buttonContainer.append('button')
                .text(cond.label)
                .style('padding', '8px 16px')
                .style('border', 'none')
                .style('border-radius', '4px')
                .style('background', '#da0055')
                .style('color', 'white')
                .style('cursor', 'pointer')
                .style('font-size', '14px')
                .on('click', () => {
                    currentData = [
                        { label: 'Yes', value: conditionData[cond.label].Yes },
                        { label: 'No', value: conditionData[cond.label].No }
                    ];
                    currentTitle = `Help-Seeking Behavior for ${cond.label}`;
                    currentSubtitle = `${cond.label} Students`;
                    updatePieChart(currentData, currentTitle, currentSubtitle);
                });
        });
    });
})();

(function() {   
    const margin = {top: 80, right: 60, bottom: 30, left: 150},
        width = Math.max(400, document.getElementById('sankey').offsetWidth - margin.left - margin.right),
        height = 500 - margin.top - margin.bottom;

    d3.select('#sankey').selectAll('*').remove();

    const svg = d3.select('#sankey')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select('#sankey')
        .append('div')
        .style('position', 'absolute')
        .style('background', 'rgba(255,255,255,0.97)')
        .style('border', '1px solid #ccc')
        .style('padding', '8px 12px')
        .style('border-radius', '6px')
        .style('pointer-events', 'none')
        .style('font-size', '14px')
        .style('color', '#222')
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.08)')
        .style('display', 'none');

    const flows = [
        {cond: 'No Condition', help: 'No', cgpa: 'High', value: 12, avg_cgpa: 3.7},
        {cond: 'No Condition', help: 'No', cgpa: 'Medium', value: 8, avg_cgpa: 3.2},
        {cond: 'No Condition', help: 'No', cgpa: 'Low', value: 3, avg_cgpa: 2.5},
        {cond: 'No Condition', help: 'Yes', cgpa: 'High', value: 5, avg_cgpa: 3.8},
        {cond: 'No Condition', help: 'Yes', cgpa: 'Medium', value: 7, avg_cgpa: 3.3},
        {cond: 'No Condition', help: 'Yes', cgpa: 'Low', value: 2, avg_cgpa: 2.7},
        {cond: 'One Condition', help: 'No', cgpa: 'High', value: 8, avg_cgpa: 3.6},
        {cond: 'One Condition', help: 'No', cgpa: 'Medium', value: 14, avg_cgpa: 3.1},
        {cond: 'One Condition', help: 'No', cgpa: 'Low', value: 3, avg_cgpa: 2.4},
        {cond: 'One Condition', help: 'Yes', cgpa: 'High', value: 9, avg_cgpa: 3.7},
        {cond: 'One Condition', help: 'Yes', cgpa: 'Medium', value: 10, avg_cgpa: 3.3},
        {cond: 'One Condition', help: 'Yes', cgpa: 'Low', value: 1, avg_cgpa: 2.8},
        {cond: 'Two Conditions', help: 'No', cgpa: 'High', value: 2, avg_cgpa: 3.5},
        {cond: 'Two Conditions', help: 'No', cgpa: 'Medium', value: 7, avg_cgpa: 3.0},
        {cond: 'Two Conditions', help: 'No', cgpa: 'Low', value: 4, avg_cgpa: 2.2},
        {cond: 'Two Conditions', help: 'Yes', cgpa: 'High', value: 3, avg_cgpa: 3.6},
        {cond: 'Two Conditions', help: 'Yes', cgpa: 'Medium', value: 3, avg_cgpa: 3.2},
        {cond: 'Two Conditions', help: 'Yes', cgpa: 'Low', value: 1, avg_cgpa: 2.6},
        {cond: 'All Three Conditions', help: 'No', cgpa: 'High', value: 1, avg_cgpa: 3.4},
        {cond: 'All Three Conditions', help: 'No', cgpa: 'Medium', value: 3, avg_cgpa: 2.9},
        {cond: 'All Three Conditions', help: 'No', cgpa: 'Low', value: 2, avg_cgpa: 2.0},
        {cond: 'All Three Conditions', help: 'Yes', cgpa: 'High', value: 2, avg_cgpa: 3.5},
        {cond: 'All Three Conditions', help: 'Yes', cgpa: 'Medium', value: 1, avg_cgpa: 3.1},
        {cond: 'All Three Conditions', help: 'Yes', cgpa: 'Low', value: 0, avg_cgpa: 0}
    ];

    const conds = ['No Condition', 'One Condition', 'Two Conditions', 'All Three Conditions'];
    const helps = ['No', 'Yes'];
    const cgpas = ['Low', 'Medium', 'High'];
    const nodeNames = [].concat(conds, helps, cgpas);
    const nodeIndex = {};
    nodeNames.forEach((n, i) => nodeIndex[n] = i);

    const nodes = nodeNames.map(name => ({ name }));
    let links = [];
    flows.forEach(f => {
        links.push({
            source: nodeIndex[f.cond],
            target: nodeIndex[f.help],
            value: f.value,
            stage: 1,
            cgpa: f.cgpa,
            avg_cgpa: f.avg_cgpa,
            cond: f.cond,
            help: f.help
        });
        links.push({
            source: nodeIndex[f.help],
            target: nodeIndex[f.cgpa],
            value: f.value,
            stage: 2,
            cgpa: f.cgpa,
            avg_cgpa: f.avg_cgpa,
            cond: f.cond,
            help: f.help
        });
    });


    const cgpaColor = d3.scaleOrdinal()
        .domain(['High', 'Medium', 'Low'])
        .range(['#15a687', '#ffff9d', '#de425b']);


    const sankey = d3.sankey()
        .nodeWidth(28)
        .nodePadding(18)
        .extent([[0, 0], [width, height]]);
    const sankeyData = sankey({ nodes: nodes.map(d => Object.assign({}, d)), links: links.map(d => Object.assign({}, d)) });

 
    svg.append('g')
        .selectAll('path')
        .data(sankeyData.links)
        .enter()
        .append('path')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('fill', 'none')
        .attr('stroke', d => cgpaColor(d.cgpa))
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('opacity', 0.55)
        .on('mousemove', function(event, d) {
            tooltip.style('display', 'block')
                .html(`<strong>Path:</strong> ${d.cond} → ${d.help} → ${d.cgpa}<br><strong>Students:</strong> ${d.value}<br><strong>Avg CGPA:</strong> ${d.avg_cgpa}`)
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            d3.select(this).attr('opacity', 0.9);
        })
        .on('mouseleave', function(event, d) {
            tooltip.style('display', 'none');
            d3.select(this).attr('opacity', 0.55);
        });


    const node = svg.append('g')
        .selectAll('g')
        .data(sankeyData.nodes)
        .enter().append('g');

    node.append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => d.y1 - d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('fill', d => {
            if (cgpas.includes(d.name)) return cgpaColor(d.name);
            if (conds.includes(d.name)) return '#004c6d';
            if (helps.includes(d.name)) return '#004c6d';
            return '#ccc';
        })
        .attr('stroke', '#222');

    node.append('text')
        .attr('x', d => d.x0 - 8)
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .style('font-size', '15px')
        .style('fill', '#222')
        .text(d => d.name);


    svg.append('text')
        .attr('x', width/2)
        .attr('y', -60)
        .attr('text-anchor', 'middle')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .style('fill', '#222')
        .text('Mental Health, Support, and Academic Outcomes');


    const condNodes = sankeyData.nodes.filter(d => conds.includes(d.name));
    const helpNodes = sankeyData.nodes.filter(d => helps.includes(d.name));
    const cgpaNodes = sankeyData.nodes.filter(d => cgpas.includes(d.name));
    function avgX(nodes) {
        return d3.mean(nodes, d => (d.x0 + d.x1) / 2);
    }
    svg.append('text')
        .attr('x', avgX(condNodes))
        .attr('y', -18)
        .attr('text-anchor', 'middle')
        .style('font-size', '17px')
        .style('font-weight', 'bold')
        .style('fill', '#555')
        .text('Condition Bucket');
    svg.append('text')
        .attr('x', avgX(helpNodes))
        .attr('y', -18)
        .attr('text-anchor', 'middle')
        .style('font-size', '17px')
        .style('font-weight', 'bold')
        .style('fill', '#555')
        .text('Help-Seeking');
    svg.append('text')
        .attr('x', avgX(cgpaNodes))
        .attr('y', -18)
        .attr('text-anchor', 'middle')
        .style('font-size', '17px')
        .style('font-weight', 'bold')
        .style('fill', '#555')
        .text('CGPA Bracket');

    const legend = svg.append('g')
        .attr('transform', `translate(${width - 260},${height - 60})`);
    const legendData = [
        {label: 'High CGPA (≥ 3.50)', color: '#15a687'},
        {label: 'Medium CGPA (3.00–3.49)', color: '#ffff9d'},
        {label: 'Low CGPA (≤ 2.99)', color: '#de425b'}
    ];
    legendData.forEach((d, i) => {
        legend.append('rect')
            .attr('x', 0)
            .attr('y', i * 28)
            .attr('width', 22)
            .attr('height', 22)
            .attr('fill', d.color)
            .attr('rx', 5);
        legend.append('text')
            .attr('x', 32)
            .attr('y', i * 28 + 16)
            .text(d.label)
            .style('font-size', '16px')
            .style('alignment-baseline', 'middle');
    });
})();

