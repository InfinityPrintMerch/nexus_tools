if (!window.DivineTemplates) window.DivineTemplates = {};

window.DivineTemplates['bolsa_papel'] = {
    id: 'bolsa_papel',
    name: 'Bolsa de Papel',
    desc: 'Bolsa de papel clásica con fondo plano y fuelles laterales. Perfecta para compras, regalos o entregas a domicilio.',
    coverImage: 'https://www.templatemaker.nl/assets/images/example/bag.jpeg', // Puedes cambiarlo por tu imagen
    assemblyText: 'Marca bien todos los dobleces (identificando valle y montaña). Aplica pegamento en la solapa lateral para formar un tubo. Luego pliega la base siguiendo los dobleces en diamante y asegura con pegamento. Finalmente, dobla el borde superior (doblez) hacia adentro para reforzar la apertura.',
    assemblyImages: [],
    exampleImages: [],
    params: [
        { id: 'L', type: 'dim', label: 'Largo', default: 80 },
        { id: 'W', type: 'dim', label: 'Ancho', default: 50 },
        { id: 'H', type: 'dim', label: 'Alto', default: 150 },
        { id: 'D', type: 'dim', label: 'Doblez', default: 20 },
        { id: 'G', type: 'opt', label: 'Tamaño solapa de encolado', default: 15 }
    ],
    render: function (inputs) {
        // Obtenemos los valores o usamos los default
        const L = parseFloat(inputs['L']) || 80;
        const W = parseFloat(inputs['W']) || 50;
        const H = parseFloat(inputs['H']) || 150;
        const D = parseFloat(inputs['D']) || 20;
        const G = parseFloat(inputs['G']) || 15;
        const margin = 20;

        // Cálculos estructurales
        const W2 = W / 2;
        const B = W2 + G; // El tamaño de la solapa de fondo siempre es la mitad del ancho + la pestaña de pegamento

        // Eje X (de izquierda a derecha)
        const X0 = margin;
        const X1 = X0 + G;
        const X1a = X1 + W2;
        const X2 = X1 + W;
        const X3 = X2 + L;
        const X3a = X3 + W2;
        const X4 = X3 + W;
        const X5 = X4 + L;

        // Eje Y (de arriba hacia abajo - Nota: la bolsa se dibuja con el fondo arriba y la apertura abajo, igual que tu SVG)
        const Y0 = margin;          // Borde superior del documento (borde de las solapas de fondo)
        const Y1 = Y0 + B;          // Línea de doblez de la base de la bolsa
        const Y1a = Y1 + W2;        // Línea central de los diamantes del fondo
        const Y1g = Y1 - G;         // Punto final del doblez en la pestaña de pegamento
        const Y2 = Y1 + H;          // Línea de la apertura superior
        const Y3 = Y2 + D;          // Borde inferior del documento (borde del doblez interior)

        // Tamaño total del SVG
        const tW = X5 + margin;
        const tH = Y3 + margin;

        // Estilos extraídos de tu SVG de Illustrator
        const cutStyle = `fill="none" stroke="#d41a5a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`;
        const valleyStyle = `fill="none" stroke="#28338e" stroke-width="1" stroke-dasharray="5,5" stroke-linecap="round"`;
        const mountainStyle = `fill="none" stroke="#0099a8" stroke-width="1" stroke-dasharray="10,4,2,4" stroke-linecap="round"`;

        // 1. LÍNEAS DE CORTE (Silueta exterior - Es un rectángulo perfecto en las bolsas de papel)
        let cut = `M ${X0},${Y0} H ${X5} V ${Y3} H ${X0} Z `;

        // 2. DOBLECES EN MONTAÑA (Hacia afuera)
        let mountain = "";
        // Horizontales
        mountain += `M ${X0},${Y1} H ${X5} `;
        mountain += `M ${X0},${Y2} H ${X5} `;
        mountain += `M ${X1a},${Y1a} H ${X2} `;
        mountain += `M ${X3},${Y1a} H ${X3a} `;
        // Verticales
        mountain += `M ${X1},${Y1} V ${Y2} `;
        mountain += `M ${X2},${Y1} V ${Y2} `;
        mountain += `M ${X3},${Y1} V ${Y2} `;
        mountain += `M ${X4},${Y1} V ${Y2} `;
        mountain += `M ${X1a},${Y2} V ${Y3} `;
        mountain += `M ${X3a},${Y2} V ${Y3} `;
        // Diagonales (solapas de fondo)
        mountain += `M ${X2},${Y1} L ${X2 + B},${Y0} `;
        mountain += `M ${X3},${Y1} L ${X3 - B},${Y0} `;
        mountain += `M ${X4},${Y1} L ${X4 + B},${Y0} `;
        mountain += `M ${X5},${Y1} L ${X5 - B},${Y0} `;
        mountain += `M ${X1},${Y1} L ${X0},${Y1g} `; // Pestaña inferior

        // 3. DOBLECES EN VALLE (Hacia adentro)
        let valley = "";
        // Horizontales
        valley += `M ${X2},${Y1a} H ${X3} `;
        // Verticales
        valley += `M ${X1},${Y0} V ${Y1} `;
        valley += `M ${X2},${Y0} V ${Y1} `;
        valley += `M ${X3},${Y0} V ${Y1} `;
        valley += `M ${X4},${Y0} V ${Y1} `;
        valley += `M ${X1a},${Y1a} V ${Y2} `; // Fuelle central
        valley += `M ${X3a},${Y1a} V ${Y2} `; // Fuelle central
        valley += `M ${X1},${Y2} V ${Y3} `; // Doblez superior
        valley += `M ${X2},${Y2} V ${Y3} `;
        valley += `M ${X3},${Y2} V ${Y3} `;
        valley += `M ${X4},${Y2} V ${Y3} `;
        // Diagonales (Diamantes laterales)
        valley += `M ${X1},${Y1} L ${X1a},${Y1a} L ${X2},${Y1} `;
        valley += `M ${X3},${Y1} L ${X3a},${Y1a} L ${X4},${Y1} `;

        // Ensamblado del SVG
        const svgCode = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tW} ${tH}" width="100%" height="100%">
                <path d="${valley}" ${valleyStyle} />
                <path d="${mountain}" ${mountainStyle} />
                <path d="${cut}" ${cutStyle} />
            </svg>
        `.trim();

        return { svg: svgCode, width: tW, height: tH };
    }
};