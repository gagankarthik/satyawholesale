import Link from "next/link";
import {
  ArrowLeft, Grid, Receipt, Users, Mail, Inbox, Tag, Truck, Sparkles,
  Refresh, Package, Store, Shield, Card, Gear, Barcode,
} from "@/components/Icons";
import { PAYMENT_TERMS, type PaymentTerm } from "@/lib/paymentTerms";

/* =======================================================================
   ADMIN HELP & GUIDES — full documentation for warehouse staff. Explains
   every area of the console (what it is + how to do it in this app):
   the customer ID / membership number, the stock ledger, warehouse bins,
   purchase orders, SKU vs UPC, payment terms and settings. Admins only —
   the /admin layout gates every route to admin sessions.
   ======================================================================= */
export const metadata = { title: "Help & guides · Satya admin" };

const TOC: { group: string; items: { id: string; label: string }[] }[] = [
  { group: "Getting started", items: [{ id: "overview", label: "Console overview" }] },
  { group: "Sales", items: [
    { id: "dashboard", label: "Dashboard" },
    { id: "orders", label: "Orders" },
    { id: "accounts", label: "Accounts & customer ID" },
    { id: "messages", label: "Messages" },
  ] },
  { group: "Catalog", items: [
    { id: "products", label: "Products · SKU vs UPC" },
    { id: "import", label: "Bulk import" },
    { id: "categories", label: "Categories" },
    { id: "suppliers", label: "Suppliers" },
    { id: "promotions", label: "Promotions" },
  ] },
  { group: "Inventory", items: [
    { id: "ledger", label: "Stock ledger" },
    { id: "purchasing", label: "Purchase orders" },
    { id: "warehouse", label: "Warehouse" },
  ] },
  { group: "Admin", items: [
    { id: "users", label: "Users & roles" },
    { id: "terms", label: "Payment terms" },
    { id: "policies", label: "Settings & policies" },
  ] },
];

