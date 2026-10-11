if (!window.DivineTemplates) window.DivineTemplates = {};

window.DivineTemplates['cubo'] = {
    id: 'cubo',
    name: 'Cubo Clásico',
    desc: 'Un cubo simple, el punto de partida perfecto. Todas sus caras son iguales. Ideal para cajas de regalo pequeñas o empaques minimalistas.',
    coverImage: 'https://www.templatemaker.nl/assets/images/example/platonic-solids.jpeg',
    assemblyText: 'Marca bien los dobleces (líneas punteadas) antes de aplicar pegamento. Comienza uniendo los paneles laterales para formar el tubo central, y pliega las tapas al final.',
    assemblyImages: [
        'assets/instructions/cubo_paso1.webp',
        'assets/instructions/cubo_paso2.webp'
    ],
    exampleImages: [
        'assets/examples/cubo_ex1.webp',
        'assets/examples/cubo_ex2.webp'
    ],
    params: [
        { id: 'L', type: 'dim', label: 'Lado', default: 50 },
        { id: 'F', type: 'opt', label: 'Pestaña', default: 15 }
    ],
    render: function (inputs) {
        const L = inputs['L'] || 50;
        const F = inputs['F'] || 15;
        const margin = 10;

        const tW = (L * 3) + (F * 2) + (margin * 2);
        const tH = (L * 4) + (F * 2) + (margin * 2);
        const sX = F + L + margin;
        const sY = F + margin;

        const cutStyle = `fill="none" stroke="#FF3366" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"`;
        const foldStyle = `fill="none" stroke="#4D94FF" stroke-width="0.5" stroke-dasharray="3,3" stroke-linecap="round"`;

        // Construcción limpia de strings (sin saltos de línea)
        let cut = `M ${sX},${sY} h ${L} v ${L} h ${L} v ${L} h ${-L} v ${L * 2} h ${-L} v ${-L * 2} h ${-L} v ${-L} h ${L} Z `;
        cut += `M ${sX},${sY} l ${F},${-F} h ${L - (F * 2)} l ${F},${F} `;
        cut += `M ${sX + (L * 2)},${sY + L} l ${F},${F} v ${L - (F * 2)} l ${-F},${F} `;
        cut += `M ${sX + L},${sY + (L * 4)} l ${-F},${F} h ${-L + (F * 2)} l ${-F},${-F} `;
        cut += `M ${sX + L},${sY + (L * 3)} l ${F},${F} v ${L - (F * 2)} l ${-F},${F} `;
        cut += `M ${sX},${sY + (L * 3)} l ${-F},${-F} v ${-L + (F * 2)} l ${F},${-F} `;
        cut += `M ${sX - L},${sY + (L * 2)} l ${-F},${-F} v ${-L + (F * 2)} l ${F},${-F}`;

        let fold = `M ${sX},${sY} h ${L} M ${sX},${sY + L} h ${L} M ${sX},${sY + (L * 2)} h ${L} M ${sX},${sY + (L * 3)} h ${L} M ${sX},${sY + (L * 4)} h ${L} M ${sX - L},${sY + L} v ${L} M ${sX},${sY + L} v ${L} M ${sX + L},${sY + L} v ${L} M ${sX + (L * 2)},${sY + L} v ${L} M ${sX},${sY + (L * 2)} v ${L} M ${sX + L},${sY + (L * 2)} v ${L}`;

        // El viewBox mantiene la escala matemática perfecta, el 100% hace que se adapte a tu pantalla
        const svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tW} ${tH}" width="100%" height="100%"><path d="${cut}" ${cutStyle} /><path d="${fold}" ${foldStyle} /></svg>`;

        return { svg: svgCode, width: tW, height: tH };
    }
};