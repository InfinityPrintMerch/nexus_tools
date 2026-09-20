// Variable global para evitar recargar las fuentes varias veces
let _poppinsFontsLoaded = false;

async function loadPdfFonts() {
    if (_poppinsFontsLoaded) return;
    try {
        const fontRegUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/poppins/Poppins-Regular.ttf';
        const fontBoldUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/poppins/Poppins-Bold.ttf';

        const [regRes, boldRes] = await Promise.all([fetch(fontRegUrl), fetch(fontBoldUrl)]);
        const [regBuffer, boldBuffer] = await Promise.all([regRes.arrayBuffer(), boldRes.arrayBuffer()]);

        const toBase64 = buffer => btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

        pdfMake.vfs = pdfMake.vfs || {};
        pdfMake.vfs['Poppins-Regular.ttf'] = toBase64(regBuffer);
        pdfMake.vfs['Poppins-Bold.ttf'] = toBase64(boldBuffer);

        pdfMake.fonts = {
            Poppins: {
                normal: 'Poppins-Regular.ttf',
                bold: 'Poppins-Bold.ttf',
                italics: 'Poppins-Regular.ttf',
                bolditalics: 'Poppins-Bold.ttf'
            }
        };
        _poppinsFontsLoaded = true;
    } catch (e) {
        console.warn("No se pudieron cargar fuentes Poppins. Usando Roboto por defecto.");
        pdfMake.fonts = { Poppins: { normal: 'Roboto', bold: 'Roboto', italics: 'Roboto', bolditalics: 'Roboto' } };
    }
}

async function getBase64ImageFromUrl(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return null;
    }
}

// Función auxiliar para dibujar contenedores redondeados
function roundedRect(x, y, width, height, radius, color) {
    return [
        {
            type: 'path',
            color: color,
            lineColor: color,
            d: `M ${x + radius} ${y} 
                L ${x + width - radius} ${y} 
                Q ${x + width} ${y} ${x + width} ${y + radius} 
                L ${x + width} ${y + height - radius} 
                Q ${x + width} ${y + height} ${x + width - radius} ${y + height} 
                L ${x + radius} ${y + height} 
                Q ${x} ${y + height} ${x} ${y + height - radius} 
                L ${x} ${y + radius} 
                Q ${x} ${y} ${x + radius} ${y} Z`
        }
    ];
}

