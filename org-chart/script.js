document.addEventListener('DOMContentLoaded', async () => {
    const svg = document.getElementById('chart-svg');
    const container = document.getElementById('chart-container');
    
    // Config values
    const nodeRadius = 50;
    const levelSpacing = 160;
    const horizontalSpacing = 160;
    const verticalPadding = 100;

    try {
        const response = await fetch('data.json');
        const rawData = await response.json();
        
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

        if (!root) {
            console.error("No root node found (level 1)");
            return;
        }

        // 2. Calculate positions
        // We use a recursive function to determine the width of subtrees to space them correctly
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

        function setPositions(node, startX, currentY) {
            node.y = currentY;
            
            if (node.children.length === 0) {
                node.x = startX + node.subtreeWidth / 2;
                return;
            }

            let currentX = startX;
            node.children.forEach(child => {
                setPositions(child, currentX, currentY + levelSpacing);
                currentX += child.subtreeWidth;
            });

            // Parent position is average of first and last child's X
            const firstChild = node.children[0];
            const lastChild = node.children[node.children.length - 1];
            node.x = (firstChild.x + lastChild.x) / 2;
        }

        calculateSubtreeWidth(root);
        setPositions(root, 0, verticalPadding);

        // 3. Render
        const gLines = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const gNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
        svg.appendChild(gLines);
        svg.appendChild(gNodes);

        function render(node) {
            // Render node
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

            // Render lines to children
            node.children.forEach(child => {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                
                // Rectilinear path (elbow line)
                const startX = node.x;
                const startY = node.y + nodeRadius;
                const endX = child.x;
                const endY = child.y - nodeRadius;
                const midY = (startY + endY) / 2;

                // Move to start, line to midY, horizontal to childX, line to endY
                const d = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
                
                line.setAttribute("d", d);
                line.setAttribute("class", "connector-line");
                gLines.appendChild(line);

                render(child);
            });
        }

        render(root);

        // Auto-scale SVG to fit content
        const bbox = svg.getBBox();
        svg.setAttribute("viewBox", `${bbox.x - 50} ${bbox.y - 50} ${bbox.width + 100} ${bbox.height + 100}`);
        svg.setAttribute("width", bbox.width + 100);
        svg.setAttribute("height", bbox.height + 100);

    } catch (error) {
        console.error("Error loading or rendering org chart:", error);
    }
});
