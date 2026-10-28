
'use strict';

(function () {

 

  const W = 900, H = 560;

  // Ajusta aquí la dificultad global (más vidas = más fácil, metas más bajas = más fácil).
  const CONFIG = {
    lives: 3,
    invulnerability: 1.4,   // segundos de protección tras recibir un golpe
    startGrace: 1.2         // protección al empezar cada nivel
  };

  /* Los datos curiosos son generales y verificables. Se recomienda añadir
     datos propios del Bioparque Monarca (de sus redes oficiales) en cada lista. */
  const LEVELS = [
    {
      id: 'mariposario', emoji: '🦋', name: 'Mariposario', subtitle: 'Clima frío',
      duration: 60, goal: 30, goalLabel: 'néctar',
      mission: 'Eres una mariposa monarca dentro del mariposario. Recoge flores para obtener néctar y llega a la meta antes de que acabe el tiempo.',
      dangers: '💨 ráfagas de viento frío y 💧 gotas de lluvia. Cada vez llegan más rápido.',
      facts: [
        { id: 'm1', emoji: '🐛', title: 'Metamorfosis completa',
          text: 'Las mariposas pasan por cuatro etapas: huevo, oruga, crisálida y adulta. Este cambio total de forma se llama metamorfosis completa.' },
        { id: 'm2', emoji: '☀️', title: 'Energía del sol',
          text: 'Las mariposas no producen su propio calor. Necesitan el sol para calentar sus músculos y poder volar; por eso un mariposario cuida muy bien la luz y la temperatura.' },
        { id: 'm3', emoji: '🌿', title: 'Colores de advertencia',
          text: 'Las orugas monarca comen plantas del género Asclepias (algodoncillo). Esas plantas las vuelven tóxicas para muchos depredadores, y su naranja y negro funciona como una alerta.' }
      ]
    },
    {
      id: 'bosque', emoji: '🌳', name: 'Bosque Encantado', subtitle: 'Bosque andino',
      duration: 70, goal: 20, goalLabel: 'semillas',
      mission: 'Eres una luz del bosque. Recoge semillas para sembrar nuevos árboles. Tu luz se hace más pequeña con el paso del tiempo.',
      dangers: '🛍️ basura que flota en la oscuridad. Aparece más y se mueve más rápido.',
      facts: [
        { id: 'b1', emoji: '💧', title: 'Fábrica de agua',
          text: 'Los bosques andinos capturan agua de la lluvia y la neblina y la liberan poco a poco. Así ayudan a que quebradas y ríos no se sequen.' },
        { id: 'b2', emoji: '🍄', title: 'Red bajo la tierra',
          text: 'Bajo el suelo, los hongos se conectan con las raíces de los árboles e intercambian nutrientes. Una semilla sola no crece: necesita a toda su comunidad.' },
        { id: 'b3', emoji: '♻️', title: 'Plástico que se queda',
          text: 'Una bolsa plástica puede tardar cientos de años en degradarse y puede dañar a los animales que la confunden con comida. Reducir y reciclar es cuidar el bosque.' }
      ]
    },
    {
      id: 'abejas', emoji: '🐝', name: 'Colonia de abejas', subtitle: 'Polinizadoras',
      duration: 75, goal: 24, goalLabel: 'polen',
      mission: 'Eres una abeja obrera. Toca las flores para cargar polen (máximo 3) y llévalo a la colmena 🍯 para entregarlo.',
      dangers: '☁️ nubes verdes de agroquímicos y 🐦 aves cazadoras (aparece un ❗ antes de cada ataque).',
      facts: [
        { id: 'a1', emoji: '👑', title: 'Trabajo en equipo',
          text: 'Las abejas obreras son hembras. En cada colmena hay una sola reina y miles de obreras que se reparten el trabajo: limpiar, cuidar crías, buscar néctar y defender.' },
        { id: 'a2', emoji: '💃', title: 'La danza del meneo',
          text: 'Cuando una abeja de la miel encuentra flores, avisa a sus compañeras con un baile. El ángulo y la duración del movimiento indican la dirección y la distancia.' },
        { id: 'a3', emoji: '🍎', title: 'Sin abejas, menos comida',
          text: 'Muchas frutas y verduras dependen, en parte, de polinizadores como las abejas. Cuidarlas y evitar los agroquímicos protege lo que llega a nuestra mesa.' }
      ]
    }
  ];

  const ALL_FACTS = LEVELS.flatMap(L => L.facts.map(f => ({ ...f, station: L.name })));

  /* ---------- 2. UTILIDADES, ALMACENAMIENTO Y ENTRADA ---------- */

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const pauseBtn = document.getElementById('pauseBtn');
  const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  // Resolución nítida en pantallas de alta densidad (teléfonos)
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const TEXT_FONT = '"Fredoka","Trebuchet MS","Segoe UI",sans-serif';

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Progreso guardado (álbum de datos y estrellas) en el navegador.
  const STORE_KEY = 'bioparque-monarca-v1';
  let store = { album: {}, stars: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && saved.album && saved.stars) store = saved;
  } catch (e) { /* sin almacenamiento: el juego funciona igual */ }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignorar */ }
  }

  const keys = {};
  let target = null; // destino del mouse / dedo

  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    keys[k] = true;
    if (k === 'p') { state === 'playing' ? pause() : (state === 'paused' ? resume() : null); }
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  // Joystick virtual flotante: aparece donde pones el dedo, así el pulgar no tapa al personaje.
  const JOY_R = 70;
  let joy = null;

  canvas.addEventListener('pointerdown', e => {
    const pt = toCanvas(e);
    if (e.pointerType === 'mouse') { target = pt; return; }
    if (state !== 'playing' || joy) return;
    joy = { id: e.pointerId, ox: pt.x, oy: pt.y, x: pt.x, y: pt.y };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', e => {
    const pt = toCanvas(e);
    if (e.pointerType === 'mouse') { target = pt; return; }
    if (joy && e.pointerId === joy.id) { joy.x = pt.x; joy.y = pt.y; }
  });
  function endTouch(e) { if (joy && e.pointerId === joy.id) joy = null; }
  canvas.addEventListener('pointerup', endTouch);
  canvas.addEventListener('pointercancel', endTouch);
  // Evita el zoom por gestos y el menú contextual en iOS/Android
  document.addEventListener('gesturestart', e => e.preventDefault());
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  function movePlayer(g, dt, speed, minX, maxX, minY, maxY) {
    const p = g.p;
    let dx = 0, dy = 0, mag = 1;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (dx || dy) {
      target = null;
      const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    } else if (joy) {
      const vx = joy.x - joy.ox, vy = joy.y - joy.oy, d = Math.hypot(vx, vy);
      if (d > JOY_R) { // la base sigue al dedo si te alejas
        joy.ox += vx / d * (d - JOY_R); joy.oy += vy / d * (d - JOY_R);
      }
      if (d > 8) { dx = vx / d; dy = vy / d; mag = Math.min(1, d / JOY_R); }
    } else if (target) {
      const vx = target.x - p.x, vy = target.y - p.y, d = Math.hypot(vx, vy);
      if (d > 4) { dx = vx / d; dy = vy / d; mag = Math.min(1, d / 50); }
    }
    p.x = clamp(p.x + dx * speed * mag * dt, minX, maxX);
    p.y = clamp(p.y + dy * speed * mag * dt, minY, maxY);
  }

  /* ---------- Dibujo: utilidades ---------- */

  function emoji(e, x, y, size, alpha = 1, rot = 0, flip = false) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (flip) ctx.scale(-1, 1);
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e, 0, 0);
    ctx.restore();
  }

  function glow(x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function text(str, x, y, size, color, align = 'left', weight = '600') {
    ctx.font = `${weight} ${size}px ${TEXT_FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  // Mariposa monarca dibujada con formas (vista desde arriba, mirando a la derecha)
  function drawMonarch(x, y, s, t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    const wy = 0.3 + 0.7 * Math.abs(Math.sin(t * 11));
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.scale(1, sgn * wy);
      ctx.fillStyle = '#f28c28';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(s * 0.1, -s * 0.62, s * 0.5, s * 0.78, 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-s * 0.45, -s * 0.38, s * 0.36, s * 0.46, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(s * (0.0 + i * 0.22), -s * (1.2 - i * 0.1), s * 0.05, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.7, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.72, 0, s * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s * 0.8, -s * 0.05); ctx.lineTo(s * 1.05, -s * 0.28);
    ctx.moveTo(s * 0.8, s * 0.05); ctx.lineTo(s * 1.05, s * 0.28); ctx.stroke();
    ctx.restore();
  }

  /* ---------- 3. LÓGICA DE CADA NIVEL ---------- */

  const LOGIC = {};

  /* ===== NIVEL 1: MARIPOSARIO ===== */
  LOGIC.mariposario = {
    init(g) {
      g.p = { x: 140, y: H / 2, r: 15 };
      g.d = { flowers: [], hazards: [], nextFlower: 0.4, nextHazard: 2.5, scroll: 0, speed: 150 };
    },
    update(g, dt) {
      const d = g.d, prog = g.t / g.level.duration;
      d.speed = 150 + 120 * prog;
      d.scroll += d.speed * 0.4 * dt;
      movePlayer(g, dt, 275, 25, W - 25, 55, H - 25);

      // Flores (néctar)
      if ((d.nextFlower -= dt) <= 0) {
        d.flowers.push({ x: W + 30, y: rand(70, H - 40), r: 20, e: pick(['🌸', '🌼', '🌺']), ph: rand(0, 6) });
        d.nextFlower = rand(0.7, 1.1) - 0.3 * prog;
      }
      // Peligros: viento frío y lluvia
      if ((d.nextHazard -= dt) <= 0) {
        if (Math.random() < 0.6) {
          d.hazards.push({ type: 'gust', x: W + 40, by: rand(70, H - 40), y: 0, vx: -(d.speed + rand(110, 190)), amp: rand(15, 55), ph: rand(0, 6), r: 24 });
        } else {
          d.hazards.push({ type: 'rain', x: rand(260, W), y: 40, vx: -d.speed * 0.5, vy: 260 + 120 * prog, r: 12 });
        }
        d.nextHazard = Math.max(0.55, 1.7 - 1.1 * prog) * rand(0.8, 1.2);
      }

      for (const f of d.flowers) f.x -= d.speed * dt;
      for (const h of d.hazards) {
        h.x += h.vx * dt;
        if (h.type === 'gust') h.y = h.by + Math.sin(g.t * 3 + h.ph) * h.amp;
        else h.y += h.vy * dt;
      }
      d.flowers = d.flowers.filter(f => f.x > -40);
      d.hazards = d.hazards.filter(h => h.x > -60 && h.y < H + 30);

      for (let i = d.flowers.length - 1; i >= 0; i--) {
        if (dist(g.p, d.flowers[i]) < g.p.r + d.flowers[i].r) {
          popText(g, d.flowers[i].x, d.flowers[i].y, '+1', '#fff');
          d.flowers.splice(i, 1);
          g.score++;
        }
      }
      if (g.inv <= 0) {
        for (let i = d.hazards.length - 1; i >= 0; i--) {
          if (dist(g.p, d.hazards[i]) < g.p.r + d.hazards[i].r - 3) {
            d.hazards.splice(i, 1);
            hurt(g);
            break;
          }
        }
      }
    },
    spawnSpecial(g) {
      return { x: W + 30, y: rand(90, H - 70), vx: -(g.d.speed * 0.85), vy: 0, life: 999 };
    },
    draw(g) {
      const d = g.d;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#fdf1c9'); bg.addColorStop(1, '#bfe3b4');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // Hojas de fondo con parallax (invernadero)
      for (let i = 0; i < 14; i++) {
        const x = ((i * 190 - d.scroll * (0.4 + (i % 3) * 0.2)) % (W + 200) + (W + 200)) % (W + 200) - 100;
        const y = 70 + (i * 83) % (H - 90);
        ctx.fillStyle = `rgba(60,140,80,${0.12 + (i % 3) * 0.05})`;
        ctx.beginPath(); ctx.ellipse(x, y, 70, 22, (i % 5) * 0.4 - 0.8, 0, Math.PI * 2); ctx.fill();
      }
      for (const f of d.flowers) emoji(f.e, f.x, f.y + Math.sin(g.t * 3 + f.ph) * 4, 38);
      for (const h of d.hazards) {
        if (h.type === 'gust') emoji('💨', h.x, h.y, 48, 0.9);
        else emoji('💧', h.x, h.y, 26);
      }
      drawSpecials(g);
      const blink = g.inv > 0 && Math.floor(g.inv * 10) % 2 === 0;
      drawMonarch(g.p.x, g.p.y, 26, g.t, blink ? 0.35 : 1);
    }
  };

  /* ===== NIVEL 2: BOSQUE ENCANTADO ===== */
  LOGIC.bosque = {
    init(g) {
      g.p = { x: W / 2, y: H / 2, r: 12 };
      const decor = [];
      for (let i = 0; i < 26; i++) decor.push({ x: rand(0, W), y: rand(60, H), s: rand(50, 110) });
      g.d = { seeds: [], hazards: [], trees: [], decor, vis: 240 };
      for (let i = 0; i < 4; i++) this.addSeed(g);
      for (let i = 0; i < 4; i++) this.addHazard(g);
    },
    addSeed(g) {
      let x, y, n = 0;
      do { x = rand(60, W - 60); y = rand(80, H - 50); n++; } while (n < 30 && Math.hypot(x - g.p.x, y - g.p.y) < 150);
      g.d.seeds.push({ x, y, r: 15, ph: rand(0, 6) });
    },
    addHazard(g) {
      const prog = g.t / g.level.duration;
      let x, y, n = 0;
      do { x = rand(30, W - 30); y = rand(80, H - 30); n++; } while (n < 30 && Math.hypot(x - g.p.x, y - g.p.y) < 260);
      const a = rand(0, Math.PI * 2), sp = rand(70, 110) * (1 + prog * 0.7);
      g.d.hazards.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 18, e: pick(['🛍️', '🥤', '🥫']), rot: 0, spin: rand(-2, 2) });
    },
    update(g, dt) {
      const d = g.d, prog = g.t / g.level.duration;
      movePlayer(g, dt, 235, 14, W - 14, 52, H - 14);
      d.vis = 245 - 65 * prog;

      const wanted = 4 + Math.floor(prog * 8);
      while (d.hazards.length < wanted) this.addHazard(g);
      for (const h of d.hazards) {
        h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.spin * dt;
        if (h.x < h.r || h.x > W - h.r) { h.vx *= -1; h.x = clamp(h.x, h.r, W - h.r); }
        if (h.y < 52 + h.r || h.y > H - h.r) { h.vy *= -1; h.y = clamp(h.y, 52 + h.r, H - h.r); }
      }
      for (const t of d.trees) t.age += dt;

      for (let i = d.seeds.length - 1; i >= 0; i--) {
        const s = d.seeds[i];
        if (dist(g.p, s) < g.p.r + s.r) {
          d.seeds.splice(i, 1);
          d.trees.push({ x: s.x, y: s.y, age: 0 });
          g.score++;
          popText(g, s.x, s.y, '+1 🌱', '#c8ffb0');
          this.addSeed(g);
        }
      }
      if (g.inv <= 0) {
        for (let i = d.hazards.length - 1; i >= 0; i--) {
          if (dist(g.p, d.hazards[i]) < g.p.r + d.hazards[i].r - 3) {
            d.hazards.splice(i, 1);
            hurt(g);
            break;
          }
        }
      }
    },
    spawnSpecial(g) {
      let x, y, n = 0;
      do { x = rand(70, W - 70); y = rand(90, H - 60); n++; } while (n < 30 && Math.hypot(x - g.p.x, y - g.p.y) < 170);
      return { x, y, vx: 0, vy: 0, life: 22 };
    },
    draw(g) {
      const d = g.d;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1d4d3f'); bg.addColorStop(1, '#0c2620');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // Siluetas de árboles
      ctx.fillStyle = '#10382c';
      for (const t of d.decor) {
        ctx.beginPath(); ctx.moveTo(t.x, t.y - t.s); ctx.lineTo(t.x + t.s * 0.32, t.y); ctx.lineTo(t.x - t.s * 0.32, t.y); ctx.fill();
      }
      for (const t of d.trees) emoji(t.age < 2 ? '🌱' : '🌳', t.x, t.y - Math.min(t.age, 6) * 2, 22 + Math.min(t.age, 6) * 6);
      for (const h of d.hazards) emoji(h.e, h.x, h.y, 34, 1, h.rot);

      // Oscuridad con un círculo de luz alrededor del jugador
      const dark = ctx.createRadialGradient(g.p.x, g.p.y, d.vis * 0.25, g.p.x, g.p.y, d.vis);
      dark.addColorStop(0, 'rgba(4,12,10,0)');
      dark.addColorStop(1, 'rgba(4,12,10,0.94)');
      ctx.fillStyle = dark; ctx.fillRect(0, 0, W, H);

      // Semillas brillan incluso en la oscuridad
      for (const s of d.seeds) {
        const pulse = 1 + Math.sin(g.t * 4 + s.ph) * 0.2;
        glow(s.x, s.y, 34 * pulse, 'rgba(255,230,120,0.75)');
        emoji('🌱', s.x, s.y, 24);
      }
      drawSpecials(g);

      // Jugador: luz del bosque
      const blink = g.inv > 0 && Math.floor(g.inv * 10) % 2 === 0;
      ctx.globalAlpha = blink ? 0.4 : 1;
      glow(g.p.x, g.p.y, 40, 'rgba(255,245,170,0.9)');
      ctx.fillStyle = '#fffbe0';
      ctx.beginPath(); ctx.arc(g.p.x, g.p.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  /* ===== NIVEL 3: COLONIA DE ABEJAS ===== */
  LOGIC.abejas = {
    init(g) {
      g.p = { x: 180, y: H / 2, r: 14 };
      const flowers = [];
      let n = 0;
      while (flowers.length < 8 && n++ < 500) {
        const x = rand(270, W - 50), y = rand(85, H - 55);
        if (flowers.every(f => Math.hypot(f.x - x, f.y - y) > 110)) {
          flowers.push({ x, y, r: 22, cd: 0, e: pick(['🌼', '🌻', '🌷', '🌸']) });
        }
      }
      g.d = {
        flowers, clouds: [], birds: [], warnings: [], carried: 0,
        hive: { x: 85, y: H / 2, r: 58 }, nextBird: 6
      };
      for (let i = 0; i < 2; i++) this.addCloud(g);
    },
    addCloud(g) {
      let x, y, n = 0;
      do { x = rand(250, W - 60); y = rand(90, H - 60); n++; } while (n < 30 && Math.hypot(x - g.p.x, y - g.p.y) < 200);
      const a = rand(0, Math.PI * 2), sp = rand(35, 65);
      g.d.clouds.push({ x, y, r: rand(42, 62), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ph: rand(0, 6) });
    },
    update(g, dt) {
      const d = g.d, prog = g.t / g.level.duration;
      movePlayer(g, dt, 255 - d.carried * 18, 20, W - 20, 55, H - 20);

      // Flores: recarga de polen
      for (const f of d.flowers) {
        if (f.cd > 0) f.cd -= dt;
        else if (d.carried < 3 && dist(g.p, f) < g.p.r + f.r) {
          d.carried++; f.cd = 4.5;
          popText(g, f.x, f.y, '+polen', '#fff3a0');
        }
      }
      // Entrega en la colmena
      if (d.carried > 0 && dist(g.p, d.hive) < d.hive.r + g.p.r * 0.5) {
        g.score += d.carried;
        popText(g, d.hive.x, d.hive.y - 70, `+${d.carried} 🍯`, '#ffe08a');
        d.carried = 0;
      }

      // Nubes de agroquímicos
      const wantedClouds = 2 + Math.floor(prog * 4);
      while (d.clouds.length < wantedClouds) this.addCloud(g);
      for (const c of d.clouds) {
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.x < 200 + c.r * 0.3 || c.x > W - c.r * 0.5) c.vx *= -1;
        if (c.y < 55 + c.r * 0.5 || c.y > H - c.r * 0.5) c.vy *= -1;
        c.x = clamp(c.x, 200, W); c.y = clamp(c.y, 55, H);
      }

      // Aves cazadoras (con aviso)
      if ((d.nextBird -= dt) <= 0) {
        d.warnings.push({ y: rand(75, H - 50), t: 0.95, dir: Math.random() < 0.5 ? -1 : 1 });
        d.nextBird = Math.max(2.4, 5.5 - 3 * prog) * rand(0.85, 1.15);
      }
      for (let i = d.warnings.length - 1; i >= 0; i--) {
        const w = d.warnings[i];
        if ((w.t -= dt) <= 0) {
          d.birds.push({ x: w.dir < 0 ? W + 40 : -40, y: w.y, vx: w.dir * (560 + 80 * prog), r: 20 });
          d.warnings.splice(i, 1);
        }
      }
      for (const b of d.birds) b.x += b.vx * dt;
      d.birds = d.birds.filter(b => b.x > -80 && b.x < W + 80);

      if (g.inv <= 0) {
        let hit = d.clouds.some(c => dist(g.p, c) < g.p.r + c.r * 0.78) ||
                  d.birds.some(b => dist(g.p, b) < g.p.r + b.r - 2);
        if (hit) { d.carried = 0; hurt(g); }
      }
    },
    spawnSpecial(g) {
      let x, y, n = 0;
      do { x = rand(260, W - 50); y = rand(90, H - 55); n++; } while (n < 30 && Math.hypot(x - g.p.x, y - g.p.y) < 170);
      return { x, y, vx: 0, vy: 0, life: 22 };
    },
    draw(g) {
      const d = g.d;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#bfe9ff'); bg.addColorStop(1, '#e9f6c9');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(90,170,90,0.25)';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(160 + i * 170, H + 40, 130, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#7cc26a'; ctx.fillRect(0, H - 18, W, 18);

      // Colmena
      const hv = d.hive;
      ctx.fillStyle = '#f6b73c'; ctx.strokeStyle = '#b9770e'; ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 3 * i + Math.PI / 6;
        const x = hv.x + Math.cos(a) * hv.r, y = hv.y + Math.sin(a) * hv.r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      emoji('🍯', hv.x, hv.y - 4, 44);
      text('COLMENA', hv.x, hv.y + hv.r + 16, 14, '#7a4a05', 'center');

      // Flores
      for (const f of d.flowers) {
        const ready = f.cd <= 0;
        emoji(f.e, f.x, f.y + (ready ? Math.sin(g.t * 3 + f.x) * 3 : 0), 40, ready ? 1 : 0.3);
        if (!ready) {
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(f.x, f.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - f.cd / 4.5)); ctx.stroke();
        }
      }

      // Avisos de ataque
      for (const w of d.warnings) {
        ctx.fillStyle = `rgba(229,57,53,${0.12 + 0.12 * Math.abs(Math.sin(g.t * 14))})`;
        ctx.fillRect(0, w.y - 20, W, 40);
        emoji('❗', w.dir < 0 ? W - 30 : 30, w.y, 30);
      }
      // Nubes de agroquímicos
      for (const c of d.clouds) {
        const wob = 1 + Math.sin(g.t * 2 + c.ph) * 0.06;
        const gr = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, c.r * wob);
        gr.addColorStop(0, 'rgba(150,200,40,0.85)'); gr.addColorStop(1, 'rgba(120,170,30,0.15)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(c.x, c.y, c.r * wob, 0, Math.PI * 2); ctx.fill();
        emoji('☣️', c.x, c.y, 24, 0.7);
      }
      for (const b of d.birds) emoji('🐦', b.x, b.y, 40, 1, 0, b.vx > 0);
      drawSpecials(g);

      // Abeja y polen cargado
      const blink = g.inv > 0 && Math.floor(g.inv * 10) % 2 === 0;
      emoji('🐝', g.p.x, g.p.y + Math.sin(g.t * 14) * 2, 36, blink ? 0.35 : 1);
      for (let i = 0; i < d.carried; i++) {
        ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#c99700'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(g.p.x - 14 + i * 14, g.p.y + 24, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    },
    hudExtra(g) {
      return `Polen: ${'●'.repeat(g.d.carried)}${'○'.repeat(3 - g.d.carried)}`;
    }
  };

  /* ---------- 4. MOTOR DEL JUEGO ---------- */

  let state = 'menu';   // menu | intro | playing | paused | fact | ended
  let game = null;
  let menuT = 0;

  function startLevel(i) {
    const level = LEVELS[i];
    game = {
      li: i, level, logic: LOGIC[level.id],
      t: 0, score: 0, lives: CONFIG.lives, inv: CONFIG.startGrace, shake: 0,
      p: { x: 0, y: 0, r: 14 }, d: {},
      specials: [], queue: level.facts.slice(), found: [],
      nextSpecialAt: level.duration * 0.15, fx: []
    };
    target = null; joy = null;
    game.logic.init(game);
    hidePanel();
    state = 'playing';
  }

  function hurt(g) {
    if (g.inv > 0) return;
    g.lives--;
    g.inv = CONFIG.invulnerability;
    g.shake = 0.3;
    popText(g, g.p.x, g.p.y - 26, '¡Ay!', '#ff6b6b');
    if (g.lives <= 0) endLevel(false, 'lives');
  }

  function popText(g, x, y, str, color) {
    g.fx.push({ x, y, str, color, life: 0.9 });
  }

  /* Coleccionables: aparecen de a uno, entregan un dato curioso y guardan en el álbum */
  function updateSpecials(g, dt) {
    const sp = g.specials;
    for (let i = sp.length - 1; i >= 0; i--) {
      const s = sp[i];
      s.x += s.vx * dt; s.life -= dt; s.ph += dt * 4;
      if (dist(g.p, s) < g.p.r + s.r) { collectSpecial(g, s, i); return; }
      if (s.life <= 0 || s.x < -40) { sp.splice(i, 1); g.nextSpecialAt = g.t + 3; }
    }
    if (!sp.length && g.queue.length && g.t >= g.nextSpecialAt && g.t < g.level.duration - 8) {
      const s = g.logic.spawnSpecial(g);
      s.fact = g.queue[0]; s.r = 22; s.ph = 0;
      sp.push(s);
    }
  }

  function collectSpecial(g, s, i) {
    g.specials.splice(i, 1);
    g.queue.shift();
    g.found.push(s.fact);
    g.score += 2; // pequeña bonificación
    store.album[s.fact.id] = true;
    saveStore();
    g.nextSpecialAt = g.t + g.level.duration * 0.18;
    state = 'fact';
    showFact(s.fact);
  }

  function drawSpecials(g) {
    for (const s of g.specials) {
      const pulse = 1 + Math.sin(s.ph) * 0.15;
      glow(s.x, s.y, 42 * pulse, 'rgba(255,215,64,0.85)');
      ctx.fillStyle = '#fff8d6'; ctx.strokeStyle = '#f2a900'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.x, s.y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      emoji(s.fact.emoji, s.x, s.y, 26);
    }
  }

  function update(dt) {
    const g = game;
    g.t += dt;
    if (g.inv > 0) g.inv -= dt;
    if (g.shake > 0) g.shake -= dt;
    g.logic.update(g, dt);
    if (state !== 'playing') return;
    updateSpecials(g, dt);
    for (let i = g.fx.length - 1; i >= 0; i--) {
      g.fx[i].life -= dt; g.fx[i].y -= 30 * dt;
      if (g.fx[i].life <= 0) g.fx.splice(i, 1);
    }
    if (state === 'playing' && g.t >= g.level.duration) {
      endLevel(g.score >= g.level.goal, 'time');
    }
  }

  function drawHUD(g) {
    const L = g.level;
    const remaining = Math.max(0, L.duration - g.t);
    // En pantallas pequeñas el texto del HUD se agranda un poco para leerse bien
    const k = clamp(0.9 / (canvas.clientWidth / W || 1), 1, 1.3);
    const barH = 36 * k;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, 8);
    ctx.fillStyle = remaining < 10 ? '#e53935' : '#43a047';
    ctx.fillRect(0, 0, W * remaining / L.duration, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(0, 8, W, barH);
    const cy = 8 + barH / 2;

    text('❤️'.repeat(g.lives) + '🖤'.repeat(Math.max(0, CONFIG.lives - g.lives)), 14, cy, 18 * k, '#fff');
    text(`${Math.ceil(remaining)} s`, W / 2, cy, 20 * k, '#fff', 'center');
    let right = `${L.goalLabel}: ${g.score}/${L.goal}  ⭐${g.found.length}/${L.facts.length}`;
    if (g.logic.hudExtra) right = g.logic.hudExtra(g) + '  ' + right;
    text(right, W - 14, cy, 17 * k, g.score >= L.goal ? '#ffe08a' : '#fff', 'right');
  }

  function drawJoystick() {
    if (!joy) return;
    const vx = joy.x - joy.ox, vy = joy.y - joy.oy, d = Math.hypot(vx, vy) || 1;
    const k = Math.min(1, d / JOY_R);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, JOY_R, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(joy.ox + vx / d * JOY_R * k, joy.oy + vy / d * JOY_R * k, 26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.save();
    if (!game) {
      drawMenuBackground();
    } else {
      if (game.shake > 0) ctx.translate(rand(-5, 5), rand(-5, 5));
      game.logic.draw(game);
      for (const f of game.fx) {
        ctx.globalAlpha = clamp(f.life / 0.5, 0, 1);
        text(f.str, f.x, f.y, 20, f.color, 'center');
        ctx.globalAlpha = 1;
      }
      drawHUD(game);
    }
    ctx.restore();
    drawJoystick();
  }

  function drawMenuBackground() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2c6b52'); bg.addColorStop(1, '#12352c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      const x = (menuT * (30 + i * 12) + i * 220) % (W + 120) - 60;
      const y = 120 + i * 80 + Math.sin(menuT * 1.5 + i) * 30;
      drawMonarch(x, y, 22 + (i % 2) * 6, menuT + i, 0.9);
    }
  }

  let lastTs = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    menuT += dt;
    if (state === 'playing') update(dt);
    render();
    const showPause = state === 'playing';
    if (pauseBtn.hidden === showPause) pauseBtn.hidden = !showPause;
    requestAnimationFrame(frame);
  }

  function endLevel(win, reason) {
    const g = game;
    state = 'ended';
    const stars = win ? clamp(g.lives, 1, 3) : 0;
    if (win && stars > (store.stars[g.level.id] || 0)) { store.stars[g.level.id] = stars; saveStore(); }
    showEnd(win, reason, stars);
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused'; joy = null;
    panel(`<h2>⏸ Pausa</h2>
      <div class="row">
        <button class="btn" data-action="resume">Continuar</button>
        <button class="btn ghost" data-action="menu">Salir al menú</button>
      </div>`);
  }
  pauseBtn.addEventListener('click', pause);
  // Si giran el teléfono a vertical, el juego se pausa solo
  if (window.matchMedia) {
    const portrait = window.matchMedia('(orientation: portrait) and (max-width: 700px)');
    const onTurn = e => { if (e.matches) pause(); };
    portrait.addEventListener ? portrait.addEventListener('change', onTurn) : portrait.addListener(onTurn);
  }
  function resume() {
    if (state !== 'paused') return;
    hidePanel();
    state = 'playing';
  }

  /* ---------- 5. PANTALLAS ---------- */

  function panel(html) {
    overlay.innerHTML = `<div class="panel">${html}</div>`;
    overlay.classList.add('show');
    const b = overlay.querySelector('.btn, .card');
    if (b) b.focus({ preventScroll: true });
  }
  function hidePanel() { overlay.classList.remove('show'); overlay.innerHTML = ''; }
  const starsStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);

  function showMenu() {
    state = 'menu'; game = null;
    const got = ALL_FACTS.filter(f => store.album[f.id]).length;
    panel(`
      <h1>🦋 Bioparque Monarca</h1>
      <p class="sub">Recorre las tres estaciones, cuida su vida y descubre datos curiosos.</p>
      <div class="cards">
        ${LEVELS.map((L, i) => `
          <button class="card" data-action="intro" data-level="${i}">
            <span class="ce">${L.emoji}</span>
            <b>${L.name}</b>
            <small>${L.subtitle}</small>
            <small>${L.duration} s · meta: ${L.goal} ${L.goalLabel}</small>
            <span class="st">${starsStr(store.stars[L.id] || 0)}</span>
          </button>`).join('')}
      </div>
      <p class="small">${IS_TOUCH ? '👆 Arrastra el dedo sobre la pantalla para mover · ⏸ para pausar' : '⌨️ Flechas o WASD · 🖱️ mouse · P = pausa'}</p>
      <div class="row">
        <button class="btn ghost" data-action="album">📖 Álbum de datos (${got}/${ALL_FACTS.length})</button>
        ${document.documentElement.requestFullscreen ? '<button class="btn ghost" data-action="fullscreen">⛶ Pantalla completa</button>' : ''}
      </div>`);
  }

  function showIntro(i) {
    const L = LEVELS[i];
    state = 'intro';
    panel(`
      <div class="big-emoji">${L.emoji}</div>
      <h2>${L.name}</h2>
      <p>${L.mission}</p>
      <p><b>Meta:</b> ${L.goal} de ${L.goalLabel} en ${L.duration} segundos.</p>
      <p><b>Cuidado con:</b> ${L.dangers}</p>
      <p class="small">${IS_TOUCH ? '👆 Arrastra el dedo en cualquier parte para mover. ' : ''}Tienes ${CONFIG.lives} vidas. Busca los objetos dorados ⭐ para desbloquear datos curiosos.</p>
      <div class="row">
        <button class="btn" data-action="start" data-level="${i}">¡Empezar!</button>
        <button class="btn ghost" data-action="menu">Volver</button>
      </div>`);
  }

  function showFact(f) {
    panel(`
      <span class="badge">⭐ ¡Dato curioso guardado en tu álbum!</span>
      <div class="big-emoji">${f.emoji}</div>
      <h2>${f.title}</h2>
      <p>${f.text}</p>
      <div class="row"><button class="btn" data-action="continue">Seguir jugando</button></div>`);
  }

  function showEnd(win, reason, stars) {
    const g = game, L = g.level;
    const isLast = g.li === LEVELS.length - 1;
    const missed = L.facts.length - g.found.length;
    let title, body;
    if (win) {
      title = isLast ? '¡Completaste el recorrido!' : '¡Estación superada!';
      body = `<div class="stars">${starsStr(stars)}</div>
              <p>${g.score} de ${L.goalLabel} · ${g.found.length}/${L.facts.length} datos curiosos encontrados.</p>
              ${missed ? '<p class="small">Te faltan datos por descubrir en esta estación. ¡Repite el nivel para encontrarlos!</p>' : ''}`;
    } else {
      title = 'Inténtalo de nuevo';
      body = `<p>${reason === 'lives' ? 'Te quedaste sin vidas.' : `Se acabó el tiempo: llevabas ${g.score} de ${L.goal} de ${L.goalLabel}.`}</p>
              <p class="small">Consejo: esquiva primero, recoge después.</p>`;
    }
    panel(`
      <div class="big-emoji">${win ? '🎉' : L.emoji}</div>
      <h2>${title}</h2>
      ${body}
      <div class="row">
        ${win && !isLast ? `<button class="btn" data-action="intro" data-level="${g.li + 1}">Siguiente estación</button>` : ''}
        <button class="btn ${win && !isLast ? 'ghost' : ''}" data-action="start" data-level="${g.li}">Repetir</button>
        <button class="btn ghost" data-action="menu">Menú</button>
      </div>`);
  }

  function showAlbum() {
    state = 'menu';
    const got = ALL_FACTS.filter(f => store.album[f.id]).length;
    panel(`
      <h2>📖 Álbum de datos curiosos</h2>
      <p class="sub">${got} de ${ALL_FACTS.length} descubiertos</p>
      ${ALL_FACTS.map(f => store.album[f.id]
        ? `<div class="fact"><b>${f.emoji} ${f.title}</b>${f.text}</div>`
        : `<div class="fact locked"><b>🔒 Dato sin descubrir</b>Búscalo en: ${f.station}</div>`).join('')}
      <div class="row"><button class="btn" data-action="menu">Volver</button></div>`);
  }

  function goFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    const req = el.requestFullscreen && el.requestFullscreen();
    // En Android, además intenta bloquear la orientación horizontal
    Promise.resolve(req).then(() => {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    }).catch(() => {});
  }

  overlay.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const i = Number(b.dataset.level);
    switch (b.dataset.action) {
      case 'intro': showIntro(i); break;
      case 'start': startLevel(i); break;
      case 'menu': showMenu(); break;
      case 'album': showAlbum(); break;
      case 'resume': resume(); break;
      case 'fullscreen': goFullscreen(); break;
      case 'continue': hidePanel(); state = 'playing'; break;
    }
  });

  /* ---------- Arranque ---------- */
  showMenu();
  requestAnimationFrame(frame);

})();
