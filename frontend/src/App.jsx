import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Bot, Boxes, DollarSign, Plus, Trash2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [chatMessage, setChatMessage] = useState("show low stock");
  const [chatReply, setChatReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    item_name: "",
    category: "",
    quantity: "",
    threshold: "",
    unit_price: "",
    location: "Main Store",
  });

  async function request(path, options = {}) {
    const res = await fetch(`${API}${path}`, options);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }

  async function loadData() {
    setLoading(true);
    try {
      const [inv, al, an] = await Promise.all([
        request("/inventory"),
        request("/alerts"),
        request("/analytics"),
      ]);
      setInventory(inv);
      setAlerts(al);
      setAnalytics(an);
    } catch (err) {
      setChatReply(`Backend connection error. Check API at ${API}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function seedData() {
    await request("/seed", { method: "POST" });
    await loadData();
  }

  async function addItem(e) {
    e.preventDefault();
    await request("/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_name: form.item_name,
        category: form.category,
        quantity: Number(form.quantity),
        threshold: Number(form.threshold),
        unit_price: Number(form.unit_price),
        location: form.location,
      }),
    });
    setForm({ item_name: "", category: "", quantity: "", threshold: "", unit_price: "", location: "Main Store" });
    await loadData();
  }

  async function deleteItem(id) {
    await request(`/inventory/${id}`, { method: "DELETE" });
    await loadData();
  }

  async function askAgent() {
    const data = await request("/agent-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: chatMessage }),
    });
    setChatReply(data.reply);
  }

  const categoryRows = useMemo(() => {
    const units = analytics.category_units || {};
    return Object.entries(units).map(([category, qty]) => ({ category, qty }));
  }, [analytics]);

  return (
    <main>
      <nav className="navbar">
        <div className="brand">Xoriva</div>
        <a href="#inventory">Inventory</a>
        <a href="#alerts">Alerts</a>
        <a href="#agent">Ask XORA</a>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">Xoriva HealthOps AI</p>
          <h1>AI-Powered Health Operations Platform</h1>
          <p className="subtitle">Manage healthcare inventory, low-stock alerts, analytics, and AI workflow assistance for clinics, hospitals, and pharmacies.</p>
          <div className="actions">
            <button onClick={seedData}>Load demo data</button>
            <button className="secondary" onClick={loadData}>{loading ? "Refreshing..." : "Refresh"}</button>
          </div>
        </div>
        <div className="hero-card">
          <Activity size={54} />
          <h3>Operational intelligence</h3>
          <p>Live dashboard for supplies, reorders, and AI assistant answers.</p>
        </div>
      </section>

      <section className="cards">
        <Metric icon={<Boxes />} label="Item Types" value={analytics.total_items || 0} />
        <Metric icon={<Activity />} label="Total Units" value={analytics.total_units || 0} />
        <Metric icon={<AlertTriangle />} label="Low Stock" value={analytics.low_stock_alerts || 0} />
        <Metric icon={<DollarSign />} label="Inventory Value" value={`$${analytics.inventory_value || 0}`} />
      </section>

      <section className="grid">
        <div className="panel" id="inventory">
          <h2><Plus size={22} /> Add inventory</h2>
          <form className="form" onSubmit={addItem}>
            <input required placeholder="Item name" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} />
            <input required placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <input required placeholder="Quantity" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            <input required placeholder="Threshold" type="number" value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })} />
            <input required placeholder="Unit price" type="number" step="0.01" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
            <input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <button type="submit">Add item</button>
          </form>
        </div>

        <div className="panel" id="agent">
          <h2><Bot size={22} /> Ask XORA</h2>
          <div className="chat-row">
            <input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Ask: low stock, inventory value, reorder recommendation" />
            <button onClick={askAgent}>Ask</button>
          </div>
          {chatReply && <div className="reply">{chatReply}</div>}
        </div>
      </section>

      <section className="panel" id="alerts">
        <h2><AlertTriangle size={22} /> Low-stock alerts</h2>
        {alerts.length === 0 ? <p className="muted">No alerts. Load demo data or add items below threshold.</p> : alerts.map(a => <div className="alert" key={a.id}>{a.message}</div>)}
      </section>

      <section className="panel">
        <h2>Inventory table</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Item</th><th>Category</th><th>Qty</th><th>Threshold</th><th>Unit price</th><th>Location</th><th></th></tr>
            </thead>
            <tbody>
              {inventory.map(item => (
                <tr key={item.id}>
                  <td>{item.item_name}</td><td>{item.category}</td><td>{item.quantity}</td><td>{item.threshold}</td><td>${item.unit_price}</td><td>{item.location}</td>
                  <td><button className="icon-btn" onClick={() => deleteItem(item.id)}><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Category units</h2>
        {categoryRows.length === 0 ? <p className="muted">No category data yet.</p> : categoryRows.map(row => <div className="bar" key={row.category}><span>{row.category}</span><strong>{row.qty}</strong></div>)}
      </section>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return <div className="card"><div className="card-icon">{icon}</div><p>{label}</p><h3>{value}</h3></div>;
}

export default App;
