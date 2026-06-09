import PDFDocument from 'pdfkit-table';
import * as fs from 'fs';
import * as path from 'path';
import { IDocumentService, AssignmentDocumentData } from '../../contracts/IDocumentService';

export class PdfKitService implements IDocumentService {
    private readonly storageDir = path.join(__dirname, '../../../../storage/pdfs');

    constructor() {
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
    }

    async generateAssignmentAct(data: AssignmentDocumentData): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                // Initialize PDFDocument from pdfkit-table with bufferPages and larger bottom margin for footer
                const doc = new PDFDocument({ margins: { top: 50, bottom: 120, left: 50, right: 50 }, size: 'A4', bufferPages: true });
                const prefix = data.actType === 'RETURN' ? 'pazysalvo' : 'acta';
                const fileName = `${prefix}-${data.assignmentId}.pdf`;
                const filePath = path.join(this.storageDir, fileName);
                
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);

                // --- PÁGINA 1: DATOS GENERALES ---
                
                // Header (Logo placeholder)
                doc.fontSize(24).fillColor('#00a650').text('IKUSI', 50, 50, { continued: true });
                doc.fontSize(14).fillColor('#999999').text(' velatia');
                doc.moveDown(2);

                // Tabla: Datos Generales
                const tableGeneral = {
                    title: 'Datos Generales',
                    headers: ['', ''],
                    rows: [
                        ['Nombre de usuario', data.collaboratorName],
                        ['Nombre de equipo', data.assetModel],
                        ['Mac address', data.assetMac],
                        ['Dominio', 'Velatia.Local'],
                        ['Departamento', data.department],
                        ['Correo electrónico', data.collaboratorEmail]
                    ]
                };

                doc.table(tableGeneral, { 
                    width: 500,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
                    prepareRow: () => doc.font('Helvetica').fontSize(10)
                });
                
                doc.moveDown(1);

                // Tabla: Herramientas de trabajo
                const tableTools = {
                    title: 'Herramientas de trabajo',
                    headers: ['Tipo', 'Características', 'Valor', 'Descripción'],
                    rows: [
                        ['Computador', 'Ram', data.assetRam, 'N/A'],
                        ['', 'Procesador', data.assetProcessor, ''],
                        ['', 'SSD', data.assetStorage, ''],
                        ['Teléfono', 'Cisco', 'N/A', ''],
                        ['', 'Otro', 'N/A', '']
                    ]
                };

                doc.table(tableTools, { 
                    width: 500,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
                    prepareRow: () => doc.font('Helvetica').fontSize(10)
                });
                doc.addPage();

                // --- PÁGINA 2: HARDWARE ---

                doc.fontSize(24).fillColor('#00a650').text('IKUSI', 50, 50, { continued: true });
                doc.fontSize(14).fillColor('#999999').text(' velatia');
                doc.moveDown(2);

                let tableHardware: any;
                if (data.requiresPlacaIkusi === false) {
                    tableHardware = {
                        title: 'HARDWARE (PERIFÉRICO)',
                        headers: ['Tipo', 'Producto', 'Serie', 'Modelo', 'Asignación'],
                        rows: [
                            [data.assetType, 'EQUIPO', data.assetSerial, data.assetModel, data.timestamp.toLocaleDateString()]
                        ]
                    };
                } else {
                    tableHardware = {
                        title: 'HARDWARE',
                        headers: ['Placa Ikusi', 'Tipo', 'Producto', 'Serie', 'Modelo', 'Asignación'],
                        rows: [
                            [data.assetId, data.assetType, 'EQUIPO', data.assetSerial, data.assetModel, data.timestamp.toLocaleDateString()]
                        ]
                    };
                }

                // The background for title should be green, but pdfkit-table has limitations. We use default styling.
                doc.table(tableHardware, { 
                    width: 500,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
                    prepareRow: () => doc.font('Helvetica').fontSize(10)
                });
                doc.addPage();

                // --- PÁGINA 3: TEXTO LEGAL ---

                doc.fontSize(24).fillColor('#00a650').text('IKUSI', 50, 50, { continued: true });
                doc.fontSize(14).fillColor('#999999').text(' velatia');
                
                doc.fontSize(10).fillColor('#000000').text(data.timestamp.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }), { align: 'right' });
                doc.moveDown(2);

                doc.fontSize(11).font('Helvetica');
                const legalTextAssignment = `Mediante la presente hago constar que recibí del área de Tecnología de información el equipo de cómputo en la siguiente página. Me han asignado para facilitar el desempeño de mis funciones, comprometiéndome a destinarlo solo para fines de trabajo y cuidados para su buen funcionamiento y conservación. Cabe señalar que, de existir algún daño físico del equipo imputable a negligencia, acepto la responsabilidad en la reparación de estos.

De la misma forma que estoy enterado del compromiso de no instalar software adicional al que tiene el equipo sin previa NOTIFICACION Y AUTORIZACION DEL DEPARTAMENTO DE TI. Haciéndome responsable de las sanciones que pudiera dar lugar por dicha instalación.

Los gastos derivados de la reparación y/o remplazo de los equipos de cómputo por daños sufridos como consecuencias de negligencia o descuido por mi parte será de mi entera responsabilidad y son susceptibles de serme repercutidos.

En caso de robo del equipo, es obligatoria del empleado entregar al departamento de TI copia del acta levantada para poder proceder al trámite de seguro.

Cabe señalar que al dar terminada mi relación laboral dentro de IKUSI Redes Colombia, S.A.S. de C. V. me obligo a entregar el equipo en buenas condiciones, (incluyendo toda la información generada por mis actividades) al departamento de TI para que sea dada de baja esta RESPONSIVA.

La empresa se reserva el derecho de solicitar al empleado en cualquier momento el equipo para su auditoria y/o revisión.`;

                const legalTextReturn = `Mediante la presente, el colaborador hace entrega formal al área de Tecnología de la Información del equipo de cómputo listado en este documento, el cual le fue asignado previamente para el desempeño de sus funciones.

Se deja constancia de que el equipo ha sido revisado por el departamento de TI, validando su estado físico y de funcionamiento actual. Al firmar este documento de Paz y Salvo, el colaborador queda exento de cualquier responsabilidad futura relacionada con el cuidado, conservación o daños del hardware aquí mencionado.

Asimismo, el colaborador certifica que ha entregado los accesorios asociados (cargador, maletín, etc.) y que no retiene información confidencial de IKUSI Redes Colombia, S.A.S. de C. V. en medios de almacenamiento personales derivada del uso de este equipo.

Este documento cancela la responsiva firmada en el momento de la asignación original, dando de baja la responsabilidad del empleado sobre los activos relacionados.`;

                const legalText = data.actType === 'RETURN' ? legalTextReturn : legalTextAssignment;

                doc.text(legalText, { align: 'justify', lineGap: 5 });

                // DIBUJAR MARCA DE AGUA Y FIRMA DIGITAL EN TODAS LAS PÁGINAS AL FINAL
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    
                    // Temporarily disable bottom margin to prevent auto page breaks
                    const bottom = doc.page.margins.bottom;
                    doc.page.margins.bottom = 0;
                    
                    // --- Firma Digital al final de la página ---
                    const footerY = doc.page.height - 110;
                    doc.fontSize(8).font('Helvetica-Bold').fillColor('#00a650');
                    doc.text('DOCUMENTO FIRMADO DIGITALMENTE', 50, footerY, { lineBreak: false });
                    
                    doc.fontSize(8).fillColor('#000000').font('Helvetica');
                    doc.text(`Localidad: Bogotá`, 50, footerY + 12, { lineBreak: false });
                    doc.text(`Departamento: ${data.department}`, 50, footerY + 24, { lineBreak: false });
                    doc.text(`ID Asignación Criptográfica: ${data.assignmentId}`, 50, footerY + 36, { lineBreak: false });
                    doc.text(`Firma IP Registrada: ${data.ipAddress}`, 50, footerY + 48, { lineBreak: false });

                    // --- Marca de agua lateral ---
                    doc.save();
                    doc.rotate(-90, { origin: [30, doc.page.height - 50] });
                    doc.fontSize(8)
                       .fillColor('#999999')
                       .text('Calle 116 N° 7 - 15 Torre Cusezar Oficina 404, Bogotá Colombia Tel. (57) 6580300', 30, doc.page.height - 50, { width: 500, align: 'left', lineBreak: false });
                    doc.restore();

                    // Restore margin
                    doc.page.margins.bottom = bottom;
                }

                doc.flushPages();
                doc.end();

                stream.on('finish', () => {
                    resolve(`/pdfs/${fileName}`);
                });

                stream.on('error', (err) => {
                    reject(err);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    public async generateMaintenanceAct(record: any, asset: any, signatureBase64: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const fs = require('fs');
                const path = require('path');
                const PDFDocument = require('pdfkit');

                // Asegurar que el directorio pdfs existe
                const pdfsDir = path.join(process.cwd(), 'public', 'pdfs');
                if (!fs.existsSync(pdfsDir)) {
                    fs.mkdirSync(pdfsDir, { recursive: true });
                }

                const fileName = `acta_mantenimiento_${record.id}_${Date.now()}.pdf`;
                const filePath = path.join(pdfsDir, fileName);

                const doc = new PDFDocument({ margin: 50 });
                const stream = fs.createWriteStream(filePath);

                doc.pipe(stream);

                // Colores y Fuentes de Ikusi
                const primaryColor = '#004b87'; // Azul Ikusi
                const secondaryColor = '#e3000f'; // Rojo Ikusi (si se necesita)
                const textColor = '#333333';

                // --- HEADER ---
                // Logo de Ikusi
                const logoPath = path.join(process.cwd(), 'public', 'ikusi-logo.png'); // Asegúrate de tener el logo localmente
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, 50, 45, { width: 120 });
                } else {
                    // Texto por defecto si no hay logo
                    doc.fontSize(20).fillColor(primaryColor).text('IKUSI', 50, 50);
                }

                doc.fontSize(24).fillColor(primaryColor).text('ACTA DE MANTENIMIENTO', 50, 110, { align: 'center' });
                doc.moveDown(2);

                // --- INFORMACIÓN GENERAL ---
                doc.fontSize(14).fillColor(primaryColor).text('DATOS DEL ACTIVO', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(11).fillColor(textColor);
                
                doc.text(`Placa Ikusi: `, { continued: true }).font('Helvetica-Bold').text(record.assetId);
                doc.font('Helvetica').text(`Nombre: `, { continued: true }).font('Helvetica-Bold').text(asset ? asset.name : 'N/A');
                doc.font('Helvetica').text(`Modelo: `, { continued: true }).font('Helvetica-Bold').text(asset ? (asset.model || 'N/A') : 'N/A');
                doc.font('Helvetica').text(`Número de Serie: `, { continued: true }).font('Helvetica-Bold').text(asset ? (asset.serialNumber || 'N/A') : 'N/A');
                doc.moveDown(1.5);

                // --- DETALLES DEL MANTENIMIENTO ---
                doc.fontSize(14).fillColor(primaryColor).text('DETALLES DEL MANTENIMIENTO', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(11).fillColor(textColor);
                
                doc.font('Helvetica').text(`ID Mantenimiento: `, { continued: true }).font('Helvetica-Bold').text(record.id);
                doc.font('Helvetica').text(`Tipo: `, { continued: true }).font('Helvetica-Bold').text(record.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo');
                doc.font('Helvetica').text(`Fecha Ejecución: `, { continued: true }).font('Helvetica-Bold').text(record.executionDate ? new Date(record.executionDate).toLocaleDateString() : 'N/A');
                doc.font('Helvetica').text(`Usuario en Turno: `, { continued: true }).font('Helvetica-Bold').text(record.collaboratorInTurnName || 'N/A');
                doc.moveDown(1);
                
                doc.font('Helvetica').text('Notas de Cierre:', { underline: true });
                doc.moveDown(0.5);
                doc.font('Helvetica-Oblique').fillColor('#555555').text(record.notes || 'Sin notas registradas.');
                doc.moveDown(2);

                // --- DECLARACIÓN DE CONFORMIDAD ---
                doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold').text('DECLARACIÓN DE CONFORMIDAD');
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor(textColor).font('Helvetica').text(
                    'Por medio de la presente, confirmo que he recibido de vuelta mi equipo y certifico que el servicio de mantenimiento descrito anteriormente se ha realizado satisfactoriamente. Entiendo que debo notificar inmediatamente a TI en caso de presentarse anomalías relacionadas con este servicio.',
                    { align: 'justify' }
                );
                doc.moveDown(3);

                // --- FIRMA DIGITAL ---
                if (signatureBase64 && signatureBase64.startsWith('data:image')) {
                    // Extraer data
                    const base64Data = signatureBase64.split(';base64,').pop();
                    const signatureBuffer = Buffer.from(base64Data as string, 'base64');
                    
                    doc.image(signatureBuffer, 50, doc.y, { width: 200 });
                    doc.moveDown(4); // Dar espacio para la imagen
                }

                // Línea y Nombre
                const signatureY = doc.y;
                doc.moveTo(50, signatureY).lineTo(250, signatureY).strokeColor(primaryColor).stroke();
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor(textColor).font('Helvetica-Bold').text(record.collaboratorInTurnName || 'Usuario Asignado', 50, doc.y);
                doc.font('Helvetica').fillColor('#666666').text(`Firmado el: ${new Date().toLocaleString()}`, 50, doc.y);
                
                // --- FOOTER ---
                doc.fontSize(8).fillColor('#999999').text(
                    'Documento generado por el Sistema de Inventario Ikusi.',
                    50,
                    doc.page.height - 50,
                    { align: 'center', width: doc.page.width - 100 }
                );

                doc.end();

                stream.on('finish', () => {
                    resolve(`/pdfs/${fileName}`);
                });

                stream.on('error', (err: any) => {
                    reject(err);
                });

            } catch (error) {
                reject(error);
            }
        });
    }
}
