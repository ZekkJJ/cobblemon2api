const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const clearDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('❌ MONGODB_URI is not defined in .env');
            process.exit(1);
        }

        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected.');

        const dbName = mongoose.connection.db.databaseName;
        console.log(`⚠️  PREPARING TO DELETE DATABASE: ${dbName}`);
        console.log('⚠️  This action is IRREVERSIBLE.');

        // Drop the database
        await mongoose.connection.db.dropDatabase();
        console.log(`✅  DATABASE ${dbName} DROPPED SUCCESSFULLY.`);

    } catch (error) {
        console.error('❌ Error clearing database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected.');
        process.exit(0);
    }
};

clearDatabase();
