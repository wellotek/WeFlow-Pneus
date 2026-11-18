import type Database from 'better-sqlite3'
import type { DashboardStats, FinancialReportData, Product, Sale } from '@shared/types'

export class DashboardRepository {
  constructor(private db: Database.Database) {}

  getStats(period?: string): DashboardStats {
    let dateCondition = "strftime('%Y-%m', date) = strftime('%Y-%m', 'now')"
    if (period === 'today') {
      dateCondition = "date = date('now')"
    } else if (period === 'week') {
      dateCondition = "date >= date('now', '-7 days')"
    } else if (period === 'year') {
      dateCondition = "strftime('%Y', date) = strftime('%Y', 'now')"
    }

    // 1. Ventes et CA
    const salesAgg = this.db
      .prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as turnover
        FROM sales
        WHERE status != 'cancelled' AND ${dateCondition}
      `)
      .get() as { count: number; turnover: number }

    // 2. Coût d'achat réel des articles vendus pour marge nette
    const costAgg = this.db
      .prepare(`
        SELECT COALESCE(SUM(si.quantity * p.buy_price), 0) as cost_of_goods
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.status != 'cancelled' AND si.item_type = 'product' AND ${dateCondition.replace(/date/g, 's.date')}
      `)
      .get() as { cost_of_goods: number }

    // 3. Dépenses de la période
    const expensesAgg = this.db
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE ${dateCondition}
      `)
      .get() as { total_expenses: number }

    const turnover = salesAgg ? salesAgg.turnover : 0
    const salesCount = salesAgg ? salesAgg.count : 0
    const costOfGoods = costAgg ? costAgg.cost_of_goods : 0
    const totalExpenses = expensesAgg ? expensesAgg.total_expenses : 0
    const commercialMargin = turnover - costOfGoods
    const netProfit = commercialMargin - totalExpenses

    // 4. Stock global
    const stockAgg = this.db
      .prepare(`
        SELECT
          COALESCE(SUM(stock_quantity), 0) as total_count,
          COALESCE(SUM(stock_quantity * buy_price), 0) as stock_value,
          COUNT(CASE WHEN stock_quantity <= min_stock_alert AND stock_quantity > 0 THEN 1 END) as low_count,
          COUNT(CASE WHEN stock_quantity <= 0 THEN 1 END) as out_count
        FROM products
      `)
      .get() as { total_count: number; stock_value: number; low_count: number; out_count: number }

    // 5. Total clients
    const customersAgg = this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }

    // 6. Total rendez-vous prévus
    const apptsAgg = this.db
      .prepare("SELECT COUNT(*) as count FROM appointments WHERE status NOT IN ('cancelled', 'completed')")
      .get() as { count: number }

    // 7. Dernières ventes
    const recentSales = this.db
      .prepare('SELECT * FROM sales ORDER BY date DESC, created_at DESC LIMIT 6')
      .all() as Sale[]

    // 8. Alertes stock bas
    const lowStockAlerts = this.db
      .prepare('SELECT * FROM products WHERE stock_quantity <= min_stock_alert ORDER BY stock_quantity ASC LIMIT 6')
      .all() as Product[]

    // 9. Top pneus vendus
    const topSellingTires = this.db
      .prepare(`
        SELECT p.brand || ' ' || p.model_name as name, SUM(si.quantity) as quantity
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        WHERE s.status != 'cancelled'
        GROUP BY p.id
        ORDER BY quantity DESC
        LIMIT 5
      `)
      .all() as { name: string; quantity: number }[]

    // 10. Évolution mensuelle des 6 derniers mois
    const monthlySales = this.db
      .prepare(`
        SELECT
          strftime('%m', s.date) as month_num,
          COALESCE(SUM(s.total_amount), 0) as turnover,
          COALESCE(SUM(s.total_amount - (si.quantity * COALESCE(p.buy_price, 0))), 0) as profit
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.status != 'cancelled' AND s.date >= date('now', '-6 months')
        GROUP BY month_num
        ORDER BY month_num ASC
      `)
      .all() as { month_num: string; turnover: number; profit: number }[]

    const monthNames: Record<string, string> = {
      '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
      '07': 'Juil', '08': 'Août', '09': 'Sept', '10': 'Oct', '11': 'Nov', '12': 'Déc'
    }

    const formattedMonthly = monthlySales.map((m) => ({
      month: monthNames[m.month_num] || m.month_num,
      turnover: m.turnover,
      profit: m.profit
    }))

    return {
      turnover,
      salesCount,
      netProfit,
      totalStockCount: stockAgg ? stockAgg.total_count : 0,
      stockValue: stockAgg ? stockAgg.stock_value : 0,
      totalCustomers: customersAgg ? customersAgg.count : 0,
      appointmentsCount: apptsAgg ? apptsAgg.count : 0,
      lowStockCount: stockAgg ? stockAgg.low_count : 0,
      outOfStockCount: stockAgg ? stockAgg.out_count : 0,
      totalExpenses,
      commercialMargin,
      recentSales,
      lowStockAlerts,
      topSellingTires,
      monthlySales: formattedMonthly
    }
  }

  getFinancialReport(period?: string): FinancialReportData {
    let dateFilter = "strftime('%Y-%m', date) = strftime('%Y-%m', 'now')"
    if (period === 'year') {
      dateFilter = "strftime('%Y', date) = strftime('%Y', 'now')"
    }

    const rev = this.db
      .prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE status != 'cancelled' AND ${dateFilter}`)
      .get() as { total: number }
    const exp = this.db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ${dateFilter}`)
      .get() as { total: number }

    const totalRevenue = rev?.total || 0
    const totalExpenses = exp?.total || 0
    const netProfit = totalRevenue - totalExpenses

    // Trend by day
    const trendRows = this.db
      .prepare(`
        SELECT date, SUM(total_amount) as revenue
        FROM sales
        WHERE status != 'cancelled' AND ${dateFilter}
        GROUP BY date
        ORDER BY date ASC
        LIMIT 31
      `)
      .all() as { date: string; revenue: number }[]

    const revenueTrend = trendRows.map((r) => ({
      date: r.date.split('-').slice(1).join('/'),
      revenue: r.revenue,
      expenses: 0
    }))

    // Payment methods breakdown
    const methodsRows = this.db
      .prepare(`
        SELECT payment_method as method, SUM(amount) as amount
        FROM sale_payments
        GROUP BY payment_method
      `)
      .all() as { method: string; amount: number }[]

    const totalPay = methodsRows.reduce((acc, m) => acc + m.amount, 0) || 1
    const paymentMethodsBreakdown = methodsRows.map((m) => ({
      method: m.method,
      amount: m.amount,
      percentage: Math.round((m.amount / totalPay) * 100)
    }))

    const recentCashMovements = this.db
      .prepare('SELECT * FROM cash_movements ORDER BY created_at DESC LIMIT 10')
      .all() as any[]

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      revenueTrend,
      paymentMethodsBreakdown,
      recentCashMovements
    }
  }
}