// Generador Unificado: Dependiendo de "isNotaVenta", genera Cotización o Nota
async function generarDocumentoPDF(items, total, clientName, phone, projectName, deliveryDateStr, isNotaVenta = false, anticipo = 0, paymentMethod = "Transferencia") {
    await loadPdfFonts();
    const logoBase64 = await getBase64ImageFromUrl('assets/auro/logotipe.png');

    const primaryColor = '#6F8A3C';
    const lightBg = '#F8F9FA';
    const textColor = '#333333';
    const lightGreenBg = '#F2F5EB';

    const today = new Date();
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const dateStr = `${today.getDate().toString().padStart(2, '0')} / ${months[today.getMonth()]} / ${today.getFullYear()}`;

    // Obtener Folio para Nota de Venta (Cache)
    let folioStr = "";
    let docTitle = "";
    if (isNotaVenta) {
        docTitle = "Nota de Venta";
        let currentFolio = parseInt(localStorage.getItem('auroNotaFolio') || "1");
        folioStr = "NV-" + String(currentFolio).padStart(4, '0');
        localStorage.setItem('auroNotaFolio', (currentFolio + 1).toString()); // Auto-incremento
    } else {
        docTitle = "Cotización";
        folioStr = "COT-" + today.getFullYear() + "-" + String(Date.now()).slice(-4);
    }

    const hasThumbnails = items.some(i => i.thumbnail !== null);
    let tableWidths = hasThumbnails ? ['auto', 30, '*', 'auto', 'auto', 'auto', 'auto', 'auto'] : ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'];

    let tableHeader = [{ text: '#', fillColor: primaryColor, color: 'white', bold: true, alignment: 'center', margin: [0, 5, 0, 5] }];
    if (hasThumbnails) tableHeader.push({ text: 'Img', fillColor: primaryColor, color: 'white', bold: true, alignment: 'center', margin: [0, 5, 0, 5] });

    tableHeader.push(
        { text: 'Concepto', fillColor: primaryColor, color: 'white', bold: true, alignment: 'left', margin: [0, 5, 0, 5] },
        { text: 'Material', fillColor: primaryColor, color: 'white', bold: true, alignment: 'center', margin: [0, 5, 0, 5] },
        { text: 'Color', fillColor: primaryColor, color: 'white', bold: true, alignment: 'center', margin: [0, 5, 0, 5] },
        { text: 'Cant.', fillColor: primaryColor, color: 'white', bold: true, alignment: 'center', margin: [0, 5, 0, 5] },
        { text: 'P. Unitario', fillColor: primaryColor, color: 'white', bold: true, alignment: 'right', margin: [0, 5, 0, 5] },
        { text: 'Importe', fillColor: primaryColor, color: 'white', bold: true, alignment: 'right', margin: [0, 5, 0, 5] }
    );

    const tableBody = [tableHeader];

    items.forEach((item, index) => {
        const isOdd = index % 2 !== 0;
        const rowBg = isOdd ? '#F8F9FA' : null;
        let rowData = [{ text: (index + 1).toString(), alignment: 'center', fillColor: rowBg, margin: [0, 8, 0, 8], color: textColor }];

        if (hasThumbnails) {
            if (item.thumbnail) rowData.push({ image: item.thumbnail, width: 25, height: 25, alignment: 'center', fillColor: rowBg, margin: [0, 4, 0, 4] });
            else rowData.push({ text: '-', alignment: 'center', fillColor: rowBg, margin: [0, 8, 0, 8], color: '#a0a0a0' });
        }

        rowData.push(
            { text: item.name, alignment: 'left', fillColor: rowBg, margin: [0, 8, 0, 8], color: textColor },
            { text: item.material, alignment: 'center', fillColor: rowBg, margin: [0, 8, 0, 8], color: textColor },
            { text: item.color, alignment: 'center', fillColor: rowBg, margin: [0, 8, 0, 8], color: textColor },
            { text: item.quantity.toString(), alignment: 'center', fillColor: rowBg, margin: [0, 8, 0, 8], color: textColor },
            { text: '$' + item.price.toFixed(2), alignment: 'right', fillColor: rowBg, margin: [0, 8, 0, 8], color: textColor },
            { text: '$' + (item.price * item.quantity).toFixed(2), alignment: 'right', fillColor: rowBg, margin: [0, 8, 0, 8], color: textColor }
        );
        tableBody.push(rowData);
    });

    const saldoRestante = total - anticipo;

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 60],
        defaultStyle: { font: 'Poppins', fontSize: 10, color: textColor },
        footer: function (currentPage, pageCount) {
            return {
                margin: [40, 0, 40, 0],
                table: {
                    widths: ['*'],
                    body: [[{
                        border: [false, true, false, false],
                        borderColor: ['#E2E8F0', '#E2E8F0', '#E2E8F0', '#E2E8F0'],
                        paddingTop: 10,
                        columns: [
                            { width: '*', stack: [{ text: 'Gracias por confiar en AURO STUDIO', bold: true, fontSize: 10 }, { text: 'Juntos hacemos que las ideas tomen forma.', color: '#718096', fontSize: 9 }] },
                            { width: 'auto', text: [{ text: 'IG: ', color: '#718096' }, { text: '@auro.studio.mx', color: primaryColor, bold: true }, { text: '   |   FB: ', color: '#718096' }, { text: '@auro.studio.mx', color: primaryColor, bold: true }], alignment: 'right', margin: [0, 5, 0, 0] }
                        ]
                    }]]
                },
                layout: 'noBorders'
            };
        },
        content: [
            {
                columns: [
                    logoBase64 ? { image: logoBase64, width: 140 } : { text: 'AURO STUDIO', fontSize: 24, bold: true, color: primaryColor, width: 140 },
                    {
                        width: '*',
                        columns: [
                            { width: '*', text: '' },
                            {
                                width: 'auto',
                                margin: [0, 0, 10, 0],
                                stack: [
                                    {
                                        canvas: roundedRect(0, 0, 90, 40, 8, lightBg),
                                        absolutePosition: { x: 300, y: 40 } // Adjust position as needed
                                    },
                                    {
                                        stack: [{ text: 'Folio', fontSize: 9, color: '#718096' }, { text: folioStr, bold: true, fontSize: 11 }],
                                        margin: [10, 5, 10, 5],
                                        alignment: 'center'
                                    }
                                ]
                            },
                            {
                                width: 'auto',
                                stack: [
                                    {
                                        canvas: roundedRect(0, 0, 100, 40, 8, lightBg),
                                        absolutePosition: { x: 400, y: 40 } // Adjust position as needed
                                    },
                                    {
                                        stack: [{ text: 'Fecha', fontSize: 9, color: '#718096' }, { text: dateStr, bold: true, fontSize: 11 }],
                                        margin: [10, 5, 10, 5],
                                        alignment: 'center'
                                    }
                                ]
                            }
                        ]
                    }
                ],
                alignment: 'center'
            },
            { margin: [0, 12, 0, 15], canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: primaryColor }] },
            { text: docTitle, fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
            {
                stack: [
                    {
                        canvas: roundedRect(0, 0, 515, 45, 8, lightGreenBg),
                        absolutePosition: { x: 40, y: 135 } // Adjust position as needed
                    },
                    {
                        columns: [
                            { width: '33%', stack: [{ text: 'Cliente', fontSize: 9, color: primaryColor }, { text: clientName, bold: true, fontSize: 11 }], margin: [15, 6, 5, 6] },
                            { width: '34%', stack: [{ text: 'Teléfono', fontSize: 9, color: primaryColor }, { text: phone, bold: true, fontSize: 11 }], margin: [10, 6, 5, 6] },
                            { width: '33%', stack: [{ text: 'Proyecto', fontSize: 9, color: primaryColor }, { text: projectName, bold: true, fontSize: 11 }], margin: [10, 6, 15, 6] }
                        ]
                    }
                ],
                margin: [0, 0, 0, 25]
            },
            {
                table: { headerRows: 1, widths: tableWidths, body: tableBody },
                layout: {
                    hLineWidth: function (i, node) {
                        return (i === 0 || i === node.table.body.length) ? 0 : 0.5;
                    },
                    vLineWidth: function (i, node) {
                        return 0; // Remove vertical lines
                    },
                    hLineColor: function (i, node) {
                        return (i === 1) ? primaryColor : '#E2E8F0'; // Thicker line under header
                    },
                    paddingLeft: function (i, node) { return 5; },
                    paddingRight: function (i, node) { return 5; },
                    fillColor: function (rowIndex, node, columnIndex) {
                        return (rowIndex === 0) ? primaryColor : null;
                    },
                    defaultBorder: false,
                    // Draw top and bottom borders with rounded corners for the whole table
                    tableBorder: [
                        {
                            hLine: true,
                            vLine: true,
                            lineWidth: 0.5,
                            lineColor: '#E2E8F0',
                            borderRadius: 8
                        }
                    ]
                },
                margin: [0, 0, 0, 20]
            },
            {
                columns: [
                    {
                        width: '40%',
                        stack: [
                            {
                                canvas: roundedRect(0, 0, 200, 60, 8, lightBg),
                                absolutePosition: { x: 40, y: 350 } // Adjust position based on content length
                            },
                            {
                                margin: [15, 10, 15, 10],
                                stack: isNotaVenta ? [
                                    { text: 'Detalles de Pago', bold: true, fontSize: 11 },
                                    { text: 'Método de pago: ' + paymentMethod, color: '#4A5568', fontSize: 10, margin: [0, 3, 0, 0] }
                                ] : [
                                    { text: '¿Necesitas algún ajuste?', bold: true, fontSize: 11 },
                                    { text: 'Podemos personalizar materiales, colores o cantidades según tus necesidades.', color: '#4A5568', fontSize: 10, margin: [0, 3, 0, 0] }
                                ]
                            }
                        ]
                    },
                    { width: '10%', text: '' },
                    {
                        width: '50%',
                        stack: [
                            { columns: [{ text: 'Subtotal', fontSize: 11 }, { text: '$' + total.toFixed(2), fontSize: 11, bold: true, alignment: 'right' }], margin: [0, 0, 0, 5] },
                            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 250, y2: 0, lineWidth: 0.5, lineColor: '#E2E8F0' }], margin: [0, 0, 0, 5] },
                            { columns: [{ text: 'Anticipo', fontSize: 11 }, { text: '-$' + anticipo.toFixed(2), fontSize: 11, bold: true, alignment: 'right' }], margin: [0, 0, 0, 10] },
                            {
                                stack: [
                                    {
                                        canvas: roundedRect(0, 0, 250, 40, 8, lightGreenBg),
                                        absolutePosition: { x: 265, y: 410 } // Adjust position as needed
                                    },
                                    {
                                        margin: [10, 8, 10, 8],
                                        columns: [
                                            { text: isNotaVenta ? 'Saldo Restante' : 'Total a Pagar', bold: true, fontSize: 14, margin: [0, 2, 0, 0] },
                                            { text: '$' + saldoRestante.toFixed(2), bold: true, fontSize: 16, alignment: 'right' }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ],
                margin: [0, 0, 0, 40]
            },
            {
                columns: [
                    {
                        width: '50%',
                        stack: [
                            { text: 'Fecha estimada de entrega', bold: true, fontSize: 11, margin: [0, 0, 0, 5] },
                            { text: deliveryDateStr ? deliveryDateStr : "A coordinar", bold: true, fontSize: 10, color: primaryColor },
                            { text: 'A partir de la confirmación.', fontSize: 9, color: '#718096' }
                        ]
                    },
                    {
                        width: '50%',
                        stack: [
                            { text: 'Términos', bold: true, fontSize: 11, margin: [0, 0, 0, 5] },
                            { text: '- Se requiere un anticipo para iniciar.', fontSize: 10, color: '#4A5568', margin: [0, 0, 0, 3] },
                            { text: '- El saldo se liquida contra entrega.', fontSize: 10, color: '#4A5568', margin: [0, 0, 0, 3] },
                            { text: '- Los precios incluyen IVA.', fontSize: 10, color: '#4A5568' }
                        ]
                    }
                ]
            }
        ]
    };

    pdfMake.createPdf(docDefinition).download((isNotaVenta ? 'NotaVenta_' : 'Cotizacion_') + projectName.replace(/\s+/g, '_') + '.pdf');
}