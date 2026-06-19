const { AppDataSource } = require('./src/shared/infrastructure/database/postgres');

async function main() {
    await AppDataSource.initialize();
    const assets = await AppDataSource.query('SELECT "dynamic_data" FROM assets LIMIT 10');
    console.log(JSON.stringify(assets, null, 2));
    process.exit(0);
}

main().catch(console.error);
