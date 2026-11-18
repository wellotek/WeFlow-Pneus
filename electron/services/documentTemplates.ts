import type {
  CashSession,
  LabelPrintConfig,
  Purchase,
  Quotation,
  Sale,
  ServiceOrder,
  StoreProfile
} from '@shared/types'
import { formatCurrencyDA, formatDateStr } from '@shared/locales'
import { generateBarcodeSvg } from './barcodeGenerator'

function baseStyles(): string {
  return `
    <style>
      @page {
        margin: 10mm;
        size: A4 portrait;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      body {
        background: #ffffff;
        color: #111827;
        font-size: 13px;
        line-height: 1.5;
        padding: 10px;
      }
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #F5BD18;
        padding-bottom: 16px;
        margin-bottom: 20px;
      }
      .brand-title {
        font-size: 24px;
        font-weight: 800;
        color: #172235;
        letter-spacing: -0.5px;
      }
      .brand-subtitle {
        font-size: 12px;
        font-weight: 600;
        color: #F5BD18;
        text-transform: uppercase;
        margin-top: 2px;
      }
      .store-info {
        font-size: 11px;
        color: #667085;
        margin-top: 6px;
        line-height: 1.4;
      }
      .doc-badge {
        text-align: right;
      }
      .doc-type {
        font-size: 20px;
        font-weight: 800;
        color: #172235;
        text-transform: uppercase;
      }
      .doc-number {
        font-size: 14px;
        font-weight: bold;
        color: #F5BD18;
        margin-top: 4px;
      }
      .doc-date {
        font-size: 12px;
        color: #667085;
        margin-top: 4px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        background: #F5F6F8;
        padding: 14px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #E5E7EB;
      }
      .info-box h4 {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #667085;
        margin-bottom: 6px;
      }
      .info-box p {
        font-size: 13px;
        color: #111827;
        font-weight: 600;
      }
      .info-box span {
        font-size: 12px;
        color: #667085;
        font-weight: normal;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      th {
        background: #172235;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 10px 12px;
        text-align: left;
      }
      td {
        padding: 10px 12px;
        border-bottom: 1px solid #E5E7EB;
        font-size: 12px;
      }
      tr:nth-child(even) td {
        background: #F9FAFB;
      }
      .text-right {
        text-align: right;
      }
      .text-center {
        text-align: center;
      }
      .totals-container {
        display: flex;
        justify-content: flex-end;
        margin-top: 10px;
      }
      .totals-table {
        width: 280px;
        border-collapse: collapse;
      }
      .totals-table td {
        padding: 6px 10px;
        border: none;
      }
      .total-due {
        background: #F5BD18 !important;
        color: #111827 !important;
        font-size: 15px !important;
        font-weight: 800 !important;
        border-radius: 4px;
      }
      .footer-note {
        margin-top: 40px;
        padding-top: 15px;
        border-top: 1px solid #E5E7EB;
        font-size: 11px;
        color: #667085;
        text-align: center;
      }
      .stamp-box {
        margin-top: 20px;
        display: flex;
        justify-content: space-between;
      }
      .stamp-area {
        width: 180px;
        height: 80px;
        border: 1px dashed #CBD5E1;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94A3B8;
        font-size: 11px;
        font-weight: 600;
      }
    </style>
  `
}

