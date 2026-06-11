// Innobridge Client Dashboard - JavaScript

// Global state
let sidebarCollapsed = false;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const mainContent = document.querySelector('.main-content');
const projectChart = document.getElementById('projectChart');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    initializeChart();
    initializeInteractions();
    checkResponsive();
});

// Sidebar functionality
function initializeSidebar() {
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }
    
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', closeSidebar);
    }
    
    // Close sidebar on mobile when clicking nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });
}

function toggleSidebar() {
    if (sidebar.classList.contains('show')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

function openSidebar() {
    sidebar.classList.add('show');
    sidebarBackdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    sidebar.classList.remove('show');
    sidebarBackdrop.classList.remove('show');
    document.body.style.overflow = '';
}

// Chart functionality
function initializeChart() {
    if (!projectChart) return;
    
    const chartData = [
        { month: 'Jan', submitted: 8, completed: 6 },
        { month: 'Feb', submitted: 12, completed: 8 },
        { month: 'Mar', submitted: 15, completed: 12 },
        { month: 'Apr', submitted: 10, completed: 9 },
        { month: 'May', submitted: 18, completed: 14 },
        { month: 'Jun', submitted: 22, completed: 18 }
    ];
    
    const maxValue = Math.max(...chartData.flatMap(d => [d.submitted, d.completed]));
    
    chartData.forEach((data, index) => {
        const barGroup = document.createElement('div');
        barGroup.className = 'chart-bar-group';
        
        // Calculate heights as percentages
        const submittedHeight = (data.submitted / maxValue) * 100;
        const completedHeight = (data.completed / maxValue) * 100;
        
        barGroup.innerHTML = `
            <div class="chart-bar submitted" style="height: ${submittedHeight}%" data-value="${data.submitted}"></div>
            <div class="chart-bar completed" style="height: ${completedHeight}%" data-value="${data.completed}"></div>
            <div class="chart-label">${data.month}</div>
        `;
        
        projectChart.appendChild(barGroup);
        
        // Add hover tooltips
        const bars = barGroup.querySelectorAll('.chart-bar');
        bars.forEach(bar => {
            bar.addEventListener('mouseenter', createTooltip);
            bar.addEventListener('mouseleave', removeTooltip);
        });
    });
    
    // Add Y-axis labels
    const yAxis = document.createElement('div');
    yAxis.style.position = 'absolute';
    yAxis.style.left = '0';
    yAxis.style.top = '0';
    yAxis.style.height = '100%';
    yAxis.style.display = 'flex';
    yAxis.style.flexDirection = 'column';
    yAxis.style.justifyContent = 'space-between';
    yAxis.style.fontSize = '12px';
    yAxis.style.color = 'var(--muted-foreground)';
    yAxis.style.marginLeft = '-32px';
    
    for (let i = 0; i <= 4; i++) {
        const label = document.createElement('span');
        label.textContent = Math.floor(maxValue * (1 - i * 0.25));
        yAxis.appendChild(label);
    }
    
    projectChart.appendChild(yAxis);
}

function createTooltip(event) {
    const bar = event.target;
    const value = bar.dataset.value;
    const type = bar.classList.contains('submitted') ? 'submitted' : 'completed';
    
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.bottom = '100%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.background = '#374151';
    tooltip.style.color = 'white';
    tooltip.style.padding = '4px 8px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.zIndex = '1000';
    tooltip.style.marginBottom = '8px';
    tooltip.textContent = `${value} ${type}`;
    
    bar.style.position = 'relative';
    bar.appendChild(tooltip);
}

function removeTooltip(event) {
    const tooltip = event.target.querySelector('.chart-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// Interactive elements
function initializeInteractions() {
    // Notification button
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            showToast('You have 3 new notifications!', 'info');
        });
    }
    
    // Post project button
    const postProjectBtn = document.querySelector('.post-project-btn');
    if (postProjectBtn) {
        postProjectBtn.addEventListener('click', () => {
            window.location.href = 'post-project.html';
        });
    }
    
    // Contact buttons
    const contactBtns = document.querySelectorAll('.contact-btn');
    contactBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const freelancerName = btn.closest('.freelancer-item').querySelector('.freelancer-name').textContent;
            showToast(`Opening chat with ${freelancerName}...`, 'success');
            setTimeout(() => {
                window.location.href = 'messages.html';
            }, 1000);
        });
    });
    
    // View all buttons
    const viewAllBtns = document.querySelectorAll('.view-all-btn');
    viewAllBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Feature coming soon!', 'info');
        });
    });
    
    // Action buttons
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Opening project details...', 'info');
        });
    });
    
    // Stats cards hover animation
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
    
    // Animate stats on page load
    animateStats();
}

// Animate statistics counters
function animateStats() {
    const statValues = document.querySelectorAll('.stat-value');
    
    statValues.forEach(stat => {
        const target = parseInt(stat.textContent);
        let current = 0;
        const increment = target / 30; // Animate over 30 frames
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                stat.textContent = target;
                clearInterval(timer);
            } else {
                stat.textContent = Math.floor(current);
            }
        }, 50);
    });
}

// Toast notification system
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.background = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0d9488';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '10000';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'transform 0.3s ease';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// Search functionality
function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length > 0) {
                showToast(`Searching for: ${query}`, 'info');
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value;
                if (query.trim()) {
                    showToast(`Search results for: ${query}`, 'success');
                }
            }
        });
    }
}

// Responsive handling
function checkResponsive() {
    function handleResize() {
        if (window.innerWidth > 1024) {
            closeSidebar();
            sidebar.classList.remove('show');
            sidebarBackdrop.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Check on initial load
}

// Smooth scroll to sections
function smoothScrollTo(element) {
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// Loading states for buttons
function setButtonLoading(button, loading = true) {
    if (loading) {
        button.disabled = true;
        button.style.opacity = '0.7';
        button.style.cursor = 'not-allowed';
    } else {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }
}

// Form validation helpers
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return re.test(phone);
}

// Local storage helpers
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
        return false;
    }
}

function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
        return null;
    }
}

// Initialize search when DOM is ready
document.addEventListener('DOMContentLoaded', initializeSearch);

// Export functions for use in other pages
window.InnobridgeDashboard = {
    showToast,
    setButtonLoading,
    validateEmail,
    validatePhone,
    saveToStorage,
    loadFromStorage,
    smoothScrollTo
};