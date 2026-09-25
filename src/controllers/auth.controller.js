const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const bcrypt = require('bcrypt');

// ==========================
// REGISTER
// ==========================
const register = async (req, res) => {
    const { name, password, phone } = req.body;
    const email = (req.body.email || "").trim().toLowerCase();

    try {
        // Verificar si el usuario ya existe
        const userExists = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (userExists.rows.length > 0) {
            const existing = userExists.rows[0];

            if (existing.password) {
                // Ya tiene contraseña real: es un registro duplicado de verdad, se bloquea.
                return res.status(400).json({ message: "User already exists" });
            }

            // Existe como "cascarón" (se creó al generarle una licencia, sin contraseña) —
            // le dejamos reclamar su cuenta poniendo contraseña por primera vez.
            const hashedPassword = await bcrypt.hash(password, 10);

            const claimedUser = await pool.query(
                `UPDATE users SET password = $1, name = COALESCE($2, name), phone = COALESCE($3, phone)
                 WHERE id = $4
                 RETURNING id, name, email, role, membership, created_at`,
                [hashedPassword, name, phone, existing.id]
            );

            return res.status(201).json({
                message: "Cuenta reclamada correctamente",
                user: claimedUser.rows[0]
            });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario — el rol SIEMPRE se fuerza a 'user' aquí.
        // Nunca se acepta un "role" desde el body del request (evita que alguien se auto-asigne admin).
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, 'user') RETURNING id, name, email, role, membership, created_at",
            [name, email, hashedPassword, phone]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// LOGIN
// ==========================
const login = async (req, res) => {
    const { password } = req.body;
    const email = (req.body.email || "").trim().toLowerCase();

    try {
        const user = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ message: "User not found" });
        }

        // Comparar contraseña
        const validPassword = await bcrypt.compare(
            password,
            user.rows[0].password
        );

        if (!validPassword) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Crear token JWT
        const token = jwt.sign(
            {
                id: user.rows[0].id,
                email: user.rows[0].email
            },
            process.env.JWT_SECRET || "supersecretkey",
            { expiresIn: "1h" }
        );

        // Quitar password de la respuesta
        const { password: _, ...userWithoutPassword } = user.rows[0];

        res.json({
            message: "Login successful",
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// GET ALL USERS (admin) — NUEVO, para "Gestión de Alumnos"
// ==========================
const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                u.id,
                u.name,
                u.email,
                u.phone,
                u.role,
                u.membership,
                u.created_at,
                COUNT(l.id) AS license_count
             FROM users u
             LEFT JOIN licenses l ON l.user_id = u.id
             GROUP BY u.id
             ORDER BY u.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error("GET ALL USERS ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// UPDATE MEMBERSHIP (admin) — NUEVO, Free / Pro por alumno
// ==========================
const updateMembership = async (req, res) => {
    const { id } = req.params;
    const { membership } = req.body;

    if (!["free", "pro"].includes(membership)) {
        return res.status(400).json({ message: "Membresía inválida (usa 'free' o 'pro')" });
    }

    try {
        const updated = await pool.query(
            `UPDATE users SET membership = $1 WHERE id = $2 RETURNING id, name, email, membership`,
            [membership, id]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.json({ message: "Membresía actualizada correctamente", user: updated.rows[0] });
    } catch (error) {
        console.error("UPDATE MEMBERSHIP ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// UPDATE USER ROLE (admin) — NUEVO, para limpiar cuentas de prueba marcadas admin por error
// Solo permite quitar el rol admin (dejarlo en 'user'), nunca otorgarlo, y nunca sobre uno mismo.
// ==========================
const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== "user") {
        return res.status(400).json({ message: "Esta acción solo permite quitar el rol de administrador (pasar a 'user')" });
    }

    if (Number(id) === Number(req.user.id)) {
        return res.status(400).json({ message: "No puedes quitarte el rol de administrador a ti mismo" });
    }

    try {
        const updated = await pool.query(
            `UPDATE users SET role = 'user' WHERE id = $1 RETURNING id, name, email, role`,
            [id]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.json({ message: "Rol actualizado correctamente", user: updated.rows[0] });
    } catch (error) {
        console.error("UPDATE USER ROLE ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// DELETE USER (admin) — NUEVO, para "Gestión de Alumnos"
// ==========================
const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const target = await pool.query("SELECT role FROM users WHERE id = $1", [id]);

        if (target.rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        if (target.rows[0].role === "admin") {
            return res.status(400).json({ message: "No se puede eliminar una cuenta de administrador desde aquí" });
        }

        const licenseCheck = await pool.query(
            "SELECT COUNT(*) FROM licenses WHERE user_id = $1",
            [id]
        );

        if (Number(licenseCheck.rows[0].count) > 0) {
            return res.status(400).json({
                message: "Este usuario tiene licencias asociadas. Elimina primero sus licencias desde el Generador de Licencias."
            });
        }

        await pool.query("DELETE FROM users WHERE id = $1", [id]);

        res.json({ message: "Usuario eliminado correctamente" });
    } catch (error) {
        console.error("DELETE USER ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// UPDATE MY TRADINGVIEW USERNAME — NUEVO
// ==========================
const updateTradingViewUsername = async (req, res) => {
    const { tradingview_username } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users SET tradingview_username = $1 WHERE id = $2 RETURNING id, tradingview_username`,
            [tradingview_username || null, req.user.id]
        );

        res.json({
            message: "Usuario de TradingView actualizado correctamente",
            tradingview_username: result.rows[0].tradingview_username
        });
    } catch (error) {
        console.error("UPDATE TRADINGVIEW USERNAME ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { register, login, getAllUsers, deleteUser, updateMembership, updateUserRole, updateTradingViewUsername };
