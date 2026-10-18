import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';
import {
  AlertTriangle, Archive, ArrowDownToLine, BarChart3, Boxes, Check, ChevronRight,
  CircleDollarSign, FileCheck2, LayoutDashboard, Minus, Package,
  Plus, Search, Settings2, ShoppingBasket, ShoppingCart, Trash2, Upload,
  X, Pencil, RotateCcw, CalendarDays,
} from 'lucide-react';
import {
  Backup, Dashboard, Product, Reports, Sale,
  useCreateProduct, useCreateSale, useDeleteProduct, useDownloadBackup,
  useGetDashboard, useGetReports, useListProducts, useListSales,
  useRestoreBackup, useUpdateProduct, getListProductsQueryKey,
  getListSalesQueryKey, getGetDashboardQueryKey, getGetReportsQueryKey,
  getDownloadBackupQueryKey,
} from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, refetchOnWindowFocus: false, retry: 1 } },
});

const money = (amount: number) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount || 0);
const shortDate = (value: string) => new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const dateLabel = () => new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

type ToastState = { text: string; kind?: 'success' | 'error' } | null;
function useToastMessage() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = (text: string, kind: 'success' | 'error' = 'success') => {
    setToast({ text, kind });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  };
  return { toast, show };
}

const navItems = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/inventario', label: 'Inventario', icon: Package },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/configuracion', label: 'Configuración', icon: Settings2 },
];

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const name = navItems.find(item => item.href === location)?.label ?? 'Tienda';
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><ShoppingBasket size={21} /></div><div><div className="brand-title">La Esquina</div><div className="brand-sub">Tienda de abarrotes</div></div></div>
      <div className="nav-label">Menú principal</div>
      <nav className="nav-list">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${location === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link>)}</nav>
      <div className="sidebar-bottom"><div className="store-note"><strong>Todo en su lugar</strong><span>Tu negocio, al día y en orden.</span></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb">La Esquina <ChevronRight size={12} style={{ verticalAlign: 'middle', margin: '0 5px' }} /> <strong style={{ color: '#405b49' }}>{name}</strong></div><div className="top-right"><span className="today-label">{dateLabel()}</span><div className="avatar-shop">LE</div></div></header>
      {children}
    </main>
    <nav className="mobile-bar">{navItems.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={`mobile-link ${location === href ? 'active' : ''}`} data-testid={`mobile-nav-${label.toLowerCase()}`}><Icon /><span>{label}</span></Link>)}</nav>
  </div>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="page-subtitle">{subtitle}</p></div>{action}</div>;
}
function LoadingRows({ count = 4 }: { count?: number }) {
  return <div aria-label="Cargando información">{Array.from({ length: count }, (_, i) => <div className="skeleton-row" key={i}>{[1, 2, 3, 4].map(n => <div className="loading-line" key={n} />)}</div>)}</div>;
}
function ErrorMessage({ retry }: { retry: () => void }) {
  return <div className="error-box"><span>No pudimos cargar la información. Revisa tu conexión e inténtalo de nuevo.</span><button className="button button-soft" onClick={retry}>Reintentar</button></div>;
}
function EmptyState({ title, detail, icon: Icon = Package }: { title: string; detail: string; icon?: typeof Package }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={20} /></div><strong>{title}</strong><span>{detail}</span></div>;
}
function Toast({ state }: { state: ToastState }) {
  return state ? <div className="toast-message" role="status" style={state.kind === 'error' ? { background: '#91483c' } : undefined}>{state.text}</div> : null;
}

