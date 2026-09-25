const pool = require('../config/database');

// ==========================
// EA CATALOG
// ==========================
const getEAs = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM ea_catalog ORDER BY created_at ASC");
        res.json(result.rows);
    } catch (error) {
        console.error("GET EAS ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const createEA = async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: "El nombre del EA es obligatorio" });
    }
    try {
        const result = await pool.query(
            "INSERT INTO ea_catalog (name) VALUES ($1) RETURNING *",
            [name.trim()]
        );
        res.status(201).json({ message: "EA agregado correctamente", ea: result.rows[0] });
    } catch (error) {
        console.error("CREATE EA ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteEA = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM ea_catalog WHERE id = $1 RETURNING id", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "EA no encontrado" });
        }
        res.json({ message: "EA eliminado correctamente" });
    } catch (error) {
        console.error("DELETE EA ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// PLAN (DURACION) CATALOG
// ==========================
const getPlans = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM plan_catalog ORDER BY created_at ASC");
        res.json(result.rows);
    } catch (error) {
        console.error("GET PLANS ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const createPlan = async (req, res) => {
    const { label, duration_days } = req.body;
    if (!label || !label.trim()) {
        return res.status(400).json({ message: "El nombre del plan es obligatorio" });
    }
    try {
        const result = await pool.query(
            "INSERT INTO plan_catalog (label, duration_days) VALUES ($1, $2) RETURNING *",
            [label.trim(), duration_days === "" || duration_days === undefined ? null : Number(duration_days)]
        );
        res.status(201).json({ message: "Plan agregado correctamente", plan: result.rows[0] });
    } catch (error) {
        console.error("CREATE PLAN ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const deletePlan = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM plan_catalog WHERE id = $1 RETURNING id", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Plan no encontrado" });
        }
        res.json({ message: "Plan eliminado correctamente" });
    } catch (error) {
        console.error("DELETE PLAN ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getEAs, createEA, deleteEA, getPlans, createPlan, deletePlan };
