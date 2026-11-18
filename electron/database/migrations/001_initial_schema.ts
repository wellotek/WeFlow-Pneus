import type Database from 'better-sqlite3'
import type { Migration } from '../migrate'

export const migration001: Migration = {
  version: 1,
  name: 'initial_schema',
  up: (db: Database.Database) => {
    db.exec(`
      -- Configuration et métadonnées
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS store_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        store_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        wilaya TEXT NOT NULL,
        email TEXT,
        rc_number TEXT,
        nif_number TEXT,
        nis_number TEXT,
        ai_number TEXT,
        default_tax_rate REAL NOT NULL DEFAULT 19.0,
        default_printer TEXT,
        default_label_printer TEXT,
        ticket_format TEXT NOT NULL DEFAULT '80mm',
        invoice_footer TEXT,
        backup_directory TEXT,
        auto_backup_enabled INTEGER NOT NULL DEFAULT 1,
        language TEXT NOT NULL DEFAULT 'fr',
        allow_negative_stock INTEGER NOT NULL DEFAULT 0
      );

      -- Marques de pneus
      CREATE TABLE IF NOT EXISTS tire_brands (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );

      -- Catalogue des pneus et articles
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        reference TEXT UNIQUE NOT NULL,
        product_code TEXT,
        barcode TEXT,
        brand TEXT NOT NULL,
        model_name TEXT NOT NULL,
        description TEXT,
        dimension TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        diameter TEXT NOT NULL,
        load_index TEXT NOT NULL,
        speed_rating TEXT NOT NULL,
        tire_type TEXT NOT NULL DEFAULT 'summer',
        condition TEXT NOT NULL DEFAULT 'new',
        vehicle_category TEXT NOT NULL DEFAULT 'passenger',
        buy_price REAL NOT NULL DEFAULT 0,
        sell_price REAL NOT NULL DEFAULT 0,
        wholesale_price REAL NOT NULL DEFAULT 0,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        min_stock_alert INTEGER NOT NULL DEFAULT 4,
        location TEXT,
        dot TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
      CREATE INDEX IF NOT EXISTS idx_products_dimension ON products(dimension);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

      -- Véhicules et compatibilités de monte
      CREATE TABLE IF NOT EXISTS vehicle_brands (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vehicle_models (
        id TEXT PRIMARY KEY,
        brand_id TEXT NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (brand_id) REFERENCES vehicle_brands(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS vehicle_fitments (
        id TEXT PRIMARY KEY,
        brand_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        year_range TEXT NOT NULL,
        engine TEXT NOT NULL,
        front_dimension TEXT NOT NULL,
        rear_dimension TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (brand_id) REFERENCES vehicle_brands(id) ON DELETE CASCADE,
        FOREIGN KEY (model_id) REFERENCES vehicle_models(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_fitments_front ON vehicle_fitments(front_dimension);
      CREATE INDEX IF NOT EXISTS idx_fitments_rear ON vehicle_fitments(rear_dimension);

      -- Mouvements de stock
      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost REAL NOT NULL DEFAULT 0,
        reference_doc_type TEXT,
        reference_doc_id TEXT,
        reason TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);

      -- Clients et Véhicules clients
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'individual',
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        wilaya TEXT,
        email TEXT,
        notes TEXT,
        balance_due REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

      CREATE TABLE IF NOT EXISTS customer_vehicles (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        year TEXT,
        license_plate TEXT NOT NULL,
        mileage INTEGER,
        front_dimension TEXT,
        rear_dimension TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_customer_vehicles_plate ON customer_vehicles(license_plate);

      -- Fournisseurs et Achats
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        wilaya TEXT,
        contact_person TEXT,
        email TEXT,
        balance_due REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        purchase_number TEXT UNIQUE NOT NULL,
        supplier_id TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ordered',
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        balance_due REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS purchase_items (
        id TEXT PRIMARY KEY,
        purchase_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        reference TEXT NOT NULL,
        brand TEXT NOT NULL,
        dimension TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost REAL NOT NULL DEFAULT 0,
        total_cost REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      );

      -- Ventes et POS
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        vehicle_id TEXT,
        vehicle_info TEXT,
        license_plate TEXT,
        mileage INTEGER,
        date TEXT NOT NULL,
        sale_type TEXT NOT NULL DEFAULT 'retail',
        subtotal REAL NOT NULL DEFAULT 0,
        tax_rate REAL NOT NULL DEFAULT 19.0,
        tax_amount REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        balance_due REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        status TEXT NOT NULL DEFAULT 'paid',
        notes TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
      CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);

      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        product_id TEXT,
        item_type TEXT NOT NULL DEFAULT 'product',
        reference TEXT NOT NULL,
        designation TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        tax_rate REAL NOT NULL DEFAULT 19.0,
        total_line REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sale_payments (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        date TEXT NOT NULL,
        reference_note TEXT,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      );

      -- Devis / Proformas
      CREATE TABLE IF NOT EXISTS quotations (
        id TEXT PRIMARY KEY,
        quote_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        vehicle_info TEXT,
        date TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        subtotal REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        converted_sale_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS quotation_items (
        id TEXT PRIMARY KEY,
        quotation_id TEXT NOT NULL,
        product_id TEXT,
        item_type TEXT NOT NULL DEFAULT 'product',
        reference TEXT NOT NULL,
        designation TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_line REAL NOT NULL,
        FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
      );

      -- Services de la Workshop / Atelier
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'montage',
        default_price REAL NOT NULL DEFAULT 0,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS service_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        vehicle_info TEXT,
        license_plate TEXT,
        mileage INTEGER,
        date TEXT NOT NULL,
        technician_name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        total_amount REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS service_order_items (
        id TEXT PRIMARY KEY,
        service_order_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        notes TEXT,
        FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE
      );

      -- Rendez-vous et planning
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        vehicle_info TEXT,
        service_requested TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        notes TEXT,
        technician_name TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);

      -- Garanties et Réclamations
      CREATE TABLE IF NOT EXISTS warranties (
        id TEXT PRIMARY KEY,
        claim_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        sale_id TEXT,
        invoice_number TEXT,
        product_id TEXT,
        product_ref TEXT NOT NULL,
        purchase_date TEXT,
        claim_date TEXT NOT NULL,
        reason TEXT NOT NULL,
        defect_description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        resolution_notes TEXT,
        replacement_product_id TEXT,
        refund_amount REAL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      -- Caisse et Trésorerie
      CREATE TABLE IF NOT EXISTS cash_sessions (
        id TEXT PRIMARY KEY,
        session_date TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        initial_cash REAL NOT NULL DEFAULT 0,
        total_in REAL NOT NULL DEFAULT 0,
        total_out REAL NOT NULL DEFAULT 0,
        calculated_cash REAL NOT NULL DEFAULT 0,
        actual_cash REAL,
        difference REAL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'open'
      );

      CREATE TABLE IF NOT EXISTS cash_movements (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE
      );

      -- Dépenses du magasin
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'other',
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        paid_to TEXT,
        receipt_ref TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

      -- Séquences de numérotation continue
      CREATE TABLE IF NOT EXISTS document_sequences (
        doc_type TEXT PRIMARY KEY,
        next_number INTEGER NOT NULL DEFAULT 1
      );

      INSERT OR IGNORE INTO document_sequences (doc_type, next_number) VALUES
        ('invoice', 1),
        ('quote', 1),
        ('purchase', 1),
        ('service_order', 1),
        ('warranty', 1);

      -- Audit logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
      );
    `)
  }
}
