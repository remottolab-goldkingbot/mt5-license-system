const pool = require('../config/database');
const crypto = require('crypto');

// ==========================
// GENERATE LICENSE KEY
// ==========================
const generateLicenseKey = () => {

const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const segment = () => {
let result = '';
for (let i = 0; i < 4; i++) {
result += chars.charAt(Math.floor(Math.random() * chars.length));
}
return result;
};

return `MT5-${segment()}-${segment()}-${segment()}`;
};


// ==========================
// CREATE LICENSE
// ==========================
const createLicense = async (req, res) => {

const { name, phone, plan, ea_name, duration_days } = req.body;
const email = (req.body.email || "").trim().toLowerCase();

try {

if (!name || !email) {
return res.status(400).json({
message: "Name and email are required"
});
}

let expiresAt = null;

if (duration_days !== null && duration_days !== undefined && duration_days !== "") {
expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + Number(duration_days));
}

let user = await pool.query(
"SELECT * FROM users WHERE email = $1",
[email]
);

let userId;

if (user.rows.length === 0) {

const newUser = await pool.query(
`INSERT INTO users (name,email,phone,role)
VALUES ($1,$2,$3,'user')
RETURNING *`,
[name,email,phone]
);

userId = newUser.rows[0].id;

} else {

userId = user.rows[0].id;

}

const licenseKey = generateLicenseKey();

const newLicense = await pool.query(
`INSERT INTO licenses
(user_id,license_key,name,email,phone,plan,ea_name,duration_days,status,expires_at,created_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,NOW())
RETURNING *`,
[
userId,
licenseKey,
name,
email,
phone,
plan,
ea_name || null,
duration_days === "" || duration_days === undefined ? null : duration_days,
expiresAt
]
);

res.status(201).json({
message: "License created successfully",
license: newLicense.rows[0]
});

} catch (error) {

console.error("CREATE LICENSE ERROR:", error);
res.status(500).json({ message: "Server error" });

}

};


// ==========================
// UPDATE LICENSE STATUS
// ==========================
const updateLicenseStatus = async (req, res) => {

const { id } = req.params;
const { status } = req.body;

try {

if (!['active','inactive'].includes(status)) {

return res.status(400).json({
message: "Invalid status"
});

}

const updatedLicense = await pool.query(
`UPDATE licenses
SET status = $1
WHERE id = $2
RETURNING *`,
[status, id]
);

if (updatedLicense.rows.length === 0) {

return res.status(404).json({
message: "License not found"
});

}

res.json({
message: "License updated successfully",
license: updatedLicense.rows[0]
});

} catch (error) {

console.error("UPDATE LICENSE ERROR:", error);
res.status(500).json({ message: "Server error" });

}
};


// ==========================
// VALIDATE LICENSE (MT5)
// ==========================
const validateLicense = async (req, res) => {

const {
license_key,
account_number,
profit,
balance,
equity,
drawdown,
risk_percent
} = req.body;

if (!license_key || !account_number) {

return res.status(400).json({
valid:false,
message:"License key and account number required"
});

}

try {

const result = await pool.query(
"SELECT * FROM licenses WHERE license_key = $1",
[license_key]
);

if (result.rows.length === 0) {
return res.json({ valid:false });
}

const license = result.rows[0];

if (license.status !== 'active') {
return res.json({ valid:false });
}

if (license.expires_at && new Date() > new Date(license.expires_at)) {

return res.json({
valid:false,
message:"License expired"
});

}

// ==========================
// FIRST ACTIVATION
// ==========================
if (!license.account_number) {

await pool.query(
`UPDATE licenses
SET account_number=$1,
last_seen=NOW(),
profit=COALESCE($2,profit),
balance=COALESCE($3,balance),
equity=COALESCE($4,equity),
drawdown=COALESCE($5,drawdown),
risk_percent=COALESCE($6,risk_percent)
WHERE id=$7`,
[
account_number,
profit,
balance,
equity,
drawdown,
risk_percent,
license.id
]
);

return res.json({ valid:true });

}

// ==========================
// ACCOUNT VALIDATION
// ==========================
if (license.account_number != account_number) {
return res.json({ valid:false });
}

// ==========================
// HEARTBEAT + STATS UPDATE
// ==========================
await pool.query(
`UPDATE licenses
SET last_seen = NOW(),
profit = COALESCE($1,profit),
balance = COALESCE($2,balance),
equity = COALESCE($3,equity),
drawdown = COALESCE($4,drawdown),
risk_percent = COALESCE($5,risk_percent)
WHERE id = $6`,
[
profit,
balance,
equity,
drawdown,
risk_percent,
license.id
]
);

return res.json({ valid:true });

} catch (error) {

console.error("VALIDATE LICENSE ERROR:", error);
return res.status(500).json({ valid:false });

}

};


// ==========================
// GET ALL LICENSES
// ==========================
const getAllLicenses = async (req, res) => {

try {

const result = await pool.query(
`SELECT
l.id,
l.license_key,
l.status,
l.account_number,
l.created_at,
l.last_seen,
l.expires_at,
l.profit,
l.balance,
l.equity,
l.drawdown,
l.plan,
l.ea_name,
l.risk_percent,
l.duration_days,
u.name,
u.email,
u.phone
FROM licenses l
JOIN users u ON l.user_id = u.id
ORDER BY l.created_at DESC`
);

res.json(result.rows);

} catch (error) {

console.error("GET ALL LICENSES ERROR:", error);
res.status(500).json({ message:"Server error" });

}

};


