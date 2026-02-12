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
    fetch('data.json')
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
});
