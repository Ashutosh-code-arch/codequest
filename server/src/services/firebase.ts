import admin from "firebase-admin";
import * as dotenv from "dotenv";
import { getApps } from "firebase-admin/app";
dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY as string);

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
// });

if (!getApps().length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
    });
}

export default admin;
