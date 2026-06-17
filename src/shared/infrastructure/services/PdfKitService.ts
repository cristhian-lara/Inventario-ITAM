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
                    doc.text(`Nombre: ${data.collaboratorName || 'Usuario Asignado'}`, 50, footerY + 60, { lineBreak: false });

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

    public async generateMaintenanceAct(record: any, asset: any, signatureBase64: string, categoryName?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                // Initialize PDFDocument from pdfkit-table with bufferPages and larger bottom margin for footer
                const doc = new PDFDocument({ margins: { top: 50, bottom: 120, left: 50, right: 50 }, size: 'A4', bufferPages: true });
                const fileName = `acta_mantenimiento_${record.id}_${Date.now()}.pdf`;
                const filePath = path.join(this.storageDir, fileName);
                
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);

                // --- PÁGINA 1: DATOS GENERALES ---
                doc.fontSize(24).fillColor('#00a650').text('IKUSI', 50, 50, { continued: true });
                doc.fontSize(14).fillColor('#999999').text(' velatia');
                doc.moveDown(2);

                doc.fontSize(16).fillColor('#000000').font('Helvetica-Bold').text('ACTA DE MANTENIMIENTO TÉCNICO', { align: 'center' });
                doc.moveDown(1.5);

                const category = categoryName || asset?.category?.name || 'EQUIPO';
                const brand = asset?.dynamicAttributes?.marca || asset?.dynamicAttributes?.brand || 'N/A';
                const model = asset?.dynamicAttributes?.modelo || asset?.dynamicAttributes?.model || 'N/A';
                const serial = asset?.serial || asset?.serialNumber || 'N/A';

                const tableGeneral = {
                    title: 'Datos del Equipo',
                    headers: ['Placa Ikusi', 'Tipo', 'Producto', 'Serie', 'Modelo'],
                    rows: [
                        [record.assetId, category, brand, serial, model]
                    ]
                };

                doc.table(tableGeneral, { 
                    width: 500,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
                    prepareRow: () => doc.font('Helvetica').fontSize(10)
                });
                
                doc.moveDown(1);

                const tableMaintenance = {
                    title: 'Detalles del Servicio',
                    headers: ['Campo', 'Detalle'],
                    rows: [
                        ['Tipo de Mantenimiento', record.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo'],
                        ['Usuario en Turno', record.collaboratorInTurnName || 'N/A'],
                        ['Fecha de Ejecución', record.executionDate ? new Date(record.executionDate).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO')],
                        ['Diagnóstico / Falla', record.reason || 'N/A'],
                        ['Trabajo Realizado', record.notes || 'N/A']
                    ]
                };

                doc.table(tableMaintenance, { 
                    width: 500,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
                    prepareRow: () => doc.font('Helvetica').fontSize(10)
                });

                doc.addPage();

                // --- PÁGINA 2: TEXTO LEGAL Y FIRMA ---
                doc.fontSize(24).fillColor('#00a650').text('IKUSI', 50, 50, { continued: true });
                doc.fontSize(14).fillColor('#999999').text(' velatia');
                
                doc.fontSize(10).fillColor('#000000').text(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }), { align: 'right' });
                doc.moveDown(2);

                doc.fontSize(11).font('Helvetica');
                const legalText = `Por medio de la presente, confirmo que he recibido de vuelta mi equipo y certifico que el servicio de mantenimiento detallado en la página anterior se ha realizado satisfactoriamente. Entiendo que debo notificar inmediatamente al área de Tecnología de la Información en caso de presentarse anomalías recurrentes relacionadas con este servicio.

El usuario certifica que al momento de la devolución, el equipo es operativo de acuerdo a lo expresado en los detalles técnicos de este acta, dándose por concluido el servicio programado.`;

                doc.text(legalText, { align: 'justify', lineGap: 5 });
                doc.moveDown(3);

                // Firma electrónica manejada en el footer

                // DIBUJAR MARCA DE AGUA Y FIRMA DIGITAL EN TODAS LAS PÁGINAS AL FINAL
                // record signature metadata might be appended later, but we use what we have or placeholder
                const ipAddress = record.signatureMetadata?.ipAddress || 'Registrada en firma electrónica';
                
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    
                    const bottom = doc.page.margins.bottom;
                    doc.page.margins.bottom = 0;
                    
                    const footerY = doc.page.height - 110;
                    doc.fontSize(8).font('Helvetica-Bold').fillColor('#00a650');
                    doc.text('DOCUMENTO FIRMADO DIGITALMENTE', 50, footerY, { lineBreak: false });
                    
                    doc.fontSize(8).fillColor('#000000').font('Helvetica');
                    doc.text(`Localidad: Bogotá`, 50, footerY + 12, { lineBreak: false });
                    doc.text(`Tipo de Documento: Acta de Mantenimiento`, 50, footerY + 24, { lineBreak: false });
                    doc.text(`ID Mantenimiento Criptográfico: ${record.id}`, 50, footerY + 36, { lineBreak: false });
                    doc.text(`Firma IP Registrada: ${ipAddress}`, 50, footerY + 48, { lineBreak: false });
                    doc.text(`Nombre: ${record.collaboratorInTurnName || 'Usuario Asignado'}`, 50, footerY + 60, { lineBreak: false });

                    // Marca de agua lateral
                    doc.save();
                    doc.rotate(-90, { origin: [30, doc.page.height - 50] });
                    doc.fontSize(8)
                       .fillColor('#999999')
                       .text('Calle 116 N° 7 - 15 Torre Cusezar Oficina 404, Bogotá Colombia Tel. (57) 6580300', 30, doc.page.height - 50, { width: 500, align: 'left', lineBreak: false });
                    doc.restore();

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
}
