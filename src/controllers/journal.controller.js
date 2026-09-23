const pool = require('../config/database');

// ==========================
// CREATE TRADE (usuario logueado, para si mismo)
// ==========================
const createTrade = async (req, res) => {
    const {
        asset,
        type,
        entry_price,
        sl,
        tp,
        lots,
        pnl,
        session,
        setup,
        emotion,
        error_tag,
        chart_url,
        notes
    } = req.body;

    if (!asset || !type || pnl === undefined || pnl === null || pnl === "") {
        return res.status(400).json({ message: "asset, type y pnl son obligatorios" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO journal_trades
                (user_id, asset, type, entry_price, sl, tp, lots, pnl, session, setup, emotion, error_tag, chart_url, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             RETURNING *`,
            [
                req.user.id,
                asset,
                type,
                entry_price || null,
                sl || null,
                tp || null,
                lots || null,
                pnl,
                session || null,
                setup || null,
                emotion || null,
                error_tag || null,
                chart_url || null,
                notes || null
            ]
        );

        res.status(201).json({ message: "Trade registrado correctamente", trade: result.rows[0] });
    } catch (error) {
        console.error("CREATE TRADE ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// GET MY TRADES (solo los del usuario logueado)
// ==========================
const getMyTrades = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM journal_trades WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("GET MY TRADES ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// DELETE TRADE (solo si es propio)
// ==========================
const deleteTrade = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM journal_trades WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Trade no encontrado" });
        }

        res.json({ message: "Trade eliminado correctamente" });
    } catch (error) {
        console.error("DELETE TRADE ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { createTrade, getMyTrades, deleteTrade };