function DashboardPage() {
  const { data, isLoading, isError, refetch } = useGetDashboard();
  const dashboard = data as Dashboard | undefined;
  return <Shell><div className="content">
    <PageHeading eyebrow="Resumen de hoy" title="Buen día, tendero." subtitle="Así va tu tienda. Todo lo importante, de un vistazo." action={<Link href="/ventas" className="button button-primary"><Plus size={16} /> Registrar venta</Link>} />
    {isError && <ErrorMessage retry={() => void refetch()} />}
    {isLoading ? <><div className="stats-grid">{[1, 2, 3, 4].map(i => <div key={i} className="panel stat-card"><div className="loading-line" /><div className="loading-line" style={{ width: '55%', marginTop: 25 }} /></div>)}</div><div className="panel"><LoadingRows /></div></> : dashboard && <>
      <section className="stats-grid">
        <Stat title="Ventas de hoy" value={money(dashboard.salesToday)} note="Acumulado de esta jornada" icon={CircleDollarSign} />
        <Stat title="Ventas del mes" value={money(dashboard.salesThisMonth)} note="Desde el primer día del mes" icon={BarChart3} />
        <Stat title="Productos activos" value={String(dashboard.productCount)} note="Artículos en tu inventario" icon={Boxes} />
        <Stat title="Por reponer" value={String(dashboard.lowStockCount)} note="Productos en nivel bajo" icon={AlertTriangle} warning={dashboard.lowStockCount > 0} />
      </section>
      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-head"><div><h2 className="panel-title">Ventas recientes</h2><div className="panel-caption">Los últimos movimientos de caja</div></div><Link href="/ventas" className="text-link">Ver todas <ChevronRight size={13} style={{ verticalAlign: 'middle' }} /></Link></div>
          <div className="panel-body">{dashboard.recentSales?.length ? <div className="inventory-table-wrap"><table className="data-table"><thead><tr><th>Venta</th><th>Hora</th><th>Artículos</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead><tbody>{dashboard.recentSales.slice(0, 6).map(sale => <tr key={sale.id} data-testid={`row-recent-sale-${sale.id}`}><td className="mono">#{String(sale.id).padStart(4, '0')}</td><td>{shortDate(sale.createdAt)}</td><td>{sale.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} piezas</td><td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{money(sale.total)}</td></tr>)}</tbody></table></div> : <EmptyState title="Aún no hay ventas" detail="Cuando registres una, aparecerá aquí." icon={ShoppingCart} />}</div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2 className="panel-title">Hay que reponer</h2><div className="panel-caption">Productos debajo de su mínimo</div></div><Link href="/inventario" className="text-link">Inventario <ChevronRight size={13} style={{ verticalAlign: 'middle' }} /></Link></div>
          <div className="panel-body">{dashboard.lowStockProducts?.length ? <div className="low-list">{dashboard.lowStockProducts.slice(0, 5).map(product => <div className="low-row" key={product.id} data-testid={`low-stock-${product.id}`}><div className="stock-dot"><Package size={16} /></div><div className="low-copy"><strong>{product.name}</strong><span>{product.supplier || 'Proveedor sin indicar'}</span></div><div className="stock-count">{product.quantity}<div className="subtle">mín. {product.lowStockThreshold}</div></div></div>)}</div> : <EmptyState title="Todo bien surtido" detail="No hay productos bajo el mínimo." icon={Check} />}</div>
        </div>
      </section>
      <div className="quick-actions"><span className="quick-label">Accesos rápidos</span><Link href="/inventario" className="button button-soft"><Plus size={14} /> Agregar producto</Link><Link href="/reportes" className="button button-soft"><BarChart3 size={14} /> Ver reportes</Link></div>
    </>}
  </div></Shell>;
}
function Stat({ title, value, note, icon: Icon, warning = false }: { title: string; value: string; note: string; icon: typeof Package; warning?: boolean }) {
  return <div className="panel stat-card" data-testid={`stat-${title.toLowerCase().replaceAll(' ', '-')}`}><div className="stat-top"><Icon size={15} style={warning ? { color: '#b46b36' } : undefined} />{title}</div><div className="stat-value" style={warning ? { color: '#a65e38' } : undefined}>{value}</div><div className="stat-foot">{note}</div></div>;
}

type ProductDraft = { name: string; price: string; quantity: string; supplier: string; lowStockThreshold: string };
const freshDraft = (): ProductDraft => ({ name: '', price: '', quantity: '', supplier: '', lowStockThreshold: '5' });
function ProductDialog({ product, close, save, busy }: { product?: Product; close: () => void; save: (draft: ProductDraft) => void; busy: boolean }) {
  const [draft, setDraft] = useState<ProductDraft>(product ? { name: product.name, price: String(product.price), quantity: String(product.quantity), supplier: product.supplier, lowStockThreshold: String(product.lowStockThreshold) } : freshDraft());
  const update = (key: keyof ProductDraft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); save(draft); };
  return <div className="overlay" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><form className="dialog" onSubmit={submit}>
    <div className="dialog-head"><div><h2>{product ? 'Editar producto' : 'Nuevo producto'}</h2><p>Completa los datos para mantener tu inventario al día.</p></div><button type="button" className="button button-icon" aria-label="Cerrar" onClick={close}><X size={18} /></button></div>
    <div className="form-grid">
      <Field label="Nombre del producto" full><input autoFocus required minLength={1} className="field-input" placeholder="Ej. Arroz extra 1 kg" value={draft.name} onChange={e => update('name', e.target.value)} /></Field>
      <Field label="Precio de venta"><input required type="number" min="0" step="0.01" className="field-input" placeholder="0.00" value={draft.price} onChange={e => update('price', e.target.value)} /></Field>
      <Field label="Cantidad disponible"><input required type="number" min="0" step="1" className="field-input" placeholder="0" value={draft.quantity} onChange={e => update('quantity', e.target.value)} /></Field>
      <Field label="Proveedor"><input required className="field-input" placeholder="Nombre del proveedor" value={draft.supplier} onChange={e => update('supplier', e.target.value)} /></Field>
      <Field label="Avisar cuando queden"><input required type="number" min="0" step="1" className="field-input" value={draft.lowStockThreshold} onChange={e => update('lowStockThreshold', e.target.value)} /></Field>
    </div>
    <div className="dialog-actions"><button type="button" className="button button-soft" onClick={close}>Cancelar</button><button className="button button-primary" disabled={busy}>{busy ? 'Guardando…' : product ? 'Guardar cambios' : 'Agregar producto'}</button></div>
  </form></div>;
}
function Field({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) { return <div className={`field ${full ? 'full' : ''}`}><label>{label}</label>{children}</div>; }

function InventoryPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useListProducts();
  const create = useCreateProduct(); const update = useUpdateProduct(); const remove = useDeleteProduct();
  const { toast, show } = useToastMessage();
  const [search, setSearch] = useState(''); const [stockFilter, setStockFilter] = useState('todos');
  const [dialog, setDialog] = useState<Product | 'new' | null>(null);
  const products = (data as Product[] | undefined) ?? [];
  const filtered = useMemo(() => products.filter(product => {
    const matches = `${product.name} ${product.supplier}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'));
    return matches && (stockFilter === 'todos' || (stockFilter === 'bajo' ? product.quantity <= product.lowStockThreshold : product.quantity > product.lowStockThreshold));
  }), [products, search, stockFilter]);
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() }),
  ]);
  const save = (draft: ProductDraft) => {
    const body = { name: draft.name.trim(), supplier: draft.supplier.trim(), price: Number(draft.price), quantity: Number(draft.quantity), lowStockThreshold: Number(draft.lowStockThreshold) };
    const editing = dialog !== 'new' && dialog !== null ? dialog : undefined;
    const onSuccess = () => { void refresh(); setDialog(null); show(editing ? 'Producto actualizado.' : 'Producto agregado al inventario.'); };
    if (editing) update.mutate({ id: editing.id, data: body }, { onSuccess, onError: () => show('No se pudo guardar el producto.', 'error') });
    else create.mutate({ data: body }, { onSuccess, onError: () => show('No se pudo agregar el producto.', 'error') });
  };
  const deleteProduct = (product: Product) => {
    if (!window.confirm(`¿Eliminar “${product.name}” del inventario? Esta acción no se puede deshacer.`)) return;
    remove.mutate({ id: product.id }, { onSuccess: () => { void refresh(); show('Producto eliminado.'); }, onError: () => show('No se pudo eliminar. Puede tener ventas asociadas.', 'error') });
  };
  return <Shell><div className="content">
    <PageHeading eyebrow="Control de existencias" title="Inventario" subtitle={`${products.length} productos en tu tienda. Mantén precios y cantidades al corriente.`} action={<button className="button button-primary" onClick={() => setDialog('new')} data-testid="button-add-product"><Plus size={16} /> Nuevo producto</button>} />
    <div className="panel inventory-panel">
      <div className="panel-head"><div><h2 className="panel-title">Tus productos</h2><div className="panel-caption">Busca, revisa y actualiza tus artículos</div></div><div className="toolbar"><label className="searchbox"><Search size={15} /><input aria-label="Buscar productos" data-testid="input-search-products" placeholder="Buscar producto o proveedor" value={search} onChange={e => setSearch(e.target.value)} /></label><select className="filter-select" aria-label="Filtrar existencias" value={stockFilter} onChange={e => setStockFilter(e.target.value)}><option value="todos">Todos</option><option value="bajo">Stock bajo</option><option value="normal">Stock suficiente</option></select></div></div>
      {isError ? <div style={{ padding: 18 }}><ErrorMessage retry={() => void refetch()} /></div> : isLoading ? <LoadingRows count={6} /> : filtered.length ? <div className="inventory-table-wrap"><table className="data-table"><thead><tr><th>Producto</th><th>Proveedor</th><th>Precio</th><th>Existencias</th><th className="table-hide-mobile">Mínimo</th><th></th></tr></thead><tbody>{filtered.map(product => <tr key={product.id} data-testid={`row-product-${product.id}`}><td><div className="product-name">{product.name}</div><div className="subtle">Actualizado {new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short' }).format(new Date(product.updatedAt))}</div></td><td>{product.supplier || '—'}</td><td className="mono">{money(product.price)}</td><td><span className={`badge ${product.quantity <= product.lowStockThreshold ? 'badge-warn' : 'badge-good'}`}>{product.quantity} {product.quantity === 1 ? 'unidad' : 'unidades'}</span></td><td className="table-hide-mobile mono">{product.lowStockThreshold}</td><td><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 3 }}><button className="button button-icon" aria-label={`Editar ${product.name}`} title="Editar" onClick={() => setDialog(product)} data-testid={`button-edit-product-${product.id}`}><Pencil size={15} /></button><button className="button button-icon" aria-label={`Eliminar ${product.name}`} title="Eliminar" onClick={() => deleteProduct(product)} data-testid={`button-delete-product-${product.id}`}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title={search || stockFilter !== 'todos' ? 'No encontramos productos' : 'Tu inventario está vacío'} detail={search || stockFilter !== 'todos' ? 'Prueba con otra búsqueda o filtro.' : 'Agrega el primer producto para comenzar.'} />}
    </div>
    {dialog && <ProductDialog product={dialog === 'new' ? undefined : dialog} close={() => setDialog(null)} save={save} busy={create.isPending || update.isPending} />}
    <Toast state={toast} />
  </div></Shell>;
}

type CartLine = { product: Product; quantity: number };
function SalesPage() {
  const queryClient = useQueryClient();
  const { data: productData, isLoading: productsLoading, isError: productsError, refetch: retryProducts } = useListProducts();
  const { data: salesData, isLoading: salesLoading, isError: salesError, refetch: retrySales } = useListSales();
  const createSale = useCreateSale();
  const [cart, setCart] = useState<CartLine[]>([]); const [search, setSearch] = useState('');
  const { toast, show } = useToastMessage();
  const products = (productData as Product[] | undefined) ?? [];
  const sales = (salesData as Sale[] | undefined) ?? [];
  const available = products.filter(p => p.quantity > 0 && p.name.toLowerCase().includes(search.toLowerCase()));
  const total = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const add = (product: Product) => setCart(lines => {
    const existing = lines.find(line => line.product.id === product.id);
    if (existing) return lines.map(line => line.product.id === product.id ? { ...line, quantity: Math.min(product.quantity, line.quantity + 1) } : line);
    return [...lines, { product, quantity: 1 }];
  });
  const changeQty = (id: number, increment: number) => setCart(lines => lines.map(line => line.product.id === id ? { ...line, quantity: Math.min(line.product.quantity, line.quantity + increment) } : line).filter(line => line.quantity > 0));
  const checkout = () => {
    if (!cart.length) return;
    createSale.mutate({ data: { items: cart.map(line => ({ productId: line.product.id, quantity: line.quantity })) } }, {
      onSuccess: () => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() }),
        ]);
        setCart([]); show('Venta registrada. Las existencias ya se actualizaron.');
      },
      onError: () => show('No se pudo registrar la venta. Revisa las existencias.', 'error'),
    });
  };
  return <Shell><div className="content">
    <PageHeading eyebrow="Caja rápida" title="Registrar venta" subtitle="Agrega productos al ticket y confirma el cobro." />
    {productsError && <ErrorMessage retry={() => void retryProducts()} />}
    <div className="sale-layout">
      <section className="panel">
        <div className="panel-head"><div><h2 className="panel-title">Productos disponibles</h2><div className="panel-caption">Elige un artículo para añadirlo al ticket</div></div><label className="searchbox"><Search size={15} /><input aria-label="Buscar artículos" placeholder="Buscar artículo" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
        {productsLoading ? <LoadingRows count={5} /> : available.length ? <div className="sale-product-grid">{available.map(product => <button className="sale-product" key={product.id} onClick={() => add(product)} data-testid={`button-sale-product-${product.id}`}><strong>{product.name}</strong><span>{money(product.price)} <span style={{ float: 'right' }}>{product.quantity} disponibles</span></span></button>)}</div> : <EmptyState title={search ? 'Sin coincidencias' : 'No hay productos disponibles'} detail={search ? 'Intenta con otro nombre.' : 'Agrega existencias desde Inventario.'} icon={ShoppingBasket} />}
      </section>
      <section className="panel sale-cart">
        <div className="panel-head"><div><h2 className="panel-title">Ticket de venta</h2><div className="panel-caption">{cart.reduce((sum, item) => sum + item.quantity, 0)} artículos</div></div><div className="stock-dot"><ShoppingCart size={16} /></div></div>
        <div className="panel-body">{cart.length ? <>
          {cart.map(line => <div className="cart-line" key={line.product.id}><div><strong>{line.product.name}</strong><div className="subtle">{money(line.product.price)} c/u</div></div><div className="quantity-control"><button aria-label={`Restar ${line.product.name}`} onClick={() => changeQty(line.product.id, -1)}><Minus size={12} /></button><span className="mono">{line.quantity}</span><button aria-label={`Sumar ${line.product.name}`} onClick={() => changeQty(line.product.id, 1)} disabled={line.quantity >= line.product.quantity}><Plus size={12} /></button></div><strong className="mono">{money(line.product.price * line.quantity)}</strong></div>)}
          <div className="cart-total"><span>Total a cobrar</span><strong>{money(total)}</strong></div><button className="button button-primary" style={{ width: '100%' }} onClick={checkout} disabled={createSale.isPending} data-testid="button-checkout"><Check size={15} />{createSale.isPending ? 'Registrando…' : 'Confirmar venta'}</button>
        </> : <EmptyState title="Ticket vacío" detail="Selecciona productos para armar la venta." icon={ShoppingCart} />}</div>
      </section>
    </div>
    <section className="panel" style={{ marginTop: 18 }}>
      <div className="panel-head"><div><h2 className="panel-title">Ventas recientes</h2><div className="panel-caption">Registro de caja</div></div><span className="badge badge-neutral">{sales.length} ventas</span></div>
      <div className="panel-body">{salesError ? <ErrorMessage retry={() => void retrySales()} /> : salesLoading ? <LoadingRows count={3} /> : sales.length ? <div className="inventory-table-wrap"><table className="data-table"><thead><tr><th>Folio</th><th>Fecha y hora</th><th>Detalle</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead><tbody>{[...sales].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8).map(sale => <tr key={sale.id} data-testid={`row-sale-${sale.id}`}><td className="mono">#{String(sale.id).padStart(4, '0')}</td><td>{shortDate(sale.createdAt)}</td><td>{sale.items?.map(item => `${item.quantity} × ${item.productName}`).join(', ')}</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{money(sale.total)}</td></tr>)}</tbody></table></div> : <EmptyState title="Todavía no hay ventas" detail="Las ventas que registres aparecerán aquí." />}</div>
    </section>
    <Toast state={toast} />
  </div></Shell>;
}

function ReportsPage() {
  const { data, isLoading, isError, refetch } = useGetReports();
  const reports = data as Reports | undefined;
  const maxAmount = Math.max(1, ...(reports?.dailySales?.map(day => day.total) ?? [1]));
  return <Shell><div className="content">
    <PageHeading eyebrow="Números claros" title="Reportes" subtitle="Revisa el ritmo de ventas y detecta a tiempo lo que hace falta." />
    {isError && <ErrorMessage retry={() => void refetch()} />}
    {isLoading ? <><div className="stats-grid">{[1, 2, 3].map(i => <div className="panel stat-card" key={i}><div className="loading-line" /><div className="loading-line" style={{ width: '60%', marginTop: 25 }} /></div>)}</div><div className="panel"><LoadingRows /></div></> : reports && <>
      <div className="report-metrics"><Metric label="Ventas registradas" value={money(reports.totalSales)} /><Metric label="Número de ventas" value={String(reports.salesCount)} /><Metric label="Promedio por venta" value={money(reports.averageSale)} /></div>
      <div className="dashboard-grid">
        <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Ventas por día</h2><div className="panel-caption">Últimos días registrados</div></div><CalendarDays size={17} color="#708476" /></div>
          {reports.dailySales?.length ? <div className="chart-wrap"><div className="bar-chart">{reports.dailySales.slice(-12).map(day => <div className="bar-col" key={day.date} title={`${day.count} ventas · ${money(day.total)}`}><span className="bar-value">{money(day.total)}</span><div className="bar" style={{ height: `${Math.max(3, day.total / maxAmount * 100)}%` }} /><span className="bar-label">{new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(day.date))}</span></div>)}</div></div> : <EmptyState title="Aún faltan datos" detail="El gráfico aparecerá cuando haya ventas." icon={BarChart3} />}
        </section>
        <section className="panel"><div className="panel-head"><div><h2 className="panel-title">Stock bajo</h2><div className="panel-caption">Artículos que conviene reponer</div></div><Link href="/inventario" className="text-link">Revisar <ChevronRight size={13} style={{ verticalAlign: 'middle' }} /></Link></div>
          <div className="panel-body">{reports.lowStockProducts?.length ? <div className="low-list">{reports.lowStockProducts.map(product => <div className="low-row" key={product.id}><div className="stock-dot"><AlertTriangle size={15} /></div><div className="low-copy"><strong>{product.name}</strong><span>{product.supplier}</span></div><div className="stock-count">{product.quantity}<div className="subtle">mín. {product.lowStockThreshold}</div></div></div>)}</div> : <EmptyState title="Sin alertas de stock" detail="Todos los productos están por encima del mínimo." icon={Check} />}</div>
        </section>
      </div>
    </>}
  </div></Shell>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="panel report-metric"><span>{label}</span><strong>{value}</strong></div>; }

function validateBackup(input: unknown): input is Backup {
  if (!input || typeof input !== 'object') return false;
  const backup = input as Partial<Backup>;
  return backup.format === 'tienda-abarrotes-backup' && backup.version === 1 &&
    typeof backup.createdAt === 'string' && Array.isArray(backup.products) && Array.isArray(backup.sales) &&
    backup.products.every(p => p && Number.isInteger(p.id) && typeof p.name === 'string' && typeof p.price === 'number' && typeof p.quantity === 'number' && typeof p.supplier === 'string' && typeof p.lowStockThreshold === 'number' && typeof p.createdAt === 'string' && typeof p.updatedAt === 'string') &&
    backup.sales.every(s => s && Number.isInteger(s.id) && typeof s.total === 'number' && typeof s.createdAt === 'string' && Array.isArray(s.items) && s.items.every(item => item && Number.isInteger(item.id) && Number.isInteger(item.productId) && typeof item.productName === 'string' && typeof item.unitPrice === 'number' && Number.isInteger(item.quantity) && typeof item.subtotal === 'number'));
}
function BackupPage() {
  const queryClient = useQueryClient();
  const { data: backupData, isLoading: backupLoading, isError: backupError, refetch: getBackup } = useDownloadBackup({ query: { enabled: false, queryKey: getDownloadBackupQueryKey() } });
  const restore = useRestoreBackup();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Backup | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const { toast, show } = useToastMessage();
  const exportBackup = async () => {
    try {
      const result = await getBackup();
      const payload = result.data as Backup | undefined ?? backupData as Backup | undefined;
      if (!payload || !validateBackup(payload)) throw new Error('Formato de respaldo inesperado.');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `respaldo-tienda-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      show('Respaldo descargado correctamente.');
    } catch { show('No se pudo descargar el respaldo. Inténtalo de nuevo.', 'error'); }
  };
  const chooseFile = async (file?: File) => {
    setParsed(null); setFileError('');
    if (!file) return;
    setFileName(file.name);
    try {
      const decoded: unknown = JSON.parse(await file.text());
      if (!validateBackup(decoded)) throw new Error('El archivo no contiene un respaldo válido de Tienda de Abarrotes.');
      setParsed(decoded);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'No pudimos leer este archivo JSON.');
    }
  };
  const confirmRestore = () => {
    if (!parsed) return;
    if (!window.confirm(`Vas a reemplazar todo el inventario y las ventas actuales por los datos del archivo “${fileName}”. Esta acción no se puede deshacer. ¿Deseas continuar?`)) return;
    restore.mutate({ data: parsed }, {
      onSuccess: result => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getDownloadBackupQueryKey() }),
        ]);
        setParsed(null); setFileName(''); if (fileRef.current) fileRef.current.value = '';
        show(`Restauración lista: ${result.productsRestored} productos y ${result.salesRestored} ventas.`);
      },
      onError: () => show('No se pudo restaurar el archivo. Los datos actuales no se modificaron.', 'error'),
    });
  };
  return <Shell><div className="content">
    <PageHeading eyebrow="Tus datos, protegidos" title="Configuración" subtitle="Guarda una copia de tu tienda o restaura tus datos desde un archivo." />
    <div className="settings-grid">
      <section className="panel setting-card"><div className="setting-icon"><ArrowDownToLine size={19} /></div><h2>Crear respaldo</h2><p>Descarga una copia completa de tus productos y ventas en un archivo JSON. Guárdala en un lugar seguro.</p><button className="button button-primary" onClick={exportBackup} disabled={backupLoading} data-testid="button-export-backup"><ArrowDownToLine size={15} />{backupLoading ? 'Preparando archivo…' : 'Descargar Respaldo'}</button>{backupError && <div className="notice">No se pudo obtener la copia de seguridad. Puedes intentarlo otra vez.</div>}<div className="notice">El archivo exportado conserva todos los datos necesarios para restaurar la tienda.</div></section>
      <section className="panel setting-card"><div className="setting-icon"><RotateCcw size={19} /></div><h2>Restaurar respaldo</h2><p>Selecciona un archivo JSON válido de Tienda de Abarrotes. La restauración reemplaza los datos que tienes ahora.</p>
        <label className="file-drop" htmlFor="backup-file"><Upload size={19} style={{ display: 'block', margin: '0 auto 8px' }} /><strong>Cargar Respaldo</strong><div style={{ marginTop: 5 }}>{fileName || 'Selecciona un archivo .json'}</div><input ref={fileRef} id="backup-file" type="file" accept=".json,application/json" aria-label="Cargar Respaldo" data-testid="input-backup-file" onChange={event => void chooseFile(event.target.files?.[0])} /></label>
        {fileError && <div className="notice" role="alert" style={{ background: '#f7e1dc', color: '#94483d' }}>{fileError}</div>}
        {parsed && <div className="notice" style={{ background: '#e6efe2', color: '#476d4e' }}><FileCheck2 size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Archivo válido: {parsed.products.length} productos y {parsed.sales.length} ventas.</div>}
        <div className="notice"><AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Restaurar reemplaza todo el inventario y las ventas actuales.</div>
        <button className="button button-danger" style={{ marginTop: 15 }} onClick={confirmRestore} disabled={!parsed || restore.isPending} data-testid="button-restore-backup"><RotateCcw size={15} />{restore.isPending ? 'Restaurando…' : 'Restaurar datos'}</button>
      </section>
    </div>
    <div className="panel" style={{ marginTop: 18, padding: '17px 20px', display: 'flex', alignItems: 'center', gap: 12 }}><div className="stock-dot"><Archive size={15} /></div><div><strong style={{ fontSize: 12 }}>Formato de respaldo</strong><div className="subtle">JSON · versión 1 · Compatible con Tienda de Abarrotes</div></div></div>
    <Toast state={toast} />
  </div></Shell>;
}

function Router() {
  return <Switch>
    <Route path="/" component={DashboardPage} />
    <Route path="/inventario" component={InventoryPage} />
    <Route path="/ventas" component={SalesPage} />
    <Route path="/reportes" component={ReportsPage} />
    <Route path="/configuracion" component={BackupPage} />
    <Route component={NotFound} />
  </Switch>;
}
function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></QueryClientProvider>;
}

export default App;
