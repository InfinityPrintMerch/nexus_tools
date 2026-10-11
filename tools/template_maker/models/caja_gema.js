if (!window.DivineTemplates) window.DivineTemplates = {};

window.DivineTemplates['caja_gema'] = {
    id: 'caja_gema',
    name: 'Caja Gema (Gem Stone)',
    desc: 'Bipirámide de N lados optimizada para ocupar el mínimo espacio de impresión.',
    coverImage: 'https://www.templatemaker.nl/assets/images/example/gemstone.jpeg',
    assemblyText: 'Dobla todas las líneas punteadas. Une primero los laterales de cada mitad y luego pega ambas mitades por el centro.',
    params: [
        { id: 'N', type: 'number', label: 'Número de lados', default: 4 },
        { id: 'D', type: 'dim', label: 'Diámetro Interno', default: 100 },
        { id: 'H', type: 'dim', label: 'Alto', default: 150 },
        { id: 'G', type: 'opt', label: 'Tamaño solapa lateral', default: 10 },
        { id: 'T', type: 'opt', label: 'Tamaño pestañas unión', default: 7 }
    ],
    render: function (inputs) {
        const N = parseInt(inputs['N']) || 4;
        const D = parseFloat(inputs['D']) || 100;
        const H = parseFloat(inputs['H']) || 150;
        const G = parseFloat(inputs['G']) || 10;
        const T = parseFloat(inputs['T']) || 7;
        const margin = 15; // Margen reducido para aprovechar papel

        const radius = D / 2;
        const halfHeight = H / 2;
        const sideLength = 2 * radius * Math.sin(Math.PI / N);
        const edgeLength = Math.sqrt(radius * radius + halfHeight * halfHeight);
        const tipAngle = 2 * Math.asin((sideLength / 2) / edgeLength);
        const totalAngle = N * tipAngle;

        const cutStyle = `fill="none" stroke="#d41a5a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`;
        const foldStyle = `fill="none" stroke="#00adee" stroke-width="1" stroke-dasharray="5,5" stroke-linecap="round"`;

        let cutPaths = "";
        let foldPaths = "";

        function getFlapPath(p1, p2, flapSize, isRadial) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / len;
            const uy = dy / len;
            const nx = uy;
            const ny = -ux;
            const maxInset = len / 4;
            let i1 = Math.min(isRadial ? flapSize * 1.2 : flapSize * 0.5, maxInset);
            let i2 = Math.min(isRadial ? flapSize * 1.2 : flapSize * 0.5, maxInset);
            const f1 = { x: p1.x + ux * i1 + nx * flapSize, y: p1.y + uy * i1 + ny * flapSize };
            const f2 = { x: p2.x - ux * i2 + nx * flapSize, y: p2.y - uy * i2 + ny * flapSize };
            return `L ${f1.x},${f1.y} L ${f2.x},${f2.y} `;
        }

        function generateHalf(cx, cy, hasEquatorFlaps) {
            const startAngle = (Math.PI / 2) - (totalAngle / 2);
            const apex = { x: cx, y: cy };
            let vertices = [];
            for (let i = 0; i <= N; i++) {
                vertices.push({
                    x: cx + edgeLength * Math.cos(startAngle + i * tipAngle),
                    y: cy + edgeLength * Math.sin(startAngle + i * tipAngle)
                });
            }

            for (let i = 1; i < N; i++) {
                foldPaths += `M ${apex.x},${apex.y} L ${vertices[i].x},${vertices[i].y} `;
            }

            let currentCut = `M ${apex.x},${apex.y} L ${vertices[0].x},${vertices[0].y} `;
            for (let i = 0; i < N; i++) {
                let p1 = vertices[i];
                let p2 = vertices[i + 1];
                if (hasEquatorFlaps) {
                    foldPaths += `M ${p1.x},${p1.y} L ${p2.x},${p2.y} `;
                    currentCut += getFlapPath(p1, p2, T, false);
                    currentCut += `L ${p2.x},${p2.y} `;
                } else {
                    currentCut += `L ${p2.x},${p2.y} `;
                }
            }
            foldPaths += `M ${vertices[N].x},${vertices[N].y} L ${apex.x},${apex.y} `;
            currentCut += getFlapPath(vertices[N], apex, G, true);
            currentCut += `L ${apex.x},${apex.y} `;
            cutPaths += currentCut;
        }

        // --- POSICIONAMIENTO OPTIMIZADO ---
        // 1. Calculamos cuánto sobresale el abanico por encima de la punta si el ángulo es > 180º
        const startAngle = (Math.PI / 2) - (totalAngle / 2);
        const heightAboveApex = Math.max(0, -edgeLength * Math.sin(startAngle));

        // 2. Definimos los centros Y para que el punto más alto de cada pieza toque el margen
        const topCenterY = margin + heightAboveApex;

        // La altura visible de una pieza es la distancia desde su punto más alto hasta su punto más bajo
        const pieceVisibleHeight = edgeLength + heightAboveApex + (T > 0 ? T : 0);

        // Posicionamos la segunda pieza justo después de la primera con un pequeño aire (gap)
        const gap = 10;
        const bottomCenterY = topCenterY + pieceVisibleHeight + gap + heightAboveApex;

        // Centro X (usamos edgeLength como radio de seguridad para el ancho)
        const centerX = margin + edgeLength + G;

        generateHalf(centerX, topCenterY, false);
        generateHalf(centerX, bottomCenterY, true);

        const tW = (centerX * 2);
        const tH = bottomCenterY + edgeLength + T + margin;

        return {
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tW} ${tH}" width="100%" height="100%"><path d="${foldPaths}" ${foldStyle} /><path d="${cutPaths}" ${cutStyle} /></svg>`,
            width: tW,
            height: tH
        };
    }
};