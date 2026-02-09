document.addEventListener('DOMContentLoaded', async () => {
    const svg = document.getElementById('chart-svg');
    const diagramList = document.getElementById('diagram-list');

    // Config values
    const nodeRadius = 50;
    const levelSpacing = 160;
    const horizontalSpacing = 160;
    const verticalPadding = 100;

    let diagrams = [];

    // Initialize
    async function init() {
        try {
            // 1. Load the list of diagrams
            const resp = await fetch(`diagrams.json?t=${new Date().getTime()}`);
            diagrams = await resp.json();

            // 2. Build the sidebar menu
            renderSidebar();

            // 3. Load the first diagram by default
            if (diagrams.length > 0) {
                loadDiagram(diagrams[0].file, diagrams[0].id);
            }
        } catch (error) {
            console.error("Error initializing app:", error);
        }
    }

    function renderSidebar() {
        diagramList.innerHTML = '';
        diagrams.forEach(diag => {
            const li = document.createElement('li');
            li.className = 'diagram-item';
            li.id = `item-${diag.id}`;
            li.textContent = diag.name;
            li.onclick = () => loadDiagram(diag.file, diag.id);
            diagramList.appendChild(li);
        });
    }

    async function loadDiagram(fileName, id) {
        // Update active state in UI
        document.querySelectorAll('.diagram-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.getElementById(`item-${id}`);
        if (activeItem) activeItem.classList.add('active');

        // Clear existing SVG
        svg.innerHTML = '';

        try {
            const response = await fetch(`${fileName}?t=${new Date().getTime()}`);
            const rawData = await response.json();

            renderChart(rawData);
        } catch (error) {
            console.error(`Error loading diagram ${fileName}:`, error);
        }
    }

    function renderChart(rawData) {
        // 1. Convert flat JSON to a tree-like structure and build map
        const nodes = {};
        let root = null;

        // Initialize node objects
        Object.entries(rawData).forEach(([name, info]) => {
            nodes[name] = {
                name,
                level: info.level,
                under: info.under,
                children: [],
                x: 0,
                y: 0
            };
        });

        // Link parent to children
        Object.values(nodes).forEach(node => {
            if (node.under && nodes[node.under]) {
                nodes[node.under].children.push(node);
            } else if (node.level === 1) {
                root = node;
            }
        });

        if (!root) return;

        // 2. Calculate positions
        function calculateSubtreeWidth(node) {
            if (node.children.length === 0) {
                node.subtreeWidth = horizontalSpacing;
                return node.subtreeWidth;
            }
            let width = 0;
            node.children.forEach(child => {
                width += calculateSubtreeWidth(child);
            });
            node.subtreeWidth = Math.max(width, horizontalSpacing);
            return node.subtreeWidth;
        }

        function setPositions(node, startX) {
            node.y = verticalPadding + (node.level - 1) * levelSpacing;
            if (node.children.length === 0) {
                node.x = startX + node.subtreeWidth / 2;
                return;
            }
            let currentX = startX;
            node.children.forEach(child => {
                setPositions(child, currentX);
                currentX += child.subtreeWidth;
            });
            const firstChild = node.children[0];
            const lastChild = node.children[node.children.length - 1];
            node.x = (firstChild.x + lastChild.x) / 2;
        }

        calculateSubtreeWidth(root);
        setPositions(root, 0);

        // 3. Render
        const gLines = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const gNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
        svg.appendChild(gLines);
        svg.appendChild(gNodes);

        function drawNode(node) {
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.setAttribute("class", "node-group");

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", node.x);
            circle.setAttribute("cy", node.y);
            circle.setAttribute("r", nodeRadius);
            circle.setAttribute("class", "node-circle");

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", node.x);
            text.setAttribute("y", node.y);
            text.setAttribute("class", "node-text");
            text.textContent = node.name;

            group.appendChild(circle);
            group.appendChild(text);
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
                    line.setAttribute("class", "connector-line");
                    gLines.appendChild(line);
                    drawNode(child);
                });
            }
        }

        drawNode(root);

        // Auto-fit using viewBox only
        const bbox = svg.getBBox();
        const padding = 100;
        svg.setAttribute("viewBox", `${bbox.x - padding / 2} ${bbox.y - padding / 2} ${bbox.width + padding} ${bbox.height + padding}`);
    }

    init();
});
