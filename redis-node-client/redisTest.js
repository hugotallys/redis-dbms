import chalk from 'chalk';
import { createClient } from 'redis';

const log = console.log;

const client = createClient();

client.on('error', (err) => log('Redis Client Error', err));

await client.connect();

let connInfo = parseConnectionInfo(
    await client.sendCommand(['CLIENT', 'LIST'])
);

info(`Servidor rodando no endereço ${connInfo.laddr}`);
info(`Base de dados selecionada é db=${connInfo.db}`);

log(chalk.yellow('\n[ pressione qualquer tecla para continuar, (q) para sair ]'));
info('Resetando a base de dados atual');
let msg = await command('FLUSHDB');
await response(msg);

let stations = [
    { key: 'stations:ca', value: { longitude: -122.27652, latitude: 37.805186, member: 'station:1' } },
    { key: 'stations:ca', value: { longitude: 122.26746,  latitude: 37.806234, member: 'station:2' } },
    { key: 'stations:ca', value: { longitude: -122.24698, latitude: 37.810404, member: 'station:3' } },
    { key: 'stations:ny', value: { longitude: -74.042402, latitude: 40.718098, member: 'station:4' } },
];

info('Adicionando registros na base de dados.');
for (const station of stations) {
    let int = await command(`GEOADD ${station.key} ${station.value.longitude} ${station.value.latitude} ${station.value.member}`);
    await response(`(integer ${int})`, false);
}
await response('');

info('Atualizando longitude do membro station:2 (índice stations:ca)');
stations[1].value.longitude = -stations[1].value.longitude;
let int = await command(`GEOADD ${stations[1].key} ${stations[1].value.longitude} ${stations[1].value.latitude} ${stations[1].value.member}`);
await response(`(integer ${int})`);

info('Renomeando índices');
for (let name of ['ca', 'ny']) {
    let oldName = `stations:${name}`;
    let newName = `stations:electric:${name}`;
    let msg = await command(`RENAME ${oldName} ${newName}`);
    await response(msg, false);
}
await response('');

info('Realizando consultas');
let pos = await command('GEOPOS stations:electric:ca station:1');
await response(`1) 1) "${pos[0][0]}"\n       2) "${pos[0][1]}"`, false)

let dists = await command('GEOSEARCH stations:electric:ca FROMLONLAT -122.2612767 37.7936847 BYRADIUS 2 km WITHDIST');
await response(
    `1) 1) "${dists[0][0]}"\n       2) "${dists[0][1]}"` +
    `\n    2) 1) "${dists[1][0]}"\n       2) "${dists[1][1]}"`, false
);

int = await command('GEOADD stations:gas:ny -74.0376913 40.7383154 station:5');
await response(`(integer ${int})`, false);

let query = await command('SCAN 0 MATCH *:*:ny');
await response(
    `1) "${query[0]}"` +
    `\n    2) 1) "${query[1][0]}"\n       2) "${query[1][1]}"`, false
);
await response('');

info('Removendo registro da base de dados');
int = await command('DEL stations:gas:ny');
await response(`(integer ${int})`);

info('Listando o índice final da base');
query = await command('SCAN 0');
await response(
    `1) "${query[0]}"` +
    `\n    2) 1) "${query[1][0]}"\n       2) "${query[1][1]}"`
);

info('Encerrando conexão com o servidor');
await client.quit();
process.exit();

async function keypress() {
    process.stdin.setRawMode(true)
    return new Promise(
        resolve => process.stdin.once('data', (key) => {
            if ( key.indexOf('q') == 0 || key.indexOf('Q') == 0 ) {
            process.exit();
            }
            process.stdin.setRawMode(false)
            resolve()
        })
    )
}

function parseConnectionInfo(connInfo) {
    const obj = {};
    connInfo = connInfo.replace('\n', '').split(' ').map((d) => d.split('='));
    for (const pair of connInfo) {
        obj[pair[0]] = pair[1];
    }
    return obj;
}

function info(msg) {
    log(chalk.green(`\n--> ${msg}`));
}

function command(cmd) {
    const orange = chalk.hex('#FFA500');
    log(`\n    ${chalk.blue(connInfo.laddr)}> ${orange(cmd)}`);
    return client.sendCommand(cmd.split(' '));
}

async function response(resp, freeze=true) {
    log(`    ${resp}`);
    if (freeze) {
        await keypress();
    }
}