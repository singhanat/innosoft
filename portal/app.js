document.addEventListener('DOMContentLoaded', () => {
    // Views
    const listView = document.getElementById('project-list-view');
    const detailView = document.getElementById('project-detail-view');
    const grid = document.getElementById('project-grid');
    const backBtn = document.getElementById('back-btn');
    const viewGridBtn = document.getElementById('view-grid');
    const viewListBtn = document.getElementById('view-list');

    // View Toggle Logic
    if (viewGridBtn && viewListBtn) {
        viewGridBtn.addEventListener('click', () => {
            grid.classList.remove('list-view');
            viewGridBtn.classList.add('active');
            viewListBtn.classList.remove('active');
        });

        viewListBtn.addEventListener('click', () => {
            grid.classList.add('list-view');
            viewListBtn.classList.add('active');
            viewGridBtn.classList.remove('active');
        });
    }

    // Detail Elements
    const detailIcon = document.getElementById('detail-icon');
    const detailTitle = document.getElementById('detail-title');
    const detailStatus = document.getElementById('detail-status');
    const detailDesc = document.getElementById('detail-description');
    const detailMeta = document.getElementById('detail-metadata');
    const detailResources = document.getElementById('detail-resources');

    // Breadcrumb
    const breadcrumb = document.querySelector('.breadcrumb');
    const originalBreadcrumbHTML = breadcrumb.innerHTML;

    // Scroll Management
    const contentArea = document.querySelector('.content-area');
    let lastScrollPosition = 0;

    let allProjects = [];

    // Fetch Data
    fetch('data/projects.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            allProjects = data;
            populateFilters(data);
            renderProjects(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            grid.innerHTML = `<div class="error-msg">
                <p>Failed to load project data.</p>
                <small>${error.message}</small>
                <br>
                <small>If you are opening this file directly, please use a local server (e.g. run.ps1)</small>
            </div>`;
        });

    // Filtering
    const deptFilter = document.getElementById('dept-filter');
    const techFilter = document.getElementById('tech-filter');
    const searchInput = document.querySelector('.search-box input'); // Search from topbar

    function populateFilters(projects) {
        // Collect unique technologies
        const techs = new Set();
        projects.forEach(p => {
            if (p.techStack) {
                p.techStack.forEach(t => techs.add(t));
            }
        });

        // Sort and Append
        Array.from(techs).sort().forEach(tech => {
            const option = document.createElement('option');
            option.value = tech;
            option.textContent = tech;
            techFilter.appendChild(option);
        });
    }

    function filterProjects() {
        const deptValue = deptFilter.value;
        const techValue = techFilter.value;
        const searchValue = searchInput.value.toLowerCase();

        const filtered = allProjects.filter(project => {
            // Department Filter
            const projectDept = project.metadata?.department || 'General';
            const matchDept = deptValue === 'all' || projectDept === deptValue;

            // Tech Filter
            const projectTech = project.techStack || [];
            const matchTech = techValue === 'all' || projectTech.includes(techValue);

            // Search Filter (Name, Description, Tags)
            const matchSearch = (
                project.name.toLowerCase().includes(searchValue) ||
                (project.description || '').toLowerCase().includes(searchValue) ||
                (project.tags || []).some(tag => tag.toLowerCase().includes(searchValue))
            );

            return matchDept && matchTech && matchSearch;
        });

        renderProjects(filtered);
    }

    // Event Listeners for Filters
    if (deptFilter) deptFilter.addEventListener('change', filterProjects);
    if (techFilter) techFilter.addEventListener('change', filterProjects);
    if (searchInput) searchInput.addEventListener('input', filterProjects);

    function renderProjects(projects) {
        grid.innerHTML = '';
        if (projects.length === 0) {
            grid.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center;">No projects found matching your criteria.</p>';
            return;
        }

        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';

            // Build Tech Tags
            let tagsHtml = '';
            if (project.techStack) {
                tagsHtml = `<div class="card-tags">
                    ${project.techStack.slice(0, 3).map(t => `<span class="tech-tag">${t}</span>`).join('')}
                    ${project.techStack.length > 3 ? `<span class="tech-tag">+${project.techStack.length - 3}</span>` : ''}
                </div>`;
            }

            const icon = getProjectIcon(project.name);
            const statusText = project.status || 'Unknown';
            const statusColors = getStatusColor(statusText);

            card.innerHTML = `
                <div class="card-icon">${icon}</div>
                <div class="card-info">
                    <div class="card-title">${project.name}</div>
                    <div class="card-summary">${project.description || ''}</div>
                    ${tagsHtml}
                </div>
                <div class="card-status">
                    <span class="status-badge" style="background:${statusColors.bg}; color:${statusColors.text};">
                        ${statusText}
                    </span>
                </div>
                <div class="card-meta">
                    ${project.metadata?.department || 'General'}
                </div>
            `;

            card.addEventListener('click', () => showProjectDetail(project, icon));
            grid.appendChild(card);
        });
    }

    function showProjectDetail(project, icon) {
        // Save scroll position
        lastScrollPosition = contentArea.scrollTop;

        // Populate Detail View
        detailIcon.innerHTML = icon;
        detailTitle.textContent = project.name;

        // Status Styling
        detailStatus.textContent = project.status;
        const statusColors = getStatusColor(project.status);
        detailStatus.style.background = statusColors.bg;
        detailStatus.style.color = statusColors.text;

        detailDesc.textContent = project.description;

        // Render Metadata
        detailMeta.innerHTML = '';
        if (project.metadata) {
            Object.entries(project.metadata).forEach(([key, value]) => {
                const el = document.createElement('div');
                el.className = 'metadata-item';
                el.innerHTML = `
                    <span class="meta-label">${formatKey(key)}</span>
                    <span class="meta-value">${value}</span>
                `;
                detailMeta.appendChild(el);
            });
        }

        // Render Resources
        detailResources.innerHTML = '';
        if (project.resources && project.resources.length > 0) {
            project.resources.forEach(res => {
                const el = document.createElement('div');
                el.className = 'resource-row';

                let actionHtml = '';
                if (res.type === 'link' || res.type === 'git') {
                    actionHtml = `<a href="${res.value}" target="_blank" class="res-action-icon" title="Open"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
                } else {
                    actionHtml = `<button class="res-action-icon" style="border:none; background:transparent;" onclick="navigator.clipboard.writeText('${res.value}')" title="Copy"><i class="fa-regular fa-copy"></i></button>`;
                }

                el.innerHTML = `
                    <div class="res-left">
                        <div class="res-icon">${res.icon || '<i class="fa-solid fa-box"></i>'}</div>
                    </div>
                    <div class="res-name-col">
                        <span class="res-name">${res.name}</span>
                    </div>
                    <div class="res-value-col">
                        <span class="res-value" title="${res.value}">${res.value}</span>
                    </div>
                    ${actionHtml}
                `;
                detailResources.appendChild(el);
            });
        } else {
            detailResources.innerHTML = '<p class="text-muted">No resources linked.</p>';
        }

        // Switch View
        listView.classList.add('hidden');
        detailView.classList.remove('hidden');

        // Update Breadcrumb
        breadcrumb.innerHTML = `
            <span class="text-muted">Home</span>
            <span class="separator">/</span>
            <span class="text-muted" style="cursor:pointer;" onclick="document.getElementById('back-btn').click()">Projects Portal</span>
            <span class="separator">/</span>
            <span class="current">${project.name}</span>
        `;

        // Scroll to top
        document.querySelector('.content-area').scrollTop = 0;
    }

    function showProjectList() {
        detailView.classList.add('hidden');
        listView.classList.remove('hidden');

        // Reset Breadcrumb
        breadcrumb.innerHTML = originalBreadcrumbHTML;

        // Restore scroll position
        contentArea.scrollTop = lastScrollPosition;

        // Reset Filters if desired, or keep them?
        // Let's keep them purely client-side state for now.
        // But if we wanted to clear:
        // deptFilter.value = 'all'; 
        // techFilter.value = 'all';
        // searchInput.value = '';
        // filterProjects();
    }

    backBtn.addEventListener('click', showProjectList);

    // Helper: Simple Icon Picker
    function getProjectIcon(name) {
        if (name.includes('HR')) return '<i class="fa-solid fa-people-group"></i>';
        if (name.includes('Finance')) return '<i class="fa-solid fa-chart-pie"></i>';
        if (name.includes('Portal')) return '<i class="fa-solid fa-rocket"></i>';
        if (name.includes('App')) return '<i class="fa-solid fa-mobile-screen"></i>';
        return '<i class="fa-regular fa-folder-open"></i>'; // Default FontAwesome icon
    }

    function formatKey(key) {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    function getStatusColor(status) {
        switch (status?.toLowerCase()) {
            case 'active': return { bg: '#dcfce7', text: '#166534' }; // Green
            case 'maintenance': return { bg: '#ffedd5', text: '#9a3412' }; // Orange
            case 'in development': return { bg: '#e0f2fe', text: '#075985' }; // Blue
            default: return { bg: '#f1f5f9', text: '#475569' }; // Grey
        }
    }

    // ==========================================
    // ORGANIZATION CHART LOGIC
    // ==========================================
    const orgView = document.getElementById('org-view');
    const navOrg = document.getElementById('nav-org');
    const navDashboard = document.querySelector('.nav-item.active'); // Assuming first item is Dashboard

    let isOrgChartLoaded = false;
    let orgData = null;

    // Navigation
    if (navOrg) {
        navOrg.addEventListener('click', (e) => {
            e.preventDefault();
            showOrgView();
        });
    }

    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            showProjectList();
        });
    }

    function showOrgView() {
        listView.classList.add('hidden');
        detailView.classList.add('hidden');
        orgView.classList.remove('hidden');

        // Update Nav Active State
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navOrg.classList.add('active');

        // Update Breadcrumb
        breadcrumb.innerHTML = `
            <span class="text-muted">Home</span>
            <span class="separator">/</span>
            <span class="current">Organization Chart</span>
        `;

        // Initialize if not ready
        if (!isOrgChartLoaded) {
            initOrgChart();
        }
    }

    // Override showProjectList to hide Org View
    const originalShowProjectList = showProjectList;
    showProjectList = function () {
        detailView.classList.add('hidden');
        orgView.classList.add('hidden');
        listView.classList.remove('hidden');

        // Reset Breadcrumb
        breadcrumb.innerHTML = originalBreadcrumbHTML;
        contentArea.scrollTop = lastScrollPosition;

        // Update Nav
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (navDashboard) navDashboard.classList.add('active');
    };
    // Re-bind back button with new function
    backBtn.removeEventListener('click', showProjectList); // This won't work easily as anon func, but we'll overwrite
    backBtn.onclick = showProjectList;

    // Chart Variables
    let svg, mainGroup;
    let currentScale = 1, currentTranslateX = 0, currentTranslateY = 0;
    let isDragging = false, startX = 0, startY = 0;

    function initOrgChart() {
        svg = document.getElementById('chart-svg');
        const container = document.getElementById('chart-container');

        // Fetch Data
        fetch('data/org.json')
            .then(res => res.json())
            .then(data => {
                orgData = data;
                renderOrgChart(data);
                isOrgChartLoaded = true;
                fitToScreen();
            })
            .catch(err => console.error("Failed to load org chart:", err));

        // Event Listeners
        setupZoomPan(svg, container);
        setupToolbar();
    }

    function renderOrgChart(rawData) {
        svg.innerHTML = '';
        const nodes = {};
        let root = null;

        // Config
        const nodeRadius = 60;
        const levelSpacing = 160;
        const horizontalSpacing = 180;
        const verticalPadding = 100;

        // Process Data
        Object.entries(rawData).forEach(([name, info]) => {
            nodes[name] = {
                name,
                position: info.position || '',
                level: info.level,
                under: info.under,
                lineType: info.lineType,
                children: [],
                x: 0,
                y: 0
            };
        });

        // Build Tree
        Object.values(nodes).forEach(node => {
            if (node.under && nodes[node.under]) {
                nodes[node.under].children.push(node);
            } else if (node.level === 1) {
                root = node;
            }
        });

        if (!root) return;

        // Layout Calculations
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

        // Render SVG Elements
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
            circle.setAttribute("class", "node-circle");

            const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textName.setAttribute("x", node.x);
            textName.setAttribute("y", node.y - 8);
            textName.setAttribute("class", "node-name");
            textName.textContent = node.name;

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
                    if (child.lineType === 'dashed') lineClass += " line-dashed";
                    line.setAttribute("class", lineClass);
                    gLines.appendChild(line);
                    draw(child);
                });
            }
        }

        draw(root);
    }

    // Zoom & Pan Implementation
    function setupZoomPan(svgEl, container) {
        svgEl.addEventListener('wheel', handleWheel, { passive: false });
        svgEl.addEventListener('mousedown', startDrag);
        svgEl.addEventListener('mousemove', drag);
        svgEl.addEventListener('mouseup', endDrag);
        svgEl.addEventListener('mouseleave', endDrag);

        function handleWheel(e) {
            e.preventDefault();
            const zoomFactor = 1.1;
            const direction = e.deltaY > 0 ? -1 : 1;
            const factor = direction === 1 ? zoomFactor : 1 / zoomFactor;
            const newScale = Math.max(0.1, Math.min(currentScale * factor, 5));

            const rect = svgEl.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;

            // Zoom towards cursor logic
            currentTranslateX = cursorX - ((cursorX - currentTranslateX) / currentScale) * newScale;
            currentTranslateY = cursorY - ((cursorY - currentTranslateY) / currentScale) * newScale;
            currentScale = newScale;

            updateTransform();
        }

        function startDrag(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            svgEl.style.cursor = 'grabbing';
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
            svgEl.style.cursor = 'grab';
        }
    }

    function updateTransform() {
        if (mainGroup) {
            mainGroup.setAttribute('transform', `translate(${currentTranslateX}, ${currentTranslateY}) scale(${currentScale})`);
        }
    }

    function fitToScreen() {
        if (!mainGroup) return;
        const bbox = mainGroup.getBBox();
        const svgRect = svg.getBoundingClientRect();
        const padding = 50;

        const scaleX = (svgRect.width - padding * 2) / bbox.width;
        const scaleY = (svgRect.height - padding * 2) / bbox.height;
        currentScale = Math.min(scaleX, scaleY);
        if (currentScale > 1.2) currentScale = 1.2;

        const bboxCenterX = bbox.x + bbox.width / 2;
        const bboxCenterY = bbox.y + bbox.height / 2;
        const svgCenterX = svgRect.width / 2;
        const svgCenterY = svgRect.height / 2;

        currentTranslateX = svgCenterX - bboxCenterX * currentScale;
        currentTranslateY = svgCenterY - bboxCenterY * currentScale;

        updateTransform();
    }

    function setupToolbar() {
        document.getElementById('org-btn-reset').addEventListener('click', fitToScreen);

        // Search
        const searchInput = document.getElementById('org-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
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
            });
        }

        // Simple Download Logic (simplified from original)
        document.getElementById('org-btn-download').addEventListener('click', () => {
            alert('Download feature is not fully ported in this view yet.');
            // Full implementation requires cloning SVG, inlining styles, etc.
            // Can be added if user requests specifically.
        });
    }

});
