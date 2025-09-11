const nodemailer = require("nodemailer");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../config/db'); // Tu pool de conexiones MySQL

async function sendEmail(subject, htmlContent) {
  const conn = await pool.getConnection();
  try {
    // 1. Obtener SMTP activo
    const [smtpRows] = await conn.query(
      "SELECT host, port FROM smtp_config WHERE is_active = 1 LIMIT 1"
    );
    if (smtpRows.length === 0) throw new Error("No hay configuración SMTP activa");

    const smtpConfig = smtpRows[0];

    // 2. Obtener remitente activo
    const [fromRows] = await conn.query(
      "SELECT email FROM mail_from WHERE is_active = 1 LIMIT 1"
    );
    if (fromRows.length === 0) throw new Error("No hay remitente activo");

    const from = fromRows[0].email;

    // 3. Obtener destinatarios
    const [toRows] = await conn.query(
      "SELECT email, type FROM mail_to WHERE is_active = 1"
    );
    if (toRows.length === 0) throw new Error("No hay destinatarios activos");

    const to = toRows.filter(r => r.type === "TO").map(r => r.email);
    const cc = toRows.filter(r => r.type === "CC").map(r => r.email);
    const bcc = toRows.filter(r => r.type === "BCC").map(r => r.email);

    // 4. Crear transportador sin autenticación
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: false, // No TLS
      tls: { rejectUnauthorized: false } // útil si es relay interno
    });

    // 5. Enviar correo
    const info = await transporter.sendMail({
      from,
      to: to.length > 0 ? to.join(",") : undefined,
      cc: cc.length > 0 ? cc.join(",") : undefined,
      bcc: bcc.length > 0 ? bcc.join(",") : undefined,
      subject,
      html: htmlContent
    });

    console.log("✅ Correo enviado:", info.messageId);
    return true;
  } catch (err) {
    console.error("❌ Error enviando correo:", err.message);
    return false;
  } finally {
    conn.release();
  }
}

module.exports = { sendEmail };
