function toggleTheme() {
    const root = document.documentElement;
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const nav = document.querySelector('nav');

    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        nav.classList.remove('light-mode');
    } else {
        body.classList.add('light-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        nav.classList.add('light-mode');
    }
}