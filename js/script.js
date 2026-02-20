const loadingLogs = [
    '[boot] Inicializando apresentação premium...',
    '[scan] Mapeando stack principal: Python, JS, React, Node...',
    '[secure] Aplicando defaults seguros para navegação...',
    '[perf] Otimizando renderização e transições...',
    '[ui] Ativando animações responsivas...',
    '[done] Bem-vindo ao portfólio de Edinei Miguel Zanol.'
];

function toggleTheme() {
    const body = document.body;
    const nav = document.getElementById('top-nav');
    const themeIcon = document.getElementById('theme-icon');

    body.classList.toggle('light-mode');
    nav.classList.toggle('light-mode');

    const isLightMode = body.classList.contains('light-mode');
    themeIcon.classList.toggle('fa-sun', isLightMode);
    themeIcon.classList.toggle('fa-moon', !isLightMode);

    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
}

function runTerminalIntro() {
    const intro = document.getElementById('terminal-intro');
    const terminalBody = document.getElementById('terminal-body');
    if (!intro || !terminalBody) return;

    let index = 0;
    const writeLog = () => {
        if (index < loadingLogs.length) {
            terminalBody.innerHTML += `<div>> ${loadingLogs[index]}</div>`;
            terminalBody.scrollTop = terminalBody.scrollHeight;
            index += 1;
            setTimeout(writeLog, 450);
            return;
        }

        setTimeout(() => intro.classList.add('hide'), 700);
    };

    writeLog();
}

function initRevealOnScroll() {
    const revealItems = document.querySelectorAll('.reveal-on-scroll');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.14 });

    revealItems.forEach((item) => observer.observe(item));
}

function applyStoredTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const nav = document.getElementById('top-nav');
    const themeIcon = document.getElementById('theme-icon');

    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        nav.classList.add('light-mode');
        themeIcon.classList.add('fa-sun');
        themeIcon.classList.remove('fa-moon');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyStoredTheme();
    initRevealOnScroll();
    runTerminalIntro();
});
