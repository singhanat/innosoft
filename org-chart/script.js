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
    const btnReset = document.getElementById('btn-reset');
    const btnDownload = document.getElementById('btn-download');

    // Config Readable
    const nodeRadius = 60;
    const levelSpacing = 160;
    const horizontalSpacing = 180;
    const verticalPadding = 100;

    // Zoom and Pan State
    let currentScale = 1;
    let currentTranslateX = 0;
    let currentTranslateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let mainGroup = null;

    let diagrams = [];
    let currentData = {};

    // Initialize
    async function init() {
        try {
            const resp = await fetch(`diagrams.json?t=${new Date().getTime()}`);
            diagrams = await resp.json();

            setupZoomPan();
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

    // ZOOM & PAN HANDLERS
    function setupZoomPan() {
        svg.addEventListener('wheel', handleWheel, { passive: false });
        svg.addEventListener('mousedown', startDrag);
        svg.addEventListener('mousemove', drag);
        svg.addEventListener('mouseup', endDrag);
        svg.addEventListener('mouseleave', endDrag);

        // Touch support
        svg.addEventListener('touchstart', startTouch, { passive: false });
        svg.addEventListener('touchmove', touchMove, { passive: false });
        svg.addEventListener('touchend', endDrag);
    }

    function updateTransform() {
        if (mainGroup) {
            mainGroup.setAttribute('transform', `translate(${currentTranslateX}, ${currentTranslateY}) scale(${currentScale})`);
        }
    }

    function handleWheel(e) {
        e.preventDefault();
        const zoomFactor = 1.1;
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = direction === 1 ? zoomFactor : 1 / zoomFactor;

        // Calculate new scale
        let newScale = currentScale * factor;
        // Clamp scale
        newScale = Math.max(0.1, Math.min(newScale, 5));

        // Get cursor position relative to SVG
        const rect = svg.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        // Calculate new translate to zoom towards cursor
        // (cursor - translate) / scale = world parameters
        // newTranslate = cursor - (world * newScale)
        // newTranslate = cursor - ((cursor - oldTranslate) / oldScale) * newScale
        currentTranslateX = cursorX - ((cursorX - currentTranslateX) / currentScale) * newScale;
        currentTranslateY = cursorY - ((cursorY - currentTranslateY) / currentScale) * newScale;

        currentScale = newScale;
        updateTransform();
    }

    function startDrag(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        svg.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        currentTranslateX += dx;
        currentTranslateY += dy;

        startX = e.clientX;
        startY = e.clientY;

        updateTransform();
    }

    function endDrag() {
        isDragging = false;
        svg.style.cursor = 'grab';
    }

    let lastTouchDistance = 0;

    function startTouch(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            lastTouchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        } else if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
    }

    function touchMove(e) {
        e.preventDefault();
        if (e.touches.length === 2) {
            // Pinch to zoom logic could go here, for now strictly pan/wheel zoom is fine
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

            const factor = dist / lastTouchDistance;
            lastTouchDistance = dist;

            let newScale = currentScale * factor;
            newScale = Math.max(0.1, Math.min(newScale, 5));

            // Zoom center view
            const rect = svg.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            currentTranslateX = centerX - ((centerX - currentTranslateX) / currentScale) * newScale;
            currentTranslateY = centerY - ((centerY - currentTranslateY) / currentScale) * newScale;

            currentScale = newScale;
            updateTransform();

        } else if (e.touches.length === 1 && isDragging) {
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            currentTranslateX += dx;
            currentTranslateY += dy;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            updateTransform();
        }
    }

    // Toolbar Actions
    btnReset.onclick = () => {
        // Find best fit or just reset to center
        fitToScreen();
    };

    btnDownload.onclick = () => {
        saveSvgAsPng();
    };

    function fitToScreen() {
        if (!mainGroup) return;

        const bbox = mainGroup.getBBox();
        const svgRect = svg.getBoundingClientRect();

        const padding = 50;

        const scaleX = (svgRect.width - padding * 2) / bbox.width;
        const scaleY = (svgRect.height - padding * 2) / bbox.height;
        currentScale = Math.min(scaleX, scaleY);

        if (currentScale > 1.5) currentScale = 1.5;

        const bboxCenterX = bbox.x + bbox.width / 2;
        const bboxCenterY = bbox.y + bbox.height / 2;
        const svgCenterX = svgRect.width / 2;
        const svgCenterY = svgRect.height / 2;

        currentTranslateX = svgCenterX - bboxCenterX * currentScale;
        currentTranslateY = svgCenterY - bboxCenterY * currentScale;

        updateTransform();
    }

    async function saveSvgAsPng() {
        const btn = document.getElementById('btn-download');
        // Simple loading indication
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';

        try {
            // Create a clone of the SVG to manipulate for saving
            const cloneSvg = svg.cloneNode(true);
            const cloneGroup = cloneSvg.querySelector('g');

            // We need to reset transform on the clone to get full view
            // Calculate the full bounds of the content
            const bbox = mainGroup.getBBox();

            // Add padding
            const padding = 50;
            const width = bbox.width + padding * 2;
            const height = bbox.height + padding * 2;

            cloneSvg.setAttribute('width', width);
            cloneSvg.setAttribute('height', height);
            cloneSvg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);

            // Remove transform from the group so it sits at its natural coordinates
            if (cloneGroup) cloneGroup.removeAttribute('transform');

            // Prepare Font CSS (Inline Base64 to bypass CORS/Canvas taint issues)
            let fontCss = '';
            try {
                // Fetch Google Fonts CSS
                const googleFontUrl = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap';
                const cssResp = await fetch(googleFontUrl);
                const cssText = await cssResp.text();

                // Parse and fetch individual font files to convert to Base64
                // This regex captures the URL inside url(...)
                const urlRegex = /url\((https?:\/\/[^)]+)\)/g;
                let newCssText = cssText;
                let match;
                const replacements = [];

                // Collect all font URLs
                while ((match = urlRegex.exec(cssText)) !== null) {
                    replacements.push({
                        originalRequest: match[0],
                        url: match[1]
                    });
                }

                // Fetch each font file and convert to Base64
                for (const rep of replacements) {
                    try {
                        const fontResp = await fetch(rep.url);
                        const blob = await fontResp.blob();

                        const base64 = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });

                        // Replace the URL with the Base64 data URI
                        newCssText = newCssText.replace(rep.url, base64);
                    } catch (fontErr) {
                        console.warn("Failed to fetch font subset:", rep.url, fontErr);
                    }
                }
                fontCss = newCssText;

            } catch (e) {
                console.warn("Font inlining failed, falling back to @import. Export might miss fonts.", e);
                fontCss = `@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');`;
            }

            // Create style element with ALL relevant styles
            const style = document.createElement('style');
            style.textContent = `
                ${fontCss}

                .node-circle { 
                    fill: #0d5471; 
                    stroke: rgba(255, 255, 255, 0.3); 
                    stroke-width: 2px; 
                    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.12));
                }
                .node-name { 
                    fill: white; 
                    font-family: 'Sarabun', sans-serif; 
                    font-weight: 700; 
                    font-size: 16px; 
                    text-anchor: middle;
                    dominant-baseline: middle;
                }
                .node-pos { 
                    fill: rgba(255, 255, 255, 0.9); 
                    font-family: 'Sarabun', sans-serif; 
                    font-weight: 400; 
                    font-size: 10px; 
                    text-anchor: middle;
                }
                .connector-line { 
                    fill: none; 
                    stroke: #cbd5e1; 
                    stroke-width: 1.5px; 
                }
                .node-promoted { fill: #10b981 !important; }
                .node-realigned { fill: #64748b !important; }
                .node-moved { fill: #f59e0b !important; }
                .node-new { fill: #06b6d4 !important; }
            `;
            cloneSvg.prepend(style);

            const xml = new XMLSerializer().serializeToString(cloneSvg);
            const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));

            const img = new Image();

            // Improve resolution (2x upscale)
            const scaleFactor = 2;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width * scaleFactor;
                canvas.height = height * scaleFactor;
                const ctx = canvas.getContext('2d');

                // Scale context for better quality
                ctx.scale(scaleFactor, scaleFactor);

                ctx.drawImage(img, 0, 0);

                const link = document.createElement('a');
                link.download = `innosoft-org-chart-${new Date().getTime()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();

                // Reset loading state
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            };

            img.onerror = (e) => {
                console.error("Image export failed", e);
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            };

            img.src = dataUrl;

        } catch (globalErr) {
            console.error("Export process failed", globalErr);
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
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

        // Create container group for zoom/pan
        mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

        const gLines = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const gNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");

        mainGroup.appendChild(gLines);
        mainGroup.appendChild(gNodes);
        svg.appendChild(mainGroup);

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

        // Fit to screen logic using transform
        fitToScreen();
    }

    init();
});
