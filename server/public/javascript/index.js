document.addEventListener('DOMContentLoaded', () => {
    // 1. Sidebar Nav Active Link State based on current URL path
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname.toLowerCase();

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        const hrefPath = href.toLowerCase();

        if (currentPath === hrefPath || (hrefPath !== '/' && hrefPath !== '/home' && currentPath.startsWith(hrefPath))) {
            link.classList.add('active');
        } else if ((currentPath === '/' || currentPath === '/home') && hrefPath === '/home') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 2. Mobile Sidebar Drawer Toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const sidebarToggle = document.getElementById('sidebarToggle');

    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', openSidebar);
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', closeSidebar);
    }

    // 3. Signout confirmation
    const signoutBtn = document.getElementById('signout-button');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const confirmSignout = confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
            if (confirmSignout) {
                window.location.href = '/signout';
            }
        });
    }

    // 4. Keyboard shortcut '/' for search bar focus
    const searchInput = document.getElementById('globalSearch');
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            if (searchInput) searchInput.focus();
        }
    });
});