export function renderInvoiceHtml(sale: Sale, profile: StoreProfile): string {
  const isAr = profile.language === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'

  let rowsHtml = ''
  let idx = 1
  for (const item of sale.items || []) {
    rowsHtml += `
      <tr>
        <td class="text-center">${idx++}</td>
        <td><strong>${item.reference}</strong></td>
        <td>${item.designation}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${formatCurrencyDA(item.unit_price, profile.language)}</td>
        <td class="text-center">${item.tax_rate}%</td>
        <td class="text-right"><strong>${formatCurrencyDA(item.total_line, profile.language)}</strong></td>
      </tr>
    `
  }

  return `
    <!DOCTYPE html>
    <html lang="${profile.language}" dir="${dir}">
      <head>
        <meta charset="UTF-8" />
        <title>Facture ${sale.invoice_number}</title>
        ${baseStyles()}
      </head>
      <body>
        <div class="header-container">
          <div>
            <div class="brand-title">WeFlow Pneus</div>
            <div class="brand-subtitle">${profile.store_name}</div>
            <div class="store-info">
              ${profile.address}, ${profile.wilaya}<br />
              Tél: ${profile.phone} ${profile.email ? `| Email: ${profile.email}` : ''}<br />
              ${profile.rc_number ? `RC: ${profile.rc_number} ` : ''}${profile.nif_number ? `| NIF: ${profile.nif_number}` : ''}
            </div>
          </div>
          <div class="doc-badge">
            <div class="doc-type">${isAr ? 'فاتورة بيع' : 'Facture de Vente'}</div>
            <div class="doc-number">${sale.invoice_number}</div>
            <div class="doc-date">${isAr ? 'التاريخ' : 'Date'}: ${formatDateStr(sale.date, profile.language)}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h4>${isAr ? 'معلومات الزبون' : 'Informations Client'}</h4>
            <p>${sale.customer_name || 'Client Passager'}</p>
            <span>${sale.customer_phone ? `Tél: ${sale.customer_phone}` : ''}</span>
          </div>
          <div class="info-box">
            <h4>${isAr ? 'معلومات المركبة' : 'Informations Véhicule'}</h4>
            <p>${sale.vehicle_info || 'Non renseigné'}</p>
            <span>${sale.license_plate ? `Immatriculation: ${sale.license_plate} ` : ''}${sale.mileage ? `| Kilométrage: ${sale.mileage} km` : ''}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px">#</th>
              <th>${isAr ? 'المرجع' : 'Référence'}</th>
              <th>${isAr ? 'التعيين' : 'Désignation'}</th>
              <th class="text-center" style="width: 60px">${isAr ? 'الكمية' : 'Qté'}</th>
              <th class="text-right">${isAr ? 'سعر الوحدة' : 'Prix Unit. HT'}</th>
              <th class="text-center" style="width: 60px">${isAr ? 'الضريبة' : 'TVA'}</th>
              <th class="text-right">${isAr ? 'المجموع' : 'Total TTC'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="totals-container">
          <table class="totals-table">
            <tr>
              <td>${isAr ? 'المجموع بدون ضريبة' : 'Sous-total HT'}</td>
              <td class="text-right"><strong>${formatCurrencyDA(sale.subtotal, profile.language)}</strong></td>
            </tr>
            <tr>
              <td>${isAr ? 'ضريبة القيمة المضافة' : `TVA (${sale.tax_rate}%)`}</td>
              <td class="text-right">${formatCurrencyDA(sale.tax_amount, profile.language)}</td>
            </tr>
            ${
              sale.discount_amount > 0
                ? `
            <tr>
              <td>${isAr ? 'التخفيض' : 'Remise'}</td>
              <td class="text-right">-${formatCurrencyDA(sale.discount_amount, profile.language)}</td>
            </tr>`
                : ''
            }
            <tr class="total-due">
              <td>${isAr ? 'الصافي للدفع' : 'TOTAL TTC'}</td>
              <td class="text-right">${formatCurrencyDA(sale.total_amount, profile.language)}</td>
            </tr>
            <tr>
              <td>${isAr ? 'المدفوع' : 'Montant Réglé'}</td>
              <td class="text-right">${formatCurrencyDA(sale.paid_amount, profile.language)}</td>
            </tr>
            ${
              sale.balance_due > 0
                ? `
            <tr>
              <td style="color: #DC2626; font-weight: bold">${isAr ? 'المتبقي' : 'Reste à Payer'}</td>
              <td class="text-right" style="color: #DC2626; font-weight: bold">${formatCurrencyDA(sale.balance_due, profile.language)}</td>
            </tr>`
                : ''
            }
          </table>
        </div>

        <div class="stamp-box">
          <div class="stamp-area">${isAr ? 'توقيع الزبون' : 'Signature Client'}</div>
          <div class="stamp-area">${isAr ? 'ختم وتوقيع المحل' : 'Cachet & Signature Magasin'}</div>
        </div>

        <div class="footer-note">
          ${profile.invoice_footer || 'Merci pour votre confiance. Garantie légale sur pièces neuves et main-d’œuvre.'}
        </div>
      </body>
    </html>
  `
}