// ==========================
// GET LICENSES BY USER
// ==========================
const getLicensesByUser = async (req, res) => {

const { user_id } = req.params;

try {

const result = await pool.query(
`SELECT
id,
license_key,
status,
account_number,
created_at,
last_seen,
expires_at,
profit,
balance,
equity,
drawdown,
plan,
ea_name,
risk_percent,
duration_days
FROM licenses
WHERE user_id = $1
ORDER BY created_at DESC`,
[user_id]
);

res.json(result.rows);

} catch (error) {

console.error("GET LICENSES BY USER ERROR:", error);
res.status(500).json({ message:"Server error" });

}

};


// ==========================
// RESET LICENSE ACCOUNT (FIX)
// ==========================
const resetLicenseAccount = async (req, res) => {

const { id } = req.params;

try {

await pool.query(
`UPDATE licenses
SET 
account_number = NULL,
last_seen = NULL,
profit = 0,
balance = 0,
equity = 0,
drawdown = 0
WHERE id = $1`,
[id]
);

res.json({
message: "License account reset successfully"
});

} catch (error) {

console.error("RESET LICENSE ERROR:", error);
res.status(500).json({ message: "Server error" });

}

};


// ==========================
// DELETE LICENSE
// ==========================
const deleteLicense = async (req, res) => {

const { id } = req.params;

try {

const result = await pool.query(
"DELETE FROM licenses WHERE id = $1 RETURNING *",
[id]
);

if (result.rows.length === 0) {

return res.status(404).json({
message:"License not found"
});

}

res.json({
message:"License deleted successfully"
});

} catch (error) {

console.error("DELETE LICENSE ERROR:", error);
res.status(500).json({ message:"Server error" });

}

};

// ==========================
// UPDATE LICENSE INFO (NOMBRE, CORREO, TELEFONO, PLAN) — NUEVO, NO TOCA NADA EXISTENTE
// ==========================
const updateLicenseInfo = async (req, res) => {

const { id } = req.params;
const { name, phone, plan, ea_name, duration_days } = req.body;
const email = req.body.email ? req.body.email.trim().toLowerCase() : req.body.email;

try {

const license = await pool.query(
"SELECT user_id, plan, duration_days FROM licenses WHERE id = $1",
[id]
);

if (license.rows.length === 0) {
return res.status(404).json({ message: "License not found" });
}

const userId = license.rows[0].user_id;

// Si cambia el correo, verificar que no choque con otro usuario existente
if (email) {
const emailOwner = await pool.query(
"SELECT id FROM users WHERE email = $1 AND id != $2",
[email, userId]
);

if (emailOwner.rows.length > 0) {
return res.status(400).json({ message: "Ese correo ya está en uso por otro usuario" });
}
}

// Recalcular expiración solo si vino una nueva duración
const finalPlan = plan || license.rows[0].plan;
const finalDuration = duration_days !== undefined ? duration_days : license.rows[0].duration_days;

let expiresAt = null;
if (finalDuration !== null && finalDuration !== undefined && finalDuration !== "") {
expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + Number(finalDuration));
}

await pool.query(
`UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4`,
[name, email, phone, userId]
);

const updatedLicense = await pool.query(
`UPDATE licenses
SET name = $1, email = $2, phone = $3, plan = $4, expires_at = $5, ea_name = $6, duration_days = $7
WHERE id = $8
RETURNING *`,
[name, email, phone, finalPlan, expiresAt, ea_name || null, finalDuration === "" ? null : finalDuration, id]
);

res.json({
message: "Licencia actualizada correctamente",
license: updatedLicense.rows[0]
});

} catch (error) {

console.error("UPDATE LICENSE INFO ERROR:", error);
res.status(500).json({ message: "Server error" });

}
};


// ==========================
// GET MY LICENSES (usuario logueado ve SOLO las suyas) — NUEVO
// ==========================
const getMyLicenses = async (req, res) => {

try {

const result = await pool.query(
`SELECT
id,
license_key,
status,
account_number,
created_at,
last_seen,
expires_at,
profit,
balance,
equity,
drawdown,
plan,
ea_name,
risk_percent,
duration_days
FROM licenses
WHERE user_id = $1
ORDER BY created_at DESC`,
[req.user.id]
);

res.json(result.rows);

} catch (error) {

console.error("GET MY LICENSES ERROR:", error);
res.status(500).json({ message: "Server error" });

}

};


// ==========================
// TOGGLE MY LICENSE STATUS (el alumno prende/apaga SU PROPIO EA) — NUEVO
// ==========================
const toggleMyLicenseStatus = async (req, res) => {

const { id } = req.params;
const { status } = req.body;

if (!['active','inactive'].includes(status)) {
return res.status(400).json({ message: "Invalid status" });
}

try {

const license = await pool.query(
"SELECT user_id FROM licenses WHERE id = $1",
[id]
);

if (license.rows.length === 0) {
return res.status(404).json({ message: "License not found" });
}

if (Number(license.rows[0].user_id) !== Number(req.user.id)) {
return res.status(403).json({ message: "Esta licencia no te pertenece" });
}

const updatedLicense = await pool.query(
`UPDATE licenses SET status = $1 WHERE id = $2 RETURNING *`,
[status, id]
);

res.json({
message: "Estado actualizado correctamente",
license: updatedLicense.rows[0]
});

} catch (error) {

console.error("TOGGLE MY LICENSE STATUS ERROR:", error);
res.status(500).json({ message: "Server error" });

}
};


module.exports = {
createLicense,
updateLicenseStatus,
validateLicense,
getAllLicenses,
getLicensesByUser,
resetLicenseAccount,
deleteLicense,
updateLicenseInfo,
getMyLicenses,
toggleMyLicenseStatus
};