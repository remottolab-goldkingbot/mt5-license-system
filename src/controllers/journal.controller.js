const pool = require('../config/database');

// ==========================
// GET ACCOUNTS (todas las cuentas de journal del usuario)
// ==========================
const getAccounts = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM journal_accounts WHERE user_id = $1 ORDER BY created_at ASC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("GET ACCOUNTS ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// CREATE ACCOUNT (Free: máx 1 cuenta. PRO: ilimitadas)
// ==========================
const createAccount = async (req, res) => {
    const {
        name,
        account_type,
        initial_balance,
        profit_target,
        daily_limit,
        max_limit,
        has_personal_goals
    } = req.body;

    if (!["fondeo", "real"].includes(account_type)) {
        return res.status(400).json({ message: "account_type debe ser 'fondeo' o 'real'" });
    }

    try {
        const userRow = await pool.query("SELECT membership FROM users WHERE id = $1", [req.user.id]);
        const membership = userRow.rows[0]?.membership || "free";

        const countRes = await pool.query(
            "SELECT COUNT(*) FROM journal_accounts WHERE user_id = $1",
            [req.user.id]
        );
        const existing = Number(countRes.rows[0].count);

        if (membership !== "pro" && existing >= 1) {
            return res.status(403).json({
                message: "El plan Free solo permite 1 cuenta en el Journal. Mejora a PRO para manejar varias cuentas."
            });
        }

        const result = await pool.query(
            `INSERT INTO journal_accounts
                (user_id, name, account_type, initial_balance, profit_target, daily_limit, max_limit, has_personal_goals)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING *`,
            [
                req.user.id,
                name || "Cuenta Principal",
                account_type,
                initial_balance || 0,
                profit_target || null,
                daily_limit || null,
                max_limit || null,
                Boolean(has_personal_goals)
            ]
        );

        res.status(201).json({ message: "Cuenta creada correctamente", account: result.rows[0] });
    } catch (error) {
        console.error("CREATE ACCOUNT ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// UPDATE ACCOUNT
// ==========================
const updateAccount = async (req, res) => {
    const { id } = req.params;
    const {
        name,
        account_type,
        initial_balance,
        profit_target,
        daily_limit,
        max_limit,
        has_personal_goals
    } = req.body;

    if (!["fondeo", "real"].includes(account_type)) {
        return res.status(400).json({ message: "account_type debe ser 'fondeo' o 'real'" });
    }

    try {
        const result = await pool.query(
            `UPDATE journal_accounts SET
                name = $1,
                account_type = $2,
                initial_balance = $3,
                profit_target = $4,
                daily_limit = $5,
                max_limit = $6,
                has_personal_goals = $7
             WHERE id = $8 AND user_id = $9
             RETURNING *`,
            [
                name || "Cuenta Principal",
                account_type,
                initial_balance || 0,
                profit_target || null,
                daily_limit || null,
                max_limit || null,
                Boolean(has_personal_goals),
                id,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Cuenta no encontrada" });
        }

        res.json({ message: "Cuenta actualizada correctamente", account: result.rows[0] });
    } catch (error) {
        console.error("UPDATE ACCOUNT ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// DELETE ACCOUNT (borra tambien sus trades por ON DELETE CASCADE)
// ==========================
const deleteAccount = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM journal_accounts WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Cuenta no encontrada" });
        }

        res.json({ message: "Cuenta eliminada correctamente" });
    } catch (error) {
        console.error("DELETE ACCOUNT ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==========================
// CREATE TRADE (ligado a una cuenta especifica del usuario)
// ==========================
const createTrade = async (req, res) => {
    const {
        account_id,
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

    if (!account_id || !asset || !type || pnl === undefined || pnl === null || pnl === "") {
        return res.status(400).json({ message: "account_id, asset, type y pnl son obligatorios" });
    }

    try {
        // Verificar que la cuenta es del usuario logueado
        const accCheck = await pool.query(
            "SELECT id FROM journal_accounts WHERE id = $1 AND user_id = $2",
            [account_id, req.user.id]
        );
        if (accCheck.rows.length === 0) {
            return res.status(403).json({ message: "Cuenta no válida" });
        }

        // Límite diario de 3 registros para usuarios Free (PRO es ilimitado)
        const userRow = await pool.query("SELECT membership FROM users WHERE id = $1", [req.user.id]);
        const membership = userRow.rows[0]?.membership || "free";

        if (membership !== "pro") {
            const todayCount = await pool.query(
                `SELECT COUNT(*) FROM journal_trades
                 WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
                [req.user.id]
            );

            if (Number(todayCount.rows[0].count) >= 3) {
                return res.status(403).json({
                    message: "Ya usaste tus 3 registros gratuitos de hoy. Mejora a PRO para registro ilimitado.",
                    limitReached: true
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO journal_trades
                (user_id, account_id, asset, type, entry_price, sl, tp, lots, pnl, session, setup, emotion, error_tag, chart_url, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             RETURNING *`,
            [
                req.user.id,
                account_id,
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
// GET MY TRADES (de una cuenta especifica: ?account_id=)
// ==========================
const getMyTrades = async (req, res) => {
    const { account_id } = req.query;

    try {
        const result = account_id
            ? await pool.query(
                  `SELECT * FROM journal_trades WHERE user_id = $1 AND account_id = $2 ORDER BY created_at DESC`,
                  [req.user.id, account_id]
              )
            : await pool.query(
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
// UPDATE TRADE (solo si es propio)
// ==========================
const updateTrade = async (req, res) => {
    const { id } = req.params;
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
            `UPDATE journal_trades SET
                asset = $1,
                type = $2,
                entry_price = $3,
                sl = $4,
                tp = $5,
                lots = $6,
                pnl = $7,
                session = $8,
                setup = $9,
                emotion = $10,
                error_tag = $11,
                chart_url = $12,
                notes = $13
             WHERE id = $14 AND user_id = $15
             RETURNING *`,
            [
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
                notes || null,
                id,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Trade no encontrado" });
        }

        res.json({ message: "Trade actualizado correctamente", trade: result.rows[0] });
    } catch (error) {
        console.error("UPDATE TRADE ERROR:", error);
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

module.exports = {
    getAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    createTrade,
    getMyTrades,
    updateTrade,
    deleteTrade
};