export function renderTicketHtml(sale: Sale, profile: StoreProfile): string {
  const is80 = profile.ticket_format === '80mm'
  const widthMm = is80 ? '72mm' : '52mm'

  let itemsHtml = ''
  for (const item of sale.items || []) {
    itemsHtml += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>${item.quantity}x ${item.designation}</span>
        <strong>${formatCurrencyDA(item.total_line, profile.language)}</strong>
      </div>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { margin: 2mm; size: ${is80 ? '80mm' : '58mm'} auto; }
          body {
            width: ${widthMm};
            font-family: monospace, sans-serif;
            font-size: 12px;
            color: #000;
            padding: 4px;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <strong style="font-size: 15px;">WEFLOW PNEUS</strong><br />
          <span>${profile.store_name}</span><br />
          <span>Tél: ${profile.phone}</span><br />
          <span>${profile.address}, ${profile.wilaya}</span>
        </div>
        <div class="divider"></div>
        <div>
          <div>Ticket: <strong>${sale.invoice_number}</strong></div>
          <div>Date: ${formatDateStr(sale.date, profile.language)}</div>
          ${sale.customer_name ? `<div>Client: ${sale.customer_name}</div>` : ''}
          ${sale.license_plate ? `<div>Immat: ${sale.license_plate}</div>` : ''}
        </div>
        <div class="divider"></div>
        <div>${itemsHtml}</div>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
          <span>TOTAL:</span>
          <span>${formatCurrencyDA(sale.total_amount, profile.language)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
          <span>Payé:</span>
          <span>${formatCurrencyDA(sale.paid_amount, profile.language)}</span>
        </div>
        ${
          sale.balance_due > 0
            ? `
        <div style="display: flex; justify-content: space-between; font-weight: bold; color: red;">
          <span>Reste:</span>
          <span>${formatCurrencyDA(sale.balance_due, profile.language)}</span>
        </div>`
            : ''
        }
        <div class="divider"></div>
        <div class="text-center" style="font-size: 10px; margin-top: 6px;">
          Merci de votre visite !<br />
          WeFlow Pneus ERP
        </div>
      </body>
    </html>
  `
}

export function renderQuotationHtml(quote: Quotation, profile: StoreProfile): string {
  const isAr = profile.language === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'

  let rowsHtml = ''
  let idx = 1
  for (const item of quote.items || []) {
    rowsHtml += `
      <tr>
        <td class="text-center">${idx++}</td>
        <td><strong>${item.reference}</strong></td>
        <td>${item.designation}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${formatCurrencyDA(item.unit_price, profile.language)}</td>
        <td class="text-right"><strong>${formatCurrencyDA(item.total_line, profile.language)}</strong></td>
      </tr>
    `
  }

  return `
    <!DOCTYPE html>
    <html lang="${profile.language}" dir="${dir}">
      <head>
        <meta charset="UTF-8" />
        <title>Devis ${quote.quote_number}</title>
        ${baseStyles()}
      </head>
      <body>
        <div class="header-container">
          <div>
            <div class="brand-title">WeFlow Pneus</div>
            <div class="brand-subtitle">${profile.store_name}</div>
            <div class="store-info">
              ${profile.address}, ${profile.wilaya}<br />
              Tél: ${profile.phone}
            </div>
          </div>
          <div class="doc-badge">
            <div class="doc-type">${isAr ? 'عرض أسعار' : 'Devis / Proforma'}</div>
            <div class="doc-number">${quote.quote_number}</div>
            <div class="doc-date">${isAr ? 'التاريخ' : 'Date'}: ${formatDateStr(quote.date, profile.language)}</div>
            <div class="doc-date">${isAr ? 'صالح إلى' : 'Valide jusqu’au'}: ${formatDateStr(quote.valid_until, profile.language)}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h4>${isAr ? 'معلومات الزبون' : 'Client'}</h4>
            <p>${quote.customer_name || 'Client'}</p>
            <span>${quote.customer_phone ? `Tél: ${quote.customer_phone}` : ''}</span>
          </div>
          <div class="info-box">
            <h4>${isAr ? 'المركبة المعنية' : 'Véhicule'}</h4>
            <p>${quote.vehicle_info || 'Non précisé'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px">#</th>
              <th>${isAr ? 'المرجع' : 'Référence'}</th>
              <th>${isAr ? 'التعيين' : 'Désignation'}</th>
              <th class="text-center" style="width: 60px">${isAr ? 'الكمية' : 'Qté'}</th>
              <th class="text-right">${isAr ? 'السعر الفردي' : 'Prix Unit.'}</th>
              <th class="text-right">${isAr ? 'المجموع' : 'Total TTC'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="totals-container">
          <table class="totals-table">
            <tr>
              <td>Sous-total HT</td>
              <td class="text-right"><strong>${formatCurrencyDA(quote.subtotal, profile.language)}</strong></td>
            </tr>
            <tr>
              <td>TVA (19%)</td>
              <td class="text-right">${formatCurrencyDA(quote.tax_amount, profile.language)}</td>
            </tr>
            <tr class="total-due">
              <td>TOTAL DEVIS</td>
              <td class="text-right">${formatCurrencyDA(quote.total_amount, profile.language)}</td>
            </tr>
          </table>
        </div>

        <div class="stamp-box">
          <div class="stamp-area">Bon pour Accord Client</div>
          <div class="stamp-area">Cachet & Signature Magasin</div>
        </div>

        <div class="footer-note">
          Ce devis est valable jusqu'au ${formatDateStr(quote.valid_until, profile.language)}. Les prix sont indiqués en Dinars Algériens (DA).
        </div>
      </body>
    </html>
  `
}

export function renderPurchaseHtml(purchase: Purchase, profile: StoreProfile): string {
  let rowsHtml = ''
  let idx = 1
  for (const item of purchase.items || []) {
    rowsHtml += `
      <tr>
        <td class="text-center">${idx++}</td>
        <td><strong>${item.reference}</strong></td>
        <td>${item.brand} - ${item.dimension}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${formatCurrencyDA(item.unit_cost, profile.language)}</td>
        <td class="text-right"><strong>${formatCurrencyDA(item.total_cost, profile.language)}</strong></td>
      </tr>
    `
  }

  return `
    <!DOCTYPE html>
    <html lang="${profile.language}">
      <head>
        <meta charset="UTF-8" />
        <title>Commande Fournisseur ${purchase.purchase_number}</title>
        ${baseStyles()}
      </head>
      <body>
        <div class="header-container">
          <div>
            <div class="brand-title">WeFlow Pneus</div>
            <div class="brand-subtitle">Bon de Commande & Réception</div>
          </div>
          <div class="doc-badge">
            <div class="doc-type">${purchase.status === 'received' ? 'Bon de Réception' : 'Bon de Commande'}</div>
            <div class="doc-number">${purchase.purchase_number}</div>
            <div class="doc-date">Date: ${formatDateStr(purchase.date, profile.language)}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h4>Fournisseur</h4>
            <p>${purchase.supplier_name}</p>
          </div>
          <div class="info-box">
            <h4>Statut</h4>
            <p style="text-transform: uppercase; color: #F5BD18;">${purchase.status}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px">#</th>
              <th>Référence</th>
              <th>Article</th>
              <th class="text-center" style="width: 60px">Qté</th>
              <th class="text-right">Prix d'Achat Unitaire</th>
              <th class="text-right">Total Achat</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="totals-container">
          <table class="totals-table">
            <tr class="total-due">
              <td>TOTAL COMMANDE</td>
              <td class="text-right">${formatCurrencyDA(purchase.total_amount, profile.language)}</td>
            </tr>
            <tr>
              <td>Montant Réglé</td>
              <td class="text-right">${formatCurrencyDA(purchase.paid_amount, profile.language)}</td>
            </tr>
            <tr>
              <td>Solde Restant Dû</td>
              <td class="text-right"><strong>${formatCurrencyDA(purchase.balance_due, profile.language)}</strong></td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `
}

export function renderServiceOrderHtml(order: ServiceOrder, profile: StoreProfile): string {
  let rowsHtml = ''
  let idx = 1
  for (const item of order.items || []) {
    rowsHtml += `
      <tr>
        <td class="text-center">${idx++}</td>
        <td><strong>${item.service_name}</strong></td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${formatCurrencyDA(item.unit_price, profile.language)}</td>
        <td class="text-right"><strong>${formatCurrencyDA(item.quantity * item.unit_price, profile.language)}</strong></td>
      </tr>
    `
  }

  return `
    <!DOCTYPE html>
    <html lang="${profile.language}">
      <head>
        <meta charset="UTF-8" />
        <title>Ordre de Réparation ${order.order_number}</title>
        ${baseStyles()}
      </head>
      <body>
        <div class="header-container">
          <div>
            <div class="brand-title">WeFlow Pneus Atelier</div>
            <div class="brand-subtitle">Fiche d'Intervention & Montage</div>
          </div>
          <div class="doc-badge">
            <div class="doc-type">Ordre de Travail</div>
            <div class="doc-number">${order.order_number}</div>
            <div class="doc-date">Date: ${formatDateStr(order.date, profile.language)}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h4>Client & Véhicule</h4>
            <p>${order.customer_name || 'Client'}</p>
            <span>${order.vehicle_info || ''} | Immat: ${order.license_plate || '-'}</span>
          </div>
          <div class="info-box">
            <h4>Technicien en charge</h4>
            <p>${order.technician_name || 'Atelier'}</p>
            <span>Statut: ${order.status}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px">#</th>
              <th>Prestation Atelier</th>
              <th class="text-center" style="width: 60px">Qté</th>
              <th class="text-right">Tarif Unitaire</th>
              <th class="text-right">Total Prestation</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="totals-container">
          <table class="totals-table">
            <tr class="total-due">
              <td>TOTAL SERVICES</td>
              <td class="text-right">${formatCurrencyDA(order.total_amount, profile.language)}</td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `
}

export function renderClosingZHtml(session: CashSession, profile: StoreProfile): string {
  return `
    <!DOCTYPE html>
    <html lang="${profile.language}">
      <head>
        <meta charset="UTF-8" />
        <title>Clôture de Caisse Z - ${session.session_date}</title>
        ${baseStyles()}
      </head>
      <body>
        <div class="header-container">
          <div>
            <div class="brand-title">WeFlow Pneus</div>
            <div class="brand-subtitle">Rapport de Clôture Journalière (Z)</div>
          </div>
          <div class="doc-badge">
            <div class="doc-type">Clôture Caisse</div>
            <div class="doc-number">Date: ${session.session_date}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h4>Ouverture</h4>
            <p>${session.opened_at}</p>
            <span>Fond de caisse initial: ${formatCurrencyDA(session.initial_cash, profile.language)}</span>
          </div>
          <div class="info-box">
            <h4>Fermeture</h4>
            <p>${session.closed_at || 'En cours'}</p>
            <span>Statut: ${session.status}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Indicateur Financier</th>
              <th class="text-right">Montant (DA)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Fond de caisse initial (Ouverture)</td>
              <td class="text-right">${formatCurrencyDA(session.initial_cash, profile.language)}</td>
            </tr>
            <tr>
              <td>Total des Entrées (Ventes + Règlements créances)</td>
              <td class="text-right" style="color: green;">+${formatCurrencyDA(session.total_in, profile.language)}</td>
            </tr>
            <tr>
              <td>Total des Sorties (Dépenses + Retraits)</td>
              <td class="text-right" style="color: red;">-${formatCurrencyDA(session.total_out, profile.language)}</td>
            </tr>
            <tr style="font-weight: bold; background: #E5E7EB;">
              <td>Solde Théorique Calculé</td>
              <td class="text-right">${formatCurrencyDA(session.calculated_cash, profile.language)}</td>
            </tr>
            <tr style="font-weight: bold;">
              <td>Solde Réel Constaté</td>
              <td class="text-right">${formatCurrencyDA(session.actual_cash ?? session.calculated_cash, profile.language)}</td>
            </tr>
            <tr>
              <td>Écart de Caisse</td>
              <td class="text-right" style="font-weight: bold; color: ${session.difference && session.difference < 0 ? 'red' : 'green'};">
                ${formatCurrencyDA(session.difference ?? 0, profile.language)}
              </td>
            </tr>
          </tbody>
        </table>

        ${session.notes ? `<div style="margin-top: 15px; font-size: 12px; color: #667085;"><strong>Observations:</strong> ${session.notes}</div>` : ''}

        <div class="stamp-box" style="margin-top: 50px;">
          <div class="stamp-area">Signature Caissier</div>
          <div class="stamp-area">Visa Gérant / Responsable</div>
        </div>
      </body>
    </html>
  `
}

export function renderTireLabelsHtml(labels: LabelPrintConfig[], profile: StoreProfile): string {
  let labelsHtml = ''

  for (const item of labels) {
    const barcodeSvg = generateBarcodeSvg(item.barcode, 40)
    for (let i = 0; i < (item.quantity || 1); i++) {
      labelsHtml += `
        <div class="label-item">
          <div class="label-brand">${item.brand.toUpperCase()}</div>
          <div class="label-model">${item.model_name}</div>
          <div class="label-dimension">${item.dimension}</div>
          <div class="label-specs">${item.load_index}${item.speed_rating} | ${item.tire_type}</div>
          <div class="label-price">${formatCurrencyDA(item.price, profile.language)}</div>
          <div class="label-barcode">${barcodeSvg}</div>
          <div class="label-ref">Réf: ${item.reference}</div>
        </div>
      `
    }
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Étiquettes Pneumatiques</title>
        <style>
          @page {
            margin: 5mm;
            size: A4 portrait;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          body {
            background: #fff;
            padding: 5mm;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .label-item {
            border: 2px solid #172235;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            background: #ffffff;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            height: 195px;
          }
          .label-brand {
            font-size: 16px;
            font-weight: 900;
            color: #172235;
            letter-spacing: 0.5px;
          }
          .label-model {
            font-size: 12px;
            font-weight: 600;
            color: #667085;
          }
          .label-dimension {
            font-size: 20px;
            font-weight: 900;
            color: #111827;
            background: #F5BD18;
            padding: 4px 10px;
            border-radius: 4px;
            margin: 4px 0;
            width: 100%;
          }
          .label-specs {
            font-size: 12px;
            font-weight: 700;
            color: #172235;
          }
          .label-price {
            font-size: 16px;
            font-weight: 900;
            color: #172235;
          }
          .label-barcode {
            margin-top: 2px;
          }
          .label-barcode svg {
            max-width: 150px;
            height: auto;
          }
          .label-ref {
            font-size: 10px;
            color: #667085;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="grid-container">
          ${labelsHtml}
        </div>
      </body>
    </html>
  `
}
