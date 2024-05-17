import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as bcrypt from 'bcryptjs';
import pool from '../config/dbConfig';

admin.initializeApp();

const loginUser = functions.https.onRequest(async (req, res) => {
    const { user_name, user_password } = req.body;

    try {
        const [rows]: any[] = await pool.query('SELECT * FROM users WHERE user_name = ?', [user_name]);
        const user = rows[0];

        if (user && bcrypt.compareSync(user_password, user.user_password)) {
            const token = await admin.auth().createCustomToken(user.uid);
            res.status(200).send({ token });
        } else {
            res.status(401).send({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

export default loginUser;