export default function AdminHelpPage() {
  const termGroups = PAYMENT_TERMS.reduce<Record<string, PaymentTerm[]>>((acc, t) => {
    (acc[t.group] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="guide">
      <div className="guide-top">
        <Link href="/admin/dashboard" className="btn btn-ghost btn-sm"><ArrowLeft /> Back to dashboard</Link>
      </div>

      <header className="guide-hero">
        <h1>Help &amp; guides</h1>
        <p>A complete walkthrough of the warehouse console. New to the team? Read top to bottom; otherwise jump to a topic.</p>
      </header>

      <div className="guide-layout">
        <nav className="guide-side" aria-label="Guide topics">
          {TOC.map((g) => (
            <div className="gs-group" key={g.group}>
              <span className="gs-label">{g.group}</span>
              {g.items.map((t) => <a key={t.id} href={`#${t.id}`}>{t.label}</a>)}
            </div>
          ))}
        </nav>

        <div className="guide-body">
          {/* ---- Console overview ---- */}
          <section id="overview" className="panel guide-sec">
            <div className="panel-h"><h3><Grid /> Console overview</h3></div>
            <p className="guide-p">The left sidebar groups every tool into four areas. Use the search box at the top of any page to jump straight to a section by name.</p>
            <dl className="guide-def">
              <dt>Sales</dt><dd>Dashboard analytics, customer orders, customer accounts and the site message inbox.</dd>
              <dt>Catalog</dt><dd>Products, bulk import, categories, suppliers and the promotions shown in the portal.</dd>
              <dt>Inventory</dt><dd>The stock ledger, purchase orders and the warehouse bin map.</dd>
              <dt>Admin</dt><dd>Staff users &amp; roles, company / tax / warehouse settings, and POS sync.</dd>
            </dl>
          </section>

          {/* ---- Dashboard ---- */}
          <section id="dashboard" className="panel guide-sec">
            <div className="panel-h"><h3><Grid /> Dashboard</h3></div>
            <p className="guide-p">Your at-a-glance view of the business. Pick a date range (top-right) to see revenue, orders, average order value and cases shipped, each compared to the previous period, plus revenue trend, order status mix, top products, and reorder suggestions.</p>
            <Link href="/admin/dashboard" className="btn btn-ghost btn-sm">Open Dashboard</Link>
          </section>

          {/* ---- Orders ---- */}
          <section id="orders" className="panel guide-sec">
            <div className="panel-h"><h3><Receipt /> Orders</h3></div>
            <p className="guide-p">Every order a customer places in the portal lands here. Open one to see its lines, totals, payment and delivery details.</p>
            <ol className="guide-steps">
              <li>Orders move through <b>Pending → Processing → At Local Facility → Out for delivery → Completed</b> (or <b>Cancelled</b>). Advance the status as you pick, stage and ship.</li>
              <li>Set the <b>payment status</b> (Unpaid, Paid, Partial, Refunded) as money is collected.</li>
              <li>A Pending order can still be edited or cancelled; once you start processing it, cancellation is manual so the pick can be stopped.</li>
              <li>Each order shows its account&apos;s <b>customer ID</b> (membership number) so it ties back to the buyer.</li>
            </ol>
            <Link href="/admin/orders" className="btn btn-ghost btn-sm">Open Orders</Link>
          </section>

          {/* ---- Accounts & customer ID ---- */}
          <section id="accounts" className="panel guide-sec">
            <div className="panel-h"><h3><Users /> Accounts &amp; the customer ID</h3></div>
            <p className="guide-p"><b>The customer ID is the membership number</b>: a 12-digit, Costco-style number assigned automatically the moment an account is created. It is the customer&apos;s identity everywhere in the system: on their orders, on invoices, in the portal and on account search. It is <b>not</b> the internal database id, which is never shown.</p>
            <dl className="guide-def">
              <dt>Membership no.</dt><dd>The 12-digit customer ID, e.g. <span className="mono">100000000042</span>. Sequential and stable, it never changes once assigned. Search accounts by it.</dd>
              <dt>Status</dt><dd>Pending → Active once approved. Frozen (can sign in, can&apos;t order) or Blocked (no access) as needed.</dd>
            </dl>
            <ol className="guide-steps">
              <li>Stores apply from the public site. The account arrives <b>Pending</b> with their licenses and documents.</li>
              <li>Review the business and tobacco licenses and any uploaded files, approving each document.</li>
              <li><b>Approve</b> the account to make it Active; the membership number is assigned and used from then on.</li>
              <li>Use <b>Freeze</b> to pause ordering while keeping sign-in, or <b>Block</b> to remove access entirely.</li>
            </ol>
            <Link href="/admin/accounts" className="btn btn-ghost btn-sm">Open Accounts</Link>
          </section>

          {/* ---- Messages ---- */}
          <section id="messages" className="panel guide-sec">
            <div className="panel-h"><h3><Mail /> Messages</h3></div>
            <p className="guide-p">Enquiries sent through the public site&apos;s &ldquo;Send us a message&rdquo; form collect here. Unread messages show a badge on the sidebar; open one to read it and mark it handled.</p>
            <Link href="/admin/messages" className="btn btn-ghost btn-sm">Open Messages</Link>
          </section>

          {/* ---- Products: SKU vs UPC ---- */}
          <section id="products" className="panel guide-sec">
            <div className="panel-h"><h3><Barcode /> Products &middot; SKU vs UPC</h3></div>
            <p className="guide-p">Products are what customers buy in the portal. Onboard them from <b>Products → Onboard product</b>, set pricing, stock, category and supplier. Every product carries two codes, keep both accurate:</p>
            <dl className="guide-def">
              <dt>SKU</dt><dd>Your <b>internal item code</b> for local inventory management (e.g. <span className="mono">100-2345</span>). Optional and set by you; it never leaves your systems.</dd>
              <dt>UPC</dt><dd>The <b>retailer / manufacturer barcode</b> on the pack (UPC-A (12) or EAN-13 (13)). Scanned at receiving and checkout, validated by its check digit.</dd>
            </dl>
            <div className="guide-links">
              <Link href="/admin/products" className="btn btn-ghost btn-sm">Open Products</Link>
              <Link href="/admin/products/new" className="btn btn-ghost btn-sm">Onboard a product</Link>
            </div>
          </section>

          {/* ---- Bulk import ---- */}
          <section id="import" className="panel guide-sec">
            <div className="panel-h"><h3><Inbox /> Bulk import</h3></div>
            <p className="guide-p">Add many products at once by pasting a CSV. Columns: <span className="mono">name, category, upc, cost, price, caseQty, uom, reorderPoint, maxStock, supplierId, stock</span>.</p>
            <ol className="guide-steps">
              <li>Load the sample CSV to see the format, then paste your rows.</li>
              <li><b>Validate</b>: each row is checked for schema, integrity (unknown category / supplier, duplicate UPC) and business rules (price below cost, reorder above max).</li>
              <li>Fix any flagged rows, then <b>Commit</b> the clean ones. Each committed product is logged into the stock ledger as a receipt.</li>
            </ol>
            <Link href="/admin/import" className="btn btn-ghost btn-sm">Open Bulk import</Link>
          </section>

          {/* ---- Categories ---- */}
          <section id="categories" className="panel guide-sec">
            <div className="panel-h"><h3><Tag /> Categories</h3></div>
            <p className="guide-p">Categories are the departments products live under in the portal (tobacco, vape, grocery, HBA and so on). Manage their names, icons and grouping here; every product is assigned one category.</p>
            <Link href="/admin/categories" className="btn btn-ghost btn-sm">Open Categories</Link>
          </section>

          {/* ---- Suppliers ---- */}
          <section id="suppliers" className="panel guide-sec">
            <div className="panel-h"><h3><Truck /> Suppliers</h3></div>
            <p className="guide-p">Suppliers are who you buy stock from. Enrol them here before raising purchase orders.</p>
            <ol className="guide-steps">
              <li>Choose <b>Add supplier</b> and enter the name, contact person, email and phone.</li>
              <li>Set their <b>payment terms</b>, <b>lead time</b> (days from order to delivery) and delivery day.</li>
              <li>Save. The supplier is now selectable when onboarding products and creating purchase orders.</li>
              <li>Link products to the supplier from <b>Products → edit → Supplier</b>.</li>
            </ol>
            <Link href="/admin/suppliers" className="btn btn-ghost btn-sm">Open Suppliers</Link>
          </section>

          {/* ---- Promotions ---- */}
          <section id="promotions" className="panel guide-sec">
            <div className="panel-h"><h3><Sparkles /> Promotions</h3></div>
            <p className="guide-p">Promotions power the carousel and highlighted offers in the portal. Add a title, image and tag, optionally link a &ldquo;Shop now&rdquo; destination, and toggle it active to publish it to customers.</p>
            <Link href="/admin/promotions" className="btn btn-ghost btn-sm">Open Promotions</Link>
          </section>

          {/* ---- Stock ledger ---- */}
          <section id="ledger" className="panel guide-sec">
            <div className="panel-h"><h3><Refresh /> Stock ledger &mdash; how it works</h3></div>
            <p className="guide-p">The stock ledger is the single audit trail of everything that affects stock. It is one activity table; the <b>Show</b> filter navigates between the four kinds of record, and the search box narrows whatever is in view.</p>
            <dl className="guide-def">
              <dt>Movements</dt><dd>Every stock change (receipts, picks, transfers and manual adjustments) with In / Out quantities and a running balance when you narrow to one product.</dd>
              <dt>Purchase orders</dt><dd>Inbound orders: cases ordered vs received and the PO value.</dd>
              <dt>Sales</dt><dd>Outbound customer orders: cases out and revenue.</dd>
              <dt>Stock health</dt><dd>The exceptions to act on: products <b>out of stock</b>, <b>below reorder</b>, or <b>overstocked</b> above their max.</dd>
            </dl>
            <ol className="guide-steps">
              <li>Read the KPI row for the totals of whatever the filter shows (records, cases in, cases out, value).</li>
              <li>Use <b>New adjustment</b> to correct on-hand stock. Pick the product, enter a &plusmn; quantity and a reason. It posts to on-hand stock and logs a movement.</li>
              <li>Edit or delete a movement from its row menu; adjusting a manual entry re-applies the difference to stock automatically.</li>
            </ol>
            <Link href="/admin/inventory" className="btn btn-ghost btn-sm">Open Stock ledger</Link>
          </section>

          {/* ---- Purchase orders ---- */}
          <section id="purchasing" className="panel guide-sec">
            <div className="panel-h"><h3><Package /> Purchase orders &amp; receiving</h3></div>
            <p className="guide-p">Purchase orders (POs) are how you buy stock in from suppliers and record what arrives.</p>
            <ol className="guide-steps">
              <li>Create a PO for a supplier and add the products and case quantities (it starts as <b>Draft</b>).</li>
              <li>POs above the approval threshold need a manager to <b>approve</b> before sending.</li>
              <li><b>Send</b> the PO to the supplier.</li>
              <li><b>Receive</b> cases as they arrive (within the receiving tolerance) and each receipt writes a movement into the stock ledger.</li>
              <li>Reconcile the PO against the goods receipt and the supplier invoice (a three-way match) before it&apos;s paid; log credit memos for shortages or damage.</li>
            </ol>
            <Link href="/admin/purchaseorder" className="btn btn-ghost btn-sm">Open Purchase orders</Link>
          </section>

          {/* ---- Warehouse ---- */}
          <section id="warehouse" className="panel guide-sec">
            <div className="panel-h"><h3><Store /> Warehouse</h3></div>
            <p className="guide-p">The warehouse map is your physical storage laid out as bins, grouped by zone. Each bin has a capacity and a used count, and the fill bar shows how full it is.</p>
            <dl className="guide-def">
              <dt>Bin ID</dt><dd>Built from zone, aisle, rack and bin, e.g. <span className="mono">A-01-R1-B1</span>. Zones group the bins in the table with their rolled-up utilisation.</dd>
              <dt>Utilisation</dt><dd>Used &divide; capacity. Bins at 85%+ are flagged as near full so you can rebalance before they overflow.</dd>
            </dl>
            <ol className="guide-steps">
              <li>Choose <b>Add bin</b> and enter the zone, aisle, rack, bin, capacity and current use.</li>
              <li>Search by bin, aisle or rack, or filter to a single zone.</li>
              <li>Use a bin&apos;s row menu to <b>edit</b> its capacity / used count or <b>remove</b> it.</li>
            </ol>
            <Link href="/admin/warehouse" className="btn btn-ghost btn-sm">Open Warehouse</Link>
          </section>

          {/* ---- Users & roles ---- */}
          <section id="users" className="panel guide-sec">
            <div className="panel-h"><h3><Shield /> Users &amp; roles</h3></div>
            <p className="guide-p">Manage the staff who can sign in to the console and what they can do.</p>
            <dl className="guide-def">
              <dt>Admin</dt><dd>Full access to every area including users and settings.</dd>
              <dt>Inventory Manager</dt><dd>Runs products, stock, purchasing and the warehouse.</dd>
              <dt>Buyer</dt><dd>Creates and manages purchase orders and suppliers.</dd>
              <dt>Receiver</dt><dd>Receives goods and posts stock movements.</dd>
              <dt>Viewer</dt><dd>Read-only access to review the console.</dd>
            </dl>
            <Link href="/admin/users" className="btn btn-ghost btn-sm">Open Users &amp; roles</Link>
          </section>

          {/* ---- Payment terms ---- */}
          <section id="terms" className="panel guide-sec">
            <div className="panel-h"><h3><Card /> Payment terms</h3></div>
            <p className="guide-p">The terms you can set on an account or an order, grouped by how they work. The stored value is the term name itself, so it reads the same everywhere it appears.</p>
            <div className="guide-terms">
              {Object.entries(termGroups).map(([group, terms]) => (
                <div className="guide-termgroup" key={group}>
                  <h4>{group}</h4>
                  {terms.map((t) => (
                    <div className="guide-term" key={t.label}><b>{t.label}</b><span>{t.info}</span></div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* ---- Settings & policies ---- */}
          <section id="policies" className="panel guide-sec">
            <div className="panel-h"><h3><Gear /> Settings &amp; policies</h3></div>
            <dl className="guide-def">
              <dt>Company</dt><dd>Legal name, warehouse address, phone, email and hours shown on invoices and the site.</dd>
              <dt>Tax &amp; invoicing</dt><dd>Sales and county tax rates and their invoice labels. B2B resale accounts are exempt by default.</dd>
              <dt>Ordering policy</dt><dd>Order minimum, delivery fee, and the subtotal above which delivery is free.</dd>
              <dt>Warehouse policy</dt><dd>Low-stock threshold, the PO value that triggers manager approval, and the receiving tolerance, all admin-editable.</dd>
            </dl>
            <Link href="/admin/settings" className="btn btn-ghost btn-sm">Open Settings</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
