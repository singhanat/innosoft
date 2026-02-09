document.addEventListener('DOMContentLoaded', async () => {
    const svg = document.getElementById('chart-svg');
    const diagramList = document.getElementById('diagram-list');
    const compareBase = document.getElementById('compare-base');
    const compareTarget = document.getElementById('compare-target');
    const btnCompare = document.getElementById('btn-compare');
    const btnClear = document.getElementById('btn-clear-compare');
    const legend = document.getElementById('compare-legend');
    const searchInput = document.getElementById('search-input');
    const diagramTitle = document.getElementById('diagram-title');

    // Config Readable
    const nodeRadius = 60;
    const levelSpacing = 160;
    const horizontalSpacing = 180;
    const verticalPadding = 100;

    let diagrams = [];
    let currentData = {};

    // Initialize
    async function init() {
        try {
            const resp = await fetch(`diagrams.json?t=${new Date().getTime()}`);
            diagrams = await resp.json();

            renderSidebar();
            populateSelects();

            if (diagrams.length > 0) {
                loadDiagram(diagrams[0].file, diagrams[0].id, diagrams[0].name);
            }
        } catch (error) {
            console.error("Init error:", error);
        }
    }

    function renderSidebar() {
        diagramList.innerHTML = '';
        diagrams.forEach(diag => {
            const li = document.createElement('li');
            li.className = 'diagram-item';
            li.id = `item-${diag.id}`;
            li.textContent = diag.name;
            li.onclick = () => {
                loadDiagram(diag.file, diag.id, diag.name);
                btnClear.click(); // Reset compare view
            };
            diagramList.appendChild(li);
        });
    }

    function populateSelects() {
        const options = diagrams.map(d => `<option value="${d.file}">${d.name}</option>`).join('');
        compareBase.innerHTML = options;
        compareTarget.innerHTML = options;
        if (diagrams.length > 1) compareTarget.selectedIndex = 1;
    }

    async function fetchData(fileName) {
        const response = await fetch(`${fileName}?t=${new Date().getTime()}`);
        return await response.json();
    }

    async function loadDiagram(fileName, id, name) {
        document.querySelectorAll('.diagram-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.getElementById(`item-${id}`);
        if (activeItem) activeItem.classList.add('active');

        diagramTitle.textContent = name;
        currentData = await fetchData(fileName);
        renderChart(currentData);
    }

    btnCompare.onclick = async () => {
        const baseData = await fetchData(compareBase.value);
        const targetData = await fetchData(compareTarget.value);

        const diffData = calculateSoftenedDiff(baseData, targetData);
        diagramTitle.textContent = "Organization Re-alignment Analysis";
        renderChart(diffData, true);

        btnClear.style.display = 'block';
        legend.style.display = 'flex';
    };

    btnClear.onclick = () => {
        const activeDiag = diagrams.find(d => document.getElementById(`item-${d.id}`).classList.contains('active'));
        if (activeDiag) loadDiagram(activeDiag.file, activeDiag.id, activeDiag.name);
        btnClear.style.display = 'none';
        legend.style.display = 'none';
        searchInput.value = '';
    };

    function calculateSoftenedDiff(base, target) {
        const result = JSON.parse(JSON.stringify(target));

        Object.keys(result).forEach(name => {
            const oldValue = base[name];
            const newValue = target[name];

            if (!oldValue) {
                result[name].diff = 'new';
            } else {
                // Softened labels
                if (newValue.level < oldValue.level) {
                    result[name].diff = 'promoted';
                } else if (newValue.level > oldValue.level) {
                    result[name].diff = 'realigned'; // Neutral term for demotion
                } else if (newValue.under !== oldValue.under) {
                    result[name].diff = 'moved';
                }
            }
        });
        return result;
    }

    // SEARCH & HIGHLIGHT
    searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase().trim();
        const nodes = document.querySelectorAll('.node-group');
        const lines = document.querySelectorAll('.connector-line');

        if (!term) {
            nodes.forEach(n => n.classList.remove('faded', 'highlighted'));
            lines.forEach(l => l.classList.remove('faded'));
            return;
        }

        nodes.forEach(n => {
            const name = n.getAttribute('data-name').toLowerCase();
            const pos = n.getAttribute('data-pos').toLowerCase();
            if (name.includes(term) || pos.includes(term)) {
                n.classList.remove('faded');
                n.classList.add('highlighted');
            } else {
                n.classList.add('faded');
                n.classList.remove('highlighted');
            }
        });

        lines.forEach(l => l.classList.add('faded'));
    };

    function renderChart(rawData, isDiff = false) {
        svg.innerHTML = '';
        const nodes = {};
        let root = null;

        Object.entries(rawData).forEach(([name, info]) => {
            nodes[name] = {
                name,
                position: info.position || '',
                level: info.level,
                under: info.under,
                diff: info.diff,
                children: [],
                x: 0,
                y: 0
            };
        });

        Object.values(nodes).forEach(node => {
            if (node.under && nodes[node.under]) {
                nodes[node.under].children.push(node);
            } else if (node.level === 1) {
                root = node;
            }
        });

        if (!root) return;

        function calculateWidth(node) {
            if (node.children.length === 0) {
                node.subtreeWidth = horizontalSpacing;
                return node.subtreeWidth;
            }
            let width = 0;
            node.children.forEach(c => width += calculateWidth(c));
            node.subtreeWidth = Math.max(width, horizontalSpacing);
            return node.subtreeWidth;
        }

        function setPos(node, startX) {
            node.y = verticalPadding + (node.level - 1) * levelSpacing;
            if (node.children.length === 0) {
                node.x = startX + node.subtreeWidth / 2;
                return;
            }
            let curX = startX;
            node.children.forEach(c => {
                setPos(c, curX);
                curX += c.subtreeWidth;
            });
            node.x = (node.children[0].x + node.children[node.children.length - 1].x) / 2;
        }

        calculateWidth(root);
        setPos(root, 0);

        const gLines = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const gNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
        svg.appendChild(gLines);
        svg.appendChild(gNodes);

        function draw(node) {
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.setAttribute("class", "node-group");
            group.setAttribute("data-name", node.name);
            group.setAttribute("data-pos", node.position);

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", node.x);
            circle.setAttribute("cy", node.y);
            circle.setAttribute("r", nodeRadius);

            let nodeClass = "node-circle";
            if (isDiff && node.diff) nodeClass += ` node-${node.diff}`;
            circle.setAttribute("class", nodeClass);

            // Name Text
            const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textName.setAttribute("x", node.x);
            textName.setAttribute("y", node.y - 8);
            textName.setAttribute("class", "node-name");
            textName.textContent = node.name;

            // Position Text
            const textPos = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textPos.setAttribute("x", node.x);
            textPos.setAttribute("y", node.y + 18);
            textPos.setAttribute("class", "node-pos");
            textPos.textContent = node.position;

            group.appendChild(circle);
            group.appendChild(textName);
            group.appendChild(textPos);
            gNodes.appendChild(group);

            if (node.children.length > 0) {
                const startX = node.x;
                const startY = node.y + nodeRadius;
                const minChildY = Math.min(...node.children.map(c => c.y));
                const midY = (startY + (minChildY - nodeRadius)) / 2;

                node.children.forEach(child => {
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    const d = `M ${startX} ${startY} L ${startX} ${midY} L ${child.x} ${midY} L ${child.x} ${child.y - nodeRadius}`;
                    line.setAttribute("d", d);

                    let lineClass = "connector-line";
                    if (isDiff && (child.diff)) {
                        lineClass += " line-highlight";
                    }
                    line.setAttribute("class", lineClass);
                    gLines.appendChild(line);
                    draw(child);
                });
            }
        }

        draw(root);

        const bbox = svg.getBBox();
        const padding = 150; // Tighter margin to make it appear larger
        svg.setAttribute("viewBox", `${bbox.x - padding / 2} ${bbox.y - padding / 2} ${bbox.width + padding} ${bbox.height + padding}`);
    }

    init();
});
