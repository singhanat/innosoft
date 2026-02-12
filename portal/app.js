document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('project-grid');
    const modal = document.getElementById('project-modal');
    const closeModalBtn = document.querySelector('.close-modal-btn');

    // Modal elements
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalStatus = document.getElementById('modal-status');
    const modalDesc = document.getElementById('modal-description');
    const modalMeta = document.getElementById('modal-metadata');
    const modalResources = document.getElementById('modal-resources');

    // Fetch Data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            renderProjects(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            grid.innerHTML = '<p class="error-msg">Failed to load project data.</p>';
        });

    function renderProjects(projects) {
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';

            const icon = getProjectIcon(project.name);

            card.innerHTML = `
                <div class="card-icon">${icon}</div>
                <div class="card-title">${project.name}</div>
                <div class="card-summary">${project.description || ''}</div>
                <div style="margin-top:auto; font-size:0.8rem; color: #64748b; font-weight:500;">
                    ${project.metadata?.department || 'General'}
                </div>
            `;

            card.addEventListener('click', () => openModal(project, icon));
            grid.appendChild(card);
        });
    }

    function openModal(project, icon) {
        modalIcon.innerHTML = icon;
        modalTitle.textContent = project.name;

        // Status Styling
        modalStatus.textContent = project.status;
        modalStatus.style.background = getStatusColor(project.status).bg;
        modalStatus.style.color = getStatusColor(project.status).text;

        modalDesc.textContent = project.description;

        // Render Metadata
        modalMeta.innerHTML = '';
        if (project.metadata) {
            Object.entries(project.metadata).forEach(([key, value]) => {
                const el = document.createElement('div');
                el.className = 'metadata-item';
                el.innerHTML = `
                    <span class="meta-label">${formatKey(key)}</span>
                    <span class="meta-value">${value}</span>
                `;
                modalMeta.appendChild(el);
            });
        }

        // Render Resources
        modalResources.innerHTML = '';
        if (project.resources && project.resources.length > 0) {
            project.resources.forEach(res => {
                const el = document.createElement('div');
                el.className = 'resource-card';

                let actionHtml = '';
                if (res.type === 'link' || res.type === 'git') {
                    actionHtml = `<a href="${res.value}" target="_blank" class="res-action">OPEN <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
                } else {
                    actionHtml = `<button class="res-action" onclick="navigator.clipboard.writeText('${res.value}')">COPY <i class="fa-regular fa-copy"></i></button>`;
                }

                el.innerHTML = `
                    <div class="res-left">
                        <div class="res-icon">${res.icon || '📦'}</div>
                        <div class="res-info">
                            <span class="res-name">${res.name}</span>
                            <span class="res-value">${res.value}</span>
                        </div>
                    </div>
                    ${actionHtml}
                `;
                modalResources.appendChild(el);
            });
        } else {
            modalResources.innerHTML = '<p class="text-muted">No resources linked.</p>';
        }

        // Show Modal
        modal.classList.remove('hidden');
        // Small delay to allow display block to apply before opacity transition
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }

    function hideModal() {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 200);
    }

    closeModalBtn.addEventListener('click', hideModal);

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });

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
