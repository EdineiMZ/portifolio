/* =========================================================
   Portfólio — Edinei Zanol
   Todas as bibliotecas externas são opcionais: se alguma CDN
   falhar, o site continua abrindo e funcionando.
   ========================================================= */
(() => {
    'use strict';
    window.__portfolioReady = true;

    // Three.js é importado sob demanda: se a CDN falhar, só o 3D some
    let threePromise = null;
    const loadThree = () => (threePromise ||= import('three'));

    const hasGSAP = typeof window.gsap !== 'undefined';
    const hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';
    const hasTilt = typeof window.VanillaTilt !== 'undefined';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = () => window.matchMedia('(min-width: 769px)').matches;

    const $ = (sel) => document.querySelector(sel);

    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ---------------------------------------------------------
       Armazenamento seguro (pode falhar em aba anônima)
       --------------------------------------------------------- */
    const storage = {
        get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
        set(key, val) { try { sessionStorage.setItem(key, val); } catch { /* sem storage */ } }
    };

    /* ---------------------------------------------------------
       ÁUDIO (só depois de um clique, regra dos navegadores)
       --------------------------------------------------------- */
    let audioCtx = null;
    let globalAudioPulse = 0; // sincroniza o 3D com os sons do boot

    function initAudio() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch { audioCtx = null; }
    }

    function beep({ type = 'square', from = 800, to = null, gain = 0.02, duration = 0.05, pulse = 0.5 }) {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(from, t);
        if (to) osc.frequency.exponentialRampToValueAtTime(to, t + duration * 0.6);
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + duration);
        globalAudioPulse = pulse;
    }

    const playTypingSound = () => beep({ from: 800 + Math.random() * 200 });
    const playSuccessSound = () => beep({ type: 'sine', from: 440, to: 880, gain: 0.05, duration: 0.5, pulse: 2 });

    /* ---------------------------------------------------------
       INTRO E BOOT
       --------------------------------------------------------- */
    const bootLines = [
        '> Inicializando kernel de visualização...',
        '> Carregando módulos: postgresql, nestjs, ia... OK',
        '> Estabelecendo ponte Web Audio API...',
        '> Acesso root autorizado.'
    ];

    const initScreen = $('#init-screen');
    const bootScreen = $('#boot-screen');
    const typewriter = $('#typewriter');
    const terminalContent = $('#terminal-content');
    const main = $('#main-content');

    let siteShown = false;
    let bootCancelled = false;

    function showSite({ animate = true } = {}) {
        if (siteShown) return;
        siteShown = true;
        bootCancelled = true;
        storage.set('boot-seen', '1');

        initScreen.style.display = 'none';
        bootScreen.style.display = 'none';
        document.body.classList.remove('is-locked');
        main.style.visibility = 'visible';

        if (hasGSAP && animate && !reducedMotion) {
            gsap.to(main, { opacity: 1, duration: 0.9 });
        } else {
            main.style.opacity = '1';
        }

        initGlobalWebGL();
        setupLabLazyLoad();
        initVideoEditor();
        initSiteAnimations();
    }

    function typeLine(lineIndex = 0, charIndex = 0) {
        if (bootCancelled) return;

        if (lineIndex >= bootLines.length) {
            setTimeout(() => {
                if (bootCancelled) return;
                if (hasGSAP) {
                    gsap.to(bootScreen, { opacity: 0, duration: 0.6, onComplete: () => showSite() });
                } else {
                    showSite();
                }
            }, 500);
            return;
        }

        const line = bootLines[lineIndex];
        if (charIndex < line.length) {
            typewriter.textContent += line.charAt(charIndex);
            if (charIndex % 2 === 0) playTypingSound();
            setTimeout(() => typeLine(lineIndex, charIndex + 1), Math.random() * 18 + 10);
            return;
        }

        const done = document.createElement('div');
        done.className = 'terminal-line';
        done.textContent = line;
        terminalContent.appendChild(done);
        typewriter.textContent = '';
        if (lineIndex === bootLines.length - 1) playSuccessSound();
        setTimeout(() => typeLine(lineIndex + 1, 0), 180);
    }

    $('#init-btn').addEventListener('click', () => {
        initAudio();
        initScreen.style.display = 'none';
        bootScreen.style.display = 'flex';
        typeLine();
    });

    $('#skip-btn').addEventListener('click', () => showSite({ animate: false }));
    $('#boot-skip').addEventListener('click', () => showSite({ animate: false }));

    // Quem já viu a intro nesta sessão ou prefere menos movimento entra direto
    if (storage.get('boot-seen') || reducedMotion) {
        showSite({ animate: false });
    } else {
        $('#init-btn').focus({ preventScroll: true });
    }

    /* ---------------------------------------------------------
       EASTER EGG — digite "sudo"
       --------------------------------------------------------- */
    const egg = $('#easter-egg-terminal');
    const secretCode = 'sudo';
    let keySequence = '';
    let lastFocus = null;

    function openEgg() {
        if (!egg.hidden) return;
        lastFocus = document.activeElement;
        egg.hidden = false;
        main.classList.add('glitch-active');
        setTimeout(() => main.classList.remove('glitch-active'), 900);
        beep({ type: 'sawtooth', from: 100, gain: 0.04, duration: 0.3, pulse: 1.5 });
        $('#egg-close').focus();
    }

    function closeEgg() {
        egg.hidden = true;
        main.classList.remove('glitch-active');
        if (lastFocus) lastFocus.focus({ preventScroll: true });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !egg.hidden) { closeEgg(); return; }
        if (!siteShown || e.key.length !== 1) return;
        keySequence = (keySequence + e.key.toLowerCase()).slice(-secretCode.length);
        if (keySequence === secretCode) openEgg();
    });

    $('#egg-close').addEventListener('click', closeEgg);
    $('#egg-hint').addEventListener('click', () => { initAudio(); openEgg(); });

    /* ---------------------------------------------------------
       FUNDO 3D GLOBAL
       --------------------------------------------------------- */
    async function initGlobalWebGL() {
        const canvas = $('#webgl-canvas');
        let THREE;
        try { THREE = await loadThree(); } catch { return; }

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
        } catch {
            canvas.style.display = 'none'; // sem WebGL: segue sem o fundo
            return;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

        const lowPower = !isDesktop();
        const geometry = new THREE.TorusKnotGeometry(10, 3, lowPower ? 48 : 70, lowPower ? 8 : 12);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true, transparent: true, opacity: 0.12 });
        const knot = new THREE.Mesh(geometry, material);
        scene.add(knot);

        // Movimento reduzido: um quadro parado e pronto
        if (reducedMotion) {
            knot.rotation.set(0.4, 0.6, 0);
            renderer.render(scene, camera);
            window.addEventListener('resize', debounce(() => {
                resizeRenderer(renderer, camera, window.innerWidth, window.innerHeight);
                renderer.render(scene, camera);
            }, 150));
            return;
        }

        let mouseX = 0, mouseY = 0;
        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
            mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
        }, { passive: true });

        const clock = new THREE.Clock();
        let frames = 0, lastTime = performance.now(), lowFpsCount = 0;
        let running = true;
        let rafId = null;

        function frame() {
            if (!running) return;
            rafId = requestAnimationFrame(frame);

            // Monitor de FPS: se a máquina sofrer, o fundo é desligado
            frames++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                lowFpsCount = frames < 20 ? lowFpsCount + 1 : 0;
                frames = 0; lastTime = now;
                if (lowFpsCount > 3) {
                    canvas.style.opacity = '0';
                    running = false;
                    cancelAnimationFrame(rafId);
                    return;
                }
            }

            const t = clock.getElapsedTime();
            knot.rotation.y = t * 0.15 + mouseX;
            knot.rotation.x = t * 0.1 + mouseY;

            const scale = 1 + globalAudioPulse;
            knot.scale.set(scale, scale, scale);
            globalAudioPulse *= 0.9;

            renderer.render(scene, camera);
        }
        frame();

        // Pausa quando a aba fica em segundo plano (evita falso alarme do monitor de FPS)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(rafId);
            } else if (running) {
                lastTime = performance.now(); frames = 0;
                clock.getDelta();
                frame();
            }
        });

        window.addEventListener('resize', debounce(() => {
            resizeRenderer(renderer, camera, window.innerWidth, window.innerHeight);
        }, 150));
    }

    /* ---------------------------------------------------------
       LAB 3D — só carrega o modelo (2,4 MB) quando aparece na tela
       --------------------------------------------------------- */
    function setupLabLazyLoad() {
        const wrapper = $('.lab-3d-wrapper');
        const status = $('#lab-status');
        if (!wrapper) return;

        let labPromise = null;
        let visible = false;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                visible = entry.isIntersecting;
                if (visible && !labPromise) {
                    labPromise = initLabWebGL(status).catch(() => {
                        status.textContent = 'não foi possível carregar o visualizador 3D';
                        return null;
                    });
                }
                if (labPromise) labPromise.then((lab) => lab && lab.setActive(visible));
            });
        }, { rootMargin: '200px 0px' });
        io.observe(wrapper);
    }

    async function initLabWebGL(status) {
        const container = $('#lab-canvas-container');
        const w = () => container.clientWidth;
        const h = () => container.clientHeight;

        status.textContent = 'carregando visualizador 3D...';
        const [THREE, { OrbitControls }, { GLTFLoader }, { KTX2Loader }, { MeshoptDecoder }] = await Promise.all([
            loadThree(),
            import('three/addons/controls/OrbitControls.js'),
            import('three/addons/loaders/GLTFLoader.js'),
            import('three/addons/loaders/KTX2Loader.js'),
            import('three/addons/libs/meshopt_decoder.module.js')
        ]);

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        } catch {
            status.textContent = 'seu navegador não suporta WebGL';
            return { setActive() {} };
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, w() / h(), 0.1, 100);
        camera.position.set(0, 0.6, 5);

        renderer.setSize(w(), h());
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enableZoom = false;
        controls.enablePan = false;

        // Intensidades no padrão de luz física do Three r155+
        scene.add(new THREE.HemisphereLight(0xffffff, 0x223333, 2.2));
        const key = new THREE.DirectionalLight(0xffffff, 2.4);
        key.position.set(3, 4, 5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x00ffcc, 2.0);
        rim.position.set(-4, 2, -3);
        scene.add(rim);

        // Placeholder enquanto o modelo carrega (ou se falhar)
        let object3D = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.5, 0),
            new THREE.MeshStandardMaterial({ color: 0x00ffcc, wireframe: true, emissive: 0x004422 })
        );
        scene.add(object3D);

        // O casa.glb vem comprimido (gltfpack): malha em meshopt e texturas em KTX2.
        // Sem esses decodificadores o modelo nunca carregava.
        const ktx2 = new KTX2Loader()
            .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/')
            .detectSupport(renderer);

        const loader = new GLTFLoader()
            .setMeshoptDecoder(MeshoptDecoder)
            .setKTX2Loader(ktx2);

        const onModel = (gltf) => {
            scene.remove(object3D);
            object3D = fitToView(THREE, gltf.scene, 2.8);
            scene.add(object3D);
            status.classList.add('is-hidden');
            if (!active) renderer.render(scene, camera);
        };
        const onFail = (err) => {
            console.warn('[lab] falha ao carregar casa.glb:', err);
            status.textContent = 'não foi possível carregar o modelo 3D';
        };

        status.textContent = 'carregando modelo 3D... 0%';
        if (location.protocol === 'file:') {
            // Aberto direto do computador: o navegador bloqueia o .glb,
            // então usamos a cópia embutida em js/casa-glb.js
            loadEmbeddedGlb()
                .then((buffer) => loader.parse(buffer, '', onModel, onFail))
                .catch(onFail);
        } else {
            loader.load(
                'casa.glb',
                onModel,
                (xhr) => {
                    if (xhr.total) status.textContent = `carregando modelo 3D... ${Math.round((xhr.loaded / xhr.total) * 100)}%`;
                },
                onFail
            );
        }

        let active = false;
        let rafId = null;

        function frame() {
            if (!active) return;
            rafId = requestAnimationFrame(frame);
            if (object3D && !reducedMotion) object3D.rotation.y += 0.005;
            controls.update();
            renderer.render(scene, camera);
        }

        window.addEventListener('resize', debounce(() => {
            resizeRenderer(renderer, camera, w(), h());
            if (!active) renderer.render(scene, camera);
        }, 150));

        return {
            // Só renderiza enquanto o lab está visível: economiza bateria e GPU
            setActive(isVisible) {
                if (isVisible === active) return;
                active = isVisible;
                if (active) frame(); else cancelAnimationFrame(rafId);
            }
        };
    }

    function loadEmbeddedGlb() {
        return new Promise((resolve, reject) => {
            const done = () => {
                const b64 = window.__CASA_GLB_B64;
                if (!b64) return reject(new Error('casa-glb.js vazio'));
                const bin = atob(b64);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                resolve(bytes.buffer);
            };
            if (window.__CASA_GLB_B64) return done();
            const s = document.createElement('script');
            s.src = 'js/casa-glb.js';
            s.onload = done;
            s.onerror = () => reject(new Error('não carregou js/casa-glb.js'));
            document.head.appendChild(s);
        });
    }

    // Escala e centraliza qualquer modelo para caber na cena,
    // não importa o tamanho com que ele foi exportado
    function fitToView(THREE, object, targetSize) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = targetSize / maxDim;
        object.scale.setScalar(scale);

        const centered = new THREE.Box3().setFromObject(object);
        const center = centered.getCenter(new THREE.Vector3());
        object.position.sub(center);

        const pivot = new THREE.Group(); // gira em torno do centro do modelo
        pivot.add(object);
        return pivot;
    }

    /* ---------------------------------------------------------
       MINI EDITOR DE VÍDEO
       Uma "sequência" de 12s: cortes no V1, títulos no V2 e
       a trilha no A1, com os cortes caindo nas batidas.
       --------------------------------------------------------- */
    function initVideoEditor() {
        const root = $('#editor');
        if (!root) return;

        const DURATION = 12;
        const FPS = 24;

        // "Imagem" de cada clipe, desenhada em SVG (160x90 = 16:9)
        const svg = (inner) => `<svg class="monitor-art" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${inner}</svg>`;
        const art = {
            abertura: svg(`
                <circle cx="80" cy="45" r="30" fill="none" stroke="#00ffcc" stroke-opacity=".25"/>
                <circle cx="80" cy="45" r="19" fill="none" stroke="#00ffcc" stroke-opacity=".5"/>
                <text x="80" y="51" text-anchor="middle" font-family="monospace" font-weight="700" font-size="17" fill="#00ffcc">&gt;_</text>`),
            cidade: svg(`
                <circle cx="118" cy="34" r="13" fill="#ffd166" fill-opacity=".85"/>
                <path fill="#1b0a2a" d="M0 90V62h10V50h9v12h7V40h11v22h6V55h8v35zM49 90V46h12v-8h8v8h7v44zM76 90V58h9V44h13v14h6v32zM104 90V52h8v-9h10v9h8v38zM130 90V60h9V48h12v12h9v30z"/>
                <g fill="#ffd166" fill-opacity=".7">
                    <rect x="52" y="52" width="2" height="2"/><rect x="57" y="58" width="2" height="2"/><rect x="88" y="50" width="2" height="2"/>
                    <rect x="92" y="62" width="2" height="2"/><rect x="115" y="56" width="2" height="2"/><rect x="141" y="64" width="2" height="2"/>
                </g>`),
            entrevista: svg(`
                <circle cx="30" cy="25" r="10" fill="#ffd9a0" fill-opacity=".12"/>
                <circle cx="135" cy="20" r="14" fill="#ffd9a0" fill-opacity=".1"/>
                <circle cx="120" cy="65" r="8" fill="#ffd9a0" fill-opacity=".08"/>
                <circle cx="80" cy="36" r="13" fill="#1a110b"/>
                <path d="M52 90c2-20 13-30 28-30s26 10 28 30z" fill="#1a110b"/>
                <rect x="10" y="66" width="62" height="14" fill="#000" fill-opacity=".55"/>
                <rect x="10" y="66" width="2" height="14" fill="#00ffcc"/>
                <text x="16" y="72" font-family="sans-serif" font-weight="700" font-size="5" fill="#fff">Edinei Zanol</text>
                <text x="16" y="77.5" font-family="monospace" font-size="3.6" fill="#00ffcc">dev full stack</text>`),
            produto: svg(`
                <rect x="38" y="16" width="84" height="50" rx="3" fill="#050607" stroke="#00ffcc" stroke-opacity=".7"/>
                <path d="M30 66h100l-6 7H36z" fill="#0d1416" stroke="#00ffcc" stroke-opacity=".5"/>
                <rect x="44" y="22" width="22" height="3" fill="#00ffcc" fill-opacity=".8"/>
                <g fill="#00ffcc" fill-opacity=".55">
                    <rect x="46" y="48" width="6" height="12"/><rect x="55" y="42" width="6" height="18"/>
                    <rect x="64" y="45" width="6" height="15"/><rect x="73" y="36" width="6" height="24"/>
                </g>
                <polyline points="86,56 94,48 102,51 110,38 116,40" fill="none" stroke="#ffb454" stroke-width="1.4"/>`),
            encerramento: svg(`
                <g stroke="#a855f7" stroke-opacity=".25">
                    <path d="M0 70h160M0 78h160M0 86h160"/>
                    <path d="M80 62L20 90M80 62L60 90M80 62l20 28M80 62l60 28"/>
                </g>
                <text x="80" y="40" text-anchor="middle" font-family="monospace" font-size="7" fill="#c59bff">&gt; fim_da_sequencia</text>`)
        };
        const sequence = {
            v1: [
                { start: 0, end: 2.4, label: 'abertura', color: '#6fd3ff', art: 'abertura',
                  scene: 'radial-gradient(circle at 30% 40%, #0b6b63 0%, #031b1a 55%, #000 100%)' },
                { start: 2.4, end: 4.8, label: 'b-roll cidade', color: '#ffb454', art: 'cidade',
                  scene: 'linear-gradient(160deg, #ff8a3d 0%, #8a2d6b 55%, #1b0a2a 100%)' },
                { start: 4.8, end: 7.2, label: 'entrevista', color: '#9be37a', art: 'entrevista',
                  scene: 'radial-gradient(circle at 65% 35%, #d9a066 0%, #5a3a24 45%, #120c08 100%)' },
                { start: 7.2, end: 9.6, label: 'produto', color: '#6fd3ff', art: 'produto',
                  scene: 'repeating-linear-gradient(90deg, rgba(0,255,204,.18) 0 1px, transparent 1px 22px), radial-gradient(circle at 50% 60%, #00ffcc33, #000 70%)' },
                { start: 9.6, end: 12, label: 'encerramento', color: '#c59bff', art: 'encerramento',
                  scene: 'linear-gradient(180deg, #0a0b0d 0%, #1a1030 100%)' }
            ],
            v2: [
                { start: 0.3, end: 2.2, label: 'título', text: 'Edinei Zanol', color: '#c59bff' },
                { start: 7.6, end: 9.4, label: 'legenda', text: 'Corte no ritmo da trilha', color: '#c59bff' },
                { start: 9.8, end: 11.8, label: 'título', text: 'Valeu por assistir', color: '#c59bff' }
            ]
        };
        const cuts = sequence.v1.slice(1).map((c) => c.start);

        const timeline = $('#editor-timeline');
        const playhead = $('#editor-playhead');
        const scene = $('#monitor-scene');
        const title = $('#monitor-title');
        const tc = $('#monitor-tc');
        const clipName = $('#editor-clip-name');
        const playBtn = $('#editor-play');
        const lanes = {};
        timeline.querySelectorAll('.track').forEach((t) => { lanes[t.dataset.track] = t.querySelector('.track-lane'); });

        // Desenha os clipes nas trilhas
        const clipEls = { v1: [], v2: [] };
        ['v1', 'v2'].forEach((track) => {
            sequence[track].forEach((clip) => {
                const el = document.createElement('div');
                el.className = 'clip';
                el.style.left = (clip.start / DURATION) * 100 + '%';
                el.style.width = ((clip.end - clip.start) / DURATION) * 100 + '%';
                el.style.background = clip.color;
                el.textContent = clip.label;
                lanes[track].appendChild(el);
                clipEls[track].push(el);
            });
        });

        // Forma de onda: picos nas batidas, que coincidem com os cortes
        const BARS = 96;
        const bars = [];
        for (let i = 0; i < BARS; i++) {
            const t = (i / BARS) * DURATION;
            const nearBeat = cuts.some((c) => Math.abs(c - t) < DURATION / BARS);
            const amp = nearBeat ? 0.95 : 0.25 + 0.35 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37));
            const bar = document.createElement('span');
            bar.style.height = Math.round(amp * 100) + '%';
            if (nearBeat) bar.classList.add('is-beat');
            lanes.a1.appendChild(bar);
            bars.push(bar);
        }

        let time = reducedMotion ? 5.6 : 0;
        let playing = !reducedMotion;
        let visible = false;
        let lastClip = -1;
        let last = performance.now();
        let rafId = null;

        const fmt = (n) => String(n).padStart(2, '0');
        function timecode(t) {
            const s = Math.floor(t);
            const f = Math.floor((t - s) * FPS);
            return `00:00:${fmt(s)}:${fmt(f)}`;
        }

        function render() {
            // Playhead alinhado com a área das trilhas (sem o rótulo V1/V2/A1)
            const laneRect = lanes.v1.getBoundingClientRect();
            const tlRect = timeline.getBoundingClientRect();
            playhead.style.left = (laneRect.left - tlRect.left + (time / DURATION) * laneRect.width) + 'px';

            const i = sequence.v1.findIndex((c) => time >= c.start && time < c.end);
            if (i !== lastClip && i >= 0) {
                scene.style.background = sequence.v1[i].scene;
                scene.innerHTML = art[sequence.v1[i].art] || '';
                clipName.textContent = sequence.v1[i].label;
                clipEls.v1.forEach((el, k) => el.classList.toggle('is-current', k === i));
                if (lastClip !== -1 && playing) {
                    scene.classList.remove('is-cut'); void scene.offsetWidth; scene.classList.add('is-cut');
                }
                lastClip = i;
            }

            const ti = sequence.v2.findIndex((c) => time >= c.start && time < c.end);
            clipEls.v2.forEach((el, k) => el.classList.toggle('is-current', k === ti));
            if (ti >= 0) {
                title.textContent = sequence.v2[ti].text;
                title.classList.remove('is-hidden');
            } else {
                title.classList.add('is-hidden');
            }

            const passed = Math.floor((time / DURATION) * BARS);
            bars.forEach((b, k) => b.classList.toggle('is-past', k < passed));

            tc.textContent = timecode(time);
            timeline.setAttribute('aria-valuenow', time.toFixed(1));
        }

        function tick(now) {
            rafId = null;
            const dt = Math.min((now - last) / 1000, 0.1);
            last = now;
            if (playing) time = (time + dt) % DURATION;
            render();
            if (playing && visible) rafId = requestAnimationFrame(tick);
        }

        function start() {
            if (rafId === null && playing && visible) {
                last = performance.now();
                rafId = requestAnimationFrame(tick);
            }
        }

        function setPlaying(p) {
            playing = p;
            playBtn.innerHTML = p ? '<i class="fas fa-pause" aria-hidden="true"></i>' : '<i class="fas fa-play" aria-hidden="true"></i>';
            playBtn.setAttribute('aria-label', p ? 'Pausar' : 'Reproduzir');
            if (p) start();
        }

        function seekFromPointer(clientX) {
            const r = lanes.v1.getBoundingClientRect();
            const frac = Math.min(Math.max((clientX - r.left) / r.width, 0), 0.9999);
            time = frac * DURATION;
            render();
        }

        playBtn.addEventListener('click', () => setPlaying(!playing));

        let dragging = false;
        let wasPlaying = false;
        timeline.addEventListener('pointerdown', (e) => {
            dragging = true;
            wasPlaying = playing;
            playing = false;
            timeline.setPointerCapture(e.pointerId);
            seekFromPointer(e.clientX);
        });
        timeline.addEventListener('pointermove', (e) => { if (dragging) seekFromPointer(e.clientX); });
        const endDrag = () => {
            if (!dragging) return;
            dragging = false;
            setPlaying(wasPlaying);
        };
        timeline.addEventListener('pointerup', endDrag);
        timeline.addEventListener('pointercancel', endDrag);

        timeline.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                time = (time + (e.key === 'ArrowRight' ? 0.5 : -0.5) + DURATION) % DURATION;
                render();
            } else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setPlaying(!playing);
            }
        });

        // Só anima enquanto o editor está na tela
        new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
            if (visible) start();
        }, { threshold: 0.2 }).observe(root);

        window.addEventListener('resize', debounce(render, 100));
        setPlaying(playing);
        render();
    }

    /* ---------------------------------------------------------
       ANIMAÇÕES DE ROLAGEM
       --------------------------------------------------------- */
    function initSiteAnimations() {
        if (!hasGSAP || reducedMotion) {
            if (hasTilt && isDesktop() && !reducedMotion) initTilt();
            return;
        }

        // fromTo com valores finais explícitos: o "from" puro travava o hero invisível
        gsap.fromTo('.hero-content',
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.2, ease: 'power4.out', clearProps: 'opacity' });

        if (!hasScrollTrigger) return;
        gsap.registerPlugin(ScrollTrigger);

        const mm = gsap.matchMedia();

        mm.add('(min-width: 769px)', () => {
            const container = $('.projects-container');
            const distance = () => Math.max(0, container.scrollWidth - window.innerWidth);

            gsap.to(container, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: {
                    trigger: '.projects-wrapper',
                    start: 'top top',
                    end: () => '+=' + distance(),
                    pin: true,
                    scrub: 1,
                    invalidateOnRefresh: true
                }
            });

            if (hasTilt) initTilt();

            return () => {
                document.querySelectorAll('[data-tilt]').forEach((el) => el.vanillaTilt && el.vanillaTilt.destroy());
            };
        });

        // Recalcula quando imagens e fontes terminam de carregar
        window.addEventListener('load', () => ScrollTrigger.refresh());
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    function initTilt() {
        VanillaTilt.init(document.querySelectorAll('[data-tilt]'), {
            max: 6, speed: 400, glare: true, 'max-glare': 0.08
        });
    }

    /* ---------------------------------------------------------
       UTILITÁRIOS
       --------------------------------------------------------- */
    function resizeRenderer(renderer, camera, width, height) {
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function debounce(fn, wait) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
    }
})();
