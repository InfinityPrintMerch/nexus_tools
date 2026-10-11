if (!window.DivineTemplates) window.DivineTemplates = {};

window.DivineTemplates['caja_regalo'] = {
    id: 'caja_regalo',
    name: 'Caja de Regalo (Tuck Box) - Corte Recto',
    desc: 'Versión optimizada con solapas trapezoidales para un corte limpio y ensamblaje sencillo.',
    coverImage: 'https://www.templatemaker.nl/assets/images/example/giftbox.jpeg',
    assemblyText: 'Dobla todas las líneas punteadas. Pega la solapa lateral. Cierra las solapas de polvo (laterales) y luego inserta la solapa principal.',
    params: [{
        id: 'L',
        type: 'dim',
        label: 'Largo',
        default: 50
    },
    {
        id: 'W',
        type: 'dim',
        label: 'Ancho',
        default: 40
    },
    {
        id: 'H',
        type: 'dim',
        label: 'Alto',
        default: 60
    },
    {
        id: 'U',
        type: 'opt',
        label: 'Diámetro del uñero',
        default: 15
    },
    {
        id: 'T',
        type: 'opt',
        label: 'Tamaño solapa de cierre',
        default: 15
    },
    {
        id: 'G',
        type: 'opt',
        label: 'Tamaño solapa encolado',
        default: 10
    },
    {
        id: 'A',
        type: 'opt',
        label: 'Ángulo solapa encolado (°)',
        default: 80
    }
    ],
    render: function (inputs) {
        const L = parseFloat(inputs['L']) || 50;
        const W = parseFloat(inputs['W']) || 40;
        const H = parseFloat(inputs['H']) || 60;
        const U = parseFloat(inputs['U']) || 15;
        const T = parseFloat(inputs['T']) || 15;
        const G = parseFloat(inputs['G']) || 10;
        const A = parseFloat(inputs['A']) || 80;
        const margin = 20;

        // --- CÁLCULOS ---
        const DF = W / 2; // Altura solapas de polvo
        const DI = 5; // Inset diagonal (sangría)

        const glueAngleRad = (90 - A) * (Math.PI / 180);
        const glueInset = G * Math.tan(glueAngleRad);

        // Posiciones X
        const X0 = margin;
        const X1 = X0 + G;
        const X2 = X1 + W;
        const X3 = X2 + L;
        const X4 = X3 + W;
        const cx = X2 + (L / 2);

        // Posiciones Y
        const Y0 = margin;
        const Y1 = Y0 + DF;
        const Y2 = Y1 + H;
        const Y3 = Y2 + W;
        const Y4 = Y3 + H;
        const Y5 = Y4 + W;
        const Y6 = Y5 + T;

        const tW = X4 + margin;
        const tH = Y6 + margin;

        const cutStyle = `fill="none" stroke="#FF3366" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"`;
        const foldStyle = `fill="none" stroke="#4D94FF" stroke-width="0.5" stroke-dasharray="3,3"`;

        // --- TRAZADO DE CORTE (DIAGONALES RECTAS) ---
        let cut = `M ${X1},${Y1 + glueInset} `;

        // Pestaña de pegamento
        cut += `L ${X0},${Y1 + glueInset + 2} L ${X0},${Y2 - glueInset - 2} L ${X1},${Y2 - glueInset} `;

        // Solapa polvo inferior izquierda
        cut += `L ${X1},${Y2} L ${X1 + DI},${Y2 + DF} H ${X2 - DI} L ${X2},${Y2} `;

        // Panel lateral y Solapa de cierre inferior (Tuck Flap)
        // Definimos r (radio) basado en el parámetro de redondeo
        const r = Math.min(parseFloat(inputs['R']) || 10, T / 2, L / 4);

        // Reemplaza tu línea por esta:
        cut += `V ${Y5 + T - r} Q ${X2},${Y5 + T} ${X2 + r},${Y5 + T} H ${X3 - r} Q ${X3},${Y5 + T} ${X3},${Y5 + T - r} V ${Y5} `;

        // Panel lateral y Solapa polvo inferior derecha
        cut += `V ${Y2} L ${X3 + DI},${Y2 + DF} H ${X4 - DI} L ${X4},${Y2} `;

        // Lado derecho y Solapa polvo superior derecha
        cut += `V ${Y1} L ${X4 - DI},${Y1 - DF} H ${X3 + DI} L ${X3},${Y1} `;

        // Borde Frontal Superior con UÑERO
        cut += `H ${cx + U / 2} A ${U / 2} ${U / 2} 0 0 1 ${cx - U / 2} ${Y1} H ${X2} `;

        // Solapa polvo superior izquierda
        cut += `L ${X2 - DI},${Y1 - DF} H ${X1 + DI} L ${X1},${Y1} Z`;

        // --- DOBLECES ---
        let fold = `M ${X2},${Y2} H ${X3} M ${X2},${Y3} H ${X3} M ${X2},${Y4} H ${X3} M ${X2},${Y5} H ${X3} `;
        fold += `M ${X1},${Y1} H ${X2} M ${X1},${Y2} H ${X2} M ${X3},${Y1} H ${X4} M ${X3},${Y2} H ${X4} `;
        fold += `M ${X1},${Y1} V ${Y2} M ${X2},${Y1} V ${Y2} M ${X3},${Y1} V ${Y2}`;

        return {
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tW} ${tH}" width="100%" height="100%"><path d="${fold}" ${foldStyle} /><path d="${cut}" ${cutStyle} /></svg>`,
            width: tW,
            height: tH
        };
    }
};