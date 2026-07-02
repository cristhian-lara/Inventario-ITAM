import PDFDocument from 'pdfkit-table';
import * as fs from 'fs';
import { AppDataSource } from '../database/postgres';
import { SettingEntity } from '../../../modules/settings/infrastructure/orm/Setting.entity';
import * as path from 'path';
import { IDocumentService, AssignmentDocumentData } from '../../contracts/IDocumentService';
import { SharePointService } from './SharePointService';

export class PdfKitService implements IDocumentService {
    private readonly storageDir = path.join(__dirname, '../../../../storage/pdfs');

    constructor() {
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
    }

    async generateAssignmentAct(data: AssignmentDocumentData): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({ margins: { top: 50, bottom: 180, left: 70, right: 50 }, size: 'A4', bufferPages: true });
                const prefix = data.actType === 'RETURN' ? 'pazysalvo' : 'acta';
                const safeName = data.collaboratorName ? data.collaboratorName.replace(/[^a-z0-9]/gi, '_') : 'Desconocido';
                const fileName = `${prefix}-${safeName}-${data.assignmentId}.pdf`;
                const filePath = path.join(this.storageDir, fileName);
                
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);

                const drawHeader = () => {
                    doc.fontSize(24).fillColor('#00a650').text('IKUSI', 70, 50, { continued: true });
                    doc.fontSize(14).fillColor('#999999').text(' velatia');
                    doc.moveDown(2);
                };

                drawHeader();

                const generalData = [
                    { c: 'Nombre de usuario', v: data.collaboratorName || 'N/A' },
                    { c: 'Correo electrónico', v: data.collaboratorEmail || 'N/A' },
                    { c: 'CECO', v: data.ceco || 'N/A' },
                    { c: 'Departamento', v: data.department || 'N/A' }
                ];

                if (data.actType === 'RETURN' && data.returnReason) {
                    generalData.push({ c: 'Motivo de devolución', v: data.returnReason });
                }

                const tableGeneral = {
                    title: 'Datos Generales',
                    headers: [{ label: 'Campo', property: 'c', width: 150 }, { label: 'Valor', property: 'v', width: 330 }],
                    datas: generalData
                };

                await doc.table(tableGeneral, {
                    width: 480, x: 70, hideHeader: true,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10).fillColor('black'),
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        doc.font('Helvetica').fontSize(9).fillColor('black');
                        if (indexColumn === 0) doc.font('Helvetica-Bold');
                    }
                });

                doc.moveDown(1);

                const tableAsignados = {
                    title: data.actType === 'RETURN' ? 'Activos Devueltos' : 'Activos Asignados',
                    headers: [
                        { label: 'Placa Ikusi', property: 'placa', width: 60 },
                        { label: 'Hostname', property: 'host', width: 70 },
                        { label: 'Categoria', property: 'cat', width: 70 },
                        { label: 'Marca', property: 'marca', width: 60 },
                        { label: 'Serial', property: 'serial', width: 80 },
                        { label: 'Modelo', property: 'modelo', width: 80 },
                        { label: 'Asignación', property: 'fecha', width: 60 }
                    ],
                    datas: data.assets.map(asset => ({
                        placa: asset.requiresPlacaIkusi ? asset.assetId : 'N/A',
                        host: asset.assetHostname || 'N/A',
                        cat: asset.assetType || 'N/A',
                        marca: asset.assetBrand || 'Generico',
                        serial: asset.assetSerial || 'N/A',
                        modelo: asset.assetModel || 'Generico',
                        fecha: data.timestamp.toLocaleDateString()
                    }))
                };

                await doc.table(tableAsignados, {
                    width: 480, x: 70,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('black'),
                    prepareRow: () => doc.font('Helvetica').fontSize(8).fillColor('black')
                });

                if (data.otherAssignedAssets && data.otherAssignedAssets.length > 0 && data.actType !== 'RETURN') {
                    doc.moveDown(1);
                    const tableOtrosActivos = {
                        title: 'Otros Activos Asignados al Colaborador',
                        headers: [
                            { label: 'Placa Ikusi', property: 'placa', width: 80 },
                            { label: 'Hostname', property: 'host', width: 80 },
                            { label: 'Categoría', property: 'cat', width: 80 },
                            { label: 'Marca', property: 'marca', width: 80 },
                            { label: 'S/N', property: 'serial', width: 80 },
                            { label: 'Modelo', property: 'modelo', width: 80 }
                        ],
                        datas: data.otherAssignedAssets
                    };

                    await doc.table(tableOtrosActivos, {
                        width: 480, x: 70,
                        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('black'),
                        prepareRow: () => doc.font('Helvetica').fontSize(8).fillColor('black')
                    });
                }

                doc.addPage();
                drawHeader();
                
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

                let customText = null;
                try {
                    const settingRepo = AppDataSource.getRepository(SettingEntity);
                    const key = data.actType === 'RETURN' ? 'ACTA_DEVOLUCION_TEXT' : 'ACTA_ASIGNACION_TEXT';
                    const setting = await settingRepo.findOneBy({ key });
                    if (setting && setting.value) customText = setting.value;
                } catch(e) { console.error('Error fetching custom text:', e); }

                const legalText = customText || (data.actType === 'RETURN' ? legalTextReturn : legalTextAssignment);
                doc.text(legalText, { align: 'justify', lineGap: 5 });

                const range = doc.bufferedPageRange();
                const cryptoType = data.actType === 'RETURN' ? 'Acta-Dev-Ikusi' : 'Acta-Asig-Ikusi';
                const userNameNormalized = data.collaboratorName || 'Usuario Asignado';
                const cryptoId = `${cryptoType}-${userNameNormalized}`;
                const signedBy = data.isForcedSignature ? 'Firmada por IT (firma forzada)' : (data.signatureEmail || data.collaboratorEmail || 'N/A');

                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    const bottom = doc.page.margins.bottom;
                    doc.page.margins.bottom = 0;
                    
                    const footerY = doc.page.height - 130;
                    doc.fontSize(10).font('Helvetica-Bold').fillColor('#00a650');
                    doc.text('DOCUMENTO FIRMADO DIGITALMENTE', 70, footerY, { lineBreak: false });
                    
                    doc.fontSize(9).fillColor('#000000').font('Helvetica');
                    doc.moveDown(1);
                    doc.text(`ID Asignación criptográfica: ${cryptoId}`, 70, doc.y);
                    doc.text(`Sede: ${data.sede || 'N/A'}`, 70, doc.y);
                    doc.text(`Firmada por: ${signedBy}`, 70, doc.y);

                    doc.save();
                    doc.rotate(-90, { origin: [30, doc.page.height - 50] });
                    doc.fontSize(8)
                       .fillColor('#999999')
                       .text('Calle 116 N° 7 - 15 Torre Cusezar Oficina 404, Bogotá Colombia Tel. (57) 6580300', 30, doc.page.height - 50, { width: 600, align: 'left', lineBreak: false });
                    doc.restore();

                    doc.page.margins.bottom = bottom;
                }

                doc.flushPages();
                doc.end();

                stream.on('finish', async () => {
                    const sharePointService = new SharePointService();
                    const folderName = data.actType === 'RETURN' ? 'Devoluciones' : 'Asignaciones';
                    await sharePointService.uploadPdf(filePath, fileName, folderName);
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
        return new Promise(async (resolve, reject) => {
            try {
                // Initialize PDFDocument from pdfkit-table with bufferPages and larger bottom margin for footer
                const doc = new PDFDocument({ margins: { top: 50, bottom: 120, left: 50, right: 50 }, size: 'A4', bufferPages: true });
                const safeName = record.collaboratorInTurnName ? record.collaboratorInTurnName.replace(/[^a-z0-9]/gi, '_') : 'Desconocido';
                const fileName = `acta_mantenimiento_${safeName}_${record.id}_${Date.now()}.pdf`;
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
                const brand = asset?.dynamicAttributes?.marca || asset?.dynamicAttributes?.brand || asset?.dynamicAttributes?.Marca || asset?.dynamicAttributes?.Brand || 'N/A';
                const model = asset?.dynamicAttributes?.modelo || asset?.dynamicAttributes?.model || asset?.dynamicAttributes?.Modelo || asset?.dynamicAttributes?.Model || 'N/A';
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
                        ['Fecha de Ejecución', record.executionDate ? new Date(record.executionDate).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO')]
                    ]
                };

                doc.table(tableMaintenance, { 
                    width: 500,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
                    prepareRow: () => doc.font('Helvetica').fontSize(10)
                });
                
                doc.moveDown(1.5);
                doc.fontSize(12).font('Helvetica-Bold').text('Motivo de Programación:');
                doc.moveDown(0.5);
                doc.fontSize(10).font('Helvetica').text(record.reason || 'N/A', { align: 'justify', lineGap: 3 });
                
                doc.moveDown(1.5);
                doc.fontSize(12).font('Helvetica-Bold').text('Diagnóstico de Inicio:');
                doc.moveDown(0.5);
                doc.fontSize(10).font('Helvetica').text(record.startNote || 'N/A', { align: 'justify', lineGap: 3 });
                
                doc.moveDown(1.5);
                doc.fontSize(12).font('Helvetica-Bold').text('Trabajo Realizado / Notas Finales:');
                doc.moveDown(0.5);
                doc.fontSize(10).font('Helvetica').text(record.notes || 'N/A', { align: 'justify', lineGap: 3 });

                doc.addPage();

                // --- PÁGINA 2: TEXTO LEGAL Y FIRMA ---
                doc.fontSize(24).fillColor('#00a650').text('IKUSI', 50, 50, { continued: true });
                doc.fontSize(14).fillColor('#999999').text(' velatia');
                
                doc.fontSize(10).fillColor('#000000').text(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }), { align: 'right' });
                doc.moveDown(2);

                doc.fontSize(11).font('Helvetica');
                const defaultLegalText = `Por medio de la presente, confirmo que he recibido de vuelta mi equipo y certifico que el servicio de mantenimiento detallado en la página anterior se ha realizado satisfactoriamente. Entiendo que debo notificar inmediatamente al área de Tecnología de la Información en caso de presentarse anomalías recurrentes relacionadas con este servicio.\n\nEl usuario certifica que al momento de la devolución, el equipo es operativo de acuerdo a lo expresado en los detalles técnicos de este acta, dándose por concluido el servicio programado.`;

                let customText = null;
                try {
                    const settingRepo = AppDataSource.getRepository(SettingEntity);
                    const setting = await settingRepo.findOneBy({ key: 'ACTA_MANTENIMIENTO_TEXT' });
                    if (setting && setting.value) customText = setting.value;
                } catch(e) { console.error('Error fetching custom text:', e); }

                const legalText = customText || defaultLegalText;
                doc.text(legalText, { align: 'justify', lineGap: 5 });
                doc.moveDown(3);

                // Firma electrónica manejada en el footer

                // DIBUJAR MARCA DE AGUA Y FIRMA DIGITAL EN TODAS LAS PÁGINAS AL FINAL
                // record signature metadata might be appended later, but we use what we have or placeholder
                const ipAddress = record.signatureMetadata?.ipAddress 
                    ? record.signatureMetadata.ipAddress 
                    : (signatureBase64 && signatureBase64.startsWith('Firma forzada') 
                        ? signatureBase64 
                        : 'Registrada en firma electrónica');
                
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    
                    const bottom = doc.page.margins.bottom;
                    doc.page.margins.bottom = 0;
                    
                    const footerY = doc.page.height - 130;
                    doc.fontSize(10).font('Helvetica-Bold').fillColor('#00a650');
                    doc.text('DOCUMENTO FIRMADO DIGITALMENTE', 70, footerY, { lineBreak: false });
                    
                    doc.fontSize(9).fillColor('#000000').font('Helvetica');
                    doc.moveDown(1);
                    const userNameNormalized = record.collaboratorInTurnName || 'Usuario Asignado';
                    const cryptoId = `Acta-Maint-Ikusi-${userNameNormalized}-${record.id}`;
                    doc.text(`ID Mantenimiento criptográfico: ${cryptoId}`, 70, doc.y);
                    doc.text(`Sede: ${record.collaboratorLocation || 'Bogotá'}`, 70, doc.y);
                    const isForced = signatureBase64 && signatureBase64.startsWith('Firma forzada');
                    const signedByText = isForced 
                        ? `${record.collaboratorInTurnName || 'Usuario Asignado'} (Firma Forzada por Administrador)` 
                        : (record.collaboratorInTurnName || 'Usuario Asignado');
                    doc.text(`Firmada por: ${signedByText}`, 70, doc.y);

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

                stream.on('finish', async () => {
                    const sharePointService = new SharePointService();
                    await sharePointService.uploadPdf(filePath, fileName, 'Mantenimientos');
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
