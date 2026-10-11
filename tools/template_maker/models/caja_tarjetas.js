if (!window.DivineTemplates) window.DivineTemplates = {};

window.DivineTemplates['caja_tarjetas'] = {
    id: 'caja_tarjetas',
    name: 'Caja de Tarjetas',
    desc: 'Es una caja larga y delgada. Perfecta para chocolates, cigarrillos, juegos de cartas, etc. Las dimensiones por defecto están bien para un juego estándar de cartas Europeo (“tamaño bridge”).',
    coverImage: 'https://www.templatemaker.nl/assets/images/example/cardbox.jpeg',
    assemblyText: 'Marca bien los dobleces (líneas punteadas) antes de aplicar pegamento. Comienza uniendo los paneles laterales para formar el tubo central, y pliega las tapas al final.',
    assemblyImages: [
        'assets/instructions/cubo_a.jpeg'
    ],
    exampleImages: [
        'https://www.templatemaker.nl/assets/images/example/cardbox.jpeg',
        'https://www.templatemaker.nl/assets/images/gallery/cardbox/placebomine_templatemaker-nl.jpg'
    ],

    params: [{
        id: 'L',
        type: 'dim',
        label: 'Largo',
        default: 60
    },
    {
        id: 'W',
        type: 'dim',
        label: 'Ancho',
        default: 30
    },
    {
        id: 'H',
        type: 'dim',
        label: 'Alto',
        default: 90
    },
    {
        id: 'F',
        type: 'opt',
        label: 'Pestaña',
        default: 15
    },
    {
        id: 'S',
        type: 'opt',
        label: 'Solapa',
        default: 20
    },
    {
        id: 'D',
        type: 'opt',
        label: 'Diámetro Thumbhole',
        default: 12
    }
    ],

    render: function (inputs) {

        const L = inputs['L'] || 60;
        const W = inputs['W'] || 30;
        const H = inputs['H'] || 90;
        const F = inputs['F'] || 15;
        const T = inputs['T'] || 15;
        const S = inputs['S'] || 20;
        const D = inputs['D'] || 12;

        const m = 15;
        const taper = 4;
        const dust = Math.min(W * 0.7, L * 0.4);
        const maxR = L * 0.4;
        const r = Math.min(D / 2, maxR);
        const o = 0.01; // offset doblez

        const x0 = m;
        const x1 = x0 + F;
        const x2 = x1 + W;
        const x3 = x2 + L;
        const x4 = x3 + W;
        const x5 = x4 + L;

        const y0 = m;
        const y1 = y0 + T;
        const y2 = y1 + W;
        const y3 = y2 + H;
        const y4 = y3 + W;
        const y5 = y4 + T;

        const tW = x5 + m;
        const tH = y5 + m;

        const cutStyle = `fill="none" stroke="#FF3366" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"`;
        const foldStyle = `fill="none" stroke="#4D94FF" stroke-width="0.5" stroke-dasharray="3,3"`;

        let cut = ``;

        // ---- CUERPO ----
        cut += `M ${x1},${y2} `;
        cut += `L ${x1 + taper},${y2 - dust} L ${x2 - taper},${y2 - dust} L ${x2},${y2} `;
        cut += `L ${x2},${y3} `;
        cut += `L ${x2 - taper},${y3 + dust} L ${x1 + taper},${y3 + dust} L ${x1},${y3} Z `;

        // ---- FRENTE ----
        cut += `M ${x3},${y2} L ${x3},${y3} L ${x2},${y3} L ${x2},${y2} `;

        // ---- DERECHO ----
        cut += `M ${x3},${y2} `;
        cut += `L ${x3 + taper},${y2 - dust} L ${x4 - taper},${y2 - dust} L ${x4},${y2} `;
        cut += `L ${x4},${y3} `;
        cut += `L ${x4 - taper},${y3 + dust} L ${x3 + taper},${y3 + dust} L ${x3},${y3} Z `;

        // ---- TRASERO + THUMB ----
        const cx1 = x4 + (L / 2) - r;
        const cx2 = x4 + (L / 2) + r;

        cut += `M ${x4},${y2} L ${cx1},${y2} `;
        cut += `A ${r} ${r} 0 0 0 ${cx2} ${y2} `;
        cut += `L ${x5},${y2} L ${x5},${y3} `;
        cut += `M ${x4},${y3} `;

        // =========================
        // TAPA SUPERIOR (RECTA + CURVA)
        // =========================
        const cTop = (x2 + x3) / 2;

        // rectángulo base
        cut += `M ${x2},${y2} `;

        cut += `M ${x3},${y2} L ${x3},${y1} L ${x2},${y1} L ${x2},${y2} `;

        // solapa curva
        const yTopFlap = y1 - S;
        const rad = Math.min(S * 0.4, 8);

        cut += `M ${x2},${y1} `;
        cut += `L ${x2},${yTopFlap + rad} `;
        cut += `A ${rad} ${rad} 0 0 1 ${x2 + rad},${yTopFlap} `;
        cut += `L ${x3 - rad},${yTopFlap} `;
        cut += `A ${rad} ${rad} 0 0 1 ${x3},${yTopFlap + rad} `;
        cut += `L ${x3},${y1} Z `;

        // =========================
        // TAPA INFERIOR (RECTA + CURVA)
        // =========================
        const cBot = (x4 + x5) / 2;

        cut += `M ${x5},${y3} L ${x5},${y4} L ${x4},${y4} L ${x4},${y3} `;
        const yBotFlap = y4 + S;
        const rad2 = Math.min(S * 0.4, 8);

        cut += `M ${x4},${y4} `;
        cut += `L ${x4},${yBotFlap - rad2} `;
        cut += `A ${rad2} ${rad2} 0 0 0 ${x4 + rad2},${yBotFlap} `;
        cut += `L ${x5 - rad2},${yBotFlap} `;
        cut += `A ${rad2} ${rad2} 0 0 0 ${x5},${yBotFlap - rad2} `;
        cut += `L ${x5},${y4} Z `;
        // ---- PESTAÑA ----
        cut += `M ${x1},${y3} L ${x0},${y3 - 6} L ${x0},${y2 + 6} L ${x1},${y2} Z `;

        // =========================
        // FOLD (SIN ENCIMARSE)
        // =========================
        let fold = ``;

        fold += `M ${x1},${y2 + o} V ${y3 - o} `;
        fold += `M ${x2},${y2 + o} V ${y3 - o} `;
        fold += `M ${x3},${y2 + o} V ${y3 - o} `;
        fold += `M ${x4},${y2 + o} V ${y3 - o} `;



        fold += `M ${x1 + o},${y2} H ${x2 - o} `;
        fold += `M ${x3 + o},${y2} H ${x4 - o} `;
        fold += `M ${x1 + o},${y3} H ${x2 - o} `;
        fold += `M ${x3 + o},${y3} H ${x4 - o} `;

        fold += `M ${x2 + o},${y1} H ${x3 - o} `;
        fold += `M ${x2 + o},${y2} H ${x3 - o} `;
        fold += `M ${x4 + o},${y4} H ${x5 - o} `;
        fold += `M ${x4 + o},${y3} H ${x5 - o} `;

        const svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tW} ${tH}" width="100%" height="100%"><path d="${cut}" ${cutStyle}/><path d="${fold}" ${foldStyle}/></svg>`;

        return {
            svg: svgCode,
            width: tW,
            height: tH
        };
    }
};