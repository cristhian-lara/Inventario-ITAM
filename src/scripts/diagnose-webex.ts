/**
 * Diagnóstico de las notificaciones de Webex, para correr en el servidor donde
 * fallan. Es de solo lectura salvo que se pida una prueba de envío explícita.
 *
 * NUNCA imprime el token: solo su longitud y los primeros caracteres, lo justo
 * para distinguir "vacío" de "presente pero inválido".
 *
 * Comprueba, en orden:
 *   1. Que la variable llegue realmente al proceso (no basta con estar en .env:
 *      si el archivo está cifrado con dotenvx y falta la clave privada, la
 *      variable llega vacía y el servicio pasa a modo simulación sin avisar).
 *   2. Que el token siga siendo válido, consultando /v1/people/me.
 *   3. Que BACKEND_URL esté definido: es la base de los enlaces de firma, y si
 *      apunta mal el mensaje sale pero el enlace no sirve.
 *   4. Opcional: envía un mensaje de prueba a un correo.
 *
 * Uso:
 *   npx ts-node src/scripts/diagnose-webex.ts
 *   npx ts-node src/scripts/diagnose-webex.ts --enviar-a=alguien@ikusi.com
 */

import * as dotenv from 'dotenv';

// Igual que el resto de la app: sin esto el script no vería el .env y reportaría
// "token ausente" en un servidor donde sí está configurado.
dotenv.config();

function mask(value: string): string {
    if (!value) return '(vacío)';
    if (value.length <= 8) return `${value.length} caracteres`;
    return `${value.slice(0, 6)}…${value.slice(-2)} (${value.length} caracteres)`;
}

async function main() {
    const destino = process.argv.find(a => a.startsWith('--enviar-a='))?.split('=')[1];

    console.log('\n═══ Diagnóstico de Webex ═══\n');

    // 1. ¿La variable llegó al proceso?
    const token = process.env.WEBEX_BOT_TOKEN || '';
    console.log('1) WEBEX_BOT_TOKEN en el proceso');
    console.log(`   Valor: ${mask(token)}`);
    if (!token) {
        console.log('   ✘ La variable NO llegó al proceso.');
        console.log('     El servicio entra en modo simulación: escribe en consola y no envía nada.');
        console.log('     Revisa que la línea no esté comentada ni vacía en .env, y que el archivo');
        console.log('     se cargue con la misma herramienta y clave con la que fue cifrado.');
        process.exit(1);
    }
    console.log('   ✔ Presente.');

    // 2. ¿El token sirve?
    console.log('\n2) Validez del token (GET /v1/people/me)');
    try {
        const resp = await fetch('https://webexapis.com/v1/people/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.ok) {
            const me: any = await resp.json();
            console.log(`   ✔ Token válido. Bot: ${me.displayName} <${(me.emails || []).join(', ')}>`);
            console.log(`     Tipo de cuenta: ${me.type}`);
        } else {
            const body = await resp.text();
            console.log(`   ✘ Webex respondió ${resp.status}.`);
            if (resp.status === 401) {
                console.log('     401 = token expirado o revocado. Los tokens personales de Webex');
                console.log('     caducan; los de bot no, pero pueden revocarse. Genera uno nuevo.');
            }
            console.log(`     Respuesta: ${body.slice(0, 300)}`);
            process.exit(1);
        }
    } catch (e: any) {
        console.log(`   ✘ No se pudo contactar la API: ${e.message}`);
        console.log('     Suele ser salida a internet bloqueada o proxy sin configurar en el servidor.');
        process.exit(1);
    }

    // 3. Base de los enlaces de firma
    console.log('\n3) BACKEND_URL (base de los enlaces de firma)');
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
        console.log('   ⚠ No definido: los enlaces saldrán como http://localhost:3000 y no servirán');
        console.log('     fuera del servidor. Defínelo con la URL que usan los colaboradores.');
    } else {
        console.log(`   ✔ ${backendUrl}`);
        if (backendUrl.includes('localhost')) {
            console.log('   ⚠ Apunta a localhost: el mensaje sale, pero el enlace no abre desde otro equipo.');
        }
    }

    // 4. Envío de prueba
    if (destino) {
        console.log(`\n4) Enviando mensaje de prueba a ${destino}`);
        const resp = await fetch('https://webexapis.com/v1/messages', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                toPersonEmail: destino,
                markdown: '**Prueba de conectividad del inventario ITAM.** Si recibes esto, las notificaciones funcionan.'
            })
        });
        if (resp.ok) {
            console.log('   ✔ Mensaje entregado a la API. Revisa el Webex del destinatario.');
        } else {
            console.log(`   ✘ Falló con ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
            console.log('     Un 400 aquí suele ser destinatario inexistente en el directorio de Webex.');
        }
    } else {
        console.log('\n4) Envío de prueba omitido.');
        console.log('   Añade --enviar-a=correo@ikusi.com para probar una entrega real.');
    }

    console.log('\n═══ Fin ═══\n');
}

main().catch(err => {
    console.error('❌ Error inesperado:', err?.message || err);
    process.exit(1);
});
