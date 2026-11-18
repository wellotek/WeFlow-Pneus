import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { Migration } from '../migrate'

export const migration002: Migration = {
  version: 2,
  name: 'seed_initial_data',
  up: (db: Database.Database) => {
    const now = new Date().toISOString()

    // 1. Profil du Magasin
    db.prepare(`
      INSERT OR IGNORE INTO store_profile (
        id, store_name, phone, address, wilaya, email, rc_number, nif_number, nis_number, ai_number,
        default_tax_rate, ticket_format, invoice_footer, auto_backup_enabled, language, allow_negative_stock
      ) VALUES (
        1,
        'WeFlow Pneus',
        '0555 12 34 56',
        'Zone Industrielle, Lot 14',
        'Alger',
        'contact@weflow-pneus.dz',
        '16/00-1234567B22',
        '002216012345678',
        '00221601234567890123',
        '16012345678',
        19.0,
        '80mm',
        'Merci pour votre confiance. Garantie légale sur les pneumatiques neufs et prestations de montage.',
        1,
        'fr',
        0
      )
    `).run()

    // 2. Marques de pneus
    const brands = [
      'Michelin',
      'Continental',
      'Pirelli',
      'Goodyear',
      'Bridgestone',
      'Hankook',
      'Dunlop',
      'Kumho',
      'Nexen'
    ]
    const insertBrand = db.prepare('INSERT OR IGNORE INTO tire_brands (id, name) VALUES (?, ?)')
    for (const b of brands) {
      insertBrand.run(randomUUID(), b)
    }

    // 3. Marques de Véhicules & Modèles en Algérie
    const vehicleData = [
      {
        brand: 'Renault',
        models: ['Symbol', 'Clio 4', 'Clio 5', 'Megane 4', 'Duster', 'Kangoo']
      },
      {
        brand: 'Dacia',
        models: ['Logan', 'Sandero', 'Stepway', 'Duster']
      },
      {
        brand: 'Peugeot',
        models: ['208', '301', '308', '2008', '3008', 'Partner']
      },
      {
        brand: 'Volkswagen',
        models: ['Golf 7', 'Golf 8', 'Polo', 'Caddy', 'Tiguan', 'Passat']
      },
      {
        brand: 'Hyundai',
        models: ['Accent', 'i10', 'i20', 'Tucson', 'Santa Fe', 'Elantra']
      },
      {
        brand: 'Toyota',
        models: ['Yaris', 'Corolla', 'Hilux', 'RAV4', 'Land Cruiser']
      },
      {
        brand: 'Citroën',
        models: ['C3', 'C-Elysée', 'Berlingo', 'C4']
      },
      {
        brand: 'Audi',
        models: ['A3', 'A4', 'A6', 'Q3', 'Q5']
      },
      {
        brand: 'Kia',
        models: ['Picanto', 'Rio', 'Sportage', 'Cerato']
      },
      {
        brand: 'Seat',
        models: ['Ibiza', 'Leon', 'Arona', 'Ateca']
      }
    ]

    const insertVBrand = db.prepare('INSERT OR IGNORE INTO vehicle_brands (id, name) VALUES (?, ?)')
    const insertVModel = db.prepare('INSERT OR IGNORE INTO vehicle_models (id, brand_id, name) VALUES (?, ?, ?)')
    const insertFitment = db.prepare(`
      INSERT OR IGNORE INTO vehicle_fitments (
        id, brand_id, model_id, year_range, engine, front_dimension, rear_dimension, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const brandIds: Record<string, string> = {}
    const modelIds: Record<string, string> = {}

    for (const vb of vehicleData) {
      const bId = randomUUID()
      insertVBrand.run(bId, vb.brand)
      brandIds[vb.brand] = bId

      for (const m of vb.models) {
        const mId = randomUUID()
        insertVModel.run(mId, bId, m)
        modelIds[`${vb.brand}_${m}`] = mId
      }
    }

    // Compatibilités courantes
    const fitments = [
      { brand: 'Renault', model: 'Symbol', years: '2013-2022', engine: '1.2 16V / 1.6 MPI', front: '185/65 R15', rear: '185/65 R15', notes: 'Pression 2.2 bar' },
      { brand: 'Renault', model: 'Clio 4', years: '2012-2019', engine: '0.9 TCe / 1.5 dCi', front: '195/55 R16', rear: '195/55 R16', notes: 'Indice 87H' },
      { brand: 'Dacia', model: 'Logan', years: '2013-2021', engine: '1.2 / 1.5 dCi', front: '185/65 R15', rear: '185/65 R15', notes: 'Monte standard' },
      { brand: 'Dacia', model: 'Stepway', years: '2013-2021', engine: '1.5 dCi', front: '205/55 R16', rear: '205/55 R16', notes: 'Châssis surélevé' },
      { brand: 'Peugeot', model: '208', years: '2012-2020', engine: '1.2 PureTech / 1.6 HDi', front: '195/55 R16', rear: '195/55 R16', notes: 'Pression recommandée 2.3 bar' },
      { brand: 'Peugeot', model: '301', years: '2012-2021', engine: '1.2 VTi / 1.6 HDi', front: '185/65 R15', rear: '185/65 R15', notes: 'Standard' },
      { brand: 'Peugeot', model: '3008', years: '2016-2023', engine: '1.6 BlueHDi / 2.0 HDi', front: '225/55 R18', rear: '225/55 R18', notes: 'SUV' },
      { brand: 'Volkswagen', model: 'Golf 7', years: '2012-2020', engine: '2.0 TDI / 1.4 TSI', front: '205/55 R16', rear: '205/55 R16', notes: 'Option 225/45 R17' },
      { brand: 'Volkswagen', model: 'Polo', years: '2014-2022', engine: '1.0 TSI / 1.4 TDI', front: '185/60 R15', rear: '185/60 R15', notes: 'Standard' },
      { brand: 'Volkswagen', model: 'Caddy', years: '2015-2022', engine: '2.0 TDI', front: '195/65 R15', rear: '195/65 R15', notes: 'Indice charge renforcé 95T' },
      { brand: 'Hyundai', model: 'Accent', years: '2010-2021', engine: '1.4 GL / 1.6 CRDi', front: '175/70 R14', rear: '175/70 R14', notes: 'Option 185/65 R15' },
      { brand: 'Hyundai', model: 'i10', years: '2014-2022', engine: '1.0 / 1.2', front: '165/60 R14', rear: '165/60 R14', notes: 'Citadine' },
      { brand: 'Hyundai', model: 'Tucson', years: '2016-2022', engine: '2.0 CRDi AWD', front: '225/60 R17', rear: '225/60 R17', notes: 'Option 225/55 R18' },
      { brand: 'Toyota', model: 'Yaris', years: '2014-2021', engine: '1.33 VVT-i', front: '175/65 R15', rear: '175/65 R15', notes: 'Standard' },
      { brand: 'Toyota', model: 'Hilux', years: '2015-2023', engine: '2.4 D-4D 4x4', front: '265/65 R17', rear: '265/65 R17', notes: 'Tout-terrain AT' },
      { brand: 'Citroën', model: 'Berlingo', years: '2012-2022', engine: '1.6 HDi', front: '195/65 R15', rear: '195/65 R15', notes: 'Utilitaire léger' },
      { brand: 'Audi', model: 'A4', years: '2015-2022', engine: '2.0 TDI Quattro', front: '225/50 R17', rear: '225/50 R17', notes: 'Berline premium' }
    ]

    for (const f of fitments) {
      const bId = brandIds[f.brand]
      const mId = modelIds[`${f.brand}_${f.model}`]
      if (bId && mId) {
        insertFitment.run(randomUUID(), bId, mId, f.years, f.engine, f.front, f.rear, f.notes)
      }
    }

    // 4. Services de l'atelier
    const services = [
      { code: 'MONT-EQUIL', name: 'Montage & Équilibrage', category: 'montage', price: 350, desc: 'Montage pneu sur jante + plomb équilibrage dynamique' },
      { code: 'DEMONT', name: 'Démontage pneu', category: 'montage', price: 150, desc: 'Dépose du pneu usagé' },
      { code: 'EQUIL-SEUL', name: 'Équilibrage dynamique seul', category: 'equilibrage', price: 200, desc: 'Équilibrage au gramme près' },
      { code: 'REP-CREV', name: 'Réparation Crevaison', category: 'reparation', price: 400, desc: 'Pose mèche ou champignon vulcanisé à froid' },
      { code: 'PARAL-GEO', name: 'Parallélisme & Géométrie', category: 'geometrie', price: 2500, desc: 'Réglage banc laser train avant et arrière' },
      { code: 'PERMUT-4', name: 'Permutation 4 roues', category: 'permutation', price: 1000, desc: 'Permutation croisée pour usure uniforme' },
      { code: 'VAL-TR414', name: 'Remplacement Valve Tubeless', category: 'autre', price: 150, desc: 'Valve neuve haute pression TR414' }
    ]

    const insertService = db.prepare(`
      INSERT OR IGNORE INTO services (id, code, name, category, default_price, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const s of services) {
      insertService.run(randomUUID(), s.code, s.name, s.category, s.price, s.desc)
    }

    // 5. Catalogue Pneus et Stocks initiaux (exactement conforme aux captures d'écran)
    const products = [
      {
        reference: 'MIC-2055516-E',
        product_code: 'MIC-PRIM4-2055516',
        barcode: '3528701234567',
        brand: 'Michelin',
        model_name: 'Primacy 4',
        dimension: '205/55 R16',
        width: 205,
        height: 55,
        diameter: 'R16',
        load_index: '91',
        speed_rating: 'V',
        tire_type: 'summer',
        condition: 'new',
        vehicle_category: 'passenger',
        buy_price: 11200,
        sell_price: 14500,
        wholesale_price: 13500,
        stock_quantity: 34,
        min_stock_alert: 8,
        location: 'Rayon A-01',
        dot: '1824'
      },
      {
        reference: 'CON-1956515-A',
        product_code: 'CON-ULTRA-1956515',
        barcode: '4019238765432',
        brand: 'Continental',
        model_name: 'UltraContact',
        dimension: '195/65 R15',
        width: 195,
        height: 65,
        diameter: 'R15',
        load_index: '91',
        speed_rating: 'H',
        tire_type: 'all_season',
        condition: 'new',
        vehicle_category: 'passenger',
        buy_price: 9400,
        sell_price: 12500,
        wholesale_price: 11500,
        stock_quantity: 18,
        min_stock_alert: 6,
        location: 'Rayon B-04',
        dot: '2224'
      },
      {
        reference: 'PIR-2254517-P',
        product_code: 'PIR-PZERO-2254517',
        barcode: '8019227123987',
        brand: 'Pirelli',
        model_name: 'P Zero',
        dimension: '225/45 R17',
        width: 225,
        height: 45,
        diameter: 'R17',
        load_index: '94',
        speed_rating: 'Y',
        tire_type: 'summer',
        condition: 'new',
        vehicle_category: 'passenger',
        buy_price: 15800,
        sell_price: 19800,
        wholesale_price: 18500,
        stock_quantity: 12,
        min_stock_alert: 4,
        location: 'Rayon C-02',
        dot: '1424'
      },
      {
        reference: 'GY-2055516-H',
        product_code: 'GY-UG-2055516',
        barcode: '5452000987654',
        brand: 'Goodyear',
        model_name: 'UltraGrip 9+',
        dimension: '205/55 R16',
        width: 205,
        height: 55,
        diameter: 'R16',
        load_index: '91',
        speed_rating: 'H',
        tire_type: 'winter',
        condition: 'new',
        vehicle_category: 'passenger',
        buy_price: 12100,
        sell_price: 15200,
        wholesale_price: 14000,
        stock_quantity: 25,
        min_stock_alert: 6,
        location: 'Rayon A-03',
        dot: '3023'
      },
      {
        reference: 'MIC-1856515-S',
        product_code: 'MIC-ENERGY-1856515',
        barcode: '3528709876543',
        brand: 'Michelin',
        model_name: 'Energy Saver+',
        dimension: '185/65 R15',
        width: 185,
        height: 65,
        diameter: 'R15',
        load_index: '88',
        speed_rating: 'T',
        tire_type: 'summer',
        condition: 'new',
        vehicle_category: 'passenger',
        buy_price: 8200,
        sell_price: 10900,
        wholesale_price: 9900,
        stock_quantity: 5,
        min_stock_alert: 8,
        location: 'Rayon B-01',
        dot: '0824'
      },
      {
        reference: 'BRI-2055516-T',
        product_code: 'BRI-TUR-2055516',
        barcode: '3286341234567',
        brand: 'Bridgestone',
        model_name: 'Turanza T005',
        dimension: '205/55 R16',
        width: 205,
        height: 55,
        diameter: 'R16',
        load_index: '91',
        speed_rating: 'V',
        tire_type: 'summer',
        condition: 'new',
        vehicle_category: 'passenger',
        buy_price: 11800,
        sell_price: 14900,
        wholesale_price: 13800,
        stock_quantity: 3,
        min_stock_alert: 6,
        location: 'Rayon A-02',
        dot: '1224'
      }
    ]

    const insertProduct = db.prepare(`
      INSERT OR IGNORE INTO products (
        id, reference, product_code, barcode, brand, model_name, dimension,
        width, height, diameter, load_index, speed_rating, tire_type, condition,
        vehicle_category, buy_price, sell_price, wholesale_price, stock_quantity,
        min_stock_alert, location, dot, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMovement = db.prepare(`
      INSERT OR IGNORE INTO stock_movements (
        id, product_id, type, quantity, unit_cost, reference_doc_type, reference_doc_id, reason, date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const p of products) {
      const pId = randomUUID()
      insertProduct.run(
        pId,
        p.reference,
        p.product_code,
        p.barcode,
        p.brand,
        p.model_name,
        p.dimension,
        p.width,
        p.height,
        p.diameter,
        p.load_index,
        p.speed_rating,
        p.tire_type,
        p.condition,
        p.vehicle_category,
        p.buy_price,
        p.sell_price,
        p.wholesale_price,
        p.stock_quantity,
        p.min_stock_alert,
        p.location,
        p.dot,
        now,
        now
      )

      insertMovement.run(
        randomUUID(),
        pId,
        'adjustment_plus',
        p.stock_quantity,
        p.buy_price,
        'initial_inventory',
        'INIT-001',
        'Inventaire initial de démarrage',
        now.split('T')[0],
        now
      )
    }

    // 6. Clients & Véhicules initiaux
    const insertCustomer = db.prepare(`
      INSERT OR IGNORE INTO customers (id, type, name, phone, address, wilaya, email, notes, balance_due, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertCVehicle = db.prepare(`
      INSERT OR IGNORE INTO customer_vehicles (
        id, customer_id, brand, model, year, license_plate, mileage, front_dimension, rear_dimension, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const c1Id = randomUUID()
    insertCustomer.run(c1Id, 'individual', 'Ahmed Ben Ali', '0555 12 34 56', 'Kouba', 'Alger', 'ahmed.benali@gmail.com', 'Client fidèle', 0, now)
    insertCVehicle.run(randomUUID(), c1Id, 'Renault', 'Symbol', '2021', '12345 121 16', 85432, '185/65 R15', '185/65 R15', 'Roule beaucoup', now)

    const c2Id = randomUUID()
    insertCustomer.run(c2Id, 'business', 'Garage Al Auto', '0560 98 76 54', 'Bab Ezzouar', 'Alger', 'contact@alauto.dz', 'Atelier partenaire', 0, now)
    insertCVehicle.run(randomUUID(), c2Id, 'Hyundai', 'Accent', '2019', '09876 119 16', 110200, '175/70 R14', '175/70 R14', 'Flotte commerciale', now)

    const c3Id = randomUUID()
    insertCustomer.run(c3Id, 'individual', 'Robert Dubois', '0550 44 33 22', 'Hydra', 'Alger', 'robert.dubois@yahoo.fr', '', 0, now)
    insertCVehicle.run(randomUUID(), c3Id, 'Peugeot', '3008', '2020', '04512 120 16', 64000, '225/55 R18', '225/55 R18', 'Montage 4 pneus', now)

    // 7. Fournisseurs
    const insertSupplier = db.prepare(`
      INSERT OR IGNORE INTO suppliers (id, name, phone, address, wilaya, contact_person, email, balance_due, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    insertSupplier.run(randomUUID(), 'SARL Algérie Pneumatiques Import', '021 89 45 12', 'Zone Industrielle Oued Smar', 'Alger', 'M. Karim Bouzid', 'commercial@alg-pneus.dz', 0, now)
    insertSupplier.run(randomUUID(), 'EURL Continental Distribution Maghreb', '031 92 11 00', 'Zone d’Activité El Khroub', 'Constantine', 'Mme. Amel Ziani', 'orders@conti-dz.com', 0, now)

    // 8. Session de caisse active
    const today = now.split('T')[0]
    const sessionId = randomUUID()
    db.prepare(`
      INSERT OR IGNORE INTO cash_sessions (
        id, session_date, opened_at, initial_cash, total_in, total_out, calculated_cash, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, today, now, 50000, 0, 0, 50000, 'open')
  }
}
